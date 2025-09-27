// players.js
// Lógica de los jugadores para el juego



export class Player {
  constructor({ nick, x = 0, y = 0, color = '#2a5298', isLocal = false, speed = 5, mejoras = [] }) {
    this.nick = nick;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.color = color;
    this.isLocal = isLocal;
    this.health = 100;
    this.speed = speed;
    this.mejoras = mejoras;
  }

  // Interpolación suave para jugadores remotos
  interpolatePosition(alpha = 0.2) {
    if (!this.isLocal) {
      this.x += (this.targetX - this.x) * alpha;
      this.y += (this.targetY - this.y) * alpha;
    }
  }
}

export function createPlayersFromSala(sala, localNick) {
  return sala.players.map(p => new Player({
    ...p,
    color: p.nick === localNick ? '#2a5298' : '#d32f2f',
    isLocal: p.nick === localNick
  }));
}
