import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Player } from '../frontend/players.js';
import { MEJORAS } from './mejoras.shared.js';
import { generarBloquesPorRonda } from './procedural.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));
// Ruta para la raíz, evita error 404 en /
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// ============================================
// INICIALIZAR BASE DE DATOS
// ============================================
const db = new sqlite3.Database('users.db');

// Agregar columnas inventory y equipped si no existen
db.serialize(() => {
  // Verificar si las columnas existen y agregarlas si no
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('Error al verificar estructura de tabla:', err);
      return;
    }
    
    const hasInventory = columns.some(col => col.name === 'inventory');
    const hasEquipped = columns.some(col => col.name === 'equipped');
    
    if (!hasInventory) {
      db.run("ALTER TABLE users ADD COLUMN inventory TEXT DEFAULT '{}'", (err) => {
        if (err) console.error('Error al agregar columna inventory:', err);
        else console.log('✅ Columna inventory agregada');
      });
    }
    
    if (!hasEquipped) {
      db.run("ALTER TABLE users ADD COLUMN equipped TEXT DEFAULT '{}'", (err) => {
        if (err) console.error('Error al agregar columna equipped:', err);
        else console.log('✅ Columna equipped agregada');
      });
    }
  });
});

const port = 3000;
const DEFAULT_SPEED = 5;
// Contador para IDs de proyectiles
let projectileIdCounter = 0;

// Función para calcular nivel basado en exp
function getLevel(exp) {
  if (exp < 200) return 1;
  if (exp < 450) return 2;
  if (exp < 800) return 3;
  if (exp < 1450) return 4;
  if (exp < 2350) return 5;
  if (exp < 3400) return 6;
  if (exp < 4900) return 7;
  if (exp < 6400) return 8;
  if (exp < 8800) return 9;
  if (exp < 10500) return 10;
  if (exp < 14500) return 11;
  if (exp < 19100) return 12;
  if (exp < 24700) return 13;
  if (exp < 32500) return 14;
  if (exp < 40000) return 15;
  return 15; // or more
}

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenar jugadores conectados al menú (no en salas)
const playersOnline = new Map(); // { nick: { nivel, lastSeen, socketId } }

