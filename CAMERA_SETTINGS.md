# 🎥 Sistema de Cámara Suave - Estilo Battlerite

## 📋 Descripción
Implementación de una cámara cinemática con seguimiento suave e interpolado, similar a la usada en Battlerite. La cámara sigue al jugador con un retraso natural y anticipa el movimiento basándose en la posición del mouse.

## ⚙️ Parámetros Configurables

### 1. `CAMERA_LERP_SPEED` (Velocidad de Interpolación)
- **Ubicación:** `room.js` línea ~861
- **Valor actual:** `0.08`
- **Rango recomendado:** `0.05 - 0.15`
- **Efecto:**
  - **Más bajo (0.05):** Cámara MUY suave, retraso más notorio (como Battlerite)
  - **Medio (0.08-0.10):** Balance entre suavidad y respuesta
  - **Más alto (0.15):** Cámara más rápida, menos retraso

### 2. `CAMERA_MOUSE_INFLUENCE` (Influencia del Mouse)
- **Ubicación:** `room.js` línea ~862
- **Valor actual:** `0.15`
- **Rango recomendado:** `0 - 0.3`
- **Efecto:**
  - **0:** Sin anticipación del mouse, solo sigue al jugador
  - **0.1-0.2:** Anticipación sutil (recomendado para PvP)
  - **0.3+:** Anticipación agresiva, cámara se mueve mucho con el mouse

### 3. `CAMERA_MOUSE_MAX_OFFSET` (Desplazamiento Máximo)
- **Ubicación:** `room.js` línea ~863
- **Valor actual:** `150` píxeles
- **Rango recomendado:** `100 - 250`
- **Efecto:**
  - **100px:** Anticipación limitada, cámara más centrada
  - **150px:** Balance ideal para arenas medianas
  - **250px:** Mayor campo de visión anticipado, mejor para mapas grandes

## 🎮 Comportamiento del Sistema

### Seguimiento Normal
```
Jugador se mueve → Cámara interpola suavemente hacia él
                  → Se agrega offset basado en posición del mouse
                  → Resultado: Movimiento fluido y natural
```

### Cuando el Jugador se Detiene
```
Velocidad del jugador = 0 → Cámara continúa interpolando
                          → Regresa suavemente al jugador
                          → Sin movimientos bruscos
```

### Anticipación del Mouse
```
Mouse alejado del centro → Cámara se desplaza ligeramente en esa dirección
                         → Limitado por CAMERA_MOUSE_MAX_OFFSET
                         → Te da más visión hacia donde apuntas
```

## 🔧 Ajustes Recomendados por Estilo de Juego

### Estilo "Battlerite Clásico" (Arena PvP)
```javascript
const CAMERA_LERP_SPEED = 0.06;        // Muy suave
const CAMERA_MOUSE_INFLUENCE = 0.12;   // Anticipación sutil
const CAMERA_MOUSE_MAX_OFFSET = 120;   // Limitado
```

### Estilo "Competitivo Rápido"
```javascript
const CAMERA_LERP_SPEED = 0.12;        // Más responsiva
const CAMERA_MOUSE_INFLUENCE = 0.20;   // Más anticipación
const CAMERA_MOUSE_MAX_OFFSET = 180;   // Más visión
```

### Estilo "Cinemático Suave"
```javascript
const CAMERA_LERP_SPEED = 0.05;        // Muy lento
const CAMERA_MOUSE_INFLUENCE = 0.08;   // Mínima anticipación
const CAMERA_MOUSE_MAX_OFFSET = 100;   // Conservador
```

### Estilo "Sin Anticipación" (Solo Seguimiento)
```javascript
const CAMERA_LERP_SPEED = 0.08;        // Normal
const CAMERA_MOUSE_INFLUENCE = 0;      // Sin mouse
const CAMERA_MOUSE_MAX_OFFSET = 0;     // Sin offset
```

## 🎯 Ventajas del Sistema

✅ **Movimiento fluido:** Sin saltos bruscos ni teleports de cámara
✅ **Sensación profesional:** Similar a juegos AAA como Battlerite, League of Legends
✅ **Anticipación táctica:** Ves más hacia donde apuntas antes de moverte
✅ **Menos mareos:** El retraso suave es más cómodo que cámaras pegadas
✅ **Mayor inmersión:** Se siente más natural y cinemático

## 🐛 Solución de Problemas

### "La cámara se siente muy lenta"
→ Aumenta `CAMERA_LERP_SPEED` a `0.10` o `0.12`

### "La cámara se mueve demasiado con el mouse"
→ Reduce `CAMERA_MOUSE_INFLUENCE` a `0.10` o menos
→ Reduce `CAMERA_MOUSE_MAX_OFFSET` a `100`

### "Quiero cámara fija sin retraso"
→ Aumenta `CAMERA_LERP_SPEED` a `1.0` (instantánea)
→ Pon `CAMERA_MOUSE_INFLUENCE` en `0`

### "La cámara no se siente como Battlerite"
→ Usa la configuración "Battlerite Clásico" de arriba
→ Asegúrate de que `CAMERA_LERP_SPEED` sea bajo (0.05-0.08)

## 📝 Notas Técnicas

- La cámara usa **interpolación lineal (lerp)** para suavizar el movimiento
- Se inicializa en la posición del jugador para evitar saltos al inicio
- Compatible con el sistema de espectador (sigue al jugador espectado)
- Los degradados de borde se ajustan dinámicamente sin parpadeos
- Optimizada para 60 FPS sin drops de rendimiento
