// Determine server URL based on environment
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'http://138.68.250.124:3000';

// Conectar a Socket.IO para rastrear jugadores en línea
const socket = io(SERVER_URL);

// Mostrar el nick del usuario
let user = JSON.parse(localStorage.getItem('batlesd_user'));

// Compatibilidad con usuarios antiguos: si no tienen username, usar nick como username
if (user && !user.username && user.nick) {
  user.username = user.nick;
  localStorage.setItem('batlesd_user', JSON.stringify(user));
}

// Referencias a elementos del DOM
const playerName = document.getElementById('playerName');
const playerExp = document.getElementById('playerExp');
const playerVictories = document.getElementById('playerVictories');
const playerLevel = document.getElementById('playerLevel');
const playerRankImg = document.getElementById('playerRankImg');

async function actualizarStatsUsuario() {
  if (!user || !user.username) return;
  try {
    const res = await fetch(`${SERVER_URL}/stats/${user.nick}`);
    const data = await res.json();
    if (data.success && data.stats) {
      // Preservar inventory y equipped actuales antes de actualizar
      const currentInventory = user.inventory;
      const currentEquipped = user.equipped;
      
      user.exp = data.stats.exp;
      user.nivel = data.stats.nivel || user.nivel;
      user.victories = data.stats.victories || 0;
      user.totalKills = data.stats.totalKills || 0;
      user.totalDeaths = data.stats.totalDeaths || 0;
      user.nicknameChanged = data.stats.nicknameChanged || 0;
      user.gold = data.stats.gold || 0;
      // Actualizar el nick también en caso de que haya cambiado
      user.nick = data.stats.nick || user.nick;
      
      // Restaurar inventory y equipped desde el servidor (tienen prioridad) o desde localStorage
      user.inventory = data.stats.inventory || currentInventory || { colors: [], hats: [], weapons: [], tombs: [] };
      user.equipped = data.stats.equipped || currentEquipped || { color: null, hat: null, weapon: null, tomb: null };
      
      localStorage.setItem('batlesd_user', JSON.stringify(user));
      
      // Actualizar UI
      actualizarUI();
    }
  } catch (e) {
    console.error('Error al actualizar stats:', e);
  }
}

function actualizarUI() {
  // Actualizar nombre del jugador
  playerName.textContent = user.nick;
  
  // Actualizar experiencia
  playerExp.textContent = user.exp || 0;
  
  // Actualizar victorias
  playerVictories.textContent = user.victories || 0;
  
  // Actualizar oro usando el sistema de tienda
  if (window.ShopSystem) {
    window.ShopSystem.updateGoldDisplay();
  } else {
    // Fallback si tienda.js no está cargado aún
    const playerGoldElement = document.getElementById('playerGold');
    if (playerGoldElement) {
      playerGoldElement.textContent = user.gold || 0;
    }
  }
  
  // Actualizar nivel (si existe el elemento)
  if (playerLevel) {
    playerLevel.textContent = user.nivel || 1;
  }
  
  // Actualizar imagen de rango
  const nivelActual = user.nivel || 1;
  playerRankImg.innerHTML = `<img src="ranks/${nivelActual}.png" alt="Rango ${nivelActual}" onerror="this.src='ranks/1.png'">`;
  
  // Actualizar estado del botón de editar nickname
  const editNicknameBtn = document.getElementById('editNicknameBtn');
  if (editNicknameBtn) {
    if (user.nicknameChanged >= 1) {
      editNicknameBtn.disabled = true;
      editNicknameBtn.title = 'Ya cambiaste tu nombre anteriormente';
    } else {
      editNicknameBtn.disabled = false;
      editNicknameBtn.title = 'Cambiar nombre';
    }
  }
}

if (user && user.nick && user.username) {
  actualizarUI();
  actualizarStatsUsuario();
  setInterval(actualizarStatsUsuario, 10000); // Actualiza cada 10 segundos
} else {
  window.location.href = 'index.html'; // Si no hay usuario, volver al login
}

// Funcionalidad para cambiar el nickname
const editNicknameBtn = document.getElementById('editNicknameBtn');
const nicknameModalOverlay = document.getElementById('nicknameModalOverlay');
const closeNicknameModal = document.getElementById('closeNicknameModal');
const cancelNicknameBtn = document.getElementById('cancelNicknameBtn');
const confirmNicknameBtn = document.getElementById('confirmNicknameBtn');
const newNicknameInput = document.getElementById('newNicknameInput');
const nicknameError = document.getElementById('nicknameError');

// Función para abrir el modal
function openNicknameModal() {
  if (user.nicknameChanged >= 1) {
    alert('Ya has cambiado tu nombre anteriormente. Solo se permite un cambio.');
    return;
  }
  nicknameModalOverlay.classList.add('active');
  newNicknameInput.value = '';
  nicknameError.textContent = '';
  newNicknameInput.focus();
}

// Función para cerrar el modal
function closeNicknameModalFunc() {
  nicknameModalOverlay.classList.remove('active');
  newNicknameInput.value = '';
  nicknameError.textContent = '';
}

// Event listeners para abrir/cerrar modal
editNicknameBtn.addEventListener('click', openNicknameModal);
closeNicknameModal.addEventListener('click', closeNicknameModalFunc);
cancelNicknameBtn.addEventListener('click', closeNicknameModalFunc);

// Cerrar modal al hacer click fuera de él
nicknameModalOverlay.addEventListener('click', (e) => {
  if (e.target === nicknameModalOverlay) {
    closeNicknameModalFunc();
  }
});