// Sistema de matchmaking 1v1
const matchmakingQueue = []; // Array de { nick, nivel, socketId, joinedAt }
const pendingMatches = new Map(); // Map de matchId -> { player1, player2, confirmations, createdAt }
let matchIdCounter = 0;

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Evento para registrar jugador en el menú
  socket.on('playerOnline', (data) => {
    const { nick, nivel } = data;
    playersOnline.set(nick, {
      nivel: nivel || 1,
      lastSeen: Date.now(),
      socketId: socket.id
    });
    console.log(`Jugador ${nick} ahora está en línea. Total: ${playersOnline.size}`);
    io.emit('onlinePlayersUpdate', Array.from(playersOnline.keys()).length);
  });
  
  // Evento para mantener el jugador activo (heartbeat)
  socket.on('playerHeartbeat', (data) => {
    const { nick } = data;
    if (playersOnline.has(nick)) {
      playersOnline.get(nick).lastSeen = Date.now();
    }
  });
  
  // Cuando se desconecta
  socket.on('disconnect', () => {
    // Buscar y eliminar el jugador por socketId
    for (const [nick, data] of playersOnline.entries()) {
      if (data.socketId === socket.id) {
        playersOnline.delete(nick);
        console.log(`Jugador ${nick} se desconectó. Total: ${playersOnline.size}`);
        io.emit('onlinePlayersUpdate', Array.from(playersOnline.keys()).length);
        break;
      }
    }
    
    // Remover de la cola de matchmaking si estaba allí
    const queueIndex = matchmakingQueue.findIndex(p => p.socketId === socket.id);
    if (queueIndex !== -1) {
      matchmakingQueue.splice(queueIndex, 1);
    }
  });
  
  // ============================================
  // EVENTOS DE MATCHMAKING 1V1
  // ============================================
  
  // Unirse a la cola de matchmaking
  socket.on('joinMatchmakingQueue', async (data) => {
    const { nick, nivel } = data;
    
    // Verificar que no esté ya en cola
    if (matchmakingQueue.find(p => p.nick === nick)) {
      socket.emit('alreadyInQueue');
      return;
    }
    
    // Agregar a la cola
    matchmakingQueue.push({
      nick,
      nivel,
      socketId: socket.id,
      joinedAt: Date.now()
    });
    
    console.log(`${nick} se unió a la cola de matchmaking. Cola: ${matchmakingQueue.length}`);
    socket.emit('queueJoined', { position: matchmakingQueue.length });
    
    // Intentar hacer match inmediatamente
    tryMatchmaking();
  });
  
  // Salir de la cola de matchmaking
  socket.on('leaveMatchmakingQueue', (data) => {
    const { nick } = data;
    const index = matchmakingQueue.findIndex(p => p.nick === nick);
    
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
      console.log(`${nick} salió de la cola. Cola: ${matchmakingQueue.length}`);
      socket.emit('queueLeft');
    }
  });
  
  // Aceptar o rechazar match
  socket.on('matchResponse', (data) => {
    const { matchId, nick, accepted } = data;
    const match = pendingMatches.get(matchId);
    
    if (!match) {
      socket.emit('matchExpired');
      return;
    }
    
    // Registrar la respuesta
    match.confirmations[nick] = accepted;
    
    console.log(`${nick} ${accepted ? 'aceptó' : 'rechazó'} el match ${matchId}`);
    
    // Verificar si ambos jugadores respondieron
    const player1Responded = match.confirmations[match.player1.nick] !== undefined;
    const player2Responded = match.confirmations[match.player2.nick] !== undefined;
    
    if (player1Responded && player2Responded) {
      // Ambos respondieron
      const bothAccepted = match.confirmations[match.player1.nick] && match.confirmations[match.player2.nick];
      
      if (bothAccepted) {
        // Ambos aceptaron - crear sala 1v1
        create1v1Room(match.player1, match.player2);
      } else {
        // Al menos uno rechazó - regresar a cola a quien aceptó
        if (match.confirmations[match.player1.nick]) {
          // Player1 aceptó, devolverlo a cola
          matchmakingQueue.push(match.player1);
          io.to(match.player1.socketId).emit('matchCancelled', { reason: 'opponent_declined' });
        }
        if (match.confirmations[match.player2.nick]) {
          // Player2 aceptó, devolverlo a cola
          matchmakingQueue.push(match.player2);
          io.to(match.player2.socketId).emit('matchCancelled', { reason: 'opponent_declined' });
        }
        
        // Notificar a quien rechazó
        if (!match.confirmations[match.player1.nick]) {
          io.to(match.player1.socketId).emit('queueLeft');
        }
        if (!match.confirmations[match.player2.nick]) {
          io.to(match.player2.socketId).emit('queueLeft');
        }
      }
      
      pendingMatches.delete(matchId);
    }
  });
  
  // Recibir estado de teclas de movimiento desde el cliente
  socket.on('keyState', (data) => {
    const { roomId, nick, key, pressed } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === nick);
    if (!player) return;
    if (!player.keyStates) player.keyStates = { w: false, a: false, s: false, d: false };
    player.keyStates[key] = pressed;
  });

  socket.on('joinRoom', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const playerColor = typeof data === 'object' ? data.color : null;
    const playerNick = typeof data === 'object' ? data.nick : null;
    const playerStats = typeof data === 'object' ? data.stats : null;
    
    socket.join(roomId);
    
    // Guardar el color y stats del jugador en la sala
    const sala = salas.find(s => s.id === roomId && s.active);
    if (sala) {
      // Buscar jugador por nick si se proporcionó, sino por socketId
      let player = null;
      if (playerNick) {
        player = sala.players.find(p => p.nick === playerNick);
        if (player) {
          player.socketId = socket.id; // Vincular socketId con el jugador
        }
      } else {
        player = sala.players.find(p => p.socketId === socket.id);
      }
      
      // Aplicar el color y stats si existen
      if (player) {
        if (playerColor) {
          player.color = playerColor;
        }
        // Guardar stats personalizadas del jugador
        if (playerStats) {
          player.customStats = playerStats; // Guardar stats calculadas desde el frontend
        }
      }
    }
    
    if (sala && sala.is1v1 && sala.round === 0) {
      // Contar cuántos sockets están en la sala
      io.in(roomId).fetchSockets().then(sockets => {
        // Si ambos jugadores están conectados (2 sockets en la sala)
        if (sockets.length === 2) {
          console.log(`Ambos jugadores conectados a sala 1v1 ${roomId}, iniciando batalla...`);
          // Iniciar casi inmediatamente (100ms para asegurar sincronización)
          setTimeout(() => {
            iniciarBatalla1v1(roomId);
          }, 100);
        }
      });
    }
  });

  socket.on('gameAccepted', (data) => {
    const { stats, winner } = data;
    const rooms = Array.from(socket.rooms);
    const roomId = rooms.find(r => r !== socket.id);
    if (roomId && stats) {
      stats.forEach(stat => {
        const gameWins = stat.nick === winner ? 1 : 0;
        db.run('UPDATE users SET exp = exp + ?, victories = victories + ?, gameWins = gameWins + ?, totalKills = totalKills + ?, totalDeaths = totalDeaths + ?, gold = gold + ? WHERE nick = ?', [stat.exp, stat.victories, gameWins, stat.kills, stat.deaths, stat.gold || 0, stat.nick], (err) => {
          if (err) console.error('Error saving stats for', stat.nick, err);
          else {
            // Get new exp and update level
            db.get('SELECT exp FROM users WHERE nick = ?', [stat.nick], (err2, row) => {
              if (err2) console.error('Error getting exp for', stat.nick, err2);
              else if (row) {
                const newLevel = getLevel(row.exp);
                db.run('UPDATE users SET nivel = ? WHERE nick = ?', [newLevel, stat.nick], (err3) => {
                  if (err3) console.error('Error updating level for', stat.nick, err3);
                });
              }
            });
          }
        });
      });
      io.to(roomId).emit('forceClose');
    }
  });

  socket.on('startGame', (data) => {
    const { roomId, nick } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    if (sala.host.nick !== nick) return; // Solo el host puede iniciar
    if (sala.players.length < 2) return; // Necesita al menos 2 jugadores
    
    // 🎮 Crear escenario de batalla profesional
    crearEscenarioBatalla(roomId);
    
    // Inicializar ronda por sala si no existe
    sala.round = 1;
    // Distribuir hasta 4 jugadores en las esquinas
    const offset = 200;
    sala.players.forEach((player, i) => {
      if (i === 0) { // esquina arriba-izquierda
        player.x = offset;
        player.y = offset;
      } else if (i === 1) { // esquina arriba-derecha
        player.x = 2500 - offset;
        player.y = offset;
      } else if (i === 2) { // esquina abajo-izquierda
        player.x = offset;
        player.y = 1500 - offset;
      } else if (i === 3) { // esquina abajo-derecha
        player.x = 2500 - offset;
        player.y = 1500 - offset;
      } else {
        player.x = 1250;
        player.y = 750;
      }
      
      // Usar stats personalizadas si existen, sino usar valores por defecto
      if (player.customStats) {
        player.health = player.customStats.health || 200;
        player.maxHealth = player.customStats.maxHealth || 200;
        player.colorBonusDamage = player.customStats.damage || 0;
        player.speed = player.customStats.speed || DEFAULT_SPEED;
      } else {
        // Fallback: calcular según color (compatibilidad con versión antigua)
        let baseSpeed = DEFAULT_SPEED;
        let bonusDamage = 0;
        let maxHealth = 200;
        
        if (player.color === '#4A90E2') { // Azul: +5 vida
          player.health = 205;
          maxHealth = 205;
        } else if (player.color === '#E74C3C') { // Rojo: +1 daño
          player.health = 200;
          maxHealth = 200;
          bonusDamage = 1;
        } else if (player.color === '#2ECC71') { // Verde: +0.3 velocidad
          player.health = 200;
          maxHealth = 200;
          baseSpeed = DEFAULT_SPEED + 0.3;
        } else {
          player.health = 200; // Color por defecto
          maxHealth = 200;
        }
        
        player.maxHealth = maxHealth;
        player.colorBonusDamage = bonusDamage;
        player.speed = baseSpeed;
      }
      
      player.slowUntil = 0;
      player.speedBoostUntil = 0;
      player.dotUntil = 0;
      player.dotDamage = 0;
      player.dotType = null;
      player.lastDotTime = 0;
      player.electricDamageBonus = 0;
      player.kills = 0;
      player.deaths = 0;
      player.victories = 0;
    });
    // Para ronda 1, enviar upgrades aleatorias
    if (sala.round === 1) {
      const proyectilMejoras = MEJORAS.filter(m => m.proyectil && !m.proyectilQ && !m.proyectilEspacio && m.id !== 'cuchilla_fria_menor');
      function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
      }
      for (const player of sala.players) {
        const selectedUpgrades = shuffle([...proyectilMejoras]).slice(0, 3);
        io.to(roomId).emit('availableUpgrades', { nick: player.nick, upgrades: selectedUpgrades });
      }
    }
    // Emitir a la sala que el juego empezó
    io.to(roomId).emit('gameStarted', sala);
    
    // Enviar los muros del escenario profesional a todos los clientes
    if (murosPorSala[roomId]) {
      io.to(roomId).emit('escenarioMuros', murosPorSala[roomId]);
    }
  });

  socket.on('movePlayer', (data) => {
    const { roomId, nick, x, y } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === nick);
    if (!player) return;
    // Verificar colisión con muros de piedra (óvalo)
    let puedeMover = true;
    if (murosPorSala[roomId]) {
      for (const muro of murosPorSala[roomId]) {
        // Solo muros con colision:true
        const mejora = MEJORAS.find(m => m.id === 'muro_piedra');
        if (mejora && mejora.colision) {
          // Transformar la posición del jugador al sistema local del muro
          const cos = Math.cos(-muro.angle);
          const sin = Math.sin(-muro.angle);
          const relX = x - muro.x;
          const relY = y - muro.y;
          const localX = relX * cos - relY * sin;
          const localY = relX * sin + relY * cos;
          const rx = muro.width + 32; // 32 = radio del jugador
          const ry = muro.height + 32;
          if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
            puedeMover = false;
            break;
          }
        }
      }
    }
    if (puedeMover) {
      player.x = x;
      player.y = y;
      socket.to(roomId).emit('playerMoved', { nick, x, y });
    }
  });

  // Recibir disparo de proyectil
  socket.on('shootProjectile', (data) => {
    // Guardar proyectil en la sala
    if (!proyectilesPorSala[data.roomId]) proyectilesPorSala[data.roomId] = [];
    // Buscar la mejora
    const mejora = MEJORAS.find(m => m.id === data.mejoraId);
    if (!mejora) return; // Si no existe, ignorar
    // Calcular radio modificado por 'agrandar' si el jugador tiene ese aumento
    let modifiedRadius = mejora.radius;
    let salaActual = salas.find(s => s.id === data.roomId && s.active);
    let player = null;
    if (salaActual) {
      player = salaActual.players.find(p => p.nick === data.owner);
      if (player && player.mejoras) {
        const agrandadores = player.mejoras.filter(m => m.id === 'agrandar');
        modifiedRadius = (mejora.radius || 20) + (agrandadores.length * 10);
      }
    }
    if (mejora.id === 'muro_piedra') {
      if (!murosPorSala[data.roomId]) murosPorSala[data.roomId] = [];
      // Calcular ángulo para el muro (igual que en frontend)
      const dx = data.targetX - data.x;
      const dy = data.targetY - data.y;
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const muro = {
        id: 'muro_piedra',
        colision: true,
        x: data.targetX,
        y: data.targetY,
        creado: Date.now(),
        duracion: mejora.duracion || 2000,
        color: mejora.color,
        radius: modifiedRadius,
        width: mejora.width,
        height: mejora.height,
        angle: angle
      };
      murosPorSala[data.roomId].push(muro);
      // Empujar jugadores atrapados
      const sala = salas.find(s => s.id === data.roomId && s.active);
      if (sala) {
        for (const player of sala.players) {
          // Transformar la posición del jugador al sistema local del muro
          const cos = Math.cos(-muro.angle);
          const sin = Math.sin(-muro.angle);
          const relX = player.x - muro.x;
          const relY = player.y - muro.y;
          const localX = relX * cos - relY * sin;
          const localY = relX * sin + relY * cos;
          const rx = muro.width + 32;
          const ry = muro.height + 32;
          if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
            // Empujar al jugador fuera del muro
            // Calcular dirección normal desde el centro del muro
            let normX = localX / rx;
            let normY = localY / ry;
            const normLen = Math.sqrt(normX * normX + normY * normY) || 1;
            normX /= normLen;
            normY /= normLen;
            // Mover 50 unidades fuera del muro
            const pushDist = 50;
            const newLocalX = localX + normX * pushDist;
            const newLocalY = localY + normY * pushDist;
            // Transformar de vuelta a coordenadas globales
            const globalX = muro.x + newLocalX * cos + newLocalY * sin;
            const globalY = muro.y - newLocalX * sin + newLocalY * cos;
            player.x = globalX;
            player.y = globalY;
            io.to(data.roomId).emit('playerMoved', { nick: player.nick, x: player.x, y: player.y });
          }
        }
      }
      // Emitir a la sala
      io.to(data.roomId).emit('wallPlaced', {
        x: data.targetX,
        y: data.targetY,
        creado: Date.now(),
        duracion: mejora.duracion || 2000,
        color: mejora.color,
        radius: mejora.radius,
        width: mejora.width,
        height: mejora.height,
        angle: angle
      });
      // Remover cast
      if (castsPorSala[data.roomId]) {
        castsPorSala[data.roomId] = castsPorSala[data.roomId].filter(cast =>
          !(cast.position.x === data.targetX && cast.position.y === data.targetY && cast.player === data.owner)
        );
        io.to(data.roomId).emit('castEnded', { position: { x: data.targetX, y: data.targetY }, player: data.owner });
      }
      return; // No crear proyectil
    }
    if (mejora.id === 'suelo_sagrado') {
      if (!sacredGroundsPorSala[data.roomId]) sacredGroundsPorSala[data.roomId] = [];
      sacredGroundsPorSala[data.roomId].push({
        x: data.x,
        y: data.y,
        radius: modifiedRadius,
        owner: data.owner,
        createdAt: Date.now(),
        duration: mejora.duracion,
        healAmount: mejora.healAmount,
        healInterval: mejora.healInterval,
        lastHealTime: 0
      });
      io.to(data.roomId).emit('sacredGroundCreated', {
        x: data.x,
        y: data.y,
        radius: modifiedRadius,
        duration: mejora.duracion,
        owner: data.owner
      });
      // Remover cast
      if (castsPorSala[data.roomId]) {
        castsPorSala[data.roomId] = castsPorSala[data.roomId].filter(cast =>
          !(cast.position.x === data.x && cast.position.y === data.y && cast.player === data.owner)
        );
        io.to(data.roomId).emit('castEnded', { position: { x: data.x, y: data.y }, player: data.owner });
      }
      return; // No crear proyectil
    }
    if (mejora.id === 'escudo_magico') {
      // Aplicar escudo al owner
      const sala = salas.find(s => s.id === data.roomId && s.active);
      if (sala) {
        const player = sala.players.find(p => p.nick === data.owner);
        if (player) {
          player.shieldAmount = (player.shieldAmount || 0) + mejora.shieldAmount;
          player.shieldUntil = Date.now() + mejora.duracion;
          // Aplicar upgrades de escudo
          let extraDuracion = 0;
          let extraShield = 0;
          if (player.mejoras) {
            const danoEscudoUpgrades = player.mejoras.filter(m => m.id === 'dano_escudo');
            danoEscudoUpgrades.forEach(() => {
              extraDuracion += 1000;
              extraShield += 15;
            });
          }
          player.shieldAmount += extraShield;
          player.shieldUntil += extraDuracion;
          io.to(data.roomId).emit('shieldApplied', {
            nick: data.owner,
            shieldAmount: player.shieldAmount,
            duration: mejora.duracion + extraDuracion
          });
        }
      }
      // Remover cast
      if (castsPorSala[data.roomId]) {
        castsPorSala[data.roomId] = castsPorSala[data.roomId].filter(cast =>
          !(cast.position.x === data.x && cast.position.y === data.y && cast.player === data.owner)
        );
        io.to(data.roomId).emit('castEnded', { position: { x: data.x, y: data.y }, player: data.owner });
      }
      return; // No crear proyectil
    }
    let skillShot = data.skillShot || false;
    let targetX = data.targetX;
    let targetY = data.targetY;
    let startX = data.x;
    let startY = data.y;
    let angle = data.angle;
    if (data.skyfall) {
      // Para skyfall, empezar desde arriba del target
      startX = targetX;
      startY = targetY - 200; // Empezar 200 unidades arriba
      angle = Math.PI / 2; // Hacia abajo
      skillShot = true;
      // Remover el cast correspondiente
      if (castsPorSala[data.roomId]) {
        castsPorSala[data.roomId] = castsPorSala[data.roomId].filter(cast =>
          !(cast.position.x === targetX && cast.position.y === targetY && cast.player === data.owner)
        );
        // Emitir fin del cast
        io.to(data.roomId).emit('castEnded', { position: { x: targetX, y: targetY }, player: data.owner });
      }
    } else if ((mejora.maxRange || data.maxRange) && !skillShot) {
      skillShot = true;
      const range = data.maxRange || mejora.maxRange;
      targetX = data.x + Math.cos(data.angle) * range;
      targetY = data.y + Math.sin(data.angle) * range;
    }
    // Calcular maxRange modificado por potenciador
    const maxRangeModificado = data.maxRange || mejora.maxRange;
    // Calcular radius con mejoras
    let radius = mejora.radius || 16;
    const sala = salas.find(s => s.id === data.roomId);
    if (sala) {
      const player = sala.players.find(p => p.nick === data.owner);
      if (player && (mejora.proyectil || mejora.proyectilQ)) {
        const agrandadores = player.mejoras.filter(m => m.id === 'agrandar');
        const numAgrandadores = agrandadores.length;
        radius += numAgrandadores * 10;

        // Lógica para Dividor
        const dividorStacks = player.mejoras.filter(m => m.id === 'dividor').length;
        if (dividorStacks > 0 && mejora.proyectil) {
          // Disparar N proyectiles (1 base + N stacks)
          const totalProjectiles = 1 + dividorStacks;
          const separationAngle = (mejora.efecto && mejora.efecto.separationAngle) ? mejora.efecto.separationAngle : 18;
          const baseAngle = angle;
          const mid = Math.floor(totalProjectiles / 2);
          for (let i = 0; i < totalProjectiles; i++) {
            let offset = (i - mid) * separationAngle * Math.PI / 180;
            // Si es par, centrar los ángulos
            if (totalProjectiles % 2 === 0) offset += separationAngle * Math.PI / 360;
            const projAngle = baseAngle + offset;
            proyectilesPorSala[data.roomId].push({
              id: ++projectileIdCounter, // Asignar ID único
              x: startX,
              y: startY,
              startX,
              startY,
              angle: projAngle,
              velocidad: data.velocidad, // Debe enviarse desde el cliente
              mejoraId: mejora.id,
              owner: data.owner,
              lifetime: 0,
              targetX,
              targetY,
              radius,
              skillShot,
              skyfall: data.skyfall || false,
              maxRange: maxRangeModificado // Guardar maxRange modificado
            });
          }
          return;
        }
      }
    }
    proyectilesPorSala[data.roomId].push({
      id: ++projectileIdCounter, // Asignar ID único
      x: startX,
      y: startY,
      startX,
      startY,
      angle,
      velocidad: data.velocidad, // Debe enviarse desde el cliente
      mejoraId: data.mejoraId,
      owner: data.owner,
      lifetime: 0,
      maxLifetime: mejora.maxLifetime || 1200, // fallback
      radius,
      targetX,
      targetY,
      skillShot,
      hasHit: false, // Flag para saber si ya impactó
      maxRange: maxRangeModificado // Guardar maxRange modificado
    });
    // Ya no se reenvía nada aquí, el loop global lo enviará a todos
  });

  // Recibir inicio de cast
  socket.on('startCast', (data) => {
    const { roomId, position, startTime, player, mejora } = data;
    if (!castsPorSala[roomId]) castsPorSala[roomId] = [];
    castsPorSala[roomId].push({
      position,
      startTime,
      player,
      mejora
    });
    // Emitir a todos en la sala
    io.to(roomId).emit('castStarted', { position, startTime, player, mejora });
  });

  // Recibir selección de mejora
  socket.on('selectUpgrade', (data) => {
    const { roomId, mejoraId } = data;
    const sala = salas.find(s => s.id === roomId);
    if (!sala) return;

    const player = sala.players.find(p => p.nick === socket.nick);
    if (!player) return;

    // Inicializar array de mejoras si no existe (para compatibilidad con jugadores existentes)
    if (!player.mejoras) {
      player.mejoras = [];
    }

    const mejora = MEJORAS.find(m => m.id === mejoraId);
    if (!mejora) return;

    // Verificar si ya tiene esta mejora (solo para no stackables)
    const yaTiene = player.mejoras.find(m => m.id === mejoraId);
    if (!yaTiene || (mejora.aumento && mejora.stack)) {
      player.mejoras.push(mejora);
      console.log(`Jugador ${player.nick} obtuvo mejora: ${mejora.nombre}`);
    }

    // Notificar a todos los jugadores de la actualización
    io.to(roomId).emit('playerUpgraded', { nick: player.nick, mejoras: player.mejoras });
  });

  socket.on('teleportPlayer', (data) => {
    const { roomId, targetX, targetY, owner } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === owner);
    if (!player) return;
    const mejora = player.mejoras.find(m => m.id === 'teleport');
    if (!mejora) return;
    
    // Ajustar el destino al rango máximo si está fuera de rango
    let finalTargetX = targetX;
    let finalTargetY = targetY;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > mejora.maxRange) {
      const angle = Math.atan2(dy, dx);
      finalTargetX = player.x + Math.cos(angle) * mejora.maxRange;
      finalTargetY = player.y + Math.sin(angle) * mejora.maxRange;
    }
    
    // Teletransportar
    player.x = finalTargetX;
    player.y = finalTargetY;
    // Ajustar posición si colisiona con un muro
    const maxIterations = 5;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let adjusted = false;
      if (murosPorSala[roomId]) {
        for (const muro of murosPorSala[roomId]) {
          if (muro.width && muro.height && typeof muro.angle === 'number') {
            // Transformar la posición del jugador al sistema local del muro
            const cos = Math.cos(-muro.angle);
            const sin = Math.sin(-muro.angle);
            const relX = player.x - muro.x;
            const relY = player.y - muro.y;
            const localX = relX * cos - relY * sin;
            const localY = relX * sin + relY * cos;
            const rx = muro.width + 32; // 32 = radio aproximado del player
            const ry = muro.height + 32;
            if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
              // Empujar al jugador fuera del muro
              let normX = localX / rx;
              let normY = localY / ry;
              const normLen = Math.sqrt(normX * normX + normY * normY) || 1;
              normX /= normLen;
              normY /= normLen;
              // Mover 100 unidades fuera del muro
              const pushDist = 100;
              const newLocalX = localX + normX * pushDist;
              const newLocalY = localY + normY * pushDist;
              // Transformar de vuelta a coordenadas globales
              const globalX = muro.x + newLocalX * cos + newLocalY * sin;
              const globalY = muro.y - newLocalX * sin + newLocalY * cos;
              player.x = globalX;
              player.y = globalY;
              adjusted = true;
            }
          }
        }
      }
      if (!adjusted) break;
    }
    // Emitir actualización
    io.to(roomId).emit('playersUpdate', sala.players);
  });

  socket.on('dashPlayer', (data) => {
    const { roomId, targetX, targetY, owner } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === owner);
    if (!player) return;
    const mejora = player.mejoras.find(m => m.id === 'embestida');
    if (!mejora) return;
    
    // Ajustar el destino al rango máximo si está fuera de rango
    let finalTargetX = targetX;
    let finalTargetY = targetY;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > mejora.maxRange) {
      const angle = Math.atan2(dy, dx);
      finalTargetX = player.x + Math.cos(angle) * mejora.maxRange;
      finalTargetY = player.y + Math.sin(angle) * mejora.maxRange;
    }
    
    // Iniciar dash
    player.isDashing = true;
    player.dashTargetX = finalTargetX;
    player.dashTargetY = finalTargetY;
    player.dashSpeed = mejora.velocidad;
    player.dashHit = false;
  });

  socket.on('activateAbility', (data) => {
    const { roomId, mejoraId, owner } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === owner);
    if (!player) return;
    const mejora = MEJORAS.find(m => m.id === mejoraId);
    if (!mejora || !mejora.effect) return;
    if (mejora.effect.type === 'speedBoost') {
      player.speed = DEFAULT_SPEED * (1 + mejora.effect.amount);
      player.speedBoostUntil = Date.now() + mejora.effect.duration;
    }
    // Emitir actualización
    io.to(roomId).emit('playersUpdate', sala.players);
  });

  // Cheat para pruebas: reducir vida al rival
  socket.on('cheatDamage', (data) => {
    const { roomId, targetNick, damage } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === targetNick);
    if (player) {
  player.lastAttacker = data.attacker || null;
  applyDamage(player, damage, io, roomId, 'cheat');
      // Emitir actualización de jugadores
      io.to(roomId).emit('playersUpdate', sala.players);
    }
  });

  // Manejar desconexión de jugadores
  socket.on('disconnect', () => {
    // Buscar en qué sala está este socket
    // Suponemos que cada jugador tiene un nick asociado al socket
    // Puedes guardar el nick en socket.nick al unirse
    if (!socket.nick) return;
    // Buscar la sala donde está el jugador
    const sala = salas.find(s => s.players.some(p => p.nick === socket.nick) && s.active !== false);
    if (!sala) return;
    
    // Verificar si la sala está en una partida activa
    const enPartida = sala.round && sala.round >= 1;
    
    // Eliminar jugador de la sala
    sala.players = sala.players.filter(p => p.nick !== socket.nick);
    
    // Si el host se fue y quedan jugadores, pasar host al primero
    if (sala.host.nick === socket.nick && sala.players.length > 0) {
      sala.host = { ...sala.players[0] };
      io.to(sala.id).emit('hostChanged', sala.host);
    }
    
    // Si ya no quedan jugadores, puedes eliminar la sala o marcarla inactiva
    if (sala.players.length === 0) {
      sala.active = false;
      // Opcional: eliminar la sala del array
      // salas = salas.filter(s => s.id !== sala.id);
    }
    
    // Si estaba en partida y solo queda 1 jugador, declarar victoria automática
    if (enPartida && sala.players.length === 1) {
      const winner = sala.players[0];
      winner.victories = (winner.victories || 0) + 1;
      
      // Calcular experiencia para el único sobreviviente
      const numEnemies = 1; // Al menos 1 enemigo se fue
      const extraExp = 150; // Bonificación por victoria
      
      const finalStats = [{
        nick: winner.nick,
        kills: winner.kills || 0,
        deaths: winner.deaths || 0,
        victories: winner.victories || 0,
        exp: (winner.kills || 0) * 40 + (winner.victories || 0) * 75 + extraExp
      }];
      
      // Emitir evento de fin de juego
      io.to(sala.id).emit('gameEnded', { stats: finalStats, winner: winner.nick });
      
      // Marcar sala como inactiva o reiniciar
      sala.round = 0;
      sala.active = false;
    } else {
      // Notificar a la sala y a todos los clientes normalmente
      io.to(sala.id).emit('playerLeft', sala);
    }
    
    io.emit('roomsUpdated');
  });
  // Guardar el nick del jugador en el socket al unirse
  socket.on('setNick', (nick) => {
    socket.nick = nick;
  });
});

