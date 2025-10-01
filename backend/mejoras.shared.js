
// Clase Proyectil compartida para frontend y backend
class Proyectil {
  constructor({ x, y, angle, mejora, owner, id, velocidad, radius }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.angle = angle;
    this.mejora = mejora; // objeto de MEJORAS
    this.owner = owner; // nick del jugador
    this.radius = radius || ((mejora && mejora.radius) ? mejora.radius : 16);
    const vel = velocidad || mejora.velocidad;
    this.vx = Math.cos(angle) * vel;
    this.vy = Math.sin(angle) * vel;
    this.activo = true;
    // Tiempo de vida máximo según tipo
    if (mejora.maxLifetime) {
      this.maxLifetime = mejora.maxLifetime;
    } else {
      this.maxLifetime = 1200;
    }
    this.lifetime = 0;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update(dt = 16) {
    // Interpolar hacia target con deadzone para evitar micro-parpadeos
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) {
      // Si está muy cerca, setear directamente para evitar parpadeos
      this.x = this.targetX;
      this.y = this.targetY;
    } else {
      const lerpFactor = 0.3; // ajustar para suavidad
      this.x += dx * lerpFactor;
      this.y += dy * lerpFactor;
    }
    this.lifetime += dt;
    if (this.lifetime >= this.maxLifetime) {
      this.activo = false;
    }
  }

  draw(ctx, offsetX, offsetY) {
    ctx.save();
    ctx.beginPath();
    if (this.mejora.id === 'muro_piedra') {
      // Dibuja un óvalo horizontal para el muro
      const w = this.mejora.width || this.radius * 3;
      const h = this.mejora.height || this.radius;
      ctx.ellipse(
        this.x - offsetX,
        this.y - offsetY,
        w,
        h,
        0,
        0,
        2 * Math.PI
      );
    } else {
      ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, 2 * Math.PI);
    }
    ctx.fillStyle = this.mejora.color;
    ctx.shadowColor = this.mejora.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
  }
}
// mejoras.shared.js
// Archivo compartido para mejoras entre backend y frontend