// Función para cambiar el nickname
async function changeNickname() {
  const newNick = newNicknameInput.value.trim();
  
  // Validaciones
  if (newNick.length < 3 || newNick.length > 20) {
    nicknameError.textContent = 'El nombre debe tener entre 3 y 20 caracteres.';
    return;
  }
  
  if (newNick === user.nick) {
    nicknameError.textContent = 'El nuevo nombre es igual al actual.';
    return;
  }
  
  // Deshabilitar botón mientras se procesa
  confirmNicknameBtn.disabled = true;
  confirmNicknameBtn.textContent = 'Cambiando...';
  nicknameError.textContent = '';
  
  try {
    const res = await fetch(`${SERVER_URL}/change-nickname`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, newNick: newNick })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Actualizar SOLO el nick en localStorage, el username permanece igual
      user.nick = data.newNick;
      user.nicknameChanged = 1;
      localStorage.setItem('batlesd_user', JSON.stringify(user));
      
      // Actualizar UI
      actualizarUI();
      
      // Cerrar modal
      closeNicknameModalFunc();
      
      // Mostrar mensaje de éxito
      alert(`¡Nombre cambiado exitosamente a "${data.newNick}"! Tu usuario de login sigue siendo "${user.username}". Recuerda que solo puedes cambiar tu nombre una vez.`);
    } else {
      nicknameError.textContent = data.error || 'Error al cambiar el nombre.';
    }
  } catch (err) {
    nicknameError.textContent = 'No se pudo conectar al servidor.';
    console.error('Error al cambiar nickname:', err);
  } finally {
    confirmNicknameBtn.disabled = false;
    confirmNicknameBtn.textContent = 'Confirmar';
  }
}

// Event listener para el botón de confirmar
confirmNicknameBtn.addEventListener('click', changeNickname);

// Event listener para presionar Enter en el input
newNicknameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    changeNickname();
  }
});

// Botón logout
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('batlesd_user');
  window.location.href = 'index.html';
});

// ============================================
// TIENDA - La lógica está en tienda.js
// ============================================
// El sistema de tienda se inicializa automáticamente desde tienda.js

