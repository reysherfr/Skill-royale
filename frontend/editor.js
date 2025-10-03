// ============================================
// EDITOR DE MAPAS - SKILL CLASH
// ============================================

// Referencias al canvas y contexto
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

// ============================================
// ESTADO DEL EDITOR
// ============================================
const editor = {
  blocks: [], // Array de bloques colocados
  spawns: [], // Array de spawns colocados (máximo 4)
  currentTool: null, // Herramienta seleccionada
  currentRotation: 0, // Rotación actual en grados
  camera: { x: 0, y: 0, zoom: 1 }, // Cámara para pan y zoom
  isDragging: false, // Si está arrastrando la cámara
  dragStart: { x: 0, y: 0 },
  isSpacePressed: false, // Si la tecla Espacio está presionada
  selectedBlock: null, // Bloque seleccionado para mover/eliminar
  gridSize: 50, // Tamaño de la cuadrícula (aumentado para mejor visualización)
  showGrid: true,
  nextId: 1, // ID único para cada bloque
  // ⚠️ CRÍTICO: Sistema de coordenadas del JUEGO REAL
  // El juego usa coordenadas (0,0) = esquina superior izquierda hasta (2500, 1500)
  workArea: {
    width: 2500,  // ✅ Igual que el mapa del juego
    height: 1500, // ✅ Igual que el mapa del juego
    x: 1250, // Centro del área (2500/2) para visualización
    y: 750   // Centro del área (1500/2) para visualización
  }
};

// Ajustar tamaño del canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 190; // 70px header + 120px toolbar
  if (typeof render === 'function') {
    render();
  }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Definición de tipos de bloques
const BLOCK_TYPES = {
  wall: {
    name: 'Pared',
    width: 200,
    height: 40,
    color: '#8B7765',
    shape: 'rect'
  },
  circle: {
    name: 'Círculo',
    width: 80,
    height: 80,
    color: '#6B5B95',
    shape: 'circle'
  },
  smallblock: {
    name: 'Bloque',
    width: 60,
    height: 60,
    color: '#5D4E37',
    shape: 'rect'
  },
  triangle: {
    name: 'Triángulo',
    width: 80,
    height: 80,
    color: '#B8860B',
    shape: 'triangle'
  },
  spawn: {
    name: 'Spawn',
    width: 50,
    height: 50,
    color: '#4fc3f7',
    shape: 'spawn',
    maxCount: 4 // Máximo 4 spawns
  }
};

// ============================================
// FUNCIONES DE DIBUJO
// ============================================

function worldToScreen(x, y) {
  return {
    x: (x - editor.camera.x) * editor.camera.zoom + canvas.width / 2,
    y: (y - editor.camera.y) * editor.camera.zoom + canvas.height / 2
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - canvas.width / 2) / editor.camera.zoom + editor.camera.x,
    y: (y - canvas.height / 2) / editor.camera.zoom + editor.camera.y
  };
}

function drawWorkArea() {
  ctx.save();

  // Área de trabajo del JUEGO REAL: (0,0) a (2500, 1500)
  const gameLeft = 0;
  const gameTop = 0;
  const gameRight = 2500;
  const gameBottom = 1500;
  
  const topLeft = worldToScreen(gameLeft, gameTop);
  const bottomRight = worldToScreen(gameRight, gameBottom);

  const screenWidth = bottomRight.x - topLeft.x;
  const screenHeight = bottomRight.y - topLeft.y;

  // Fondo del área de trabajo
  ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
  ctx.fillRect(topLeft.x, topLeft.y, screenWidth, screenHeight);

  // Borde del área de trabajo
  ctx.strokeStyle = '#8bc34a';
  ctx.lineWidth = 3;
  ctx.strokeRect(topLeft.x, topLeft.y, screenWidth, screenHeight);

  // Texto de ayuda con dimensiones reales
  ctx.fillStyle = 'rgba(139, 195, 74, 0.8)';
  ctx.font = 'bold 24px Poppins';
  ctx.textAlign = 'center';
  ctx.fillText('MAPA DEL JUEGO - 2500x1500', topLeft.x + screenWidth / 2, topLeft.y - 30);
  
  // Coordenadas de referencia
  ctx.font = '16px Poppins';
  ctx.fillStyle = 'rgba(139, 195, 74, 0.6)';
  ctx.fillText('(0, 0)', topLeft.x + 40, topLeft.y + 30);
  ctx.fillText('(2500, 1500)', bottomRight.x - 80, bottomRight.y - 20);

  ctx.restore();
}

