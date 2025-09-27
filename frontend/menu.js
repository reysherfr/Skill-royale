// Mostrar el nick del usuario
let user = JSON.parse(localStorage.getItem('batlesd_user'));
const welcomeMsg = document.getElementById('welcomeMsg');

async function actualizarStatsUsuario() {
  if (!user || !user.nick) return;
  try {
  const res = await fetch(`https://skill-royale.onrender.com/stats/${user.nick}`);
    const data = await res.json();
    if (data.success && data.stats) {
      user.exp = data.stats.exp;
      user.nivel = data.stats.nivel || user.nivel;
      user.victories = data.stats.victories || 0;
      user.totalKills = data.stats.totalKills || 0;
      user.totalDeaths = data.stats.totalDeaths || 0;
      localStorage.setItem('batlesd_user', JSON.stringify(user));
  // Mostrar la imagen del rango justo al lado del nombre
  const rangoImg = document.createElement('img');
  rangoImg.src = `../ranks/${user.nivel}.png`;
  rangoImg.alt = `Rango ${user.nivel}`;
  rangoImg.style.width = '32px';
  rangoImg.style.height = '32px';
  rangoImg.style.verticalAlign = 'middle';
  rangoImg.style.marginLeft = '8px';

  // Limpiar el contenido previo
  welcomeMsg.innerHTML = '';
  // Crear un span para el nombre y la imagen juntos
  const spanNick = document.createElement('span');
  spanNick.textContent = ` ${user.nick}`;
  spanNick.appendChild(rangoImg);
  welcomeMsg.appendChild(spanNick);
  // Agregar el resto de la información
  const texto = document.createTextNode(` Exp: ${user.exp} | Victorias: ${user.victories}`);
  welcomeMsg.appendChild(texto);
    }
  } catch (e) {}
}

