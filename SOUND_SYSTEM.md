# 🔊 Sistema de Sonidos - Skill Royale

## ✅ Ya Implementado Automáticamente

El sistema de sonidos ya está funcionando en tu aplicación con los siguientes efectos:

### Sonidos Automáticos (sin código adicional):
- **Click en botones** → Todos los botones hacen "beep" al clickearlos
- **Hover en elementos** → Sonido suave al pasar el mouse sobre botones, enlaces e inputs
- **Registro exitoso** → Sonido de éxito (notas ascendentes)
- **Login exitoso** → Sonido de éxito
- **Errores** → Sonido de error (tono bajo)

### Sonidos en la Tienda/Mejoras:
- **Hover en items** → Sonido suave al pasar sobre los items
- **Hover en tabs** → Sonido al pasar sobre las categorías
- **Click en tabs** → Beep al cambiar de categoría
- **Comprar item** → Sonido de éxito si la compra es exitosa
- **Compra fallida** → Sonido de error si no tienes oro suficiente
- **Equipar item** → Sonido agradable tipo "ding" (880 Hz)
- **Desequipar item** → Sonido más suave (440 Hz)
- **Click en botones de item** → Beep al hacer click en Comprar/Equipar/Desequipar

### Sonidos de Habilidades en Batalla (archivos de audio):
- **Bola de fuego** (Click Izquierdo) → `bolafuego.wav`
- **Bola de hielo** (Click Izquierdo) → `bolahielo.wav`
- **Disparo eléctrico** (Click Izquierdo) → `disparoelectrico.mp3`
- **Dardo** (Click Izquierdo) → `dardo.mp3`
- **Meteoro** (Q) → `meteoro.mp3`
- **Cuchilla fría** (Q/Click) → `cuchillafria.mp3`
- **Roca fangosa** (Q) → `rocafangosa.mp3`
- **Tornado** (Q) → `tornado.mp3`
- **Muro de piedra** (E) → `muroroca.mp3`
- **Suelo sagrado** (E) → `suelosagrado.mp3`
- **Escudo mágico** (E) → `escudo.mp3`
- **Gancho** (E) → `gancho.mp3`
- **Teleport** (Espacio) → `teleport.mp3`
- **Impulso eléctrico** (Espacio) → `impulsoelectrico.mp3`
- **Embestida** (Espacio) → `embestida.mp3`
- **Salto sombrío** (Espacio) → `saltosombrio.mp3`

### 🎧 Sistema de Sonido 3D con Proximidad:
- **Tus habilidades** → Volumen normal (0.4-0.6)
- **Habilidades de enemigos cercanos (< 100 unidades)** → Volumen completo
- **Habilidades de enemigos a media distancia (100-800)** → Volumen degradado según distancia
- **Habilidades de enemigos lejanos (> 800)** → No se escuchan
- **Fórmula de atenuación** → Curva cuadrática inversa para sonido natural

---

## 🎮 Cómo Agregar Sonidos a Nuevas Habilidades

### Paso 1: Agregar el archivo de audio
1. Coloca el archivo de sonido (.mp3, .wav, .ogg) en la carpeta `frontend/sonidos/`
2. Usa un nombre descriptivo (ejemplo: `nuevahabilidad.mp3`)

### Paso 2: Registrar el sonido en soundManager.js
Abre `frontend/soundManager.js` y agrega tu habilidad al objeto `ABILITY_SOUNDS`:

```javascript
const ABILITY_SOUNDS = {
  'fuego': 'sonidos/bolafuego.wav',
  'hielo': 'sonidos/bolahielo.wav',
  // ... otros sonidos ...
  'nueva_habilidad': 'sonidos/nuevahabilidad.mp3', // ← Agregar aquí
};
```

### Paso 3: Reproducir el sonido cuando se use la habilidad
En `frontend/room.js`, busca donde se dispara tu habilidad y agrega:

```javascript
// 🔊 Reproducir sonido de habilidad
if (typeof playAbilitySound === 'function') {
  playAbilitySound('nueva_habilidad', 0.5); // 0.5 = volumen (0.0 a 1.0)
}
```