const hostBtn = document.getElementById('hostBtn');
hostBtn.addEventListener('click', async () => {
  try {
  const res = await fetch(`${SERVER_URL}/create-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick: user.nick, nivel: user.nivel })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('batlesd_room_id', data.sala.id);
      window.location.href = 'room.html';
    } else {
      alert('Error al crear la sala: ' + (data.error || ''));
    }
  } catch (err) {
    alert('No se pudo conectar al servidor.');
  }
});

// El botón join aún no tiene lógica
const joinBtn = document.getElementById('joinBtn');
joinBtn.addEventListener('click', () => {
  window.location.href = 'join.html';
});

// Botón de matchmaking 1v1
const matchmaking1v1Btn = document.getElementById('matchmaking1v1Btn');
matchmaking1v1Btn.addEventListener('click', () => {
  joinMatchmakingQueue();
});

// Lógica para el botón Stats
const statsBtn = document.getElementById('statsBtn');
statsBtn.addEventListener('click', () => {
  mostrarStats();
});

async function mostrarStats() {
  // Consultar stats actualizados del backend
  let stats = { exp: 0, nick: user.nick, nivel: user.nivel || 1 };
  try {
    const res = await fetch(`${SERVER_URL}/stats/${user.nick}`);
    const data = await res.json();
    if (data.success && data.stats) {
      stats = { ...stats, ...data.stats };
    }
  } catch (e) {}

  // Crear overlay oscuro de fondo
  let overlay = document.getElementById('statsOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'statsOverlay';
    overlay.className = 'stats-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cerrarStatsModal();
      }
    };
    document.body.appendChild(overlay);
  }

  // Crear modal de estadísticas
  let statsModal = document.getElementById('statsModal');
  if (!statsModal) {
    statsModal = document.createElement('div');
    statsModal.id = 'statsModal';
    statsModal.className = 'stats-modal';

    // Botón de cerrar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'stats-close-btn';
    closeBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.onclick = cerrarStatsModal;
    statsModal.appendChild(closeBtn);

    // Header del modal con nombre y rango
    const header = document.createElement('div');
    header.className = 'stats-header';
    
    const playerTitle = document.createElement('h2');
    playerTitle.className = 'stats-player-name';
    playerTitle.textContent = stats.nick || 'Jugador';
    header.appendChild(playerTitle);

    const rankContainer = document.createElement('div');
    rankContainer.className = 'stats-rank-container';
    
    const rankImg = document.createElement('img');
    rankImg.src = `ranks/${stats.nivel || 1}.png`;
    rankImg.alt = `Rango ${stats.nivel || 1}`;
    rankImg.className = 'stats-rank-img';
    rankContainer.appendChild(rankImg);

    const rankLabel = document.createElement('div');
    rankLabel.className = 'stats-rank-label';
    rankLabel.textContent = `Nivel ${stats.nivel || 1}`;
    rankContainer.appendChild(rankLabel);

    // Botón para ver todos los rangos
    const ranksBtn = document.createElement('button');
    ranksBtn.className = 'view-ranks-btn';
    ranksBtn.innerHTML = '<img src="iconos/signo.png" alt="Ver rangos">';
    ranksBtn.title = 'Ver todos los rangos';
    ranksBtn.onclick = (e) => {
      e.stopPropagation();
      mostrarTodosLosRangos();
    };
    rankContainer.appendChild(ranksBtn);

    header.appendChild(rankContainer);
    statsModal.appendChild(header);

    // NUEVO: Preview del personaje con stats equipadas
    const characterPreviewSection = document.createElement('div');
    characterPreviewSection.className = 'stats-character-preview';
    
    // Canvas para el personaje
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 120;
    previewCanvas.height = 120;
    previewCanvas.className = 'stats-character-canvas';
    
    // Dibujar personaje con color equipado
    const ctx = previewCanvas.getContext('2d');
    const user = window.ShopSystem ? window.ShopSystem.getUser() : JSON.parse(localStorage.getItem('batlesd_user'));
    let playerColor = '#f4c2a0';
    let playerStats = { health: 200, damage: 0, speed: 5 };
    
    if (window.ShopSystem && user?.equipped) {
      playerColor = window.ShopSystem.getEquippedColor(user.equipped);
      playerStats = window.ShopSystem.calculatePlayerStats(user.equipped);
    }
    
    // Dibujar círculo del personaje
    ctx.beginPath();
    ctx.arc(60, 60, 35, 0, 2 * Math.PI);
    ctx.fillStyle = playerColor;
    ctx.shadowColor = '#0008';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Borde blanco
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    
    characterPreviewSection.appendChild(previewCanvas);
    
    // Stats del personaje
    const statsEquipped = document.createElement('div');
    statsEquipped.className = 'stats-equipped-info';
    statsEquipped.innerHTML = `
      <div class="equipped-stat">
        <span class="equipped-stat-icon">❤️</span>
        <span class="equipped-stat-value">${playerStats.health}</span>
        <span class="equipped-stat-label">Vida</span>
      </div>
      <div class="equipped-stat">
        <span class="equipped-stat-icon">⚔️</span>
        <span class="equipped-stat-value">+${playerStats.damage}</span>
        <span class="equipped-stat-label">Daño</span>
      </div>
      <div class="equipped-stat">
        <span class="equipped-stat-icon">🏃</span>
        <span class="equipped-stat-value">${playerStats.speed.toFixed(1)}</span>
        <span class="equipped-stat-label">Vel.</span>
      </div>
    `;
    characterPreviewSection.appendChild(statsEquipped);
    
    statsModal.appendChild(characterPreviewSection);

    // Sección de experiencia
    const expSection = document.createElement('div');
    expSection.className = 'stats-section';

    const expHeader = document.createElement('div');
    expHeader.className = 'stats-section-header';
    expHeader.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <span>Experiencia</span>
    `;
    expSection.appendChild(expHeader);

    // Calcular progreso de experiencia
    let exp = stats.exp || 0;
    let nivel = stats.nivel || 1;
    const thresholds = [0, 200, 450, 800, 1450, 2350, 3400, 4900, 6400, 8800, 10500, 14500, 19100, 24700, 32500, 40000];
    let expMin = thresholds[nivel - 1] || 0;
    let expMax = thresholds[nivel] || 40000;
    let progress = nivel >= 15 ? 100 : ((exp - expMin) / (expMax - expMin)) * 100;

    const expBarContainer = document.createElement('div');
    expBarContainer.className = 'stats-exp-bar-container';

    const expBarBg = document.createElement('div');
    expBarBg.className = 'stats-exp-bar-bg';

    const expBarFill = document.createElement('div');
    expBarFill.className = 'stats-exp-bar-fill';
    expBarFill.style.width = Math.min(progress, 100) + '%';

    const expBarGlow = document.createElement('div');
    expBarGlow.className = 'stats-exp-bar-glow';
    expBarGlow.style.width = Math.min(progress, 100) + '%';

    expBarBg.appendChild(expBarGlow);
    expBarBg.appendChild(expBarFill);
    expBarContainer.appendChild(expBarBg);

    const expText = document.createElement('div');
    expText.className = 'stats-exp-text';
    expText.innerHTML = `<strong>${exp}</strong> / ${expMax} XP`;
    expBarContainer.appendChild(expText);

    expSection.appendChild(expBarContainer);
    statsModal.appendChild(expSection);

    // Grid de estadísticas
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';

    // Victorias
    const victoriesCard = crearStatCard(
      'Victorias',
      stats.victories || 0,
      '#10b981',
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
        <path d="M4 22h16"></path>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
      </svg>`
    );
    statsGrid.appendChild(victoriesCard);

    // Total Kills
    const killsCard = crearStatCard(
      'Eliminaciones',
      stats.totalKills || 0,
      '#f59e0b',
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
      </svg>`
    );
    statsGrid.appendChild(killsCard);

    // Total Deaths
    const deathsCard = crearStatCard(
      'Muertes',
      stats.totalDeaths || 0,
      '#ef4444',
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M4.93 4.93l14.14 14.14"></path>
      </svg>`
    );
    statsGrid.appendChild(deathsCard);

    // K/D Ratio
    const kd = stats.totalDeaths > 0 ? (stats.totalKills / stats.totalDeaths).toFixed(2) : stats.totalKills;
    const kdCard = crearStatCard(
      'K/D Ratio',
      kd,
      '#6366f1',
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>`
    );
    statsGrid.appendChild(kdCard);

    statsModal.appendChild(statsGrid);
    overlay.appendChild(statsModal);
  }

  // Mostrar overlay y modal con animación
  overlay.classList.add('show');
}

function crearStatCard(label, value, color, iconSvg) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  card.style.borderColor = color;

  const icon = document.createElement('div');
  icon.className = 'stat-card-icon';
  icon.style.background = color;
  icon.innerHTML = iconSvg;
  card.appendChild(icon);

  const content = document.createElement('div');
  content.className = 'stat-card-content';

  const valueEl = document.createElement('div');
  valueEl.className = 'stat-card-value';
  valueEl.textContent = value;
  valueEl.style.color = color;
  content.appendChild(valueEl);

  const labelEl = document.createElement('div');
  labelEl.className = 'stat-card-label';
  labelEl.textContent = label;
  content.appendChild(labelEl);

  card.appendChild(content);
  return card;
}

function cerrarStatsModal() {
  const overlay = document.getElementById('statsOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

// ============================================
// MODAL DE TODOS LOS RANGOS
// ============================================
function mostrarTodosLosRangos() {
  // Niveles de experiencia (del backend)
  const thresholds = [0, 200, 450, 800, 1450, 2350, 3400, 4900, 6400, 8800, 10500, 14500, 19100, 24700, 32500, 40000];
  
  // Crear overlay
  let ranksOverlay = document.getElementById('ranksOverlay');
  if (!ranksOverlay) {
    ranksOverlay = document.createElement('div');
    ranksOverlay.id = 'ranksOverlay';
    ranksOverlay.className = 'ranks-overlay';
    ranksOverlay.onclick = (e) => {
      if (e.target === ranksOverlay) {
        cerrarRanksModal();
      }
    };
    document.body.appendChild(ranksOverlay);
  }

  // Crear modal de rangos
  let ranksModal = document.getElementById('ranksModal');
  if (!ranksModal) {
    ranksModal = document.createElement('div');
    ranksModal.id = 'ranksModal';
    ranksModal.className = 'ranks-modal';

    // Header del modal
    const header = document.createElement('div');
    header.className = 'ranks-modal-header';

    const title = document.createElement('h2');
    title.className = 'ranks-modal-title';
    title.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
        <path d="M4 22h16"></path>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
      </svg>
      <span>Todos los Rangos</span>
    `;
    header.appendChild(title);

    // Botón cerrar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ranks-close-btn';
    closeBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.onclick = cerrarRanksModal;
    header.appendChild(closeBtn);

    ranksModal.appendChild(header);

    // Contenedor de rangos con scroll
    const ranksContainer = document.createElement('div');
    ranksContainer.className = 'ranks-container';

    // Generar los 60 niveles
    for (let nivel = 1; nivel <= 60; nivel++) {
      const rankCard = document.createElement('div');
      rankCard.className = 'rank-card';
      
      // Marcar el nivel actual del jugador
      if (user && user.nivel === nivel) {
        rankCard.classList.add('current-rank');
      }

      // Icono del rango
      const rankIcon = document.createElement('div');
      rankIcon.className = 'rank-card-icon';
      const rankIconImg = document.createElement('img');
      rankIconImg.src = `ranks/${nivel}.png`;
      rankIconImg.alt = `Rango ${nivel}`;
      rankIcon.appendChild(rankIconImg);
      rankCard.appendChild(rankIcon);

      // Info del rango
      const rankInfo = document.createElement('div');
      rankInfo.className = 'rank-card-info';

      const rankTitle = document.createElement('div');
      rankTitle.className = 'rank-card-title';
      rankTitle.textContent = `Nivel ${nivel}`;
      rankInfo.appendChild(rankTitle);

      // Calcular experiencia necesaria
      let expNecesaria;
      if (nivel <= 15) {
        expNecesaria = thresholds[nivel] || 40000;
      } else {
        // Para niveles 16-60, calcular progresión
        const baseExp = 40000;
        const incremento = 5000;
        expNecesaria = baseExp + ((nivel - 15) * incremento);
      }

      const rankExp = document.createElement('div');
      rankExp.className = 'rank-card-exp';
      rankExp.innerHTML = `<span class="exp-icon">⚡</span> ${expNecesaria.toLocaleString()} XP`;
      rankInfo.appendChild(rankExp);

      rankCard.appendChild(rankInfo);

      // Badge si es el nivel actual
      if (user && user.nivel === nivel) {
        const currentBadge = document.createElement('div');
        currentBadge.className = 'current-badge';
        currentBadge.textContent = 'TÚ';
        rankCard.appendChild(currentBadge);
      }

      ranksContainer.appendChild(rankCard);
    }

    ranksModal.appendChild(ranksContainer);
    ranksOverlay.appendChild(ranksModal);
  }

  // Mostrar con animación
  ranksOverlay.classList.add('show');
}

function cerrarRanksModal() {
  const overlay = document.getElementById('ranksOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

// ============================================
// MODAL DE ESTADÍSTICAS DE OTROS JUGADORES
// ============================================
async function mostrarStatsJugador(nick) {
  // Consultar stats del jugador desde el backend
  let stats = { exp: 0, nick: nick, nivel: 1 };
  try {
    const res = await fetch(`${SERVER_URL}/stats/${nick}`);
    const data = await res.json();
    if (data.success && data.stats) {
      stats = { ...stats, ...data.stats };
    }
  } catch (e) {
    console.error('Error al cargar estadísticas:', e);
    return;
  }

  // Crear overlay oscuro de fondo
  let overlay = document.getElementById('playerStatsOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'playerStatsOverlay';
    overlay.className = 'stats-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cerrarPlayerStatsModal();
      }
    };
    document.body.appendChild(overlay);
  }

  // Crear modal de estadísticas
  let statsModal = document.getElementById('playerStatsModal');
  if (statsModal) {
    statsModal.remove();
  }
  
  statsModal = document.createElement('div');
  statsModal.id = 'playerStatsModal';
  statsModal.className = 'stats-modal';

  // Botón de cerrar
  const closeBtn = document.createElement('button');
  closeBtn.className = 'stats-close-btn';
  closeBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeBtn.onclick = cerrarPlayerStatsModal;
  statsModal.appendChild(closeBtn);

  // Header del modal con nombre y rango
  const header = document.createElement('div');
  header.className = 'stats-header';
  
  const playerTitle = document.createElement('h2');
  playerTitle.className = 'stats-player-name';
  playerTitle.textContent = stats.nick || 'Jugador';
  header.appendChild(playerTitle);

  const rankContainer = document.createElement('div');
  rankContainer.className = 'stats-rank-container';
  
  const rankImg = document.createElement('img');
  rankImg.src = `ranks/${stats.nivel || 1}.png`;
  rankImg.alt = `Rango ${stats.nivel || 1}`;
  rankImg.className = 'stats-rank-img';
  rankImg.onerror = () => { rankImg.src = 'ranks/1.png'; };
  rankContainer.appendChild(rankImg);

  const rankLabel = document.createElement('div');
  rankLabel.className = 'stats-rank-label';
  rankLabel.textContent = `Nivel ${stats.nivel || 1}`;
  rankContainer.appendChild(rankLabel);

  header.appendChild(rankContainer);
  statsModal.appendChild(header);

  // NUEVO: Preview del personaje del jugador que estamos viendo
  const characterPreviewSection = document.createElement('div');
  characterPreviewSection.className = 'stats-character-preview';
  
  // Canvas para el personaje
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 120;
  previewCanvas.height = 120;
  previewCanvas.className = 'stats-character-canvas';
  
  // Dibujar personaje con color equipado (por defecto si no podemos obtenerlo)
  const ctx = previewCanvas.getContext('2d');
  let playerColor = '#f4c2a0'; // Color por defecto
  let playerStats = { health: 200, damage: 0, speed: 5 }; // Stats base por defecto
  
  // Si el jugador tiene datos de items equipados, calcular sus stats
  if (stats.equipped && window.ShopSystem) {
    try {
      playerColor = window.ShopSystem.getEquippedColor(stats.equipped);
      playerStats = window.ShopSystem.calculatePlayerStats(stats.equipped);
    } catch (e) {
      console.log('No se pudieron calcular stats del jugador:', e);
    }
  }
  
  // Dibujar círculo del personaje
  ctx.beginPath();
  ctx.arc(60, 60, 35, 0, 2 * Math.PI);
  ctx.fillStyle = playerColor;
  ctx.shadowColor = '#0008';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Borde blanco
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  
  characterPreviewSection.appendChild(previewCanvas);
  
  // Stats del personaje (stats base por ahora)
  const statsEquipped = document.createElement('div');
  statsEquipped.className = 'stats-equipped-info';
  statsEquipped.innerHTML = `
    <div class="equipped-stat">
      <span class="equipped-stat-icon">❤️</span>
      <span class="equipped-stat-value">${playerStats.health}</span>
      <span class="equipped-stat-label">Vida</span>
    </div>
    <div class="equipped-stat">
      <span class="equipped-stat-icon">⚔️</span>
      <span class="equipped-stat-value">+${playerStats.damage}</span>
      <span class="equipped-stat-label">Daño</span>
    </div>
    <div class="equipped-stat">
      <span class="equipped-stat-icon">🏃</span>
      <span class="equipped-stat-value">${playerStats.speed.toFixed(1)}</span>
      <span class="equipped-stat-label">Vel.</span>
    </div>
  `;
  characterPreviewSection.appendChild(statsEquipped);
  
  statsModal.appendChild(characterPreviewSection);

  // Sección de experiencia
  const expSection = document.createElement('div');
  expSection.className = 'stats-section';

  const expHeader = document.createElement('div');
  expHeader.className = 'stats-section-header';
  expHeader.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
    <span>Experiencia</span>
  `;
  expSection.appendChild(expHeader);

  // Calcular progreso de experiencia
  let exp = stats.exp || 0;
  let nivel = stats.nivel || 1;
  const thresholds = [0, 200, 450, 800, 1450, 2350, 3400, 4900, 6400, 8800, 10500, 14500, 19100, 24700, 32500, 40000];
  let expMin = thresholds[nivel - 1] || 0;
  let expMax = thresholds[nivel] || 40000;
  let progress = nivel >= 15 ? 100 : ((exp - expMin) / (expMax - expMin)) * 100;

  const expBarContainer = document.createElement('div');
  expBarContainer.className = 'stats-exp-bar-container';

  const expBarBg = document.createElement('div');
  expBarBg.className = 'stats-exp-bar-bg';

  const expBarFill = document.createElement('div');
  expBarFill.className = 'stats-exp-bar-fill';
  expBarFill.style.width = Math.min(progress, 100) + '%';

  const expBarGlow = document.createElement('div');
  expBarGlow.className = 'stats-exp-bar-glow';
  expBarGlow.style.width = Math.min(progress, 100) + '%';

  expBarBg.appendChild(expBarGlow);
  expBarBg.appendChild(expBarFill);
  expBarContainer.appendChild(expBarBg);

  const expText = document.createElement('div');
  expText.className = 'stats-exp-text';
  expText.innerHTML = `<strong>${exp}</strong> / ${expMax} XP`;
  expBarContainer.appendChild(expText);

  expSection.appendChild(expBarContainer);
  statsModal.appendChild(expSection);

  // Grid de estadísticas
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  // Victorias
  const victoriesCard = crearStatCard(
    'Victorias',
    stats.victories || 0,
    '#10b981',
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
    </svg>`
  );
  statsGrid.appendChild(victoriesCard);

  // Total Kills
  const killsCard = crearStatCard(
    'Eliminaciones',
    stats.totalKills || 0,
    '#f59e0b',
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>`
  );
  statsGrid.appendChild(killsCard);

  // Total Deaths
  const deathsCard = crearStatCard(
    'Muertes',
    stats.totalDeaths || 0,
    '#ef4444',
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M4.93 4.93l14.14 14.14"></path>
    </svg>`
  );
  statsGrid.appendChild(deathsCard);

  // K/D Ratio
  const kd = stats.totalDeaths > 0 ? (stats.totalKills / stats.totalDeaths).toFixed(2) : stats.totalKills;
  const kdCard = crearStatCard(
    'K/D Ratio',
    kd,
    '#6366f1',
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>`
  );
  statsGrid.appendChild(kdCard);

  statsModal.appendChild(statsGrid);
  overlay.appendChild(statsModal);

  // Mostrar overlay y modal con animación
  overlay.classList.add('show');
}

function cerrarPlayerStatsModal() {
  const overlay = document.getElementById('playerStatsOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

// ============================================
// PANEL DE JUGADORES ACTIVOS
// ============================================
async function cargarJugadoresActivos() {
  try {
    const res = await fetch(`${SERVER_URL}/active-players`);
    const data = await res.json();
    
    if (data.success && data.players) {
      actualizarListaJugadores(data.players);
    }
  } catch (error) {
    console.error('Error al cargar jugadores activos:', error);
  }
}

function actualizarListaJugadores(players) {
  const activePlayersList = document.getElementById('activePlayersList');
  const activeCount = document.getElementById('activeCount');
  
  // Actualizar contador
  activeCount.textContent = players.length;
  
  // Limpiar lista
  activePlayersList.innerHTML = '';
  
  if (players.length === 0) {
    // Mostrar estado vacío
    activePlayersList.innerHTML = `
      <div class="no-players">
        <div class="no-players-icon">👥</div>
        <p>No hay jugadores activos</p>
      </div>
    `;
    return;
  }
  
  // Ordenar jugadores por nivel (mayor a menor)
  players.sort((a, b) => (b.nivel || 1) - (a.nivel || 1));
  
  // Crear tarjetas de jugadores
  players.forEach(player => {
    const playerCard = document.createElement('div');
    playerCard.className = 'active-player-card';
    
    // Marcar si está en juego
    if (player.inGame) {
      playerCard.classList.add('in-game');
    }
    
    // Resaltar si es el usuario actual
    const isCurrentUser = user && user.nick === player.nick;
    
    playerCard.innerHTML = `
      <div class="active-player-rank">
        <img src="ranks/${player.nivel || 1}.png" alt="Rango ${player.nivel || 1}" onerror="this.src='ranks/1.png'">
      </div>
      <div class="active-player-info">
        <div class="active-player-name">${player.nick}${isCurrentUser ? ' (Tú)' : ''}</div>
        <div class="active-player-level">
          ${player.inGame ? '<span style="color: #f59e0b; font-size: 0.85rem; font-weight: 600;">● En partida</span>' : '<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">● Disponible</span>'}
        </div>
      </div>
      <div class="player-status-indicator"></div>
    `;
    
    // Agregar evento click para mostrar estadísticas del jugador
    playerCard.addEventListener('click', () => {
      mostrarStatsJugador(player.nick);
    });
    
    activePlayersList.appendChild(playerCard);
  });
}

// Iniciar actualización automática de jugadores activos
if (user && user.nick) {
  // Notificar al servidor que el jugador está en línea
  socket.emit('playerOnline', { nick: user.nick, nivel: user.nivel || 1 });
  
  // Enviar heartbeat cada 10 segundos para mantener la conexión activa
  setInterval(() => {
    socket.emit('playerHeartbeat', { nick: user.nick });
  }, 10000);
  
  // Cargar lista de jugadores
  cargarJugadoresActivos(); // Cargar inmediatamente
  setInterval(cargarJugadoresActivos, 5000); // Actualizar cada 5 segundos
}

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
  if (user && user.nick) {
    socket.disconnect();
  }
});

// ============================================
// SISTEMA DE MATCHMAKING 1V1
// ============================================

let queueStartTime = null;
let queueTimerInterval = null;
let currentMatchId = null;

// Unirse a la cola de matchmaking
function joinMatchmakingQueue() {
  socket.emit('joinMatchmakingQueue', { 
    nick: user.nick, 
    nivel: user.nivel || 1 
  });
}

// Salir de la cola de matchmaking
function leaveMatchmakingQueue() {
  socket.emit('leaveMatchmakingQueue', { nick: user.nick });
  closeQueueModal();
}

// Mostrar modal de cola
function showQueueModal() {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'queueOverlay';
  overlay.className = 'queue-overlay';
  
  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'queueModal';
  modal.className = 'queue-modal';
  
  modal.innerHTML = `
    <div class="queue-header">
      <h2>🔍 Buscando Oponente</h2>
      <p>Esperando en cola...</p>
    </div>
    <div class="queue-content">
      <div class="queue-timer" id="queueTimer">00:00</div>
      <div class="queue-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="queue-text">Preparándote para un duelo épico</p>
    </div>
    <button class="queue-cancel-btn" onclick="leaveMatchmakingQueue()">
      <span>✕</span> Salir de la Cola
    </button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Iniciar contador
  queueStartTime = Date.now();
  queueTimerInterval = setInterval(updateQueueTimer, 100);
  
  // Animación de entrada
  setTimeout(() => overlay.classList.add('show'), 10);
}

// Actualizar contador de tiempo en cola
function updateQueueTimer() {
  const elapsed = Date.now() - queueStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  const timerEl = document.getElementById('queueTimer');
  if (timerEl) {
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// Cerrar modal de cola
function closeQueueModal() {
  if (queueTimerInterval) {
    clearInterval(queueTimerInterval);
    queueTimerInterval = null;
  }
  
  const overlay = document.getElementById('queueOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }
}

// Mostrar modal de confirmación de match
function showMatchConfirmationModal(opponent) {
  closeQueueModal();
  
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'matchConfirmOverlay';
  overlay.className = 'match-confirm-overlay';
  
  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'matchConfirmModal';
  modal.className = 'match-confirm-modal';
  
  modal.innerHTML = `
    <div class="match-confirm-header">
      <h2>⚔️ ¡Match Encontrado!</h2>
    </div>
    <div class="match-confirm-content">
      <div class="opponent-info">
        <div class="opponent-rank">
          <img src="ranks/${opponent.nivel || 1}.png" alt="Rango" onerror="this.src='ranks/1.png'">
        </div>
        <div class="opponent-details">
          <h3>${opponent.nick}</h3>
          <p>Nivel ${opponent.nivel || 1}</p>
        </div>
      </div>
      <div class="match-timer" id="matchTimer">15</div>
      <p class="match-confirm-text">¿Aceptas el duelo?</p>
    </div>
    <div class="match-confirm-buttons">
      <button class="match-accept-btn" onclick="respondToMatch(true)">
        <span>✓</span> ACEPTAR
      </button>
      <button class="match-decline-btn" onclick="respondToMatch(false)">
        <span>✕</span> RECHAZAR
      </button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Animación de entrada
  setTimeout(() => overlay.classList.add('show'), 10);
  
  // Countdown de 15 segundos
  let timeLeft = 15;
  const countdownInterval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('matchTimer');
    if (timerEl) {
      timerEl.textContent = timeLeft;
      if (timeLeft <= 5) {
        timerEl.style.color = '#ef4444';
      }
    }
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      respondToMatch(false); // Auto-rechazar si no responde
    }
  }, 1000);
  
  // Guardar el interval para poder limpiarlo
  modal.dataset.countdownInterval = countdownInterval;
}

// Responder al match
function respondToMatch(accepted) {
  if (!currentMatchId) return;
  
  socket.emit('matchResponse', {
    matchId: currentMatchId,
    nick: user.nick,
    accepted: accepted
  });
  
  if (accepted) {
    // Cambiar el contenido del modal para mostrar "Esperando..."
    const modal = document.getElementById('matchConfirmModal');
    const buttons = modal.querySelector('.match-confirm-buttons');
    const text = modal.querySelector('.match-confirm-text');
    
    if (buttons) {
      buttons.style.opacity = '0.5';
      buttons.style.pointerEvents = 'none';
    }
    
    if (text) {
      text.innerHTML = '<strong>✅ Has aceptado!</strong><br>Esperando al oponente...';
      text.style.color = '#10b981';
    }
    
    // El modal se cerrará automáticamente cuando llegue matchAccepted o matchCancelled
  } else {
    closeMatchConfirmationModal();
    // Mostrar mensaje de rechazo
    alert('Has rechazado el duelo. Regresando al menú.');
  }
}

// Cerrar modal de confirmación
function closeMatchConfirmationModal() {
  const overlay = document.getElementById('matchConfirmOverlay');
  if (overlay) {
    const modal = document.getElementById('matchConfirmModal');
    if (modal && modal.dataset.countdownInterval) {
      clearInterval(parseInt(modal.dataset.countdownInterval));
    }
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }
}

// Mostrar pantalla pre-batalla
function showPreBattleScreen(yourStats, opponentStats, roomId) {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'preBattleOverlay';
  overlay.className = 'pre-battle-overlay';
  
  // Crear pantalla
  const screen = document.createElement('div');
  screen.id = 'preBattleScreen';
  screen.className = 'pre-battle-screen';
  
  const kdYou = yourStats.totalDeaths > 0 ? (yourStats.totalKills / yourStats.totalDeaths).toFixed(2) : yourStats.totalKills;
  const kdOpp = opponentStats.totalDeaths > 0 ? (opponentStats.totalKills / opponentStats.totalDeaths).toFixed(2) : opponentStats.totalKills;
  
  screen.innerHTML = `
    <div class="pre-battle-vs">VS</div>
    <div class="pre-battle-players">
      <div class="pre-battle-player you">
        <div class="player-badge">TÚ</div>
        <img src="ranks/${yourStats.nivel || 1}.png" alt="Tu rango" class="player-rank-img">
        <h2>${yourStats.nick}</h2>
        <div class="player-level">Nivel ${yourStats.nivel || 1}</div>
        <div class="player-stats-mini">
          <div class="stat-mini-item">
            <span class="stat-mini-label">Victorias</span>
            <span class="stat-mini-value">${yourStats.victories || 0}</span>
          </div>
          <div class="stat-mini-item">
            <span class="stat-mini-label">K/D</span>
            <span class="stat-mini-value">${kdYou}</span>
          </div>
        </div>
      </div>
      
      <div class="pre-battle-player opponent">
        <div class="player-badge enemy">RIVAL</div>
        <img src="ranks/${opponentStats.nivel || 1}.png" alt="Rango rival" class="player-rank-img">
        <h2>${opponentStats.nick}</h2>
        <div class="player-level">Nivel ${opponentStats.nivel || 1}</div>
        <div class="player-stats-mini">
          <div class="stat-mini-item">
            <span class="stat-mini-label">Victorias</span>
            <span class="stat-mini-value">${opponentStats.victories || 0}</span>
          </div>
          <div class="stat-mini-item">
            <span class="stat-mini-label">K/D</span>
            <span class="stat-mini-value">${kdOpp}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="pre-battle-countdown" id="preBattleCountdown">5</div>
  `;
  
  overlay.appendChild(screen);
  document.body.appendChild(overlay);
  
  // Animación de entrada
  setTimeout(() => overlay.classList.add('show'), 10);
  
  // Countdown de 5 segundos
  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    const countdownEl = document.getElementById('preBattleCountdown');
    if (countdownEl) {
      countdownEl.textContent = countdown;
    }
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      // Redirigir a la sala
      localStorage.setItem('batlesd_room_id', roomId);
      window.location.href = 'room.html';
    }
  }, 1000);
}