if (user && user.nick) {
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
  const res = await fetch('https://skill-royale.onrender.com/create-room', {
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
  const res = await fetch(`https://skill-royale.onrender.com/stats/${user.nick}`);
    const data = await res.json();
    if (data.success && data.stats) {
      stats = { ...stats, ...data.stats };
    }
  } catch (e) {}

  let statsModal = document.getElementById('statsModal');
  if (!statsModal) {
    statsModal = document.createElement('div');
    statsModal.id = 'statsModal';
    statsModal.style.position = 'fixed';
    statsModal.style.top = '50%';
    statsModal.style.left = '50%';
    statsModal.style.transform = 'translate(-50%, -50%)';
    statsModal.style.background = '#fff';
    statsModal.style.padding = '48px 40px';
    statsModal.style.borderRadius = '24px';
    statsModal.style.boxShadow = '0 4px 32px rgba(0,0,0,0.25)';
    statsModal.style.zIndex = '1000';
    statsModal.style.textAlign = 'center';
    statsModal.style.width = '400px';
    statsModal.style.maxWidth = '90vw';
    statsModal.style.minHeight = '320px';
    statsModal.style.display = 'flex';
    statsModal.style.flexDirection = 'column';
    statsModal.style.alignItems = 'center';
    statsModal.style.position = 'fixed';

    // Botón X para cerrar
    const closeX = document.createElement('span');
    closeX.textContent = '✖';
    closeX.style.position = 'absolute';
    closeX.style.top = '18px';
    closeX.style.right = '24px';
    closeX.style.fontSize = '2rem';
    closeX.style.cursor = 'pointer';
    closeX.style.color = '#888';
    closeX.onclick = () => {
      statsModal.remove();
    };
    statsModal.appendChild(closeX);


  // Nombre del jugador
  const nombre = document.createElement('h1');
  nombre.textContent = stats.nick || 'Jugador';
  nombre.style.marginTop = '32px';
  nombre.style.marginBottom = '8px';
  statsModal.appendChild(nombre);

  // Imagen del rango (nivel) grande debajo del nombre
  const rangoImg = document.createElement('img');
  rangoImg.src = `../ranks/${stats.nivel || 1}.png`;
  rangoImg.alt = `Rango ${stats.nivel || 1}`;
  rangoImg.style.width = '64px';
  rangoImg.style.height = '64px';
  rangoImg.style.marginBottom = '12px';
  rangoImg.style.display = 'block';
  rangoImg.style.marginLeft = 'auto';
  rangoImg.style.marginRight = 'auto';
  statsModal.appendChild(rangoImg);

    // Barra de experiencia
    const expLabel = document.createElement('div');
    expLabel.textContent = 'Experiencia:';
    expLabel.style.marginTop = '24px';
    expLabel.style.fontSize = '1.2rem';
    statsModal.appendChild(expLabel);

    const expBarContainer = document.createElement('div');
    expBarContainer.style.width = '80%';
    expBarContainer.style.background = '#eee';
    expBarContainer.style.borderRadius = '12px';
    expBarContainer.style.margin = '16px 0';
    expBarContainer.style.height = '32px';
    expBarContainer.style.display = 'flex';
    expBarContainer.style.alignItems = 'center';

    const expBar = document.createElement('div');
    expBar.style.height = '100%';
    expBar.style.width = '0%';
    expBar.style.background = 'linear-gradient(90deg, #4caf50 60%, #8bc34a 100%)';
    expBar.style.borderRadius = '12px';
    expBar.style.transition = 'width 0.3s';

  // Experiencia y nivel (balance actualizado)
  let exp = stats.exp || 0;
  let nivel = stats.nivel || 1;
  // Balance de niveles igual que en backend/index.js
  const thresholds = [0, 200, 450, 800, 1450, 2350, 3400, 4900, 6400, 8800, 10500, 14500, 19100, 24700, 32500, 40000];
  let expMin = thresholds[nivel - 1] || 0;
  let expMax = thresholds[nivel] || 40000;
  let progress = nivel >= 15 ? 100 : ((exp - expMin) / (expMax - expMin)) * 100;
  expBar.style.width = Math.min(progress, 100) + '%';

    expBarContainer.appendChild(expBar);
    statsModal.appendChild(expBarContainer);

    const expText = document.createElement('div');
    expText.textContent = `${exp} / ${expMax}`;
    expText.style.fontSize = '1.1rem';
    expText.style.fontWeight = 'bold';
    statsModal.appendChild(expText);

    // Victorias
    const victoriesLabel = document.createElement('div');
    victoriesLabel.textContent = 'Victorias:';
    victoriesLabel.style.marginTop = '24px';
    victoriesLabel.style.fontSize = '1.2rem';
    statsModal.appendChild(victoriesLabel);

    const victoriesText = document.createElement('div');
    victoriesText.textContent = stats.victories || 0;
    victoriesText.style.fontSize = '1.5rem';
    victoriesText.style.fontWeight = 'bold';
    statsModal.appendChild(victoriesText);

    // Total Kills
    const killsLabel = document.createElement('div');
    killsLabel.textContent = 'Total Kills:';
    killsLabel.style.marginTop = '24px';
    killsLabel.style.fontSize = '1.2rem';
    statsModal.appendChild(killsLabel);

    const killsText = document.createElement('div');
    killsText.textContent = stats.totalKills || 0;
    killsText.style.fontSize = '1.5rem';
    killsText.style.fontWeight = 'bold';
    statsModal.appendChild(killsText);

    // Total Deaths
    const deathsLabel = document.createElement('div');
    deathsLabel.textContent = 'Total Deaths:';
    deathsLabel.style.marginTop = '24px';
    deathsLabel.style.fontSize = '1.2rem';
    statsModal.appendChild(deathsLabel);

    const deathsText = document.createElement('div');
    deathsText.textContent = stats.totalDeaths || 0;
    deathsText.style.fontSize = '1.5rem';
    deathsText.style.fontWeight = 'bold';
    statsModal.appendChild(deathsText);

    document.body.appendChild(statsModal);
  }
}