### Ejemplo Completo:
```javascript
// En room.js, cuando se dispara la habilidad:
socket.emit('shootProjectile', {
  roomId,
  x: localPlayer.x,
  y: localPlayer.y,
  angle: angle,
  mejoraId: 'nueva_habilidad',
  // ... otros parámetros
});

// Agregar ANTES del emit:
if (typeof playAbilitySound === 'function') {
  playAbilitySound('nueva_habilidad', 0.5);
}
```

---

## 📚 Cómo Agregar Más Sonidos

### Métodos Disponibles:

```javascript
// 1. Click/Beep simple
soundManager.playClick();

// 2. Hover suave
soundManager.playHover();

// 3. Éxito (registro, login, etc.)
soundManager.playSuccess();

// 4. Error (validaciones, errores)
soundManager.playError();

// 5. Notificación (mensajes importantes)
soundManager.playNotification();

// 6. Sonido personalizado
soundManager.playCustom(frequency, duration, type, volume);
// Ejemplo: soundManager.playCustom(440, 0.2, 'sine', 0.5);

// 7. Sonido de habilidad (volumen normal)
playAbilitySound('meteoro', 0.5);

// 8. Sonido de habilidad con proximidad 3D
playAbilitySoundWithProximity('meteoro', distance, maxDistance, baseVolume);
// Ejemplo: playAbilitySoundWithProximity('meteoro', 350, 800, 0.5);
```

---

## 🎯 Ejemplos de Uso

### Ejemplo 1: Sonido al matar un enemigo
```javascript
// En room.js o donde manejes las muertes
socket.on('playerKilled', (data) => {
  if (data.killer === myPlayerId) {
    soundManager.playSuccess(); // Sonido de éxito al matar
  }
});
```

### Ejemplo 2: Sonido al recibir daño
```javascript
// En room.js cuando te golpean
socket.on('playerHit', (data) => {
  if (data.playerId === myPlayerId) {
    soundManager.playCustom(200, 0.1, 'sawtooth', 0.4); // Sonido de golpe
  }
});
```

### Ejemplo 3: Sonido al recoger oro
```javascript
// Cuando recoges oro
function pickupGold(amount) {
  soundManager.playCustom(880, 0.15, 'triangle', 0.3); // "Ding" agudo
  gold += amount;
}
```

### Ejemplo 4: Sonido al comprar mejora
```javascript
// En tienda.js
document.getElementById('upgradeHealth').addEventListener('click', () => {
  if (playerGold >= 50) {
    soundManager.playSuccess(); // Compra exitosa
    // ... resto del código
  } else {
    soundManager.playError(); // No hay suficiente oro
  }
});
```

### Ejemplo 5: Sonido de disparo
```javascript
// Al disparar
function shoot() {
  soundManager.playCustom(150, 0.05, 'square', 0.2); // "Pew" corto
  // ... código del disparo
}
```

### Ejemplo 6: Countdown/Timer
```javascript
// Cuenta regresiva antes de empezar
let countdown = 3;
const interval = setInterval(() => {
  soundManager.playCustom(600, 0.1, 'sine', 0.5);
  countdown--;
  if (countdown === 0) {
    clearInterval(interval);
    soundManager.playSuccess(); // ¡Empieza el juego!
  }
}, 1000);
```

---

## ⚙️ Configuración

### Ajustar Volumen Global
```javascript
soundManager.setVolume(0.5); // De 0.0 a 1.0 (50%)
soundManager.setVolume(0.2); // Más bajo (20%)
soundManager.setVolume(1.0); // Máximo (100%)
```

### Activar/Desactivar Sonidos
```javascript
soundManager.disable(); // Desactivar todos los sonidos
soundManager.enable();  // Activar todos los sonidos
soundManager.toggle();  // Alternar on/off
```