function drawGrid() {
  if (!editor.showGrid) return;

  ctx.save();

  // Obtener límites del área de trabajo (sistema juego: 0,0 a 2500,1500)
  const gameLeft = 0;
  const gameTop = 0;
  const gameRight = 2500;
  const gameBottom = 1500;
  
  const topLeft = worldToScreen(gameLeft, gameTop);
  const bottomRight = worldToScreen(gameRight, gameBottom);

  // Cuadrícula solo dentro del área de trabajo
  ctx.strokeStyle = 'rgba(139, 195, 74, 0.1)';
  ctx.lineWidth = 1;

  const gridSize = editor.gridSize * editor.camera.zoom;
  const workLeft = topLeft.x;
  const workTop = topLeft.y;
  const workRight = bottomRight.x;
  const workBottom = bottomRight.y;

  // Líneas verticales
  const startX = workLeft + (((-editor.camera.x * editor.camera.zoom + canvas.width / 2) - workLeft) % gridSize);
  for (let x = startX; x < workRight; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, workTop);
    ctx.lineTo(x, workBottom);
    ctx.stroke();
  }

  // Líneas horizontales
  const startY = workTop + (((-editor.camera.y * editor.camera.zoom + canvas.height / 2) - workTop) % gridSize);
  for (let y = startY; y < workBottom; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(workLeft, y);
    ctx.lineTo(workRight, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBlock(block, isPreview = false) {
  ctx.save();

  const screenPos = worldToScreen(block.x, block.y);
  ctx.translate(screenPos.x, screenPos.y);
  ctx.rotate(block.angle || 0); // El ángulo ya está en radianes
  ctx.scale(editor.camera.zoom, editor.camera.zoom);

  // Sombra
  if (!isPreview) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
  }

  // Color del bloque
  if (isPreview) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#8bc34a';
  } else if (block === editor.selectedBlock) {
    ctx.fillStyle = '#4fc3f7';
  } else {
    ctx.fillStyle = block.color;
  }

  // Dibujar según forma
  switch (block.shape) {
    case 'rect':
      ctx.fillRect(-block.width / 2, -block.height / 2, block.width, block.height);
      // Borde
      ctx.strokeStyle = isPreview ? '#8bc34a' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-block.width / 2, -block.height / 2, block.width, block.height);
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, block.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Borde
      ctx.strokeStyle = isPreview ? '#8bc34a' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -block.height / 2);
      ctx.lineTo(block.width / 2, block.height / 2);
      ctx.lineTo(-block.width / 2, block.height / 2);
      ctx.closePath();
      ctx.fill();
      // Borde
      ctx.strokeStyle = isPreview ? '#8bc34a' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case 'spawn':
      // Dibujar círculo base
      ctx.beginPath();
      ctx.arc(0, 0, block.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Dibujar estrella en el centro
      ctx.fillStyle = isPreview ? '#ffffff' : '#ffffff';
      const spikes = 5;
      const outerRadius = block.width / 3;
      const innerRadius = block.width / 6;
      
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      // Borde del círculo
      ctx.beginPath();
      ctx.arc(0, 0, block.width / 2, 0, Math.PI * 2);
      ctx.strokeStyle = isPreview ? '#8bc34a' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Número del spawn
      if (!isPreview && block.spawnNumber) {
        ctx.font = 'bold 24px Poppins';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(block.spawnNumber, 0, block.height / 2 + 20);
      }
      break;
  }

  ctx.restore();
}

