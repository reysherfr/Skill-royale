const socket = io('https://skill-royale.onrender.com');

const user = JSON.parse(localStorage.getItem('batlesd_user'));
const roomId = localStorage.getItem('batlesd_room_id');
if (!user || !roomId) {
  window.location.href = 'menu.html';
}
// Enviar el nick al backend para identificar el socket (después de inicializar user)
if (user && user.nick) {
  socket.emit('setNick', user.nick);
}
socket.on('playerLeft', (updatedSala) => {
  sala = updatedSala;
  renderSala(sala);
  // Eliminar de players[] si ya no está
  if (sala && sala.players) {
    for (let i = players.length - 1; i >= 0; i--) {
      if (!sala.players.find(p => p.nick === players[i].nick)) {
        players.splice(i, 1);
      }
    }
    drawPlayers();
  }
});

// Escuchar cuando un jugador se une a la sala y actualizar la lista en tiempo real
socket.on('playerJoined', (updatedSala) => {
  sala = updatedSala;
  renderSala(sala);
});

socket.on('playersUpdate', (serverPlayers) => {
  // Si la cantidad de jugadores cambió, actualizar lista y renderizar
  let changed = false;
  if (serverPlayers.length !== players.length) changed = true;
  // Sincronizar vida y posición de cada jugador
  for (const sp of serverPlayers) {
    let local = players.find(p => p.nick === sp.nick);
    if (!local) {
      // Nuevo jugador, agregarlo
      local = new Player({
        ...sp,
        color: sp.nick === user.nick ? '#2a5298' : '#d32f2f',
        isLocal: sp.nick === user.nick
      });
      players.push(local);
      changed = true;
    }
    local.health = sp.health;
    local.x = sp.x;
    local.y = sp.y;
    local.speed = sp.speed;
    local.speedBoostUntil = sp.speedBoostUntil || 0;
    local.defeated = sp.defeated;
    local.mejoras = sp.mejoras || [];
    local.shieldAmount = sp.shieldAmount || 0;
    if (sp.nick === user.nick) {
      mejorasJugador = sp.mejoras || [];
      // Separar mejoras normales de mejoras Q
      const mejorasNormales = mejorasJugador.filter(m => !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio);
      const mejorasQ = mejorasJugador.filter(m => m.proyectilQ);

      // Actualizar mejoraSeleccionada a la última mejora normal
      if (mejorasNormales.length > 0) {
        mejoraSeleccionada = mejorasNormales[mejorasNormales.length - 1];
      }

      // Actualizar mejoraQSeleccionada a la última mejora Q
      if (mejorasQ.length > 0) {
        mejoraQSeleccionada = mejorasQ[mejorasQ.length - 1];
      }
    }
  }
  // Eliminar jugadores que ya no están
  for (let i = players.length - 1; i >= 0; i--) {
    if (!serverPlayers.find(sp => sp.nick === players[i].nick)) {
      players.splice(i, 1);
      changed = true;
    }
  }
  if (changed) {
    renderSala(sala);
    drawPlayers();
  }
});

socket.on('gameStarted', (updatedSala) => {
  sala = updatedSala;
  // Centrar a los jugadores en el mapa (servidor ya lo hace, pero aseguramos aquí)
  if (sala.players.length >= 2) {
    const centerY = MAP_HEIGHT / 2;
    const centerX = MAP_WIDTH / 2;
    sala.players[0].x = centerX - 150;
    sala.players[0].y = centerY;
    sala.players[1].x = centerX + 150;
    sala.players[1].y = centerY;
  }
  // Ocultar completamente la sala
  document.querySelector('.container').style.display = 'none';
  // Mostrar canvas
  const canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  // Inicializar juego
  initGame();
});
let proyectiles = new Map();
let mejoraSeleccionada = null;
let mejorasJugador = []; // Array de mejoras que tiene el jugador
let mejoraQSeleccionada = null; // Mejora especial para la tecla Q
let meteoroAiming = false; // Si está apuntando meteoro
let meteoroAimingAngle = 0;
let cuchillaAiming = false; // Si está apuntando Cuchilla fria
let cuchillaAimingAngle = 0;
let rocaFangosaAiming = false; // Si está apuntando Roca fangosa
let muroPiedraAiming = false; // Si está en modo preview de muro de piedra
let spaceAiming = false; // Si está en modo preview de habilidad espacio
let activeCasts = []; // Array de casts activos: [{ position: {x, y}, startTime, player, mejora }]
let activeMuddyGrounds = []; // Array de suelos fangosos: [{ x, y, radius, duration, createdAt }]
let activeSacredGrounds = []; // Array de suelos sagrados: [{ x, y, radius, duration, createdAt, owner }]
let mostrarSoloProyectilQ = false;
let hudTimer = 15;
let hudInterval = null;
let hudVisible = false;
let hud = null;
let lastTime = 0;
let lastQFireTime = 0;
let mouseX = 0, mouseY = 0;
let currentRound = 1; // Contador de rondas
let roundHUD = null; // HUD del contador de rondas
// --- Configuración del mundo ---
// Verifica si el jugador puede moverse a la posición (x, y) sin colisionar con muros
function puedeMoverJugador(x, y) {
  if (!window.murosDePiedra) return true;
  for (const muro of window.murosDePiedra) {
    if (muro.width && muro.height && typeof muro.angle === 'number') {
      if (colisionJugadorMuro(x, y, muro)) return false;
    }
  }
  return true;
}
// Detección de colisión entre jugador y muro de piedra (óvalo)
function colisionJugadorMuro(playerX, playerY, muro) {
  // Transformar la posición del jugador al sistema local del muro
  const cos = Math.cos(-muro.angle);
  const sin = Math.sin(-muro.angle);
  const relX = playerX - muro.x;
  const relY = playerY - muro.y;
  // Rotar el punto inversamente al ángulo del muro
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;
  // Comprobar si el borde del jugador está dentro del óvalo
  const rx = muro.width + 32; // 32 = radio del jugador
  const ry = muro.height + 32;
  return (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1;
}
const MAP_WIDTH = 2000;
const MAP_HEIGHT = 1200;
const WALL_THICKNESS = 24;
// ...existing code...
import { MEJORAS, Proyectil } from '../backend/mejoras.shared.js';

// Dibuja todos los jugadores en el canvas, con cámara centrada en el jugador local y mundo fijo
function drawPlayers() {
  if (!canvas) return;
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer) return;
  // Cámara centrada en el jugador local
  let offsetX = localPlayer.x - canvas.width / 2;
  let offsetY = localPlayer.y - canvas.height / 2;
  offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
  offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  players.forEach(player => {
    const relativeX = player.x - offsetX;
    const relativeY = player.y - offsetY;
    // Jugadores grandes y circulares
    ctx.beginPath();
    ctx.arc(relativeX, relativeY, 32, 0, 2 * Math.PI); // Radio 32px
    ctx.fillStyle = player.nick === user.nick ? '#2a5298' : '#d32f2f';
    ctx.shadowColor = '#0008';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Borde blanco
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    // Borde azul si tiene escudo
    if (player.shieldAmount > 0) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)'; // skyblue transparente
      ctx.stroke();
    }
    // Borde amarillo si tiene speed boost
    if (player.speedBoostUntil > Date.now()) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // amarillo transparente
      ctx.stroke();
    }
    // Nombre grande y centrado
    ctx.fillStyle = '#222';
    ctx.font = 'bold 20px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.nick, relativeX, relativeY - 40);

    // Barra de vida debajo del nombre
    const barWidth = 64;
    const barHeight = 10;
    const barX = relativeX - barWidth / 2;
    const barY = relativeY - 24;
    // Fondo gris
    ctx.fillStyle = '#bbb';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    // Vida (verde)
    ctx.fillStyle = '#4caf50';
    const vida = Math.max(0, Math.min(player.health ?? 100, 100));
    ctx.fillRect(barX, barY, barWidth * (vida / 100), barHeight);
    // Borde negro
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#222';
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    // Barra de escudo encima si tiene
    if (player.shieldAmount > 0) {
      const shieldWidth = barWidth * (player.shieldAmount / 35);
      ctx.fillStyle = 'rgba(0, 191, 255, 0.7)'; // skyblue transparente
      ctx.fillRect(barX, barY - barHeight - 2, shieldWidth, barHeight);
      ctx.strokeStyle = '#00BFFF';
      ctx.strokeRect(barX, barY - barHeight - 2, barWidth, barHeight);
    }
    // Texto de vida
    ctx.fillStyle = '#222';
    ctx.font = 'bold 12px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${vida}/100`, relativeX, barY + barHeight - 2);
  });
}
import { Player, createPlayersFromSala } from './players.js';


