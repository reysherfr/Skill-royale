
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
// Ruta para la raíz, evita error 404 en /
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});
// const db = new sqlite3.Database('users.db');
const port = 3000;
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

io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });

  socket.on('gameAccepted', (data) => {
    const { stats, winner } = data;
    const rooms = Array.from(socket.rooms);
    const roomId = rooms.find(r => r !== socket.id);
    if (roomId && stats) {
      stats.forEach(stat => {
        const gameWins = stat.nick === winner ? 1 : 0;
        db.run('UPDATE users SET exp = exp + ?, victories = victories + ?, gameWins = gameWins + ?, totalKills = totalKills + ?, totalDeaths = totalDeaths + ? WHERE nick = ?', [stat.exp, stat.victories, gameWins, stat.kills, stat.deaths, stat.nick], (err) => {
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
    // Inicializar ronda por sala si no existe
    sala.round = 1;
    // Distribuir hasta 4 jugadores alrededor del centro
    const centerX = 2000 / 2;
    const centerY = 1200 / 2;
    const offset = 200;
    sala.players.forEach((player, i) => {
      if (i === 0) { // izquierda
        player.x = centerX - offset;
        player.y = centerY;
      } else if (i === 1) { // derecha
        player.x = centerX + offset;
        player.y = centerY;
      } else if (i === 2) { // arriba
        player.x = centerX;
        player.y = centerY - offset;
      } else if (i === 3) { // abajo
        player.x = centerX;
        player.y = centerY + offset;
      } else {
        player.x = centerX;
        player.y = centerY;
      }
      player.speed = DEFAULT_SPEED;
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
    if (mejora.id === 'muro_piedra') {
      if (!murosPorSala[data.roomId]) murosPorSala[data.roomId] = [];
      // Calcular ángulo para el muro (igual que en frontend)
      const dx = data.targetX - data.x;
      const dy = data.targetY - data.y;
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const muro = {
        x: data.targetX,
        y: data.targetY,
        creado: Date.now(),
        duracion: mejora.duracion || 2000,
        color: mejora.color,
        radius: mejora.radius,
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
        radius: mejora.radius,
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
        radius: mejora.radius,
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
          io.to(data.roomId).emit('shieldApplied', {
            nick: data.owner,
            shieldAmount: player.shieldAmount,
            duration: mejora.duracion
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
    } else if (mejora.maxRange && !skillShot) {
      skillShot = true;
      targetX = data.x + Math.cos(data.angle) * mejora.maxRange;
      targetY = data.y + Math.sin(data.angle) * mejora.maxRange;
    }
    proyectilesPorSala[data.roomId].push({
      id: ++projectileIdCounter, // Asignar ID único
      x: startX,
      y: startY,
      angle,
      velocidad: data.velocidad, // Debe enviarse desde el cliente
      mejoraId: data.mejoraId,
      owner: data.owner,
      lifetime: 0,
      maxLifetime: mejora.maxLifetime || 1200, // fallback
      targetX,
      targetY,
      skillShot,
      hasHit: false // Flag para saber si ya impactó
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

    // Verificar si ya tiene esta mejora
    if (!player.mejoras.find(m => m.id === mejoraId)) {
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
    // Verificar que el target esté dentro del rango
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mejora = player.mejoras.find(m => m.id === 'teleport');
    if (!mejora || dist > mejora.maxRange) return;
    // Teletransportar
    player.x = targetX;
    player.y = targetY;
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
            const rx = muro.width + 32;
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
    // Verificar que el target esté dentro del rango
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mejora = player.mejoras.find(m => m.id === 'embestida');
    if (!mejora || dist > mejora.maxRange) return;
    // Iniciar dash
    player.isDashing = true;
    player.dashTargetX = targetX;
    player.dashTargetY = targetY;
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
    // Notificar a la sala y a todos los clientes
    io.to(sala.id).emit('playerLeft', sala);
    io.emit('roomsUpdated');
  });
  // Guardar el nick del jugador en el socket al unirse
  socket.on('setNick', (nick) => {
    socket.nick = nick;
  });
});

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar base de datos SQLite
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log('Base de datos SQLite abierta.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nick TEXT UNIQUE,
      password TEXT,
      nivel INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      victories INTEGER DEFAULT 0
    )`);
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
  }
});

// Endpoint de registro
app.post('/register', (req, res) => {
  const { nick, password } = req.body;
  if (!nick || !password) {
    return res.status(400).json({ error: 'Nick y contraseña requeridos.' });
  }
  db.run(
    'INSERT INTO users (nick, password) VALUES (?, ?)',
    [nick, password],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'Nick ya existe o error en registro.' });
      }
      res.json({ success: true, userId: this.lastID });
    }
  );
});

// Endpoint de inicio de sesión
app.post('/login', (req, res) => {
  const { nick, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE nick = ? AND password = ?',
    [nick, password],
    (err, row) => {
      if (err || !row) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
      }
      res.json({ success: true, user: { nick: row.nick, nivel: row.nivel, victories: row.victories, totalKills: row.totalKills, totalDeaths: row.totalDeaths } });
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
  return baseDanio;
}

// Utilidad para obtener el efecto de una mejora
function getEffectMejora(mejoraId) {
  const mejora = MEJORAS.find(m => m.id === mejoraId);
  return mejora ? mejora.effect : null;
}

// Función para aplicar daño considerando escudo
function applyDamage(player, damage, io, salaId, type = 'hit') {
  if (player.shieldAmount > 0) {
    const absorbed = Math.min(damage, player.shieldAmount);
    damage -= absorbed;
    player.shieldAmount -= absorbed;
    io.to(salaId).emit('shieldDamage', { nick: player.nick, absorbed });
  }
  player.health = Math.max(0, player.health - damage);
  io.to(salaId).emit('damageEvent', { target: player.nick, amount: damage, type });
}

// Función para manejar explosión de proyectil
function handleExplosion(sala, proyectil, io) {
  const mejora = MEJORAS.find(m => m.id === proyectil.mejoraId);
  if (!mejora || !mejora.explosionDamage) return;

  const explosionRadius = mejora.explosionRadius || 80;
  const explosionDamage = mejora.explosionDamage;

  // Aplicar daño a todos los jugadores en el radio, excepto el owner
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
          jugador.dotType = 'fire';
          jugador.lastDotTime = now;
        } else if (effect.type === 'stackingDot') {
          if (jugador.dotUntil > now) {
            jugador.dotDamage += effect.damage;
          } else {
            jugador.dotDamage = effect.damage;
          }
          jugador.dotUntil = now + (effect.duration || 6000);
          jugador.dotType = 'poison';
          jugador.lastDotTime = now;
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
      if (typeof jugador.health !== 'number') jugador.health = 100;
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
          if (killer) killer.kills = (killer.kills || 0) + 1;
        }
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
              jugador.health = Math.min(100, jugador.health + ground.healAmount);
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
      // Eliminar si sale del mapa o supera su vida máxima
      let destroy = false;
      if (
        p.x < 0 || p.x > 2000 ||
        p.y < 0 || p.y > 1200 ||
        (p.maxLifetime && p.lifetime >= p.maxLifetime)
      ) {
        destroy = true;
      }
      // Colisión con muros de piedra (óvalo)
      const muros = murosPorSala[sala.id] || [];
      for (const muro of muros) {
        const cos = Math.cos(-muro.angle);
        const sin = Math.sin(-muro.angle);
        const relX = p.x - muro.x;
        const relY = p.y - muro.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        const rx = muro.width + (p.radius || 16);
        const ry = muro.height + (p.radius || 16);
        if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
          // Colisiona con muro
          const mejora = MEJORAS.find(m => m.id === p.mejoraId);
          if (p.mejoraId === 'meteoro') {
            // Meteoro explota en el muro, solo una vez
            p.hasHit = true;
            handleExplosion(sala, p, io);
          }
          // Cuchilla oscura (cuchilla_fria) se destruye sin generar menores
          if (p.mejoraId === 'cuchilla_fria') {
            // No generar proyectiles menores
            destroy = true;
            break;
          }
          // Otros proyectiles: solo se destruyen
          destroy = true;
          break;
        }
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
            const skyfallRadius = mejora.radius || 20; // Usar el radio de la mejora
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
                radius: 125,
                slowAmount: 0.2,
                duration: 3000,
                createdAt: Date.now()
              });
              // Emit to frontend to draw the muddy ground
              io.to(sala.id).emit('muddyGroundCreated', {
                x: p.targetX,
                y: p.targetY,
                radius: 125,
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
                proyectiles.push({
                  id: ++projectileIdCounter,
                  x: p.x,
                  y: p.y,
                  angle: ang,
                  velocidad: 13, // Menor velocidad
                  mejoraId: 'cuchilla_fria_menor',
                  owner: p.owner,
                  lifetime: 0,
                  radius: 10,
                  skillShot: true,
                  // Usar el rango definido en MEJORAS
                  targetX: p.x + Math.cos(ang) * (MEJORAS.find(m => m.id === 'cuchilla_fria_menor')?.maxRange || 200),
                  targetY: p.y + Math.sin(ang) * (MEJORAS.find(m => m.id === 'cuchilla_fria_menor')?.maxRange || 200),
                  hasHit: false
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
              proyectiles.push({
                id: ++projectileIdCounter,
                x: baseX,
                y: baseY,
                angle: ang,
                velocidad: 13,
                mejoraId: 'cuchilla_fria_menor',
                owner: p.owner,
                lifetime: 0,
                radius: 10,
                skillShot: true,
                // Usar el rango definido en MEJORAS
                targetX: baseX + Math.cos(ang) * (MEJORAS.find(m => m.id === 'cuchilla_fria_menor')?.maxRange || 200),
                targetY: baseY + Math.sin(ang) * (MEJORAS.find(m => m.id === 'cuchilla_fria_menor')?.maxRange || 200),
                hasHit: false,
                ignoreNick: impactadoNick // Nuevo campo para ignorar daño a este jugador
              });
            }
          } else {
            // Otros proyectiles: daño normal
            applyDamage(jugador, damage, io, sala.id, 'hit');
            const mejoraSlow = MEJORAS.find(m => m.id === p.mejoraId);
            if (mejoraSlow && mejoraSlow.effect && mejoraSlow.effect.type === 'slow') {
              jugador.slowUntil = now + mejoraSlow.effect.duration;
              jugador.speed = DEFAULT_SPEED * (1 - mejoraSlow.effect.amount);
            }
            // Leer efecto onHit de la mejora
            const mejora = MEJORAS.find(m => m.id === p.mejoraId);
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
            // Aplicar efecto si existe
            const effect = getEffectMejora(p.mejoraId);
            if (effect) {
              if (effect.type === 'slow') {
                // Si ya está ralentizado, refrescar el tiempo; sino, aplicar el slow
                if (jugador.slowUntil > Date.now()) {
                  jugador.slowUntil = Date.now() + (effect.duration || 1000);
                } else {
                  jugador.speed = Math.max(0, DEFAULT_SPEED - effect.amount);
                  jugador.slowUntil = Date.now() + (effect.duration || 1000);
                }
              } else if (effect.type === 'dot') {
                jugador.dotUntil = Date.now() + (effect.duration || 3000);
                jugador.dotDamage = effect.damage || 2;
                jugador.dotType = 'fire';
                jugador.lastDotTime = Date.now();
              } else if (effect.type === 'stackingDot') {
                if (jugador.dotUntil > Date.now()) {
                  // Ya tiene dot, stackear
                  jugador.dotDamage += effect.damage;
                } else {
                  // Nuevo dot
                  jugador.dotDamage = effect.damage;
                }
                jugador.dotUntil = Date.now() + (effect.duration || 6000);
                jugador.dotType = 'poison';
                jugador.lastDotTime = Date.now();
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
        jugador.speed = Math.max(0, DEFAULT_SPEED * (1 - 0.2)); // 20% slow
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
        jugador.health = 100;
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
      const centerX = 2000 / 2;
      const centerY = 1200 / 2;
      const offset = 200;
      jugadores.forEach((player, i) => {
        if (i === 0) {
          player.x = centerX - offset;
          player.y = centerY;
        } else if (i === 1) {
          player.x = centerX + offset;
          player.y = centerY;
        } else if (i === 2) {
          player.x = centerX;
          player.y = centerY - offset;
        } else if (i === 3) {
          player.x = centerX;
          player.y = centerY + offset;
        } else {
          player.x = centerX;
          player.y = centerY;
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
      if (winner) winner.victories = (winner.victories || 0) + 1;
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
          if (p.nick === winnerNick) exp += extraExp;
          return {
            nick: p.nick,
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            victories: p.victories || 0,
            exp: exp
          };
        });
        io.to(sala.id).emit('gameEnded', { stats: finalStats, winner: winnerNick });
      } else {
        io.to(sala.id).emit('gameStarted', sala);
        // Si es ronda 2, enviar upgrades aleatorias de proyectilQ
        if (sala.round === 2) {
          const proyectilQMejoras = MEJORAS.filter(m => m.proyectilQ);
          function shuffle(array) {
            return array.sort(() => Math.random() - 0.5);
          }
          for (const player of sala.players) {
            const selectedUpgrades = shuffle([...proyectilQMejoras]).slice(0, 3);
            io.to(sala.id).emit('availableUpgrades', { nick: player.nick, upgrades: selectedUpgrades });
          }
        }
        // Si es ronda 3, enviar upgrades de proyectilE
        if (sala.round === 3) {
          const proyectilEMejoras = MEJORAS.filter(m => m.proyectilE);
          function shuffle(array) {
            return array.sort(() => Math.random() - 0.5);
          }
          for (const player of sala.players) {
            const selectedUpgrades = shuffle([...proyectilEMejoras]).slice(0, 3);
            io.to(sala.id).emit('availableUpgrades', { nick: player.nick, upgrades: selectedUpgrades });
          }
        }
        // Si es ronda 4, enviar upgrades de proyectilEspacio
        if (sala.round === 4) {
          const proyectilEspacioMejoras = MEJORAS.filter(m => m.proyectilEspacio);
          function shuffle(array) {
            return array.sort(() => Math.random() - 0.5);
          }
          for (const player of sala.players) {
            const selectedUpgrades = shuffle([...proyectilEspacioMejoras]).slice(0, 3);
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
  db.get('SELECT nick, exp, nivel, gameWins as victories, totalKills, totalDeaths FROM users WHERE nick = ?', [nick], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error de base de datos.' });
    if (!row) return res.status(404).json({ error: 'Jugador no encontrado.' });
    // Si el usuario existe pero no tiene nivel o exp, poner valores por defecto
    if (row.nivel === undefined || row.nivel === null) row.nivel = 1;
    if (row.exp === undefined || row.exp === null) row.exp = 0;
    if (row.victories === undefined || row.victories === null) row.victories = 0;
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