// ============================================
// FUNCIONES DE MATCHMAKING
// ============================================

// Intentar hacer match entre jugadores en cola
function tryMatchmaking() {
  if (matchmakingQueue.length < 2) return;
  
  // Tomar los dos primeros jugadores de la cola
  const player1 = matchmakingQueue.shift();
  const player2 = matchmakingQueue.shift();
  
  // Crear un match pendiente
  const matchId = `match_${++matchIdCounter}`;
  const match = {
    player1,
    player2,
    confirmations: {}, // { nick: boolean }
    createdAt: Date.now()
  };
  
  pendingMatches.set(matchId, match);
  
  console.log(`Match creado: ${player1.nick} vs ${player2.nick}`);
  
  // Enviar notificación de match a ambos jugadores
  io.to(player1.socketId).emit('matchFound', {
    matchId,
    opponent: { nick: player2.nick, nivel: player2.nivel }
  });
  
  io.to(player2.socketId).emit('matchFound', {
    matchId,
    opponent: { nick: player1.nick, nivel: player1.nivel }
  });
  
  // Configurar timeout de 15 segundos
  setTimeout(() => {
    const match = pendingMatches.get(matchId);
    if (!match) return; // Ya fue procesado
    
    // Verificar quién no aceptó
    const player1Accepted = match.confirmations[player1.nick] === true;
    const player2Accepted = match.confirmations[player2.nick] === true;
    
    // Si alguno no aceptó, cancelar match
    if (!player1Accepted || !player2Accepted) {
      console.log(`Match ${matchId} expirado. P1: ${player1Accepted}, P2: ${player2Accepted}`);
      
      // Devolver a cola a quien sí aceptó
      if (player1Accepted) {
        matchmakingQueue.push(player1);
        io.to(player1.socketId).emit('matchExpired');
      } else {
        io.to(player1.socketId).emit('queueLeft');
      }
      
      if (player2Accepted) {
        matchmakingQueue.push(player2);
        io.to(player2.socketId).emit('matchExpired');
      } else {
        io.to(player2.socketId).emit('queueLeft');
      }
      
      pendingMatches.delete(matchId);
      
      // Intentar hacer otro match
      tryMatchmaking();
    }
  }, 15000);
}

