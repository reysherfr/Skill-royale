# 🎧 Sistema de Sonido 3D con Proximidad

## 🌟 Características Implementadas

Se ha implementado un sistema de **sonido espacial 3D** que permite escuchar las habilidades de los jugadores enemigos según su distancia.

---

## 📐 Cómo Funciona

### Rangos de Distancia:

| Distancia | Volumen | Descripción |
|-----------|---------|-------------|
| **0 - 100 unidades** | 100% | Muy cerca - volumen completo |
| **100 - 800 unidades** | 100% → 5% | Media distancia - degradación gradual |
| **> 800 unidades** | 0% (sin sonido) | Muy lejos - no se escucha |

### Fórmula de Atenuación:

```javascript
// Distancia en rango medio (100-800)
volumeMultiplier = 1 - ((distance - 100) / (maxDistance - 100))
volumeMultiplier = Math.pow(volumeMultiplier, 0.5) // Curva cuadrática inversa

finalVolume = baseVolume * volumeMultiplier
```

La curva cuadrática inversa (`pow(x, 0.5)`) hace que el sonido se atenúe de forma más **natural y realista**, similar a como funciona en la vida real.

---

## 🎮 Ejemplos en el Juego

### Situación 1: Enemigo Muy Cerca
```
Tu posición: (500, 500)
Enemigo lanza meteoro en: (550, 550)
Distancia: ~70 unidades

Resultado: 🔊 Volumen COMPLETO (100%)
```

### Situación 2: Enemigo a Media Distancia
```
Tu posición: (500, 500)
Enemigo lanza bola de fuego en: (800, 500)
Distancia: 300 unidades

Cálculo:
- volumeMultiplier = 1 - ((300 - 100) / (800 - 100))
- volumeMultiplier = 1 - (200 / 700) = 0.714
- volumeMultiplier = sqrt(0.714) = 0.845
- finalVolume = 0.5 * 0.845 = 0.42

Resultado: 🔉 Volumen medio (~42%)
```

### Situación 3: Enemigo Lejano
```
Tu posición: (500, 500)
Enemigo lanza tornado en: (1500, 500)
Distancia: 1000 unidades

Resultado: 🔇 SIN SONIDO (demasiado lejos)
```

---

## 🎯 Habilidades Afectadas

### Todas las habilidades enemigas usan proximidad:

#### Proyectiles (Click Izquierdo, Q, E):
- ✅ Bola de fuego
- ✅ Bola de hielo
- ✅ Disparo eléctrico
- ✅ Dardo
- ✅ Meteoro
- ✅ Cuchilla fría
- ✅ Tornado
- ✅ Gancho
- ✅ Suelo sagrado
- ✅ Escudo mágico

#### Cast/Impacto:
- ✅ Muro de piedra (al colocar)
- ✅ Roca fangosa (al impactar)

#### Movilidad (Espacio):
- ✅ Teleport
- ✅ Impulso eléctrico
- ✅ Embestida
- ✅ Salto sombrío

---

## 💻 Implementación Técnica

### Función Principal:

```javascript
playAbilitySoundWithProximity(abilityId, distance, maxDistance, baseVolume)
```

**Parámetros:**
- `abilityId`: ID de la habilidad (ej: 'meteoro', 'bola_fuego')
- `distance`: Distancia entre jugador local y la fuente del sonido
- `maxDistance`: Distancia máxima audible (default: 800)
- `baseVolume`: Volumen base de la habilidad (0.0 - 1.0)

### Ejemplo de Uso:

```javascript
// Calcular distancia
const distance = calculateDistance(
  localPlayer.x, 
  localPlayer.y, 
  enemyProjectile.x, 
  enemyProjectile.y
);

// Reproducir con proximidad
playAbilitySoundWithProximity('meteoro', distance, 800, 0.5);
```

---

## 🔍 Dónde se Aplica

### 1. Nuevos Proyectiles (`proyectilesUpdate`)
Cuando un enemigo dispara un proyectil:
```javascript
socket.on('proyectilesUpdate', (proys) => {
  // ... crear proyectil ...
  
  if (pData.owner !== user.nick) {
    const distance = calculateDistance(
      localPlayer.x, 
      localPlayer.y, 
      pData.x, 
      pData.y
    );
    playAbilitySoundWithProximity(pData.mejoraId, distance, 800, 0.5);
  }
});
```

### 2. Cast Iniciado (`castStarted`)
Cuando un enemigo comienza a castear:
```javascript
socket.on('castStarted', (data) => {
  if (data.player !== user.nick && data.mejora.id === 'muro_piedra') {
    const distance = calculateDistance(
      localPlayer.x, 
      localPlayer.y, 
      data.position.x, 
      data.position.y
    );
    playAbilitySoundWithProximity('muro_piedra', distance, 800, 0.5);
  }
});
```

### 3. Impacto de Roca Fangosa
Cuando la roca fangosa impacta:
```javascript
if (cast.player !== user.nick) {
  const distance = calculateDistance(
    localPlayer.x, 
    localPlayer.y, 
    cast.position.x, 
    cast.position.y
  );
  playAbilitySoundWithProximity('roca_fangosa', distance, 800, 0.6);
}
```

---

## ⚙️ Configuración Personalizada

### Cambiar Distancia Máxima:

```javascript
// Más alcance (escuchar más lejos)
playAbilitySoundWithProximity('meteoro', distance, 1200, 0.5);

// Menos alcance (solo muy cerca)
playAbilitySoundWithProximity('dardo', distance, 400, 0.5);
```

### Ajustar Volumen Base:

```javascript
// Habilidades más silenciosas
playAbilitySoundWithProximity('dardo', distance, 800, 0.3);

// Habilidades más ruidosas
playAbilitySoundWithProximity('meteoro', distance, 800, 0.7);
```

---

## 🎨 Mejoras Futuras (Opcional)

### Posibles Ampliaciones:

1. **Audio Estéreo (izquierda/derecha)**
   - Sonido viene del lado correcto según posición del enemigo
   
2. **Reverberación según entorno**
   - Eco en zonas cerradas
   - Sonido más seco en espacios abiertos

3. **Oclusión**
   - Sonido amortiguado si hay muros entre jugadores

4. **Priorización**
   - Limitar número de sonidos simultáneos
   - Dar prioridad a sonidos más cercanos

---

## 📊 Ventajas del Sistema

✅ **Inmersión**: El jugador puede detectar enemigos cercanos por el sonido  
✅ **Conciencia espacial**: Saber aproximadamente dónde están los enemigos  
✅ **Realismo**: Comportamiento natural del sonido en el espacio  
✅ **Rendimiento**: No reproduce sonidos innecesarios de enemigos lejanos  
✅ **Experiencia táctica**: Usar el audio como información estratégica  

---

## 🐛 Solución de Problemas

### No escucho a los enemigos cercanos
- Verifica que `soundManager.enabled === true`
- Comprueba el volumen global: `soundManager.volume`
- Asegúrate de que la distancia sea < 800 unidades

### Todos los sonidos están muy bajos
```javascript
// Aumentar volumen global
soundManager.setVolume(0.5); // 50%
```

### Quiero escuchar enemigos más lejanos
Modifica en `room.js` el parámetro `maxDistance`:
```javascript
playAbilitySoundWithProximity(abilityId, distance, 1200, 0.5); // 800 → 1200
```

---

¡Disfruta del sistema de sonido espacial! 🎧🎮
