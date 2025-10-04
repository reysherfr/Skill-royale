// Configuración global del frontend
// Este archivo debe cargarse PRIMERO antes que otros scripts

// Determinar la URL del servidor basado en el entorno
const SERVER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'http://138.68.250.124:3000';