// Crear sala 1v1 cuando ambos aceptan
async function create1v1Room(player1, player2) {
  const roomId = `1v1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const sala = {
    id: roomId,
    host: { nick: player1.nick, nivel: player1.nivel },
    players: [
      { nick: player1.nick, nivel: player1.nivel, x: 0, y: 0, hp: 100, maxHp: 100, kills: 0, deaths: 0, victories: 0, mejoras: [] },
      { nick: player2.nick, nivel: player2.nivel, x: 0, y: 0, hp: 100, maxHp: 100, kills: 0, deaths: 0, victories: 0, mejoras: [] }
    ],
    active: true,
    is1v1: true, // Marcar como sala 1v1
    round: 0
  };
  
  salas.push(sala);
  
  console.log(`Sala 1v1 creada: ${roomId} - ${player1.nick} vs ${player2.nick}`);
  
  // Obtener stats de ambos jugadores
  const getPlayerStats = (nick) => {
    return new Promise((resolve) => {
      db.get('SELECT * FROM users WHERE nick = ?', [nick], (err, row) => {
        if (err || !row) {
          resolve({ nick, nivel: 1, exp: 0, victories: 0, totalKills: 0, totalDeaths: 0 });
        } else {
          resolve(row);
        }
      });
    });
  };
  
  const [stats1, stats2] = await Promise.all([
    getPlayerStats(player1.nick),
    getPlayerStats(player2.nick)
  ]);
  
  // Enviar datos de pre-batalla a ambos jugadores
  io.to(player1.socketId).emit('matchAccepted', {
    roomId,
    opponent: stats2,
    yourStats: stats1
  });
  
  io.to(player2.socketId).emit('matchAccepted', {
    roomId,
    opponent: stats1,
    yourStats: stats2
  });
  
  io.emit('roomsUpdated');
  
  // NO iniciar aquí, esperar a que ambos jugadores se conecten a la sala
  console.log(`Sala 1v1 preparada, esperando a que ambos jugadores se conecten: ${roomId}`);
}

// Función para iniciar automáticamente una batalla 1v1
function iniciarBatalla1v1(roomId) {
  const sala = salas.find(s => s.id === roomId && s.active);
  if (!sala) return;
  if (sala.players.length < 2) return;
  
  // 🎮 Crear escenario de batalla profesional
  crearEscenarioBatalla(roomId);
  
  // Inicializar ronda por sala si no existe
  sala.round = 1;
  // Distribuir hasta 4 jugadores en las esquinas
  const offset = 200;
  sala.players.forEach((player, i) => {
    if (i === 0) { // esquina arriba-izquierda
      player.x = offset;
      player.y = offset;
    } else if (i === 1) { // esquina arriba-derecha
      player.x = 2500 - offset;
      player.y = offset;
    } else if (i === 2) { // esquina abajo-izquierda
      player.x = offset;
      player.y = 1500 - offset;
    } else if (i === 3) { // esquina abajo-derecha
      player.x = 2500 - offset;
      player.y = 1500 - offset;
    } else {
      player.x = 1250;
      player.y = 750;
    }
    
    // Usar stats personalizadas si existen, sino usar valores por defecto
    if (player.customStats) {
      player.health = player.customStats.health || 200;
      player.maxHealth = player.customStats.maxHealth || 200;
      player.colorBonusDamage = player.customStats.damage || 0;
      player.speed = player.customStats.speed || DEFAULT_SPEED;
    } else {
      // Fallback: calcular según color (compatibilidad con versión antigua)
      let baseSpeed = DEFAULT_SPEED;
      let bonusDamage = 0;
      let maxHealth = 200;
      
      if (player.color === '#4A90E2') { // Azul: +5 vida
        player.health = 205;
        maxHealth = 205;
      } else if (player.color === '#E74C3C') { // Rojo: +1 daño
        player.health = 200;
        maxHealth = 200;
        bonusDamage = 1;
      } else if (player.color === '#2ECC71') { // Verde: +0.3 velocidad
        player.health = 200;
        maxHealth = 200;
        baseSpeed = DEFAULT_SPEED + 0.3;
      } else {
        player.health = 200; // Color por defecto
        maxHealth = 200;
      }
      
      player.maxHealth = maxHealth;
      player.colorBonusDamage = bonusDamage;
      player.speed = baseSpeed;
    }
    
    player.slowUntil = 0;
    player.speedBoostUntil = 0;
    player.dotUntil = 0;
    player.dotDamage = 0;
    player.dotType = null;
    player.lastDotTime = 0;
    player.electricDamageBonus = 0;
    player.kills = 0;
    player.deaths = 0;
    player.victories = 0;
  });
  
  // Para ronda 1, enviar upgrades aleatorias
  if (sala.round === 1) {
    const proyectilMejoras = MEJORAS.filter(m => m.proyectil && !m.proyectilQ && !m.proyectilEspacio && m.id !== 'cuchilla_fria_menor');
    function shuffle(array) {
      return array.sort(() => Math.random() - 0.5);
    }
    for (const player of sala.players) {
      const selectedUpgrades = shuffle([...proyectilMejoras]).slice(0, 3);
      io.to(roomId).emit('availableUpgrades', { nick: player.nick, upgrades: selectedUpgrades });
    }
  }
  
  // Emitir a la sala que el juego empezó
  io.to(roomId).emit('gameStarted', sala);
  
  // Enviar los muros del escenario profesional a todos los clientes
  if (murosPorSala[roomId]) {
    io.to(roomId).emit('escenarioMuros', murosPorSala[roomId]);
  }
  
  console.log(`Batalla 1v1 iniciada automáticamente: ${roomId}`);
}

app.use(bodyParser.json());
app.use(cors({
  origin: [
    'https://skill-royale.vercel.app',
    'http://localhost:3000',
    'https://skill-royale.onrender.com'
  ],
  credentials: true
}));
app.use(express.static(path.join(__dirname, '../frontend')));

// Base de datos ya inicializada arriba, agregar columnas faltantes aquí
db.serialize(() => {
  // Crear tabla si no existe
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    nick TEXT,
    password TEXT,
    nivel INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    victories INTEGER DEFAULT 0
  )`, (err) => {
    if (err) console.error('Error creando tabla users:', err);
    else console.log('Tabla users verificada.');
  });

  // Add username column if not exists (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN username TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding username column:', err.message);
    } else if (!err) {
      // Migrar datos existentes: copiar nick a username si username es NULL
      db.run(`UPDATE users SET username = nick WHERE username IS NULL`, (err) => {
        if (err) console.error('Error migrating username data:', err.message);
      });
    }
  });
  // Add exp column if not exists
  db.run(`ALTER TABLE users ADD COLUMN exp INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding exp column:', err.message);
    }
  });
  // Add victories column if not exists
  db.run(`ALTER TABLE users ADD COLUMN victories INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding victories column:', err.message);
    }
  });
  // Add gameWins column if not exists
  db.run(`ALTER TABLE users ADD COLUMN gameWins INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding gameWins column:', err.message);
    }
  });
  // Add totalKills column if not exists
  db.run(`ALTER TABLE users ADD COLUMN totalKills INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding totalKills column:', err.message);
    }
  });
  // Add totalDeaths column if not exists
  db.run(`ALTER TABLE users ADD COLUMN totalDeaths INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding totalDeaths column:', err.message);
    }
  });
  // Add nicknameChanged column if not exists
  db.run(`ALTER TABLE users ADD COLUMN nicknameChanged INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding nicknameChanged column:', err.message);
    }
  });
  // Add gold column if not exists
  db.run(`ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding gold column:', err.message);
    }
  });
});

// Endpoint de registro
app.post('/register', (req, res) => {
  const { nick, password } = req.body;
  if (!nick || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }
  
  // El username es fijo (para login), el nick es el nombre mostrado (se puede cambiar)
  db.run(
    'INSERT INTO users (username, nick, password) VALUES (?, ?, ?)',
    [nick, nick, password],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'Usuario ya existe o error en registro.' });
      }
      res.json({ success: true, userId: this.lastID });
    }
  );
});

// Endpoint de inicio de sesión
app.post('/login', (req, res) => {
  const { nick, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [nick, password],
    (err, row) => {
      if (err || !row) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
      }
      res.json({ success: true, user: { username: row.username, nick: row.nick, nivel: row.nivel, victories: row.victories, totalKills: row.totalKills, totalDeaths: row.totalDeaths, nicknameChanged: row.nicknameChanged || 0, gold: row.gold || 0 } });
    }
  );
});

// Endpoint para cambiar el nick (solo una vez)
app.post('/change-nickname', (req, res) => {
  const { username, newNick } = req.body;
  
  if (!username || !newNick) {
    return res.status(400).json({ error: 'Se requiere el usuario y el nuevo nick.' });
  }
  
  // Verificar que el nuevo nick no esté vacío y tenga longitud válida
  if (newNick.trim().length < 3 || newNick.trim().length > 20) {
    return res.status(400).json({ error: 'El nick debe tener entre 3 y 20 caracteres.' });
  }
  
  // Verificar si el usuario ya cambió su nick antes
  db.get('SELECT nicknameChanged FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error al verificar el usuario.' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    
    if (row.nicknameChanged >= 1) {
      return res.status(403).json({ error: 'Ya has cambiado tu nick anteriormente. Solo se permite un cambio.' });
    }
    
    // Verificar que el nuevo nick no esté en uso
    db.get('SELECT nick FROM users WHERE nick = ?', [newNick], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar disponibilidad del nick.' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: 'El nick ya está en uso por otro jugador.' });
      }
      
      // Actualizar SOLO el nick (no el username) y marcar que ya se cambió
      db.run(
        'UPDATE users SET nick = ?, nicknameChanged = 1 WHERE username = ?',
        [newNick, username],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error al actualizar el nick.' });
          }
          
          res.json({ success: true, newNick: newNick });
        }
      );
    });
  });
});

// ============================================
// ENDPOINT PARA GUARDAR INVENTORY Y EQUIPPED
// ============================================
app.post('/saveInventory', (req, res) => {
  const { nick, inventory, equipped } = req.body;
  
  if (!nick) {
    return res.status(400).json({ error: 'Nick requerido.' });
  }
  
  const inventoryJSON = JSON.stringify(inventory || {});
  const equippedJSON = JSON.stringify(equipped || {});
  
  db.run(
    'UPDATE users SET inventory = ?, equipped = ? WHERE nick = ?',
    [inventoryJSON, equippedJSON, nick],
    function(err) {
      if (err) {
        console.error('Error al guardar inventory/equipped:', err);
        return res.status(500).json({ error: 'Error al guardar datos.' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      
      res.json({ success: true });
    }
  );
});

// ============================================
// ENDPOINT PARA ACTUALIZAR ORO DEL JUGADOR
// ============================================
app.post('/updateGold', (req, res) => {
  const { nick, gold } = req.body;
  
  if (!nick || gold === undefined) {
    return res.status(400).json({ error: 'Nick y gold requeridos.' });
  }
  
  db.run(
    'UPDATE users SET gold = ? WHERE nick = ?',
    [gold, nick],
    function(err) {
      if (err) {
        console.error('Error al actualizar oro:', err);
        return res.status(500).json({ error: 'Error al actualizar oro.' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      
      res.json({ success: true });
    }
  );
});

server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

// Almacenamiento en memoria de salas
let salas = [];

// --- Simulación de proyectiles en el backend ---
const proyectilesPorSala = {};
const castsPorSala = {}; // Casteos activos por sala
const muddyGroundsPorSala = {}; // Suelos fangosos por sala
const murosPorSala = {}; // Muros de piedra por sala
const sacredGroundsPorSala = {}; // Suelos sagrados por sala

// 🎮 Función para crear el escenario de batalla usando el sistema procedural
function crearEscenarioBatalla(roomId, roundNumber = 1) {
  // Limpiar muros existentes
  murosPorSala[roomId] = [];
  
  // Usar el nuevo sistema procedural para generar todos los bloques
  const bloques = generarBloquesPorRonda(roomId, roundNumber);
  
  // Almacenar los bloques generados
  murosPorSala[roomId] = bloques;
  
  console.log(`✨ Escenario RONDA ${roundNumber} creado para sala ${roomId} con ${murosPorSala[roomId].length} bloques`);
}

// Función para verificar colisión en una posición dada y devolver el obstáculo que colisiona
// Ahora también retorna la normal de colisión para mejorar el sliding
function checkCollision(x, y, sala) {
  // Verificar colisión con muros
  if (murosPorSala[sala.id]) {
    for (const muro of murosPorSala[sala.id]) {
      // Si el muro tiene colisión desactivada, saltarlo
      if (!muro.colision) continue;
      
      // 🪨 Si el muro tiene imagen con forma rectangular (como muro_roca), usar colisión AABB rotada
      if ((muro.imagen || muro.tipo === 'muro_roca') && muro.forma !== 'ovalada') {
        // Colisión rectangular con rotación (AABB rotado)
        const cos = Math.cos(-muro.angle);
        const sin = Math.sin(-muro.angle);
        const relX = x - muro.x;
        const relY = y - muro.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        
        // Verificar si está dentro del rectángulo (con margen de colisión)
        const halfWidth = muro.width + 20; // Margen de 20px para el jugador
        const halfHeight = muro.height + 20;
        
        if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
          // Calcular normal basada en el lado más cercano
          let normX = 0, normY = 0;
          const distLeft = halfWidth + localX;
          const distRight = halfWidth - localX;
          const distTop = halfHeight + localY;
          const distBottom = halfHeight - localY;
          
          const minDist = Math.min(distLeft, distRight, distTop, distBottom);
          if (minDist === distLeft) normX = -1;
          else if (minDist === distRight) normX = 1;
          else if (minDist === distTop) normY = -1;
          else if (minDist === distBottom) normY = 1;
          
          // Transformar normal a sistema global
          const cosR = Math.cos(muro.angle);
          const sinR = Math.sin(muro.angle);
          const globalNormX = normX * cosR - normY * sinR;
          const globalNormY = normX * sinR + normY * cosR;
          
          return { muro, normalX: globalNormX, normalY: globalNormY };
        }
      } else {
        // Colisión ovalada para otros muros (muro_piedra y otros)
        const cos = Math.cos(-muro.angle);
        const sin = Math.sin(-muro.angle);
        const relX = x - muro.x;
        const relY = y - muro.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        const rx = muro.width + 32;
        const ry = muro.height + 32;
        if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
          // Calcular la normal del óvalo en el punto de colisión
          const normalLocalX = (2 * localX) / (rx * rx);
          const normalLocalY = (2 * localY) / (ry * ry);
          const normalLength = Math.sqrt(normalLocalX * normalLocalX + normalLocalY * normalLocalY) || 1;
          const normX = normalLocalX / normalLength;
          const normY = normalLocalY / normalLength;
          
          // Transformar normal a sistema global
          const cosR = Math.cos(muro.angle);
          const sinR = Math.sin(muro.angle);
          const globalNormX = normX * cosR - normY * sinR;
          const globalNormY = normX * sinR + normY * cosR;
          
          return { muro, normalX: globalNormX, normalY: globalNormY };
        }
      }
    }
  }
  return null; // No colisiona
}

// Loop global de movimiento server-authoritative (procesa keyStates y emite playerMoved)
// Mejorado para 60 tickrate (cada ~16ms) con envío optimizado
setInterval(() => {
  // Procesar cada sala activa
  for (const sala of salas) {
    if (!sala.active) continue;
    const updates = []; // Acumular actualizaciones para envío en batch
    
    for (const player of sala.players) {
      if (!player.keyStates) continue;
      let dx = 0, dy = 0;
      if (player.keyStates.w) dy -= 1;
      if (player.keyStates.s) dy += 1;
      if (player.keyStates.a) dx -= 1;
      if (player.keyStates.d) dx += 1;
      
      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= length;
        dy /= length;
        const moveDistance = (player.speed || DEFAULT_SPEED);
        let tempX = (typeof player.x === 'number' ? player.x : 1000) + dx * moveDistance;
        let tempY = (typeof player.y === 'number' ? player.y : 600) + dy * moveDistance;
        
        // Clamp to map boundaries
        tempX = Math.max(0, Math.min(2500, tempX));
        tempY = Math.max(0, Math.min(1500, tempY));
        
        // 🎮 SISTEMA DE SLIDING MEJORADO CON NORMALES
        let newX = player.x;
        let newY = player.y;
        
        // Primero intentar el movimiento completo
        const collision = checkCollision(tempX, tempY, sala);
        if (!collision) {
          // Sin colisión, mover libremente
          newX = tempX;
          newY = tempY;
        } else {
          // Hay colisión - usar la normal para calcular el deslizamiento perfecto
          const normal = { x: collision.normalX, y: collision.normalY };
          
          // Normalizar el vector de dirección del movimiento
          const moveVecX = tempX - player.x;
          const moveVecY = tempY - player.y;
          
          // Calcular el producto punto entre el movimiento y la normal
          const dot = moveVecX * normal.x + moveVecY * normal.y;
          
          // Si el jugador se está moviendo hacia la pared (dot < 0), aplicar sliding
          if (dot < 0) {
            // Proyectar el vector de movimiento a lo largo de la superficie (perpendicular a la normal)
            // slideVector = moveVector - (moveVector · normal) * normal
            const slideX = moveVecX - dot * normal.x;
            const slideY = moveVecY - dot * normal.y;
            
            // Aplicar el movimiento de deslizamiento
            const slideTargetX = player.x + slideX;
            const slideTargetY = player.y + slideY;
            
            // Verificar que el deslizamiento no cause otra colisión
            if (!checkCollision(slideTargetX, slideTargetY, sala)) {
              newX = slideTargetX;
              newY = slideTargetY;
            } else {
              // Si el deslizamiento completo falla, intentar con velocidad reducida
              const reducedSlideX = player.x + slideX * 0.5;
              const reducedSlideY = player.y + slideY * 0.5;
              
              if (!checkCollision(reducedSlideX, reducedSlideY, sala)) {
                newX = reducedSlideX;
                newY = reducedSlideY;
              } else {
                // Último recurso: intentar movimientos en ejes separados
                const onlyX = player.x + dx * moveDistance;
                if (!checkCollision(onlyX, player.y, sala)) {
                  newX = onlyX;
                } else {
                  const onlyY = player.y + dy * moveDistance;
                  if (!checkCollision(player.x, onlyY, sala)) {
                    newY = onlyY;
                  }
                }
              }
            }
          } else {
            // El jugador se está alejando de la pared, permitir movimiento normal en ejes
            const onlyX = player.x + dx * moveDistance;
            if (!checkCollision(onlyX, player.y, sala)) {
              newX = onlyX;
            }
            const onlyY = player.y + dy * moveDistance;
            if (!checkCollision(player.x, onlyY, sala)) {
              newY = onlyY;
            }
          }
        }
        
        // Update position if changed
        if (newX !== player.x || newY !== player.y) {
          player.x = newX;
          player.y = newY;
          updates.push({ nick: player.nick, x: player.x, y: player.y });
        }
      }
    }
    
    // Enviar todas las actualizaciones en batch para reducir overhead de red
    if (updates.length > 0) {
      for (const update of updates) {
        io.to(sala.id).emit('playerMoved', update);
      }
    }
  }
}, 16); // 60 FPS tick rate para movimiento más suave

// Utilidad para obtener el daño de una mejora
function getDanioMejora(mejoraId, ownerNick = null, sala = null) {
  const mejora = MEJORAS.find(m => m.id === mejoraId);
  let baseDanio = mejora ? mejora.danio : 10;
  if (mejoraId === 'electrico' && ownerNick && sala) {
    const player = sala.players.find(pl => pl.nick === ownerNick);
    if (player && typeof player.electricDamageBonus === 'number') {
      baseDanio += player.electricDamageBonus;
    }
  }
  // Aplicar bonus de daño del color equipado (Color Rojo: +1 daño)
  if (ownerNick && sala) {
    const player = sala.players.find(pl => pl.nick === ownerNick);
    if (player && typeof player.colorBonusDamage === 'number') {
      baseDanio += player.colorBonusDamage;
    }
  }
  // Si el owner tiene 'explosion_sabor' y la mejora es proyectil o proyectilQ, reducir daño según el efecto
  if (ownerNick && sala) {
    const player = sala.players.find(pl => pl.nick === ownerNick);
    if (player && player.mejoras) {
      const saborMejora = player.mejoras.find(m => m.id === 'explosion_sabor');
      if (saborMejora) {
        const mejoraSabor = MEJORAS.find(m => m.id === 'explosion_sabor');
        const damageReduction = mejoraSabor && mejoraSabor.efecto && typeof mejoraSabor.efecto.damageReduction === 'number' ? mejoraSabor.efecto.damageReduction : 0.3;
        if (mejora && (mejora.proyectil || mejora.proyectilQ)) {
          baseDanio = Math.floor(baseDanio * (1 - damageReduction));
        }
      }
      // Si el owner tiene 'dividor' y la mejora es proyectil, reducir daño flat por stack
      const dividorMejora = player.mejoras.find(m => m.id === 'dividor');
      if (dividorMejora) {
        const mejoraDividor = MEJORAS.find(m => m.id === 'dividor');
        const damageReductionFlat = mejoraDividor && mejoraDividor.efecto && typeof mejoraDividor.efecto.damageReductionFlat === 'number' ? mejoraDividor.efecto.damageReductionFlat : 3;
        const dividorStacks = player.mejoras.filter(m => m.id === 'dividor').length;
        if (mejora && mejora.proyectil) {
          baseDanio -= damageReductionFlat * dividorStacks;
          baseDanio = Math.max(0, baseDanio); // no negativo
        }
      }
    }
  }
  return baseDanio;
}

// Utilidad para obtener el efecto de una mejora
function getEffectMejora(mejoraId) {
  const mejora = MEJORAS.find(m => m.id === mejoraId);
  return mejora ? mejora.effect : null;
}

// Función para aplicar daño considerando escudo
function applyDamage(player, damage, io, salaId, type = 'hit') {
  let absorbed = 0;
  if (player.shieldAmount > 0) {
    absorbed = Math.min(damage, player.shieldAmount);
    damage -= absorbed;
    player.shieldAmount -= absorbed;
    io.to(salaId).emit('shieldDamage', { nick: player.nick, absorbed });
    // Damage reflection if has dano_escudo and not already a reflection
    if (type !== 'reflection' && player.mejoras && absorbed > 0) {
      const danoEscudoCount = player.mejoras.filter(m => m.id === 'dano_escudo').length;
      if (danoEscudoCount > 0 && player.lastAttacker) {
        const sala = salas.find(s => s.id === salaId);
        if (sala) {
          const attacker = sala.players.find(p => p.nick === player.lastAttacker);
          if (attacker && attacker !== player) {
            const reflectionDamage = Math.floor(absorbed * 0.5);
            applyDamage(attacker, reflectionDamage, io, salaId, 'reflection');
          }
        }
      }
    }
  }
  player.health = Math.max(0, player.health - damage);
  io.to(salaId).emit('damageEvent', { target: player.nick, amount: damage, type });
}

// Función para manejar explosión de proyectil
function handleExplosion(sala, proyectil, io) {
  const mejora = MEJORAS.find(m => m.id === proyectil.mejoraId);
  if (!mejora) return;

  // Buscar jugador owner
  const player = sala.players.find(p => p.nick === proyectil.owner);
  let explosionRadius = mejora.explosionRadius || 80;
  // Si no tiene explosionDamage, usar el daño base del proyectil (incluyendo bonuses)
  let explosionDamage = (typeof mejora.explosionDamage === 'number') ? mejora.explosionDamage : getDanioMejora(mejora.id, proyectil.owner, sala);

  // Si el owner tiene el aumento 'explosion_sabor', sumar el bonus por stack
  if (player && player.mejoras) {
    const saborStacks = player.mejoras.filter(m => m.id === 'explosion_sabor').length;
    if (saborStacks > 0) {
      // Si la mejora tiene explosionRadiusBonus, usar ese valor, si no, usar 40 por stack
      const saborMejora = MEJORAS.find(m => m.id === 'explosion_sabor');
      const bonus = (saborMejora && saborMejora.efecto && saborMejora.efecto.explosionRadiusBonus) ? saborMejora.efecto.explosionRadiusBonus : 40;
      explosionRadius += saborStacks * bonus;
    }
  }

  // Aplicar daño y pasiva a todos los jugadores en el radio, excepto el owner
  for (const jugador of sala.players) {
    if (jugador.nick === proyectil.owner || jugador.defeated) continue;

    const dx = jugador.x - proyectil.x;
    const dy = jugador.y - proyectil.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= explosionRadius) {
      jugador.lastAttacker = proyectil.owner;
      applyDamage(jugador, explosionDamage, io, sala.id, 'explosion');
      // Aplicar efecto de la mejora si existe
      const effect = getEffectMejora(proyectil.mejoraId);
      if (effect) {
        const now = Date.now();
        if (effect.type === 'slow') {
          if (jugador.slowUntil > now) {
            jugador.slowUntil = now + (effect.duration || 1000);
          } else {
            jugador.speed = Math.max(0, DEFAULT_SPEED - effect.amount);
            jugador.slowUntil = now + (effect.duration || 1000);
          }
        } else if (effect.type === 'dot') {
          jugador.dotUntil = now + (effect.duration || 3000);
          jugador.dotDamage = effect.damage || 2;
          jugador.dotType = effect.dotType || 'fire';
          jugador.lastDotTime = now;
        } else if (effect.type === 'stackingDot') {
          if (jugador.dotUntil > now) {
            jugador.dotDamage += effect.damage;
          } else {
            jugador.dotDamage = effect.damage;
          }
          jugador.dotUntil = now + (effect.duration || 6000);
          jugador.dotType = effect.dotType || 'poison';
          jugador.lastDotTime = now;
        }
      }
      // Aplicar pasiva especial (onHit) si existe
      if (mejora.onHit) {
        const portador = sala.players.find(pl => pl.nick === proyectil.owner);
        if (portador) {
          if (mejora.onHit.type === 'speedStack') {
            if (typeof portador.electricStacks !== 'number') portador.electricStacks = 0;
            if (typeof portador.electricSpeedBonus !== 'number') portador.electricSpeedBonus = 0;
            if (typeof portador.lastElectricStackTime !== 'number') portador.lastElectricStackTime = 0;
            if (portador.electricStacks < mejora.onHit.maxStacks) {
              portador.electricStacks++;
              portador.electricSpeedBonus += mejora.onHit.amount;
              portador.speed = DEFAULT_SPEED + portador.electricSpeedBonus;
            }
            portador.lastElectricStackTime = Date.now();
            io.to(sala.id).emit('electricStackUpdate', {
              nick: portador.nick,
              electricStacks: portador.electricStacks,
              speed: portador.speed
            });
          } else if (mejora.onHit.type === 'damageStack') {
            if (typeof portador.electricDamageBonus !== 'number') portador.electricDamageBonus = 0;
            // Por cada jugador dañado por la explosión, aumentar el daño Y el daño de la explosión para el siguiente jugador
            portador.electricDamageBonus += mejora.onHit.amount;
            explosionDamage += mejora.onHit.amount;
            io.to(sala.id).emit('electricDamageUpdate', {
              nick: portador.nick,
              electricDamageBonus: portador.electricDamageBonus
            });
          }
        }
      }
    }
  }

  // Emitir evento de explosión para que el frontend la dibuje
  io.to(sala.id).emit('explosion', {
    x: proyectil.x,
    y: proyectil.y,
    radius: explosionRadius,
    color: mejora.color,
    duration: 500 // duración en ms para animación
  });
}

// Loop de simulación (16.67ms ~ 60 FPS)
const SIMULATION_DT = 1000 / 60;

setInterval(() => {
  for (const sala of salas) {
    if (!sala.active) continue;
    const proyectiles = proyectilesPorSala[sala.id] || [];
    const jugadores = sala.players;
    const now = Date.now();
    // Inicializar vida si no existe
    for (const jugador of jugadores) {
      if (typeof jugador.health !== 'number') jugador.health = 200;
      if (typeof jugador.speed !== 'number') jugador.speed = DEFAULT_SPEED;
      if (typeof jugador.slowUntil !== 'number') jugador.slowUntil = 0;
      if (typeof jugador.speedBoostUntil !== 'number') jugador.speedBoostUntil = 0;
      if (typeof jugador.dotUntil !== 'number') jugador.dotUntil = 0;
      if (typeof jugador.dotDamage !== 'number') jugador.dotDamage = 0;
      if (typeof jugador.dotType !== 'string') jugador.dotType = null;
      if (typeof jugador.lastDotTime !== 'number') jugador.lastDotTime = 0;
      if (typeof jugador.defeated !== 'boolean') jugador.defeated = false;
      if (typeof jugador.shieldAmount !== 'number') jugador.shieldAmount = 0;
      if (typeof jugador.shieldUntil !== 'number') jugador.shieldUntil = 0;
      // Expirar shield
      if (jugador.shieldUntil && now > jugador.shieldUntil) {
        jugador.shieldAmount = 0;
        jugador.shieldUntil = 0;
      }
      // Si la vida es 0 y no está derrotado, marcar como derrotado
      if (jugador.health <= 0 && !jugador.defeated) {
        console.log(`[DEBUG] ${jugador.nick} murió. Killer: ${jugador.lastAttacker}`);
        jugador.defeated = true;
        // Increment deaths for victim
        jugador.deaths = (jugador.deaths || 0) + 1;
        // Increment kills for killer
        if (jugador.lastAttacker) {
          const killer = sala.players.find(p => p.nick === jugador.lastAttacker);
          if (killer) {
            killer.kills = (killer.kills || 0) + 1;
            // Otorgar 5 de oro por kill
            killer.gold = (killer.gold || 0) + 5;
          }
        }
        // Emitir evento de tumba
        io.to(sala.id).emit('playerDied', {
          nick: jugador.nick,
          x: jugador.x,
          y: jugador.y
        });
      }
    }
      // Lógica de curación de Suelo Sagrado
      if (sacredGroundsPorSala[sala.id]) {
        for (const ground of sacredGroundsPorSala[sala.id]) {
          if (now - ground.createdAt > ground.duration) continue; // expirado
          // Solo cura al invocador
          const jugador = jugadores.find(j => j.nick === ground.owner);
          if (!jugador || jugador.defeated) continue;
          const dx = jugador.x - ground.x;
          const dy = jugador.y - ground.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= ground.radius + 32) {
            // Curar cada segundo
            if (!ground.lastHealTime || now - ground.lastHealTime >= ground.healInterval) {
              jugador.health = Math.min(200, jugador.health + ground.healAmount);
              ground.lastHealTime = now;
              io.to(sala.id).emit('healEvent', { target: jugador.nick, amount: ground.healAmount, type: 'suelo_sagrado' });
            }
          }
        }
        // Remover suelos expirados
        sacredGroundsPorSala[sala.id] = sacredGroundsPorSala[sala.id].filter(g => now - g.createdAt < g.duration);
      }
    // Actualizar proyectiles y detectar colisiones
    for (let i = proyectiles.length - 1; i >= 0; i--) {
      const p = proyectiles[i];
      p.x += Math.cos(p.angle) * p.velocidad;
      p.y += Math.sin(p.angle) * p.velocidad;
      p.lifetime = (p.lifetime || 0) + SIMULATION_DT;
      let destroy = false;
      let reboteado = false;
      // Rebote en muros exteriores
      let reboteStacks = 0;
      const mejoraProyectil = MEJORAS.find(m => m.id === p.mejoraId);
      // Destruir si supera maxRange
      if (mejoraProyectil && p.startX !== undefined && p.startY !== undefined) {
        const maxRangeActual = p.maxRange || mejoraProyectil.maxRange; // Usar maxRange guardado o fallback
        const distRecorrida = Math.sqrt((p.x - p.startX)**2 + (p.y - p.startY)**2);
        if (distRecorrida > maxRangeActual) destroy = true;
      }
      // Solo proyectiles con proyectil: true
      if (mejoraProyectil && mejoraProyectil.proyectil === true) {
        const player = sala.players.find(pl => pl.nick === p.owner);
        if (player) {
          reboteStacks = player.mejoras.filter(m => m.id === 'rebote').length;
        }
        if (reboteStacks > 0 && p.rebotes === undefined) p.rebotes = 0;
        // Rebote en bordes del mapa
        if (reboteStacks > 0 && p.rebotes < reboteStacks) {
          if (p.x < 0 || p.x > 2500) {
            p.angle = Math.PI - p.angle;
            p.rebotes = (p.rebotes || 0) + 1;
            p.lifetime = 0;
            // Recalcular destino y rango
            const range = p.maxRange || mejoraProyectil?.maxRange || 200;
            p.targetX = p.x + Math.cos(p.angle) * range;
            p.targetY = p.y + Math.sin(p.angle) * range;
            reboteado = true;
          }
          if (p.y < 0 || p.y > 1500) {
            p.angle = -p.angle;
            p.rebotes = (p.rebotes || 0) + 1;
            p.lifetime = 0;
            // Recalcular destino y rango
            const range = p.maxRange || mejoraProyectil?.maxRange || 200;
            p.targetX = p.x + Math.cos(p.angle) * range;
            p.targetY = p.y + Math.sin(p.angle) * range;
            reboteado = true;
          }
        }
      }
      // Rebote en muros con colision:true
      const muros = murosPorSala[sala.id] || [];
      if (!reboteado) {
        for (const muro of muros) {
          if (!muro.colision) continue;
          
          let colisionDetectada = false;
          let globalNormX = 0, globalNormY = 0;
          
          // 🪨 Si el muro tiene forma rectangular (como muro_roca)
          if ((muro.imagen || muro.tipo === 'muro_roca') && muro.forma === 'rectangular') {
            // Colisión rectangular con rotación (AABB rotado)
            const cos = Math.cos(-muro.angle);
            const sin = Math.sin(-muro.angle);
            const relX = p.x - muro.x;
            const relY = p.y - muro.y;
            const localX = relX * cos - relY * sin;
            const localY = relX * sin + relY * cos;
            
            const halfWidth = muro.width + (p.radius || 16);
            const halfHeight = muro.height + (p.radius || 16);
            
            if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
              colisionDetectada = true;
              
              // Calcular normal basada en el lado más cercano del rectángulo
              let normX = 0, normY = 0;
              const distLeft = halfWidth + localX;
              const distRight = halfWidth - localX;
              const distTop = halfHeight + localY;
              const distBottom = halfHeight - localY;
              
              const minDist = Math.min(distLeft, distRight, distTop, distBottom);
              if (minDist === distLeft) normX = -1;
              else if (minDist === distRight) normX = 1;
              else if (minDist === distTop) normY = -1;
              else if (minDist === distBottom) normY = 1;
              
              // Transformar la normal de vuelta al sistema global
              const cosR = Math.cos(muro.angle);
              const sinR = Math.sin(muro.angle);
              globalNormX = normX * cosR - normY * sinR;
              globalNormY = normX * sinR + normY * cosR;
            }
          } else {
            // Colisión ovalada para otros muros
            const mejoraMuro = MEJORAS.find(m => m.id === muro.id);
            if (!mejoraMuro || !mejoraMuro.colision) continue;
            
            // Transformar la posición del proyectil al sistema local del muro
            const cos = Math.cos(-muro.angle);
            const sin = Math.sin(-muro.angle);
            const relX = p.x - muro.x;
            const relY = p.y - muro.y;
            const localX = relX * cos - relY * sin;
            const localY = relX * sin + relY * cos;
            const rx = muro.width + (p.radius || 16);
            const ry = muro.height + (p.radius || 16);
            
            // Verificar colisión con el óvalo
            const distanceSquared = (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry);
            
            if (distanceSquared <= 1) {
              colisionDetectada = true;
              
              // Calcular la normal del óvalo en el punto de colisión
              const normalLocalX = (2 * localX) / (rx * rx);
              const normalLocalY = (2 * localY) / (ry * ry);
              const normalLength = Math.sqrt(normalLocalX * normalLocalX + normalLocalY * normalLocalY);
              const normX = normalLocalX / normalLength;
              const normY = normalLocalY / normalLength;
              
              // Transformar la normal de vuelta al sistema global
              const cosR = Math.cos(muro.angle);
              const sinR = Math.sin(muro.angle);
              globalNormX = normX * cosR - normY * sinR;
              globalNormY = normX * sinR + normY * cosR;
            }
          }
          
          // Si hay colisión detectada, procesar rebote o destrucción
          if (colisionDetectada) {
            // Hay colisión con el muro
            if (reboteStacks > 0 && p.rebotes < reboteStacks) {
              // REBOTE: Calcular la velocidad del proyectil
              const velX = Math.cos(p.angle);
              const velY = Math.sin(p.angle);
              
              // Reflexión: v' = v - 2(v·n)n
              const dot = velX * globalNormX + velY * globalNormY;
              const reflectX = velX - 2 * dot * globalNormX;
              const reflectY = velY - 2 * dot * globalNormY;
              
              // Calcular el nuevo ángulo
              p.angle = Math.atan2(reflectY, reflectX);
              p.rebotes = (p.rebotes || 0) + 1;
              p.lifetime = 0;
              
              // Empujar el proyectil ligeramente fuera del muro para evitar colisiones múltiples
              p.x += globalNormX * 10;
              p.y += globalNormY * 10;
              
              // Recalcular destino y rango
              const mejora = MEJORAS.find(m => m.id === p.mejoraId);
              const range = p.maxRange || mejora?.maxRange || 200;
              p.targetX = p.x + Math.cos(p.angle) * range;
              p.targetY = p.y + Math.sin(p.angle) * range;
              
              reboteado = true;
              break;
            } else {
              // Sin rebotes restantes o no tiene rebote - destruir proyectil
              const mejora = MEJORAS.find(m => m.id === p.mejoraId);
              if (p.mejoraId === 'meteoro') {
                p.hasHit = true;
                handleExplosion(sala, p, io);
              }
              if (p.mejoraId === 'cuchilla_fria') {
                destroy = true;
                break;
              }
              destroy = true;
              break;
            }
          }
        }
      }
      // Si supera los rebotes permitidos, destruir si sale del mapa
      if (!reboteado && (p.x < 0 || p.x > 2500 || p.y < 0 || p.y > 1500)) {
        destroy = true;
      }
      // Si es skill shot, destruir al llegar a destino
      if (!destroy && p.skillShot && typeof p.targetX === 'number' && typeof p.targetY === 'number') {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < p.velocidad) { // Llega o pasa el destino
          // Verificar si es skyfall
          const mejora = MEJORAS.find(m => m.id === p.mejoraId);
          if (mejora && mejora.skyfall) {
            // Para skyfall, aplicar daño en área en el target cuando llega al suelo
            const skyfallRadius = p.radius; // Usar el radio agrandado del proyectil
            for (const jugador of jugadores) {
              if (jugador.nick === p.owner || jugador.defeated) continue;
              const jdx = jugador.x - p.targetX;
              const jdy = jugador.y - p.targetY;
              const jdist = Math.sqrt(jdx*jdx + jdy*jdy);
              if (jdist <= skyfallRadius + 32) { // radio mejora + radio jugador
                const damage = getDanioMejora(p.mejoraId, p.owner, sala);
                jugador.lastAttacker = p.owner;
                applyDamage(jugador, damage, io, sala.id, 'skyfall');
              }
            }
            // Special effect for roca_fangosa: create muddy ground
            if (p.mejoraId === 'roca_fangosa') {
              if (!muddyGroundsPorSala[sala.id]) muddyGroundsPorSala[sala.id] = [];
              muddyGroundsPorSala[sala.id].push({
                x: p.targetX,
                y: p.targetY,
                radius: p.radius * 1.57, // Ajustar al radio agrandado
                slowAmount: 0.4, // 40% slow
                duration: 3000, // 2 segundos
                createdAt: Date.now()
              });
              // Emit to frontend to draw the muddy ground
              io.to(sala.id).emit('muddyGroundCreated', {
                x: p.targetX,
                y: p.targetY,
                radius: p.radius * 1.19, // Ajustar al radio agrandado
                duration: 3000
              });
            }
          } else if (p.mejoraId === 'cuchilla_fria') {
            // Si llegó al destino, pero ya fue destruida por muro, no generar menores
            // Solo generar si no fue destruida por muro
            if (!destroy) {
              const baseAngle = p.angle;
              const angles = [baseAngle, baseAngle + Math.PI/6, baseAngle - Math.PI/6]; // 30° de separación
              for (const ang of angles) {
                const player = sala.players.find(pl => pl.nick === p.owner);
                let radiusMenor = 10;
                if (player) {
                  const agrandadores = player.mejoras.filter(m => m.id === 'agrandar');
                  const numAgrandadores = agrandadores.length;
                  radiusMenor += numAgrandadores * 10;
                }
                const menorMaxRange = MEJORAS.find(m => m.id === 'cuchilla_fria_menor')?.maxRange || 200;
                proyectiles.push({
                  id: ++projectileIdCounter,
                  x: p.x,
                  y: p.y,
                  startX: p.x,
                  startY: p.y,
                  angle: ang,
                  velocidad: 13, // Menor velocidad
                  mejoraId: 'cuchilla_fria_menor',
                  owner: p.owner,
                  lifetime: 0,
                  radius: radiusMenor,
                  skillShot: true,
                  // Usar el rango definido en MEJORAS
                  targetX: p.x + Math.cos(ang) * menorMaxRange,
                  targetY: p.y + Math.sin(ang) * menorMaxRange,
                  hasHit: false,
                  maxRange: menorMaxRange
                });
              }
            }
          }
          destroy = true;
        }
      }
      if (destroy) {
        // Si es meteoro y no ha impactado, hacer explosión
        if (p.mejoraId === 'meteoro' && !p.hasHit) {
          handleExplosion(sala, p, io);
        }
        // Si el proyectil no tiene daño en área pero el jugador tiene 'explosion_sabor', crear explosión
        const player = sala.players.find(pl => pl.nick === p.owner);
        if (player && player.mejoras && player.mejoras.some(m => m.id === 'explosion_sabor')) {
          const mejora = MEJORAS.find(m => m.id === p.mejoraId);
          // Solo si no tiene explosionDamage definido
          if (!mejora || !mejora.explosionDamage) {
            handleExplosion(sala, p, io);
          }
        }
        proyectiles.splice(i, 1);
        continue;
      }
      // Colisión con jugadores (no impacta al owner)
      for (const jugador of jugadores) {
        if (jugador.nick === p.owner) continue;
        if (jugador.defeated) continue; // Ignorar derrotados para colisiones
        // Si el proyectil menor tiene ignoreNick y es el jugador impactado, ignorar daño
        if (p.mejoraId === 'cuchilla_fria_menor' && p.ignoreNick && jugador.nick === p.ignoreNick) continue;
        // Para skyfall, no aplicar daño en colisión, solo al llegar al suelo
        const mejora = MEJORAS.find(m => m.id === p.mejoraId);
        if (mejora && mejora.skyfall) continue;
        // Distancia al centro del jugador (radio 32)
        const dx = jugador.x - p.x;
        const dy = jugador.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 32 + 16) { // radio jugador + radio proyectil
          // Impacto: bajar vida
          const damage = getDanioMejora(p.mejoraId, p.owner, sala);
          // Siempre asignar lastAttacker para daño de proyectil
          // Especialmente para electrico y cualquier otro daño
          jugador.lastAttacker = p.owner;
          if (p.mejoraId === 'meteoro') {
            // Meteoro: solo daño directo, no explosión aquí
            applyDamage(jugador, damage, io, sala.id, 'hit');
            p.hasHit = true;
          } else if (p.mejoraId === 'cuchilla_fria') {
            // Cuchilla fria: daño normal y proyectiles menores salen desde la parte trasera del jugador impactado
            applyDamage(jugador, damage, io, sala.id, 'hit');
            const mejoraSlow = MEJORAS.find(m => m.id === p.mejoraId);
            if (mejoraSlow && mejoraSlow.effect && mejoraSlow.effect.type === 'slow') {
              jugador.slowUntil = now + mejoraSlow.effect.duration;
              jugador.speed = DEFAULT_SPEED * (1 - mejoraSlow.effect.amount);
            }
            // Calcular ángulo de impacto (de p hacia jugador)
            const impactAngle = Math.atan2(jugador.y - p.y, jugador.x - p.x);
            // Los proyectiles menores salen por el lado opuesto al impacto (por atrás)
            const salidaAngle = impactAngle;
            const baseX = jugador.x;
            const baseY = jugador.y;
            // Guardar nick del jugador impactado para que los menores lo ignoren
            const impactadoNick = jugador.nick;
            const angles = [salidaAngle, salidaAngle + Math.PI/6, salidaAngle - Math.PI/6];
            for (const ang of angles) {
              const player = sala.players.find(pl => pl.nick === p.owner);
              let radiusMenor = 10;
              if (player) {
                const agrandadores = player.mejoras.filter(m => m.id === 'agrandar');
                const numAgrandadores = agrandadores.length;
                radiusMenor += numAgrandadores * 10;
              }
              const menorMaxRange = MEJORAS.find(m => m.id === 'cuchilla_fria_menor')?.maxRange || 200;
              proyectiles.push({
                id: ++projectileIdCounter,
                x: baseX,
                y: baseY,
                startX: baseX,
                startY: baseY,
                angle: ang,
                velocidad: 13,
                mejoraId: 'cuchilla_fria_menor',
                owner: p.owner,
                lifetime: 0,
                radius: radiusMenor,
                skillShot: true,
                // Usar el rango definido en MEJORAS
                targetX: baseX + Math.cos(ang) * menorMaxRange,
                targetY: baseY + Math.sin(ang) * menorMaxRange,
                hasHit: false,
                ignoreNick: impactadoNick, // Nuevo campo para ignorar daño a este jugador
                maxRange: menorMaxRange
              });
            }
          } else {
            // Otros proyectiles: daño normal
            applyDamage(jugador, damage, io, sala.id, 'hit');
            
            // Aplicar efectos de la mejora
            const mejora = MEJORAS.find(m => m.id === p.mejoraId);
            const effect = getEffectMejora(p.mejoraId);
            
            // Aplicar efecto si existe
            if (effect) {
              if (effect.type === 'slow') {
                jugador.slowUntil = now + (effect.duration || 1000);
                jugador.speed = DEFAULT_SPEED * (1 - effect.amount);
              } else if (effect.type === 'dot') {
                jugador.dotUntil = now + (effect.duration || 3000);
                jugador.dotDamage = effect.damage || 2;
                jugador.dotType = effect.dotType || 'fire';
                jugador.lastDotTime = now;
              } else if (effect.type === 'stackingDot') {
                if (jugador.dotUntil > now) {
                  jugador.dotDamage += effect.damage;
                } else {
                  jugador.dotDamage = effect.damage;
                }
                jugador.dotUntil = now + (effect.duration || 6000);
                jugador.dotType = effect.dotType || 'poison';
                jugador.lastDotTime = now;
              }
            }
            
            // Leer efecto onHit de la mejora
            if (mejora && mejora.onHit) {
              const portador = sala.players.find(pl => pl.nick === p.owner);
              if (portador) {
                if (mejora.onHit.type === 'speedStack') {
                  if (typeof portador.electricStacks !== 'number') portador.electricStacks = 0;
                  if (typeof portador.electricSpeedBonus !== 'number') portador.electricSpeedBonus = 0;
                  if (typeof portador.lastElectricStackTime !== 'number') portador.lastElectricStackTime = 0;
                  if (portador.electricStacks < mejora.onHit.maxStacks) {
                    portador.electricStacks++;
                    portador.electricSpeedBonus += mejora.onHit.amount;
                    portador.speed = DEFAULT_SPEED + portador.electricSpeedBonus;
                  }
                  // Reiniciar el temporizador de stacks
                  portador.lastElectricStackTime = Date.now();
                  // Emitir actualización de velocidad y stacks al portador
                  io.to(sala.id).emit('electricStackUpdate', {
                    nick: portador.nick,
                    electricStacks: portador.electricStacks,
                    speed: portador.speed
                  });
                } else if (mejora.onHit.type === 'damageStack') {
                  if (typeof portador.electricDamageBonus !== 'number') portador.electricDamageBonus = 0;
                  portador.electricDamageBonus += mejora.onHit.amount;
                  // Emitir actualización de daño
                  io.to(sala.id).emit('electricDamageUpdate', {
                    nick: portador.nick,
                    electricDamageBonus: portador.electricDamageBonus
                  });
                }
              }
            }
          }
          proyectiles.splice(i, 1);
          break;
        }
      }
    }
    // Verificar expiración de slows, dot y stacks eléctricos
    for (const jugador of jugadores) {
      if (jugador.slowUntil && now > jugador.slowUntil) {
        jugador.speed = DEFAULT_SPEED;
        jugador.slowUntil = 0;
      }
      if (jugador.speedBoostUntil && now > jugador.speedBoostUntil) {
        jugador.speed = DEFAULT_SPEED;
        jugador.speedBoostUntil = 0;
      }
      // Check muddy grounds for slow
      let inMuddy = false;
      if (muddyGroundsPorSala[sala.id]) {
        for (const muddy of muddyGroundsPorSala[sala.id]) {
          const dx = jugador.x - muddy.x;
          const dy = jugador.y - muddy.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= muddy.radius + 32) { // player radius 32
            inMuddy = true;
            break;
          }
        }
      }
      if (inMuddy) {
  jugador.speed = Math.max(0, DEFAULT_SPEED * (1 - 0.4)); // 40% slow
      } else if (!jugador.slowUntil && !jugador.speedBoostUntil) {
        // If not in muddy and no slowUntil and no speedBoostUntil, ensure speed is DEFAULT
        jugador.speed = DEFAULT_SPEED;
      }
      if (jugador.dotUntil && now <= jugador.dotUntil) {
        if (now - jugador.lastDotTime >= 1000) {
          applyDamage(jugador, jugador.dotDamage, io, sala.id, `dot_${jugador.dotType || 'unknown'}`);
          jugador.lastDotTime = now;
        }
      } else if (jugador.dotUntil && now > jugador.dotUntil) {
        jugador.dotUntil = 0;
        jugador.dotDamage = 0;
        jugador.dotType = null;
        jugador.lastDotTime = 0;
      }
      // Expiración de stacks eléctricos
      if (typeof jugador.electricStacks === 'number' && jugador.electricStacks > 0) {
        if (typeof jugador.lastElectricStackTime === 'number' && now - jugador.lastElectricStackTime > 3000) {
          jugador.electricStacks = 0;
          jugador.electricSpeedBonus = 0;
          jugador.speed = DEFAULT_SPEED;
          jugador.lastElectricStackTime = 0;
          io.to(sala.id).emit('electricStackUpdate', {
            nick: jugador.nick,
            electricStacks: 0,
            speed: DEFAULT_SPEED
          });
        }
      }
    }
    // Lógica de dashing para Embestida
    for (const player of jugadores) {
      if (player.isDashing) {
        const dx = player.dashTargetX - player.x;
        const dy = player.dashTargetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 25) { // Área de destino grande para evitar tambaleo
          player.isDashing = false;
          // Verificar colisiones finales si no hit
          if (!player.dashHit) {
            const collisionRadius = 60;
            for (const enemy of jugadores) {
              if (enemy === player || enemy.defeated) continue;
              const ex = enemy.x - player.x;
              const ey = enemy.y - player.y;
              const edist = Math.sqrt(ex * ex + ey * ey);
              if (edist <= collisionRadius) {
                enemy.lastAttacker = player.nick;
                applyDamage(enemy, 20, io, sala.id, 'embestida');
               
                const pushDist = 130;
                const pushX = ex / edist * pushDist;
                const pushY = ey / edist * pushDist;
                if (!enemy.isPushed) {
                  enemy.isPushed = true;
                  enemy.pushTargetX = enemy.x + pushX;
                  enemy.pushTargetY = enemy.y + pushY;
                  enemy.pushSpeed = 14; // Más rápido que el dash para reducir tiempo de movimiento
                }
                player.dashHit = true;
                break;
              }
            }
          }
        } else {
          const ang = Math.atan2(dy, dx);
          player.x += Math.cos(ang) * player.dashSpeed;
          player.y += Math.sin(ang) * player.dashSpeed;
          // Verificar colisiones durante el movimiento
          if (!player.dashHit) {
            for (const enemy of jugadores) {
              if (enemy === player || enemy.defeated) continue;
              const ex = enemy.x - player.x;
              const ey = enemy.y - player.y;
              const edist = Math.sqrt(ex * ex + ey * ey);
              if (edist < 40) { // collision radius
                enemy.lastAttacker = player.nick;
                applyDamage(enemy, 20, io, sala.id, 'embestida');
                const pushDist = 100;
                const pushX = ex / edist * pushDist;
                const pushY = ey / edist * pushDist;
                if (!enemy.isPushed) {
                  enemy.isPushed = true;
                  enemy.pushTargetX = enemy.x + pushX;
                  enemy.pushTargetY = enemy.y + pushY;
                  enemy.pushSpeed = 20; // Más rápido que el dash para reducir tiempo de movimiento
                }
                player.dashHit = true;
                break;
              }
            }
          }
          // Verificar colisión con muros
          const muros = murosPorSala[sala.id] || [];
          for (const muro of muros) {
            if (muro.width && muro.height && typeof muro.angle === 'number') {
              const cos = Math.cos(-muro.angle);
              const sin = Math.sin(-muro.angle);
              const relX = player.x - muro.x;
              const relY = player.y - muro.y;
              const localX = relX * cos - relY * sin;
              const localY = relX * sin + relY * cos;
              const rx = muro.width + 32; // radio aproximado del player
              const ry = muro.height + 32;
              if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
                // Colisiona, detener dash y rebotar hacia atrás
                player.isDashing = false;
                // Calcular dirección opuesta al dash
                const ang = Math.atan2(dy, dx);
                const reboundAng = ang + Math.PI;
                const reboundDist = 60;
                const reboundX = Math.cos(reboundAng) * reboundDist;
                const reboundY = Math.sin(reboundAng) * reboundDist;
                if (!player.isPushed) {
                  player.isPushed = true;
                  player.pushTargetX = player.x + reboundX;
                  player.pushTargetY = player.y + reboundY;
                  player.pushSpeed = 12; // Velocidad de rebote fluida
                }
                break;
              }
            }
          }
        }
      }
    }
    // Lógica de pushed para enemigos impactados por Embestida
    for (const player of jugadores) {
      if (player.isPushed) {
        const dx = player.pushTargetX - player.x;
        const dy = player.pushTargetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          player.x = player.pushTargetX;
          player.y = player.pushTargetY;
          player.isPushed = false;
        } else {
          const ang = Math.atan2(dy, dx);
          player.x += Math.cos(ang) * player.pushSpeed;
          player.y += Math.sin(ang) * player.pushSpeed;
        }
      }
    }
    // Remove expired muddy grounds
    if (muddyGroundsPorSala[sala.id]) {
      muddyGroundsPorSala[sala.id] = muddyGroundsPorSala[sala.id].filter(muddy => now - muddy.createdAt < muddy.duration);
    }
    // Remove expired walls
    if (murosPorSala[sala.id]) {
      murosPorSala[sala.id] = murosPorSala[sala.id].filter(muro => now - muro.creado < muro.duracion);
    }
    // Verificar si solo queda 1 jugador vivo (no derrotado)
    const vivos = jugadores.filter(j => !j.defeated);
    if (vivos.length === 1 && jugadores.length > 1) {
      // Fin de ronda: reiniciar todos los jugadores
      for (const jugador of jugadores) {
        jugador.health = 200;
        jugador.defeated = false;
        // Mantener mejoras, pero puedes reiniciar posición aquí si lo deseas
      }
      // Limpiar proyectiles
      proyectiles.length = 0;
      // Limpiar casts y suelos fangosos
      if (castsPorSala[sala.id]) castsPorSala[sala.id] = [];
      if (muddyGroundsPorSala[sala.id]) muddyGroundsPorSala[sala.id] = [];
      if (murosPorSala[sala.id]) murosPorSala[sala.id] = [];
      // Reposicionar jugadores (igual que al iniciar partida)
      const offset = 200;
      jugadores.forEach((player, i) => {
        if (i === 0) { // esquina arriba-izquierda
          player.x = offset;
          player.y = offset;
        } else if (i === 1) { // esquina arriba-derecha
          player.x = 2500 - offset;
          player.y = offset;
        } else if (i === 2) { // esquina abajo-izquierda
          player.x = offset;
          player.y = 1500 - offset;
        } else if (i === 3) { // esquina abajo-derecha
          player.x = 2500 - offset;
          player.y = 1500 - offset;
        } else {
          player.x = 1250;
          player.y = 750;
        }
        player.speed = DEFAULT_SPEED;
        player.slowUntil = 0;
        player.speedBoostUntil = 0;
        player.dotUntil = 0;
        player.dotDamage = 0;
        player.dotType = null;
        player.lastDotTime = 0;
        player.electricStacks = 0; // Resetear stacks de velocidad eléctrica
        player.electricSpeedBonus = 0; // Resetear bonus de velocidad eléctrica
        player.lastElectricStackTime = 0; // Resetear temporizador de stacks
        player.electricDamageBonus = 0; // Resetear bonus de daño eléctrico
      });
      // Notificar a los clientes que la ronda terminó y se reinicia
      io.to(sala.id).emit('roundEnded', { winner: vivos[0].nick });
      // Increment victories for the winner
      const winner = sala.players.find(p => p.nick === vivos[0].nick);
      if (winner) {
        winner.victories = (winner.victories || 0) + 1;
        // Otorgar 10 de oro por ronda ganada
        winner.gold = (winner.gold || 0) + 10;
      }
      // Avanzar la ronda de la sala
      sala.round = (sala.round || 1) + 1;
      if (sala.round > 7) {
        // Fin del juego después de 7 rondas
        // Determinar el ganador: el que tiene más victorias
        let maxVictories = 0;
        let winner = null;
        sala.players.forEach(p => {
          const vics = p.victories || 0;
          if (vics > maxVictories) {
            maxVictories = vics;
            winner = p;
          }
        });
        const winnerNick = winner ? winner.nick : 'Nadie';
        // Calcular exp extra para el ganador
        const numEnemies = sala.players.length - 1;
        let extraExp = 0;
        if (numEnemies === 1) extraExp = 150;
        else if (numEnemies === 2) extraExp = 350;
        else if (numEnemies === 3) extraExp = 500;
        const finalStats = sala.players.map(p => {
          let exp = (p.kills || 0) * 40 + (p.victories || 0) * 75;
          let gold = p.gold || 0;
          if (p.nick === winnerNick) {
            exp += extraExp;
            // Otorgar 35 de oro por ganar el juego
            gold += 35;
          }
          return {
            nick: p.nick,
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            victories: p.victories || 0,
            exp: exp,
            gold: gold
          };
        });
        io.to(sala.id).emit('gameEnded', { stats: finalStats, winner: winnerNick });
      } else {
        // 🎮 Generar NUEVO escenario para la nueva ronda
        crearEscenarioBatalla(sala.id, sala.round);
        
        // Emitir evento de inicio de ronda
        io.to(sala.id).emit('roundStarted', { round: sala.round });
        
        io.to(sala.id).emit('gameStarted', sala);
        
        // Enviar el NUEVO escenario de la ronda
        if (murosPorSala[sala.id]) {
          io.to(sala.id).emit('escenarioMuros', murosPorSala[sala.id]);
        }
        
        // De la ronda 2 a la 7, mostrar solo aumentos
        if (sala.round >= 2 && sala.round <= 7) {
          const aumentoMejoras = MEJORAS.filter(m => m.aumento);
          function shuffle(array) {
            return array.sort(() => Math.random() - 0.5);
          }
          for (const player of sala.players) {
            // Filtrar 'daño escudo' si ya fue seleccionado
            const selectedUpgrades = shuffle([
              ...aumentoMejoras.filter(m => {
                if (m.id === 'dano_escudo') {
                  return !player.mejoras.some(pm => pm.id === 'dano_escudo');
                }
                return !player.mejoras.some(pm => pm.id === m.id);
              })
            ]).slice(0, 3);
            io.to(sala.id).emit('availableUpgrades', { nick: player.nick, upgrades: selectedUpgrades });
          }
        }
      }
    }
    // Enviar estado a todos los jugadores de la sala
    io.to(sala.id).emit('proyectilesUpdate', proyectiles);
    io.to(sala.id).emit('wallsUpdate', murosPorSala[sala.id] || []);
    io.to(sala.id).emit('playersUpdate', jugadores);
    proyectilesPorSala[sala.id] = proyectiles;
  }
}, 20);

// Endpoint para crear una sala (host)
app.post('/create-room', (req, res) => {
  const { nick, nivel } = req.body;
  if (!nick || !nivel) {
    return res.status(400).json({ error: 'Nick y nivel requeridos.' });
  }
  // Buscar si ya existe una sala activa para este host
  let salaExistente = salas.find(s => s.host.nick === nick && s.active !== false);
  if (salaExistente) {
    return res.json({ success: true, sala: salaExistente });
  }
  // Generar ID único simple
  const id = Date.now().toString();
  const sala = {
    id,
    host: { nick, nivel },
    players: [{ nick, nivel }],
    createdAt: new Date(),
    active: true
  };
  salas.push(sala);
  // Emitir evento global
  io.emit('roomsUpdated');
  res.json({ success: true, sala });
});

// Endpoint para obtener la lista de salas
// Endpoint para obtener los stats del jugador
app.get('/stats/:nick', (req, res) => {
  const nick = req.params.nick;
  db.get('SELECT nick, exp, nivel, gameWins as victories, totalKills, totalDeaths, nicknameChanged, gold, inventory, equipped FROM users WHERE nick = ?', [nick], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error de base de datos.' });
    if (!row) return res.status(404).json({ error: 'Jugador no encontrado.' });
    // Si el usuario existe pero no tiene nivel o exp, poner valores por defecto
    if (row.nivel === undefined || row.nivel === null) row.nivel = 1;
    if (row.exp === undefined || row.exp === null) row.exp = 0;
    if (row.victories === undefined || row.victories === null) row.victories = 0;
    if (row.nicknameChanged === undefined || row.nicknameChanged === null) row.nicknameChanged = 0;
    
    // Parsear inventory y equipped desde JSON
    try {
      row.inventory = row.inventory ? JSON.parse(row.inventory) : {};
      row.equipped = row.equipped ? JSON.parse(row.equipped) : {};
    } catch (e) {
      console.error('Error parseando inventory/equipped:', e);
      row.inventory = {};
      row.equipped = {};
    }
    if (row.gold === undefined || row.gold === null) row.gold = 0;
    // Calcular nivel correcto
    const correctLevel = getLevel(row.exp);
    if (row.nivel !== correctLevel) {
      db.run('UPDATE users SET nivel = ? WHERE nick = ?', [correctLevel, nick], (err2) => {
        if (err2) console.error('Error updating level for', nick, err2);
      });
      row.nivel = correctLevel;
    }
    res.json({ success: true, stats: row });
  });
});

// Endpoint para obtener el ranking global (top 100)
app.get('/ranking', (req, res) => {
  const query = `
    SELECT nick, exp, nivel, gameWins as victories, totalKills, totalDeaths
    FROM users
    ORDER BY exp DESC
    LIMIT 100
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener ranking:', err);
      return res.status(500).json({ error: 'Error de base de datos.' });
    }
    
    // Asegurar que todos los campos tengan valores predeterminados
    const ranking = rows.map(row => ({
      nick: row.nick,
      exp: row.exp || 0,
      nivel: row.nivel || 1,
      victories: row.victories || 0,
      totalKills: row.totalKills || 0,
      totalDeaths: row.totalDeaths || 0
    }));
    
    res.json({ success: true, ranking });
  });
});