// ============================================
// EVENT LISTENERS DE MATCHMAKING
// ============================================

// Unido a la cola
socket.on('queueJoined', (data) => {
  console.log('Unido a la cola de matchmaking');
  showQueueModal();
});

// Salido de la cola
socket.on('queueLeft', () => {
  console.log('Salido de la cola');
  closeQueueModal();
});

// Ya estaba en cola
socket.on('alreadyInQueue', () => {
  alert('Ya estás en la cola de matchmaking');
});

// Match encontrado
socket.on('matchFound', (data) => {
  console.log('Match encontrado:', data);
  currentMatchId = data.matchId;
  showMatchConfirmationModal(data.opponent);
});

// Match expirado (timeout)
socket.on('matchExpired', () => {
  console.log('Match expirado, volviendo a la cola');
  closeMatchConfirmationModal();
  showQueueModal();
});

// Match cancelado (oponente rechazó)
socket.on('matchCancelled', (data) => {
  console.log('Match cancelado:', data.reason);
  closeMatchConfirmationModal();
  alert('El oponente rechazó el duelo. Volviendo a la cola...');
  showQueueModal();
});

// Match aceptado (ambos aceptaron)
socket.on('matchAccepted', (data) => {
  console.log('Match aceptado, iniciando batalla');
  closeMatchConfirmationModal();
  showPreBattleScreen(data.yourStats, data.opponent, data.roomId);
});

