// Determine server URL based on environment
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'http://138.68.250.124:3000';

// Verificar usuario logueado
const user = JSON.parse(localStorage.getItem('batlesd_user'));
if (!user) {
  window.location.href = 'index.html';
}

// Mostrar lista de salas (aún no implementada)

const roomsList = document.getElementById('roomsList');

// Conectar Socket.IO
const socket = io('http://localhost:3000');

socket.on('roomsUpdated', () => {
  cargarSalas();
});

async function cargarSalas() {
  try {
    const res = await fetch(`${SERVER_URL}/rooms`);
    const data = await res.json();
    
    if (data.success && data.salas.length > 0) {
      roomsList.innerHTML = '';
      
      data.salas.forEach(sala => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-item-card';
        
        roomCard.innerHTML = `
          <div class="room-item-header">
            <div class="room-host-info">
              <div class="room-host-avatar">
                <img src="ranks/${sala.host.nivel || 1}.png" alt="Rank ${sala.host.nivel || 1}">
              </div>
              <div class="room-host-details">
                <div class="room-host-name">${sala.host.nick}</div>
                <div class="room-host-badge">👑 Anfitrión</div>
              </div>
            </div>
            <div class="room-players-count">
              <span class="players-icon">👥</span>
              <span class="players-number">${sala.players.length}/4</span>
            </div>
          </div>
          
          <div class="room-item-players">
            ${sala.players.map((player, index) => `
              <div class="room-mini-player">
                <img src="ranks/${player.nivel || 1}.png" alt="Player ${index + 1}">
              </div>
            `).join('')}
            ${Array(4 - sala.players.length).fill(0).map(() => `
              <div class="room-mini-player empty">
                <span>?</span>
              </div>
            `).join('')}
          </div>
          
          <button class="join-room-btn" data-roomid="${sala.id}">
            <span class="btn-icon">⚔️</span>
            <span>Unirse a la Batalla</span>
            <span class="btn-arrow">→</span>
          </button>
        `;
        
        roomsList.appendChild(roomCard);
      });
      
      // Agregar eventos a los botones Join
      document.querySelectorAll('.join-room-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          const roomId = this.dataset.roomid;
          this.innerHTML = '<span class="btn-loading">Uniéndose...</span>';
          this.disabled = true;
          
          try {
            const res = await fetch(`${SERVER_URL}/join-room`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: roomId, nick: user.nick, nivel: user.nivel })
            });
            const data = await res.json();
            if (data.success) {
              localStorage.setItem('batlesd_room_id', roomId);
              window.location.href = 'room.html';
            } else {
              alert(data.error || 'No se pudo unir a la sala.');
              this.disabled = false;
              this.innerHTML = '<span class="btn-icon">⚔️</span><span>Unirse a la Batalla</span><span class="btn-arrow">→</span>';
            }
          } catch (err) {
            alert('Error al conectar al servidor.');
            this.disabled = false;
            this.innerHTML = '<span class="btn-icon">⚔️</span><span>Unirse a la Batalla</span><span class="btn-arrow">→</span>';
          }
        });
      });
    } else {
      roomsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <h3>No hay salas disponibles</h3>
          <p>¡Sé el primero en crear una sala!</p>
          <button onclick="window.location.href='menu.html'" class="create-room-btn">
            Crear Sala
          </button>
        </div>
      `;
    }
  } catch (err) {
    roomsList.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error de conexión</h3>
        <p>No se pudo conectar al servidor</p>
        <button onclick="cargarSalas()" class="retry-btn">
          🔄 Reintentar
        </button>
      </div>
    `;
  }
}

cargarSalas();

// Botón salir
const exitBtn = document.getElementById('exitBtn');
exitBtn.addEventListener('click', () => {
  window.location.href = 'menu.html';
});