// Endpoint para actualizar los stats del jugador
app.post('/stats/:nick', (req, res) => {
  const nick = req.params.nick;
  const { exp } = req.body;
  db.run('UPDATE users SET exp = exp + ? WHERE nick = ?', [exp, nick], function(err) {
    if (err) return res.status(500).json({ error: 'Error de base de datos.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Jugador no encontrado.' });
    res.json({ success: true });
  });
});
app.get('/rooms', (req, res) => {
  // Solo mostrar salas con menos de 4 jugadores
  const disponibles = salas.filter(s => s.active && s.players.length < 4);
  res.json({ success: true, salas: disponibles });
});

// Endpoint para obtener jugadores activos en tiempo real
app.get('/active-players', (req, res) => {
  const playersData = [];
  const playersSet = new Set();
  
  // 1. Obtener jugadores en el menú (conectados pero no en salas)
  playersOnline.forEach((data, nick) => {
    // Solo incluir si fue visto en los últimos 30 segundos
    if (Date.now() - data.lastSeen < 30000) {
      playersSet.add(nick);
      playersData.push({
        nick: nick,
        nivel: data.nivel || 1,
        inGame: false
      });
    }
  });
  
  // 2. Obtener jugadores en salas activas
  salas.forEach(sala => {
    if (sala.active) {
      sala.players.forEach(player => {
        if (!playersSet.has(player.nick)) {
          playersSet.add(player.nick);
          playersData.push({
            nick: player.nick,
            nivel: player.nivel || 1,
            inGame: sala.round && sala.round >= 1
          });
        } else {
          // Actualizar el estado si ya está en la lista
          const existingPlayer = playersData.find(p => p.nick === player.nick);
          if (existingPlayer && sala.round && sala.round >= 1) {
            existingPlayer.inGame = true;
          }
        }
      });
    }
  });
  
  res.json({ success: true, players: playersData });
});

