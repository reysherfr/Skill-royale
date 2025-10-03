// ============================================
// SOUND MANAGER - Sistema de Audio Sintético
// ============================================

class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.3;
    this.audioContext = null;
    this.loadedSounds = {}; // Para almacenar sonidos cargados desde archivos
  }

  // Inicializar AudioContext (se hace al primer click del usuario)
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Cargar un sonido desde un archivo de audio
  loadSound(id, url) {
    const audio = new Audio(url);
    audio.volume = this.volume;
    audio.preload = 'auto';
    this.loadedSounds[id] = audio;
  }

  // Reproducir un sonido cargado desde archivo
  playSoundFile(id, volumeOverride = null) {
    if (!this.enabled || !this.loadedSounds[id]) return;
    
    try {
      // Clonar el audio para poder reproducir múltiples veces simultáneamente
      const sound = this.loadedSounds[id].cloneNode();
      sound.volume = volumeOverride !== null ? volumeOverride : this.volume;
      sound.play().catch(err => console.log('Error reproduciendo sonido:', err));
    } catch (err) {
      console.log('Error al reproducir sonido:', err);
    }
  }

  // Sonido de CLICK en botones
  playClick() {
    if (!this.enabled) return;
    
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    
    gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  // Sonido de HOVER suave
  playHover() {
    if (!this.enabled) return;
    
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 600;
    
    gainNode.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  // Sonido de ÉXITO (para registro exitoso, etc.)
  playSuccess() {
    if (!this.enabled) return;
    
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    
    // Secuencia de notas ascendentes
    oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  // Sonido de ERROR (para errores, validaciones fallidas, etc.)
  playError() {
    if (!this.enabled) return;
    
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 200;
    
    gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  // Sonido de NOTIFICACIÓN (para mensajes importantes)
  playNotification() {
    if (!this.enabled) return;
    
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'triangle';
    
    // Dos tonos rápidos
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1046, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(this.volume * 0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  // Método genérico para crear sonidos personalizados
  playCustom(frequency, duration = 0.1, type = 'sine', volume = null) {
    if (!this.enabled) return;
    
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.value = frequency;
    
    const vol = volume !== null ? volume : this.volume;
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  // Ajustar volumen global (0.0 a 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    // Actualizar volumen de sonidos cargados
    Object.values(this.loadedSounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }

  // Activar/desactivar sonidos
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Activar sonidos
  enable() {
    this.enabled = true;
  }

  // Desactivar sonidos
  disable() {
    this.enabled = false;
  }
}

// Crear instancia global
const soundManager = new SoundManager();

// ============================================
// CARGAR SONIDOS DE HABILIDADES
// ============================================
// Mapeo de IDs de habilidades a archivos de sonido
const ABILITY_SOUNDS = {
  'fuego': 'sonidos/bolafuego.wav',
  'hielo': 'sonidos/bolahielo.wav',
  'electrico': 'sonidos/disparoelectrico.mp3',
  'meteoro': 'sonidos/meteoro.mp3',
  'cuchilla_fria': 'sonidos/cuchillafria.mp3',
  'cuchilla_fria_menor': 'sonidos/cuchillafria.mp3',
  'dardo': 'sonidos/dardo.mp3',
  'roca_fangosa': 'sonidos/rocafangosa.mp3',
  'muro_piedra': 'sonidos/muroroca.mp3',
  'suelo_sagrado': 'sonidos/suelosagrado.mp3',
  'escudo_magico': 'sonidos/escudo.mp3',
  'gancho': 'sonidos/gancho.mp3',
  'teleport': 'sonidos/teleport.mp3',
  'impulso_electrico': 'sonidos/impulsoelectrico.mp3',
  'embestida': 'sonidos/embestida.mp3',
  'salto_sombrio': 'sonidos/saltosombrio.mp3',
  'tornado': 'sonidos/tornado.mp3'
};

// Cargar todos los sonidos de habilidades al iniciar
function loadAbilitySounds() {
  Object.entries(ABILITY_SOUNDS).forEach(([id, url]) => {
    soundManager.loadSound(id, url);
  });
  console.log('✅ Sonidos de habilidades cargados:', Object.keys(ABILITY_SOUNDS).length);
}

// Función para reproducir sonido de habilidad
function playAbilitySound(abilityId, volume = 0.5) {
  if (ABILITY_SOUNDS[abilityId]) {
    soundManager.playSoundFile(abilityId, volume);
  }
}

// Función para reproducir sonido de habilidad con proximidad 3D
// distance: distancia entre el jugador local y la fuente del sonido
// maxDistance: distancia máxima a la que se puede escuchar (default: 800)
function playAbilitySoundWithProximity(abilityId, distance, maxDistance = 800, baseVolume = 0.5) {
  if (!ABILITY_SOUNDS[abilityId]) return;
  
  // Calcular volumen basado en distancia
  // Si está muy cerca (< 100), volumen máximo
  // Si está en maxDistance o más lejos, volumen 0
  let volumeMultiplier;
  
  if (distance < 100) {
    volumeMultiplier = 1.0; // Volumen completo si está muy cerca
  } else if (distance >= maxDistance) {
    return; // No reproducir si está muy lejos
  } else {
    // Interpolación logarítmica para sonido más natural
    // Fórmula: 1 - (distance - 100) / (maxDistance - 100)
    volumeMultiplier = 1 - ((distance - 100) / (maxDistance - 100));
    // Aplicar curva cuadrática inversa para hacer que el sonido se atenúe más naturalmente
    volumeMultiplier = Math.pow(volumeMultiplier, 0.5);
  }
  
  const finalVolume = baseVolume * volumeMultiplier;
  
  // Solo reproducir si el volumen final es audible
  if (finalVolume > 0.05) {
    soundManager.playSoundFile(abilityId, finalVolume);
  }
}

// Calcular distancia entre dos puntos
function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Cargar sonidos cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadAbilitySounds();
  });
} else {
  loadAbilitySounds();
}

// ============================================
// AUTO-APLICAR SONIDOS A TODOS LOS BOTONES Y ELEMENTOS INTERACTIVOS
// ============================================

// Aplicar sonidos cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSounds);
} else {
  initializeSounds();
}

function initializeSounds() {
  // Agregar sonido de click a TODOS los botones
  document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      soundManager.playClick();
    });
  });

  // Agregar sonido de hover a botones y enlaces
  const interactiveElements = document.querySelectorAll('button, a, .auth-tab, .input-group input');
  interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      soundManager.playHover();
    });
  });
}

// Exportar para usar en otros archivos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = soundManager;
}

// Exportar funciones globales para usar desde otros archivos
window.playAbilitySound = playAbilitySound;
window.playAbilitySoundWithProximity = playAbilitySoundWithProximity;
window.calculateDistance = calculateDistance;
window.soundManager = soundManager;
