// 🎲 SISTEMA DE GENERACIÓN PROCEDURAL DE BLOQUES
// Este archivo maneja todos los bloques que aparecen durante el combate

const MAP_WIDTH = 2500;
const MAP_HEIGHT = 1500;

// 🚫 Configuración de zonas seguras (spawn de jugadores)
const SPAWN_SAFE_DISTANCE = 250;
const spawnZones = [
  { x: 200, y: 200 },                    // Esquina superior izquierda
  { x: MAP_WIDTH - 200, y: 200 },        // Esquina superior derecha
  { x: 200, y: MAP_HEIGHT - 200 },       // Esquina inferior izquierda
  { x: MAP_WIDTH - 200, y: MAP_HEIGHT - 200 } // Esquina inferior derecha
];

// Función auxiliar para verificar si una posición está cerca de spawn
function estaCercaDeSpawn(x, y) {
  for (const spawn of spawnZones) {
    const dx = x - spawn.x;
    const dy = y - spawn.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < SPAWN_SAFE_DISTANCE) {
      return true;
    }
  }
  return false;
}

// 🪨 DEFINICIÓN DE TIPOS DE BLOQUES
const TIPOS_BLOQUES = {
  // Pilar Central
  PILAR_CENTRAL: {
    id: 'muro_piedra',
    nombre: 'Pilar Central',
    colision: true,
    forma: 'ovalada',
    duracion: 999999999,
    generacion: {
      cantidad: 1,
      posicion: 'centro',
      tamaño: {
        width: 140,
        height: 140
      },
      color: '#5D4E37',
      radius: 50
    }
  },

  // Pilares Estratégicos (existentes)
  PILARES_ESTRATEGICOS: {
    id: 'muro_piedra',
    nombre: 'Pilares Estratégicos',
    colision: true,
    forma: 'ovalada',
    duracion: 999999999,
    generacion: {
      cantidad: { min: 3, max: 5 }, // Varía según ronda
      posicion: 'alrededor_centro',
      radio: { min: 320, max: 440 },
      tamaño: {
        width: { min: 70, max: 90 },
        height: { min: 70, max: 90 }
      },
      color: '#6B5D4F',
      radius: 40
    }
  },

  // Muros Defensivos (existentes)
  MUROS_DEFENSIVOS: {
    id: 'muro_piedra',
    nombre: 'Muros Defensivos',
    colision: true,
    forma: 'ovalada',
    duracion: 999999999,
    generacion: {
      cantidad: 4,
      posicion: 'esquinas',
      offset: 450,
      tamaño: {
        width: 100,
        height: 45
      },
      color: '#4A4238',
      radius: 40
    }
  },

  // Pasillos Laterales (existentes)
  PASILLOS_LATERALES: {
    id: 'muro_piedra',
    nombre: 'Pasillos Laterales',
    colision: true,
    forma: 'ovalada',
    duracion: 999999999,
    generacion: {
      cantidad: { min: 2, max: 4 },
      posicion: 'laterales',
      tamaño: {
        width: { min: 150, max: 230 },
        height: { min: 35, max: 50 }
      },
      color: '#7D6E5D',
      radius: 30
    }
  },

  // Coberturas Tácticas (existentes)
  COBERTURAS_TACTICAS: {
    id: 'muro_piedra',
    nombre: 'Coberturas Tácticas',
    colision: true,
    forma: 'ovalada',
    duracion: 999999999,
    generacion: {
      cantidad: { min: 4, max: 7 },
      posicion: 'semi_aleatorio',
      tamaño: {
        width: { min: 60, max: 84 },
        height: { min: 30, max: 45 }
      },
      color: '#8B7355',
      radius: 25
    }
  }
};

