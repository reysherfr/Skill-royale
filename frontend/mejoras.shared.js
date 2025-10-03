
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
    const screenX = this.x - offsetX;
    const screenY = this.y - offsetY;

    // Diseños específicos por tipo de proyectil
    switch(this.mejora.id) {
      case 'fuego':
        // Bola de fuego con efecto de llamas
        this.drawFireball(ctx, screenX, screenY);
        break;

      case 'hielo':
        // Estalactitas de hielo puntiagudas
        this.drawIceSpikes(ctx, screenX, screenY);
        break;

      case 'electrico':
        // Rayo/chispa eléctrica
        this.drawLightning(ctx, screenX, screenY);
        break;

      case 'dardo':
        // Dardo pequeño
        this.drawDart(ctx, screenX, screenY);
        break;

      case 'cuchilla_fria_menor':
        // Cuchilla de hielo
        this.drawIceBlade(ctx, screenX, screenY);
        break;

      case 'meteoro':
        // Meteoro ardiente
        this.drawMeteor(ctx, screenX, screenY);
        break;

      case 'cuchilla_fria':
        // Cuchilla fría grande
        this.drawLargeIceBlade(ctx, screenX, screenY);
        break;

      case 'roca_fangosa':
        // Roca fangosa
        this.drawMuddyRock(ctx, screenX, screenY);
        break;

      case 'muro_piedra':
        // Muro de piedra con textura
        this.drawStoneWall(ctx, screenX, screenY);
        break;

      case 'suelo_sagrado':
        // Suelo sagrado curativo
        this.drawHolyGround(ctx, screenX, screenY);
        break;

      case 'gancho':
        // Gancho con cadena
        this.drawHook(ctx, screenX, screenY, offsetX, offsetY);
        break;

      case 'super_meteoro':
        // Super Meteoro gigante
        this.drawSuperMeteor(ctx, screenX, screenY);
        break;

      default:
        // Diseño por defecto (círculo simple)
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.mejora.color;
        ctx.shadowColor = this.mejora.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  // Bola de fuego con núcleo brillante y llamas exteriores
  drawFireball(ctx, x, y) {
    const time = Date.now() * 0.003;
    
    // Llamas exteriores (animadas)
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i / 6) + time;
      const flameSize = this.radius * (0.3 + Math.sin(time * 2 + i) * 0.1);
      const flameX = x + Math.cos(angle) * (this.radius * 0.6);
      const flameY = y + Math.sin(angle) * (this.radius * 0.6);
      
      ctx.beginPath();
      ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
      ctx.fill();
    }
    
    // Núcleo naranja brillante
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.radius);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(0.4, '#ff6600');
    gradient.addColorStop(1, '#ff0000');
    
    ctx.beginPath();
    ctx.arc(x, y, this.radius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 20;
    ctx.fill();
    
    // Borde brillante
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Estalactitas de hielo formando una estrella puntiaguda
  drawIceSpikes(ctx, x, y) {
    const spikes = 6;
    const innerRadius = this.radius * 0.4;
    const outerRadius = this.radius;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (Math.PI * i / spikes) + this.angle;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    
    // Gradiente de hielo
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#87CEEB');
    gradient.addColorStop(1, '#4682B4');
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    // Borde blanco brillante
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Detalles internos (cristales)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < spikes; i++) {
      const angle = (Math.PI * 2 * i / spikes) + this.angle;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * outerRadius, y + Math.sin(angle) * outerRadius);
      ctx.stroke();
    }
  }

  // Rayo eléctrico zigzagueante
  drawLightning(ctx, x, y) {
    const time = Date.now() * 0.01;
    
    // Núcleo eléctrico brillante
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ffff00');
    gradient.addColorStop(0.6, '#c2bf01');
    gradient.addColorStop(1, 'rgba(194, 191, 1, 0.3)');
    
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 25;
    ctx.fill();
    
    // Rayos eléctricos saliendo del núcleo
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i / 8) + time;
      const boltLength = this.radius * (1.2 + Math.sin(time * 3 + i) * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      // Crear zigzag
      const segments = 3;
      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const offsetX = (Math.random() - 0.5) * this.radius * 0.4;
        const offsetY = (Math.random() - 0.5) * this.radius * 0.4;
        const px = x + Math.cos(angle) * boltLength * t + offsetX;
        const py = y + Math.sin(angle) * boltLength * t + offsetY;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    
    // Chispas pequeñas aleatorias
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const sparkAngle = Math.random() * Math.PI * 2;
      const sparkDist = this.radius * (0.8 + Math.random() * 0.5);
      const sparkX = x + Math.cos(sparkAngle) * sparkDist;
      const sparkY = y + Math.sin(sparkAngle) * sparkDist;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dardo pequeño con punta afilada
  drawDart(ctx, x, y) {
    const dartLength = this.radius * 2;
    const dartWidth = this.radius * 0.6;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    
    // Cuerpo del dardo (verde veneno)
    ctx.beginPath();
    ctx.moveTo(dartLength * 0.5, 0);
    ctx.lineTo(-dartLength * 0.3, -dartWidth * 0.4);
    ctx.lineTo(-dartLength * 0.3, dartWidth * 0.4);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(-dartLength * 0.3, 0, dartLength * 0.5, 0);
    gradient.addColorStop(0, '#228B22');
    gradient.addColorStop(0.6, '#32CD32');
    gradient.addColorStop(1, '#00FF00');
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    ctx.fill();
    
    // Borde del dardo
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Punta brillante
    ctx.beginPath();
    ctx.moveTo(dartLength * 0.5, 0);
    ctx.lineTo(dartLength * 0.2, -dartWidth * 0.2);
    ctx.lineTo(dartLength * 0.2, dartWidth * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#ADFF2F';
    ctx.fill();
    
    // Aletas traseras
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.moveTo(-dartLength * 0.3, 0);
    ctx.lineTo(-dartLength * 0.5, -dartWidth * 0.6);
    ctx.lineTo(-dartLength * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(-dartLength * 0.3, 0);
    ctx.lineTo(-dartLength * 0.5, dartWidth * 0.6);
    ctx.lineTo(-dartLength * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  // Cuchilla de hielo pequeña
  drawIceBlade(ctx, x, y) {
    const bladeLength = this.radius * 1.8;
    const bladeWidth = this.radius * 0.5;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    
    // Forma de cuchilla
    ctx.beginPath();
    ctx.moveTo(bladeLength * 0.5, 0);
    ctx.lineTo(-bladeLength * 0.3, -bladeWidth);
    ctx.lineTo(-bladeLength * 0.5, 0);
    ctx.lineTo(-bladeLength * 0.3, bladeWidth);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(-bladeLength * 0.5, 0, bladeLength * 0.5, 0);
    gradient.addColorStop(0, '#4682B4');
    gradient.addColorStop(0.5, '#87CEEB');
    gradient.addColorStop(1, '#E0FFFF');
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 12;
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Línea central brillante
    ctx.beginPath();
    ctx.moveTo(-bladeLength * 0.5, 0);
    ctx.lineTo(bladeLength * 0.5, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }

  // Meteoro ardiente con estela de fuego
  drawMeteor(ctx, x, y) {
    const time = Date.now() * 0.005;
    
    // Estela de fuego detrás
    for (let i = 0; i < 8; i++) {
      const trailOffset = i * 4;
      const trailX = x - Math.cos(this.angle) * trailOffset;
      const trailY = y - Math.sin(this.angle) * trailOffset;
      const trailSize = this.radius * (0.8 - i * 0.08);
      const alpha = 0.6 - i * 0.07;
      
      ctx.beginPath();
      ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${100 - i * 10}, 0, ${alpha})`;
      ctx.fill();
    }
    
    // Roca oscura del meteoro
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2b1a1a';
    ctx.fill();
    
    // Grietas de lava
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 10;
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i / 6) + time;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * this.radius * 0.7,
        Math.sin(angle) * this.radius * 0.7
      );
      ctx.stroke();
    }
    ctx.restore();
    
    // Aura de fuego exterior
    const gradient = ctx.createRadialGradient(x, y, this.radius * 0.8, x, y, this.radius * 1.5);
    gradient.addColorStop(0, 'rgba(255, 100, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
    
    ctx.beginPath();
    ctx.arc(x, y, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Borde brillante
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Cuchilla fría grande con cristales
  drawLargeIceBlade(ctx, x, y) {
    const bladeLength = this.radius * 2.2;
    const bladeWidth = this.radius * 0.7;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    
    // Sombra de hielo
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 20;
    
    // Forma de cuchilla grande
    ctx.beginPath();
    ctx.moveTo(bladeLength * 0.6, 0);
    ctx.lineTo(-bladeLength * 0.3, -bladeWidth);
    ctx.lineTo(-bladeLength * 0.6, -bladeWidth * 0.7);
    ctx.lineTo(-bladeLength * 0.6, bladeWidth * 0.7);
    ctx.lineTo(-bladeLength * 0.3, bladeWidth);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(-bladeLength * 0.6, 0, bladeLength * 0.6, 0);
    gradient.addColorStop(0, '#1E90FF');
    gradient.addColorStop(0.4, '#87CEEB');
    gradient.addColorStop(0.7, '#B0E0E6');
    gradient.addColorStop(1, '#F0FFFF');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Borde brillante
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Cristales de hielo en los bordes
    for (let i = 0; i < 5; i++) {
      const crystalX = -bladeLength * 0.5 + (bladeLength * i / 4);
      const crystalSize = 3 + Math.random() * 2;
      
      // Cristal superior
      ctx.beginPath();
      ctx.moveTo(crystalX, -bladeWidth * 0.85);
      ctx.lineTo(crystalX - crystalSize, -bladeWidth * 0.85 - crystalSize * 1.5);
      ctx.lineTo(crystalX + crystalSize, -bladeWidth * 0.85 - crystalSize * 1.5);
      ctx.closePath();
      ctx.fillStyle = '#E0FFFF';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Cristal inferior
      ctx.beginPath();
      ctx.moveTo(crystalX, bladeWidth * 0.85);
      ctx.lineTo(crystalX - crystalSize, bladeWidth * 0.85 + crystalSize * 1.5);
      ctx.lineTo(crystalX + crystalSize, bladeWidth * 0.85 + crystalSize * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    
    // Líneas de energía congelada
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const lineY = -bladeWidth * 0.5 + (bladeWidth * i / 2);
      ctx.beginPath();
      ctx.moveTo(-bladeLength * 0.6, lineY);
      ctx.lineTo(bladeLength * 0.6, lineY);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Roca fangosa con textura de barro
  drawMuddyRock(ctx, x, y) {
    const time = Date.now() * 0.002;
    
    // Área de lodo alrededor (si está en el suelo)
    if (this.lifetime > 100) {
      const mudRadius = this.radius * 1.3;
      ctx.beginPath();
      ctx.arc(x, y, mudRadius, 0, Math.PI * 2);
      const mudGradient = ctx.createRadialGradient(x, y, 0, x, y, mudRadius);
      mudGradient.addColorStop(0, 'rgba(101, 67, 33, 0.8)');
      mudGradient.addColorStop(0.7, 'rgba(139, 90, 43, 0.5)');
      mudGradient.addColorStop(1, 'rgba(160, 82, 45, 0)');
      ctx.fillStyle = mudGradient;
      ctx.fill();
    }
    
    // Roca principal (forma irregular)
    ctx.save();
    ctx.translate(x, y);
    
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i / points) + time;
      const radiusVar = this.radius * (0.85 + Math.sin(angle * 3) * 0.15);
      const px = Math.cos(angle) * radiusVar;
      const py = Math.sin(angle) * radiusVar;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    
    // Gradiente de roca con barro
    const rockGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    rockGradient.addColorStop(0, '#5D4037');
    rockGradient.addColorStop(0.4, '#6D4C41');
    rockGradient.addColorStop(0.8, '#8B6914');
    rockGradient.addColorStop(1, '#654321');
    
    ctx.fillStyle = rockGradient;
    ctx.shadowColor = 'rgba(101, 67, 33, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    // Manchas de barro
    ctx.shadowBlur = 0;
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * 2 * i / 6;
      const mudX = Math.cos(angle) * this.radius * 0.5;
      const mudY = Math.sin(angle) * this.radius * 0.5;
      const mudSize = 4 + Math.random() * 3;
      
      ctx.beginPath();
      ctx.arc(mudX, mudY, mudSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(101, 67, 33, 0.9)';
      ctx.fill();
    }
    
    // Borde oscuro
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i / points) + time;
      const radiusVar = this.radius * (0.85 + Math.sin(angle * 3) * 0.15);
      const px = Math.cos(angle) * radiusVar;
      const py = Math.sin(angle) * radiusVar;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }

  // Muro de piedra con textura de ladrillos
  drawStoneWall(ctx, x, y) {
    const w = this.mejora.width || this.radius * 3;
    const h = this.mejora.height || this.radius;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Sombra del muro
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    
    // Base del muro
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, 2 * Math.PI);
    const wallGradient = ctx.createLinearGradient(-w, 0, w, 0);
    wallGradient.addColorStop(0, '#696969');
    wallGradient.addColorStop(0.5, '#808080');
    wallGradient.addColorStop(1, '#696969');
    ctx.fillStyle = wallGradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Textura de piedras
    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth = 2;
    
    // Líneas horizontales
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-w, i * h * 0.4);
      ctx.lineTo(w, i * h * 0.4);
      ctx.stroke();
    }
    
    // Líneas verticales (ladrillos)
    const brickCount = 8;
    for (let i = 0; i < brickCount; i++) {
      const brickX = -w + (2 * w * i / brickCount);
      const offset = (i % 2) * (h * 0.4);
      ctx.beginPath();
      ctx.moveTo(brickX, -h + offset);
      ctx.lineTo(brickX, h + offset);
      ctx.stroke();
    }
    
    // Grietas aleatorias
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const crackX = -w * 0.8 + Math.random() * w * 1.6;
      const crackY = -h * 0.5 + Math.random() * h;
      const crackLength = 10 + Math.random() * 15;
      const crackAngle = Math.random() * Math.PI * 2;
      
      ctx.beginPath();
      ctx.moveTo(crackX, crackY);
      ctx.lineTo(
        crackX + Math.cos(crackAngle) * crackLength,
        crackY + Math.sin(crackAngle) * crackLength
      );
      ctx.stroke();
    }
    
    // Borde del muro
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = '#5A5A5A';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Highlights de luz
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.3, w * 0.9, h * 0.3, 0, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
  }

  // Suelo sagrado curativo con símbolos
  drawHolyGround(ctx, x, y) {
    const time = Date.now() * 0.003;
    const pulseSize = Math.sin(time * 2) * 0.1 + 1;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Círculo exterior brillante (pulsante)
    const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * pulseSize);
    outerGradient.addColorStop(0, 'rgba(182, 227, 162, 0.8)');
    outerGradient.addColorStop(0.5, 'rgba(144, 238, 144, 0.5)');
    outerGradient.addColorStop(1, 'rgba(152, 251, 152, 0)');
    
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = outerGradient;
    ctx.fill();
    
    // Círculo interior
    const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.7);
    innerGradient.addColorStop(0, 'rgba(240, 255, 240, 0.9)');
    innerGradient.addColorStop(0.6, 'rgba(182, 227, 162, 0.7)');
    innerGradient.addColorStop(1, 'rgba(144, 238, 144, 0.4)');
    
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.shadowColor = '#90EE90';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Cruz sagrada en el centro
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;
    
    const crossSize = this.radius * 0.4;
    // Vertical
    ctx.beginPath();
    ctx.moveTo(0, -crossSize);
    ctx.lineTo(0, crossSize);
    ctx.stroke();
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(-crossSize, 0);
    ctx.lineTo(crossSize, 0);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Círculos de energía rotantes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 3; i++) {
      const circleRadius = this.radius * (0.3 + i * 0.15);
      const angle = time + (i * Math.PI * 2 / 3);
      
      ctx.save();
      ctx.rotate(angle);
      
      // Arcos decorativos
      for (let j = 0; j < 6; j++) {
        const arcAngle = (Math.PI * 2 * j / 6);
        ctx.beginPath();
        ctx.arc(0, 0, circleRadius, arcAngle, arcAngle + Math.PI / 6);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Partículas curativas ascendentes
    const particleCount = 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i / particleCount) + time;
      const distance = this.radius * (0.4 + (time + i) % 1 * 0.4);
      const px = Math.cos(angle) * distance;
      const py = Math.sin(angle) * distance - ((time * 20 + i * 10) % 40);
      const particleSize = 3 - ((time + i) % 1) * 2;
      
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Borde exterior
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(182, 227, 162, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }

  // Gancho con cadena metálica
  drawHook(ctx, x, y, offsetX, offsetY) {
    const time = Date.now() * 0.005;
    
    ctx.save();
    
    // Dibujar cadena desde el origen (owner) hasta la posición actual del gancho
    if (this.owner) {
      // La cadena se dibuja desde startX, startY hasta la posición actual
      const startScreenX = this.startX - offsetX;
      const startScreenY = this.startY - offsetY;
      
      // Cadena con eslabones
      const chainSegments = 10;
      const dx = x - startScreenX;
      const dy = y - startScreenY;
      
      ctx.strokeStyle = '#4A4A4A';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      
      for (let i = 0; i < chainSegments; i++) {
        const t = i / chainSegments;
        const nextT = (i + 1) / chainSegments;
        
        const x1 = startScreenX + dx * t;
        const y1 = startScreenY + dy * t + Math.sin(time + t * 5) * 2;
        const x2 = startScreenX + dx * nextT;
        const y2 = startScreenY + dy * nextT + Math.sin(time + nextT * 5) * 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    
    ctx.shadowBlur = 0;
    
    // Gancho (punta metálica curvada)
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    
    // Sombra del gancho
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    // Cuerpo del gancho (forma de J)
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.3, -this.radius * 0.5);
    ctx.lineTo(this.radius * 0.8, -this.radius * 0.5);
    ctx.arc(this.radius * 0.8, 0, this.radius * 0.5, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(this.radius * 0.3, this.radius * 0.5);
    
    // Gradiente metálico
    const gradient = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
    gradient.addColorStop(0, '#B0B0B0');
    gradient.addColorStop(0.5, '#696969');
    gradient.addColorStop(1, '#4A4A4A');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Borde del gancho
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Punta afilada del gancho
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.8, this.radius * 0.5);
    ctx.lineTo(this.radius * 1.2, this.radius * 0.3);
    ctx.lineTo(this.radius * 0.9, this.radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#8A8A8A';
    ctx.fill();
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Brillo metálico
    ctx.beginPath();
    ctx.arc(this.radius * 0.4, -this.radius * 0.2, this.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    
    ctx.restore();
  }

  // Super Meteoro - Meteoro gigante apocalíptico
  drawSuperMeteor(ctx, x, y) {
    const time = Date.now() * 0.004;
    const pulseIntensity = Math.sin(time * 3) * 0.15 + 0.85;
    
    // Aura de calor masiva exterior (ondas de choque)
    for (let ring = 0; ring < 4; ring++) {
      const ringRadius = this.radius * (2.5 - ring * 0.4) * pulseIntensity;
      const ringAlpha = (0.3 - ring * 0.06) * pulseIntensity;
      
      const heatGradient = ctx.createRadialGradient(x, y, ringRadius * 0.7, x, y, ringRadius);
      heatGradient.addColorStop(0, `rgba(255, 140, 0, ${ringAlpha * 0.5})`);
      heatGradient.addColorStop(0.5, `rgba(255, 69, 0, ${ringAlpha})`);
      heatGradient.addColorStop(1, `rgba(139, 0, 0, 0)`);
      
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = heatGradient;
      ctx.fill();
    }
    
    // Estela de fuego masiva (más larga y gruesa que el meteoro normal)
    for (let i = 0; i < 15; i++) {
      const trailOffset = i * 8;
      const trailX = x - Math.cos(this.angle || -Math.PI / 2) * trailOffset;
      const trailY = y - Math.sin(this.angle || -Math.PI / 2) * trailOffset;
      const trailSize = this.radius * (1.2 - i * 0.06);
      const alpha = 0.8 - i * 0.05;
      
      // Llamas turbulentas
      const turbulence = Math.sin(time * 2 + i * 0.5) * 6;
      
      ctx.beginPath();
      ctx.arc(trailX + turbulence, trailY, trailSize, 0, Math.PI * 2);
      
      const flameGradient = ctx.createRadialGradient(
        trailX + turbulence, trailY, 0,
        trailX + turbulence, trailY, trailSize
      );
      flameGradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
      flameGradient.addColorStop(0.3, `rgba(255, 150, 0, ${alpha * 0.9})`);
      flameGradient.addColorStop(0.7, `rgba(255, 69, 0, ${alpha * 0.7})`);
      flameGradient.addColorStop(1, `rgba(139, 0, 0, 0)`);
      
      ctx.fillStyle = flameGradient;
      ctx.shadowColor = '#FF4500';
      ctx.shadowBlur = 20;
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    // Partículas de fuego orbitando
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i / 12) + time * 2;
      const orbitRadius = this.radius * (1.3 + Math.sin(time * 3 + i) * 0.2);
      const particleX = x + Math.cos(angle) * orbitRadius;
      const particleY = y + Math.sin(angle) * orbitRadius;
      const particleSize = 8 + Math.sin(time * 4 + i) * 3;
      
      ctx.beginPath();
      ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
      
      const particleGradient = ctx.createRadialGradient(
        particleX, particleY, 0,
        particleX, particleY, particleSize
      );
      particleGradient.addColorStop(0, '#FFFF00');
      particleGradient.addColorStop(0.5, '#FF8C00');
      particleGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
      
      ctx.fillStyle = particleGradient;
      ctx.shadowColor = '#FF6600';
      ctx.shadowBlur = 15;
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    // Núcleo de roca gigante
    ctx.save();
    ctx.translate(x, y);
    
    // Roca oscura agrietada (forma irregular)
    ctx.beginPath();
    const points = 12;
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i / points) + time * 0.5;
      const radiusVar = this.radius * (0.9 + Math.sin(angle * 4 + time) * 0.1);
      const px = Math.cos(angle) * radiusVar;
      const py = Math.sin(angle) * radiusVar;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    
    // Gradiente de roca caliente
    const rockGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    rockGradient.addColorStop(0, '#1a0a0a');
    rockGradient.addColorStop(0.3, '#2b1a1a');
    rockGradient.addColorStop(0.7, '#3d2020');
    rockGradient.addColorStop(1, '#0d0505');
    
    ctx.fillStyle = rockGradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 25;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Grietas de lava masivas y brillantes
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#FF6600';
    ctx.shadowBlur = 20;
    
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i / 10) + time;
      const crackLength = this.radius * (0.8 + Math.sin(time * 2 + i) * 0.1);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * crackLength,
        Math.sin(angle) * crackLength
      );
      ctx.stroke();
      
      // Grietas secundarias
      const subAngle = angle + 0.3;
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(angle) * crackLength * 0.5,
        Math.sin(angle) * crackLength * 0.5
      );
      ctx.lineTo(
        Math.cos(subAngle) * crackLength * 0.7,
        Math.sin(subAngle) * crackLength * 0.7
      );
      ctx.stroke();
    }
    
    // Lava burbujeante en las grietas (círculos brillantes)
    ctx.shadowBlur = 15;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * 2 * i / 8 + time;
      const lavaX = Math.cos(angle) * this.radius * 0.6;
      const lavaY = Math.sin(angle) * this.radius * 0.6;
      const lavaSize = 10 + Math.sin(time * 5 + i) * 4;
      
      ctx.beginPath();
      ctx.arc(lavaX, lavaY, lavaSize, 0, Math.PI * 2);
      
      const lavaGradient = ctx.createRadialGradient(lavaX, lavaY, 0, lavaX, lavaY, lavaSize);
      lavaGradient.addColorStop(0, '#FFFF00');
      lavaGradient.addColorStop(0.4, '#FF6600');
      lavaGradient.addColorStop(1, '#8B0000');
      
      ctx.fillStyle = lavaGradient;
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    // Núcleo incandescente central
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.4);
    coreGradient.addColorStop(0, 'rgba(255, 255, 150, 0.9)');
    coreGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.6)');
    coreGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
    
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 30;
    ctx.fill();
    
    // Borde brillante de roca
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i / points) + time * 0.5;
      const radiusVar = this.radius * (0.9 + Math.sin(angle * 4 + time) * 0.1);
      const px = Math.cos(angle) * radiusVar;
      const py = Math.sin(angle) * radiusVar;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Destellos de energía
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 10;
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i / 6) + time * 3;
      const flashLength = this.radius * (0.3 + Math.sin(time * 8 + i) * 0.15);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * flashLength,
        Math.sin(angle) * flashLength
      );
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Ondas de choque pulsantes (animación de impacto)
    const shockwaveRadius = this.radius * (1.5 + Math.sin(time * 4) * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, shockwaveRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 * pulseIntensity})`;
    ctx.lineWidth = 8;
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = 20;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }
}
// mejoras.shared.js
// Archivo compartido para mejoras entre backend y frontend

const MEJORAS = [
  {
    id: 'potenciador_proyectil',
    nombre: 'Potenciador',
    aumento: true,
    stack: true,
  aplicaA: 'proyectil', // Solo mejoras con proyectil: true
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
    aplicaA: 'proyectil',
      stack: true,
      descripcion: 'Los proyectiles pueden rebotar en muros exteriores y de piedra. Cada stack permite 1 rebote adicional. Al rebotar, el rango máximo se reinicia.'
    },
        // Nuevo aumento: Daño escudo
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
        // Nuevo aumento: Explosion de sabor
        {
          id: 'explosion_sabor',
          nombre: 'Explosión de sabor',
          aumento: true,
          stack: true,
          aplicaA: ['proyectil', 'proyectilQ'],
          descripcion: 'Tus proyectiles al final de su rango o al impactar generan una explosión de daño en área (+40 de radio por stack). Las habilidades con daño en área (ej: Meteoro, Roca fangosa) aumentan su radio de explosión. Reduce el daño de proyectiles y proyectilesQ en un 20%.',
          efecto: {
            explosionRadiusBonus: 40, // radio extra por stack
            damageReduction: 0.2 // reduce daño de proyectiles en 20%
          }
        },
    
  {
    id: 'fuego',
    nombre: 'Bola de Fuego',
    color: 'orange',
    velocidad: 10,
    danio: 20,
    cooldown: 1400, // ms
    effect: { type: 'dot', damage: 2, duration: 3000 },
    maxRange: 820,
    proyectil: true,
    radius: 16,
    activacionRapida: false, // Requiere apuntar
    elemento: 'fuego',
    descripcion: 'Daño: 20, Velocidad: 10, Bola de Fuego (radio 16) Rango: 820. +2 de daño por segundo durante 2 segundos.'
  },
  {
    id: 'hielo',
    nombre: 'Bola de Hielo',
    color: 'deepskyblue',
    velocidad: 9.5,
    danio: 15,
    cooldown: 1250, // ms
    effect: { type: 'slow', amount: 0.2, duration: 1000 },
    maxRange: 865,
    proyectil: true,
    radius: 14,
    activacionRapida: false, // Requiere apuntar
    elemento: 'hielo',
    descripcion: 'Daño: 15, Velocidad: 9.5, (radio 14) Rango: 865. Proyectil que relentiza al enemigo un 20% por 1 segundo al impactar.'
  },
  {
    id: 'electrico',
    nombre: 'Disparo Eléctrico',
    color: '#c2bf01ff', // verde claro
    velocidad: 14.5,
    danio: 9,
    cooldown: 1100, // ms
    effect: null,
    maxRange: 1000,
    proyectil: true,
    radius: 9,
    activacionRapida: false, // Requiere apuntar
    elemento: 'electrico',
    descripcion: 'Daño inicial: 9, Velocidad: 14.5, (radio 9) Rango: 1000. Pasiva: cada vez que aciertas a un enemigo, el daño aumenta en 2. Al ganar o perder la ronda, el daño vuelve a 9.',
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
  cooldown: 7000, // 6 segundos
  effect: { type: 'slow', amount: 0.25, duration: 1500 },
  proyectilQ: true,
  radius: 17,
  aimRange: 320, // Rango máximo de skill shot
  maxRange: 320, // Limite real de distancia
  activacionRapida: false, // Requiere apuntar
  elemento: 'hielo',
  descripcion: 'Daño: 32, Velocidad: 15, Radio: 17, CD: 7 segundos, Rango: 350. al impactar o llegar al final, genera 3 Cuchillas frías menores que se dispersan. Relentiza un 25% por 1.5 segundos.'
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
  cooldown: 6000, // 6 segundos
  proyectilQ: true,
  radius: 105,
  aimRange: 680,
  maxRange: 680,
  skyfall: true,
  castTime: 700, // 0.7 segundos
  activacionRapida: false, // Requiere apuntar
  elemento: 'roca',
  descripcion: 'Daño: 65, CD: 6s, Radio: 105, Rango: 680, castTime: 0.7s. roca que cae del cielo tras 0.7s en el área objetivo, generando un área de lodo que ralentiza a los enemigos un 40% durante 3s.',
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
  cooldown: 8000, // 8 segundos
  proyectilE: true,
  radius: 35, // radio base (no usado para óvalo)
  width: 105, // largo del muro (horizontal)
  height: 28, // alto del muro (ovalado)
  aimRange: 350,
  maxRange: 350,
  duracion: 3500, // 3.5 segundos
  castTime: 200, // 0.2 segundos
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
// Nueva habilidad: Gancho
MEJORAS.push({
  id: 'gancho',
  nombre: 'Gancho',
  color: '#696969', // gris metálico
  velocidad: 30, // velocidad del gancho
  danio: 20, // daño al impactar
  cooldown: 10000, // 10 segundos
  proyectilE: true,
  aimRange: 700,
  maxRange: 700,
  radius: 12,
  activacionRapida: false, // Requiere apuntar
  elemento: 'gancho',
  effect: {
    pullSpeed: 25, // velocidad de jalado
    slowAmount: 0.25, // 25% de slow
    slowDuration: 1500, // 1.5 segundos
    cdReduction: 0.5 // 50% de reducción de CD al impactar
  },
  descripcion: 'Lanza un gancho. Si impacta un muro, jala al usuario hacia él. Si impacta un enemigo, lo jala y lo ralentiza 25% por 1.5s. Reduce CD en 50% al impactar. Daño: 20, CD: 10s, Rango: 700.'
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

// Nueva habilidad: Salto Sombrío
MEJORAS.push({
  id: 'salto_sombrio',
  nombre: 'Salto Sombrio',
  color: '#4B0082', // índigo oscuro para sombra
  velocidad: 25, // velocidad de dash rápido para huir
  danio: 0, // SIN daño - solo para huir
  cooldown: 8000, // 8 segundos
  proyectilEspacio: true,
  aimRange: 450,
  maxRange: 450,
  activacionRapida: false,
  elemento: 'sombra',
  effect: { 
    type: 'invisibility', 
    duration: 1500 // 1.5 segundos de invisibilidad
  },
  descripcion: 'Dash invisible para huir. Te vuelves transparente por 1.5s sin hacer daño. La invisibilidad termina al disparar. CD: 8s, Rango: 450.'
});

// Nueva habilidad: Tornado
MEJORAS.push({
  id: 'tornado',
  nombre: 'Tornado',
  color: '#87CEEB', // azul cielo para tornado
  velocidad: 0, // No se mueve como proyectil normal
  danio: 15, // 15 daño por segundo
  cooldown: 15000, // 15 segundos
  proyectilQ: true,
  aimRange: 650,
  maxRange: 650,
  activacionRapida: false,
  elemento: 'viento',
  effect: {
    type: 'tornado',
    duration: 5000, // 5 segundos
    radius: 100, // Radio de succión
    damagePerTick: 15, // Daño por tick (cada segundo)
    tickRate: 1000, // Cada 1 segundo
    pullForce: 3, // Fuerza de atracción
    slowAmount: 0.3 // 30% de reducción de velocidad
  },
  descripcion: 'Lanza un tornado que gira y atrae enemigos hacia su centro. 15 daño/s, reduce velocidad 30%, dura 5s. CD: 15s, Rango: 650.'
});

// Nueva habilidad: Golpe (ataque melee con combo)
MEJORAS.push({
  id: 'golpe',
  nombre: 'Golpe',
  color: '#FF6347', // rojo tomate
  velocidad: 0, // No se mueve, es melee instantáneo
  danio: 14, // Daño base
  cooldown: 700, // 0.7 segundos
  proyectil: true,
  maxRange: 100, // Rango melee
  radius: 40, // Radio del golpe visual
  activacionRapida: true, // Disparo instantáneo
  elemento: 'fisico',
  effect: {
    type: 'melee_combo',
    comboMultiplier: 2.5, // 250% de daño en el tercer golpe (14 * 2.5 = 35)
    comboHits: 3 // Cada 3 golpes
  },
  descripcion: 'Golpe cuerpo a cuerpo. Cada tercer golpe inflinge 250% de daño (35 dmg). CD: 0.7s, Rango: 80.'
});

// Nueva habilidad: Laser (Proyectil F)
MEJORAS.push({
  id: 'laser',
  nombre: 'Laser',
  color: '#FF00FF', // magenta/púrpura para láser
  velocidad: 0, // No se mueve, es un rayo fijo
  danio: 20, // 20 de daño por segundo
  cooldown: 35000, // 35 segundos
  proyectilF: true,
  maxRange: 800, // Alcance del láser
  radius: 40, // Grosor del láser
  activacionRapida: false,
  elemento: 'laser',
  laserContinuo: true,
  duracion: 5000, // 5 segundos de duración
  damageInterval: 1000, // Daño cada segundo
  healPerSecond: 5, // Cura 5 de vida por segundo si impacta
  wallDamageReduction: 0.5, // 50% de reducción de daño al atravesar muros
  canPenetrateWalls: true, // Puede atravesar muros
  description: 'Dispara un rayo láser que sigue tu puntero. Atraviesa muros (-50% daño). 20 daño/s, cura 5 vida/s al impactar. Dura 5s. CD: 35s, Rango: 800.'
});

// Nueva habilidad: Super Meteoro (Proyectil F)
MEJORAS.push({
  id: 'super_meteoro',
  nombre: 'Super Meteoro',
  color: '#8B0000', // rojo oscuro
  velocidad: 15, // Velocidad de caída del meteoro
  danio: 100, // Daño directo en el área de impacto
  cooldown: 40000, // 40 segundos
  proyectilF: true,
  maxRange: 1200, // Rango de lanzamiento
  radius: 250, // Radio del área de impacto directo
  explosionRadius: 320, // Radio de la onda expansiva
  explosionDamage: 45, // Daño de la onda expansiva
  aimRange: 1200,
  activacionRapida: false, // Requiere apuntar
  elemento: 'fuego',
  skyfall: true,
  castTime: 1000, // 1 segundo de carga antes de que caiga
  effect: {
    type: 'dot',
    damage: 10, // 10 de daño por segundo
    duration: 4000 // 4 segundos de quemadura
  },
  descripcion: 'Invoca un super meteoro que cae del cielo tras 1s. Daño directo: 100 (radio 250), onda expansiva: 45 (radio 320). Quema a todos los impactados: 10 daño/s por 4s. CD: 40s, Rango: 1200.'
});

// Nueva habilidad: Ventisca (Proyectil F)
MEJORAS.push({
  id: 'ventisca',
  nombre: 'Ventisca',
  color: '#87CEEB', // Azul cielo
  velocidad: 0, // No se mueve, es un área estática
  danio: 20, // Daño por tick (cada 0.5s)
  cooldown: 42000, // 42 segundos
  proyectilF: true,
  sonido: 'bolahielo.wav',
  maxRange: 650, // Rango máximo de colocación
  width: 400, // Ancho del área rectangular
  height: 300, // Alto del área rectangular
  aimRange: 650,
  activacionRapida: false, // Requiere apuntar
  elemento: 'hielo',
  areaEffect: true, // Es un efecto de área
  castTime: 700, // 0.7 segundos de cast
  duration: 2500, // 2.5 segundos de duración
  damageInterval: 500, // Daño cada 0.5 segundos
  effect: {
    slowAmount: 0.4, // 40% de slow
    slowDuration: 1500, // 1.5 segundos de slow
    hitsToFreeze: 4, // 4 impactos para congelar
    freezeDuration: 1000 // 1 segundo congelado
  },
  descripcion: 'Invoca una ventisca helada en un área rectangular . Inflige 20 daño cada 0.5s durante 2.5s. Ralentiza 40% por 1.5s. 4 impactos congelan al enemigo por 1s. CD: 42s, Rango: 650.'
});

export { MEJORAS, Proyectil };
