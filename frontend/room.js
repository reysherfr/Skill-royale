// Devuelve el radio final de una mejora considerando aumentos 'agrandar'
function getMejoraRadius(mejora, jugador) {
  const baseRadius = mejora.radius || 20;
  const agrandadores = jugador.mejoras ? jugador.mejoras.filter(m => m.id === 'agrandar') : [];
  return baseRadius + (agrandadores.length * 10);
}
// HUD de aumentos para ronda 2
function mostrarHUDAumentosRonda2() {
  // Oculta el HUD antiguo si existe
  const hudAntiguo = document.getElementById('hudAumentosRonda2');
  if (hudAntiguo) hudAntiguo.remove();
  hudVisible = true;

  // Overlay oscuro de fondo
  const overlay = document.createElement('div');
  overlay.id = 'aumentosOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(46, 125, 50, 0.15) 0%, rgba(0,0,0,0.85) 100%)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.4s ease-out';
  overlay.style.backdropFilter = 'blur(8px)';
  document.body.appendChild(overlay);

  const hud = document.createElement('div');
  hud.id = 'hudAumentosRonda2';
  hud.style.position = 'fixed';
  hud.style.top = '50%';
  hud.style.left = '50%';
  hud.style.transform = 'translate(-50%, -50%) scale(0.9)';
  hud.style.background = 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)';
  hud.style.padding = '40px 48px';
  hud.style.borderRadius = '28px';
  hud.style.boxShadow = '0 25px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.15), inset 0 2px 0 rgba(255,255,255,0.15)';
  hud.style.zIndex = '1000';
  hud.style.textAlign = 'center';
  hud.style.width = 'auto';
  hud.style.maxWidth = '90vw';
  hud.style.maxHeight = '90vh';
  hud.style.animation = 'slideInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  hud.style.backdropFilter = 'blur(10px)';
  hud.style.border = '2px solid rgba(139, 195, 74, 0.4)';

  // Asegurar que las animaciones existen
  if (!document.getElementById('skillSelectorAnimations')) {
    const style = document.createElement('style');
    style.id = 'skillSelectorAnimations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 25px rgba(139, 195, 74, 0.5);
        }
        50% {
          box-shadow: 0 0 45px rgba(139, 195, 74, 0.8);
        }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
    `;
    document.head.appendChild(style);
  }

  // Contenedor del título con icono
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '36px';
  titleContainer.style.position = 'relative';

  // Icono decorativo
  const icon = document.createElement('div');
  icon.textContent = '⚡';
  icon.style.fontSize = '3.5rem';
  icon.style.marginBottom = '8px';
  icon.style.filter = 'drop-shadow(0 0 20px rgba(255, 235, 59, 0.8))';
  icon.style.animation = 'bounce 2s ease-in-out infinite';
  titleContainer.appendChild(icon);

  // Título principal
  const title = document.createElement('h2');
  title.textContent = '💪 Potencia tus Habilidades 💪';
  title.style.fontSize = '2.5rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #fff176, #ffeb3b, #fdd835, #ffeb3b, #fff176)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0 0 8px 0';
  title.style.textShadow = '0 0 40px rgba(255, 235, 59, 0.6)';
  titleContainer.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Elige un aumento para dominar el campo de batalla';
  subtitle.style.fontSize = '1.1rem';
  subtitle.style.color = 'rgba(255,255,255,0.9)';
  subtitle.style.fontWeight = '600';
  subtitle.style.letterSpacing = '0.5px';
  subtitle.style.margin = '0';
  titleContainer.appendChild(subtitle);

  hud.appendChild(titleContainer);

  // Filtrar aumentos disponibles, excluyendo cualquier aumento con stack:false si ya fue seleccionado
  const aumentos = MEJORAS.filter(m => {
    if (m.aumento && m.stack === false) {
      return !mejorasJugador.some(a => a.id === m.id);
    }
    return m.aumento;
  });

  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.justifyContent = 'center';
  grid.style.gap = '20px';
  grid.style.flexWrap = 'wrap';
  grid.style.maxWidth = '800px';
  grid.style.margin = '0 auto';

  let aumentoSeleccionado = null;
  aumentos.forEach((aum, idx) => {
    const btnWrapper = document.createElement('div');
    btnWrapper.style.position = 'relative';
    btnWrapper.style.animation = `slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.1}s backwards`;

    const btn = document.createElement('button');
    btn.textContent = aum.nombre;
    btn.style.padding = '18px 36px';
    btn.style.borderRadius = '18px';
    btn.style.border = '3px solid #8bc34a';
    btn.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = '800';
    btn.style.fontSize = '1.2rem';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 6px 25px rgba(139, 195, 74, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
    btn.style.pointerEvents = 'auto';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    btn.style.minWidth = '200px';
    btn.style.textShadow = '0 2px 10px rgba(0,0,0,0.3)';

    // Efecto de brillo
    const shine = document.createElement('span');
    shine.style.position = 'absolute';
    shine.style.top = '0';
    shine.style.left = '-100%';
    shine.style.width = '100%';
    shine.style.height = '100%';
    shine.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)';
    shine.style.transition = 'left 0.6s';
    shine.style.pointerEvents = 'none';
    btn.appendChild(shine);

    // Badge de "NUEVO" o "STACK" si aplica
    if (aum.stack !== false) {
      const badge = document.createElement('span');
      badge.textContent = '∞';
      badge.style.position = 'absolute';
      badge.style.top = '-8px';
      badge.style.right = '-8px';
      badge.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
      badge.style.color = '#fff';
      badge.style.fontSize = '0.85rem';
      badge.style.fontWeight = '900';
      badge.style.padding = '4px 8px';
      badge.style.borderRadius = '50%';
      badge.style.boxShadow = '0 3px 12px rgba(255, 152, 0, 0.6)';
      badge.style.border = '2px solid rgba(255,255,255,0.3)';
      btnWrapper.appendChild(badge);
    }

    btn.onmouseenter = (e) => {
      btn.style.background = 'linear-gradient(135deg, #8bc34a 0%, #689f38 100%)';
      btn.style.transform = 'translateY(-5px) scale(1.08)';
      btn.style.boxShadow = '0 12px 40px rgba(139, 195, 74, 0.6), inset 0 2px 0 rgba(255,255,255,0.3)';
      shine.style.left = '100%';

      // Tooltip mejorado
      let tooltip = document.createElement('div');
      tooltip.className = 'aumento-tooltip';
      tooltip.textContent = aum.descripcion || '';
      tooltip.style.position = 'fixed';
      tooltip.style.left = (e.clientX + 20) + 'px';
      tooltip.style.top = (e.clientY - 15) + 'px';
      tooltip.style.background = 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '16px 22px';
      tooltip.style.borderRadius = '14px';
      tooltip.style.fontSize = '1rem';
      tooltip.style.zIndex = '2000';
      tooltip.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
      tooltip.style.maxWidth = '350px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.border = '2px solid #8bc34a';
      tooltip.style.animation = 'fadeIn 0.2s ease-out';
      tooltip.style.fontWeight = '500';
      tooltip.style.lineHeight = '1.4';
      document.body.appendChild(tooltip);
      btn._tooltip = tooltip;
    };

    btn.onmouseleave = () => {
      btn.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = '0 6px 25px rgba(139, 195, 74, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
      shine.style.left = '-100%';
      if (btn._tooltip) {
        btn._tooltip.remove();
        btn._tooltip = null;
      }
    };

    btn.onclick = () => {
      Array.from(grid.children).forEach(child => {
        const childBtn = child.querySelector('button');
        if (childBtn !== btn) {
          child.style.opacity = '0.35';
          child.style.transform = 'scale(0.92)';
          childBtn.style.pointerEvents = 'none';
        } else {
          childBtn.style.background = 'linear-gradient(135deg, #ffeb3b 0%, #fdd835 100%)';
          childBtn.style.color = '#1b5e20';
          childBtn.style.transform = 'translateY(-5px) scale(1.12)';
          childBtn.style.boxShadow = '0 15px 50px rgba(255, 235, 59, 0.7), inset 0 3px 6px rgba(255,255,255,0.4)';
          childBtn.style.animation = 'pulseGlow 1.5s infinite';
          childBtn.style.fontWeight = '900';

          // Efecto de partículas al seleccionar
          for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.background = ['#8bc34a', '#ffeb3b', '#4caf50'][Math.floor(Math.random() * 3)];
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1001';
            particle.style.boxShadow = '0 0 8px currentColor';
            const rect = btn.getBoundingClientRect();
            particle.style.left = (rect.left + rect.width / 2) + 'px';
            particle.style.top = (rect.top + rect.height / 2) + 'px';
            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 25;
            const velocity = 3 + Math.random() * 4;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            let posX = 0, posY = 0;
            let opacity = 1;
            const animate = () => {
              posX += vx;
              posY += vy;
              opacity -= 0.015;
              particle.style.transform = `translate(${posX}px, ${posY}px)`;
              particle.style.opacity = opacity;
              if (opacity > 0) {
                requestAnimationFrame(animate);
              } else {
                particle.remove();
              }
            };
            requestAnimationFrame(animate);
          }
        }
      });
      aumentoSeleccionado = aum;
    };

    btnWrapper.appendChild(btn);
    grid.appendChild(btnWrapper);
  });
  hud.appendChild(grid);

  // Temporizador mejorado
  const timerContainer = document.createElement('div');
  timerContainer.style.marginTop = '40px';
  timerContainer.style.padding = '16px 32px';
  timerContainer.style.background = 'linear-gradient(135deg, rgba(139, 195, 74, 0.25), rgba(104, 159, 56, 0.25))';
  timerContainer.style.borderRadius = '16px';
  timerContainer.style.border = '2px solid rgba(139, 195, 74, 0.6)';
  timerContainer.style.display = 'inline-block';

  const timerDiv = document.createElement('div');
  timerDiv.style.fontSize = '1.7rem';
  timerDiv.style.fontWeight = '900';
  timerDiv.style.background = 'linear-gradient(135deg, #8bc34a, #aed581)';
  timerDiv.style.WebkitBackgroundClip = 'text';
  timerDiv.style.WebkitTextFillColor = 'transparent';
  timerDiv.style.backgroundClip = 'text';
  timerDiv.textContent = '⏱️ Tiempo restante: 15s';
  timerContainer.appendChild(timerDiv);
  hud.appendChild(timerContainer);

  let timeLeft = 15;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `⏱️ Tiempo restante: ${timeLeft}s`;

    // Cambiar a rojo cuando queda poco tiempo
    if (timeLeft <= 5) {
      timerDiv.style.background = 'linear-gradient(135deg, #ff5252, #ff1744)';
      timerDiv.style.WebkitBackgroundClip = 'text';
      timerDiv.style.backgroundClip = 'text';
      timerContainer.style.background = 'linear-gradient(135deg, rgba(255, 82, 82, 0.25), rgba(255, 23, 68, 0.25))';
      timerContainer.style.border = '2px solid rgba(255, 82, 82, 0.8)';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      // Si el usuario seleccionó un aumento, usar ese. Si no, elegir uno aleatorio.
      let aumentoFinal = aumentoSeleccionado;
      if (!aumentoFinal && aumentos.length > 0) {
        aumentoFinal = aumentos[Math.floor(Math.random() * aumentos.length)];
      }
      if (aumentoFinal) {
        socket.emit('selectUpgrade', { roomId, mejoraId: aumentoFinal.id });
      }
      ocultarHUDAumentosRonda2();
    }
  }, 1000);

  document.body.appendChild(hud);
}

function ocultarHUDAumentosRonda2() {
  hudVisible = false;
  
  // Eliminar todos los tooltips inmediatamente
  document.querySelectorAll('.aumento-tooltip').forEach(t => t.remove());

  const hud = document.getElementById('hudAumentosRonda2');
  const overlay = document.getElementById('aumentosOverlay');

  if (hud) {
    hud.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => hud.remove(), 300);
  }

  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => overlay.remove(), 300);
  }
}
// Determine server URL based on environment
// Usar IP pública del servidor en producción
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'http://138.68.250.124:3000';

const socket = io(SERVER_URL);

const user = JSON.parse(localStorage.getItem('batlesd_user'));
const roomId = localStorage.getItem('batlesd_room_id');
if (!user || !roomId) {
  window.location.href = 'menu.html';
}

// Variable para prevenir renderizados múltiples simultáneos
let renderTimeout = null;
let isRendering = false;

// Enviar el nick al backend para identificar el socket (después de inicializar user)
if (user && user.nick) {
  socket.emit('setNick', user.nick);
}

// Función wrapper para renderizar con debounce
function scheduleRender(updatedSala) {
  // Cancelar cualquier renderizado pendiente
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }
  
  // Actualizar la variable sala inmediatamente
  sala = updatedSala;
  
  // Si ya está renderizando, esperar
  if (isRendering) {
    renderTimeout = setTimeout(() => scheduleRender(updatedSala), 50);
    return;
  }
  
  // Renderizar después de un pequeño delay para evitar múltiples renders
  renderTimeout = setTimeout(() => {
    renderSala(updatedSala);
  }, 100);
}

socket.on('playerLeft', (updatedSala) => {
  scheduleRender(updatedSala);
  // Eliminar de players[] si ya no está
  if (updatedSala && updatedSala.players) {
    for (let i = players.length - 1; i >= 0; i--) {
      if (!updatedSala.players.find(p => p.nick === players[i].nick)) {
        players.splice(i, 1);
      }
    }
    drawPlayers();
  }
});

// Escuchar cuando un jugador se une a la sala y actualizar la lista en tiempo real
socket.on('playerJoined', (updatedSala) => {
  scheduleRender(updatedSala);
});

// Escuchar cuando un jugador es expulsado
socket.on('playerKicked', (data) => {
  const { kickedNick, sala } = data;
  
  // Si el jugador expulsado eres tú, redirigir al menú
  if (user.nick === kickedNick) {
    alert('Has sido expulsado de la sala por el host.');
    window.location.href = 'menu.html';
    return;
  }
  
  // Si no eres el expulsado, actualizar la sala
  scheduleRender(sala);
  
  // Mostrar notificación
  console.log(`${kickedNick} ha sido expulsado de la sala`);
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
        // Usar el color del servidor o el color por defecto
        color: sp.color || '#f4c2a0',
        isLocal: sp.nick === user.nick
      });
      players.push(local);
      changed = true;
      
      // Debug: verificar maxHealth al crear jugador
      console.log(`🆕 Nuevo jugador: ${sp.nick} | Health: ${sp.health}/${sp.maxHealth || 200}`);
    }
    // Actualizar color del servidor si cambió
    if (sp.color && local.color !== sp.color) {
      local.color = sp.color;
    }
    local.health = sp.health;
    local.maxHealth = sp.maxHealth || 200; // Actualizar maxHealth desde el servidor
    // Don't update position for local player during movement to avoid prediction conflicts
    if (sp.nick !== user.nick) {
      local.x = sp.x;
      local.y = sp.y;
    }
    local.speed = sp.speed;
    local.speedBoostUntil = sp.speedBoostUntil || 0;
    local.defeated = sp.defeated;
    local.mejoras = sp.mejoras || [];
    local.shieldAmount = sp.shieldAmount || 0;
    if (sp.nick === user.nick) {
      mejorasJugador = sp.mejoras || [];
      // Separar mejoras normales de mejoras Q
      const mejorasNormales = mejorasJugador.filter(m => !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio && !m.aumento);
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
  document.querySelector('.room-container').style.display = 'none';
  // Mostrar canvas
  const canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  // Inicializar juego
  initGame();
  // Mostrar HUD de selección de mejoras en ronda 1
  if (sala.round === 1) {
    mostrarHUDSeleccionHabilidades();
  }
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
let tumbas = []; // Array de tumbas { nick, x, y }
let tumbaImage = null; // Imagen de la tumba
let spectatorTarget = null; // Jugador al que estamos siguiendo en modo espectador
let activeCasts = []; // Array de casts activos: [{ position: {x, y}, startTime, player, mejora }]
let activeMuddyGrounds = []; // Array de suelos fangosos: [{ x, y, radius, duration, createdAt }]
let activeSacredGrounds = []; // Array de suelos sagrados: [{ x, y, radius, duration, createdAt, owner }]
let mostrarSoloProyectilQ = false;
let hudTimer = 15;
let hudInterval = null;
let hudVisible = false;
let hud = null;
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let keys = { w: false, a: false, s: false, d: false };
let localPlayerVelocity = { x: 0, y: 0 };
let smoothingFactor = 0.3; // Factor de suavizado para interpolación
let lastInputTime = 0;
const INPUT_THROTTLE = 50; // ms entre envíos de estado
let lastQFireTime = 0;
let mouseX = 0, mouseY = 0;
let currentRound = 1; // Contador de rondas
let roundHUD = null; // HUD del contador de rondas
let abilityHUD = null; // HUD de habilidades abajo
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

const MAP_WIDTH = 2500;
const MAP_HEIGHT = 1500;
const WALL_THICKNESS = 24;
const DEFAULT_SPEED = 5; // Velocidad base de movimiento
import { MEJORAS, Proyectil } from './mejoras.shared.js';

// Dibuja todos los jugadores en el canvas, con cámara centrada en el jugador local y mundo fijo
// Cargar imagen de tumba
if (!tumbaImage) {
  tumbaImage = new Image();
  tumbaImage.src = 'tumbas/tumba.png';
}

// Función para dibujar tumbas
function drawTumbas() {
  if (!canvas || !tumbaImage.complete) return;
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer) return;
  
  // Calcular offset de cámara (igual que en drawPlayers)
  let cameraTarget = localPlayer;
  if (localPlayer.defeated && spectatorTarget) {
    const target = players.find(p => p.nick === spectatorTarget);
    if (target) cameraTarget = target;
  }
  
  let offsetX = cameraTarget.x - canvas.width / 2;
  let offsetY = cameraTarget.y - canvas.height / 2;
  offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
  offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  
  tumbas.forEach(tumba => {
    const relativeX = tumba.x - offsetX;
    const relativeY = tumba.y - offsetY;
    
    // Dibujar tumba más grande (60x60 píxeles)
    const tumbaWidth = 60;
    const tumbaHeight = 60;
    ctx.drawImage(tumbaImage, relativeX - tumbaWidth / 2, relativeY - tumbaHeight / 2, tumbaWidth, tumbaHeight);
    
    // Nombre del jugador muerto encima de la tumba
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(tumba.nick, relativeX, relativeY - 40);
    ctx.fillText(tumba.nick, relativeX, relativeY - 40);
  });
}

function drawPlayers() {
  if (!canvas) return;
  const localPlayer = players.find(p => p.nick === user.nick);
  // REMOVED: Forcing speed to 40 - now using configurable speed
  // if (localPlayer && localPlayer.speed !== 40) {
  //   localPlayer.speed = 40;
  // }
  if (!localPlayer) return;
    // Debug eliminado
  
  // Modo espectador: si el jugador local está derrotado, seguir a otro jugador
  let cameraTarget = localPlayer;
  if (localPlayer.defeated) {
    // Buscar un jugador vivo para seguir
    if (!spectatorTarget || !players.find(p => p.nick === spectatorTarget && !p.defeated)) {
      const alivePlayers = players.filter(p => !p.defeated && p.nick !== user.nick);
      spectatorTarget = alivePlayers.length > 0 ? alivePlayers[0].nick : null;
    }
    if (spectatorTarget) {
      const target = players.find(p => p.nick === spectatorTarget);
      if (target) cameraTarget = target;
    }
  } else {
    spectatorTarget = null; // Resetear si el jugador revive
  }
  
  // Cámara centrada en el objetivo (jugador local o espectador)
  let offsetX = cameraTarget.x - canvas.width / 2;
  let offsetY = cameraTarget.y - canvas.height / 2;
  offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
  offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  
  players.forEach(player => {
    // No dibujar jugadores derrotados
    if (player.defeated) return;
    const relativeX = player.x - offsetX;
    const relativeY = player.y - offsetY;
    // Jugadores grandes y circulares
    ctx.beginPath();
    ctx.arc(relativeX, relativeY, 32, 0, 2 * Math.PI); // Radio 32px
    // Usar el color personalizado del jugador o el color por defecto
    ctx.fillStyle = player.color || '#f4c2a0';
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
    const maxHealth = player.maxHealth || 200; // Usar maxHealth del jugador o 200 por defecto
    // Fondo gris
    ctx.fillStyle = '#bbb';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    // Vida (verde)
    ctx.fillStyle = '#4caf50';
    const vida = Math.max(0, Math.min(player.health ?? maxHealth, maxHealth));
    ctx.fillRect(barX, barY, barWidth * (vida / maxHealth), barHeight);
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
    ctx.fillText(`${vida}/${maxHealth}`, relativeX, barY + barHeight - 2);
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

let gameLoopId = null;

// Iniciar el bucle principal del juego
// Game loop is now started in initGame

// --- Disparo de proyectiles y cooldowns ---
let lastFireTime = 0;


function handleMouseDown(e) {
  if (hudVisible) return; // No disparar si HUD está visible, igual que otras habilidades
  if (e.button !== 0) return; // Solo click izquierdo
  // Si el jugador está derrotado, no puede disparar
  let lp = players.find(p => p.nick === user.nick);
  if (lp && lp.defeated) return;
  const now = performance.now();
  if (!mejoraSeleccionada || typeof mejoraSeleccionada.cooldown !== 'number' || mejoraSeleccionada.proyectilQ) {
    console.log('No mejoraSeleccionada válida para click izquierdo', mejoraSeleccionada);
    return;
  }
  if (now - lastFireTime < mejoraSeleccionada.cooldown) {
  // console.log('Cooldown activo', {now, lastFireTime, cooldown: mejoraSeleccionada.cooldown});
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

  // Aplicar potenciador si tiene y es proyectil
  const potenciadores = mejorasJugador.filter(m => m.id === 'potenciador_proyectil');
  const numPotenciadores = potenciadores.length;
  let velocidadFinal = mejoraSeleccionada.velocidad + (numPotenciadores * 8);
  let maxRangeFinal = mejoraSeleccionada.maxRange + (numPotenciadores * 150);

  // Emitir evento al backend para crear el proyectil
  socket.emit('shootProjectile', {
    roomId,
    x: localPlayer.x,
    y: localPlayer.y,
    angle,
    mejoraId: mejoraSeleccionada.id,
    velocidad: velocidadFinal,
    maxRange: maxRangeFinal,
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

function crearHUDHabilidades() {
  // Remover HUD anterior si existe
  if (abilityHUD && abilityHUD.parentNode) {
    abilityHUD.parentNode.removeChild(abilityHUD);
  }
  
  // Crear nuevo HUD de habilidades
  abilityHUD = document.createElement('div');
  abilityHUD.id = 'abilityHUD';
  abilityHUD.style.position = 'fixed';
  abilityHUD.style.bottom = '20px';
  abilityHUD.style.left = '50%';
  abilityHUD.style.transform = 'translateX(-50%)';
  abilityHUD.style.display = 'flex';
  abilityHUD.style.gap = '20px';
  abilityHUD.style.zIndex = '1000';
  
  // Iconos para las habilidades
  const abilities = [
    { key: 'click', icon: 'iconos/click.png', name: 'Click' },
    { key: 'q', icon: 'iconos/Q.png', name: 'Q' },
    { key: 'e', icon: 'iconos/E.png', name: 'E' },
    { key: 'space', icon: 'iconos/espacio.png', name: 'Space' }
  ];
  
  abilities.forEach(ability => {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '60px';
    container.style.height = '60px';
    container.style.background = 'rgba(0, 0, 0, 0.8)';
    container.style.border = '2px solid #fff';
    container.style.borderRadius = '10px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.cursor = 'pointer';
    container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';
    container.dataset.ability = ability.key;
    
    const img = document.createElement('img');
    img.src = ability.icon;
    img.style.width = '40px';
    img.style.height = '40px';
    img.style.objectFit = 'contain';
    
    // Overlay de cooldown (cortina que baja desde arriba)
    const cooldownOverlay = document.createElement('div');
    cooldownOverlay.className = 'cooldown-overlay';
    cooldownOverlay.style.position = 'absolute';
    cooldownOverlay.style.top = '0';
    cooldownOverlay.style.left = '0';
    cooldownOverlay.style.width = '100%';
    cooldownOverlay.style.height = '100%';
    cooldownOverlay.style.background = 'rgba(0, 0, 0, 0.8)';
    cooldownOverlay.style.clipPath = 'inset(0 0 100% 0)'; // Comienza cubriendo todo desde arriba
    cooldownOverlay.style.borderRadius = '8px';
    cooldownOverlay.style.pointerEvents = 'none';
    cooldownOverlay.style.transition = 'clip-path 0.05s linear'; // Transición más suave y rápida
    
    // Texto del cooldown (eliminado, no se usa)
    // const cooldownText = document.createElement('div');
    // cooldownText.className = 'cooldown-text';
    // cooldownText.style.position = 'absolute';
    // cooldownText.style.top = '50%';
    // cooldownText.style.left = '50%';
    // cooldownText.style.transform = 'translate(-50%, -50%)';
    // cooldownText.style.color = '#fff';
    // cooldownText.style.fontSize = '12px';
    // cooldownText.style.fontWeight = 'bold';
    // cooldownText.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
    // cooldownText.style.display = 'none';
    // cooldownText.style.pointerEvents = 'none';
    
    container.appendChild(img);
    container.appendChild(cooldownOverlay);
    // container.appendChild(cooldownText); // No agregar texto
    
    abilityHUD.appendChild(container);
  });
  
  document.body.appendChild(abilityHUD);
}

function actualizarHUDCooldowns() {
  if (!abilityHUD) return;
  
  const now = performance.now();
  const containers = abilityHUD.querySelectorAll('[data-ability]');
  
  containers.forEach(container => {
    const ability = container.dataset.ability;
    const overlay = container.querySelector('.cooldown-overlay');
    
    let cooldown = 0;
    let remaining = 0;
    let totalCooldown = 0;
    
    switch(ability) {
      case 'click':
        if (mejoraSeleccionada && mejoraSeleccionada.cooldown) {
          totalCooldown = mejoraSeleccionada.cooldown;
          remaining = Math.max(0, totalCooldown - (now - lastFireTime));
        }
        break;
      case 'q':
        if (mejoraQSeleccionada && mejoraQSeleccionada.cooldown) {
          totalCooldown = mejoraQSeleccionada.cooldown;
          remaining = Math.max(0, totalCooldown - (now - lastQFireTime));
        }
        break;
      case 'e':
        const mejoraE = mejorasJugador.find(m => m.proyectilE);
        if (mejoraE && mejoraE.cooldown) {
          totalCooldown = mejoraE.cooldown;
          // Manejar cooldowns específicos para habilidades E
          if (mejoraE.id === 'muro_piedra') {
            // Muro de piedra usa cooldown específico
            if (window.muroDePiedraCooldown) {
              remaining = Math.max(0, totalCooldown - (now - window.muroDePiedraCooldown));
            }
          } else {
            // Otras habilidades E usan cooldown genérico
            const cooldownVar = window[mejoraE.id + 'Cooldown'];
            if (cooldownVar) {
              remaining = Math.max(0, totalCooldown - (now - cooldownVar));
            }
          }
        }
        break;
      case 'space':
        const mejoraEspacio = mejorasJugador.find(m => m.proyectilEspacio);
        if (mejoraEspacio && mejoraEspacio.cooldown) {
          totalCooldown = mejoraEspacio.cooldown;
          remaining = Math.max(0, totalCooldown - (now - window.teleportCooldown));
        }
        break;
    }
    
    if (remaining > 0 && totalCooldown > 0) {
      // Calcular el porcentaje de cooldown restante con mayor precisión
      const percent = Math.max(0, Math.min(100, (remaining / totalCooldown) * 100));
      // Cortina que baja desde arriba: cuando percent=100%, inset(0 0 0 0) cubre todo
      // cuando percent=0%, inset(100% 0 0 0) no cubre nada
      overlay.style.clipPath = `inset(${100 - percent}% 0 0 0)`;
      overlay.style.display = 'block';
    } else {
      // Sin cooldown - cortina completamente bajada
      overlay.style.clipPath = 'inset(100% 0 0 0)';
      overlay.style.display = 'none';
    }
  });
}

// Old HUD function removed - replaced with new implementation

function iniciarCombate() {
  // Aquí puedes activar controles, proyectiles, etc.
  // Por ahora solo muestra el canvas y permite jugar
  document.getElementById('gameCanvas').focus();
  enableProjectileShooting();
}

// El movimiento ahora es calculado en el backend. Solo enviamos las teclas presionadas.
function updateMovement(dt) {
  // Client-side prediction para el jugador local con SLIDING
  const localPlayer = players.find(p => p.nick === user.nick);
  if (localPlayer && (localPlayerVelocity.x !== 0 || localPlayerVelocity.y !== 0)) {
    const speed = localPlayer.speed || DEFAULT_SPEED;
    const moveDistance = speed * (dt / 16); // Ajustar por framerate
    
    const dx = localPlayerVelocity.x * moveDistance;
    const dy = localPlayerVelocity.y * moveDistance;
    
    let tempX = localPlayer.x + dx;
    let tempY = localPlayer.y + dy;
    
    // Aplicar límites del mapa
    tempX = Math.max(0, Math.min(MAP_WIDTH, tempX));
    tempY = Math.max(0, Math.min(MAP_HEIGHT, tempY));
    
    // 🎮 SISTEMA DE SLIDING - igual que en el servidor
    let newX = localPlayer.x;
    let newY = localPlayer.y;
    
    // Primero intentar el movimiento completo
    if (puedeMoverJugador(tempX, tempY)) {
      // Sin colisión, mover libremente
      newX = tempX;
      newY = tempY;
    } else {
      // Hay colisión, intentar sliding en ejes separados
      
      // 1. Intentar mover solo en X (deslizar horizontalmente)
      const onlyX = localPlayer.x + dx;
      if (puedeMoverJugador(onlyX, localPlayer.y)) {
        newX = onlyX;
        newY = localPlayer.y;
      }
      // 2. Intentar mover solo en Y (deslizar verticalmente)
      else {
        const onlyY = localPlayer.y + dy;
        if (puedeMoverJugador(localPlayer.x, onlyY)) {
          newX = localPlayer.x;
          newY = onlyY;
        }
      }
      
      // 3. Si ninguno funciona, intentar con velocidad reducida
      if (newX === localPlayer.x && newY === localPlayer.y) {
        const reducedDx = dx * 0.5;
        const reducedDy = dy * 0.5;
        const reducedX = localPlayer.x + reducedDx;
        const reducedY = localPlayer.y + reducedDy;
        
        if (puedeMoverJugador(reducedX, reducedY)) {
          newX = reducedX;
          newY = reducedY;
        } else {
          // Intentar solo X con velocidad reducida
          const reducedOnlyX = localPlayer.x + reducedDx;
          if (puedeMoverJugador(reducedOnlyX, localPlayer.y)) {
            newX = reducedOnlyX;
          }
          // Intentar solo Y con velocidad reducida
          const reducedOnlyY = localPlayer.y + reducedDy;
          if (puedeMoverJugador(localPlayer.x, reducedOnlyY)) {
            newY = reducedOnlyY;
          }
        }
      }
    }
    
    // Aplicar la nueva posición
    localPlayer.x = newX;
    localPlayer.y = newY;
  }
  
  // Interpolación suave para otros jugadores
  players.forEach(player => {
    if (player.nick !== user.nick && player.targetX !== undefined) {
      // Interpolar hacia la posición objetivo del servidor
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) {
        // Factor de interpolación adaptativo: más rápido si la distancia es mayor
        const interpFactor = Math.min(smoothingFactor * (distance / 50 + 0.5), 1);
        player.x += dx * interpFactor;
        player.y += dy * interpFactor;
      } else {
        // Muy cerca, snap a la posición objetivo
        player.x = player.targetX;
        player.y = player.targetY;
      }
    }
  });
}

function gameLoop() {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;
  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
    document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
  }
  updateMovement(dt);
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
  // Actualizar HUD de cooldowns
  actualizarHUDCooldowns();
  drawMap();
  drawTumbas(); // Dibujar tumbas antes de los jugadores
  drawPlayers();
  // Usar requestAnimationFrame para actualizaciones más suaves
  gameLoopId = requestAnimationFrame(gameLoop);
}

function initGame() {
  // Limpiar intervalos anteriores para evitar acumulación
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  // Mostrar HUD de selección de mejora solo si NO es reinicio de ronda
  // if (!mostrarSoloProyectilQ) {
  //   mostrarHUDMejoras(false);
  // }
  // No resetear mostrarSoloProyectilQ aquí, mantener el estado de la ronda
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  // Create FPS counter div
  const fpsDiv = document.createElement('div');
  fpsDiv.id = 'fps-counter';
  fpsDiv.style.position = 'absolute';
  fpsDiv.style.top = '10px';
  fpsDiv.style.left = '10px';
  fpsDiv.style.color = 'white';
  fpsDiv.style.font = '20px Arial';
  fpsDiv.style.background = 'black';
  fpsDiv.style.padding = '5px';
  fpsDiv.style.zIndex = '1000';
  document.body.appendChild(fpsDiv);
  resizeCanvas();
  mostrarHUDRondas();
  crearHUDHabilidades();
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
  lastTime = performance.now();
  frameCount = 0;
  fps = 0;
  lastFpsUpdate = performance.now();
  enableProjectileShooting(); // Habilitar disparos desde el inicio
  gameLoop();
  window.addEventListener('resize', () => {
    resizeCanvas();
    // drawMap();
    // drawPlayers();
  });
}

function drawMap() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Cámara centrada en el jugador local o en el jugador espectado
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    // Modo espectador: si el jugador local está derrotado, seguir a otro jugador
    let cameraTarget = localPlayer;
    if (localPlayer.defeated) {
      // Buscar un jugador vivo para seguir
      if (!spectatorTarget || !players.find(p => p.nick === spectatorTarget && !p.defeated)) {
        const alivePlayers = players.filter(p => !p.defeated && p.nick !== user.nick);
        spectatorTarget = alivePlayers.length > 0 ? alivePlayers[0].nick : null;
      }
      if (spectatorTarget) {
        const target = players.find(p => p.nick === spectatorTarget);
        if (target) cameraTarget = target;
      }
    } else {
      spectatorTarget = null; // Resetear si el jugador revive
    }
    
    offsetX = cameraTarget.x - canvas.width / 2;
    offsetY = cameraTarget.y - canvas.height / 2;
    // Limitar cámara para no mostrar fuera del mapa
    offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
    offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
  }
  
  // Fondo mejorado con gradiente de arena de batalla
  const bgGradient = ctx.createRadialGradient(
    MAP_WIDTH / 2 - offsetX, MAP_HEIGHT / 2 - offsetY, 0,
    MAP_WIDTH / 2 - offsetX, MAP_HEIGHT / 2 - offsetY, MAP_WIDTH / 1.5
  );
  bgGradient.addColorStop(0, '#9B8B7E');  // Arena clara en el centro
  bgGradient.addColorStop(0.6, '#7D6E5D'); // Arena media
  bgGradient.addColorStop(1, '#5D4E37');   // Arena oscura en los bordes
  ctx.fillStyle = bgGradient;
  ctx.fillRect(-offsetX, -offsetY, MAP_WIDTH, MAP_HEIGHT);
  
  // Textura sutil de arena (patrón de puntos)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let x = 0; x < MAP_WIDTH; x += 30) {
    for (let y = 0; y < MAP_HEIGHT; y += 30) {
      // Patrón determinístico basado en posición
      if ((x + y) % 60 === 0) {
        ctx.fillRect(x - offsetX, y - offsetY, 2, 2);
      }
    }
  }
  
  // Líneas del borde del mapa más visibles
  ctx.strokeStyle = '#3D2E1F';
  ctx.lineWidth = 4;
  ctx.strokeRect(-offsetX, -offsetY, MAP_WIDTH, MAP_HEIGHT);

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
      // Dibujar círculo en la posición del mouse ajustando el radio si tiene el aumento 'agrandar'
  const modifiedRadius = getMejoraRadius(mejoraQSeleccionada, localPlayer);
      ctx.save();
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, modifiedRadius, 0, 2 * Math.PI);
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
    const now = performance.now();
    const elapsed = now - cast.startTime;
    const castTime = cast.mejora && cast.mejora.castTime ? cast.mejora.castTime : 1500;
    const progress = Math.min(Math.max(elapsed / castTime, 0), 1);
    const castX = cast.position.x - offsetX;
    const castY = cast.position.y - offsetY;
    const localPlayer = players.find(p => p.nick === cast.player);
    const modifiedRadius = localPlayer ? getMejoraRadius(cast.mejora, localPlayer) : (cast.mejora.radius || 20);
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
      } else if (cast.mejora.id === 'roca_fangosa') {
        ctx.beginPath();
        ctx.arc(castX, castY, modifiedRadius, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        ctx.strokeRect(castX - modifiedRadius, castY - modifiedRadius, modifiedRadius * 2, modifiedRadius * 2);
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
      } else if (cast.mejora.id === 'roca_fangosa') {
        ctx.beginPath();
        ctx.arc(castX, castY, modifiedRadius * progress, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillRect(castX - modifiedRadius * progress, castY - modifiedRadius * progress, modifiedRadius * 2 * progress, modifiedRadius * 2 * progress);
      }
      ctx.restore();
    } else {
      // Círculo de fondo
      ctx.save();
      ctx.beginPath();
  ctx.arc(castX, castY, modifiedRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'saddlebrown';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // Círculo de progreso (relleno)
      ctx.save();
      ctx.beginPath();
  ctx.arc(castX, castY, modifiedRadius * progress, 0, 2 * Math.PI);
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
  // Movement keys
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    if (!keys[key]) {
      keys[key] = true;
      // Enviar estado al servidor inmediatamente para máxima responsividad
      socket.emit('keyState', {
        roomId: roomId,
        nick: user.nick,
        key: key,
        pressed: true
      });
      // Client-side prediction: actualizar velocidad local inmediatamente
      updateLocalVelocity();
    }
    e.preventDefault(); // Prevent default browser behavior
    return;
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
        const now = performance.now();
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
            const now = performance.now();
            if (window.muroDePiedraCooldown && now - window.muroDePiedraCooldown < mejoraE.cooldown) return;
            muroPiedraAiming = true;
            canvas.style.cursor = 'none';
          } else {
            const now = performance.now();
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
        const now = performance.now();
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
          const now = performance.now();
          if (window.teleportCooldown && now - window.teleportCooldown < mejoraEspacio.cooldown) return;
          spaceAiming = true;
          canvas.style.cursor = 'none';
        } else {
          const now = performance.now();
          if (window.teleportCooldown && now - window.teleportCooldown < mejoraEspacio.cooldown) return;
          
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          offsetX = Math.max(0, Math.min(offsetX, MAP_WIDTH - canvas.width));
          offsetY = Math.max(0, Math.min(offsetY, MAP_HEIGHT - canvas.height));
          let targetX = mouseX + offsetX;
          let targetY = mouseY + offsetY;
          // Ajuste: Embestida y Teleport se lanzan al máximo rango si el jugador presiona espacio fuera del rango
          const calcularDestinoHabilidadEspacio = (origen, destino, maxRange) => {
            const dx = destino.x - origen.x;
            const dy = destino.y - origen.y;
            const distancia = Math.sqrt(dx * dx + dy * dy);
            if (distancia > maxRange) {
              const angulo = Math.atan2(dy, dx);
              return {
                x: origen.x + Math.cos(angulo) * maxRange,
                y: origen.y + Math.sin(angulo) * maxRange
              };
            } else {
              return destino;
            }
          };
          const destinoFinal = calcularDestinoHabilidadEspacio(localPlayer, { x: targetX, y: targetY }, mejoraEspacio.maxRange);
          targetX = destinoFinal.x;
          targetY = destinoFinal.y;
          
          // Activar cooldown DESPUÉS de calcular el destino válido
          window.teleportCooldown = now;
          
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
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          meteoroAiming = true;
        } else {
          meteoroAiming = false;
          const now = performance.now();
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
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          cuchillaAiming = true;
        } else {
          cuchillaAiming = false;
          const now = performance.now();
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
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          rocaFangosaAiming = true;
        } else {
          // Empezar cast
          rocaFangosaAiming = false;
          const now = performance.now();
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
// Renderizado de muros de piedra mejorado
function dibujarMurosDePiedra(ctx, offsetX, offsetY) {
  if (!window.murosDePiedra) return;
  const ahora = Date.now();
  window.murosDePiedra = window.murosDePiedra.filter(muro => ahora - muro.creado < muro.duracion);
  
  window.murosDePiedra.forEach(muro => {
    ctx.save();
    
    // 🪨 Si el muro tiene imagen (como muro_roca), renderizarlo con la imagen
    if (muro.imagen) {
      ctx.translate(muro.x - offsetX, muro.y - offsetY);
      ctx.rotate(muro.angle);
      
      // Sombra del muro
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      
      // Cargar y dibujar la imagen si no está cargada
      if (!window.imagenesBloquesCache) {
        window.imagenesBloquesCache = {};
      }
      
      if (!window.imagenesBloquesCache[muro.imagen]) {
        const img = new Image();
        img.src = muro.imagen;
        window.imagenesBloquesCache[muro.imagen] = img;
      }
      
      const img = window.imagenesBloquesCache[muro.imagen];
      if (img.complete) {
        // Dibujar imagen centrada
        ctx.drawImage(
          img,
          -muro.width,
          -muro.height,
          muro.width * 2,
          muro.height * 2
        );
      } else {
        // Mientras carga, dibujar un óvalo temporal
        ctx.fillStyle = muro.color || '#8B7765';
        ctx.beginPath();
        ctx.ellipse(0, 0, muro.width, muro.height, 0, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Muros normales sin imagen
    else if (muro.width && muro.height && typeof muro.angle === 'number') {
      ctx.translate(muro.x - offsetX, muro.y - offsetY);
      ctx.rotate(muro.angle);
      
      // Sombra del muro
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      
      // Gradiente para efecto 3D
      const gradient = ctx.createRadialGradient(
        -muro.width * 0.3, -muro.height * 0.3, 0,
        0, 0, Math.max(muro.width, muro.height)
      );
      
      // Colores del gradiente basados en el color del muro
      const baseColor = muro.color || '#5D4E37';
      const lightColor = lightenColor(baseColor, 25);
      const darkColor = darkenColor(baseColor, 20);
      
      gradient.addColorStop(0, lightColor);
      gradient.addColorStop(0.6, baseColor);
      gradient.addColorStop(1, darkColor);
      
      ctx.fillStyle = gradient;
      
      // Dibujar el óvalo del muro
      ctx.beginPath();
      ctx.ellipse(0, 0, muro.width, muro.height, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Borde oscuro para definición
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = darkenColor(baseColor, 40);
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Textura de grietas aleatorias (solo para muros permanentes)
      if (muro.duracion > 100000) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1.5;
        // Grietas semi-aleatorias basadas en posición (determinísticas)
        const seed = muro.x + muro.y;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const startAngle = ((seed + i * 123) % 360) * Math.PI / 180;
          const startRadius = muro.width * 0.3;
          const endRadius = muro.width * 0.8;
          ctx.moveTo(
            Math.cos(startAngle) * startRadius,
            Math.sin(startAngle) * startRadius * (muro.height / muro.width)
          );
          ctx.lineTo(
            Math.cos(startAngle + 0.1) * endRadius,
            Math.sin(startAngle + 0.1) * endRadius * (muro.height / muro.width)
          );
          ctx.stroke();
        }
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      // Fallback para muros rectangulares simples
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = muro.color;
      ctx.fillRect(
        muro.x - offsetX - muro.radius,
        muro.y - offsetY - muro.radius,
        muro.radius * 2,
        muro.radius * 2
      );
    }
    ctx.restore();
  });
}

// Funciones auxiliares para manipular colores
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  // Movement keys
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    if (keys[key]) {
      keys[key] = false;
      socket.emit('keyState', {
        roomId: roomId,
        nick: user.nick,
        key: key,
        pressed: false
      });
      // Actualizar velocidad local inmediatamente
      updateLocalVelocity();
    }
  }
}

// Actualizar la velocidad local basada en teclas presionadas
function updateLocalVelocity() {
  let dx = 0, dy = 0;
  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;
  
  // Normalizar el vector de dirección para movimiento diagonal consistente
  if (dx !== 0 || dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;
  }
  
  localPlayerVelocity.x = dx;
  localPlayerVelocity.y = dy;
}

// Movimiento WASD con envío suave cada frame
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
  document.querySelector('.room-container').style.display = 'none';
  // Mostrar canvas
  const canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  // Inicializar juego
  initGame();
  // Mostrar HUD de selección de mejoras en ronda 1
  if (sala.round === 1) {
    mostrarHUDSeleccionHabilidades();
  }
});

// Recibir muros del escenario profesional
socket.on('escenarioMuros', (muros) => {
  console.log(`🏛️ Escenario de batalla recibido: ${muros.length} obstáculos`);
  window.murosDePiedra = muros;
  // Redibujar el mapa para mostrar los muros inmediatamente
  if (ctx && canvas) {
    drawMap();
    drawPlayers();
  }
});

socket.on('playerMoved', (data) => {
  const { nick, x, y } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    // Para otros jugadores, usar interpolación suave
    if (nick !== user.nick) {
      // Guardar posición objetivo si no existe
      if (!player.targetX) {
        player.targetX = x;
        player.targetY = y;
      } else {
        player.targetX = x;
        player.targetY = y;
      }
      // La interpolación se hará en el loop de animación
    } else {
      // Para el jugador local, reconciliación suave con client-side prediction
      const dx = x - player.x;
      const dy = y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Solo reconciliar si la corrección del servidor es significativa (> 20 pixels)
      // Esto previene el jitter por variaciones de red pequeñas
      if (distance > 15) {
        // For online play, be more aggressive with correction to reduce perceived lag
        const lerpFactor = window.location.hostname === 'localhost' ? 0.3 : 0.6;
        player.x += dx * lerpFactor;
        player.y += dy * lerpFactor;
      }
      // Always redraw for local player movement
      drawMap();
      drawPlayers();
    }
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
      const modifiedMejora = { ...mejora };
      const player = players.find(p => p.nick === pData.owner);
      if (player && (mejora.proyectil || mejora.proyectilQ)) {
        const agrandadores = player.mejoras.filter(m => m.id === 'agrandar');
        const numAgrandadores = agrandadores.length;
        modifiedMejora.radius = (modifiedMejora.radius || 16) + (numAgrandadores * 10);
      }
      const newP = new Proyectil({
        x: pData.x,
        y: pData.y,
        angle: pData.angle,
        mejora: modifiedMejora,
        owner: pData.owner,
        id: pData.id,
        velocidad: pData.velocidad,
        radius: pData.radius
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
      local.maxHealth = sp.maxHealth || 200; // Actualizar maxHealth desde el servidor
      local.x = sp.x;
      local.y = sp.y;
      local.speed = sp.speed;
    }
  }
});

async function renderSala(sala) {
  // Marcar que está renderizando
  isRendering = true;
  
  const playersGrid = document.getElementById('playersGrid');
  const roomInfo = document.getElementById('roomInfo');
  
  if (!sala) {
    roomInfo.textContent = 'La sala ya no existe.';
    playersGrid.innerHTML = '';
    startBtn.style.display = 'none';
    isRendering = false;
    return;
  }
  
  roomInfo.innerHTML = `<span class="host-badge">👑 Host</span> <strong>${sala.host.nick}</strong>`;
  playersGrid.innerHTML = '';
  
  // Renderizar los 4 slots de jugadores
  for (let i = 0; i < 4; i++) {
    const playerCard = document.createElement('div');
    playerCard.className = 'room-player-card';
    
    if (sala.players[i]) {
      const player = sala.players[i];
      
      // Fetch player stats
      try {
        const response = await fetch(`${SERVER_URL}/stats/${player.nick}`);
        const data = await response.json();
        
        if (data.success) {
          const stats = data.stats;
          const nivel = stats.nivel || 1;
          const exp = stats.exp || 0;
          const victories = stats.victories || 0;
          const kills = stats.totalKills || 0;
          const deaths = stats.totalDeaths || 0;
          const kda = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
          
          // Calcular progreso de experiencia usando la tabla correcta
          const expForCurrentLevel = getExpForLevel(nivel);
          const expForNextLevel = getExpForLevel(nivel + 1);
          const expProgress = Math.max(0, exp - expForCurrentLevel);
          const expNeeded = expForNextLevel - expForCurrentLevel;
          const progressPercent = Math.min(100, (expProgress / expNeeded) * 100);
          
          playerCard.innerHTML = `
            <div class="room-player-card-header">
              <div class="player-avatar">
                <img src="ranks/${nivel}.png" alt="Rango ${nivel}" class="rank-badge">
              </div>
              <div class="room-player-info">
                <div class="room-player-name">${player.nick}</div>
                <div class="room-player-title">⚔️ Guerrero</div>
              </div>
              ${player.nick === sala.host.nick ? '<div class="crown-icon">👑</div>' : ''}
              ${user.nick === sala.host.nick && player.nick !== sala.host.nick ? `<button class="kick-player-btn" data-nick="${player.nick}" title="Expulsar jugador">✕</button>` : ''}
            </div>
            <div class="room-player-stats">
              <div class="stat-row">
                <div class="stat-item">
                  <div class="stat-label">🏆 Victorias</div>
                  <div class="stat-value">${victories}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">⚔️ K/D/A</div>
                  <div class="stat-value">${kda}</div>
                </div>
              </div>
              <div class="exp-bar-container">
                <div class="exp-bar-label">
                  <span>💫 Experiencia</span>
                  <span class="exp-numbers">Exp: ${exp}</span>
                </div>
                <div class="exp-bar">
                  <div class="exp-bar-fill" style="width: ${progressPercent}%">
                    <div class="exp-bar-shine"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="room-player-status ready">
              <span class="status-dot"></span> Listo
            </div>
          `;
        }
      } catch (error) {
        console.error('Error fetching player stats:', error);
        // Renderizado básico si falla la petición
        const nivel = player.nivel || 1;
        playerCard.innerHTML = `
          <div class="room-player-card-header">
            <div class="player-avatar">
              <img src="ranks/${nivel}.png" alt="Rango ${nivel}" class="rank-badge">
            </div>
            <div class="room-player-info">
              <div class="room-player-name">${player.nick}</div>
              <div class="room-player-title">⚔️ Guerrero</div>
            </div>
            ${player.nick === sala.host.nick ? '<div class="crown-icon">👑</div>' : ''}
            ${user.nick === sala.host.nick && player.nick !== sala.host.nick ? `<button class="kick-player-btn" data-nick="${player.nick}" title="Expulsar jugador">✕</button>` : ''}
          </div>
          <div class="room-player-status ready">
            <span class="status-dot"></span> Listo
          </div>
        `;
      }
      
      playerCard.classList.add('occupied');
    } else {
      // Slot vacante
      playerCard.classList.add('vacant');
      playerCard.innerHTML = `
        <div class="vacant-slot">
          <div class="vacant-icon">👤</div>
          <div class="vacant-text">Esperando jugador...</div>
        </div>
      `;
    }
    
    playersGrid.appendChild(playerCard);
  }
  
  // Mostrar botón de iniciar solo para el host
  if (user.nick === sala.host.nick) {
    startBtn.style.display = 'inline-flex';
  } else {
    startBtn.style.display = 'none';
  }
  
  // Agregar event listeners para los botones de kick
  const kickButtons = document.querySelectorAll('.kick-player-btn');
  kickButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nickToKick = btn.getAttribute('data-nick');
      kickPlayer(nickToKick);
    });
  });
  
  // Marcar que terminó el renderizado
  isRendering = false;
}

// Función para expulsar un jugador de la sala (solo el host puede hacerlo)
async function kickPlayer(nickToKick) {
  if (!confirm(`¿Estás seguro de que quieres expulsar a ${nickToKick} de la sala?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${SERVER_URL}/kick-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomId: roomId, 
        hostNick: user.nick,
        kickNick: nickToKick 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Jugador ${nickToKick} expulsado de la sala`);
      // La sala se actualizará automáticamente con el evento del socket
    } else {
      alert(data.error || 'No se pudo expulsar al jugador');
    }
  } catch (error) {
    console.error('Error al expulsar jugador:', error);
    alert('Error al conectar con el servidor');
  }
}

// Función auxiliar para calcular experiencia necesaria por nivel
// Esta función retorna la experiencia BASE (mínima) para alcanzar ese nivel
function getExpForLevel(level) {
  // Tabla de experiencia basada en el backend
  const expTable = {
    1: 0,      // Nivel 1: de 0 a 199 exp (200 exp necesaria)
    2: 200,    // Nivel 2: de 200 a 449 exp (250 exp necesaria)
    3: 450,    // Nivel 3: de 450 a 799 exp (350 exp necesaria)
    4: 800,    // Nivel 4: de 800 a 1449 exp (650 exp necesaria)
    5: 1450,   // Nivel 5: de 1450 a 2349 exp (900 exp necesaria)
    6: 2350,   // Nivel 6: de 2350 a 3399 exp (1050 exp necesaria)
    7: 3400,   // Nivel 7: de 3400 a 4899 exp (1500 exp necesaria)
    8: 4900,   // Nivel 8: de 4900 a 6399 exp (1500 exp necesaria)
    9: 6400,   // Nivel 9: de 6400 a 8799 exp (2400 exp necesaria)
    10: 8800,  // Nivel 10: de 8800 a 10499 exp (1700 exp necesaria)
    11: 10500, // Nivel 11: de 10500 a 14499 exp (4000 exp necesaria)
    12: 14500, // Nivel 12: de 14500 a 19099 exp (4600 exp necesaria)
    13: 19100, // Nivel 13: de 19100 a 24699 exp (5600 exp necesaria)
    14: 24700, // Nivel 14: de 24700 a 32499 exp (7800 exp necesaria)
    15: 32500, // Nivel 15: de 32500 a 39999 exp (7500 exp necesaria)
    16: 40000, // Nivel 16+: más de 40000 exp
  };
  
  // Si el nivel está en la tabla, retornar el valor
  if (expTable[level] !== undefined) {
    return expTable[level];
  }
  
  // Para niveles mayores a 16, usar el último valor conocido
  return 40000;
}

async function cargarSala() {
  // Resetear estado de rondas al cargar sala (siempre empezar con Round 1)
  mostrarSoloProyectilQ = false;
  currentRound = 1;
  // No mostrar HUD de rondas aquí, solo cuando se inicie la partida
  try {
  const res = await fetch(`${SERVER_URL}/rooms`);
    const data = await res.json();
    if (data.success) {
      sala = data.salas.find(s => s.id === roomId);
      renderSala(sala);
      if (sala) {
        // Unirse a la sala de sockets con stats calculadas
        // Usar getUser de ShopSystem para obtener datos migrados
        const user = window.ShopSystem ? window.ShopSystem.getUser() : JSON.parse(localStorage.getItem('batlesd_user'));
        
        // Calcular stats del jugador usando el sistema de tienda
        let playerColor = '#f4c2a0';
        let playerStats = { health: 200, damage: 0, speed: 3.5, maxHealth: 200 };
        
        if (window.ShopSystem && user?.equipped) {
          playerColor = window.ShopSystem.getEquippedColor(user.equipped);
          playerStats = window.ShopSystem.calculatePlayerStats(user.equipped);
          
          // Debug: mostrar stats calculadas
          console.log('🎨 Color equipado:', user.equipped.color);
          console.log('🎨 Color hex:', playerColor);
          console.log('📊 Stats calculadas:', playerStats);
        }
        
        socket.emit('joinRoom', { 
          roomId, 
          color: playerColor, 
          nick: user.nick,
          stats: playerStats // Enviar stats completas al servidor
        });
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
  fetch(`${SERVER_URL}/delete-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId })
    }).then(() => {
      localStorage.removeItem('batlesd_room_id');
      window.location.href = 'menu.html';
    });
  } else {
    // Eliminar jugador de la sala en el backend
  fetch(`${SERVER_URL}/leave-room`, {
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

socket.on('availableUpgrades', (data) => {
  if (data.nick === user.nick) {
    availableUpgrades = data.upgrades;
    console.log('Available upgrades received:', availableUpgrades.length, availableUpgrades.map(m => m.nombre));
    // mostrarHUDMejoras();
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
      spectMsg.style.fontSize = '1.5rem';
      spectMsg.style.padding = '16px 32px';
      spectMsg.style.borderRadius = '12px';
      spectMsg.style.zIndex = '2000';
      spectMsg.style.textAlign = 'center';
      spectMsg.style.width = '350px';
      spectMsg.style.maxWidth = '90vw';
      document.body.appendChild(spectMsg);
    }
    // Actualizar texto con el jugador que está siguiendo
    if (spectatorTarget) {
      spectMsg.innerHTML = `💀 Has muerto<br><span style="font-size: 1.1rem; color: #ffd700;">Siguiendo a: ${spectatorTarget}</span>`;
    } else {
      spectMsg.textContent = '💀 Has muerto - Esperando...';
    }
  } else if (spectMsg) {
    spectMsg.remove();
  }
}

// Llamar tras cada playersUpdate
socket.on('playersUpdate', () => { checkSpectatorMode(); });

// Evento cuando un jugador muere: crear tumba
socket.on('playerDied', (data) => {
  // Agregar tumba en la posición donde murió el jugador
  tumbas.push({
    nick: data.nick,
    x: data.x,
    y: data.y
  });
  console.log(`[TUMBA] ${data.nick} murió en (${data.x}, ${data.y})`);
});

// Evento de fin de ronda: mostrar solo mejoras proyectilQ
socket.on('roundEnded', (data) => {
  mostrarHUDRondas();
  mostrarSoloProyectilQ = true;
  activeMuddyGrounds = []; // Clear muddy grounds
  activeSacredGrounds = []; // Clear sacred grounds
  window.murosDePiedra = []; // Clear walls
  tumbas = []; // Limpiar tumbas al final de cada ronda
  spectatorTarget = null; // Resetear espectador
  currentRound++;
  if (currentRound >= 2 && currentRound <= 7) {
    mostrarHUDAumentosRonda2();
  }
  if (currentRound >= 6) { // Para rondas 6+ mostrar proyectilQ, rondas 1 y 2 usan availableUpgrades
    // mostrarHUDMejoras(true);
  }
  if (currentRound >= 6) {
    availableUpgrades = null; // Resetear para rondas posteriores
  }
  // Limpiar explosiones
  explosions.length = 0;
});

// Evento de inicio de ronda: resetear modo espectador
socket.on('roundStarted', () => {
  spectatorTarget = null; // Volver al jugador local al iniciar nueva ronda
  const spectMsg = document.getElementById('spectatorMsg');
  if (spectMsg) spectMsg.remove();
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
    // Permitir stack ilimitado para aumentos con stack:true, y sin duplicados para los demás
    const mejorasUnicas = [];
    for (const m of data.mejoras) {
      if (m.stack) {
        // Siempre agregar aumentos con stack:true
        mejorasUnicas.push(m);
      } else {
        // No permitir duplicados para los demás
        if (!mejorasUnicas.some(mu => mu.id === m.id)) {
          mejorasUnicas.push(m);
        }
      }
    }
    player.mejoras = mejorasUnicas;
    if (data.nick === user.nick) {
      mejorasJugador = mejorasUnicas;
      // Separar mejoras normales de mejoras Q
      const mejorasNormales = mejorasJugador.filter(m => !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio && !m.aumento);
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

socket.on('startBattle', () => {
  iniciarCombate();
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

  // Overlay con efecto de desenfoque
  const overlay = document.createElement('div');
  overlay.id = 'gameEndOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(75, 0, 130, 0.3) 0%, rgba(0,0,0,0.9) 100%)';
  overlay.style.backdropFilter = 'blur(12px)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.5s ease-out';
  document.body.appendChild(overlay);

  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'gameEndModal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
  modal.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
  modal.style.padding = '48px 56px';
  modal.style.borderRadius = '32px';
  modal.style.boxShadow = '0 30px 100px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.1), inset 0 2px 0 rgba(255,255,255,0.2)';
  modal.style.zIndex = '1000';
  modal.style.textAlign = 'center';
  modal.style.width = 'auto';
  modal.style.maxWidth = '90vw';
  modal.style.maxHeight = '85vh';
  modal.style.overflowY = 'auto';
  modal.style.animation = 'slideInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

  // Asegurar animaciones CSS
  if (!document.getElementById('gameEndAnimations')) {
    const style = document.createElement('style');
    style.id = 'gameEndAnimations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.7);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); }
        50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.9); }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-15px) rotate(10deg); }
      }
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      #gameEndModal::-webkit-scrollbar {
        width: 10px;
      }
      #gameEndModal::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.1);
        border-radius: 5px;
      }
      #gameEndModal::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 5px;
      }
      #gameEndModal::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
      }
    `;
    document.head.appendChild(style);
  }

  // Contenedor del título con decoración
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '32px';

  // Icono de trofeo animado
  const trophy = document.createElement('div');
  trophy.textContent = '🏆';
  trophy.style.fontSize = '5rem';
  trophy.style.marginBottom = '16px';
  trophy.style.filter = 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))';
  trophy.style.animation = 'bounce 2s ease-in-out infinite';
  titleContainer.appendChild(trophy);

  // Título principal
  const title = document.createElement('h1');
  title.textContent = '🎮 Fin del Juego 🎮';
  title.style.fontSize = '3rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #ffd700, #ffed4e, #fff59d, #ffed4e, #ffd700)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0 0 12px 0';
  title.style.textShadow = '0 0 40px rgba(255, 215, 0, 0.6)';
  titleContainer.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.textContent = stats.length === 1 ? '🏃 Victoria por Abandono' : '📊 Resultados de la Batalla';
  subtitle.style.fontSize = '1.3rem';
  subtitle.style.color = 'rgba(255,255,255,0.95)';
  subtitle.style.fontWeight = '600';
  subtitle.style.letterSpacing = '1px';
  titleContainer.appendChild(subtitle);

  modal.appendChild(titleContainer);

  // Ganador con diseño destacado
  const winnerContainer = document.createElement('div');
  winnerContainer.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))';
  winnerContainer.style.padding = '24px 32px';
  winnerContainer.style.borderRadius = '20px';
  winnerContainer.style.marginBottom = '32px';
  winnerContainer.style.border = '3px solid rgba(255, 215, 0, 0.6)';
  winnerContainer.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.3), inset 0 2px 0 rgba(255,255,255,0.3)';
  winnerContainer.style.animation = 'pulseGlow 2s infinite';

  const crownIcon = document.createElement('div');
  crownIcon.textContent = '👑';
  crownIcon.style.fontSize = '3rem';
  crownIcon.style.marginBottom = '8px';
  crownIcon.style.filter = 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))';
  winnerContainer.appendChild(crownIcon);

  const winnerLabel = document.createElement('div');
  winnerLabel.textContent = 'GANADOR';
  winnerLabel.style.fontSize = '1rem';
  winnerLabel.style.color = 'rgba(255,255,255,0.9)';
  winnerLabel.style.fontWeight = '700';
  winnerLabel.style.letterSpacing = '3px';
  winnerLabel.style.marginBottom = '8px';
  winnerContainer.appendChild(winnerLabel);

  const winnerName = document.createElement('div');
  winnerName.textContent = winner;
  winnerName.style.fontSize = '2.2rem';
  winnerName.style.fontWeight = '900';
  winnerName.style.color = '#fff';
  winnerName.style.textShadow = '0 4px 12px rgba(0,0,0,0.4)';
  winnerContainer.appendChild(winnerName);

  // Mensaje adicional si ganó por abandono
  if (stats.length === 1) {
    const abandonMessage = document.createElement('div');
    abandonMessage.textContent = '¡Los demás jugadores abandonaron!';
    abandonMessage.style.fontSize = '1rem';
    abandonMessage.style.color = 'rgba(255,255,255,0.85)';
    abandonMessage.style.fontWeight = '600';
    abandonMessage.style.marginTop = '8px';
    abandonMessage.style.fontStyle = 'italic';
    winnerContainer.appendChild(abandonMessage);
  }

  modal.appendChild(winnerContainer);

  // Contenedor de estadísticas
  const statsContainer = document.createElement('div');
  statsContainer.style.display = 'flex';
  statsContainer.style.flexDirection = 'column';
  statsContainer.style.gap = '16px';
  statsContainer.style.marginBottom = '32px';

  stats.forEach((stat, idx) => {
    const isWinner = stat.nick === winner;
    
    const statCard = document.createElement('div');
    statCard.style.background = isWinner 
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 193, 7, 0.15))'
      : 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))';
    statCard.style.padding = '20px 24px';
    statCard.style.borderRadius = '18px';
    statCard.style.border = isWinner 
      ? '2px solid rgba(255, 215, 0, 0.5)'
      : '2px solid rgba(255,255,255,0.2)';
    statCard.style.boxShadow = isWinner
      ? '0 6px 24px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
      : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
    statCard.style.animation = `slideUp 0.5s ease-out ${idx * 0.1}s backwards`;
    statCard.style.position = 'relative';
    statCard.style.overflow = 'hidden';

    // Medalla de posición
    const positionBadge = document.createElement('div');
    positionBadge.textContent = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    positionBadge.style.position = 'absolute';
    positionBadge.style.top = '12px';
    positionBadge.style.right = '12px';
    positionBadge.style.fontSize = '2rem';
    positionBadge.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))';
    statCard.appendChild(positionBadge);

    // Nombre del jugador
    const playerName = document.createElement('div');
    playerName.textContent = stat.nick;
    playerName.style.fontSize = '1.5rem';
    playerName.style.fontWeight = '800';
    playerName.style.color = '#fff';
    playerName.style.marginBottom = '12px';
    playerName.style.textAlign = 'left';
    playerName.style.textShadow = '0 2px 8px rgba(0,0,0,0.3)';
    statCard.appendChild(playerName);

    // Grid de estadísticas
    const statsGrid = document.createElement('div');
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    statsGrid.style.gap = '12px';

    const statsData = [
      { icon: '⚔️', label: 'Kills', value: stat.kills, color: '#ff5252' },
      { icon: '💀', label: 'Muertes', value: stat.deaths, color: '#9e9e9e' },
      { icon: '🏆', label: 'Victorias', value: stat.victories, color: '#ffd700' },
      { icon: '✨', label: 'EXP', value: stat.exp, color: '#64b5f6' },
      { icon: '💰', label: 'Oro', value: stat.gold || 0, color: '#ffc107' }
    ];

    statsData.forEach(data => {
      const statItem = document.createElement('div');
      statItem.style.background = 'rgba(0,0,0,0.2)';
      statItem.style.padding = '12px';
      statItem.style.borderRadius = '12px';
      statItem.style.border = '1px solid rgba(255,255,255,0.1)';
      statItem.style.textAlign = 'center';

      const iconLabel = document.createElement('div');
      iconLabel.style.fontSize = '1.5rem';
      iconLabel.style.marginBottom = '4px';
      iconLabel.textContent = data.icon;
      statItem.appendChild(iconLabel);

      const label = document.createElement('div');
      label.textContent = data.label;
      label.style.fontSize = '0.8rem';
      label.style.color = 'rgba(255,255,255,0.7)';
      label.style.fontWeight = '600';
      label.style.marginBottom = '4px';
      statItem.appendChild(label);

      const value = document.createElement('div');
      value.textContent = data.value;
      value.style.fontSize = '1.4rem';
      value.style.fontWeight = '900';
      value.style.color = data.color;
      value.style.textShadow = `0 2px 8px ${data.color}88`;
      statItem.appendChild(value);

      statsGrid.appendChild(statItem);
    });

    statCard.appendChild(statsGrid);
    statsContainer.appendChild(statCard);
  });

  modal.appendChild(statsContainer);

  // Temporizador con diseño mejorado
  const timerContainer = document.createElement('div');
  timerContainer.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))';
  timerContainer.style.padding = '20px 32px';
  timerContainer.style.borderRadius = '18px';
  timerContainer.style.border = '2px solid rgba(255,255,255,0.3)';
  timerContainer.style.marginTop = '24px';

  let timeLeft = 12;
  const countdown = document.createElement('div');
  countdown.textContent = `⏱️ Regresando al menú en ${timeLeft}s`;
  countdown.style.fontSize = '1.5rem';
  countdown.style.fontWeight = '900';
  countdown.style.background = 'linear-gradient(135deg, #fff, #e0e0e0)';
  countdown.style.WebkitBackgroundClip = 'text';
  countdown.style.WebkitTextFillColor = 'transparent';
  countdown.style.backgroundClip = 'text';
  timerContainer.appendChild(countdown);
  modal.appendChild(timerContainer);

  const interval = setInterval(() => {
    timeLeft--;
    countdown.textContent = `⏱️ Regresando al menú en ${timeLeft}s`;
    
    // Efecto de urgencia cuando queda poco tiempo
    if (timeLeft <= 3) {
      countdown.style.background = 'linear-gradient(135deg, #ff5252, #ff1744)';
      countdown.style.WebkitBackgroundClip = 'text';
      countdown.style.backgroundClip = 'text';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
      timerContainer.style.border = '2px solid rgba(255, 82, 82, 0.6)';
    }
    
    if (timeLeft <= 0) {
      clearInterval(interval);
      // Distribuir exp y cerrar
      socket.emit('gameAccepted', { stats: stats, winner: winner });
      overlay.remove();
      modal.remove();
      window.location.href = 'menu.html';
    }
  }, 1000);

  document.body.appendChild(modal);
}

// Función para mostrar HUD profesional de selección de mejoras para la ronda 1, con 3 habilidades al azar por sección, colores, tooltips y temporizador.
function mostrarHUDSeleccionHabilidades() {
  // Oculta el HUD antiguo si existe
  const hudAntiguo = document.getElementById('hudMejorasInicial');
  if (hudAntiguo) hudAntiguo.remove();
  if (document.getElementById('habilidadesHUD')) return;
  hudVisible = true;

  // Overlay oscuro de fondo
  const overlay = document.createElement('div');
  overlay.id = 'habilidadesOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.92) 100%)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.4s ease-out';
  document.body.appendChild(overlay);

  const hud = document.createElement('div');
  hud.id = 'habilidadesHUD';
  hud.style.position = 'fixed';
  hud.style.top = '50%';
  hud.style.left = '50%';
  hud.style.transform = 'translate(-50%, -50%) scale(0.9)';
  hud.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  hud.style.padding = '24px 32px';
  hud.style.borderRadius = '24px';
  hud.style.boxShadow = '0 20px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)';
  hud.style.zIndex = '1000';
  hud.style.pointerEvents = 'none';
  hud.style.textAlign = 'center';
  hud.style.width = 'auto';
  hud.style.maxWidth = '95vw';
  hud.style.maxHeight = '95vh';
  hud.style.animation = 'slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  hud.style.backdropFilter = 'blur(10px)';
  hud.style.display = 'flex';
  hud.style.flexDirection = 'column';
  hud.style.overflow = 'hidden';

  // Añadir keyframes de animación
  if (!document.getElementById('skillSelectorAnimations')) {
    const style = document.createElement('style');
    style.id = 'skillSelectorAnimations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(255,255,255,0.3);
        }
        50% {
          box-shadow: 0 0 35px rgba(255,255,255,0.5);
        }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Título principal compacto
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '20px';
  titleContainer.style.flexShrink = '0';
  
  const title = document.createElement('h2');
  title.textContent = '⚡ Selecciona tus Habilidades ⚡';
  title.style.fontSize = '2rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0';
  title.style.textShadow = '0 0 30px rgba(255,255,255,0.5)';
  titleContainer.appendChild(title);

  hud.appendChild(titleContainer);

  // Contenedor de habilidades en grid 2x2
  const mainGrid = document.createElement('div');
  mainGrid.style.display = 'grid';
  mainGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  mainGrid.style.gap = '16px';
  mainGrid.style.width = '100%';
  mainGrid.style.maxWidth = '1100px';
  mainGrid.style.flexGrow = '1';
  mainGrid.style.alignItems = 'start';

  // Crear secciones para cada tecla con iconos mejorados
  const teclas = [
    { 
      nombre: 'Click Izquierdo', 
      icono: '🖱️',
      color: '#3498db',
      filtro: m => m.proyectil && !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio 
    },
    { 
      nombre: 'Q', 
      icono: '🔥',
      color: '#e74c3c',
      filtro: m => m.proyectilQ 
    },
    { 
      nombre: 'E', 
      icono: '🛡️',
      color: '#9b59b6',
      filtro: m => m.proyectilE 
    },
    { 
      nombre: 'Espacio', 
      icono: '⚡',
      color: '#f1c40f',
      filtro: m => m.proyectilEspacio 
    }
  ];

  // Variables para guardar las habilidades disponibles de cada tecla
  const habilidadesDisponibles = {
    'Click Izquierdo': [],
    'Q': [],
    'E': [],
    'Espacio': []
  };

  // Variables para rastrear si el jugador ya seleccionó cada habilidad
  let clickSeleccionado = false;
  let qSeleccionado = false;
  let eSeleccionado = false;
  let espacioSeleccionado = false;

  teclas.forEach((tecla, idx) => {
    const section = document.createElement('div');
    section.style.padding = '16px';
    section.style.background = 'rgba(255,255,255,0.03)';
    section.style.borderRadius = '16px';
    section.style.border = '1px solid rgba(255,255,255,0.08)';
    section.style.transition = 'all 0.3s ease';
    section.style.animation = `slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.1}s backwards`;
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.height = '100%';
    
    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.alignItems = 'center';
    labelContainer.style.justifyContent = 'center';
    labelContainer.style.gap = '8px';
    labelContainer.style.marginBottom = '12px';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = tecla.icono;
    iconSpan.style.fontSize = '1.5rem';
    iconSpan.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.3))';
    labelContainer.appendChild(iconSpan);

    const label = document.createElement('h3');
    label.textContent = tecla.nombre === 'Click Izquierdo' ? 'Click' : tecla.nombre;
    label.style.fontSize = '1.2rem';
    label.style.fontWeight = '800';
    label.style.background = `linear-gradient(135deg, ${tecla.color}, ${tecla.color}dd)`;
    label.style.WebkitBackgroundClip = 'text';
    label.style.WebkitTextFillColor = 'transparent';
    label.style.backgroundClip = 'text';
    label.style.margin = '0';
    labelContainer.appendChild(label);

    section.appendChild(labelContainer);
    
    // Seleccionar 3 habilidades al azar para cada sección
    let habilidades = MEJORAS.filter(tecla.filtro);
    if (habilidades.length > 3) {
      habilidades = habilidades
        .map(h => ({h, sort: Math.random()}))
        .sort((a, b) => a.sort - b.sort)
        .map(({h}) => h)
        .slice(0, 3);
    }
    
    // Guardar las habilidades disponibles para esta tecla
    habilidadesDisponibles[tecla.nombre] = habilidades;
    
    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap = '8px';
    grid.style.flexGrow = '1';

    habilidades.forEach((hab, habIdx) => {
      const btnWrapper = document.createElement('div');
      btnWrapper.style.position = 'relative';
      btnWrapper.style.animation = `slideInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${(idx * 0.1) + (habIdx * 0.1)}s backwards`;

      const btn = document.createElement('button');
      btn.textContent = hab.nombre;
      btn.style.padding = '12px 20px';
      btn.style.borderRadius = '12px';
      btn.style.border = `2px solid ${hab.color}`;
      btn.style.background = `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`;
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = '700';
      btn.style.fontSize = '0.95rem';
      btn.style.color = '#fff';
      btn.style.boxShadow = `0 4px 15px ${hab.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`;
      btn.style.pointerEvents = 'auto';
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      btn.style.width = '100%';
      btn.style.textShadow = `0 2px 8px ${hab.color}88`;
      btn.style.whiteSpace = 'nowrap';
      btn.style.textOverflow = 'ellipsis';

      // Efecto de brillo en hover
      const shine = document.createElement('span');
      shine.style.position = 'absolute';
      shine.style.top = '0';
      shine.style.left = '-100%';
      shine.style.width = '100%';
      shine.style.height = '100%';
      shine.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)';
      shine.style.transition = 'left 0.5s';
      shine.style.pointerEvents = 'none';
      btn.appendChild(shine);

      btn.onmouseenter = (e) => {
        btn.style.background = `linear-gradient(135deg, ${hab.color}55 0%, ${hab.color}33 100%)`;
        btn.style.transform = 'translateY(-2px) scale(1.03)';
        btn.style.boxShadow = `0 6px 25px ${hab.color}60, inset 0 1px 0 rgba(255,255,255,0.2)`;
        shine.style.left = '100%';
        
        // Tooltip mejorado
        let tooltip = document.createElement('div');
        tooltip.className = 'mejora-tooltip';
        tooltip.textContent = hab.descripcion || '';
        tooltip.style.position = 'fixed';
        tooltip.style.left = (e.clientX + 20) + 'px';
        tooltip.style.top = (e.clientY - 15) + 'px';
        tooltip.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '12px 16px';
        tooltip.style.borderRadius = '10px';
        tooltip.style.fontSize = '0.9rem';
        tooltip.style.zIndex = '2000';
        tooltip.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
        tooltip.style.maxWidth = '280px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.border = `1px solid ${hab.color}`;
        tooltip.style.animation = 'fadeIn 0.2s ease-out';
        document.body.appendChild(tooltip);
        btn._tooltip = tooltip;
      };
      
      btn.onmouseleave = () => {
        btn.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)';
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.boxShadow = `0 4px 15px ${hab.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`;
        shine.style.left = '-100%';
        if (btn._tooltip) {
          btn._tooltip.remove();
          btn._tooltip = null;
        }
      };
      
      btn.onclick = () => {
        // Oculta todos los botones menos el seleccionado
        Array.from(grid.children).forEach(child => {
          const childBtn = child.querySelector('button');
          if (childBtn !== btn) {
            child.style.opacity = '0.3';
            child.style.transform = 'scale(0.95)';
            childBtn.style.pointerEvents = 'none';
          } else {
            childBtn.style.background = `linear-gradient(135deg, ${hab.color} 0%, ${hab.color}dd 100%)`;
            childBtn.style.color = '#fff';
            childBtn.style.transform = 'translateY(-2px) scale(1.05)';
            childBtn.style.boxShadow = `0 8px 30px ${hab.color}80, inset 0 2px 4px rgba(255,255,255,0.3)`;
            childBtn.style.animation = 'pulseGlow 1.5s infinite';
            
            // Efecto de confeti
            for (let i = 0; i < 15; i++) {
              const particle = document.createElement('div');
              particle.style.position = 'fixed';
              particle.style.width = '5px';
              particle.style.height = '5px';
              particle.style.background = hab.color;
              particle.style.borderRadius = '50%';
              particle.style.pointerEvents = 'none';
              particle.style.zIndex = '1001';
              const rect = btn.getBoundingClientRect();
              particle.style.left = (rect.left + rect.width / 2) + 'px';
              particle.style.top = (rect.top + rect.height / 2) + 'px';
              document.body.appendChild(particle);
              
              const angle = (Math.PI * 2 * i) / 15;
              const velocity = 2 + Math.random() * 2;
              const vx = Math.cos(angle) * velocity;
              const vy = Math.sin(angle) * velocity;
              
              let posX = 0, posY = 0;
              let opacity = 1;
              const animate = () => {
                posX += vx;
                posY += vy;
                opacity -= 0.02;
                particle.style.transform = `translate(${posX}px, ${posY}px)`;
                particle.style.opacity = opacity;
                if (opacity > 0) {
                  requestAnimationFrame(animate);
                } else {
                  particle.remove();
                }
              };
              requestAnimationFrame(animate);
            }
          }
        });
        
        socket.emit('selectUpgrade', { roomId, mejoraId: hab.id });
        // Set local variable for immediate use
        if (tecla.nombre === 'Click Izquierdo') {
          mejoraSeleccionada = hab;
          clickSeleccionado = true;
        } else if (tecla.nombre === 'Q') {
          mejoraQSeleccionada = hab;
          qSeleccionado = true;
        } else if (tecla.nombre === 'E') {
          eSeleccionado = true;
        } else if (tecla.nombre === 'Espacio') {
          espacioSeleccionado = true;
        }
        // For E and Espacio, they will be added to mejorasJugador via playerUpgraded event
      };
      
      btnWrapper.appendChild(btn);
      grid.appendChild(btnWrapper);
    });
    
    section.appendChild(grid);
    mainGrid.appendChild(section);
  });

  hud.appendChild(mainGrid);

  // Temporizador con diseño mejorado
  const timerContainer = document.createElement('div');
  timerContainer.style.marginTop = '20px';
  timerContainer.style.padding = '12px 24px';
  timerContainer.style.background = 'linear-gradient(135deg, rgba(46, 125, 50, 0.2), rgba(27, 94, 32, 0.2))';
  timerContainer.style.borderRadius = '12px';
  timerContainer.style.border = '2px solid rgba(76, 175, 80, 0.5)';
  timerContainer.style.flexShrink = '0';
  
  const timerDiv = document.createElement('div');
  timerDiv.style.fontSize = '1.4rem';
  timerDiv.style.fontWeight = '900';
  timerDiv.style.background = 'linear-gradient(135deg, #4caf50, #81c784)';
  timerDiv.style.WebkitBackgroundClip = 'text';
  timerDiv.style.WebkitTextFillColor = 'transparent';
  timerDiv.style.backgroundClip = 'text';
  timerDiv.textContent = '⏱️ Tiempo restante: 30s';
  timerContainer.appendChild(timerDiv);
  hud.appendChild(timerContainer);

  let timeLeft = 30;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `⏱️ Tiempo restante: ${timeLeft}s`;
    
    // Cambiar color cuando queda poco tiempo
    if (timeLeft <= 10) {
      timerDiv.style.background = 'linear-gradient(135deg, #f44336, #ff5722)';
      timerDiv.style.WebkitBackgroundClip = 'text';
      timerDiv.style.backgroundClip = 'text';
      timerContainer.style.background = 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2))';
      timerContainer.style.border = '2px solid rgba(244, 67, 54, 0.5)';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      
      // Asignar habilidades aleatorias a las que no fueron seleccionadas
      if (!clickSeleccionado && habilidadesDisponibles['Click Izquierdo'].length > 0) {
        const habAleatoria = habilidadesDisponibles['Click Izquierdo'][Math.floor(Math.random() * habilidadesDisponibles['Click Izquierdo'].length)];
        mejoraSeleccionada = habAleatoria;
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      if (!qSeleccionado && habilidadesDisponibles['Q'].length > 0) {
        const habAleatoria = habilidadesDisponibles['Q'][Math.floor(Math.random() * habilidadesDisponibles['Q'].length)];
        mejoraQSeleccionada = habAleatoria;
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      if (!eSeleccionado && habilidadesDisponibles['E'].length > 0) {
        const habAleatoria = habilidadesDisponibles['E'][Math.floor(Math.random() * habilidadesDisponibles['E'].length)];
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      if (!espacioSeleccionado && habilidadesDisponibles['Espacio'].length > 0) {
        const habAleatoria = habilidadesDisponibles['Espacio'][Math.floor(Math.random() * habilidadesDisponibles['Espacio'].length)];
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      ocultarHUDSeleccionHabilidades();
      socket.emit('startBattle', { roomId });
    }
  }, 1000);

  document.body.appendChild(hud);
}

function ocultarHUDSeleccionHabilidades() {
  hudVisible = false;
  
  // Eliminar todos los tooltips inmediatamente
  document.querySelectorAll('.mejora-tooltip').forEach(t => t.remove());
  
  const hud = document.getElementById('habilidadesHUD');
  const overlay = document.getElementById('habilidadesOverlay');
  
  if (hud) {
    hud.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => hud.remove(), 300);
  }
  
  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => overlay.remove(), 300);
  }
}