const playersList = document.getElementById('playersList');
const roomInfo = document.getElementById('roomInfo');
const startBtn = document.getElementById('startBtn');

let canvas, ctx;
let players = [];
let explosions = []; // Array para explosiones activas
// Evento para mostrar explosión en el canvas (meteoro, etc)
socket.on('explosion', (data) => {
  // data: { x, y, color, radius, duration }
  explosions.push({
    x: data.x,
    y: data.y,
    color: data.color || '#ff9800',
    radius: data.radius || 80,
    duration: data.duration || 600,
    startTime: Date.now()
  });
});
let sala = null;
let availableUpgrades = null; // Mejoras disponibles para elegir en ronda 1
let movement = { w: false, a: false, s: false, d: false };
let moveInterval = null;
// Interceptar el movimiento para bloquear por colisión con muro
if (moveInterval) clearInterval(moveInterval);
moveInterval = setInterval(() => {
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer || localPlayer.defeated) return;
  let nextX = localPlayer.x;
  let nextY = localPlayer.y;
  const speed = localPlayer.speed || 6;
  let moved = false;
  // Movimiento por eje, deteniendo el input si hay colisión
  if (movement.w) {
    if (puedeMoverJugador(localPlayer.x, localPlayer.y - speed)) {
      nextY -= speed;
      moved = true;
    } else {
      movement.w = false;
    }
  }
  if (movement.s) {
    if (puedeMoverJugador(localPlayer.x, localPlayer.y + speed)) {
      nextY += speed;
      moved = true;
    } else {
      movement.s = false;
    }
  }
  if (movement.a) {
    if (puedeMoverJugador(localPlayer.x - speed, localPlayer.y)) {
      nextX -= speed;
      moved = true;
    } else {
      movement.a = false;
    }
  }
  if (movement.d) {
    if (puedeMoverJugador(localPlayer.x + speed, localPlayer.y)) {
      nextX += speed;
      moved = true;
    } else {
      movement.d = false;
    }
  }
  if (moved) {
    localPlayer.x = Math.max(0, Math.min(nextX, MAP_WIDTH));
    localPlayer.y = Math.max(0, Math.min(nextY, MAP_HEIGHT));
  }
}, 16);
let gameLoopId = null;

// --- Disparo de proyectiles y cooldowns ---
let lastFireTime = 0;


function handleMouseDown(e) {
  if (hudVisible) return; // No disparar si HUD está visible
  if (e.button !== 0) return; // Solo click izquierdo
  // Si el jugador está derrotado, no puede disparar
  let lp = players.find(p => p.nick === user.nick);
  if (lp && lp.defeated) return;
  const now = Date.now();
  if (!mejoraSeleccionada || typeof mejoraSeleccionada.cooldown !== 'number' || mejoraSeleccionada.proyectilQ) {
    console.log('No mejoraSeleccionada válida para click izquierdo', mejoraSeleccionada);
    return;
  }
  if (now - lastFireTime < mejoraSeleccionada.cooldown) {
    console.log('Cooldown activo', {now, lastFireTime, cooldown: mejoraSeleccionada.cooldown});
    return;
  }
  lastFireTime = now;

  // Obtener jugador local
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer || !mejoraSeleccionada) {
    console.log('No localPlayer o mejoraSeleccionada', {localPlayer, mejoraSeleccionada});
    return;
  }

  // Calcular dirección del disparo (hacia el mouse)
  const rect = canvas.getBoundingClientRect();
  let offsetX = localPlayer.x - canvas.width / 2;
  let offsetY = localPlayer.y - canvas.height / 2;
  offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
  offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  const mouseX = e.clientX - rect.left + offsetX;
  const mouseY = e.clientY - rect.top + offsetY;
  const dx = mouseX - localPlayer.x;
  const dy = mouseY - localPlayer.y;
  const angle = Math.atan2(dy, dx);

  // Emitir evento al backend para crear el proyectil
  socket.emit('shootProjectile', {
    roomId,
    x: localPlayer.x,
    y: localPlayer.y,
    angle,
    mejoraId: mejoraSeleccionada.id,
    velocidad: mejoraSeleccionada.velocidad,
    owner: localPlayer.nick
  });
}

canvas?.addEventListener('mousedown', handleMouseDown);

// Si el canvas aún no existe al cargar, agregar el listener tras inicializar
function enableProjectileShooting() {
  if (canvas) canvas.addEventListener('mousedown', handleMouseDown);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
}

function mostrarHUDRondas() {
  // Remover HUD anterior si existe
  if (roundHUD && roundHUD.parentNode) {
    roundHUD.parentNode.removeChild(roundHUD);
  }
  
  // Crear nuevo HUD de rondas
  roundHUD = document.createElement('div');
  roundHUD.id = 'roundHUD';
  roundHUD.style.position = 'fixed';
  roundHUD.style.top = '20px';
  roundHUD.style.left = '50%';
  roundHUD.style.transform = 'translateX(-50%)';
  roundHUD.style.background = 'rgba(0, 0, 0, 0.8)';
  roundHUD.style.color = '#fff';
  roundHUD.style.padding = '10px 20px';
  roundHUD.style.borderRadius = '25px';
  roundHUD.style.fontSize = '24px';
  roundHUD.style.fontWeight = 'bold';
  roundHUD.style.border = '2px solid #fff';
  roundHUD.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
  roundHUD.style.zIndex = '999';
  roundHUD.textContent = `Ronda ${currentRound}`;
  
  document.body.appendChild(roundHUD);
}

function ocultarHUDRondas() {
  if (roundHUD && roundHUD.parentNode) {
    roundHUD.parentNode.removeChild(roundHUD);
    roundHUD = null;
  }
}

// ...existing code...