const MEJORAS = [
  {
    id: 'cuchilla_fria_menor',
    nombre: 'Cuchilla fria menor',
    color: 'deepskyblue',
    velocidad: 13,
    danio: 24,
    cooldown: 0,
    effect: { type: 'slow', amount: 0.35, duration: 1500 },
    proyectilQ: false,
    radius: 10,
    maxRange: 550,
    activacionRapida: false, // Generada, no se activa manualmente
    elemento: 'hielo',
    descripcion: 'Proyectil menor generado por Cuchilla fria. Daño: 12, Velocidad: 13, Radio: 10, Rango: 200. Relentiza un 35% por 1.5 segundos.'
  },
    // Nuevo aumento: Rebote
    {
      id: 'rebote',
      nombre: 'Rebote',
      color: '#FFD700', // dorado
    aumento: true,
  aplicaA: 'proyectil', // Solo mejoras con proyectil: true
      stack: true,
      descripcion: 'Los proyectiles pueden rebotar en muros exteriores y de piedra. Cada stack permite 1 rebote adicional. Al rebotar, el rango máximo se reinicia.'
    },
  {
    id: 'potenciador_proyectil',
    nombre: 'Potenciador',
    aumento: true,
    stack: true,
    aplicaA: 'proyectil',
    descripcion: 'Aumenta la velocidad del proyectil en +8 y el rango de distancia en 150.',
    efecto: {
      velocidad: 8,
      maxRange: 150
    }
  },
  {
    id: 'agrandar',
    nombre: 'Agrandar',
    aumento: true,
    stack: true,
    aplicaA: ['proyectil', 'proyectilQ'],
    descripcion: 'Aumenta el radio del proyectil y la Q en +10.',
    efecto: {
      radius: 10
    }
  },
  {
    id: 'dano_escudo',
    nombre: 'Daño escudo',
    aumento: true,
    stack: false,
    aplicaA: 'escudo',
    descripcion: 'Si tienes un escudo aumenta la duracion del escudo en 1+ segundo y aumenta el escudo recibido en +15, y si recibe daño tu escudo, el rival recibe el 20% del daño que recibe el escudo.',
    efecto: {
      duracion: 1000,
      shieldAmount: 15,
      damageReflection: 0.2
    }
  },
        // Nuevo aumento: Dividor
      {
        id: 'dividor',
        nombre: 'Dividor',
        aumento: true,
        stack: true,
        aplicaA: 'proyectil',
        descripcion: 'Por cada stack, disparas un proyectil adicional en ángulos cercanos al original. Reduce el daño de proyectiles en 3 por stack.',
        efecto: {
          separationAngle: 18, // grados de separación entre cada proyectil
          damageReductionFlat: 3 // reduce daño en 3 por stack
        }
      },
        // Nuevo aumento: Explosión de sabor
        {
          id: 'explosion_sabor',
          nombre: 'Explosión de sabor',
          aumento: true,
          stack: true,
          aplicaA: ['proyectil', 'proyectilQ'],
          descripcion: 'Tus proyectiles al final de su rango o al impactar generan una explosión de daño en área (+40 de radio por stack). Las habilidades con daño en área (ej: Meteoro, Roca fangosa) aumentan su radio de explosión. Reduce el daño de proyectiles y proyectilesQ en un 20%.',
          efecto: {
            explosionRadiusBonus: 40, // radio extra por stack
            damageReduction: 0.20 // reduce daño de proyectiles en 20%
          }
        },

  {
    id: 'fuego',
    nombre: 'Bola de Fuego',
    color: 'orange',
    velocidad: 10,
    danio: 20,
    cooldown: 1400, // ms
    effect: { type: 'dot', damage: 4, duration: 4000 },
    maxRange: 820,
    proyectil: true,
    radius: 16,
    activacionRapida: false, // Requiere apuntar
    elemento: 'fuego',
    descripcion: 'Daño: 20, Velocidad: 10, Bola de Fuego (radio 16) Rango: 820. +4 de daño por segundo durante 3 segundos.'
  },
  {
    id: 'hielo',
    nombre: 'Bola de Hielo',
    color: 'deepskyblue',
    velocidad: 8.5,
    danio: 15,
    cooldown: 1250, // ms
    effect: { type: 'slow', amount: 0.2, duration: 1000 },
    maxRange: 765,
    proyectil: true,
    radius: 14,
    activacionRapida: false, // Requiere apuntar
    elemento: 'hielo',
    descripcion: 'Daño: 15, Velocidad: 8.5, (radio 14) Rango: 765. Proyectil que relentiza al enemigo un 20% por 1 segundo al impactar.'
  },
  {
    id: 'electrico',
    nombre: 'Disparo Eléctrico',
    color: '#c2bf01ff', // verde claro
    velocidad: 16,
    danio: 9,
    cooldown: 1100, // ms
    effect: null,
    maxRange: 1000,
    proyectil: true,
    radius: 9,
    activacionRapida: false, // Requiere apuntar
    elemento: 'electrico',
    descripcion: 'Daño inicial: 9, Velocidad: 16, (radio 9) Rango: 1000. Pasiva: cada vez que aciertas a un enemigo, el daño aumenta en 2. Al ganar o perder la ronda, el daño vuelve a 9.',
    onHit: {
      type: 'damageStack',
      amount: 2
    }
  },
  {
    id: 'meteoro',
  nombre: 'Meteoro',
  color: 'darkred',
  velocidad: 11,
  danio: 50,
  cooldown: 4000, // 4 segundos
  effect: { type: 'dot', damage: 5, duration: 3000 },
  proyectilQ: true,
  radius: 24,
  aimRange: 580, // Rango máximo de skill shot
  maxRange: 580, // Limite real de distancia
  explosionDamage: 25, // Daño en área por explosión
  explosionRadius: 185, // Radio de la explosión
  activacionRapida: false, // Requiere apuntar
  elemento: 'fuego',
  descripcion: 'Daño: 50 directo, Velocidad: 11, Radio: 24, CD: 4 segundos, Rango: 580. Explota al impactar o al final del rango, causando 25 de daño en área (radio 185). Aplica quemadura: 5 daño/seg por 3 segundos.'
  }
  ,
  {
    id: 'cuchilla_fria',
  nombre: 'Cuchilla fria',
  color: 'deepskyblue',
  velocidad: 15,
  danio: 32,
  cooldown: 7000, // 7 segundos
  effect: { type: 'slow', amount: 0.25, duration: 1500 },
  proyectilQ: true,
  radius: 17,
  aimRange: 320, // Rango máximo de skill shot
  maxRange: 320, // Limite real de distancia
  activacionRapida: false, // Requiere apuntar
  elemento: 'hielo',
  descripcion: 'Daño: 32, Velocidad: 15, Radio: 17, CD: 7 segundos, Rango: 320. al impactar o llegar al final, genera 3 Cuchillas frías menores que se dispersan. Relentiza un 25% por 1.5 segundos.'
  }
  ,
  {
    id: 'dardo',
    nombre: 'Dardo',
    color: 'limegreen',
    velocidad: 13,
    danio: 12,
    cooldown: 1300, // ms
    effect: { type: 'stackingDot', damage: 1, duration: 7000 },
    maxRange: 750,
    proyectil: true,
    radius: 14,
    activacionRapida: false, // Requiere apuntar
    elemento: 'veneno',
    descripcion: 'Daño: 12, Velocidad: 13, Radio: 14, Rango: 750. Envenena al enemigo: +1 daño/seg por 6 seg por impacto, stackea ilimitadamente. Refresca duración al impactar.'
  }
];
// Nueva habilidad: Roca fangosa
MEJORAS.push({
  id: 'roca_fangosa',
  nombre: 'Roca fangosa',
  color: 'saddlebrown',
  velocidad: 12, // Valor sugerido, puedes ajustar
  danio: 65,
  cooldown: 6000, // 3 segundos
  proyectilQ: true,
  radius: 105,
  aimRange: 680,
  maxRange: 680,
  skyfall: true,
  castTime: 700, // 0.7 segundos
  activacionRapida: false, // Requiere apuntar
  elemento: 'roca',
  descripcion: 'Daño: 65, CD: 3s, Radio: 105, Rango: 680, castTime: 0.7s. roca que cae del cielo tras 0.7s en el área objetivo, generando un área de lodo que ralentiza a los enemigos un 40% durante 3s.',
});

