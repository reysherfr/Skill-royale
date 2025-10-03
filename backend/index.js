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

// 🛡️ Rate limiter para disparos por jugador (anti-spam)
const shootRateLimiter = new Map(); // { socketId: lastShootTime }

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
    
    console.log('🔵 [DEBUG] joinRoom evento recibido:', {
      roomId,
      playerNick,
      playerColor,
      hasStats: !!playerStats
    });
    
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
      
      // Notificar a todos los jugadores en la sala que alguien se unió
      console.log('🟢 [DEBUG] Emitiendo playerJoined a sala:', roomId, 'con', sala.players.length, 'jugadores');
      io.to(roomId).emit('playerJoined', sala);
    } else {
      console.log('🔴 [DEBUG] No se encontró sala o no está activa:', roomId);
    }
    
    if (sala && sala.is1v1 && sala.round === 0) {
      // Contar cuántos sockets están en la sala
      io.in(roomId).fetchSockets().then(async (sockets) => {
        // Si ambos jugadores están conectados (2 sockets en la sala)
        if (sockets.length === 2) {
          console.log(`Ambos jugadores conectados a sala 1v1 ${roomId}, iniciando batalla...`);
          // Iniciar casi inmediatamente (100ms para asegurar sincronización)
          setTimeout(async () => {
            await iniciarBatalla1v1(roomId);
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

  socket.on('startGame', async (data) => {
    const { roomId, nick } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    if (sala.host.nick !== nick) return; // Solo el host puede iniciar
    if (sala.players.length < 2) return; // Necesita al menos 2 jugadores
    
    // 🎮 Crear escenario de batalla profesional
    await crearEscenarioBatalla(roomId);
    
    // Inicializar ronda por sala si no existe
    sala.round = 1;
    
    // 🎯 Usar spawns del mapa personalizado si están disponibles
    const mapSpawns = global.mapSpawns && global.mapSpawns[roomId];
    
    // Distribuir hasta 4 jugadores usando spawns del mapa o posiciones por defecto
    sala.players.forEach((player, i) => {
      if (mapSpawns && mapSpawns[i]) {
        // Usar spawn del mapa
        player.x = mapSpawns[i].x;
        player.y = mapSpawns[i].y;
      } else {
        // Usar posiciones por defecto en esquinas
        const offset = 200;
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

  // Evento movePlayer eliminado - ahora se usa movimiento en tiempo real con keyStates

  // Recibir disparo de proyectil
  socket.on('shootProjectile', (data) => {
    // 🛡️ PROTECCIÓN ANTI-SPAM: Verificar rate limit
    const now = Date.now();
    const mejora = MEJORAS.find(m => m.id === data.mejoraId);
    if (!mejora) return; // Si no existe, ignorar
    
    // Crear una clave única por socket + habilidad para evitar bloquear todas las habilidades
    const rateLimitKey = `${socket.id}_${data.mejoraId}`;
    const lastShoot = shootRateLimiter.get(rateLimitKey) || 0;
    
    // Para habilidades con preview y cooldown largo (>5s), usar tolerancia más baja (50%)
    // Para habilidades rápidas (<5s), mantener 95% del cooldown para prevenir spam real
    let tolerancia;
    if (mejora.cooldown >= 5000) {
      // Habilidades con cooldown largo (gancho, muro, meteoro): 50% del cooldown
      tolerancia = 0.50;
    } else if (mejora.id === 'gancho' || mejora.id === 'muro_de_piedra') {
      // Fallback para preview skills: 70%
      tolerancia = 0.70;
    } else {
      // Habilidades rápidas (proyectiles normales): 95%
      tolerancia = 0.95;
    }
    
    const minInterval = (mejora.cooldown || 500) * tolerancia;
    
    if (now - lastShoot < minInterval) {
      console.log(`⚠️ Spam detectado de ${data.owner} para ${mejora.nombre}: ${now - lastShoot}ms < ${minInterval}ms (cooldown: ${mejora.cooldown}ms)`);
      // Notificar al cliente que el disparo fue rechazado para resetear cooldown
      socket.emit('projectileRejected', { mejoraId: data.mejoraId });
      return; // Ignorar disparo spam
    }
    shootRateLimiter.set(rateLimitKey, now);
    
    // 🎯 OBTENER POSICIÓN DEL SERVIDOR: Usar la posición actual del jugador en el servidor
    const salaShoot = salas.find(s => s.id === data.roomId && s.active);
    if (!salaShoot) return;
    
    const jugadorServidor = salaShoot.players.find(p => p.nick === data.owner);
    if (!jugadorServidor) return;
    
    // 🧊 BLOQUEAR si el jugador está congelado
    if (jugadorServidor.frozen && jugadorServidor.frozenUntil > Date.now()) {
      console.log(`⛔ Disparo bloqueado: ${data.owner} está congelado`);
      socket.emit('projectileRejected', { mejoraId: data.mejoraId });
      return;
    }
    
    // Sobrescribir la posición del cliente con la posición del servidor
    data.x = jugadorServidor.x;
    data.y = jugadorServidor.y;
    
    // Guardar proyectil en la sala
    if (!proyectilesPorSala[data.roomId]) proyectilesPorSala[data.roomId] = [];
    
    // 🆕 LÁSER CONTINUO (rayo_laser y laser)
    if (mejora.laserContinuo && (mejora.id === 'rayo_laser' || mejora.id === 'laser')) {
      if (!laseresContinuosPorSala[data.roomId]) laseresContinuosPorSala[data.roomId] = [];
      
      const salaLaser = salas.find(s => s.id === data.roomId && s.active);
      if (!salaLaser) return;
      
      const lanzador = salaLaser.players.find(p => p.nick === data.owner);
      if (!lanzador) return;
      
      // 🛡️ PREVENIR LÁSERES DUPLICADOS: Verificar si ya existe un láser activo de este jugador con esta habilidad
      const existingLaser = laseresContinuosPorSala[data.roomId].find(l => 
        l.owner === data.owner && l.mejoraId === mejora.id
      );
      
      if (existingLaser) {
        console.log(`⚠️ Láser duplicado bloqueado: ${data.owner} ya tiene un ${mejora.id} activo`);
        socket.emit('projectileRejected', { mejoraId: data.mejoraId });
        return; // Ignorar disparo duplicado
      }
      
      const now = Date.now();
      const laser = {
        id: ++projectileIdCounter,
        x: data.x,
        y: data.y,
        angle: data.angle,
        maxRange: mejora.maxRange || 400,
        owner: data.owner,
        createdAt: now,
        duracion: mejora.duracion || 3000,
        damageInterval: mejora.damageInterval || 1000,
        damage: mejora.danio || 7,
        lastDamageTime: now, // 🔧 FIX: Inicializar con el tiempo actual para evitar daño inmediato
        color: mejora.color,
        radius: mejora.radius || 8,
        mejoraId: mejora.id,
        // Propiedades específicas del nuevo láser
        healPerSecond: mejora.healPerSecond || 0,
        wallDamageReduction: mejora.wallDamageReduction || 0,
        canPenetrateWalls: mejora.canPenetrateWalls || false
      };
      
      // 🆕 Aplicar relentización del 90% al lanzador si es el nuevo láser
      if (mejora.id === 'laser') {
        lanzador.laserSlowActive = true;
      }
      
      laseresContinuosPorSala[data.roomId].push(laser);
      
      // Emitir a todos los clientes
      io.to(data.roomId).emit('laserCreated', laser);
      return; // No crear proyectil normal
    }
    
    // 🆕 TORNADO - Habilidad Q con atracción y daño continuo
    if (mejora.id === 'tornado') {
      if (!tornadosPorSala[data.roomId]) tornadosPorSala[data.roomId] = [];
      
      const salaActual = salas.find(s => s.id === data.roomId && s.active);
      if (!salaActual) return;
      
      const lanzador = salaActual.players.find(p => p.nick === data.owner);
      if (!lanzador) return;
      
      // 🎯 APLICAR AUMENTOS AL TORNADO
      // Agrandar aumenta el radio del tornado (+15 por stack)
      const agrandadorStacks = lanzador.mejoras ? lanzador.mejoras.filter(m => m.id === 'agrandar').length : 0;
      let maxRadius = (mejora.effect?.radius || 100) + (agrandadorStacks * 15);
      
      // Explosión de sabor: crear explosiones periódicas en el tornado
      const explosionSabor = lanzador.mejoras ? lanzador.mejoras.find(m => m.id === 'explosion_sabor') : null;
      const explosionSaborMejora = explosionSabor ? MEJORAS.find(m => m.id === 'explosion_sabor') : null;
      
      // Reducción de daño por explosión de sabor (-30%)
      let damagePerTick = mejora.effect?.damagePerTick || 15;
      if (explosionSabor) {
        const damageReduction = explosionSaborMejora?.efecto?.damageReduction || 0.3;
        damagePerTick = Math.floor(damagePerTick * (1 - damageReduction));
      }
      
      const duration = mejora.effect?.duration || 5000;
      
      // 🎯 Ajustar posición si colisiona con muros
      const targetX = data.targetX || data.x;
      const targetY = data.targetY || data.y;
      const adjustedPosition = adjustPositionIfColliding(targetX, targetY, salaActual, maxRadius);
      
      if (adjustedPosition.adjusted) {
        console.log(`🌪️ Tornado ajustado de (${targetX}, ${targetY}) a (${adjustedPosition.x}, ${adjustedPosition.y})`);
      }
      
      const tornado = {
        id: ++projectileIdCounter,
        x: adjustedPosition.x,
        y: adjustedPosition.y,
        radius: 0, // Empieza en 0 y crece
        maxRadius: maxRadius, // Radio máximo (afectado por agrandar)
        growthRate: maxRadius / 500, // Crece hasta tamaño completo en 0.5 segundos
        owner: data.owner,
        createdAt: Date.now(),
        duration: duration, // Duración (afectada por potenciador)
        damagePerTick: damagePerTick, // Daño por tick (afectado por explosión sabor)
        tickRate: mejora.effect?.tickRate || 1000, // Cada 1 segundo
        pullForce: mejora.effect?.pullForce || 8, // Fuerza de atracción
        slowAmount: mejora.effect?.slowAmount || 0.3, // 30% slow
        lastDamageTick: Date.now(),
        color: mejora.color,
        mejoraId: mejora.id,
        // Explosión de sabor
        hasExplosionSabor: !!explosionSabor,
        explosionRadius: explosionSaborMejora?.efecto?.explosionRadius || 60,
        lastExplosionTime: Date.now(),
        explosionInterval: 1500, // Explosión cada 1.5 segundos si tiene sabor
        // Movimiento aleatorio del tornado
        moveAngle: Math.random() * Math.PI * 2,
        moveSpeed: 2,
        moveChangeTime: Date.now() + 1000 // Cambiar dirección cada 1 segundo
      };
      
      tornadosPorSala[data.roomId].push(tornado);
      
      // Emitir a todos los clientes
      io.to(data.roomId).emit('tornadoCreated', tornado);
      return; // No crear proyectil normal
    }
    
    // 🆕 GOLPE MELEE - Ataque cuerpo a cuerpo con sistema de combo
    if (mejora.id === 'golpe') {
      const salaActual = salas.find(s => s.id === data.roomId && s.active);
      if (!salaActual) return;
      
      const atacante = salaActual.players.find(p => p.nick === data.owner);
      if (!atacante) return;
      
      // 🎯 APLICAR AUMENTOS
      // Potenciador aumenta maxRange (+150 por stack)
      const potenciadorStacks = atacante.mejoras ? atacante.mejoras.filter(m => m.id === 'potenciador_proyectil').length : 0;
      let meleeRange = (mejora.maxRange || 80) + (potenciadorStacks * 150);
      
      // Agrandar aumenta el radio visual del golpe (+10 por stack) Y el rango (+100 por stack)
      const agrandadorStacks = atacante.mejoras ? atacante.mejoras.filter(m => m.id === 'agrandar').length : 0;
      const meleeRadius = (mejora.radius || 20) + (agrandadorStacks * 10);
      meleeRange += agrandadorStacks * 100; // +100 de rango por cada agrandar
      
      // Dividor: crear múltiples golpes en ángulos diferentes
      const dividorStacks = atacante.mejoras ? atacante.mejoras.filter(m => m.id === 'dividor').length : 0;
      const totalSwings = 1 + dividorStacks;
      const angleSpread = dividorStacks > 0 ? Math.PI / 6 : 0; // 30 grados de separación
      
      // Explosión de sabor: crear explosiones en cada golpe
      const explosionSabor = atacante.mejoras ? atacante.mejoras.find(m => m.id === 'explosion_sabor') : null;
      const explosionSaborMejora = explosionSabor ? MEJORAS.find(m => m.id === 'explosion_sabor') : null;
      const explosionSaborRadius = explosionSaborMejora?.efecto?.explosionRadius || 60;
      
      // Reducción de daño por dividor (-3 por stack)
      let baseDamage = mejora.danio;
      if (dividorStacks > 0) {
        const mejoraDividor = MEJORAS.find(m => m.id === 'dividor');
        const damageReductionFlat = mejoraDividor?.efecto?.damageReductionFlat || 3;
        baseDamage = Math.max(1, baseDamage - (dividorStacks * damageReductionFlat));
      }
      
      // Reducción de daño por explosión de sabor (-30%)
      if (explosionSabor) {
        const damageReduction = explosionSaborMejora?.efecto?.damageReduction || 0.3;
        baseDamage = Math.floor(baseDamage * (1 - damageReduction));
      }
      
      // Inicializar contador de combo si no existe
      if (!atacante.golpeCombo) atacante.golpeCombo = 0;
      
      // Incrementar contador
      atacante.golpeCombo++;
      
      // Verificar si es el tercer golpe (combo completo)
      const isComboHit = atacante.golpeCombo >= (mejora.effect?.comboHits || 3);
      const damageMultiplier = isComboHit ? (mejora.effect?.comboMultiplier || 2.5) : 1;
      const finalDamage = Math.floor(baseDamage * damageMultiplier);
      
      // Resetear combo si llegó al tercer golpe
      if (isComboHit) {
        atacante.golpeCombo = 0;
      }
      
      // Crear múltiples golpes si tiene dividor
      for (let i = 0; i < totalSwings; i++) {
        const swingAngle = data.angle + (i - Math.floor(totalSwings / 2)) * angleSpread;
        
        // Emitir animación de golpe para que todos la vean
        io.to(data.roomId).emit('meleeSwing', {
          x: atacante.x,
          y: atacante.y,
          angle: swingAngle,
          range: meleeRange,
          radius: meleeRadius,
          color: mejora.color,
          owner: data.owner
        });
        
        // Buscar enemigos en rango melee para este golpe
        for (const jugador of salaActual.players) {
          if (jugador.defeated || jugador.nick === data.owner) continue;
          
          // Calcular si está en el cono del golpe
          const dx = jugador.x - atacante.x;
          const dy = jugador.y - atacante.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angleToTarget = Math.atan2(dy, dx);
          const angleDiff = Math.abs(((angleToTarget - swingAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
          
          // Si está dentro del rango y del cono (60 grados)
          if (dist <= meleeRange + 32 && angleDiff <= Math.PI / 3) {
            jugador.lastAttacker = data.owner;
            applyDamage(jugador, finalDamage, io, data.roomId, 'golpe');
            
            // Emitir efecto visual del golpe
            io.to(data.roomId).emit('meleeHit', {
              x: jugador.x,
              y: jugador.y,
              color: mejora.color,
              isCombo: isComboHit,
              damage: finalDamage,
              comboCount: isComboHit ? mejora.effect?.comboHits : atacante.golpeCombo,
              targetNick: jugador.nick
            });
            
            // 💥 Explosión de sabor: crear explosión en el punto de impacto
            if (explosionSabor) {
              io.to(data.roomId).emit('explosion', {
                x: jugador.x,
                y: jugador.y,
                color: '#FFA500', // Naranja para explosión de sabor
                radius: explosionSaborRadius,
                duration: 400
              });
              
              // Daño en área de la explosión
              for (const otroJugador of salaActual.players) {
                if (otroJugador.defeated || otroJugador.nick === data.owner) continue;
                const dx2 = otroJugador.x - jugador.x;
                const dy2 = otroJugador.y - jugador.y;
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                
                if (dist2 <= explosionSaborRadius && otroJugador.nick !== jugador.nick) {
                  otroJugador.lastAttacker = data.owner;
                  const explosionDamage = Math.floor(finalDamage * 0.5); // 50% del daño original
                  applyDamage(otroJugador, explosionDamage, io, data.roomId, 'explosion_sabor');
                }
              }
            }
            
            break; // Solo golpear al primer enemigo en este swing
          }
        }
        
        // 🔄 REBOTE: Crear golpe desde el muro si fue golpeado
        const reboteStacks = atacante.mejoras ? atacante.mejoras.filter(m => m.id === 'rebote').length : 0;
        if (reboteStacks > 0 && murosPorSala[data.roomId]) {
          const muros = murosPorSala[data.roomId];
          
          // Buscar muros golpeados
          for (const muro of muros) {
            if (!muro.colision) continue;
            
            // Transformar la posición del ataque al sistema local del muro
            const cos = Math.cos(-muro.angle);
            const sin = Math.sin(-muro.angle);
            
            for (let checkDist = 0; checkDist <= meleeRange; checkDist += 10) {
              const checkX = data.x + Math.cos(data.angle) * checkDist;
              const checkY = data.y + Math.sin(data.angle) * checkDist;
              
              const relX = checkX - muro.x;
              const relY = checkY - muro.y;
              const localX = relX * cos - relY * sin;
              const localY = relX * sin + relY * cos;
              
              const rx = muro.width;
              const ry = muro.height;
              
              // Verificar si el golpe toca el muro
              if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
                // Crear golpe rebotado desde el muro en dirección opuesta
                for (let b = 0; b < reboteStacks; b++) {
                  setTimeout(() => {
                    const bounceAngle = data.angle + Math.PI; // Dirección opuesta
                    
                    // Animación del golpe rebotado desde el muro
                    io.to(data.roomId).emit('meleeSwing', {
                      x: checkX, // Desde el punto de impacto
                      y: checkY,
                      angle: bounceAngle,
                      range: meleeRange * 0.7,
                      radius: meleeRadius,
                      color: '#87CEEB',
                      owner: data.owner,
                      isBounce: true
                    });
                    
                    // Buscar enemigos para el golpe rebotado
                    for (const enemigo of salaActual.players) {
                      if (enemigo.defeated || enemigo.nick === data.owner) continue;
                      
                      const dx3 = enemigo.x - checkX;
                      const dy3 = enemigo.y - checkY;
                      const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
                      const angleToTarget2 = Math.atan2(dy3, dx3);
                      const angleDiff2 = Math.abs(((angleToTarget2 - bounceAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                      
                      if (dist3 <= meleeRange * 0.7 + 32 && angleDiff2 <= Math.PI / 3) {
                        enemigo.lastAttacker = data.owner;
                        const bounceDamage = Math.floor(finalDamage * 0.7);
                        applyDamage(enemigo, bounceDamage, io, data.roomId, 'golpe_rebote');
                        
                        io.to(data.roomId).emit('meleeHit', {
                          x: enemigo.x,
                          y: enemigo.y,
                          color: '#87CEEB',
                          isCombo: false,
                          damage: bounceDamage,
                          comboCount: 0,
                          targetNick: enemigo.nick
                        });
                        
                        break;
                      }
                    }
                  }, 150 + (b * 100));
                }
                
                break; // Ya encontramos el muro golpeado
              }
            }
          }
        }
      }
      
      return; // No crear proyectil normal
    }
    
    // Calcular radio modificado por 'agrandar' si el jugador tiene ese aumento
    let modifiedRadius = mejora.radius || 20;
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
      
      // 🎯 Ajustar posición si colisiona con muros del mapa
      const adjustedPosition = adjustPositionIfColliding(data.targetX, data.targetY, salaActual, Math.max(mejora.width, mejora.height));
      
      if (adjustedPosition.adjusted) {
        console.log(`🪨 Muro de roca ajustado de (${data.targetX}, ${data.targetY}) a (${adjustedPosition.x}, ${adjustedPosition.y})`);
      }
      
      // 🛡️ Pre-mover jugadores a áreas seguras ANTES de crear el muro
      let finalX = adjustedPosition.x;
      let finalY = adjustedPosition.y;
      
      if (salaActual) {
        // Verificar cada jugador que podría ser afectado por el muro
        for (const testPlayer of salaActual.players) {
          const cos = Math.cos(-angle);
          const sin = Math.sin(-angle);
          const relX = testPlayer.x - finalX;
          const relY = testPlayer.y - finalY;
          const localX = relX * cos - relY * sin;
          const localY = relX * sin + relY * cos;
          const rx = mejora.width + 12;
          const ry = mejora.height + 12;
          
          // Si el jugador estaría dentro del muro que vamos a crear
          if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
            console.log(`🔄 Pre-moviendo a ${testPlayer.nick} a área segura antes de crear muro...`);
            
            // Calcular dirección de empuje normal
            let normX = localX / rx;
            let normY = localY / ry;
            const normLen = Math.sqrt(normX * normX + normY * normY) || 1;
            normX /= normLen;
            normY /= normLen;
            
            // 🔄 Probar múltiples direcciones para encontrar área segura
            const pushDist = 80; // Distancia de empuje aumentada
            const directions = [
              { x: normX, y: normY, name: 'normal' },
              { x: -normX, y: -normY, name: 'opuesta' },
              { x: normY, y: -normX, name: '90° derecha' },
              { x: -normY, y: normX, name: '90° izquierda' },
              { x: normX * 0.7 + normY * 0.7, y: normY * 0.7 - normX * 0.7, name: '45° diagonal 1' },
              { x: normX * 0.7 - normY * 0.7, y: normY * 0.7 + normX * 0.7, name: '45° diagonal 2' },
              { x: -normX * 0.7 + normY * 0.7, y: -normY * 0.7 - normX * 0.7, name: '-45° diagonal 1' },
              { x: -normX * 0.7 - normY * 0.7, y: -normY * 0.7 + normX * 0.7, name: '-45° diagonal 2' }
            ];
            
            let moved = false;
            
            for (const dir of directions) {
              const newLocalX = localX + dir.x * pushDist;
              const newLocalY = localY + dir.y * pushDist;
              const globalX = finalX + newLocalX * cos + newLocalY * sin;
              const globalY = finalY - newLocalX * sin + newLocalY * cos;
              
              // Verificar límites del mapa
              if (globalX < 0 || globalX > 2500 || globalY < 0 || globalY > 1500) continue;
              
              // Verificar si esta posición es segura (no colisiona con muros existentes)
              const tempSala = { id: data.roomId };
              const collision = checkCollision(globalX, globalY, tempSala);
              
              if (!collision) {
                testPlayer.x = globalX;
                testPlayer.y = globalY;
                moved = true;
                console.log(`✅ ${testPlayer.nick} pre-movido a área segura (${dir.name}): (${globalX.toFixed(0)}, ${globalY.toFixed(0)})`);
                io.to(data.roomId).emit('playerMoved', { nick: testPlayer.nick, x: testPlayer.x, y: testPlayer.y });
                break;
              }
            }
            
            if (!moved) {
              // Si ninguna dirección cercana funciona, mover más lejos
              console.warn(`⚠️ Buscando posición más lejana para ${testPlayer.nick}...`);
              for (let dist = 120; dist <= 200; dist += 40) {
                for (const dir of directions) {
                  const newLocalX = localX + dir.x * dist;
                  const newLocalY = localY + dir.y * dist;
                  const globalX = finalX + newLocalX * cos + newLocalY * sin;
                  const globalY = finalY - newLocalX * sin + newLocalY * cos;
                  
                  if (globalX < 0 || globalX > 2500 || globalY < 0 || globalY > 1500) continue;
                  
                  const tempSala = { id: data.roomId };
                  if (!checkCollision(globalX, globalY, tempSala)) {
                    testPlayer.x = globalX;
                    testPlayer.y = globalY;
                    moved = true;
                    console.log(`✅ ${testPlayer.nick} pre-movido a área segura (distancia ${dist}): (${globalX.toFixed(0)}, ${globalY.toFixed(0)})`);
                    io.to(data.roomId).emit('playerMoved', { nick: testPlayer.nick, x: testPlayer.x, y: testPlayer.y });
                    break;
                  }
                }
                if (moved) break;
              }
            }
            
            if (!moved) {
              // Último recurso: mover en la dirección opuesta al muro
              const escapeAngle = Math.atan2(testPlayer.y - finalY, testPlayer.x - finalX);
              testPlayer.x = finalX + Math.cos(escapeAngle) * 150;
              testPlayer.y = finalY + Math.sin(escapeAngle) * 150;
              console.log(`🆘 ${testPlayer.nick} movido a posición de emergencia: (${testPlayer.x.toFixed(0)}, ${testPlayer.y.toFixed(0)})`);
              io.to(data.roomId).emit('playerMoved', { nick: testPlayer.nick, x: testPlayer.x, y: testPlayer.y });
            }
          }
        }
      }
      
      const muro = {
        id: 'muro_piedra',
        colision: true,
        x: finalX,
        y: finalY,
        creado: Date.now(),
        duracion: mejora.duracion || 2000,
        color: mejora.color,
        width: mejora.width,
        height: mejora.height,
        angle: angle
      };
      murosPorSala[data.roomId].push(muro);
      
      // 🔄 Red de seguridad: Verificar una última vez si algún jugador quedó atrapado
      // (esto solo debería activarse en casos extremos de timing/lag)
      const sala = salas.find(s => s.id === data.roomId && s.active);
      if (sala) {
        for (const player of sala.players) {
          const cos = Math.cos(-muro.angle);
          const sin = Math.sin(-muro.angle);
          const relX = player.x - muro.x;
          const relY = player.y - muro.y;
          const localX = relX * cos - relY * sin;
          const localY = relX * sin + relY * cos;
          const rx = muro.width + 12;
          const ry = muro.height + 12;
          
          if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
            console.warn(`⚠️ Red de seguridad activada: ${player.nick} aún dentro del muro después de pre-movimiento`);
            
            // Mover inmediatamente en la dirección opuesta al centro del muro
            const escapeAngle = Math.atan2(player.y - muro.y, player.x - muro.x);
            player.x = muro.x + Math.cos(escapeAngle) * 120;
            player.y = muro.y + Math.sin(escapeAngle) * 120;
            
            io.to(data.roomId).emit('playerMoved', { nick: player.nick, x: player.x, y: player.y });
          }
        }
      }
      // Emitir a la sala con la posición ajustada
      io.to(data.roomId).emit('wallPlaced', {
        x: finalX,
        y: finalY,
        creado: Date.now(),
        duracion: mejora.duracion || 2000,
        color: mejora.color,
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
      console.log('🌿 Creando Suelo Sagrado:', { x: data.x, y: data.y, radius: modifiedRadius, owner: data.owner });
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
      console.log('✅ Suelo Sagrado emitido a sala:', data.roomId);
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

  // Recibir creación de Ventisca (sin proyectil)
  socket.on('createVentisca', (data) => {
    const { roomId, x, y, owner, mejoraId, angle } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    
    const mejora = MEJORAS.find(m => m.id === mejoraId);
    if (!mejora) return;
    
    console.log(`Backend: Creando Ventisca en (${x}, ${y}) por ${owner} con ángulo ${angle}`);
    
    // Crear área de Ventisca inmediatamente
    if (!ventiscasPorSala[sala.id]) ventiscasPorSala[sala.id] = [];
    
    ventiscasPorSala[sala.id].push({
      x: x,
      y: y,
      width: mejora.width || 300,
      height: mejora.height || 200,
      angle: angle || 0, // Guardar el ángulo de rotación
      damage: mejora.danio || 20,
      damageInterval: mejora.damageInterval || 500,
      duration: mejora.duration || 2500,
      slowAmount: mejora.effect?.slowAmount || 0.4,
      slowDuration: mejora.effect?.slowDuration || 1500,
      hitsToFreeze: mejora.effect?.hitsToFreeze || 4,
      freezeDuration: mejora.effect?.freezeDuration || 1000,
      owner: owner,
      createdAt: Date.now(),
      lastDamageTime: Date.now(),
      affectedPlayers: {} // Rastrear golpes por jugador
    });
    
    // Emitir al frontend para dibujar la ventisca
    io.to(sala.id).emit('ventiscaCreated', {
      x: x,
      y: y,
      width: mejora.width || 300,
      height: mejora.height || 200,
      angle: angle || 0, // Enviar el ángulo al frontend
      duration: mejora.duration || 2500
    });
    
    console.log(`Ventisca creada y emitida a sala ${sala.id}`);
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
    
    // 🎯 Ajustar destino si colisiona con muros del mapa
    const adjustedPosition = adjustPositionIfColliding(finalTargetX, finalTargetY, sala, 20);
    
    if (adjustedPosition.adjusted) {
      console.log(`🔮 Teleport ajustado de (${finalTargetX}, ${finalTargetY}) a (${adjustedPosition.x}, ${adjustedPosition.y})`);
    }
    
    // Teletransportar a la posición ajustada
    player.x = adjustedPosition.x;
    player.y = adjustedPosition.y;
    // Emitir actualización general
    io.to(roomId).emit('playersUpdate', sala.players);
    
    // Emitir evento específico de teleport para forzar sincronización
    io.to(roomId).emit('playerTeleported', {
      nick: owner,
      x: player.x,
      y: player.y
    });
  });

  socket.on('dashPlayer', (data) => {
    const { roomId, targetX, targetY, owner, mejoraId } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === owner);
    if (!player) return;
    
    // Buscar la mejora (puede ser embestida o salto_sombrio)
    let mejora = player.mejoras.find(m => m.id === mejoraId || m.id === 'embestida');
    let isShadowDash = mejoraId === 'salto_sombrio';
    
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
    
    // 🎯 Ajustar destino si colisiona con muros del mapa
    const adjustedPosition = adjustPositionIfColliding(finalTargetX, finalTargetY, sala, 60);
    
    if (adjustedPosition.adjusted) {
      console.log(`⚡ Dash ajustado de (${finalTargetX}, ${finalTargetY}) a (${adjustedPosition.x}, ${adjustedPosition.y})`);
    }
    
    finalTargetX = adjustedPosition.x;
    finalTargetY = adjustedPosition.y;
    
    // Iniciar dash
    player.isDashing = true;
    player.dashTargetX = finalTargetX;
    player.dashTargetY = finalTargetY;
    player.dashSpeed = mejora.velocidad;
    player.dashHit = false;
    player.dashMejoraId = mejora.id;
    
    // 🆕 Si es Salto de Sombra, aplicar invisibilidad
    if (isShadowDash && mejora.effect && mejora.effect.type === 'invisibility') {
      player.invisible = true;
      player.invisibleUntil = Date.now() + mejora.effect.duration;
      
      // Emitir evento de invisibilidad
      io.to(roomId).emit('playerInvisible', {
        nick: owner,
        duration: mejora.effect.duration
      });
    }
    
    // Emitir evento de inicio de dash para sincronizar posición inicial
    io.to(roomId).emit('playerDashStarted', {
      nick: owner,
      startX: player.x,
      startY: player.y,
      targetX: finalTargetX,
      targetY: finalTargetY
    });
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

  // 🆕 Actualizar ángulo del láser continuo
  socket.on('updateLaserAngle', (data) => {
    const { roomId, laserId, angle } = data;
    if (!laseresContinuosPorSala[roomId]) return;
    
    const laser = laseresContinuosPorSala[roomId].find(l => l.id === laserId);
    if (laser) {
      laser.angle = angle;
      
      // Emitir actualización a todos los clientes
      io.to(roomId).emit('laserAngleUpdate', {
        id: laserId,
        angle: angle
      });
    }
  });

  // Cancelar invisibilidad al disparar
  socket.on('cancelInvisibility', (data) => {
    const { roomId, owner } = data;
    const sala = salas.find(s => s.id === roomId && s.active);
    if (!sala) return;
    const player = sala.players.find(p => p.nick === owner);
    if (!player) return;
    
    // Cancelar invisibilidad
    player.invisible = false;
    player.invisibleUntil = 0;
    
    // Emitir evento específico para que todos vean al jugador inmediatamente
    io.to(roomId).emit('playerVisibilityChanged', {
      nick: owner,
      invisible: false
    });
    
    // También emitir actualización general
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
    // Limpiar rate limiter al desconectarse
    shootRateLimiter.delete(socket.id);
    
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
async function iniciarBatalla1v1(roomId) {
  const sala = salas.find(s => s.id === roomId && s.active);
  if (!sala) return;
  if (sala.players.length < 2) return;
  
  // 🎮 Crear escenario de batalla profesional
  await crearEscenarioBatalla(roomId);
  
  // Inicializar ronda por sala si no existe
  sala.round = 1;
  
  // 🎯 Usar spawns del mapa personalizado si están disponibles
  const mapSpawns = global.mapSpawns && global.mapSpawns[roomId];
  
  // Distribuir hasta 4 jugadores usando spawns del mapa o posiciones por defecto
  sala.players.forEach((player, i) => {
    if (mapSpawns && mapSpawns[i]) {
      // Usar spawn del mapa
      player.x = mapSpawns[i].x;
      player.y = mapSpawns[i].y;
    } else {
      // Usar posiciones por defecto en esquinas
      const offset = 200;
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
// ENDPOINT PARA GUARDAR MAPAS DEL EDITOR
// ============================================
import fs from 'fs/promises';

app.post('/save-map', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Contenido del mapa requerido.' });
    }
    
    // Guardar en el archivo mapas.js en el frontend
    const mapasPath = path.join(__dirname, '../frontend/mapas.js');
    await fs.writeFile(mapasPath, content, 'utf8');
    
    console.log('✅ Mapa guardado exitosamente en mapas.js');
    res.json({ success: true, message: 'Mapa guardado exitosamente' });
    
  } catch (error) {
    console.error('Error al guardar mapa:', error);
    res.status(500).json({ error: 'Error al guardar el mapa: ' + error.message });
  }
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
const ventiscasPorSala = {}; // Ventiscas activas por sala
const murosPorSala = {}; // Muros de piedra por sala
const sacredGroundsPorSala = {}; // Suelos sagrados por sala
const holyGroundsPorSala = {}; // Suelos sagrados por sala (alias)
const tornadosPorSala = {}; // Tornados activos por sala
const hookPullsPorSala = {}; // Jalados activos del gancho por sala
// 🆕 Nuevas estructuras para habilidades
const laseresContinuosPorSala = {}; // Láseres continuos activos
const camposEspinasPorSala = {}; // Campos de espinas activos
const aurasRegeneracionPorSala = {}; // Auras de regeneración activas
const bombasTiempoPorSala = {}; // Bombas de tiempo activas
const efectosEstadoPorJugador = {}; // Efectos de estado (stun, invisibilidad, etc.)

// 🎮 Función para cargar mapas personalizados
async function loadCustomMaps() {
  try {
    const mapasPath = path.join(__dirname, '../frontend/mapas.js');
    const content = await fs.readFile(mapasPath, 'utf8');
    
    // Parsear el array de mapas
    const match = content.match(/export const MAPAS = (\[[\s\S]*?\]);/);
    if (match && match[1]) {
      const mapas = JSON.parse(match[1]);
      return mapas;
    }
    return [];
  } catch (error) {
    return [];
  }
}

// 🎮 Función para crear el escenario de batalla con mapas aleatorios
async function crearEscenarioBatalla(roomId, roundNumber = 1) {
  // 🧹 Limpiar TODOS los elementos de la sala antes de crear el nuevo escenario
  murosPorSala[roomId] = [];
  if (proyectilesPorSala[roomId]) proyectilesPorSala[roomId] = [];
  if (laseresContinuosPorSala[roomId]) laseresContinuosPorSala[roomId] = [];
  if (tornadosPorSala[roomId]) tornadosPorSala[roomId] = [];
  if (castsPorSala[roomId]) castsPorSala[roomId] = [];
  if (muddyGroundsPorSala[roomId]) muddyGroundsPorSala[roomId] = [];
  if (ventiscasPorSala[roomId]) ventiscasPorSala[roomId] = []; // ❄️ Limpiar ventiscas
  if (holyGroundsPorSala[roomId]) holyGroundsPorSala[roomId] = [];
  
  // Intentar cargar un mapa personalizado aleatorio
  const customMaps = await loadCustomMaps();
  
  if (customMaps.length > 0) {
    // Seleccionar mapa aleatorio
    const randomIndex = Math.floor(Math.random() * customMaps.length);
    const selectedMap = customMaps[randomIndex];
    
    // Convertir bloques del mapa al formato del juego (IGUAL que bloques procedurales + shape para renderizado)
    murosPorSala[roomId] = selectedMap.blocks.map(block => ({
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      angle: block.angle,
      color: block.color,
      shape: block.shape, // Mantener shape para el renderizado en frontend
      colision: block.colision !== false, // Usar colision del mapa, por defecto true
      duracion: Infinity, // Permanentes (no expiran)
      creado: 0, // ✅ CRÍTICO: Timestamp 0 para que nunca expiren en el filtro de duración
      radius: block.shape === 'circle' ? block.width / 2 : undefined, // Para círculos
      tipo: block.type || 'mapa_bloque',
      muroMapa: true // Identificar como bloque permanente del mapa
    }));
    
    // Guardar spawns del mapa (si existen)
    if (selectedMap.spawns && selectedMap.spawns.length === 4) {
      // Guardar spawns para usar al posicionar jugadores
      if (!global.mapSpawns) global.mapSpawns = {};
      global.mapSpawns[roomId] = selectedMap.spawns;
    }
  } else {
  }
}

// Función para ajustar una posición cuando colisiona con muros
// Encuentra el punto válido más cercano empujando la posición fuera de los muros
function adjustPositionIfColliding(x, y, sala, radius = 50) {
  let adjustedX = x;
  let adjustedY = y;
  let maxAttempts = 20; // Máximo número de intentos para encontrar posición válida
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    const collision = checkCollision(adjustedX, adjustedY, sala);
    
    if (!collision) {
      // No hay colisión, posición válida encontrada
      return { x: adjustedX, y: adjustedY, adjusted: attempt > 0 };
    }
    
    // Hay colisión, empujar en dirección de la normal
    const pushDistance = radius;
    adjustedX += collision.normalX * pushDistance;
    adjustedY += collision.normalY * pushDistance;
    
    attempt++;
  }
  
  // Si después de todos los intentos aún hay colisión, devolver posición original
  // (es mejor intentar poner la habilidad que no ponerla)
  console.warn(`⚠️ No se pudo encontrar posición válida para habilidad en (${x}, ${y})`);
  return { x, y, adjusted: false };
}

// 🚨 Función para expulsar un jugador que está dentro de un muro
// Esta función detecta si un jugador está dentro de un muro y lo empuja hacia afuera
function expelPlayerFromWall(player, sala) {
  const collision = checkCollision(player.x, player.y, sala);
  
  if (!collision) {
    // No hay colisión, el jugador está en una posición válida
    return false;
  }
  
  // El jugador está dentro de un muro, intentar expulsarlo
  console.log(`🚨 Jugador ${player.nick} detectado dentro de un muro en (${player.x}, ${player.y})`);
  
  // Intentar expulsar usando la normal del muro
  let expelDistance = 20; // Distancia inicial de expulsión
  let maxAttempts = 30; // Máximo número de intentos
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    const testX = player.x + collision.normalX * expelDistance;
    const testY = player.y + collision.normalY * expelDistance;
    
    // Verificar que la nueva posición esté dentro de los límites del mapa
    if (testX < 0 || testX > 2500 || testY < 0 || testY > 1500) {
      expelDistance += 10;
      attempt++;
      continue;
    }
    
    const testCollision = checkCollision(testX, testY, sala);
    
    if (!testCollision) {
      // Posición válida encontrada, mover al jugador
      player.x = testX;
      player.y = testY;
      console.log(`✅ Jugador ${player.nick} expulsado exitosamente a (${player.x}, ${player.y})`);
      return true;
    }
    
    // Incrementar distancia de expulsión
    expelDistance += 10;
    attempt++;
  }
  
  // Si no se pudo expulsar con la normal, intentar en las 8 direcciones cardinales
  const directions = [
    { x: 1, y: 0 },   // derecha
    { x: -1, y: 0 },  // izquierda
    { x: 0, y: 1 },   // abajo
    { x: 0, y: -1 },  // arriba
    { x: 1, y: 1 },   // diagonal abajo-derecha
    { x: -1, y: 1 },  // diagonal abajo-izquierda
    { x: 1, y: -1 },  // diagonal arriba-derecha
    { x: -1, y: -1 }  // diagonal arriba-izquierda
  ];
  
  for (const dir of directions) {
    let distance = 20;
    while (distance < 200) {
      const testX = player.x + dir.x * distance;
      const testY = player.y + dir.y * distance;
      
      // Verificar límites del mapa
      if (testX < 0 || testX > 2500 || testY < 0 || testY > 1500) {
        break;
      }
      
      if (!checkCollision(testX, testY, sala)) {
        player.x = testX;
        player.y = testY;
        console.log(`✅ Jugador ${player.nick} expulsado en dirección alternativa a (${player.x}, ${player.y})`);
        return true;
      }
      
      distance += 15;
    }
  }
  
  console.warn(`⚠️ No se pudo expulsar al jugador ${player.nick} del muro`);
  return false;
}

// Función auxiliar para detectar intersección entre una línea y un rectángulo
function lineIntersectsRect(x1, y1, x2, y2, rectX, rectY, rectWidth, rectHeight) {
  // Verificar si algún extremo de la línea está dentro del rectángulo
  const insideStart = (x1 >= rectX && x1 <= rectX + rectWidth && y1 >= rectY && y1 <= rectY + rectHeight);
  const insideEnd = (x2 >= rectX && x2 <= rectX + rectWidth && y2 >= rectY && y2 <= rectY + rectHeight);
  
  if (insideStart || insideEnd) return true;
  
  // Verificar intersección con cada lado del rectángulo
  // Top
  if (lineIntersectsLine(x1, y1, x2, y2, rectX, rectY, rectX + rectWidth, rectY)) return true;
  // Bottom
  if (lineIntersectsLine(x1, y1, x2, y2, rectX, rectY + rectHeight, rectX + rectWidth, rectY + rectHeight)) return true;
  // Left
  if (lineIntersectsLine(x1, y1, x2, y2, rectX, rectY, rectX, rectY + rectHeight)) return true;
  // Right
  if (lineIntersectsLine(x1, y1, x2, y2, rectX + rectWidth, rectY, rectX + rectWidth, rectY + rectHeight)) return true;
  
  return false;
}

// Función auxiliar para detectar intersección entre dos líneas
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den === 0) return false;
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Función para verificar colisión en una posición dada y devolver el obstáculo que colisiona
// Ahora también retorna la normal de colisión para mejorar el sliding
function checkCollision(x, y, sala) {
  if (!sala || !sala.id) {
    return null;
  }
  
  // Verificar colisión con muros
  if (murosPorSala[sala.id] && murosPorSala[sala.id].length > 0) {
    for (const muro of murosPorSala[sala.id]) {
      // Si el muro tiene colisión desactivada, saltarlo
      if (muro.colision === false) continue;
      
      // PRIORIDAD MAXIMA: Bloques del editor con shape definido
      if (muro.shape === 'rect' || muro.shape === 'triangle') {
        const cos = Math.cos(-(muro.angle || 0));
        const sin = Math.sin(-(muro.angle || 0));
        const relX = x - muro.x;
        const relY = y - muro.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        
        const halfWidth = muro.width / 2 + 12;
        const halfHeight = muro.height / 2 + 12;
        
        if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
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
          
          const cosR = Math.cos(muro.angle || 0);
          const sinR = Math.sin(muro.angle || 0);
          const globalNormX = normX * cosR - normY * sinR;
          const globalNormY = normX * sinR + normY * cosR;
          
          return { muro, normalX: globalNormX, normalY: globalNormY };
        }
        continue; // Ya procesamos este muro, siguiente
      }
      if (muro.shape === 'circle') {
        const dx = x - muro.x;
        const dy = y - muro.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const totalRadius = (muro.radius || muro.width / 2) + 12;
        
        if (distance < totalRadius) {
          const normX = dx / distance;
          const normY = dy / distance;
          return { muro, normalX: normX, normalY: normY };
        }
        continue; // Ya procesamos este muro, siguiente
      }
      
      // � COLISIÓN UNIFICADA: Todos los bloques usan el mismo sistema
      // PRIORIDAD 1: Si tiene width y height (como muro_piedra), usar colisión ovalada
      if (muro.width && muro.height && !muro.radius && !muro.shape) {
        // Colisión ovalada (muro_piedra y otros)
        const angle = muro.angle || 0;
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const relX = x - muro.x;
        const relY = y - muro.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        const rx = muro.width + 12;
        const ry = muro.height + 12;
        if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
          // Calcular la normal del óvalo en el punto de colisión
          const normalLocalX = (2 * localX) / (rx * rx);
          const normalLocalY = (2 * localY) / (ry * ry);
          const normalLength = Math.sqrt(normalLocalX * normalLocalX + normalLocalY * normalLocalY) || 1;
          const normX = normalLocalX / normalLength;
          const normY = normalLocalY / normalLength;
          
          // Transformar normal a sistema global
          const cosR = Math.cos(angle);
          const sinR = Math.sin(angle);
          const globalNormX = normX * cosR - normY * sinR;
          const globalNormY = normX * sinR + normY * cosR;
          
          return { muro, normalX: globalNormX, normalY: globalNormY };
        }
      }
      // PRIORIDAD 2: Si tiene radius definido (y NO tiene width/height), es un círculo
      else if (muro.radius && !muro.width && !muro.height) {
        const dx = x - muro.x;
        const dy = y - muro.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const totalRadius = muro.radius + 12; // 12px = radio del jugador
        
        if (distance < totalRadius) {
          // Normal apunta desde el centro del círculo hacia el jugador
          const normX = dx / distance;
          const normY = dy / distance;
          return { muro, normalX: normX, normalY: normY };
        }
      }
      // 🪨 Si el muro tiene imagen con forma rectangular (como muro_roca), usar colisión AABB rotada
      else if ((muro.imagen || muro.tipo === 'muro_roca') && muro.forma !== 'ovalada') {
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
      }
    }
  }
  return null; // No colisiona
}

// ============================================
// 🎮 SISTEMA DE MOVIMIENTO EN TIEMPO REAL - ESTILO BATTLERITE
// ============================================
// Loop de movimiento a 60 tickrate (16.67ms) para movimiento fluido sin temblor
const TICK_RATE = 60; // 60 ticks por segundo (equilibrio perfecto)
const TICK_INTERVAL = 1000 / TICK_RATE; // ~16.67ms
const MOVEMENT_THRESHOLD = 0.1; // Umbral mínimo de movimiento para evitar micro-actualizaciones

setInterval(() => {
  // Procesar cada sala activa
  for (const sala of salas) {
    if (!sala.active) continue;
    
    for (const player of sala.players) {
      // 🧊 No permitir movimiento si está congelado, derrotado o siendo jalado
      if (!player.keyStates || player.defeated || player.beingPulled || player.frozen) continue;
      
      let dx = 0, dy = 0;
      if (player.keyStates.w) dy -= 1;
      if (player.keyStates.s) dy += 1;
      if (player.keyStates.a) dx -= 1;
      if (player.keyStates.d) dx += 1;
      
      // Solo procesar si hay movimiento
      if (dx === 0 && dy === 0) continue;
      
      // Normalizar dirección para movimiento diagonal consistente
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      
      // Calcular movimiento (velocidad ajustada por tick rate)
      let speed = (player.speed || DEFAULT_SPEED);
      
      // 🆕 Aplicar slow del láser si está activo
      if (player.laserSlowActive) {
        speed = speed * 0.1; // 90% de reducción
      }
      
      const newX = player.x + dx * speed;
      const newY = player.y + dy * speed;
      
      // Aplicar límites del mapa
      let finalX = Math.max(0, Math.min(2500, newX));
      let finalY = Math.max(0, Math.min(1500, newY));
      
      // Sistema de sliding suave con colisiones
      const collision = checkCollision(finalX, finalY, sala);
      
      if (collision) {
        // Sliding perfecto usando la normal de colisión
        const normal = { x: collision.normalX, y: collision.normalY };
        const moveVecX = finalX - player.x;
        const moveVecY = finalY - player.y;
        const dot = moveVecX * normal.x + moveVecY * normal.y;
        
        if (dot < 0) {
          // Proyectar movimiento a lo largo de la superficie
          const slideX = moveVecX - dot * normal.x;
          const slideY = moveVecY - dot * normal.y;
          const slideTargetX = player.x + slideX;
          const slideTargetY = player.y + slideY;
          
          if (!checkCollision(slideTargetX, slideTargetY, sala)) {
            finalX = slideTargetX;
            finalY = slideTargetY;
          } else {
            // Sliding reducido
            const reducedX = player.x + slideX * 0.3;
            const reducedY = player.y + slideY * 0.3;
            if (!checkCollision(reducedX, reducedY, sala)) {
              finalX = reducedX;
              finalY = reducedY;
            } else {
              finalX = player.x;
              finalY = player.y;
            }
          }
        } else {
          finalX = player.x;
          finalY = player.y;
        }
      }
      
      // Actualizar posición solo si el cambio es significativo (evita temblor)
      const deltaX = finalX - player.x;
      const deltaY = finalY - player.y;
      const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (movementDistance > MOVEMENT_THRESHOLD) {
        player.x = finalX;
        player.y = finalY;
        
        // Enviar actualización
        io.to(sala.id).emit('playerMoved', {
          nick: player.nick,
          x: Math.round(player.x * 10) / 10, // Redondear a 1 decimal para reducir jitter
          y: Math.round(player.y * 10) / 10
        });
      }
    }
  }
}, TICK_INTERVAL);

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

setInterval(async () => {
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
      
      // 🆕 Expirar invisibilidad
      if (jugador.invisible && jugador.invisibleUntil && now > jugador.invisibleUntil) {
        jugador.invisible = false;
        jugador.invisibleUntil = 0;
        // Emitir posición final cuando reaparece
        io.to(sala.id).emit('playerVisible', { 
          nick: jugador.nick,
          x: jugador.x,
          y: jugador.y
        });
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
        // Emitir evento de tumba con información del killer
        io.to(sala.id).emit('playerDied', {
          nick: jugador.nick,
          x: jugador.x,
          y: jugador.y,
          killer: jugador.lastAttacker || null
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
    
    // 🆕 Lógica de Láseres Continuos
    if (laseresContinuosPorSala[sala.id]) {
      for (let i = laseresContinuosPorSala[sala.id].length - 1; i >= 0; i--) {
        const laser = laseresContinuosPorSala[sala.id][i];
        const laserAge = now - laser.createdAt;
        
        // Remover si expiró
        if (laserAge > laser.duracion) {
          // 🆕 Restaurar velocidad del jugador si era el nuevo láser
          if (laser.mejoraId === 'laser') {
            const lanzador = jugadores.find(p => p.nick === laser.owner);
            if (lanzador) {
              lanzador.laserSlowActive = false;
            }
          }
          
          io.to(sala.id).emit('laserRemoved', { id: laser.id });
          laseresContinuosPorSala[sala.id].splice(i, 1);
          continue;
        }
        
        // 🆕 Actualizar posición del láser para que siga al jugador
        if (laser.mejoraId === 'laser') {
          const lanzador = jugadores.find(p => p.nick === laser.owner);
          if (lanzador && !lanzador.defeated) {
            laser.x = lanzador.x;
            laser.y = lanzador.y;
            
            // Emitir actualización de posición
            io.to(sala.id).emit('laserPositionUpdate', {
              id: laser.id,
              x: laser.x,
              y: laser.y
            });
          }
        }
        
        // Hacer daño cada intervalo
        if (!laser.lastDamageTime || now - laser.lastDamageTime >= laser.damageInterval) {
          laser.lastDamageTime = now;
          
          // Calcular el punto final del láser
          const endX = laser.x + Math.cos(laser.angle) * laser.maxRange;
          const endY = laser.y + Math.sin(laser.angle) * laser.maxRange;
          
          // 🆕 Detectar si el láser atraviesa muros (solo para el nuevo láser)
          let penetratedWall = false;
          if (laser.canPenetrateWalls && murosPorSala[sala.id]) {
            for (const muro of murosPorSala[sala.id]) {
              // Verificar intersección línea-rectángulo
              if (lineIntersectsRect(laser.x, laser.y, endX, endY, muro.x, muro.y, muro.width, muro.height)) {
                penetratedWall = true;
                break;
              }
            }
          }
          
          // Detectar jugadores en la línea del láser
          let hasHitTarget = false; // Para rastrear si el láser impactó a alguien (para curación)
          
          for (const jugador of jugadores) {
            if (jugador.defeated || jugador.nick === laser.owner) continue;
            
            // Calcular distancia punto a línea
            const dx = endX - laser.x;
            const dy = endY - laser.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) continue;
            
            const t = Math.max(0, Math.min(1, ((jugador.x - laser.x) * dx + (jugador.y - laser.y) * dy) / lenSq));
            const projX = laser.x + t * dx;
            const projY = laser.y + t * dy;
            
            const distToLine = Math.sqrt((jugador.x - projX) ** 2 + (jugador.y - projY) ** 2);
            
            // Si está dentro del radio del láser (hitbox)
            if (distToLine <= laser.radius + 32) {
              hasHitTarget = true; // El láser impactó a un enemigo
              
              // Calcular daño (reducido si atravesó muro)
              let damageAmount = laser.damage;
              if (penetratedWall && laser.wallDamageReduction) {
                damageAmount = Math.floor(damageAmount * (1 - laser.wallDamageReduction));
              }
              
              // Aplicar daño considerando escudo
              if (jugador.shieldAmount > 0) {
                const shieldDamage = Math.min(jugador.shieldAmount, damageAmount);
                jugador.shieldAmount -= shieldDamage;
                const remainingDamage = damageAmount - shieldDamage;
                jugador.health -= remainingDamage;
                
                io.to(sala.id).emit('shieldHit', {
                  nick: jugador.nick,
                  shieldDamage,
                  remainingShield: jugador.shieldAmount
                });
              } else {
                jugador.health -= damageAmount;
              }
              
              jugador.lastAttacker = laser.owner;
              
              io.to(sala.id).emit('hitEvent', {
                projectileId: laser.id,
                target: jugador.nick,
                x: jugador.x,
                y: jugador.y,
                damage: damageAmount
              });
            }
          }
          
          // 🆕 Curación del dueño del láser si impactó a un enemigo
          if (hasHitTarget && laser.healPerSecond > 0) {
            const lanzador = jugadores.find(p => p.nick === laser.owner);
            if (lanzador && !lanzador.defeated) {
              const healAmount = laser.healPerSecond;
              const maxHealth = lanzador.maxHealth || 200; // Usar la vida máxima del jugador
              lanzador.health = Math.min(maxHealth, lanzador.health + healAmount);
              
              io.to(sala.id).emit('healEvent', {
                target: lanzador.nick,
                amount: healAmount,
                type: 'laser_heal'
              });
            }
          }
        }
      }
    }
    
    // 🆕 Lógica de Tornados con atracción, daño continuo y slow
    if (tornadosPorSala[sala.id]) {
      for (let i = tornadosPorSala[sala.id].length - 1; i >= 0; i--) {
        const tornado = tornadosPorSala[sala.id][i];
        const tornadoAge = now - tornado.createdAt;
        
        // Remover si expiró
        if (tornadoAge > tornado.duration) {
          io.to(sala.id).emit('tornadoRemoved', { id: tornado.id });
          tornadosPorSala[sala.id].splice(i, 1);
          continue;
        }
        
        // 🌪️ Crecimiento del tornado (crece durante el primer segundo)
        if (tornado.radius < tornado.maxRadius) {
          tornado.radius = Math.min(tornado.maxRadius, tornado.radius + tornado.growthRate * SIMULATION_DT);
        }
        
        // Mover el tornado aleatoriamente (solo si ya ha crecido completamente)
        if (tornado.radius >= tornado.maxRadius) {
          if (now >= tornado.moveChangeTime) {
            tornado.moveAngle = Math.random() * Math.PI * 2;
            tornado.moveChangeTime = now + 1000; // Cambiar dirección cada segundo
          }
          tornado.x += Math.cos(tornado.moveAngle) * tornado.moveSpeed;
          tornado.y += Math.sin(tornado.moveAngle) * tornado.moveSpeed;
          // Mantener dentro de los límites del mapa
          tornado.x = Math.max(tornado.radius, Math.min(2500 - tornado.radius, tornado.x));
          tornado.y = Math.max(tornado.radius, Math.min(1500 - tornado.radius, tornado.y));
        }
        
        // Emitir posición y tamaño actualizado del tornado
        io.to(sala.id).emit('tornadoUpdate', {
          id: tornado.id,
          x: tornado.x,
          y: tornado.y,
          radius: tornado.radius
        });
        
        // Solo aplicar daño y efectos si el tornado está completamente crecido
        if (tornado.radius >= tornado.maxRadius) {
          // 💥 Explosión de sabor: crear explosiones periódicas
          if (tornado.hasExplosionSabor && now - tornado.lastExplosionTime >= tornado.explosionInterval) {
            tornado.lastExplosionTime = now;
            
            // Crear explosión en el centro del tornado
            io.to(sala.id).emit('explosion', {
              x: tornado.x,
              y: tornado.y,
              color: '#FFA500', // Naranja
              radius: tornado.explosionRadius,
              duration: 600
            });
            
            // Daño adicional de explosión a todos en el área
            for (const jugador of jugadores) {
              if (jugador.defeated || jugador.nick === tornado.owner) continue;
              
              const dx = jugador.x - tornado.x;
              const dy = jugador.y - tornado.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist <= tornado.explosionRadius + 32) {
                jugador.lastAttacker = tornado.owner;
                const explosionDamage = Math.floor(tornado.damagePerTick * 0.5); // 50% del daño del tornado
                applyDamage(jugador, explosionDamage, io, sala.id, 'tornado_explosion');
              }
            }
          }
          
          // Aplicar daño periódico
          if (now - tornado.lastDamageTick >= tornado.tickRate) {
            tornado.lastDamageTick = now;
            
            // Detectar jugadores en el área y aplicar daño
            for (const jugador of jugadores) {
              if (jugador.defeated || jugador.nick === tornado.owner) continue;
              
              const dx = jugador.x - tornado.x;
              const dy = jugador.y - tornado.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // Si está dentro del radio del tornado
              if (dist <= tornado.radius + 32) {
                jugador.lastAttacker = tornado.owner;
                applyDamage(jugador, tornado.damagePerTick, io, sala.id, 'tornado');
              }
            }
          }
          
          // Aplicar atracción y slow a jugadores cercanos
          for (const jugador of jugadores) {
            if (jugador.defeated || jugador.nick === tornado.owner || jugador.beingPulled) continue;
            
            const dx = jugador.x - tornado.x;
            const dy = jugador.y - tornado.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Si está dentro del radio de succión
            if (dist <= tornado.radius + 32) {
              // Atraer hacia el centro
              if (dist > 10) { // Evitar división por cero
                const pullX = -(dx / dist) * tornado.pullForce;
                const pullY = -(dy / dist) * tornado.pullForce;
                
                jugador.x += pullX;
                jugador.y += pullY;
                
                // Mantener dentro de los límites del mapa
                jugador.x = Math.max(0, Math.min(2500, jugador.x));
                jugador.y = Math.max(0, Math.min(1500, jugador.y));
              }
              
              // Aplicar slow si no está ya slowed por otra fuente
              if (!jugador.slowUntil || jugador.slowUntil < now) {
                jugador.speed = DEFAULT_SPEED * (1 - tornado.slowAmount);
                jugador.tornadoSlowed = true;
              }
            } else {
              // Fuera del tornado, restaurar velocidad si estaba slowed por tornado
              if (jugador.tornadoSlowed) {
                jugador.speed = DEFAULT_SPEED;
                jugador.tornadoSlowed = false;
              }
            }
          }
        }
      }
    }
    
    // 🪝 Procesar jalados activos del gancho (animación fluida)
    if (hookPullsPorSala[sala.id]) {
      for (let i = hookPullsPorSala[sala.id].length - 1; i >= 0; i--) {
        const pull = hookPullsPorSala[sala.id][i];
        const elapsed = now - pull.startTime;
        const progress = Math.min(elapsed / pull.duration, 1);
        
        // Encontrar al jugador siendo jalado
        const targetPlayer = sala.players.find(p => p.nick === pull.targetNick);
        if (!targetPlayer) {
          hookPullsPorSala[sala.id].splice(i, 1);
          continue;
        }
        
        // Marcar al jugador como siendo jalado (bloquea movimiento normal)
        targetPlayer.beingPulled = true;
        
        // Interpolación suave usando easing (ease-out para desaceleración)
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        
        // Calcular posición actual
        targetPlayer.x = pull.startX + (pull.endX - pull.startX) * easeProgress;
        targetPlayer.y = pull.startY + (pull.endY - pull.startY) * easeProgress;
        
        // Actualizar targetX/targetY para interpolación del cliente
        targetPlayer.targetX = targetPlayer.x;
        targetPlayer.targetY = targetPlayer.y;
        
        // Si completó la animación, remover y desbloquear movimiento
        if (progress >= 1) {
          targetPlayer.beingPulled = false;
          hookPullsPorSala[sala.id].splice(i, 1);
        }
      }
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
      // Skyfall projectiles ignore walls - they fall from above
      const isSkyfall = mejoraProyectil && mejoraProyectil.skyfall === true;
      if (!reboteado && !isSkyfall) {
        for (const muro of muros) {
          if (muro.colision === false) continue;
          
          let colisionDetectada = false;
          let globalNormX = 0, globalNormY = 0;
          
          // 🎯 PRIORIDAD 1: Bloques del mapa con shape definido (rect, circle, triangle)
          if (muro.shape === 'rect' || muro.shape === 'triangle') {
            // Colisión rectangular/triangular con rotación (AABB rotado)
            const cos = Math.cos(-muro.angle);
            const sin = Math.sin(-muro.angle);
            const relX = p.x - muro.x;
            const relY = p.y - muro.y;
            const localX = relX * cos - relY * sin;
            const localY = relX * sin + relY * cos;
            
            const halfWidth = (muro.width / 2) + (p.radius || 16);
            const halfHeight = (muro.height / 2) + (p.radius || 16);
            
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
          } else if (muro.shape === 'circle') {
            // Colisión circular
            const dx = p.x - muro.x;
            const dy = p.y - muro.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = (muro.width / 2) + (p.radius || 16);
            
            if (dist <= radius) {
              colisionDetectada = true;
              // Normal apunta desde el centro del círculo hacia el proyectil
              globalNormX = dx / dist;
              globalNormY = dy / dist;
            }
          }
          // 🎯 PRIORIDAD 2: Muros con imagen (como muro_roca)
          else if ((muro.imagen || muro.tipo === 'muro_roca') && muro.forma === 'rectangular') {
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
          } 
          // 🎯 PRIORIDAD 3: Muros ovalados (muro de piedra con width/height)
          else if (muro.width && muro.height) {
            // Colisión ovalada para muros de habilidad (como muro de piedra)
            const mejoraMuro = MEJORAS.find(m => m.id === muro.id);
            if (!mejoraMuro || mejoraMuro.colision === false) continue;
            
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
              
              // 🪝 GANCHO: Si impacta un muro, jalar al dueño hacia el muro
              if (p.mejoraId === 'gancho') {
                const hookOwner = sala.players.find(pl => pl.nick === p.owner);
                if (hookOwner) {
                  // Calcular punto de impacto (posición actual del gancho)
                  const hookX = p.x;
                  const hookY = p.y;
                  
                  // Calcular distancia al muro
                  const pullDx = hookX - hookOwner.x;
                  const pullDy = hookY - hookOwner.y;
                  const pullDist = Math.sqrt(pullDx * pullDx + pullDy * pullDy);
                  
                  if (pullDist > 50) { // Solo jalar si está a más de 50px
                    const pullAngle = Math.atan2(pullDy, pullDx);
                    
                    // Calcular posición final (dejar 50px de distancia del muro)
                    const finalX = hookX - Math.cos(pullAngle) * 50;
                    const finalY = hookY - Math.sin(pullAngle) * 50;
                    
                    // Iniciar jalado gradual del dueño hacia el muro
                    if (!hookPullsPorSala[sala.id]) hookPullsPorSala[sala.id] = [];
                    
                    hookPullsPorSala[sala.id].push({
                      targetNick: hookOwner.nick,
                      startX: hookOwner.x,
                      startY: hookOwner.y,
                      endX: finalX,
                      endY: finalY,
                      startTime: Date.now(),
                      duration: 400, // 400ms de animación
                      pullSpeed: mejora.effect.pullSpeed || 25
                    });
                  }
                  
                  // Reducir cooldown del gancho en 50%
                  const cdReduction = mejora.effect.cdReduction || 0.5;
                  io.to(sala.id).emit('hookHit', {
                    owner: p.owner,
                    cdReduction: cdReduction,
                    hitType: 'wall'
                  });
                }
                destroy = true;
                break;
              }
              
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
            console.log(`Skyfall ${p.mejoraId} impactando en (${p.targetX}, ${p.targetY})`);
            
            // Para skyfall, aplicar daño en área en el target cuando llega al suelo
            const skyfallRadius = p.radius; // Usar el radio agrandado del proyectil
            
            // Aplicar daño de impacto directo
            for (const jugador of jugadores) {
              if (jugador.nick === p.owner || jugador.defeated) continue;
              const jdx = jugador.x - p.targetX;
              const jdy = jugador.y - p.targetY;
              const jdist = Math.sqrt(jdx*jdx + jdy*jdy);
              if (jdist <= skyfallRadius + 32) { // radio mejora + radio jugador
                const damage = getDanioMejora(p.mejoraId, p.owner, sala);
                jugador.lastAttacker = p.owner;
                applyDamage(jugador, damage, io, sala.id, 'skyfall');
                console.log(`Daño directo de ${damage} aplicado a ${jugador.nick}`);
                
                // 🔥 Aplicar efecto de quemadura si lo tiene (Super Meteoro)
                if (mejora.effect && mejora.effect.type === 'dot') {
                  jugador.dotEffects = jugador.dotEffects || [];
                  jugador.dotEffects.push({
                    damage: mejora.effect.damage,
                    duration: mejora.effect.duration,
                    startTime: Date.now(),
                    elemento: mejora.elemento || 'fuego'
                  });
                  console.log(`Quemadura aplicada a ${jugador.nick}: ${mejora.effect.damage} daño/s por ${mejora.effect.duration}ms`);
                }
              }
            }
            
            // 💥 Emitir animación de impacto directo (crater del meteoro)
            io.to(sala.id).emit('explosion', {
              x: p.targetX,
              y: p.targetY,
              radius: skyfallRadius,
              color: '#FF4500', // Naranja rojizo intenso para el impacto
              duration: 400 // Impacto rápido
            });
            
            // 💥 Aplicar daño de onda expansiva si existe (Super Meteoro)
            if (mejora.explosionRadius && mejora.explosionDamage) {
              console.log(`Aplicando onda expansiva: radio ${mejora.explosionRadius}, daño ${mejora.explosionDamage}`);
              for (const jugador of jugadores) {
                if (jugador.nick === p.owner || jugador.defeated) continue;
                const jdx = jugador.x - p.targetX;
                const jdy = jugador.y - p.targetY;
                const jdist = Math.sqrt(jdx*jdx + jdy*jdy);
                
                // Solo aplicar onda expansiva si NO está en el radio de impacto directo
                if (jdist > skyfallRadius + 32 && jdist <= mejora.explosionRadius + 32) {
                  jugador.lastAttacker = p.owner;
                  applyDamage(jugador, mejora.explosionDamage, io, sala.id, 'explosion');
                  console.log(`Daño de explosión de ${mejora.explosionDamage} aplicado a ${jugador.nick}`);
                  
                  // 🔥 Aplicar efecto de quemadura también en la onda expansiva
                  if (mejora.effect && mejora.effect.type === 'dot') {
                    jugador.dotEffects = jugador.dotEffects || [];
                    jugador.dotEffects.push({
                      damage: mejora.effect.damage,
                      duration: mejora.effect.duration,
                      startTime: Date.now(),
                      elemento: mejora.elemento || 'fuego'
                    });
                  }
                }
              }
              
              // 🌊 Emitir animación de onda expansiva (como el meteoro normal)
              io.to(sala.id).emit('explosion', {
                x: p.targetX,
                y: p.targetY,
                radius: mejora.explosionRadius,
                color: mejora.color || '#8B0000',
                duration: 600 // Duración de la animación de explosión
              });
              console.log(`Animación de explosión emitida en (${p.targetX}, ${p.targetY})`);
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
          } else if (p.mejoraId === 'ventisca') {
            // Crear área de Ventisca
            if (!ventiscasPorSala[sala.id]) ventiscasPorSala[sala.id] = [];
            
            console.log(`Creando Ventisca en (${p.targetX}, ${p.targetY})`);
            
            ventiscasPorSala[sala.id].push({
              x: p.targetX,
              y: p.targetY,
              width: mejora.width || 300,
              height: mejora.height || 200,
              damage: mejora.danio || 20,
              damageInterval: mejora.damageInterval || 500,
              duration: mejora.duration || 2500,
              slowAmount: mejora.effect?.slowAmount || 0.4,
              slowDuration: mejora.effect?.slowDuration || 1500,
              hitsToFreeze: mejora.effect?.hitsToFreeze || 4,
              freezeDuration: mejora.effect?.freezeDuration || 1000,
              owner: p.owner,
              createdAt: Date.now(),
              lastDamageTime: Date.now(),
              affectedPlayers: {} // Rastrear golpes por jugador
            });
            
            // Emitir al frontend para dibujar la ventisca
            io.to(sala.id).emit('ventiscaCreated', {
              x: p.targetX,
              y: p.targetY,
              width: mejora.width || 300,
              height: mejora.height || 200,
              duration: mejora.duration || 2500
            });
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
        
        // 🪝 GANCHO: Lógica especial de jalado
        if (p.mejoraId === 'gancho') {
          const dx = jugador.x - p.x;
          const dy = jugador.y - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 32 + p.radius) { // radio jugador + radio gancho
            // Encontrar al jugador que lanzó el gancho
            const hookOwner = sala.players.find(pl => pl.nick === p.owner);
            if (hookOwner) {
              // Aplicar daño
              const damage = getDanioMejora(p.mejoraId, p.owner, sala);
              jugador.lastAttacker = p.owner;
              applyDamage(jugador, damage, io, sala.id, 'hit');
              
              // Iniciar jalado gradual del enemigo hacia el dueño del gancho
              if (!hookPullsPorSala[sala.id]) hookPullsPorSala[sala.id] = [];
              
              hookPullsPorSala[sala.id].push({
                targetNick: jugador.nick,
                startX: jugador.x,
                startY: jugador.y,
                endX: hookOwner.x,
                endY: hookOwner.y,
                startTime: Date.now(),
                duration: 400, // 400ms de animación
                pullSpeed: mejora.effect.pullSpeed || 25
              });
              
              // Aplicar slow
              const slowAmount = mejora.effect.slowAmount || 0.25;
              const slowDuration = mejora.effect.slowDuration || 1500;
              jugador.slowUntil = now + slowDuration;
              jugador.speed = DEFAULT_SPEED * (1 - slowAmount);
              
              // Reducir cooldown del gancho en 50%
              const cdReduction = mejora.effect.cdReduction || 0.5;
              io.to(sala.id).emit('hookHit', {
                owner: p.owner,
                cdReduction: cdReduction,
                hitType: 'player'
              });
            }
            proyectiles.splice(i, 1);
            break;
          }
          continue; // Continuar con siguiente jugador
        }
        
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
      // Verificar expiración de invisibilidad
      if (jugador.invisibleUntil && now > jugador.invisibleUntil) {
        jugador.invisible = false;
        jugador.invisibleUntil = 0;
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
      
      // ❄️ Procesar Ventiscas - daño cada 0.5s, slow, y congelamiento
      if (ventiscasPorSala[sala.id]) {
        for (const ventisca of ventiscasPorSala[sala.id]) {
          // Calcular posición del jugador relativa al centro de la ventisca
          const dx = jugador.x - ventisca.x;
          const dy = jugador.y - ventisca.y;
          
          // Aplicar rotación inversa para verificar si está dentro del rectángulo
          const angle = ventisca.angle || 0;
          const cos = Math.cos(-angle); // Rotación inversa
          const sin = Math.sin(-angle);
          const rotatedX = dx * cos - dy * sin;
          const rotatedY = dx * sin + dy * cos;
          
          // Verificar si está dentro del rectángulo rotado
          if (Math.abs(rotatedX) <= ventisca.width / 2 + 32 && Math.abs(rotatedY) <= ventisca.height / 2 + 32) {
            // El jugador está dentro de la ventisca
            
            // Aplicar daño cada intervalo
            if (now - ventisca.lastDamageTime >= ventisca.damageInterval) {
              ventisca.lastDamageTime = now;
              
              // No dañar al dueño
              if (jugador.nick !== ventisca.owner && !jugador.defeated) {
                // Aplicar daño
                jugador.lastAttacker = ventisca.owner;
                applyDamage(jugador, ventisca.damage, io, sala.id, 'ventisca');
                
                // Rastrear golpes para congelamiento
                if (!ventisca.affectedPlayers[jugador.nick]) {
                  ventisca.affectedPlayers[jugador.nick] = {
                    hits: 0,
                    lastHitTime: 0
                  };
                }
                
                ventisca.affectedPlayers[jugador.nick].hits++;
                ventisca.affectedPlayers[jugador.nick].lastHitTime = now;
                
                console.log(`Ventisca: ${jugador.nick} recibió golpe ${ventisca.affectedPlayers[jugador.nick].hits}/${ventisca.hitsToFreeze}`);
                
                // Aplicar slow (se resetea con cada golpe)
                jugador.slowUntil = now + ventisca.slowDuration;
                jugador.speed = Math.max(0, DEFAULT_SPEED * (1 - ventisca.slowAmount));
                
                // Verificar si debe congelarse (4 golpes)
                if (ventisca.affectedPlayers[jugador.nick].hits >= ventisca.hitsToFreeze) {
                  console.log(`${jugador.nick} ¡CONGELADO!`);
                  
                  // Congelar al jugador
                  jugador.frozen = true;
                  jugador.frozenUntil = now + ventisca.freezeDuration;
                  jugador.speed = 0; // No puede moverse
                  
                  // Resetear contador de golpes
                  ventisca.affectedPlayers[jugador.nick].hits = 0;
                  
                  // Emitir evento de congelamiento al frontend
                  io.to(sala.id).emit('playerFrozen', {
                    nick: jugador.nick,
                    duration: ventisca.freezeDuration
                  });
                }
              }
            }
          }
        }
      }
      
      // Descongelar jugador si el tiempo expiró
      if (jugador.frozen && jugador.frozenUntil && now > jugador.frozenUntil) {
        jugador.frozen = false;
        jugador.frozenUntil = 0;
        jugador.speed = DEFAULT_SPEED;
        console.log(`${jugador.nick} descongelado`);
        
        io.to(sala.id).emit('playerUnfrozen', {
          nick: jugador.nick
        });
      }
      
      // Procesar DOT (viejo sistema - mantener por compatibilidad)
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
      
      // 🔥 Procesar nuevos efectos de DOT (sistema mejorado - soporta múltiples efectos)
      if (!jugador.dotEffects) jugador.dotEffects = [];
      for (let i = jugador.dotEffects.length - 1; i >= 0; i--) {
        const dotEffect = jugador.dotEffects[i];
        const dotElapsed = now - dotEffect.startTime;
        
        // Si el efecto expiró, removerlo
        if (dotElapsed >= dotEffect.duration) {
          jugador.dotEffects.splice(i, 1);
          console.log(`Efecto DOT de ${dotEffect.elemento} expiró para ${jugador.nick}`);
          continue;
        }
        
        // Aplicar daño cada segundo
        if (!dotEffect.lastTick) dotEffect.lastTick = dotEffect.startTime;
        if (now - dotEffect.lastTick >= 1000) {
          applyDamage(jugador, dotEffect.damage, io, sala.id, `dot_${dotEffect.elemento}`);
          dotEffect.lastTick = now;
          console.log(`DOT de ${dotEffect.elemento}: ${dotEffect.damage} daño aplicado a ${jugador.nick}`);
        }
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
          // Emitir evento de dash completado para sincronización instantánea
          io.to(sala.id).emit('playerDashCompleted', {
            nick: player.nick,
            x: player.x,
            y: player.y
          });
          // Verificar colisiones finales si no hit (solo para embestida, no para salto_sombrio)
          if (!player.dashHit && player.dashMejoraId !== 'salto_sombrio') {
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
          
          // Emitir posición actual durante el dash para sincronización en tiempo real
          io.to(sala.id).emit('playerDashing', {
            nick: player.nick,
            x: player.x,
            y: player.y
          });
          
          // Verificar colisiones durante el movimiento (solo para embestida, no para salto_sombrio)
          if (!player.dashHit && player.dashMejoraId !== 'salto_sombrio') {
            for (const enemy of jugadores) {
              if (enemy === player || enemy.defeated) continue;
              const ex = enemy.x - player.x;
              const ey = enemy.y - player.y;
              const edist = Math.sqrt(ex * ex + ey * ey);
              if (edist < 40) { // collision radius
                enemy.lastAttacker = player.nick;
                
                // Solo embestida hace daño (25)
                applyDamage(enemy, 25, io, sala.id, 'embestida');
                
                // Empujar al enemigo
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
          // Verificar colisión con muros usando checkCollision más preciso
          const collision = checkCollision(player.x, player.y, sala);
          if (collision) {
            // Colisión detectada, detener el dash sin rebote
            player.isDashing = false;
            
            // Retroceder usando la normal del muro para garantizar que el jugador salga
            const retreatDist = 30; // Retroceso más grande para asegurar que salga del muro
            player.x += collision.normalX * retreatDist;
            player.y += collision.normalY * retreatDist;
            
            // Verificar que la nueva posición esté dentro de los límites del mapa
            player.x = Math.max(0, Math.min(2500, player.x));
            player.y = Math.max(0, Math.min(1500, player.y));
            
            // Verificar si aún está en colisión y ajustar
            const stillColliding = checkCollision(player.x, player.y, sala);
            if (stillColliding) {
              // Expulsar usando la función de expulsión
              expelPlayerFromWall(player, sala);
            }
            
            // Emitir evento de dash completado (por colisión con muro)
            io.to(sala.id).emit('playerDashCompleted', {
              nick: player.nick,
              x: player.x,
              y: player.y
            });
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
    
    // 🚨 Verificar si algún jugador está atrapado dentro de un muro y expulsarlo
    for (const player of jugadores) {
      if (player.defeated) continue; // No verificar jugadores derrotados
      
      const wasExpelled = expelPlayerFromWall(player, sala);
      
      if (wasExpelled) {
        // Notificar a todos los clientes que el jugador fue reposicionado
        io.to(sala.id).emit('playerMoved', {
          nick: player.nick,
          x: player.x,
          y: player.y
        });
        
        // También emitir un evento específico de expulsión para feedback visual
        io.to(sala.id).emit('playerExpelledFromWall', {
          nick: player.nick,
          x: player.x,
          y: player.y
        });
      }
    }
    
    // Remove expired muddy grounds
    if (muddyGroundsPorSala[sala.id]) {
      muddyGroundsPorSala[sala.id] = muddyGroundsPorSala[sala.id].filter(muddy => now - muddy.createdAt < muddy.duration);
    }
    // ❄️ Remove expired ventiscas
    if (ventiscasPorSala[sala.id]) {
      const expiredVentiscas = ventiscasPorSala[sala.id].filter(v => now - v.createdAt >= v.duration);
      if (expiredVentiscas.length > 0) {
        console.log(`Eliminando ${expiredVentiscas.length} ventiscas expiradas`);
      }
      ventiscasPorSala[sala.id] = ventiscasPorSala[sala.id].filter(v => now - v.createdAt < v.duration);
    }
    // Remove expired walls (pero NUNCA borrar muros del mapa)
    if (murosPorSala[sala.id]) {
      murosPorSala[sala.id] = murosPorSala[sala.id].filter(muro => {
        // Mantener SIEMPRE muros del mapa
        if (muro.muroMapa === true) return true;
        // Para otros muros, verificar duración
        if (!muro.creado) return false; // Sin timestamp = borrar
        return now - muro.creado < muro.duracion;
      });
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
      if (ventiscasPorSala[sala.id]) ventiscasPorSala[sala.id] = []; // ❄️ Limpiar ventiscas
      // 🗺️ Limpiar solo muros temporales, mantener bloques permanentes del mapa
      if (murosPorSala[sala.id]) {
        const bloquesMapa = murosPorSala[sala.id].filter(m => m.muroMapa === true);
        murosPorSala[sala.id] = bloquesMapa;
        console.log(`🗺️ RoundEnded: Mantenidos ${bloquesMapa.length} bloques permanentes del mapa`);
      }
      if (tornadosPorSala[sala.id]) tornadosPorSala[sala.id] = [];
      
      // Resetear estados de jugadores (pero NO la posición aún)
      jugadores.forEach((player) => {
        player.speed = DEFAULT_SPEED;
        player.slowUntil = 0;
        player.speedBoostUntil = 0;
        player.dotUntil = 0;
        player.dotDamage = 0;
        player.dotType = null;
        player.lastDotTime = 0;
        player.frozen = false; // ❄️ Descongelar
        player.frozenUntil = 0; // ❄️ Resetear tiempo de congelamiento
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
        
        // 🧹 Limpiar TODOS los elementos de la sala cuando termina el juego
        if (proyectilesPorSala[sala.id]) proyectilesPorSala[sala.id] = [];
        if (laseresContinuosPorSala[sala.id]) laseresContinuosPorSala[sala.id] = [];
        if (tornadosPorSala[sala.id]) tornadosPorSala[sala.id] = [];
        if (castsPorSala[sala.id]) castsPorSala[sala.id] = [];
        if (muddyGroundsPorSala[sala.id]) muddyGroundsPorSala[sala.id] = [];
        if (holyGroundsPorSala[sala.id]) holyGroundsPorSala[sala.id] = [];
        if (murosPorSala[sala.id]) {
          murosPorSala[sala.id] = murosPorSala[sala.id].filter(m => m.muroMapa === true);
        }
        
      } else {
        // 🎮 Generar NUEVO escenario para la nueva ronda
        await crearEscenarioBatalla(sala.id, sala.round);
        
        // 🎯 Reposicionar jugadores usando spawns del mapa
        const mapSpawns = global.mapSpawns && global.mapSpawns[sala.id];
        jugadores.forEach((player, i) => {
          if (mapSpawns && mapSpawns[i]) {
            // Usar spawn del mapa
            player.x = mapSpawns[i].x;
            player.y = mapSpawns[i].y;
          } else {
            // Usar posiciones por defecto en esquinas
            const offset = 200;
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
          }
        });
        
        // Emitir evento de inicio de ronda
        io.to(sala.id).emit('roundStarted', { round: sala.round });
        
        io.to(sala.id).emit('gameStarted', sala);
        
        // Enviar el NUEVO escenario de la ronda
        if (murosPorSala[sala.id]) {
          io.to(sala.id).emit('escenarioMuros', murosPorSala[sala.id]);
        }
        
        // 🆕 Ronda 4: Habilidades F (proyectilF)
        if (sala.round === 4) {
          const habilidadesF = MEJORAS.filter(m => m.proyectilF);
          function shuffle(array) {
            return array.sort(() => Math.random() - 0.5);
          }
          for (const player of sala.players) {
            // Ofrecer 3 habilidades F aleatorias (o todas si hay menos de 3)
            const selectedUpgrades = shuffle([...habilidadesF]).slice(0, 3);
            io.to(sala.id).emit('availableUpgrades', { nick: player.nick, upgrades: selectedUpgrades });
          }
        }
        // De la ronda 2, 3, 5, 6 y 7: mostrar solo aumentos
        else if ((sala.round >= 2 && sala.round <= 3) || (sala.round >= 5 && sala.round <= 7)) {
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
    // ✅ IMPORTANTE: wallsUpdate solo debe enviar muros TEMPORALES (de habilidades)
    // Los muros del mapa ya fueron enviados una vez con escenarioMuros
    const murosTemporales = (murosPorSala[sala.id] || []).filter(m => m.muroMapa !== true);
    io.to(sala.id).emit('wallsUpdate', murosTemporales);
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