// Endpoint para eliminar una sala (host sale)
app.post('/delete-room', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID de sala requerido.' });
  const idx = salas.findIndex(s => s.id === id);
  if (idx !== -1) {
    salas.splice(idx, 1);
    io.emit('roomsUpdated');
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Sala no encontrada.' });
});

// Endpoint para expulsar un jugador de la sala (solo el host)
app.post('/kick-player', (req, res) => {
  const { roomId, hostNick, kickNick } = req.body;
  
  if (!roomId || !hostNick || !kickNick) {
    return res.status(400).json({ error: 'Datos incompletos.' });
  }
  
  const sala = salas.find(s => s.id === roomId && s.active);
  
  if (!sala) {
    return res.status(404).json({ error: 'Sala no encontrada.' });
  }
  
  // Verificar que quien hace la petición es el host
  if (sala.host.nick !== hostNick) {
    return res.status(403).json({ error: 'Solo el host puede expulsar jugadores.' });
  }
  
  // No permitir que el host se expulse a sí mismo
  if (hostNick === kickNick) {
    return res.status(400).json({ error: 'El host no puede expulsarse a sí mismo.' });
  }
  
  // Buscar y eliminar al jugador
  const playerIndex = sala.players.findIndex(p => p.nick === kickNick);
  
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Jugador no encontrado en la sala.' });
  }
  
  // Eliminar el jugador de la sala
  sala.players.splice(playerIndex, 1);
  
  // Notificar a todos los clientes de la sala que se actualizó
  io.to(roomId).emit('playerKicked', { kickedNick: kickNick, sala });
  io.emit('roomsUpdated');
  
  console.log(`Jugador ${kickNick} expulsado de la sala ${roomId} por ${hostNick}`);
  
  res.json({ success: true, sala });
});