function mostrarHUDMejoras(soloProyectilQ = false) {
  // Sincronizar mejorasJugador antes de mostrar HUD en ronda 2
  if (soloProyectilQ) {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer && localPlayer.mejoras) {
      mejorasJugador = localPlayer.mejoras;
    }
    mejoraQSeleccionada = null;
  }
  hudVisible = true;
  mejoraSeleccionada = null;
  hudTimer = 4;
  let selectedButton = null; // Para resaltar el botón seleccionado
  // Si ya existe un HUD, elimínalo completamente y limpia el intervalo anterior
  if (hudInterval) {
    clearInterval(hudInterval);
    hudInterval = null;
  }
  if (hud && hud.parentNode) {
    hud.parentNode.removeChild(hud);
    hud = null;
  }
  // Crear nuevo HUD
  hud = document.createElement('div');
  hud.id = 'hudMejoras';
  hud.style.position = 'fixed';
  hud.style.top = '0';
  hud.style.left = '0';
  hud.style.width = '100vw';
  hud.style.height = '100vh';
  hud.style.background = 'rgba(30,30,30,0.85)';
  hud.style.display = 'flex';
  hud.style.flexDirection = 'column';
  hud.style.alignItems = 'center';
  hud.style.justifyContent = 'center';
  hud.style.zIndex = '1000';
  document.body.appendChild(hud);
  hud.innerHTML = `<div style="color:white;font-size:2rem;margin-bottom:24px;">Selecciona tu mejora inicial</div>
    <div id='mejorasBtns' style="display:flex;gap:40px;margin-bottom:32px;"></div>
    <div id='tooltip' style="position:absolute;background:#222;color:#fff;padding:12px;border-radius:8px;border:1px solid #555;font-size:14px;max-width:250px;word-wrap:break-word;display:none;z-index:1001;box-shadow:0 4px 12px rgba(0,0,0,0.5);"></div>
    <div style='color:#fff;font-size:1.5rem;'>Comienza en <span id='hudTimer'>15</span> segundos...</div>`;
  const btns = hud.querySelector('#mejorasBtns');
  const tooltip = hud.querySelector('#tooltip');
  let mejorasToShow;
  if (currentRound === 3) {
    // En ronda 3, mostrar solo habilidades tipo proyectilE que el jugador no tenga
    mejorasToShow = MEJORAS.filter(m => m.proyectilE && !mejorasJugador.find(mj => mj.id === m.id));
  } else if (currentRound === 4) {
    // En ronda 4, mostrar solo habilidades tipo proyectilEspacio que el jugador no tenga
    mejorasToShow = MEJORAS.filter(m => m.proyectilEspacio && !mejorasJugador.find(mj => mj.id === m.id));
  } else {
    mejorasToShow = availableUpgrades ?
      availableUpgrades.filter(m => !mejorasJugador.find(mj => mj.id === m.id)) :
      (soloProyectilQ
        ? MEJORAS.filter(m => m.proyectilQ && !mejorasJugador.find(mj => mj.id === m.id))
        : MEJORAS.filter(m => !m.proyectilQ && !m.proyectilEspacio && m.id !== 'cuchilla_fria_menor' && !mejorasJugador.find(mj => mj.id === m.id))
      );
  }
  console.log('Mejoras to show:', mejorasToShow.length, mejorasToShow.map(m => m.nombre));
  mejorasToShow.forEach(m => {
    const b = document.createElement('button');
    b.textContent = m.nombre;
    b.style.background = m.color;
    b.style.color = '#fff';
    b.style.fontSize = '1.2rem';
    b.style.padding = '18px 32px';
    b.style.border = 'none';
    b.style.borderRadius = '12px';
    b.style.cursor = 'pointer';
    b.style.boxShadow = '0 2px 12px #0008';
    // Usar la descripción de la mejora si existe, si no, mostrar la info básica
    const desc = m.descripcion
      ? m.descripcion
      : `Daño: ${m.danio}<br>Velocidad: ${m.velocidad}`;
    b.onmouseover = (e) => {
      tooltip.innerHTML = desc;
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.pageX + 15}px`;
      tooltip.style.top = `${e.pageY + 15}px`;
    };
    b.onmousemove = (e) => {
      tooltip.style.left = `${e.pageX + 15}px`;
      tooltip.style.top = `${e.pageY + 15}px`;
    };
    b.onmouseout = () => {
      tooltip.style.display = 'none';
    };
    b.onclick = () => {
      // Quitar resaltado del botón anterior si existe
      if (selectedButton) {
        selectedButton.style.border = 'none';
      }
      // Seleccionar nueva mejora y resaltar botón
      if (soloProyectilQ) {
        mejoraQSeleccionada = m;
      } else if (!m.proyectilEspacio) {
        mejoraSeleccionada = m;
      }
      selectedButton = b;
      b.style.border = '3px solid #ffd700'; // Borde dorado para resaltar
      // Eliminar todos los botones excepto el seleccionado
      Array.from(btns.children).forEach(btn => {
        if (btn !== b) btn.remove();
      });
      // Deshabilitar el botón seleccionado
      b.disabled = true;
      b.style.opacity = '1';
      b.style.cursor = 'not-allowed';
      // Enviar la mejora seleccionada al backend inmediatamente
      if (soloProyectilQ) {
        socket.emit('selectUpgrade', {
          roomId,
          mejoraId: m.id,
          proyectilQ: true
        });
      } else {
        socket.emit('selectUpgrade', {
          roomId,
          mejoraId: m.id
        });
      }
      // El HUD permanece visible hasta que termine el timer
    };
    btns.appendChild(b);
  });
  hudInterval = setInterval(() => {
    hudTimer--;
    hud.querySelector('#hudTimer').textContent = hudTimer;
    if (hudTimer <= 0) {
      clearInterval(hudInterval);
      if (hud && hud.parentNode) {
        hud.parentNode.removeChild(hud);
      }
      hudVisible = false;
      // Si no se seleccionó nada, elegir una mejora al azar
      let mejoraFinal;
      const mejorasDisponibles = soloProyectilQ ?
        MEJORAS.filter(m => m.proyectilQ && !mejorasJugador.find(mj => mj.id === m.id)) :
        MEJORAS.filter(m => !m.proyectilQ && m.id !== 'cuchilla_fria_menor' && !mejorasJugador.find(mj => mj.id === m.id));
      if (soloProyectilQ) {
        mejoraFinal = mejoraQSeleccionada;
        if (!mejoraFinal && mejorasDisponibles.length > 0) {
          // Elegir una mejora Q al azar
          const idx = Math.floor(Math.random() * mejorasDisponibles.length);
          mejoraFinal = mejorasDisponibles[idx];
        }
        if (mejoraFinal) {
          socket.emit('selectUpgrade', {
            roomId,
            mejoraId: mejoraFinal.id,
            proyectilQ: true
          });
        }
      } else {
        mejoraFinal = mejoraSeleccionada;
        if (!mejoraFinal && mejorasDisponibles.length > 0) {
          // Elegir una mejora normal al azar
          const idx = Math.floor(Math.random() * mejorasDisponibles.length);
          mejoraFinal = mejorasDisponibles[idx];
        }
        if (mejoraFinal) {
          socket.emit('selectUpgrade', {
            roomId,
            mejoraId: mejoraFinal.id
          });
        }
      }
      // Resetear para la siguiente ronda (siempre Round 1 con mejoras normales)
      mostrarSoloProyectilQ = false;
      // Iniciar combate
      iniciarCombate();
    }
  }, 1000);
}

function iniciarCombate() {
  // Aquí puedes activar controles, proyectiles, etc.
  // Por ahora solo muestra el canvas y permite jugar
  document.getElementById('gameCanvas').focus();
  enableProjectileShooting();
}

function initGame() {
  // Limpiar intervalos anteriores para evitar acumulación
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  // Mostrar HUD de selección de mejora solo si NO es reinicio de ronda
  if (!mostrarSoloProyectilQ) {
    mostrarHUDMejoras(false);
  }
  // No resetear mostrarSoloProyectilQ aquí, mantener el estado de la ronda
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  mostrarHUDRondas();
  // Crear jugadores usando la clase Player
  players = createPlayersFromSala(sala, user.nick);
  // Centrar a los dos primeros jugadores en el centro del mapa, uno a la izquierda y otro a la derecha
  if (players.length >= 2) {
    const centerY = MAP_HEIGHT / 2;
    const centerX = MAP_WIDTH / 2;
    players[0].x = centerX - 150;
    players[0].y = centerY;
    players[1].x = centerX + 150;
    players[1].y = centerY;
  }
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    // Cambiar cursor si está apuntando Roca fangosa
    if (rocaFangosaAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Roca fangosa') {
      canvas.style.cursor = 'none'; // Ocultar cursor normal
    } else {
      canvas.style.cursor = 'default';
    }
  });
  moveInterval = setInterval(updateMovement, 1000 / 60); // Solo movimiento
  function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    // Actualizar proyectiles
    for (let p of proyectiles.values()) {
      p.update(16);
    }
    // Actualizar explosiones
    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      if (Date.now() - exp.startTime > exp.duration) {
        explosions.splice(i, 1);
      }
    }
    drawMap();
    drawPlayers();
    gameLoopId = requestAnimationFrame(gameLoop);
  }
  gameLoopId = requestAnimationFrame(gameLoop);
  window.addEventListener('resize', () => {
    resizeCanvas();
    // drawMap();
    // drawPlayers();
  });
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Cámara centrada en el jugador local
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    // Limitar cámara para no mostrar fuera del mapa
    offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
    offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  }
  // Fondo gris liso del mundo
  ctx.fillStyle = '#888';
  ctx.fillRect(-offsetX, -offsetY, MAP_WIDTH, MAP_HEIGHT);

  // Renderizar muros de piedra
  dibujarMurosDePiedra(ctx, offsetX, offsetY);

  // Previsualización de muro de piedra
  if (muroPiedraAiming) {
    const muroMejora = mejorasJugador.find(m => m.id === 'muro_piedra');
    const localPlayer = players.find(p => p.nick === user.nick);
    if (muroMejora && localPlayer) {
      // Círculo de rango máximo
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, muroMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Muro en el mouse
      let offsetMouseX = mouseX;
      let offsetMouseY = mouseY;
      // Limitar a rango máximo
      const dx = offsetMouseX - centerX;
      const dy = offsetMouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > muroMejora.maxRange) {
        const angulo = Math.atan2(dy, dx);
        offsetMouseX = centerX + Math.cos(angulo) * muroMejora.maxRange;
        offsetMouseY = centerY + Math.sin(angulo) * muroMejora.maxRange;
      }
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = muroMejora.color;
      if (muroMejora.width && muroMejora.height) {
  // Calcular ángulo real entre jugador y mouse
  const dx = offsetMouseX - centerX;
  const dy = offsetMouseY - centerY;
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  // Guardar el ángulo y posiciones en la mejora para el cast
  muroMejora.lastCastAngle = angle;
  muroMejora.lastCastCenter = { x: centerX, y: centerY };
  muroMejora.lastCastTarget = { x: offsetMouseX, y: offsetMouseY };
  // El muro debe estar perpendicular a la dirección apuntada
  ctx.translate(offsetMouseX, offsetMouseY);
  ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          muroMejora.width,
          muroMejora.height,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      } else {
        ctx.fillRect(offsetMouseX - muroMejora.radius, offsetMouseY - muroMejora.radius, muroMejora.radius * 2, muroMejora.radius * 2);
      }
      ctx.restore();
    }
  }

  // Preview de teleport
  if (spaceAiming) {
    const spaceMejora = mejorasJugador.find(m => m.proyectilEspacio);
    const localPlayer = players.find(p => p.nick === user.nick);
    if (spaceMejora && localPlayer) {
      // Círculo de rango máximo alrededor del jugador
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = spaceMejora.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, spaceMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Punto de destino o línea de trayectoria
      let targetX = mouseX;
      let targetY = mouseY;
      const dx = targetX - centerX;
      const dy = targetY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > spaceMejora.maxRange) {
        const angulo = Math.atan2(dy, dx);
        targetX = centerX + Math.cos(angulo) * spaceMejora.maxRange;
        targetY = centerY + Math.sin(angulo) * spaceMejora.maxRange;
      }
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = spaceMejora.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.fillStyle = spaceMejora.color;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }

  // Renderizar proyectiles (solo dibujar, no actualizar)
  for (let p of proyectiles.values()) {
    p.draw(ctx, offsetX, offsetY);
    // Eliminar si sale del mapa (opcional, pero el backend ya lo hace)
    if (
      p.x < 0 || p.x > MAP_WIDTH ||
      p.y < 0 || p.y > MAP_HEIGHT ||
      !p.activo
    ) {
      proyectiles.delete(p.id);
    }
  }

  // Dibujar explosiones
  for (const exp of explosions) {
    const elapsed = Date.now() - exp.startTime;
    const progress = Math.min(elapsed / exp.duration, 1);
    const currentRadius = exp.radius * progress;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(exp.x - offsetX, exp.y - offsetY, currentRadius, 0, 2 * Math.PI);
    ctx.fillStyle = exp.color;
    ctx.fill();
    ctx.restore();
  }

  // Si está apuntando meteoro, dibujar línea azul de rango
  if (meteoroAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Meteoro') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 500;
      const startX = localPlayer.x - offsetX;
      const startY = localPlayer.y - offsetY;
      // Calcular ángulo hacia mouse
      const mouseWorldX = mouseX + offsetX;
      const mouseWorldY = mouseY + offsetY;
      const dx = mouseWorldX - localPlayer.x;
      const dy = mouseWorldY - localPlayer.y;
      const angle = Math.atan2(dy, dx);
      meteoroAimingAngle = angle;
      // Calcular punto final
      const endX = startX + Math.cos(angle) * aimingRange;
      const endY = startY + Math.sin(angle) * aimingRange;
      ctx.save();
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
      // Opcional: dibujar círculo al final
      ctx.save();
      ctx.beginPath();
      ctx.arc(endX, endY, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está apuntando Roca fangosa, dibujar círculo de rango
  if (rocaFangosaAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Roca fangosa') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 800;
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = 'saddlebrown';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]); // Línea punteada
      ctx.beginPath();
      ctx.arc(centerX, centerY, aimingRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]); // Resetear
      ctx.restore();
      // Dibujar círculo en la posición del mouse
      ctx.save();
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, mejoraQSeleccionada.radius || 20, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Azul transparente
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está apuntando Cuchilla fria, dibujar línea y las 3 trayectorias menores
  if (cuchillaAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Cuchilla fria') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 350;
      const startX = localPlayer.x - offsetX;
      const startY = localPlayer.y - offsetY;
      const mouseWorldX = mouseX + offsetX;
      const mouseWorldY = mouseY + offsetY;
      const dx = mouseWorldX - localPlayer.x;
      const dy = mouseWorldY - localPlayer.y;
      const angle = Math.atan2(dy, dx);
      cuchillaAimingAngle = angle;
      // Trayectoria principal
      const endX = startX + Math.cos(angle) * aimingRange;
      const endY = startY + Math.sin(angle) * aimingRange;
      ctx.save();
      ctx.strokeStyle = '#00cfff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
      // Trayectorias menores (cono)
      // Obtener el rango de cuchilla menor desde MEJORAS
      const cuchillaMenor = MEJORAS.find(m => m.id === 'cuchilla_fria_menor');
      const menorRange = cuchillaMenor && cuchillaMenor.maxRange ? cuchillaMenor.maxRange : 200;
      const angles = [angle + Math.PI/6, angle, angle - Math.PI/6];
      for (const ang of angles) {
        const minorEndX = endX + Math.cos(ang) * menorRange;
        const minorEndY = endY + Math.sin(ang) * menorRange;
        ctx.save();
        ctx.strokeStyle = '#00cfff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(minorEndX, minorEndY);
        ctx.stroke();
        ctx.restore();
        // Opcional: dibujar círculo al final de cada trayecto menor
        ctx.save();
        ctx.beginPath();
        ctx.arc(minorEndX, minorEndY, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00cfff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      // Círculo al final de la principal
      ctx.save();
      ctx.beginPath();
      ctx.arc(endX, endY, 14, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00cfff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está casteando Roca fangosa, dibujar círculos de cast que se llenan
  for (let i = activeCasts.length - 1; i >= 0; i--) {
    const cast = activeCasts[i];
    const now = Date.now();
    const elapsed = now - cast.startTime;
    const castTime = cast.mejora && cast.mejora.castTime ? cast.mejora.castTime : 1500;
    const progress = Math.min(elapsed / castTime, 1);
    const castX = cast.position.x - offsetX;
    const castY = cast.position.y - offsetY;
    const radius = cast.mejora.radius || 20;
    if (cast.mejora.id === 'muro_piedra') {
      // Usar el ángulo guardado en la mejora para el muro de carga
      let angle = cast.mejora.lastCastAngle !== undefined ? cast.mejora.lastCastAngle : 0;
      // Dibujar óvalo de fondo
      ctx.save();
      ctx.strokeStyle = cast.mejora.color;
      ctx.lineWidth = 3;
      if (cast.mejora.width && cast.mejora.height) {
        ctx.translate(castX, castY);
  ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          cast.mejora.width,
          cast.mejora.height,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        ctx.strokeRect(castX - radius, castY - radius, radius * 2, radius * 2);
      }
      ctx.restore();
      // Óvalo de progreso (relleno)
      ctx.save();
      ctx.fillStyle = 'rgba(139, 69, 43, 0.5)'; // color similar al muro
      if (cast.mejora.width && cast.mejora.height) {
        ctx.translate(castX, castY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          cast.mejora.width * progress,
          cast.mejora.height * progress,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        ctx.fillRect(castX - radius, castY - radius, radius * 2 * progress, radius * 2);
      }
      ctx.restore();
    } else {
      // Círculo de fondo
      ctx.save();
      ctx.beginPath();
      ctx.arc(castX, castY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'saddlebrown';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // Círculo de progreso (relleno)
      ctx.save();
      ctx.beginPath();
      ctx.arc(castX, castY, radius * progress, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(139, 69, 19, 0.5)'; // saddlebrown con alpha
      ctx.fill();
      ctx.restore();
    }
    // Si terminó el cast, emitir proyectil o colocar muro (solo si es el cast del jugador local)
    if (progress >= 1) {
      if (cast.player === user.nick) {
        if (cast.mejora.id === 'muro_piedra') {
          // Emitir para que el backend cree el muro
          const localPlayer = players.find(p => p.nick === user.nick);
          if (localPlayer) {
            socket.emit('shootProjectile', {
              roomId,
              x: localPlayer.x,
              y: localPlayer.y,
              angle: 0,
              mejoraId: cast.mejora.id,
              velocidad: cast.mejora.velocidad,
              owner: cast.player,
              targetX: cast.position.x,
              targetY: cast.position.y,
              skillShot: true
            });
          }
        } else {
          const localPlayer = players.find(p => p.nick === user.nick);
          if (localPlayer) {
            socket.emit('shootProjectile', {
              roomId,
              x: localPlayer.x,
              y: localPlayer.y,
              angle: 0, // No importa para skyfall
              mejoraId: cast.mejora.id,
              velocidad: cast.mejora.velocidad,
              owner: cast.player,
              targetX: cast.position.x,
              targetY: cast.position.y,
              skillShot: true,
              skyfall: true
            });
          }
        }
      }
      // Remover el cast para todos
      activeCasts.splice(i, 1);
    }
  }

  // Dibujar suelos fangosos
  const now = Date.now();
  for (let i = activeMuddyGrounds.length - 1; i >= 0; i--) {
    const muddy = activeMuddyGrounds[i];
    const elapsed = now - muddy.createdAt;
    if (elapsed >= muddy.duration) {
      activeMuddyGrounds.splice(i, 1);
      continue;
    }
    const muddyX = muddy.x - offsetX;
    const muddyY = muddy.y - offsetY;
    ctx.save();
    ctx.beginPath();
    ctx.arc(muddyX, muddyY, muddy.radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)'; // brown with alpha
    ctx.fill();
    ctx.strokeStyle = 'saddlebrown';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Dibujar suelos sagrados
  for (let i = activeSacredGrounds.length - 1; i >= 0; i--) {
    const sacred = activeSacredGrounds[i];
    const elapsed = now - sacred.createdAt;
    if (elapsed >= sacred.duration) {
      activeSacredGrounds.splice(i, 1);
      continue;
    }
    const sacredX = sacred.x - offsetX;
    const sacredY = sacred.y - offsetY;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sacredX, sacredY, sacred.radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(182, 227, 162, 0.3)'; // verde claro con alpha
    ctx.fill();
    ctx.strokeStyle = '#b6e3a2';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Muros negros en los bordes del mundo
  ctx.fillStyle = '#111';
  // Arriba
  ctx.fillRect(-offsetX, -offsetY, MAP_WIDTH, WALL_THICKNESS);
  // Abajo
  ctx.fillRect(-offsetX, MAP_HEIGHT - WALL_THICKNESS - offsetY, MAP_WIDTH, WALL_THICKNESS);
  // Izquierda
  ctx.fillRect(-offsetX, -offsetY, WALL_THICKNESS, MAP_HEIGHT);
  // Derecha
  ctx.fillRect(MAP_WIDTH - WALL_THICKNESS - offsetX, -offsetY, WALL_THICKNESS, MAP_HEIGHT);

  // Rocas en posiciones absolutas del mundo
  const rocks = [
    { x: 120, y: 180, r: 22 },
    { x: 400, y: 100, r: 18 },
    { x: MAP_WIDTH - 150, y: MAP_HEIGHT - 200, r: 28 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, r: 25 },
    { x: MAP_WIDTH - 80, y: 90, r: 15 },
    { x: 80, y: MAP_HEIGHT - 120, r: 20 }
  ];
  for (const rock of rocks) {
    drawRock(rock.x - offsetX, rock.y - offsetY, rock.r);
  }
}

// Dibuja una roca simple en (x, y) with radio r
function drawRock(x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = '#bbb';
  ctx.shadowColor = '#666';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#888';
  ctx.stroke();
  // Detalles de la roca
  ctx.beginPath();
  ctx.arc(x - r/3, y - r/4, r/4, 0, Math.PI * 2);
  ctx.fillStyle = '#a0a0a0';
  ctx.fill();
  ctx.restore();
}



function handleKeyDown(e) {
    if (hudVisible) return; // No permitir lanzar habilidades si HUD está activo
    const key = e.key.toLowerCase();
    if (movement.hasOwnProperty(key)) {
      movement[key] = true;
    }
    // Habilidad tipo proyectilE: activación según activacionRapida
    if (key === 'e') {
      // Buscar mejora tipo proyectilE que tenga el jugador
      const mejoraE = mejorasJugador.find(m => m.proyectilE);
      if (!mejoraE) return;
      const localPlayer = players.find(p => p.nick === user.nick);
      if (!localPlayer) return;
      let offsetX = localPlayer.x - canvas.width / 2;
      let offsetY = localPlayer.y - canvas.height / 2;
      offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
      offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
      if (mejoraE.activacionRapida) {
        // Fastcast: activar directamente debajo del jugador
        const now = Date.now();
        if (window[mejoraE.id + 'Cooldown'] && now - window[mejoraE.id + 'Cooldown'] < mejoraE.cooldown) return;
        window[mejoraE.id + 'Cooldown'] = now;
        socket.emit('shootProjectile', {
          roomId,
          x: localPlayer.x,
          y: localPlayer.y,
          angle: 0,
          mejoraId: mejoraE.id,
          velocidad: mejoraE.velocidad,
          owner: user.nick,
          targetX: localPlayer.x,
          targetY: localPlayer.y,
          skillShot: false
        });
      } else {
        // Requiere previsualización: usar aiming
        if (mejoraE.id === 'muro_piedra') {
          if (!muroPiedraAiming) {
            muroPiedraAiming = true;
            canvas.style.cursor = 'none';
          } else {
            const now = Date.now();
            if (window.muroDePiedraCooldown && now - window.muroDePiedraCooldown < mejoraE.cooldown) return;
            window.muroDePiedraCooldown = now;
            const targetX = mouseX + offsetX;
            const targetY = mouseY + offsetY;
            const dx = targetX - localPlayer.x;
            const dy = targetY - localPlayer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let muroX = targetX;
            let muroY = targetY;
            if (dist > mejoraE.maxRange) {
              const angulo = Math.atan2(dy, dx);
              muroX = localPlayer.x + Math.cos(angulo) * mejoraE.maxRange;
              muroY = localPlayer.y + Math.sin(angulo) * mejoraE.maxRange;
            }
            // Iniciar cast en lugar de colocar muro inmediatamente
            socket.emit('startCast', {
              roomId,
              position: { x: muroX, y: muroY },
              startTime: now,
              player: user.nick,
              mejora: mejoraE
            });
            muroPiedraAiming = false;
            canvas.style.cursor = 'default';
          }
        }
      }
    }
    // Habilidad tipo proyectilEspacio: teleport o impulso_electrico
    if (key === ' ') {
      const mejoraEspacio = mejorasJugador.find(m => m.proyectilEspacio);
      if (!mejoraEspacio) return;
      const localPlayer = players.find(p => p.nick === user.nick);
      if (!localPlayer) return;
      if (mejoraEspacio.activacionRapida) {
        // Fastcast: activar directamente
        const now = Date.now();
        if (window[mejoraEspacio.id + 'Cooldown'] && now - window[mejoraEspacio.id + 'Cooldown'] < mejoraEspacio.cooldown) return;
        window[mejoraEspacio.id + 'Cooldown'] = now;
        socket.emit('activateAbility', {
          roomId,
          mejoraId: mejoraEspacio.id,
          owner: user.nick
        });
      } else {
        // Requiere apuntar: teleport or embestida
        if (!spaceAiming) {
          spaceAiming = true;
          canvas.style.cursor = 'none';
        } else {
          const now = Date.now();
          if (window.teleportCooldown && now - window.teleportCooldown < mejoraEspacio.cooldown) return;
          window.teleportCooldown = now;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
          offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
          let targetX = mouseX + offsetX;
          let targetY = mouseY + offsetY;
          const dx = targetX - localPlayer.x;
          const dy = targetY - localPlayer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > mejoraEspacio.maxRange) {
            const angulo = Math.atan2(dy, dx);
            targetX = localPlayer.x + Math.cos(angulo) * mejoraEspacio.maxRange;
            targetY = localPlayer.y + Math.sin(angulo) * mejoraEspacio.maxRange;
          }
          // Emitir evento de teleport or dash
          if (mejoraEspacio.id === 'embestida') {
            socket.emit('dashPlayer', {
              roomId,
              targetX,
              targetY,
              owner: user.nick
            });
          } else {
            socket.emit('teleportPlayer', {
              roomId,
              targetX,
              targetY,
              owner: user.nick
            });
          }
          spaceAiming = false;
          canvas.style.cursor = 'default';
        }
      }
    }
  // Preview de muro de piedra
  if (muroPiedraAiming) {
    const muroMejora = mejorasJugador.find(m => m.id === 'muro_piedra');
    const localPlayer = players.find(p => p.nick === user.nick);
    if (muroMejora && localPlayer) {
      // Calcular offsetX y offsetY igual que en handleKeyDown
      let offsetX = localPlayer.x - canvas.width / 2;
      let offsetY = localPlayer.y - canvas.height / 2;
      offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
      offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
      // Círculo de rango máximo
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, muroMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Muro en el mouse
      let offsetMouseX = mouseX;
      let offsetMouseY = mouseY;
      // Limitar a rango máximo
      const dx = offsetMouseX - centerX;
      const dy = offsetMouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > muroMejora.maxRange) {
        const angulo = Math.atan2(dy, dx);
        offsetMouseX = centerX + Math.cos(angulo) * muroMejora.maxRange;
        offsetMouseY = centerY + Math.sin(angulo) * muroMejora.maxRange;
      }
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = muroMejora.color;
      if (muroMejora.width && muroMejora.height) {
        // Calcular ángulo real entre jugador y mouse
        const dx = offsetMouseX - centerX;
        const dy = offsetMouseY - centerY;
        // El muro debe estar perpendicular a la dirección apuntada
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        ctx.translate(offsetMouseX, offsetMouseY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          muroMejora.width,
          muroMejora.height,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      } else {
        ctx.fillRect(offsetMouseX - muroMejora.radius, offsetMouseY - muroMejora.radius, muroMejora.radius * 2, muroMejora.radius * 2);
      }
      ctx.restore();
    }
  }
    if (key === 'q') {
      if (!mejoraQSeleccionada) return;
      if (mejoraQSeleccionada.nombre === 'Meteoro') {
        const aimingRange = mejoraQSeleccionada.aimRange || 500;
        if (!meteoroAiming) {
          meteoroAiming = true;
        } else {
          meteoroAiming = false;
          const now = Date.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          lastQFireTime = now;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
          offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
          const endX = localPlayer.x + Math.cos(meteoroAimingAngle) * aimingRange;
          const endY = localPlayer.y + Math.sin(meteoroAimingAngle) * aimingRange;
          socket.emit('shootProjectile', {
            roomId,
            x: localPlayer.x,
            y: localPlayer.y,
            angle: meteoroAimingAngle,
            mejoraId: mejoraQSeleccionada.id,
            velocidad: mejoraQSeleccionada.velocidad,
            owner: localPlayer.nick,
            targetX: endX,
            targetY: endY,
            skillShot: true
          });
        }
      } else if (mejoraQSeleccionada.nombre === 'Cuchilla fria') {
        const aimingRange = mejoraQSeleccionada.aimRange || 350;
        if (!cuchillaAiming) {
          cuchillaAiming = true;
        } else {
          cuchillaAiming = false;
          const now = Date.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          lastQFireTime = now;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
          offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
          const endX = localPlayer.x + Math.cos(cuchillaAimingAngle) * aimingRange;
          const endY = localPlayer.y + Math.sin(cuchillaAimingAngle) * aimingRange;
          socket.emit('shootProjectile', {
            roomId,
            x: localPlayer.x,
            y: localPlayer.y,
            angle: cuchillaAimingAngle,
            mejoraId: mejoraQSeleccionada.id,
            velocidad: mejoraQSeleccionada.velocidad,
            owner: localPlayer.nick,
            targetX: endX,
            targetY: endY,
            skillShot: true
          });
        }
      } else if (mejoraQSeleccionada.nombre === 'Roca fangosa') {
        if (!rocaFangosaAiming) {
          rocaFangosaAiming = true;
        } else {
          // Empezar cast
          rocaFangosaAiming = false;
          const now = Date.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
          offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
          const targetX = mouseX + offsetX;
          const targetY = mouseY + offsetY;
          const dx = targetX - localPlayer.x;
          const dy = targetY - localPlayer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > mejoraQSeleccionada.aimRange) return; // Fuera de rango
          lastQFireTime = now; // Iniciar cooldown al empezar cast
          // Enviar evento al servidor para sincronizar
          socket.emit('startCast', {
            roomId,
            position: { x: targetX, y: targetY },
            startTime: now,
            player: user.nick,
            mejora: mejoraQSeleccionada
          });
        }
      } else {
        // Otras mejoras Q: disparo normal
        const now = Date.now();
        if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
        lastQFireTime = now;
        const localPlayer = players.find(p => p.nick === user.nick);
        if (!localPlayer) return;
        let offsetX = localPlayer.x - canvas.width / 2;
        let offsetY = localPlayer.y - canvas.height / 2;
        offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
        offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
        const targetX = mouseX + offsetX;
        const targetY = mouseY + offsetY;
        const dx = targetX - localPlayer.x;
        const dy = targetY - localPlayer.y;
        const angle = Math.atan2(dy, dx);
        socket.emit('shootProjectile', {
          roomId,
          x: localPlayer.x,
          y: localPlayer.y,
          angle,
          mejoraId: mejoraQSeleccionada.id,
          velocidad: mejoraQSeleccionada.velocidad,
          owner: localPlayer.nick
        });
      }
    }
    if (key === 'm') {
      // Cheat para pruebas: reducir 100 vida al rival
      const rival = players.find(p => p.nick !== user.nick);
      if (rival) {
        socket.emit('cheatDamage', { roomId, targetNick: rival.nick, damage: 100 });
      }
    }
}
// Renderizado de muros de piedra
function dibujarMurosDePiedra(ctx, offsetX, offsetY) {
  if (!window.murosDePiedra) return;
  const ahora = Date.now();
  window.murosDePiedra = window.murosDePiedra.filter(muro => ahora - muro.creado < muro.duracion);
  window.murosDePiedra.forEach(muro => {
    ctx.save();
    ctx.fillStyle = muro.color;
    if (muro.width && muro.height && typeof muro.angle === 'number') {
      ctx.translate(muro.x - offsetX, muro.y - offsetY);
      ctx.rotate(muro.angle);
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        muro.width,
        muro.height,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.fillRect(muro.x - offsetX - muro.radius, muro.y - offsetY - muro.radius, muro.radius * 2, muro.radius * 2);
    }
    ctx.restore();
  });
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  if (movement.hasOwnProperty(key)) {
    movement[key] = false;
  }
}

function updateMovement() {
  const player = players.find(p => p.nick === user.nick);
  if (!player) return;
  if (player.defeated) return; // No mover si está derrotado
  if (hudVisible) return; // No mover si HUD está visible
  let dx = 0, dy = 0;
  if (movement.w) dy -= 1;
  if (movement.s) dy += 1;
  if (movement.a) dx -= 1;
  if (movement.d) dx += 1;
  if (dx !== 0 || dy !== 0) {
    // Normalizar para que la diagonal no sea más rápida
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    // Colisión con muros (bordes del mundo)
    const radius = 32;
    let newX = player.x + dx * player.speed;
    let newY = player.y + dy * player.speed;
    const minX = WALL_THICKNESS + radius;
    const minY = WALL_THICKNESS + radius;
    const maxX = MAP_WIDTH - WALL_THICKNESS - radius;
    const maxY = MAP_HEIGHT - WALL_THICKNESS - radius;
    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;
    player.x = newX;
    player.y = newY;
    // Enviar nueva posición al servidor
    socket.emit('movePlayer', { roomId, nick: user.nick, x: player.x, y: player.y });
  }
  // Eventos de red y renderSala deben ir fuera de este ciclo si es posible
}
socket.on('gameStarted', (updatedSala) => {
  sala = updatedSala;
  // Ocultar completamente la sala
  document.querySelector('.container').style.display = 'none';
  // Mostrar canvas
  const canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  // Inicializar juego
  initGame();
});
socket.on('playerMoved', (data) => {
  const { nick, x, y } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    player.x = x;
    player.y = y;
    drawMap();
    drawPlayers();
  }
});

// Recibir estado de proyectiles del backend
socket.on('proyectilesUpdate', (proys) => {
  // Actualizar targets de proyectiles existentes, o crear nuevos
  const receivedIds = new Set();
  for (let pData of proys) {
    receivedIds.add(pData.id);
    if (proyectiles.has(pData.id)) {
      // Actualizar target
      const p = proyectiles.get(pData.id);
      p.setTarget(pData.x, pData.y);
    } else {
      // Crear nuevo
      const mejora = MEJORAS.find(m => m.id === pData.mejoraId);
      const newP = new Proyectil({
        x: pData.x,
        y: pData.y,
        angle: pData.angle,
        mejora,
        owner: pData.owner,
        id: pData.id
      });
      proyectiles.set(pData.id, newP);
    }
  }
  // Eliminar proyectiles que ya no existen en el servidor
  for (let [id, p] of proyectiles) {
    if (!receivedIds.has(id)) {
      proyectiles.delete(id);
    }
  }
});

// Recibir actualización de vida de los jugadores
socket.on('playersUpdate', (serverPlayers) => {
  // Sincronizar vida y posición de cada jugador
  for (const sp of serverPlayers) {
    const local = players.find(p => p.nick === sp.nick);
    if (local) {
      local.health = sp.health;
      local.x = sp.x;
      local.y = sp.y;
      local.speed = sp.speed;
    }
  }
});

function renderSala(sala) {
  if (!sala) {
    roomInfo.textContent = 'La sala ya no existe.';
    playersList.innerHTML = '';
    startBtn.style.display = 'none';
    return;
  }
  roomInfo.innerHTML = `<strong>Host:</strong> ${sala.host.nick}`;
  playersList.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    if (sala.players[i]) {
      const nivel = sala.players[i].nivel || 1;
      playersList.innerHTML += `<div style="margin-bottom:10px; padding:8px; border-radius:8px; background:#f0f4fa; display:flex; align-items:center; gap:10px;">
        <strong>${sala.players[i].nick}</strong>
        <img src="../ranks/${nivel}.png" alt="Rango ${nivel}" style="width:32px; height:32px; vertical-align:middle;">
      </div>`;
    } else {
      playersList.innerHTML += `<div style="margin-bottom:10px; padding:8px; border-radius:8px; background:#f8f8f8; color:#b0c4de;">Vacante</div>`;
    }
  }
  if (user.nick === sala.host.nick) {
    startBtn.style.display = 'inline-block';
  } else {
    startBtn.style.display = 'none';
  }
}

async function cargarSala() {
  // Resetear estado de rondas al cargar sala (siempre empezar con Round 1)
  mostrarSoloProyectilQ = false;
  currentRound = 1;
  // No mostrar HUD de rondas aquí, solo cuando se inicie la partida
  try {
  const res = await fetch('https://skill-royale.onrender.com/rooms');
    const data = await res.json();
    if (data.success) {
      sala = data.salas.find(s => s.id === roomId);
      renderSala(sala);
      if (sala) {
        // Unirse a la sala de sockets
        socket.emit('joinRoom', roomId);
      }
    }
  } catch (err) {
    roomInfo.textContent = 'Error al conectar al servidor.';
    playersList.innerHTML = '';
  }
}

cargarSala();

// Botón iniciar
startBtn.addEventListener('click', () => {
  socket.emit('startGame', { roomId, nick: user.nick });
});

// Botón salir
document.getElementById('exitBtn').addEventListener('click', () => {
  if (sala && user.nick === sala.host.nick) {
    // Eliminar la sala en el backend
  fetch('https://skill-royale.onrender.com/delete-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId })
    }).then(() => {
      localStorage.removeItem('batlesd_room_id');
      window.location.href = 'menu.html';
    });
  } else {
    // Eliminar jugador de la sala en el backend
  fetch('https://skill-royale.onrender.com/leave-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId, nick: user.nick })
    }).then(() => {
      localStorage.removeItem('batlesd_room_id');
      window.location.href = 'menu.html';
    });
  }
});

socket.on('damageEvent', (data) => {
  showDamageNumber(data);
});

socket.on('healEvent', (data) => {
  showHealNumber(data);
});

socket.on('shieldApplied', (data) => {
  // Actualizar el escudo del jugador
  const player = players.find(p => p.nick === data.nick);
  if (player) {
    player.shieldAmount = data.shieldAmount;
    player.shieldUntil = Date.now() + data.duration;
  }
});

socket.on('shieldDamage', (data) => {
  // Mostrar daño absorbido por escudo
  showShieldAbsorbed(data);
});

socket.on('shieldDamage', (data) => {
  showShieldAbsorbed(data);
});

socket.on('availableUpgrades', (data) => {
  if (data.nick === user.nick) {
    availableUpgrades = data.upgrades;
    console.log('Available upgrades received:', availableUpgrades.length, availableUpgrades.map(m => m.nombre));
    mostrarHUDMejoras();
  }
});

function showDamageNumber({ target, amount, type }) {
  const player = players.find(p => p.nick === target);
  if (!player || !canvas) return;
  // Calcular posición en pantalla
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
    offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  }
  const screenX = player.x - offsetX;
  const screenY = player.y - offsetY - 40; // Arriba del jugador
  // Crear elemento de texto
  const textDiv = document.createElement('div');
  textDiv.textContent = `-${amount}`;
  textDiv.style.position = 'absolute';
  textDiv.style.left = `${screenX}px`;
  textDiv.style.top = `${screenY}px`;
  textDiv.style.color = type === 'dot_fire' ? 'orange' : type === 'dot_poison' ? 'limegreen' : 'black';
  textDiv.style.fontSize = '20px';
  textDiv.style.fontWeight = 'bold';
  textDiv.style.pointerEvents = 'none';
  textDiv.style.zIndex = '2000';
  textDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  document.body.appendChild(textDiv);
  // Animar hacia arriba y desvanecer
  let opacity = 1;
  let yPos = screenY;
  const animate = () => {
    yPos -= 1;
    opacity -= 0.02;
    textDiv.style.top = `${yPos}px`;
    textDiv.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(textDiv);
    }
  };
  requestAnimationFrame(animate);
}

function showHealNumber({ target, amount, type }) {
  const player = players.find(p => p.nick === target);
  if (!player || !canvas) return;
  // Calcular posición en pantalla
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
    offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  }
  const screenX = player.x - offsetX;
  const screenY = player.y - offsetY - 40; // Arriba del jugador
  // Crear elemento de texto
  const textDiv = document.createElement('div');
  textDiv.textContent = `+${amount}`;
  textDiv.style.position = 'absolute';
  textDiv.style.left = `${screenX}px`;
  textDiv.style.top = `${screenY}px`;
  textDiv.style.color = 'lime'; // Verde lima
  textDiv.style.fontSize = '20px';
  textDiv.style.fontWeight = 'bold';
  textDiv.style.pointerEvents = 'none';
  textDiv.style.zIndex = '2000';
  textDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  document.body.appendChild(textDiv);
  // Animar hacia arriba y desvanecer
  let opacity = 1;
  let yPos = screenY;
  const animate = () => {
    yPos -= 1;
    opacity -= 0.02;
    textDiv.style.top = `${yPos}px`;
    textDiv.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(textDiv);
    }
  };
  requestAnimationFrame(animate);
}

// Función para mostrar daño absorbido por escudo
function showShieldAbsorbed({ nick, absorbed }) {
  const player = players.find(p => p.nick === nick);
  if (!player || !canvas) return;
  // Calcular posición en pantalla
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
    offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  }
  const screenX = player.x - offsetX;
  const screenY = player.y - offsetY - 60; // Más arriba
  // Crear elemento de texto
  const textDiv = document.createElement('div');
  textDiv.textContent = `-${absorbed} (escudo)`;
  textDiv.style.position = 'absolute';
  textDiv.style.left = `${screenX}px`;
  textDiv.style.top = `${screenY}px`;
  textDiv.style.color = 'cyan'; // Azul claro para escudo
  textDiv.style.fontSize = '18px';
  textDiv.style.fontWeight = 'bold';
  textDiv.style.pointerEvents = 'none';
  textDiv.style.zIndex = '2000';
  textDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  document.body.appendChild(textDiv);
  // Animar hacia arriba y desvanecer
  let opacity = 1;
  let yPos = screenY;
  const animate = () => {
    yPos -= 1;
    opacity -= 0.02;
    textDiv.style.top = `${yPos}px`;
    textDiv.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(textDiv);
    }
  };
  requestAnimationFrame(animate);
}

// --- MODO ESPECTADOR ---
function checkSpectatorMode() {
  const localPlayer = players.find(p => p.nick === user.nick);
  let spectMsg = document.getElementById('spectatorMsg');
  if (localPlayer && localPlayer.defeated) {
    if (!spectMsg) {
      spectMsg = document.createElement('div');
      spectMsg.id = 'spectatorMsg';
      spectMsg.style.position = 'fixed';
      spectMsg.style.top = '20px';
      spectMsg.style.left = '50%';
      spectMsg.style.transform = 'translateX(-50%)';
      spectMsg.style.background = 'rgba(0,0,0,0.7)';
      spectMsg.style.color = '#fff';
      spectMsg.style.fontSize = '2rem';
      spectMsg.style.padding = '16px 32px';
      spectMsg.style.borderRadius = '12px';
      spectMsg.style.zIndex = '2000';
      spectMsg.textContent = '¡Has sido derrotado! Eres espectador.';
      document.body.appendChild(spectMsg);
    }
  } else if (spectMsg) {
    spectMsg.remove();
  }
}

// Llamar tras cada playersUpdate
socket.on('playersUpdate', () => { checkSpectatorMode(); });

// Evento de fin de ronda: mostrar solo mejoras proyectilQ
socket.on('roundEnded', (data) => {
  mostrarHUDRondas();
  mostrarSoloProyectilQ = true;
  activeMuddyGrounds = []; // Clear muddy grounds
  activeSacredGrounds = []; // Clear sacred grounds
  window.murosDePiedra = []; // Clear walls
  currentRound++;
  if (currentRound >= 5) { // Para rondas 5+ mostrar proyectilQ, rondas 1 y 2 usan availableUpgrades
    mostrarHUDMejoras(true);
  }
  availableUpgrades = null; // Resetear para rondas posteriores
  // Limpiar explosiones
  explosions.length = 0;
});

// Evento de fin del juego: mostrar stats finales
socket.on('gameEnded', (data) => {
  mostrarStatsFinales(data.stats, data.winner);
});

// Evento para forzar cierre del modal
socket.on('forceClose', () => {
  const modal = document.getElementById('gameEndModal');
  if (modal) modal.remove();
  window.location.href = 'menu.html';
});

socket.on('playerUpgraded', (data) => {
  const player = players.find(p => p.nick === data.nick);
  if (player) {
    player.mejoras = data.mejoras;
    if (data.nick === user.nick) {
      mejorasJugador = data.mejoras;
      // Separar mejoras normales de mejoras Q
      const mejorasNormales = mejorasJugador.filter(m => !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio);
      const mejorasQ = mejorasJugador.filter(m => m.proyectilQ);

      // Actualizar mejoraSeleccionada a la última mejora normal
      if (mejorasNormales.length > 0) {
        mejoraSeleccionada = mejorasNormales[mejorasNormales.length - 1];
      }

      // Actualizar mejoraQSeleccionada a la última mejora Q
      if (mejorasQ.length > 0) {
        mejoraQSeleccionada = mejorasQ[mejorasQ.length - 1];
      }

      console.log('Tus mejoras actualizadas:', mejorasJugador);
      console.log('Mejora seleccionada (click):', mejoraSeleccionada?.nombre);
  console.log('Mejora Q seleccionada:', mejoraQSeleccionada?.nombre);
  const mejoraESeleccionada = mejorasJugador.find(m => m.proyectilE);
  console.log('Mejora seleccionada E:', mejoraESeleccionada?.nombre);
  const mejoraEspacioSeleccionada = mejorasJugador.find(m => m.proyectilEspacio);
  console.log('Mejora Espacio seleccionada:', mejoraEspacioSeleccionada?.nombre);
    }
  }
});

socket.on('castStarted', (data) => {
  activeCasts.push(data);
});

socket.on('castEnded', (data) => {
  activeCasts = activeCasts.filter(cast =>
    !(cast.position.x === data.position.x && cast.position.y === data.position.y && cast.player === data.player)
  );
});

socket.on('muddyGroundCreated', (data) => {
  activeMuddyGrounds.push({ ...data, createdAt: Date.now() });
});

socket.on('sacredGroundCreated', (data) => {
  activeSacredGrounds.push({ ...data, createdAt: Date.now() });
});

socket.on('shieldApplied', (data) => {
  // Actualizar el shield del jugador
  const player = players.find(p => p.nick === data.nick);
  if (player) {
    player.shield = data.shieldAmount;
    player.shieldExpires = Date.now() + data.duration;
  }
});

socket.on('shieldDamage', (data) => {
  showShieldAbsorbed(data);
});

socket.on('wallPlaced', (wall) => {
  if (!window.murosDePiedra) window.murosDePiedra = [];
  window.murosDePiedra.push(wall);
});

socket.on('wallsUpdate', (walls) => {
  window.murosDePiedra = walls;
});

// Función para mostrar stats finales del juego
function mostrarStatsFinales(stats, winner) {
  // Evitar múltiples modales
  if (document.getElementById('gameEndModal')) return;
  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'gameEndModal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = '#fff';
  modal.style.padding = '40px';
  modal.style.borderRadius = '24px';
  modal.style.boxShadow = '0 4px 32px rgba(0,0,0,0.25)';
  modal.style.zIndex = '1000';
  modal.style.textAlign = 'center';
  modal.style.width = '500px';
  modal.style.maxWidth = '90vw';
  modal.style.maxHeight = '80vh';
  modal.style.overflowY = 'auto';

  // Título
  const title = document.createElement('h1');
  title.textContent = 'Fin del Juego - Estadísticas';
  title.style.marginBottom = '20px';
  modal.appendChild(title);

  // Ganador
  const winnerDiv = document.createElement('div');
  winnerDiv.textContent = `(ganador: ${winner})`;
  winnerDiv.style.fontSize = '1.2rem';
  winnerDiv.style.fontWeight = 'bold';
  winnerDiv.style.marginBottom = '20px';
  modal.appendChild(winnerDiv);

  // Lista de stats
  stats.forEach(stat => {
    const statDiv = document.createElement('div');
    statDiv.style.marginBottom = '10px';
    statDiv.style.padding = '10px';
    statDiv.style.border = '1px solid #ccc';
    statDiv.style.borderRadius = '8px';
    statDiv.textContent = `${stat.nick}: ${stat.kills} kills, ${stat.deaths} muertes, ${stat.victories} victorias, ${stat.exp} exp`;
    modal.appendChild(statDiv);
  });

  // Countdown en lugar de botón
  let timeLeft = 12;
  const countdown = document.createElement('div');
  countdown.textContent = `Tiempo restante: ${timeLeft}s`;
  countdown.style.fontSize = '1.5rem';
  countdown.style.fontWeight = 'bold';
  countdown.style.marginTop = '20px';
  modal.appendChild(countdown);

  const interval = setInterval(() => {
    timeLeft--;
    countdown.textContent = `Tiempo restante: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(interval);
      // Distribuir exp y cerrar
      socket.emit('gameAccepted', { stats: stats, winner: winner });
      modal.remove();
      window.location.href = 'menu.html';
    }
  }, 1000);

  document.body.appendChild(modal);
}