function render() {
  // Limpiar canvas
  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar área de trabajo primero
  drawWorkArea();

  // Dibujar cuadrícula
  drawGrid();

  // Dibujar bloques
  editor.blocks.forEach(block => drawBlock(block));

  // Dibujar preview del bloque a colocar
  if (editor.currentTool && editor.currentTool !== 'eraser' && editor.mousePos) {
    const blockType = BLOCK_TYPES[editor.currentTool];
    const worldPos = screenToWorld(editor.mousePos.x, editor.mousePos.y);
    
    // Verificar si está dentro del área de trabajo
    const isInsideWorkArea = isPointInWorkArea(worldPos.x, worldPos.y);
    
    const previewBlock = {
      x: worldPos.x,
      y: worldPos.y,
      width: blockType.width,
      height: blockType.height,
      color: blockType.color,
      shape: blockType.shape,
      angle: editor.currentRotation * Math.PI / 180 // Convertir grados a radianes
    };
    
    // Cambiar color si está fuera del área
    if (!isInsideWorkArea) {
      ctx.globalAlpha = 0.3;
    }
    
    drawBlock(previewBlock, true);
    ctx.globalAlpha = 1.0;
  }
}

// Función para verificar si un punto está dentro del área de trabajo
function isPointInWorkArea(x, y) {
  // ✅ Validar que esté dentro del área del juego: (0,0) a (2500, 1500)
  return x >= 0 && x <= 2500 && y >= 0 && y <= 1500;
}

// ============================================
// INTERACCIÓN DEL USUARIO
// ============================================

// Selección de herramientas
document.querySelectorAll('.tool-item').forEach(item => {
  item.addEventListener('click', () => {
    const tool = item.dataset.tool;
    
    // Deseleccionar todas
    document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
    
    // Seleccionar actual
    item.classList.add('active');
    editor.currentTool = tool;
    
    console.log('🔧 Herramienta seleccionada:', tool);
    
    // Actualizar UI
    document.getElementById('currentTool').textContent = 
      tool === 'eraser' ? 'Borrador' : BLOCK_TYPES[tool]?.name || 'Ninguna';
    
    canvas.style.cursor = tool === 'eraser' ? 'not-allowed' : 'crosshair';
  });
});

// Atajos de teclado para herramientas
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  
  // Activar modo arrastre con Espacio
  if (e.code === 'Space' && !editor.isSpacePressed) {
    editor.isSpacePressed = true;
    canvas.style.cursor = 'grab';
    e.preventDefault(); // Prevenir scroll con espacio
    return;
  }
  
  // Seleccionar herramientas con números
  const toolMap = {
    '1': 'wall',
    '2': 'circle',
    '3': 'smallblock',
    '4': 'triangle',
    '5': 'spawn',
    'e': 'eraser'
  };
  
  if (toolMap[key]) {
    const toolElement = document.querySelector(`[data-tool="${toolMap[key]}"]`);
    if (toolElement) toolElement.click();
  }
  
  // Rotar con Q (izquierda), E (derecha), R (avanzado)
  if (key === 'q') {
    editor.currentRotation = (editor.currentRotation - 15 + 360) % 360;
    document.getElementById('currentRotation').textContent = editor.currentRotation + '°';
    
    // Ajustar ligeramente la posición del bloque seleccionado para alineación perfecta
    if (editor.selectedBlock) {
      const angle = editor.currentRotation;
      const snapDistance = 2; // píxeles de ajuste
      
      // Ajustar según el ángulo
      if (angle === 0 || angle === 180) {
        // Horizontal - ajustar verticalmente
        editor.selectedBlock.y = Math.round(editor.selectedBlock.y / 5) * 5;
      } else if (angle === 90 || angle === 270) {
        // Vertical - ajustar horizontalmente
        editor.selectedBlock.x = Math.round(editor.selectedBlock.x / 5) * 5;
      }
      
      editor.selectedBlock.angle = angle * Math.PI / 180; // Guardar en radianes
    }
    
    render();
  }
  
  if (key === 'e') {
    editor.currentRotation = (editor.currentRotation + 15) % 360;
    document.getElementById('currentRotation').textContent = editor.currentRotation + '°';
    
    // Ajustar ligeramente la posición del bloque seleccionado para alineación perfecta
    if (editor.selectedBlock) {
      const angle = editor.currentRotation;
      const snapDistance = 2; // píxeles de ajuste
      
      // Ajustar según el ángulo
      if (angle === 0 || angle === 180) {
        // Horizontal - ajustar verticalmente
        editor.selectedBlock.y = Math.round(editor.selectedBlock.y / 5) * 5;
      } else if (angle === 90 || angle === 270) {
        // Vertical - ajustar horizontalmente
        editor.selectedBlock.x = Math.round(editor.selectedBlock.x / 5) * 5;
      }
      
      editor.selectedBlock.angle = angle * Math.PI / 180; // Guardar en radianes
    }
    
    render();
  }
  
  if (key === 'r') {
    editor.currentRotation = (editor.currentRotation + 15) % 360;
    document.getElementById('currentRotation').textContent = editor.currentRotation + '°';
    render();
  }
  
  // Eliminar bloque seleccionado con Suprimir
  if (key === 'delete' && editor.selectedBlock) {
    const deletedBlock = editor.selectedBlock;
    editor.blocks = editor.blocks.filter(b => b !== editor.selectedBlock);
    editor.selectedBlock = null;
    
    // Renumerar spawns si se eliminó uno
    if (deletedBlock.type === 'spawn') {
      const spawns = editor.blocks.filter(b => b.type === 'spawn');
      spawns.forEach((spawn, index) => {
        spawn.spawnNumber = index + 1;
      });
    }
    
    updateBlockCount();
    updateSpawnCount();
    render();
  }
  
  // Toggle grid con G
  if (key === 'g') {
    editor.showGrid = !editor.showGrid;
    render();
  }
});