// Endpoint para unirse a una sala
app.post('/join-room', (req, res) => {
  const { id, nick, nivel } = req.body;
  if (!id || !nick || !nivel) return res.status(400).json({ error: 'Datos requeridos.' });
  const sala = salas.find(s => s.id === id && s.active !== false);
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada.' });
  // Verificar si ya está en la sala
  if (sala.players.find(p => p.nick === nick)) {
    return res.json({ success: true, sala });
  }
  // Verificar si hay espacio
  if (sala.players.length >= 4) {
    return res.status(400).json({ error: 'Sala llena.' });
  }
  sala.players.push({ nick, nivel, mejoras: [] });
  // Emitir evento en tiempo real
  io.to(id).emit('playerJoined', sala);
  io.emit('roomsUpdated');
  res.json({ success: true, sala });
});

// Endpoint para que un jugador salga de una sala
app.post('/leave-room', (req, res) => {
  const { id, nick } = req.body;
  if (!id || !nick) return res.status(400).json({ error: 'Datos requeridos.' });
  const sala = salas.find(s => s.id === id && s.active !== false);
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada.' });
  sala.players = sala.players.filter(p => p.nick !== nick);
  // Emitir evento en tiempo real
  io.to(id).emit('playerLeft', sala);
  io.emit('roomsUpdated');
  res.json({ success: true });
});

