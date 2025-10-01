// Determine server URL based on environment
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'http://138.68.250.124:3000';

// Mostrar el nick del usuario
let user = JSON.parse(localStorage.getItem('batlesd_user'));

// Referencias a elementos del DOM
const playerName = document.getElementById('playerName');
const playerExp = document.getElementById('playerExp');
const playerVictories = document.getElementById('playerVictories');
const playerLevel = document.getElementById('playerLevel');
const playerRankImg = document.getElementById('playerRankImg');

async function actualizarStatsUsuario() {
  if (!user || !user.nick) return;
  try {
    const res = await fetch(`${SERVER_URL}/stats/${user.nick}`);
    const data = await res.json();
    if (data.success && data.stats) {
      user.exp = data.stats.exp;
      user.nivel = data.stats.nivel || user.nivel;
      user.victories = data.stats.victories || 0;
      user.totalKills = data.stats.totalKills || 0;
      user.totalDeaths = data.stats.totalDeaths || 0;
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
  
  // Actualizar nivel (si existe el elemento)
  if (playerLevel) {
    playerLevel.textContent = user.nivel || 1;
  }
  
  // Actualizar imagen de rango
  const nivelActual = user.nivel || 1;
  playerRankImg.innerHTML = `<img src="ranks/${nivelActual}.png" alt="Rango ${nivelActual}" onerror="this.src='ranks/1.png'">`;
}

if (user && user.nick) {
  actualizarUI();
  actualizarStatsUsuario();
  setInterval(actualizarStatsUsuario, 10000); // Actualiza cada 10 segundos
} else {
  window.location.href = 'index.html'; // Si no hay usuario, volver al login
}


// Botón logout
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('batlesd_user');
  window.location.href = 'index.html';
});

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