// Exportación ES Module para frontend y backend

// Habilidad tipo proyuectilE: Muro de piedra
MEJORAS.push({
  id: 'muro_piedra',
  colision: true,
  nombre: 'Muro de piedra',
  color: '#8B5A2B', // café
  velocidad: 0, // No se mueve
  danio: 0, // No hace daño
  cooldown: 8000, // 4 segundos
  proyectilE: true,
  radius: 35, // radio base (no usado para óvalo)
  width: 105, // largo del muro (horizontal)
  height: 28, // alto del muro (ovalado)
  aimRange: 350,
  maxRange: 350,
  duracion: 3500, // 3.5 segundos
  castTime: 200, // 0.7 segundos
  activacionRapida: false, // Requiere apuntar
  elemento: 'roca',
  descripcion: 'Crea un muro de piedra que te protege de proyectiles. CD: 8s, duración: 3.5s, rango: 350px.'
});
// Habilidad tipo proyectilE: Suelo Sagrado
MEJORAS.push({
  id: 'suelo_sagrado',
  nombre: 'Suelo Sagrado',
  color: '#b6e3a2', // verde claro
  velocidad: 0, // No se mueve
  danio: 0, // No hace daño
  cooldown: 9000, // 9 segundos
  proyectilE: true,
  radius: 95, // área de curación
  duracion: 4000, // 4 segundos
  healAmount: 7, // por segundo
  healInterval: 1000, // cada segundo
  soloInvocador: true, // solo cura al invocador
  autoCast: true, // se activa debajo del jugador
  activacionRapida: true, // Fastcast
  elemento: 'curacion',
  descripcion: 'Invoca un área sagrada que cura 7 de vida por segundo durante 3 segundos solo al invocador. CD: 9s. Se activa debajo del jugador al presionar E.'
});
// Nueva habilidad: Escudo Mágico
MEJORAS.push({
  id: 'escudo_magico',
  nombre: 'Escudo Mágico',
  color: '#87CEEB', // skyblue
  velocidad: 0, // No se mueve
  danio: 0, // No hace daño
  cooldown: 7500, // 7.5 segundos
  proyectilE: true,
  shieldAmount: 35, // Daño que absorbe
  duracion: 2000, // 2 segundos
  activacionRapida: true, // Fastcast
  elemento: 'escudo',
  descripcion: 'Crea un escudo mágico que absorbe 35 de daño durante 2 segundos. CD: 7.5s. Se activa instantáneamente al presionar E.'
});
// Nueva habilidad: Teleport
MEJORAS.push({
  id: 'teleport',
  nombre: 'Teleport',
  color: '#FF00FF', // magenta para teleport
  velocidad: 0, // No se mueve
  danio: 0, // No hace daño
  cooldown: 6500, // 6.5 segundos
  proyectilEspacio: true,
  aimRange: 400,
  maxRange: 400,
  activacionRapida: false, // Requiere apuntar
  elemento: 'movimiento',
  descripcion: 'Permite teletransportarte instantáneamente a un punto dentro de 400 unidades alrededor tuyo. CD: 6.5s. Presiona Espacio para previsualizar el rango.'
});
// Nueva habilidad: Impulso Eléctrico
MEJORAS.push({
  id: 'impulso_electrico',
  nombre: 'Impulso electrico',
  color: '#acac04ff', // amarillo para eléctrico
  velocidad: 0,
  danio: 0,
  cooldown: 7000, // 7 segundos
  proyectilEspacio: true,
  effect: { type: 'speedBoost', amount: 0.5, duration: 2500 }, // 50% speed boost por 2.5 segundos
  activacionRapida: true,
  elemento: 'movimiento',
  descripcion: 'Aumenta la velocidad de movimiento del jugador un 50% por 2.5 segundos. CD: 7s. Activación rápida.'
});

// Nueva habilidad: Embestida
MEJORAS.push({
  id: 'embestida',
  nombre: 'Embestida',
  color: '#8B4513', // marrón para movimiento
  velocidad: 20, // velocidad de impulso
  danio: 25, // daño al impactar
  cooldown: 7500, // 7.5 segundos
  proyectilEspacio: true,
  aimRange: 470,
  maxRange: 470,
  activacionRapida: false,
  elemento: 'movimiento',
  descripcion: 'Daño: 25 al impactar y  empuja al enemigo 130 unidades hacia atrás. Velocidad de impulso: 20, CD: 7.5s, Rango: 470.'
});

export { MEJORAS, Proyectil };
