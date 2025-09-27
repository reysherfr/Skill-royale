// players.js
// Lógica de los jugadores para el juego

export const DEFAULT_SPEED = 3.7;

export class Player {
  constructor({ nick, x = 0, y = 0, color = '#2a5298', isLocal = false, speed = DEFAULT_SPEED, mejoras = [] }) {
    this.nick = nick;
    this.x = x;
    this.y = y;
    this.color = color;
    this.isLocal = isLocal;
    this.health = 100;
    this.speed = speed;
    this.mejoras = mejoras;
  }

  move(dx, dy, canvas) {
    // Limitar movimiento dentro del canvas
    const radius = 32;
    this.x = Math.max(radius, Math.min(canvas.width - radius, this.x + dx * this.speed));
    this.y = Math.max(radius, Math.min(canvas.height - radius, this.y + dy * this.speed));
  }
}

export function createPlayersFromSala(sala, localNick) {
  return sala.players.map(p => new Player({
    ...p,
    color: p.nick === localNick ? '#2a5298' : '#d32f2f',
    isLocal: p.nick === localNick
  }));
}