// Desactivar modo arrastre al soltar Espacio
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    editor.isSpacePressed = false;
    editor.isDragging = false;
    // Restaurar cursor según la herramienta actual
    canvas.style.cursor = editor.currentTool === 'eraser' ? 'not-allowed' : 'crosshair';
  }
});

// Mouse tracking
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  editor.mousePos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

  // Actualizar coordenadas del mouse en el panel de información
  const worldPos = screenToWorld(editor.mousePos.x, editor.mousePos.y);
  const mouseCoordsEl = document.getElementById('mouseCoords');
  if (mouseCoordsEl) {
    const isValid = isPointInWorkArea(worldPos.x, worldPos.y);
    mouseCoordsEl.textContent = `X: ${Math.round(worldPos.x)}, Y: ${Math.round(worldPos.y)}`;
    mouseCoordsEl.style.color = isValid ? '#4fc3f7' : '#ff5252'; // Azul si válido, rojo si fuera del área
  }

  // Pan de cámara (botón derecho, botón central, o Espacio+Click izquierdo)
  if (editor.isDragging && (e.buttons === 2 || e.buttons === 4 || (e.buttons === 1 && editor.isSpacePressed))) {
    const dx = e.clientX - editor.dragStart.x;
    const dy = e.clientY - editor.dragStart.y;
    
    editor.camera.x -= dx / editor.camera.zoom;
    editor.camera.y -= dy / editor.camera.zoom;
    
    editor.dragStart = { x: e.clientX, y: e.clientY };
  }

  render();
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const worldPos = screenToWorld(mouseX, mouseY);

  console.log('🖱️ Click detectado:', { button: e.button, worldPos, currentTool: editor.currentTool });

  // Click derecho o botón central para pan
  if (e.button === 2 || e.button === 1) { // 2 = derecho, 1 = central
    editor.isDragging = true;
    editor.dragStart = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }

  // Click izquierdo
  if (e.button === 0) {
    // Si Espacio está presionado, activar modo arrastre
    if (editor.isSpacePressed) {
      editor.isDragging = true;
      editor.dragStart = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }
    // Modo borrador
    if (editor.currentTool === 'eraser') {
      // Buscar bloque en posición
      const clickedBlock = editor.blocks.find(block => {
        const dx = worldPos.x - block.x;
        const dy = worldPos.y - block.y;
        
        if (block.shape === 'circle') {
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist <= block.width / 2;
        } else {
          // Aproximación simple para rect y triangle
          return Math.abs(dx) <= block.width / 2 && Math.abs(dy) <= block.height / 2;
        }
      });
      
      if (clickedBlock) {
        editor.blocks = editor.blocks.filter(b => b !== clickedBlock);
        
        // Renumerar spawns si se eliminó uno
        if (clickedBlock.type === 'spawn') {
          const spawns = editor.blocks.filter(b => b.type === 'spawn');
          spawns.forEach((spawn, index) => {
            spawn.spawnNumber = index + 1;
          });
        }
        
        updateBlockCount();
        updateSpawnCount();
        render();
      }
    }
    // Colocar bloque
    else if (editor.currentTool && BLOCK_TYPES[editor.currentTool]) {
      // Verificar que esté dentro del área de trabajo
      if (!isPointInWorkArea(worldPos.x, worldPos.y)) {
        console.warn('⚠️ Intento de colocar bloque fuera del área de trabajo');
        return;
      }
      
      const blockType = BLOCK_TYPES[editor.currentTool];
      
      // Validar límite de spawns
      if (editor.currentTool === 'spawn') {
        const currentSpawns = editor.blocks.filter(b => b.type === 'spawn').length;
        if (currentSpawns >= 4) {
          alert('⚠️ Solo puedes colocar 4 spawns (uno para cada jugador)');
          return;
        }
      }
      
      const newBlock = {
        id: editor.nextId++,
        x: worldPos.x,
        y: worldPos.y,
        width: blockType.width,
        height: blockType.height,
        color: blockType.color,
        shape: blockType.shape,
        angle: editor.currentRotation * Math.PI / 180, // Convertir grados a radianes
        type: editor.currentTool,
        colision: editor.currentTool !== 'spawn' // Todos los bloques excepto spawns tienen colisión
      };
      
      // Asignar número de spawn
      if (editor.currentTool === 'spawn') {
        const currentSpawns = editor.blocks.filter(b => b.type === 'spawn').length;
        newBlock.spawnNumber = currentSpawns + 1;
      }
      
      editor.blocks.push(newBlock);
      updateBlockCount();
      updateSpawnCount();
      render();
      
      console.log('✅ Bloque colocado:', newBlock);
    }
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 2 || e.button === 1 || (e.button === 0 && editor.isSpacePressed)) {
    editor.isDragging = false;
    // Restaurar cursor según el modo
    if (editor.isSpacePressed) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = editor.currentTool === 'eraser' ? 'not-allowed' : 'crosshair';
    }
  }
});

