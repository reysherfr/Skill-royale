// players.js
// Lógica de los jugadores para el juego



export class Player {
  constructor({ nick, x = 0, y = 0, color = '#2a5298', isLocal = false, speed = 2, mejoras = [] }) {
    this.nick = nick;
    this.x = x;
    this.y = y;
    this.color = color;
    this.isLocal = isLocal;
    this.health = 200;
    this.speed = speed;
    this.mejoras = mejoras;
  }

  // Método de movimiento eliminado
  // Método de movimiento eliminado
}

export function createPlayersFromSala(sala, localNick) {
  return sala.players.map(p => new Player({
    ...p,
    color: p.nick === localNick ? '#2a5298' : '#d32f2f',
    isLocal: p.nick === localNick
  }));
}