// ============================================
//   SISTEMA DE RANKING GLOBAL
// ============================================

const rankingFloatBtn = document.getElementById('rankingFloatBtn');
const rankingModalOverlay = document.getElementById('rankingModalOverlay');
const closeRankingModal = document.getElementById('closeRankingModal');
const rankingLoading = document.getElementById('rankingLoading');
const rankingTableContainer = document.getElementById('rankingTableContainer');
const rankingError = document.getElementById('rankingError');

// Función para abrir el modal de ranking
async function openRankingModal() {
  rankingModalOverlay.classList.add('active');
  rankingLoading.style.display = 'flex';
  rankingTableContainer.style.display = 'none';
  rankingError.style.display = 'none';
  
  // Cargar datos del ranking
  await loadRankingData();
}

// Función para cerrar el modal de ranking
function closeRankingModalFunc() {
  rankingModalOverlay.classList.remove('active');
}

// Función para cargar los datos del ranking desde el servidor
async function loadRankingData() {
  try {
    const response = await fetch(`${SERVER_URL}/ranking`);
    const data = await response.json();
    
    if (data.success && data.ranking) {
      displayRanking(data.ranking);
      rankingLoading.style.display = 'none';
      rankingTableContainer.style.display = 'block';
    } else {
      throw new Error('Error al cargar ranking');
    }
  } catch (error) {
    console.error('Error al cargar ranking:', error);
    rankingLoading.style.display = 'none';
    rankingError.style.display = 'block';
  }
}