// Prevenir menú contextual
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Zoom con scroll
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const zoomSpeed = 0.1;
  const delta = e.deltaY < 0 ? 1 : -1;
  
  const newZoom = Math.max(0.1, Math.min(3, editor.camera.zoom + delta * zoomSpeed));
  editor.camera.zoom = newZoom;
  
  render();
});

// ============================================
// BOTONES
// ============================================

document.getElementById('btnBack').addEventListener('click', () => {
  if (editor.blocks.length > 0) {
    if (confirm('¿Seguro que quieres salir? Se perderán los cambios no guardados.')) {
      window.location.href = 'menu.html';
    }
  } else {
    window.location.href = 'menu.html';
  }
});

document.getElementById('btnClear').addEventListener('click', () => {
  if (editor.blocks.length > 0) {
    if (confirm('¿Seguro que quieres limpiar todo el mapa?')) {
      editor.blocks = [];
      editor.selectedBlock = null;
      updateBlockCount();
      updateSpawnCount();
      render();
    }
  }
});

document.getElementById('btnSave').addEventListener('click', () => {
  if (editor.blocks.length === 0) {
    alert('⚠️ No hay bloques para guardar. Agrega algunos bloques primero.');
    return;
  }
  
  // Validar que haya exactamente 4 spawns
  const spawnCount = editor.blocks.filter(b => b.type === 'spawn').length;
  if (spawnCount !== 4) {
    alert(`⚠️ Debes colocar exactamente 4 spawns (uno para cada jugador).\nActualmente tienes: ${spawnCount} spawns.`);
    return;
  }
  
  // Mostrar modal
  document.getElementById('saveModal').classList.add('active');
  document.getElementById('mapName').value = '';
  document.getElementById('saveError').textContent = '';
  document.getElementById('mapName').focus();
});

document.getElementById('btnCancelSave').addEventListener('click', () => {
  document.getElementById('saveModal').classList.remove('active');
});

