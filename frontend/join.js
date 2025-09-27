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
    const res = await fetch('http://localhost:3000/rooms');
    const data = await res.json();
    if (data.success && data.salas.length > 0) {
      roomsList.innerHTML = '';
      data.salas.forEach(sala => {
        roomsList.innerHTML += `<div style="margin-bottom:10px; padding:8px; border-radius:8px; background:#f0f4fa; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <strong>${sala.host.nick}</strong> <span style="color:#2a5298;">(Host)</span><br>
            <span style="color:#555;">Jugadores: ${sala.players.length}/4</span>
          </div>
          <button class="joinRoomBtn" data-roomid="${sala.id}" style="background:#2a5298; color:#fff; border:none; border-radius:8px; padding:8px 16px; cursor:pointer;">Join</button>
        </div>`;
      });
      // Agregar eventos a los botones Join
      document.querySelectorAll('.joinRoomBtn').forEach(btn => {
        btn.addEventListener('click', async function() {
          const roomId = this.dataset.roomid;
          try {
            const res = await fetch('http://localhost:3000/join-room', {
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
            }
          } catch (err) {
            alert('Error al conectar al servidor.');
          }
        });
      });
    } else {
      roomsList.innerHTML = '<div style="color:#b0c4de;">No hay salas disponibles.</div>';
    }
  } catch (err) {
    roomsList.innerHTML = '<div style="color:#d32f2f;">Error al conectar al servidor.</div>';
  }
}

cargarSalas();

// Botón salir
const exitBtn = document.getElementById('exitBtn');
exitBtn.addEventListener('click', () => {
  window.location.href = 'menu.html';
});
