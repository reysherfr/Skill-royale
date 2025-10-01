# 🎲 Sistema de Generación Procedural de Bloques

Este sistema maneja todos los bloques que aparecen en el mapa durante el combate.

## 📁 Archivo: `procedural.js`

### ✨ Características

- **Organización clara**: Todos los tipos de bloques están definidos en un solo lugar
- **Fácil de extender**: Añadir nuevos tipos de bloques es simple
- **Generación procedural**: Los bloques cambian según la ronda
- **Protección de spawn**: Los bloques nunca aparecen cerca de las zonas de spawn
- **Soporte para imágenes**: Los bloques pueden usar texturas/imágenes personalizadas

## 🪨 Tipos de Bloques Actuales

### 1. **Muro de Roca** (NUEVO)
- **Cantidad**: 7 bloques por ronda
- **Imagen**: `muros/muroo.png`
- **Colisión**: Sigue la forma de la imagen (ovalada)
- **Posición**: Aleatoria (evitando spawns y otros muros de roca)
- **Tamaño**: 120x100px

### 2. **Pilar Central**
- **Cantidad**: 1
- **Posición**: Centro del mapa
- **Tamaño**: 140x140px
- **Color**: `#5D4E37`

### 3. **Pilares Estratégicos**
- **Cantidad**: 3-5 (varía según ronda)
- **Posición**: Alrededor del centro en círculo
- **Tamaño**: 70-90px (varía según ronda)
- **Color**: `#6B5D4F`

### 4. **Muros Defensivos**
- **Cantidad**: 4
- **Posición**: Cerca de las esquinas (alejados de spawn)
- **Tamaño**: 100x45px
- **Color**: `#4A4238`

### 5. **Pasillos Laterales**
- **Cantidad**: 2-4 (varía según ronda)
- **Posición**: Laterales del mapa
- **Tamaño**: 150-230px de ancho (varía según ronda)
- **Color**: `#7D6E5D`

### 6. **Coberturas Tácticas**
- **Cantidad**: 4-7 (varía según ronda)
- **Posición**: Semi-aleatoria alrededor del centro
- **Tamaño**: 60-84px de ancho (varía según ronda)
- **Color**: `#8B7355`

## ➕ Cómo Añadir un Nuevo Tipo de Bloque

### Paso 1: Definir el tipo en `TIPOS_BLOQUES`

```javascript
NUEVO_BLOQUE: {
  id: 'id_del_bloque',
  nombre: 'Nombre del Bloque',
  imagen: 'ruta/imagen.png', // Opcional, si usa imagen
  colision: true,
  forma: 'ovalada', // 'ovalada' o 'imagen'
  duracion: 999999999, // Permanente
  generacion: {
    cantidad: 5, // o { min: 3, max: 6 }
    posicion: 'aleatorio', // 'centro', 'esquinas', 'laterales', 'semi_aleatorio', 'alrededor_centro'
    tamaño: {
      width: 100,
      height: 80
    },
    color: '#HEXCOLOR',
    radius: 40
  }
}
```

### Paso 2: Añadir la lógica de generación en `generarBloquesPorRonda()`

Copia y adapta uno de los bloques existentes según tus necesidades.

### Ejemplo Completo:

```javascript
// En TIPOS_BLOQUES
ARBOL: {
  id: 'arbol',
  nombre: 'Árbol',
  imagen: 'arboles/arbol1.png',
  colision: true,
  forma: 'imagen',
  duracion: 999999999,
  generacion: {
    cantidad: { min: 3, max: 5 },
    tamaño: {
      width: 80,
      height: 100
    },
    color: '#2D5016',
    radius: 45
  }
}

// En generarBloquesPorRonda()
const arboles = TIPOS_BLOQUES.ARBOL;
const numArboles = arboles.generacion.cantidad.min + 
  (roundNumber % (arboles.generacion.cantidad.max - arboles.generacion.cantidad.min + 1));

for (let i = 0; i < numArboles; i++) {
  // Generar posición aleatoria válida
  let x = 400 + Math.random() * (MAP_WIDTH - 800);
  let y = 400 + Math.random() * (MAP_HEIGHT - 800);
  
  if (!estaCercaDeSpawn(x, y)) {
    bloques.push({
      id: arboles.id,
      tipo: 'arbol',
      colision: arboles.colision,
      imagen: arboles.imagen,
      x: x,
      y: y,
      creado: Date.now(),
      duracion: arboles.duracion,
      color: arboles.generacion.color,
      radius: arboles.generacion.radius,
      width: arboles.generacion.tamaño.width,
      height: arboles.generacion.tamaño.height,
      angle: Math.random() * Math.PI * 2
    });
  }
}
```

## 🎮 Integración

El sistema se integra automáticamente en `index.js`:

```javascript
import { generarBloquesPorRonda } from './procedural.js';

function crearEscenarioBatalla(roomId, roundNumber = 1) {
  murosPorSala[roomId] = [];
  const bloques = generarBloquesPorRonda(roomId, roundNumber);
  murosPorSala[roomId] = bloques;
}
```

## 🖼️ Soporte de Imágenes

Los bloques con la propiedad `imagen` se renderizan usando la imagen especificada en el frontend. La colisión se calcula de forma ovalada siguiendo las dimensiones de la imagen.

### Requisitos para imágenes:
- Colocar la imagen en la carpeta correspondiente (ej: `frontend/muros/`)
- La ruta debe ser relativa al frontend
- Formato recomendado: PNG con transparencia
- Tamaño recomendado: 256x256px o similar

## 📊 Logs

El sistema genera logs detallados en consola:

```
🎲 Generando bloques procedurales para Ronda 1...
  ✅ 7 Muros de Roca generados
  ✅ 1 Pilar Central generado
  ✅ 4 Pilares Estratégicos generados
  ✅ 4 Muros Defensivos generados
  ✅ 3 Pasillos Laterales generados
  ✅ 6 Coberturas Tácticas generadas
🎮 Total: 25 bloques generados para la Ronda 1
```

---

**Creado**: Septiembre 30, 2025
**Versión**: 1.0