document.getElementById('btnConfirmSave').addEventListener('click', async () => {
  const mapName = document.getElementById('mapName').value.trim();
  const errorEl = document.getElementById('saveError');
  
  if (!mapName) {
    errorEl.textContent = 'Por favor ingresa un nombre para el mapa';
    return;
  }
  
  if (mapName.length < 3) {
    errorEl.textContent = 'El nombre debe tener al menos 3 caracteres';
    return;
  }
  
  // Guardar mapa
  try {
    await saveMap(mapName);
    document.getElementById('saveModal').classList.remove('active');
    
    // Mostrar mensaje de éxito
    alert(`✅ Mapa "${mapName}" guardado exitosamente!\n\nAhora aparecerá aleatoriamente en las partidas online.`);
    
    // Limpiar editor
    editor.blocks = [];
    editor.selectedBlock = null;
    updateBlockCount();
    updateSpawnCount();
    render();
    
  } catch (error) {
    errorEl.textContent = 'Error al guardar el mapa: ' + error.message;
  }
});

// ============================================
// GUARDAR MAPA
// ============================================

async function saveMap(mapName) {
  // Separar spawns y bloques normales
  const spawns = editor.blocks.filter(b => b.type === 'spawn');
  const normalBlocks = editor.blocks.filter(b => b.type !== 'spawn');
  
  // Crear objeto del mapa
  const mapData = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: mapName,
    createdAt: new Date().toISOString(),
    spawns: spawns.map(spawn => ({
      x: Math.round(spawn.x),
      y: Math.round(spawn.y),
      spawnNumber: spawn.spawnNumber
    })),
    blocks: normalBlocks.map(block => ({
      x: Math.round(block.x),
      y: Math.round(block.y),
      width: block.width,
      height: block.height,
      angle: block.angle,
      color: block.color,
      shape: block.shape,
      type: block.type,
      colision: true // Todos los bloques del mapa tienen colisión
    }))
  };
  
  // Obtener mapas existentes
  let existingMaps = [];
  try {
    const response = await fetch('mapas.js');
    const text = await response.text();
    
    // Parsear el archivo mapas.js
    const match = text.match(/export const MAPAS = (\[[\s\S]*?\]);/);
    if (match && match[1]) {
      existingMaps = JSON.parse(match[1]);
    }
  } catch (error) {
    console.log('No se encontró mapas.js, se creará uno nuevo');
  }
  
  // Agregar nuevo mapa
  existingMaps.push(mapData);
  
  // Generar contenido del archivo
  const fileContent = `// ============================================
// MAPAS PERSONALIZADOS - SKILL CLASH
// Mapas creados con el editor de mapas
// ============================================

export const MAPAS = ${JSON.stringify(existingMaps, null, 2)};

// Obtener un mapa aleatorio
export function getRandomMap() {
  if (MAPAS.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * MAPAS.length);
  return MAPAS[randomIndex];
}

// Obtener mapa por ID
export function getMapById(id) {
  return MAPAS.find(map => map.id === id);
}

// Obtener mapa por nombre
export function getMapByName(name) {
  return MAPAS.find(map => map.name.toLowerCase() === name.toLowerCase());
}
`;

  // Enviar al servidor para guardar
  const response = await fetch('http://localhost:3000/save-map', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: fileContent
    })
  });
  
  if (!response.ok) {
    throw new Error('Error al guardar en el servidor');
  }
  
  console.log('✅ Mapa guardado:', mapName);
}

// ============================================
// UTILIDADES
// ============================================

function updateBlockCount() {
  document.getElementById('blockCount').textContent = editor.blocks.length;
}

function updateSpawnCount() {
  const spawnCount = editor.blocks.filter(b => b.type === 'spawn').length;
  const spawnCountEl = document.getElementById('spawnCount');
  if (spawnCountEl) {
    spawnCountEl.textContent = `${spawnCount}/4`;
    spawnCountEl.style.color = spawnCount === 4 ? '#4fc3f7' : spawnCount > 0 ? '#8bc34a' : '#ff9800';
  }
}

// Inicializar
updateBlockCount();
updateSpawnCount();
render();

console.log('🎨 Editor de Mapas iniciado');
console.log('Controles:');
console.log('  - 1-4: Seleccionar herramientas');
console.log('  - R: Rotar');
console.log('  - E: Borrador');
console.log('  - Supr: Eliminar seleccionado');
console.log('  - G: Toggle grid');
console.log('  - Scroll: Zoom');
console.log('  - Click derecho + arrastrar: Pan');