### Crear un Botón de Mute
```javascript
// HTML
<button id="soundToggle">🔊 Sonido</button>

// JavaScript
document.getElementById('soundToggle').addEventListener('click', (e) => {
  const enabled = soundManager.toggle();
  e.target.textContent = enabled ? '🔊 Sonido' : '🔇 Mute';
});
```

---

## 🎵 Guía de Frecuencias (Hz)

Para crear sonidos personalizados con `playCustom()`:

| Tipo de Sonido | Frecuencia (Hz) | Duración (s) | Tipo |
|----------------|-----------------|--------------|------|
| Click suave | 600-800 | 0.05-0.1 | sine |
| Notificación | 880-1046 | 0.15-0.2 | triangle |
| Error | 150-250 | 0.2-0.3 | sawtooth |
| Éxito | 523-784 | 0.3-0.5 | sine |
| Explosión | 80-150 | 0.3-0.5 | sawtooth |
| Recoger item | 1200-1500 | 0.1 | triangle |
| Disparo | 100-200 | 0.05-0.1 | square |
| Salto | 300-500 | 0.1 | sine |

### Tipos de Onda:
- `'sine'` → Suave, puro (ideal para melodías)
- `'square'` → Retro, 8-bit (ideal para efectos)
- `'sawtooth'` → Áspero (ideal para explosiones/errores)
- `'triangle'` → Suave pero con carácter (ideal para notificaciones)

---

## 🎮 Ejemplos Completos para el Juego

### Sistema de Feedback Completo
```javascript
// Al entrar a una sala
soundManager.playSuccess();

// Al morir
soundManager.playCustom(100, 0.5, 'sawtooth', 0.4);

// Al ganar
soundManager.playCustom(523, 0.2, 'sine', 0.5); // C
setTimeout(() => soundManager.playCustom(659, 0.2, 'sine', 0.5), 200); // E
setTimeout(() => soundManager.playCustom(784, 0.2, 'sine', 0.5), 400); // G
setTimeout(() => soundManager.playCustom(1046, 0.3, 'sine', 0.5), 600); // C

// Al rankear
soundManager.playNotification();
```

---

## 🔧 Solución de Problemas

### Los sonidos no se reproducen
- **Causa**: Los navegadores bloquean audio hasta que el usuario interactúe
- **Solución**: El sistema se inicializa automáticamente al primer click

### Los sonidos son muy fuertes/bajos
```javascript
soundManager.setVolume(0.3); // Ajusta el volumen
```

### Quiero desactivar el hover en algunos elementos
```javascript
// Agregar clase 'no-sound-hover' al elemento
element.classList.add('no-sound-hover');

// Modificar soundManager.js línea 111:
const interactiveElements = document.querySelectorAll('button:not(.no-sound-hover), a:not(.no-sound-hover)');
```

---

## 📁 Archivos Modificados

- ✅ `frontend/soundManager.js` → Sistema completo de sonidos + carga de archivos de audio + sistema 3D
- ✅ `frontend/index.html` → Integrado soundManager
- ✅ `frontend/menu.html` → Integrado soundManager
- ✅ `frontend/room.html` → Integrado soundManager
- ✅ `frontend/join.html` → Integrado soundManager
- ✅ `frontend/script.js` → Sonidos en login/registro
- ✅ `frontend/tienda.js` → Sonidos en tienda (comprar, equipar, hover, tabs)
- ✅ `frontend/room.js` → Sonidos de habilidades en batalla (17 habilidades) + sonido 3D con proximidad
- ✅ `frontend/sonidos/` → Carpeta con 16 archivos de audio (.wav, .mp3)

---

## 🚀 Próximos Pasos (Opcional)

Si más adelante quieres usar archivos de audio reales (.mp3, .wav):

1. Crea carpeta `frontend/sounds/`
2. Descarga sonidos de [Freesound.org](https://freesound.org/)
3. Agrega este código:

```javascript
// Cargar archivo de audio
const explosionSound = new Audio('sounds/explosion.mp3');
explosionSound.volume = 0.5;

// Reproducir
explosionSound.play();
```

---

¡Disfruta de tu juego con efectos de sonido! 🎮🔊