// Función para calcular KDA
function calculateKDA(kills, deaths) {
  if (deaths === 0) {
    return kills.toFixed(2);
  }
  return (kills / deaths).toFixed(2);
}

// Función para obtener clase de KDA
function getKDAClass(kda) {
  const kdaValue = parseFloat(kda);
  if (kdaValue >= 3.0) return 'kda-excellent';
  if (kdaValue >= 2.0) return 'kda-good';
  if (kdaValue >= 1.0) return 'kda-average';
  return 'kda-poor';
}

// Función para mostrar el ranking en la lista
function displayRanking(ranking) {
  const rankingListBody = document.getElementById('rankingListBody');
  rankingListBody.innerHTML = '';
  
  ranking.forEach((player, index) => {
    const position = index + 1;
    const kda = calculateKDA(player.totalKills || 0, player.totalDeaths || 0);
    const kdaClass = getKDAClass(kda);
    
    // Determinar si es el usuario actual
    const isCurrentUser = user && user.nick === player.nick;
    
    // Determinar clase especial para top 3
    let itemClass = 'ranking-item';
    if (isCurrentUser) itemClass += ' current-user';
    if (position === 1 && !isCurrentUser) itemClass += ' top-1';
    else if (position === 2 && !isCurrentUser) itemClass += ' top-2';
    else if (position === 3 && !isCurrentUser) itemClass += ' top-3';
    
    // Crear medallas para top 3
    let positionDisplay = position;
    let positionClass = '';
    if (position === 1) {
      positionDisplay = '🥇';
      positionClass = 'top-1';
    } else if (position === 2) {
      positionDisplay = '🥈';
      positionClass = 'top-2';
    } else if (position === 3) {
      positionDisplay = '🥉';
      positionClass = 'top-3';
    }
    
    const item = document.createElement('div');
    item.className = itemClass;
    
    item.innerHTML = `
      <div class="rank-position ${positionClass}">${positionDisplay}</div>
      <div class="rank-player-info">
        <div class="rank-avatar">
          <img src="ranks/${player.nivel || 1}.png" alt="Nivel ${player.nivel || 1}" onerror="this.src='ranks/1.png'">
        </div>
        <div class="rank-player-details">
          <div class="rank-player-name">${player.nick}</div>
          <div class="rank-player-level">Nivel ${player.nivel || 1}</div>
        </div>
      </div>
      <div class="rank-stats">
        <div class="rank-stat stat-exp">
          <span class="rank-stat-value">${(player.exp || 0).toLocaleString()}</span>
          <span class="rank-stat-label">EXP</span>
        </div>
        <div class="rank-stat stat-victories">
          <span class="rank-stat-value">${player.victories || 0}</span>
          <span class="rank-stat-label">Victorias</span>
        </div>
        <div class="rank-stat stat-kills">
          <span class="rank-stat-value">${player.totalKills || 0}</span>
          <span class="rank-stat-label">Kills</span>
        </div>
        <div class="rank-stat stat-deaths">
          <span class="rank-stat-value">${player.totalDeaths || 0}</span>
          <span class="rank-stat-label">Muertes</span>
        </div>
        <div class="rank-stat stat-kda">
          <span class="rank-stat-value ${kdaClass}">${kda}</span>
          <span class="rank-stat-label">KDA</span>
        </div>
      </div>
    `;
    
    rankingListBody.appendChild(item);
  });
}

// Event listeners para el modal de ranking
rankingFloatBtn.addEventListener('click', openRankingModal);
closeRankingModal.addEventListener('click', closeRankingModalFunc);

// Cerrar modal al hacer click fuera de él
rankingModalOverlay.addEventListener('click', (e) => {
  if (e.target === rankingModalOverlay) {
    closeRankingModalFunc();
  }
});