// 🎮 GENERADOR DE BLOQUES
export function generarBloquesPorRonda(roomId, roundNumber = 1) {
  const bloques = [];
  const centerX = MAP_WIDTH / 2;
  const centerY = MAP_HEIGHT / 2;
  
  console.log(`🎲 Generando bloques procedurales para Ronda ${roundNumber}...`);

  // 1️⃣ Generar PILAR CENTRAL
  const pilarCentral = TIPOS_BLOQUES.PILAR_CENTRAL;
  bloques.push({
    id: pilarCentral.id,
    tipo: 'pilar_central',
    colision: pilarCentral.colision,
    x: centerX,
    y: centerY,
    creado: Date.now(),
    duracion: pilarCentral.duracion,
    color: pilarCentral.generacion.color,
    radius: pilarCentral.generacion.radius,
    width: pilarCentral.generacion.tamaño.width,
    height: pilarCentral.generacion.tamaño.height,
    angle: 0
  });
  
  console.log(`  ✅ 1 Pilar Central generado`);

  // 2️⃣ Generar PILARES ESTRATÉGICOS
  const pilaresEst = TIPOS_BLOQUES.PILARES_ESTRATEGICOS;
  const numPillars = pilaresEst.generacion.cantidad.min + (roundNumber % (pilaresEst.generacion.cantidad.max - pilaresEst.generacion.cantidad.min + 1));
  const pillarRadius = pilaresEst.generacion.radio.min + (roundNumber % 4) * 40;
  const angleOffset = (roundNumber * 0.3) % (Math.PI * 2);
  
  for (let i = 0; i < numPillars; i++) {
    const angle = (i * (Math.PI * 2) / numPillars) + angleOffset;
    const x = centerX + Math.cos(angle) * pillarRadius;
    const y = centerY + Math.sin(angle) * pillarRadius;
    
    if (!estaCercaDeSpawn(x, y)) {
      const width = pilaresEst.generacion.tamaño.width.min + (roundNumber % 3) * 10;
      const height = pilaresEst.generacion.tamaño.height.min + (roundNumber % 3) * 10;
      
      bloques.push({
        id: pilaresEst.id,
        tipo: 'pilar_estrategico',
        colision: pilaresEst.colision,
        x: x,
        y: y,
        creado: Date.now(),
        duracion: pilaresEst.duracion,
        color: pilaresEst.generacion.color,
        radius: pilaresEst.generacion.radius,
        width: width,
        height: height,
        angle: angle
      });
    }
  }
  
  console.log(`  ✅ ${numPillars} Pilares Estratégicos generados`);

  // 3️⃣ Generar MUROS DEFENSIVOS
  const murosDefensivos = TIPOS_BLOQUES.MUROS_DEFENSIVOS;
  const cornerOffset = murosDefensivos.generacion.offset;
  const cornerWalls = [
    { x: cornerOffset, y: cornerOffset, angle: Math.PI / 4 },
    { x: MAP_WIDTH - cornerOffset, y: cornerOffset, angle: -Math.PI / 4 },
    { x: cornerOffset, y: MAP_HEIGHT - cornerOffset, angle: -Math.PI / 4 },
    { x: MAP_WIDTH - cornerOffset, y: MAP_HEIGHT - cornerOffset, angle: Math.PI / 4 }
  ];
  
  cornerWalls.forEach(wall => {
    if (!estaCercaDeSpawn(wall.x, wall.y)) {
      bloques.push({
        id: murosDefensivos.id,
        tipo: 'muro_defensivo',
        colision: murosDefensivos.colision,
        x: wall.x,
        y: wall.y,
        creado: Date.now(),
        duracion: murosDefensivos.duracion,
        color: murosDefensivos.generacion.color,
        radius: murosDefensivos.generacion.radius,
        width: murosDefensivos.generacion.tamaño.width,
        height: murosDefensivos.generacion.tamaño.height,
        angle: wall.angle
      });
    }
  });
  
  console.log(`  ✅ ${cornerWalls.length} Muros Defensivos generados`);

  // 4️⃣ Generar PASILLOS LATERALES
  const pasillos = TIPOS_BLOQUES.PASILLOS_LATERALES;
  const numSideWalls = pasillos.generacion.cantidad.min + (roundNumber % (pasillos.generacion.cantidad.max - pasillos.generacion.cantidad.min + 1));
  
  for (let i = 0; i < numSideWalls; i++) {
    const offsetFromCenter = 400 + (i * 150) + ((roundNumber * 37) % 100);
    const yPos = 400 + ((roundNumber * 53 + i * 71) % 200);
    const isTop = i % 2 === 0;
    const x = centerX + (i % 2 === 0 ? -offsetFromCenter : offsetFromCenter);
    const y = isTop ? yPos : MAP_HEIGHT - yPos;
    
    if (!estaCercaDeSpawn(x, y)) {
      const width = pasillos.generacion.tamaño.width.min + (roundNumber % 4) * 20;
      const height = pasillos.generacion.tamaño.height.min + (roundNumber % 3) * 5;
      
      bloques.push({
        id: pasillos.id,
        tipo: 'pasillo_lateral',
        colision: pasillos.colision,
        x: x,
        y: y,
        creado: Date.now(),
        duracion: pasillos.duracion,
        color: pasillos.generacion.color,
        radius: pasillos.generacion.radius,
        width: width,
        height: height,
        angle: (roundNumber * 0.1 + i * 0.2) % (Math.PI / 4)
      });
    }
  }
  
  console.log(`  ✅ ${numSideWalls} Pasillos Laterales generados`);

  // 5️⃣ Generar COBERTURAS TÁCTICAS
  const coberturas = TIPOS_BLOQUES.COBERTURAS_TACTICAS;
  const numCovers = coberturas.generacion.cantidad.min + (roundNumber % (coberturas.generacion.cantidad.max - coberturas.generacion.cantidad.min + 1));
  
  for (let i = 0; i < numCovers; i++) {
    const sideMultiplier = i % 2 === 0 ? 1 : -1;
    const x = centerX + sideMultiplier * (500 + ((roundNumber * 41 + i * 83) % 300));
    const y = centerY + (i % 2 === 0 ? -1 : 1) * (150 + ((roundNumber * 29 + i * 97) % 200));
    
    if (!estaCercaDeSpawn(x, y)) {
      const width = coberturas.generacion.tamaño.width.min + (roundNumber % 3) * 8;
      const height = coberturas.generacion.tamaño.height.min + (roundNumber % 3) * 5;
      
      bloques.push({
        id: coberturas.id,
        tipo: 'cobertura_tactica',
        colision: coberturas.colision,
        x: x,
        y: y,
        creado: Date.now(),
        duracion: coberturas.duracion,
        color: coberturas.generacion.color,
        radius: coberturas.generacion.radius,
        width: width,
        height: height,
        angle: (roundNumber * 0.2 + i * 0.5) % Math.PI
      });
    }
  }
  
  console.log(`  ✅ ${numCovers} Coberturas Tácticas generadas`);
  console.log(`🎮 Total: ${bloques.length} bloques generados para la Ronda ${roundNumber}\n`);
  
  return bloques;
}

// Exportar también los tipos de bloques por si se necesitan
export { TIPOS_BLOQUES };
