// Devuelve el radio final de una mejora considerando aumentos 'agrandar'
function getMejoraRadius(mejora, jugador) {
  const baseRadius = mejora.radius || 20;
  const agrandadores = jugador.mejoras ? jugador.mejoras.filter(m => m.id === 'agrandar') : [];
  return baseRadius + (agrandadores.length * 10);
}
// HUD de aumentos para ronda 2
function mostrarHUDAumentosRonda2() {
  // Oculta el HUD antiguo si existe
  const hudAntiguo = document.getElementById('hudAumentosRonda2');
  if (hudAntiguo) hudAntiguo.remove();
  hudVisible = true;

  // Overlay oscuro de fondo
  const overlay = document.createElement('div');
  overlay.id = 'aumentosOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(46, 125, 50, 0.15) 0%, rgba(0,0,0,0.85) 100%)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.4s ease-out';
  overlay.style.backdropFilter = 'blur(8px)';
  document.body.appendChild(overlay);

  const hud = document.createElement('div');
  hud.id = 'hudAumentosRonda2';
  hud.style.position = 'fixed';
  hud.style.top = '50%';
  hud.style.left = '50%';
  hud.style.transform = 'translate(-50%, -50%) scale(0.9)';
  hud.style.background = 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)';
  hud.style.padding = '40px 48px';
  hud.style.borderRadius = '28px';
  hud.style.boxShadow = '0 25px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.15), inset 0 2px 0 rgba(255,255,255,0.15)';
  hud.style.zIndex = '1000';
  hud.style.textAlign = 'center';
  hud.style.width = 'auto';
  hud.style.maxWidth = '90vw';
  hud.style.maxHeight = '90vh';
  hud.style.animation = 'slideInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  hud.style.backdropFilter = 'blur(10px)';
  hud.style.border = '2px solid rgba(139, 195, 74, 0.4)';

  // Asegurar que las animaciones existen
  if (!document.getElementById('skillSelectorAnimations')) {
    const style = document.createElement('style');
    style.id = 'skillSelectorAnimations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 25px rgba(139, 195, 74, 0.5);
        }
        50% {
          box-shadow: 0 0 45px rgba(139, 195, 74, 0.8);
        }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
    `;
    document.head.appendChild(style);
  }

  // Contenedor del título con icono
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '36px';
  titleContainer.style.position = 'relative';

  // Icono decorativo
  const icon = document.createElement('div');
  icon.textContent = '⚡';
  icon.style.fontSize = '3.5rem';
  icon.style.marginBottom = '8px';
  icon.style.filter = 'drop-shadow(0 0 20px rgba(255, 235, 59, 0.8))';
  icon.style.animation = 'bounce 2s ease-in-out infinite';
  titleContainer.appendChild(icon);

  // Título principal
  const title = document.createElement('h2');
  title.textContent = '💪 Potencia tus Habilidades 💪';
  title.style.fontSize = '2.5rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #fff176, #ffeb3b, #fdd835, #ffeb3b, #fff176)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0 0 8px 0';
  title.style.textShadow = '0 0 40px rgba(255, 235, 59, 0.6)';
  titleContainer.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Elige un aumento para dominar el campo de batalla';
  subtitle.style.fontSize = '1.1rem';
  subtitle.style.color = 'rgba(255,255,255,0.9)';
  subtitle.style.fontWeight = '600';
  subtitle.style.letterSpacing = '0.5px';
  subtitle.style.margin = '0';
  titleContainer.appendChild(subtitle);

  hud.appendChild(titleContainer);

  // 🆕 SIEMPRE filtrar aumentos localmente (no usar availableUpgrades aquí)
  // availableUpgrades solo se usa para ronda 1 (clicks) y ronda 4 (habilidades F)
  const aumentos = MEJORAS.filter(m => {
    if (m.aumento && m.stack === false) {
      return !mejorasJugador.some(a => a.id === m.id);
    }
    return m.aumento;
  });

  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.justifyContent = 'center';
  grid.style.gap = '20px';
  grid.style.flexWrap = 'wrap';
  grid.style.maxWidth = '800px';
  grid.style.margin = '0 auto';

  let aumentoSeleccionado = null;
  aumentos.forEach((aum, idx) => {
    const btnWrapper = document.createElement('div');
    btnWrapper.style.position = 'relative';
    btnWrapper.style.animation = `slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.1}s backwards`;

    const btn = document.createElement('button');
    btn.textContent = aum.nombre;
    btn.style.padding = '18px 36px';
    btn.style.borderRadius = '18px';
    btn.style.border = '3px solid #8bc34a';
    btn.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = '800';
    btn.style.fontSize = '1.2rem';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 6px 25px rgba(139, 195, 74, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
    btn.style.pointerEvents = 'auto';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    btn.style.minWidth = '200px';
    btn.style.textShadow = '0 2px 10px rgba(0,0,0,0.3)';

    // Efecto de brillo
    const shine = document.createElement('span');
    shine.style.position = 'absolute';
    shine.style.top = '0';
    shine.style.left = '-100%';
    shine.style.width = '100%';
    shine.style.height = '100%';
    shine.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)';
    shine.style.transition = 'left 0.6s';
    shine.style.pointerEvents = 'none';
    btn.appendChild(shine);

    // Badge de "NUEVO" o "STACK" si aplica
    if (aum.stack !== false) {
      const badge = document.createElement('span');
      badge.textContent = '∞';
      badge.style.position = 'absolute';
      badge.style.top = '-8px';
      badge.style.right = '-8px';
      badge.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
      badge.style.color = '#fff';
      badge.style.fontSize = '0.85rem';
      badge.style.fontWeight = '900';
      badge.style.padding = '4px 8px';
      badge.style.borderRadius = '50%';
      badge.style.boxShadow = '0 3px 12px rgba(255, 152, 0, 0.6)';
      badge.style.border = '2px solid rgba(255,255,255,0.3)';
      btnWrapper.appendChild(badge);
    }

    btn.onmouseenter = (e) => {
      btn.style.background = 'linear-gradient(135deg, #8bc34a 0%, #689f38 100%)';
      btn.style.transform = 'translateY(-5px) scale(1.08)';
      btn.style.boxShadow = '0 12px 40px rgba(139, 195, 74, 0.6), inset 0 2px 0 rgba(255,255,255,0.3)';
      shine.style.left = '100%';

      // Tooltip mejorado
      let tooltip = document.createElement('div');
      tooltip.className = 'aumento-tooltip';
      tooltip.textContent = aum.descripcion || '';
      tooltip.style.position = 'fixed';
      tooltip.style.left = (e.clientX + 20) + 'px';
      tooltip.style.top = (e.clientY - 15) + 'px';
      tooltip.style.background = 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '16px 22px';
      tooltip.style.borderRadius = '14px';
      tooltip.style.fontSize = '1rem';
      tooltip.style.zIndex = '2000';
      tooltip.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
      tooltip.style.maxWidth = '350px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.border = '2px solid #8bc34a';
      tooltip.style.animation = 'fadeIn 0.2s ease-out';
      tooltip.style.fontWeight = '500';
      tooltip.style.lineHeight = '1.4';
      document.body.appendChild(tooltip);
      btn._tooltip = tooltip;
    };

    btn.onmouseleave = () => {
      btn.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = '0 6px 25px rgba(139, 195, 74, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
      shine.style.left = '-100%';
      if (btn._tooltip) {
        btn._tooltip.remove();
        btn._tooltip = null;
      }
    };

    btn.onclick = () => {
      Array.from(grid.children).forEach(child => {
        const childBtn = child.querySelector('button');
        if (childBtn !== btn) {
          child.style.opacity = '0.35';
          child.style.transform = 'scale(0.92)';
          childBtn.style.pointerEvents = 'none';
        } else {
          childBtn.style.background = 'linear-gradient(135deg, #ffeb3b 0%, #fdd835 100%)';
          childBtn.style.color = '#1b5e20';
          childBtn.style.transform = 'translateY(-5px) scale(1.12)';
          childBtn.style.boxShadow = '0 15px 50px rgba(255, 235, 59, 0.7), inset 0 3px 6px rgba(255,255,255,0.4)';
          childBtn.style.animation = 'pulseGlow 1.5s infinite';
          childBtn.style.fontWeight = '900';

          // Efecto de partículas al seleccionar
          for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.background = ['#8bc34a', '#ffeb3b', '#4caf50'][Math.floor(Math.random() * 3)];
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1001';
            particle.style.boxShadow = '0 0 8px currentColor';
            const rect = btn.getBoundingClientRect();
            particle.style.left = (rect.left + rect.width / 2) + 'px';
            particle.style.top = (rect.top + rect.height / 2) + 'px';
            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 25;
            const velocity = 3 + Math.random() * 4;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            let posX = 0, posY = 0;
            let opacity = 1;
            const animate = () => {
              posX += vx;
              posY += vy;
              opacity -= 0.015;
              particle.style.transform = `translate(${posX}px, ${posY}px)`;
              particle.style.opacity = opacity;
              if (opacity > 0) {
                requestAnimationFrame(animate);
              } else {
                particle.remove();
              }
            };
            requestAnimationFrame(animate);
          }
        }
      });
      aumentoSeleccionado = aum;
    };

    btnWrapper.appendChild(btn);
    grid.appendChild(btnWrapper);
  });
  hud.appendChild(grid);

  // Temporizador mejorado
  const timerContainer = document.createElement('div');
  timerContainer.style.marginTop = '40px';
  timerContainer.style.padding = '16px 32px';
  timerContainer.style.background = 'linear-gradient(135deg, rgba(139, 195, 74, 0.25), rgba(104, 159, 56, 0.25))';
  timerContainer.style.borderRadius = '16px';
  timerContainer.style.border = '2px solid rgba(139, 195, 74, 0.6)';
  timerContainer.style.display = 'inline-block';

  const timerDiv = document.createElement('div');
  timerDiv.style.fontSize = '1.7rem';
  timerDiv.style.fontWeight = '900';
  timerDiv.style.background = 'linear-gradient(135deg, #8bc34a, #aed581)';
  timerDiv.style.WebkitBackgroundClip = 'text';
  timerDiv.style.WebkitTextFillColor = 'transparent';
  timerDiv.style.backgroundClip = 'text';
  timerDiv.textContent = '⏱️ Tiempo restante: 15s';
  timerContainer.appendChild(timerDiv);
  hud.appendChild(timerContainer);

  let timeLeft = 15;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `⏱️ Tiempo restante: ${timeLeft}s`;

    // Cambiar a rojo cuando queda poco tiempo
    if (timeLeft <= 5) {
      timerDiv.style.background = 'linear-gradient(135deg, #ff5252, #ff1744)';
      timerDiv.style.WebkitBackgroundClip = 'text';
      timerDiv.style.backgroundClip = 'text';
      timerContainer.style.background = 'linear-gradient(135deg, rgba(255, 82, 82, 0.25), rgba(255, 23, 68, 0.25))';
      timerContainer.style.border = '2px solid rgba(255, 82, 82, 0.8)';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      // Si el usuario seleccionó un aumento, usar ese. Si no, elegir uno aleatorio.
      let aumentoFinal = aumentoSeleccionado;
      if (!aumentoFinal && aumentos.length > 0) {
        aumentoFinal = aumentos[Math.floor(Math.random() * aumentos.length)];
      }
      if (aumentoFinal) {
        socket.emit('selectUpgrade', { roomId, mejoraId: aumentoFinal.id });
      }
      ocultarHUDAumentosRonda2();
    }
  }, 1000);

  document.body.appendChild(hud);
}

function ocultarHUDAumentosRonda2() {
  hudVisible = false;
  
  // Eliminar todos los tooltips inmediatamente
  document.querySelectorAll('.aumento-tooltip').forEach(t => t.remove());

  const hud = document.getElementById('hudAumentosRonda2');
  const overlay = document.getElementById('aumentosOverlay');

  if (hud) {
    hud.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => hud.remove(), 300);
  }

  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => overlay.remove(), 300);
  }
  
  // 🆕 Resetear availableUpgrades después de cerrar el HUD
  availableUpgrades = null;
}

// 🆕 HUD especial para habilidades F (Ronda 4)
function mostrarHUDHabilidadesF() {
  // Oculta el HUD antiguo si existe
  const hudAntiguo = document.getElementById('hudHabilidadesF');
  if (hudAntiguo) hudAntiguo.remove();
  hudVisible = true;

  // Overlay oscuro de fondo
  const overlay = document.createElement('div');
  overlay.id = 'habilidadesFOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(138, 43, 226, 0.2) 0%, rgba(0,0,0,0.9) 100%)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.4s ease-out';
  overlay.style.backdropFilter = 'blur(10px)';
  document.body.appendChild(overlay);

  const hud = document.createElement('div');
  hud.id = 'hudHabilidadesF';
  hud.style.position = 'fixed';
  hud.style.top = '50%';
  hud.style.left = '50%';
  hud.style.transform = 'translate(-50%, -50%) scale(0.9)';
  hud.style.background = 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 50%, #7b1fa2 100%)';
  hud.style.padding = '50px 60px';
  hud.style.borderRadius = '32px';
  hud.style.boxShadow = '0 30px 100px rgba(138, 43, 226, 0.8), 0 0 0 2px rgba(255,255,255,0.2), inset 0 3px 0 rgba(255,255,255,0.2)';
  hud.style.zIndex = '1000';
  hud.style.textAlign = 'center';
  hud.style.width = 'auto';
  hud.style.maxWidth = '95vw';
  hud.style.maxHeight = '95vh';
  hud.style.animation = 'slideInScale 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  hud.style.backdropFilter = 'blur(12px)';
  hud.style.border = '3px solid rgba(186, 104, 200, 0.6)';

  // Título con efecto especial
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '45px';
  titleContainer.style.position = 'relative';

  // Icono decorativo F
  const icon = document.createElement('div');
  icon.textContent = '⚡';
  icon.style.fontSize = '4.5rem';
  icon.style.marginBottom = '12px';
  icon.style.filter = 'drop-shadow(0 0 30px rgba(255, 0, 255, 1))';
  icon.style.animation = 'bounce 2s ease-in-out infinite';
  titleContainer.appendChild(icon);

  // Título principal
  const title = document.createElement('h2');
  title.textContent = '✨ HABILIDAD ESPECIAL - TECLA F ✨';
  title.style.fontSize = '3rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #ff00ff, #ba68c8, #e1bee7, #ba68c8, #ff00ff)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0 0 12px 0';
  title.style.textShadow = '0 0 50px rgba(255, 0, 255, 0.8)';
  titleContainer.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = '¡Desbloquea un poder devastador para cambiar el rumbo de la batalla!';
  subtitle.style.fontSize = '1.3rem';
  subtitle.style.color = 'rgba(255,255,255,0.95)';
  subtitle.style.fontWeight = '700';
  subtitle.style.letterSpacing = '1px';
  subtitle.style.margin = '0';
  subtitle.style.textShadow = '0 2px 8px rgba(0,0,0,0.5)';
  titleContainer.appendChild(subtitle);

  hud.appendChild(titleContainer);

  // 🆕 Temporizador ultra visible (AHORA ARRIBA)
  const timerContainer = document.createElement('div');
  timerContainer.style.marginTop = '25px';
  timerContainer.style.marginBottom = '35px';
  timerContainer.style.padding = '25px 50px';
  timerContainer.style.background = 'linear-gradient(135deg, rgba(255, 0, 255, 0.4), rgba(186, 104, 200, 0.4))';
  timerContainer.style.borderRadius = '25px';
  timerContainer.style.border = '4px solid #ff00ff';
  timerContainer.style.display = 'inline-block';
  timerContainer.style.boxShadow = '0 0 40px rgba(255, 0, 255, 0.8), inset 0 2px 10px rgba(255,255,255,0.3)';

  const timerDiv = document.createElement('div');
  timerDiv.style.fontSize = '2.8rem';
  timerDiv.style.fontWeight = '900';
  timerDiv.style.color = '#fff';
  timerDiv.style.textShadow = '0 0 20px rgba(255, 0, 255, 1), 0 0 40px rgba(255, 0, 255, 0.8)';
  timerDiv.style.letterSpacing = '2px';
  timerDiv.textContent = '⏱️ Tiempo restante: 10s';
  timerContainer.appendChild(timerDiv);
  hud.appendChild(timerContainer);

  // Usar availableUpgrades del servidor (habilidades F)
  const habilidadesF = availableUpgrades || [];

  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.justifyContent = 'center';
  grid.style.gap = '30px';
  grid.style.flexWrap = 'wrap';
  grid.style.maxWidth = '1100px';
  grid.style.margin = '0 auto';

  let habilidadSeleccionada = null;
  
  habilidadesF.forEach((hab, idx) => {
    const cardWrapper = document.createElement('div');
    cardWrapper.style.position = 'relative';
    cardWrapper.style.animation = `slideInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s backwards`;

    const card = document.createElement('div');
    card.style.width = '220px';
    card.style.padding = '35px 20px';
    card.style.borderRadius = '24px';
    card.style.border = '4px solid #ba68c8';
    card.style.background = 'linear-gradient(135deg, rgba(106, 27, 154, 0.4) 0%, rgba(74, 20, 140, 0.6) 100%)';
    card.style.cursor = 'pointer';
    card.style.boxShadow = '0 10px 40px rgba(186, 104, 200, 0.5), inset 0 2px 0 rgba(255,255,255,0.2)';
    card.style.position = 'relative';
    card.style.overflow = 'visible';
    card.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    card.style.backdropFilter = 'blur(8px)';

    // Icono de la tecla F
    const keyIcon = document.createElement('div');
    keyIcon.textContent = 'F';
    keyIcon.style.position = 'absolute';
    keyIcon.style.top = '12px';
    keyIcon.style.right = '12px';
    keyIcon.style.width = '45px';
    keyIcon.style.height = '45px';
    keyIcon.style.background = 'linear-gradient(135deg, #ff00ff, #ba68c8)';
    keyIcon.style.borderRadius = '10px';
    keyIcon.style.display = 'flex';
    keyIcon.style.alignItems = 'center';
    keyIcon.style.justifyContent = 'center';
    keyIcon.style.fontSize = '1.5rem';
    keyIcon.style.fontWeight = '900';
    keyIcon.style.color = '#fff';
    keyIcon.style.boxShadow = '0 4px 15px rgba(255, 0, 255, 0.6)';
    keyIcon.style.border = '2px solid rgba(255,255,255,0.3)';
    card.appendChild(keyIcon);

    // Nombre de la habilidad (más grande y centrado)
    const nombre = document.createElement('h3');
    nombre.textContent = hab.nombre;
    nombre.style.fontSize = '2.2rem';
    nombre.style.fontWeight = '900';
    nombre.style.color = '#fff';
    nombre.style.margin = '0';
    nombre.style.textAlign = 'center';
    nombre.style.textShadow = '0 2px 10px rgba(0,0,0,0.5)';
    card.appendChild(nombre);

    // 🆕 Crear tooltip que aparece al hacer hover
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.bottom = '100%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%) translateY(-10px)';
    tooltip.style.marginBottom = '10px';
    tooltip.style.padding = '20px';
    tooltip.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
    tooltip.style.borderRadius = '16px';
    tooltip.style.border = '3px solid #ff00ff';
    tooltip.style.boxShadow = '0 10px 40px rgba(255, 0, 255, 0.8)';
    tooltip.style.width = '320px';
    tooltip.style.zIndex = '10000';
    tooltip.style.opacity = '0';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transition = 'opacity 0.3s, transform 0.3s';

    // Descripción en tooltip
    const tooltipDesc = document.createElement('p');
    tooltipDesc.textContent = hab.descripcion || hab.description || 'Habilidad especial';
    tooltipDesc.style.fontSize = '0.95rem';
    tooltipDesc.style.color = 'rgba(255,255,255,0.9)';
    tooltipDesc.style.lineHeight = '1.5';
    tooltipDesc.style.marginBottom = '15px';
    tooltipDesc.style.margin = '0 0 15px 0';
    tooltip.appendChild(tooltipDesc);

    // Estadísticas en tooltip
    const tooltipStats = document.createElement('div');
    tooltipStats.style.display = 'grid';
    tooltipStats.style.gridTemplateColumns = '1fr 1fr';
    tooltipStats.style.gap = '10px';

    const createTooltipStat = (label, value) => {
      const statDiv = document.createElement('div');
      statDiv.style.background = 'rgba(0,0,0,0.4)';
      statDiv.style.padding = '8px';
      statDiv.style.borderRadius = '8px';
      statDiv.style.border = '1px solid rgba(186, 104, 200, 0.5)';
      
      const statLabel = document.createElement('div');
      statLabel.textContent = label;
      statLabel.style.fontSize = '0.7rem';
      statLabel.style.color = 'rgba(255,255,255,0.6)';
      statLabel.style.marginBottom = '3px';
      statLabel.style.textTransform = 'uppercase';
      statLabel.style.fontWeight = '600';
      
      const statValue = document.createElement('div');
      statValue.textContent = value;
      statValue.style.fontSize = '1rem';
      statValue.style.color = '#ff00ff';
      statValue.style.fontWeight = '900';
      
      statDiv.appendChild(statLabel);
      statDiv.appendChild(statValue);
      return statDiv;
    };

    if (hab.danio) tooltipStats.appendChild(createTooltipStat('Daño', hab.danio));
    if (hab.cooldown) tooltipStats.appendChild(createTooltipStat('Cooldown', `${hab.cooldown / 1000}s`));
    if (hab.maxRange) tooltipStats.appendChild(createTooltipStat('Rango', hab.maxRange));
    if (hab.duracion) tooltipStats.appendChild(createTooltipStat('Duración', `${hab.duracion / 1000}s`));

    tooltip.appendChild(tooltipStats);
    cardWrapper.appendChild(tooltip);

    // Efectos hover
    card.onmouseenter = () => {
      card.style.transform = 'translateY(-12px) scale(1.05)';
      card.style.boxShadow = '0 20px 60px rgba(186, 104, 200, 0.8), inset 0 3px 0 rgba(255,255,255,0.3)';
      card.style.border = '4px solid #ff00ff';
      // Mostrar tooltip
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateX(-50%) translateY(0)';
    };

    card.onmouseleave = () => {
      if (habilidadSeleccionada !== hab) {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '0 10px 40px rgba(186, 104, 200, 0.5), inset 0 2px 0 rgba(255,255,255,0.2)';
        card.style.border = '4px solid #ba68c8';
      }
      // Ocultar tooltip
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateX(-50%) translateY(-10px)';
    };

    card.onclick = () => {
      // Deseleccionar otras tarjetas
      Array.from(grid.children).forEach(child => {
        const childCard = child.querySelector('div');
        if (childCard !== card) {
          child.style.opacity = '0.4';
          child.style.transform = 'scale(0.9)';
          childCard.style.pointerEvents = 'none';
        } else {
          childCard.style.background = 'linear-gradient(135deg, #ff00ff 0%, #ba68c8 100%)';
          childCard.style.transform = 'translateY(-12px) scale(1.1)';
          childCard.style.boxShadow = '0 25px 80px rgba(255, 0, 255, 1), inset 0 4px 8px rgba(255,255,255,0.4)';
          childCard.style.animation = 'pulseGlow 1.5s infinite';
          childCard.style.border = '4px solid #fff';
        }
      });
      habilidadSeleccionada = hab;
    };

    cardWrapper.appendChild(card);
    grid.appendChild(cardWrapper);
  });

  hud.appendChild(grid);

  let timeLeft = 10;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `⏱️ Tiempo restante: ${timeLeft}s`;

    if (timeLeft <= 5) {
      timerDiv.style.color = '#ff1744';
      timerDiv.style.textShadow = '0 0 30px rgba(255, 23, 68, 1), 0 0 60px rgba(255, 23, 68, 0.8)';
      timerContainer.style.background = 'linear-gradient(135deg, rgba(255, 82, 82, 0.5), rgba(255, 23, 68, 0.5))';
      timerContainer.style.border = '4px solid #ff1744';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      let habilidadFinal = habilidadSeleccionada;
      if (!habilidadFinal && habilidadesF.length > 0) {
        habilidadFinal = habilidadesF[Math.floor(Math.random() * habilidadesF.length)];
      }
      if (habilidadFinal) {
        socket.emit('selectUpgrade', { roomId, mejoraId: habilidadFinal.id });
      }
      ocultarHUDHabilidadesF();
    }
  }, 1000);

  document.body.appendChild(hud);
}

function ocultarHUDHabilidadesF() {
  hudVisible = false;

  const hud = document.getElementById('hudHabilidadesF');
  const overlay = document.getElementById('habilidadesFOverlay');

  if (hud) {
    hud.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => hud.remove(), 300);
  }

  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => overlay.remove(), 300);
  }
  
  // Resetear availableUpgrades
  availableUpgrades = null;
}

// Determine server URL based on environment
// Usar IP pública del servidor en producción
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'http://138.68.250.124:3000';

const socket = io(SERVER_URL);

// 🎵 Continuar música de fondo del menú (se detendrá al iniciar batalla)
const menuMusic = document.getElementById('menuMusic');
const battleMusic = document.getElementById('battleMusic');

if (menuMusic) {
  menuMusic.volume = 0.3;
  const musicState = localStorage.getItem('menuMusicPlaying');
  if (musicState === null || musicState === 'true') {
    menuMusic.play().catch(err => console.log('Autoplay bloqueado'));
  }
}

// Configurar música de batalla
if (battleMusic) {
  battleMusic.volume = 0.4; // Un poco más alta que la del menú para más intensidad
}

const user = JSON.parse(localStorage.getItem('batlesd_user'));
const roomId = localStorage.getItem('batlesd_room_id');
if (!user || !roomId) {
  window.location.href = 'menu.html';
}

// Variable para prevenir renderizados múltiples simultáneos
let renderTimeout = null;
let isRendering = false;

// Limpiar listeners previos para evitar duplicados (en caso de recarga de página)
socket.removeAllListeners('playerJoined');
socket.removeAllListeners('playerLeft');
socket.removeAllListeners('playerKicked');
socket.removeAllListeners('playersUpdate');
socket.removeAllListeners('gameStarted');

// Enviar el nick al backend para identificar el socket (después de inicializar user)
if (user && user.nick) {
  socket.emit('setNick', user.nick);
}

// Función wrapper para renderizar con debounce
function scheduleRender(updatedSala) {
  // Cancelar cualquier renderizado pendiente
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }
  
  // Actualizar la variable sala inmediatamente
  sala = updatedSala;
  
  // Si ya está renderizando, esperar
  if (isRendering) {
    renderTimeout = setTimeout(() => scheduleRender(updatedSala), 50);
    return;
  }
  
  // Renderizar después de un pequeño delay para evitar múltiples renders
  renderTimeout = setTimeout(() => {
    renderSala(updatedSala);
  }, 100);
}

socket.on('playerLeft', (updatedSala) => {
  scheduleRender(updatedSala);
  // Eliminar de players[] si ya no está
  if (updatedSala && updatedSala.players) {
    for (let i = players.length - 1; i >= 0; i--) {
      if (!updatedSala.players.find(p => p.nick === players[i].nick)) {
        players.splice(i, 1);
      }
    }
    drawPlayers();
  }
});

// Escuchar cuando un jugador se une a la sala y actualizar la lista en tiempo real
socket.on('playerJoined', (updatedSala) => {
  scheduleRender(updatedSala);
});

// Escuchar cuando un jugador es expulsado
socket.on('playerKicked', (data) => {
  const { kickedNick, sala } = data;
  
  // Si el jugador expulsado eres tú, redirigir al menú
  if (user.nick === kickedNick) {
    alert('Has sido expulsado de la sala por el host.');
    window.location.href = 'menu.html';
    return;
  }
  
  // Si no eres el expulsado, actualizar la sala
  scheduleRender(sala);
  
  // Mostrar notificación
  console.log(`${kickedNick} ha sido expulsado de la sala`);
});

socket.on('playersUpdate', (serverPlayers) => {
  // IMPORTANTE: Solo procesar playersUpdate si el juego ha iniciado
  // Durante la fase de lobby, usar playerJoined/playerLeft en su lugar
  const gameCanvas = document.getElementById('gameCanvas');
  if (!gameCanvas || gameCanvas.style.display === 'none') {
    // Estamos en el lobby, ignorar playersUpdate para evitar duplicados
    return;
  }
  
  // Si la cantidad de jugadores cambió, actualizar lista y renderizar
  let changed = false;
  if (serverPlayers.length !== players.length) changed = true;
  // Sincronizar vida y posición de cada jugador
  for (const sp of serverPlayers) {
    let local = players.find(p => p.nick === sp.nick);
    if (!local) {
      // Nuevo jugador, agregarlo
      local = new Player({
        ...sp,
        // Usar el color del servidor o el color por defecto
        color: sp.color || '#f4c2a0',
        isLocal: sp.nick === user.nick
      });
      players.push(local);
      changed = true;
      
      // Debug: verificar maxHealth al crear jugador
      console.log(`🆕 Nuevo jugador: ${sp.nick} | Health: ${sp.health}/${sp.maxHealth || 200}`);
    }
    // Actualizar color del servidor si cambió
    if (sp.color && local.color !== sp.color) {
      local.color = sp.color;
    }
    local.health = sp.health;
    local.maxHealth = sp.maxHealth || 200; // Actualizar maxHealth desde el servidor
    
    // SIEMPRE actualizar targetX/targetY desde el servidor para TODOS los jugadores
    // El servidor es autoritativo, incluso para el jugador local
    local.targetX = sp.x;
    local.targetY = sp.y;
    // Si es la primera vez, posicionar directamente
    if (local.x === undefined || local.y === undefined) {
      local.x = sp.x;
      local.y = sp.y;
    }
    
    local.speed = sp.speed;
    local.speedBoostUntil = sp.speedBoostUntil || 0;
    local.defeated = sp.defeated;
    local.mejoras = sp.mejoras || [];
    local.shieldAmount = sp.shieldAmount || 0;
    local.beingPulled = sp.beingPulled || false; // Sincronizar estado de pull del gancho
    if (sp.nick === user.nick) {
      mejorasJugador = sp.mejoras || [];
      // Separar mejoras normales de mejoras Q, F
      const mejorasNormales = mejorasJugador.filter(m => !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio && !m.proyectilF && !m.aumento);
      const mejorasQ = mejorasJugador.filter(m => m.proyectilQ);
      const mejorasF = mejorasJugador.filter(m => m.proyectilF);

      // Actualizar mejoraSeleccionada a la última mejora normal
      if (mejorasNormales.length > 0) {
        mejoraSeleccionada = mejorasNormales[mejorasNormales.length - 1];
      }

      // Actualizar mejoraQSeleccionada a la última mejora Q
      if (mejorasQ.length > 0) {
        mejoraQSeleccionada = mejorasQ[mejorasQ.length - 1];
      }

      // Actualizar mejoraFSeleccionada a la última mejora F
      if (mejorasF.length > 0) {
        mejoraFSeleccionada = mejorasF[mejorasF.length - 1];
      }
    }
  }
  // Eliminar jugadores que ya no están
  for (let i = players.length - 1; i >= 0; i--) {
    if (!serverPlayers.find(sp => sp.nick === players[i].nick)) {
      players.splice(i, 1);
      changed = true;
    }
  }
  if (changed) {
    drawPlayers();
  }
});

socket.on('gameStarted', (updatedSala) => {
  sala = updatedSala;
  
  // 🎵 Cambiar de música del menú a música de batalla
  if (menuMusic) {
    menuMusic.pause();
    menuMusic.currentTime = 0;
  }
  
  // 🎵 Iniciar música de batalla (solo si no está ya reproduciéndose)
  if (battleMusic && battleMusic.paused) {
    battleMusic.play().catch(err => console.log('Error al reproducir música de batalla:', err));
  }
  
  // Centrar a los jugadores en el mapa (servidor ya lo hace, pero aseguramos aquí)
  if (sala.players.length >= 2) {
    const centerY = MAP_HEIGHT / 2;
    const centerX = MAP_WIDTH / 2;
    sala.players[0].x = centerX - 150;
    sala.players[0].y = centerY;
    sala.players[1].x = centerX + 150;
    sala.players[1].y = centerY;
  }
  // Ocultar completamente la sala
  document.querySelector('.room-container').style.display = 'none';
  // Mostrar canvas
  const canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  // Inicializar juego
  initGame();
  // Mostrar HUD de selección de mejoras en ronda 1
  if (sala.round === 1) {
    mostrarHUDSeleccionHabilidades();
  }
});
let proyectiles = new Map();
let mejoraSeleccionada = null;
let mejorasJugador = []; // Array de mejoras que tiene el jugador
let mejoraQSeleccionada = null; // Mejora especial para la tecla Q
let mejoraFSeleccionada = null; // Mejora especial para la tecla F
let meteoroAiming = false; // Si está apuntando meteoro
let meteoroAimingAngle = 0;
let cuchillaAiming = false; // Si está apuntando Cuchilla fria
let cuchillaAimingAngle = 0;
let rocaFangosaAiming = false; // Si está apuntando Roca fangosa
let muroPiedraAiming = false; // Si está en modo preview de muro de piedra
let ganchoAiming = false; // Si está en modo preview de gancho
let spaceAiming = false; // Si está en modo preview de habilidad espacio
let tumbas = []; // Array de tumbas { nick, x, y }
let tumbaImage = null; // Imagen de la tumba
let spectatorTarget = null; // Jugador al que estamos siguiendo en modo espectador
let activeCasts = []; // Array de casts activos: [{ position: {x, y}, startTime, player, mejora }]
let activeMuddyGrounds = []; // Array de suelos fangosos: [{ x, y, radius, duration, createdAt }]
let activeSacredGrounds = []; // Array de suelos sagrados: [{ x, y, radius, duration, createdAt, owner }]
let activeLasers = []; // Array de láseres continuos activos
let mostrarSoloProyectilQ = false;
let hudTimer = 15;
let hudInterval = null;
let hudVisible = false;
let hud = null;
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

// 🎮 NUEVO SISTEMA DE MOVIMIENTO ESTILO BATTLERITE
let keys = { w: false, a: false, s: false, d: false };
let mouseX = 0, mouseY = 0;

// Client-side prediction para el jugador local
let localPlayerVelocity = { x: 0, y: 0 };

// Interpolación suave para otros jugadores (no locales)
const INTERPOLATION_SPEED = 0.35; // Factor de suavizado optimizado

let lastQFireTime = 0;
let lastFFireTime = 0; // Cooldown para la tecla F
let currentRound = 1; // Contador de rondas
let roundHUD = null; // HUD del contador de rondas
let abilityHUD = null; // HUD de habilidades abajo
// Verifica si el jugador puede moverse a la posición (x, y) sin colisionar con muros
function puedeMoverJugador(x, y) {
  if (!window.murosDePiedra) {
    if (!puedeMoverJugador.warned) {
      console.warn('⚠️ window.murosDePiedra no existe');
      puedeMoverJugador.warned = true;
    }
    return true;
  }
  
  for (const muro of window.murosDePiedra) {
    // Ignorar muros sin colisión
    if (muro.colision === false) continue;
    
    // 🔷 PRIORIDAD: Bloques del editor con shape definido
    if (muro.shape === 'rect' || muro.shape === 'triangle') {
      if (colisionJugadorMuroRect(x, y, muro)) {
        return false;
      }
    }
    else if (muro.shape === 'circle') {
      if (colisionJugadorMuroCircle(x, y, muro)) {
        return false;
      }
    }
    // 🪨 Muros con width y height (ovalados como muro_piedra)
    else if (muro.width && muro.height && !muro.radius && !muro.shape) {
      if (colisionJugadorMuroOvalo(x, y, muro)) {
        if (!puedeMoverJugador.loggedOvalo) {
          console.log('🚫 Colisión detectada con OVALO (muro_piedra) en:', {x: muro.x, y: muro.y});
          puedeMoverJugador.loggedOvalo = true;
        }
        return false;
      }
    }
    // Muros con solo radius (círculos)
    else if (muro.radius && !muro.width && !muro.height) {
      if (colisionJugadorMuroCircleSimple(x, y, muro)) return false;
    }
  }
  return true;
}

// Detección de colisión entre jugador y muro ovalado (óvalo)
function colisionJugadorMuroOvalo(playerX, playerY, muro) {
  // Transformar la posición del jugador al sistema local del muro
  const angle = muro.angle || 0;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const relX = playerX - muro.x;
  const relY = playerY - muro.y;
  // Rotar el punto inversamente al ángulo del muro
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;
  // Comprobar si el borde del jugador está dentro del óvalo
  const rx = muro.width + 32; // 32 = radio del jugador
  const ry = muro.height + 32;
  return (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1;
}

// Colisión con rectángulo rotado (para bloques del editor)
function colisionJugadorMuroRect(playerX, playerY, muro) {
  const angle = muro.angle || 0;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const relX = playerX - muro.x;
  const relY = playerY - muro.y;
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;
  
  const halfWidth = muro.width / 2 + 32; // 32 = radio del jugador
  const halfHeight = muro.height / 2 + 32;
  
  return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
}

// Colisión con círculo (para bloques del editor con shape circle)
function colisionJugadorMuroCircle(playerX, playerY, muro) {
  const dx = playerX - muro.x;
  const dy = playerY - muro.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const totalRadius = (muro.radius || muro.width / 2) + 32; // 32 = radio del jugador
  return distance < totalRadius;
}

// Colisión con círculo simple (radius solamente)
function colisionJugadorMuroCircleSimple(playerX, playerY, muro) {
  const dx = playerX - muro.x;
  const dy = playerY - muro.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const totalRadius = muro.radius + 32; // 32 = radio del jugador
  return distance < totalRadius;
}

const MAP_WIDTH = 2500;
const MAP_HEIGHT = 1500;
const WALL_THICKNESS = 24;
const DEFAULT_SPEED = 5; // Velocidad base de movimiento
import { MEJORAS, Proyectil } from './mejoras.shared.js';

// Dibuja todos los jugadores en el canvas, con cámara centrada en el jugador local y mundo fijo
// Cargar imagen de tumba
if (!tumbaImage) {
  tumbaImage = new Image();
  tumbaImage.src = 'tumbas/tumba.png';
}

// Función para dibujar tumbas
function drawTumbas() {
  if (!canvas || !tumbaImage.complete) return;
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer) return;
  
  // 🎥 Usar la posición de cámara interpolada (igual que en drawPlayers)
  const offsetX = cameraX - canvas.width / 2;
  const offsetY = cameraY - canvas.height / 2;
  
  tumbas.forEach(tumba => {
    const relativeX = tumba.x - offsetX;
    const relativeY = tumba.y - offsetY;
    
    // Dibujar tumba más grande (60x60 píxeles)
    const tumbaWidth = 60;
    const tumbaHeight = 60;
    ctx.drawImage(tumbaImage, relativeX - tumbaWidth / 2, relativeY - tumbaHeight / 2, tumbaWidth, tumbaHeight);
    
    // Nombre del jugador muerto encima de la tumba
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(tumba.nick, relativeX, relativeY - 40);
    ctx.fillText(tumba.nick, relativeX, relativeY - 40);
  });
}

function drawPlayers() {
  if (!canvas) return;
  const localPlayer = players.find(p => p.nick === user.nick);
  // REMOVED: Forcing speed to 40 - now using configurable speed
  // if (localPlayer && localPlayer.speed !== 40) {
  //   localPlayer.speed = 40;
  // }
  if (!localPlayer) return;
    // Debug eliminado
  
  // Modo espectador: si el jugador local está derrotado, seguir a otro jugador
  let cameraTarget = localPlayer;
  if (localPlayer.defeated) {
    // Buscar un jugador vivo para seguir
    if (!spectatorTarget || !players.find(p => p.nick === spectatorTarget && !p.defeated)) {
      const alivePlayers = players.filter(p => !p.defeated && p.nick !== user.nick);
      spectatorTarget = alivePlayers.length > 0 ? alivePlayers[0].nick : null;
    }
    if (spectatorTarget) {
      const target = players.find(p => p.nick === spectatorTarget);
      if (target) cameraTarget = target;
    }
  } else {
    spectatorTarget = null; // Resetear si el jugador revive
  }
  
  // 🎥 Usar la posición de cámara interpolada (suave) en lugar de la del jugador directamente
  // Esto hace que la cámara se mueva suavemente, pero el jugador permanece visualmente estable
  const offsetX = cameraX - canvas.width / 2;
  const offsetY = cameraY - canvas.height / 2;
  
  players.forEach(player => {
    // No dibujar jugadores derrotados
    if (player.defeated) return;
    
    // No dibujar jugadores invisibles (excepto si es el jugador local)
    const isInvisible = player.invisible && Date.now() < (player.invisibleUntil || 0);
    if (isInvisible && player.nick !== user.nick) return;
    
    const relativeX = player.x - offsetX;
    const relativeY = player.y - offsetY;
    
    // Si es el jugador local invisible, renderizar con transparencia
    if (isInvisible && player.nick === user.nick) {
      ctx.globalAlpha = 0.3; // 30% de opacidad
    }
    
    // Jugadores grandes y circulares
    ctx.beginPath();
    ctx.arc(relativeX, relativeY, 32, 0, 2 * Math.PI); // Radio 32px
    // Usar el color personalizado del jugador o el color por defecto
    ctx.fillStyle = player.color || '#f4c2a0';
    ctx.shadowColor = '#0008';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Borde blanco
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    // Borde azul si tiene escudo
    if (player.shieldAmount > 0) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)'; // skyblue transparente
      ctx.stroke();
    }
    // Borde amarillo si tiene speed boost
    if (player.speedBoostUntil > Date.now()) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // amarillo transparente
      ctx.stroke();
    }
    // Nombre grande y centrado
    ctx.fillStyle = '#222';
    ctx.font = 'bold 20px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.nick, relativeX, relativeY - 40);

    // Barra de vida debajo del nombre
    const barWidth = 64;
    const barHeight = 10;
    const barX = relativeX - barWidth / 2;
    const barY = relativeY - 24;
    const maxHealth = player.maxHealth || 200; // Usar maxHealth del jugador o 200 por defecto
    // Fondo gris
    ctx.fillStyle = '#bbb';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    // Vida (verde)
    ctx.fillStyle = '#4caf50';
    const vida = Math.max(0, Math.min(player.health ?? maxHealth, maxHealth));
    ctx.fillRect(barX, barY, barWidth * (vida / maxHealth), barHeight);
    // Borde negro
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#222';
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    // Barra de escudo encima si tiene
    if (player.shieldAmount > 0) {
      const shieldWidth = barWidth * (player.shieldAmount / 35);
      ctx.fillStyle = 'rgba(0, 191, 255, 0.7)'; // skyblue transparente
      ctx.fillRect(barX, barY - barHeight - 2, shieldWidth, barHeight);
      ctx.strokeStyle = '#00BFFF';
      ctx.strokeRect(barX, barY - barHeight - 2, barWidth, barHeight);
    }
    // Texto de vida
    ctx.fillStyle = '#222';
    ctx.font = 'bold 12px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${vida}/${maxHealth}`, relativeX, barY + barHeight - 2);
    
    // Restaurar opacidad después de dibujar jugador invisible
    if (isInvisible && player.nick === user.nick) {
      ctx.globalAlpha = 1.0;
    }
  });
}
import { Player, createPlayersFromSala } from './players.js';


const playersList = document.getElementById('playersList');
const roomInfo = document.getElementById('roomInfo');
const startBtn = document.getElementById('startBtn');

let canvas, ctx;
let players = [];
let explosions = []; // Array para explosiones activas
let tornados = []; // Array para tornados activos
let tornadoAiming = false; // Modo targeting para tornado
let tornadoAimingAngle = 0; // Ángulo de puntería para tornado

// 🎥 Sistema de cámara suave estilo Battlerite
let cameraX = 0; // Posición actual de la cámara (interpolada)
let cameraY = 0;
let cameraTargetX = 0; // Posición objetivo de la cámara
let cameraTargetY = 0;
const CAMERA_LERP_SPEED = 0.08; // Velocidad de interpolación (0.05-0.15, menor = más suave)
const CAMERA_MOUSE_INFLUENCE = 0.15; // Influencia del mouse en la cámara (0-1)
const CAMERA_MOUSE_MAX_OFFSET = 150; // Máximo desplazamiento por mouse en píxeles

// Evento para mostrar explosión en el canvas (meteoro, etc)
socket.on('explosion', (data) => {
  // data: { x, y, color, radius, duration }
  explosions.push({
    x: data.x,
    y: data.y,
    color: data.color || '#ff9800',
    radius: data.radius || 80,
    duration: data.duration || 600,
    startTime: Date.now()
  });
});

// Array para efectos de golpe melee
let meleeHits = [];
// Array para animaciones de golpe del jugador local
let localMeleeSwings = [];

// Evento para mostrar animación de golpe de cualquier jugador
socket.on('meleeSwing', (data) => {
  // data: { x, y, angle, range, radius, color, owner }
  // Siempre agregar para todos los jugadores (incluyendo el local para sincronizar aumentos)
  localMeleeSwings.push({
    x: data.x,
    y: data.y,
    angle: data.angle,
    startTime: Date.now(),
    duration: 250,
    range: data.range || 80,
    radius: data.radius || 20,
    color: data.color,
    owner: data.owner
  });
});

// Evento para mostrar efecto visual del golpe melee
socket.on('meleeHit', (data) => {
  // data: { x, y, color, isCombo, damage, comboCount, targetNick }
  
  // Efecto de impacto con ondas expansivas
  meleeHits.push({
    x: data.x,
    y: data.y,
    color: data.isCombo ? '#FFD700' : data.color,
    isCombo: data.isCombo,
    comboCount: data.comboCount,
    targetNick: data.targetNick,
    startTime: Date.now(),
    duration: data.isCombo ? 600 : 400,
    waves: [
      { radius: 0, maxRadius: data.isCombo ? 60 : 40, speed: data.isCombo ? 120 : 80 },
      { radius: 0, maxRadius: data.isCombo ? 45 : 30, speed: data.isCombo ? 90 : 60, delay: 100 }
    ]
  });
});

let sala = null;
let availableUpgrades = null; // Mejoras disponibles para elegir en ronda 1

let gameLoopId = null;

// Iniciar el bucle principal del juego
// Game loop is now started in initGame

// --- Disparo de proyectiles y cooldowns ---
let lastFireTime = 0;


// Helper function para cancelar invisibilidad al disparar
function cancelInvisibilityOnShoot() {
  const localPlayer = players.find(p => p.nick === user.nick);
  if (localPlayer && localPlayer.invisible) {
    localPlayer.invisible = false;
    localPlayer.invisibleUntil = 0;
    // Notificar al servidor que la invisibilidad se canceló
    socket.emit('cancelInvisibility', {
      roomId,
      owner: user.nick
    });
  }
}

// Variable para controlar si el listener está activo
let canShoot = true;

function handleMouseDown(e) {
  if (hudVisible) return; // No disparar si HUD está visible, igual que otras habilidades
  if (e.button !== 0) return; // Solo click izquierdo
  if (!canShoot) return; // Protección: no disparar si está en cooldown
  
  // Si el jugador está derrotado, no puede disparar
  let lp = players.find(p => p.nick === user.nick);
  if (lp && lp.defeated) return;
  const now = performance.now();
  if (!mejoraSeleccionada || typeof mejoraSeleccionada.cooldown !== 'number' || mejoraSeleccionada.proyectilQ) {
    console.log('No mejoraSeleccionada válida para click izquierdo', mejoraSeleccionada);
    return;
  }
  if (now - lastFireTime < mejoraSeleccionada.cooldown) {
  // console.log('Cooldown activo', {now, lastFireTime, cooldown: mejoraSeleccionada.cooldown});
    return;
  }
  
  // Bloquear disparos durante el cooldown
  canShoot = false;
  lastFireTime = now;

  // Obtener jugador local
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer || !mejoraSeleccionada) {
    console.log('No localPlayer o mejoraSeleccionada', {localPlayer, mejoraSeleccionada});
    return;
  }

  // Calcular dirección del disparo (hacia el mouse)
  const rect = canvas.getBoundingClientRect();
  // 🎥 Usar la posición de cámara interpolada
  const offsetX = cameraX - canvas.width / 2;
  const offsetY = cameraY - canvas.height / 2;
  const mouseX = e.clientX - rect.left + offsetX;
  const mouseY = e.clientY - rect.top + offsetY;
  const dx = mouseX - localPlayer.x;
  const dy = mouseY - localPlayer.y;
  const angle = Math.atan2(dy, dx);

  // Aplicar potenciador si tiene y es proyectil
  const potenciadores = mejorasJugador.filter(m => m.id === 'potenciador_proyectil');
  const numPotenciadores = potenciadores.length;
  let velocidadFinal = mejoraSeleccionada.velocidad + (numPotenciadores * 8);
  let maxRangeFinal = mejoraSeleccionada.maxRange + (numPotenciadores * 150);

  // Cancelar invisibilidad al disparar
  cancelInvisibilityOnShoot();

  // 🔊 Reproducir sonido de la habilidad
  if (typeof playAbilitySound === 'function') {
    playAbilitySound(mejoraSeleccionada.id, 0.4);
  }

  // Emitir evento al backend para crear el proyectil
  socket.emit('shootProjectile', {
    roomId,
    x: localPlayer.x,
    y: localPlayer.y,
    angle,
    mejoraId: mejoraSeleccionada.id,
    velocidad: velocidadFinal,
    maxRange: maxRangeFinal,
    owner: localPlayer.nick
  });
  
  // Reactivar disparos después del cooldown
  setTimeout(() => {
    canShoot = true;
  }, mejoraSeleccionada.cooldown);
}

canvas?.addEventListener('mousedown', handleMouseDown);

// Si el canvas aún no existe al cargar, agregar el listener tras inicializar
function enableProjectileShooting() {
  if (canvas) canvas.addEventListener('mousedown', handleMouseDown);
}

function resizeCanvas() {
  // Solo redimensionar si realmente cambió el tamaño
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    
    // Reiniciar configuración del contexto después de redimensionar
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
    }
  }
}

function mostrarHUDRondas() {
  // Remover HUD anterior si existe
  if (roundHUD && roundHUD.parentNode) {
    roundHUD.parentNode.removeChild(roundHUD);
  }
  
  // Crear nuevo HUD de rondas
  roundHUD = document.createElement('div');
  roundHUD.id = 'roundHUD';
  roundHUD.style.position = 'fixed';
  roundHUD.style.top = '20px';
  roundHUD.style.left = '50%';
  roundHUD.style.transform = 'translateX(-50%)';
  roundHUD.style.background = 'rgba(0, 0, 0, 0.8)';
  roundHUD.style.color = '#fff';
  roundHUD.style.padding = '10px 20px';
  roundHUD.style.borderRadius = '25px';
  roundHUD.style.fontSize = '24px';
  roundHUD.style.fontWeight = 'bold';
  roundHUD.style.border = '2px solid #fff';
  roundHUD.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
  roundHUD.style.zIndex = '999';
  roundHUD.textContent = `Ronda ${currentRound}`;
  
  document.body.appendChild(roundHUD);
}

function ocultarHUDRondas() {
  if (roundHUD && roundHUD.parentNode) {
    roundHUD.parentNode.removeChild(roundHUD);
    roundHUD = null;
  }
}

function crearHUDHabilidades() {
  // Remover HUD anterior si existe
  if (abilityHUD && abilityHUD.parentNode) {
    abilityHUD.parentNode.removeChild(abilityHUD);
  }
  
  // Crear nuevo HUD de habilidades
  abilityHUD = document.createElement('div');
  abilityHUD.id = 'abilityHUD';
  abilityHUD.style.position = 'fixed';
  abilityHUD.style.bottom = '20px';
  abilityHUD.style.left = '50%';
  abilityHUD.style.transform = 'translateX(-50%)';
  abilityHUD.style.display = 'flex';
  abilityHUD.style.gap = '20px';
  abilityHUD.style.zIndex = '1000';
  
  // Iconos para las habilidades
  const abilities = [
    { key: 'click', icon: 'iconos/click.png', name: 'Click' },
    { key: 'q', icon: 'iconos/Q.png', name: 'Q' },
    { key: 'e', icon: 'iconos/E.png', name: 'E' },
    { key: 'space', icon: 'iconos/espacio.png', name: 'Space' },
    { key: 'f', icon: 'iconos/F.png', name: 'F' }
  ];
  
  abilities.forEach(ability => {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '70px';
    container.style.height = '70px';
    container.style.background = 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(10, 10, 10, 0.95))';
    container.style.border = '3px solid #4a90e2';
    container.style.borderRadius = '15px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.cursor = 'pointer';
    container.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.1)';
    container.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    container.dataset.ability = ability.key;
    container.className = 'ability-container';
    
    // Canvas para el cooldown circular
    const cooldownCanvas = document.createElement('canvas');
    cooldownCanvas.className = 'cooldown-canvas';
    cooldownCanvas.width = 70;
    cooldownCanvas.height = 70;
    cooldownCanvas.style.position = 'absolute';
    cooldownCanvas.style.top = '0';
    cooldownCanvas.style.left = '0';
    cooldownCanvas.style.pointerEvents = 'none';
    cooldownCanvas.style.borderRadius = '15px';
    
    const img = document.createElement('img');
    img.src = ability.icon;
    img.className = 'ability-icon';
    img.style.width = '45px';
    img.style.height = '45px';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
    img.style.transition = 'filter 0.3s ease, transform 0.2s ease';
    img.style.zIndex = '1';
    img.style.position = 'relative';
    
    // Overlay de oscurecimiento durante cooldown
    const cooldownOverlay = document.createElement('div');
    cooldownOverlay.className = 'cooldown-overlay';
    cooldownOverlay.style.position = 'absolute';
    cooldownOverlay.style.top = '0';
    cooldownOverlay.style.left = '0';
    cooldownOverlay.style.width = '100%';
    cooldownOverlay.style.height = '100%';
    cooldownOverlay.style.background = 'rgba(0, 0, 0, 0.75)';
    cooldownOverlay.style.borderRadius = '12px';
    cooldownOverlay.style.pointerEvents = 'none';
    cooldownOverlay.style.opacity = '0';
    cooldownOverlay.style.transition = 'opacity 0.2s ease';
    cooldownOverlay.style.zIndex = '2';
    
    // Texto del tiempo de cooldown
    const cooldownText = document.createElement('div');
    cooldownText.className = 'cooldown-text';
    cooldownText.style.position = 'absolute';
    cooldownText.style.top = '50%';
    cooldownText.style.left = '50%';
    cooldownText.style.transform = 'translate(-50%, -50%)';
    cooldownText.style.color = '#fff';
    cooldownText.style.fontSize = '18px';
    cooldownText.style.fontWeight = '900';
    cooldownText.style.textShadow = '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)';
    cooldownText.style.display = 'none';
    cooldownText.style.pointerEvents = 'none';
    cooldownText.style.zIndex = '3';
    cooldownText.style.fontFamily = 'Arial, sans-serif';
    
    // Efecto de brillo cuando está lista
    const readyGlow = document.createElement('div');
    readyGlow.className = 'ready-glow';
    readyGlow.style.position = 'absolute';
    readyGlow.style.top = '-3px';
    readyGlow.style.left = '-3px';
    readyGlow.style.right = '-3px';
    readyGlow.style.bottom = '-3px';
    readyGlow.style.borderRadius = '15px';
    readyGlow.style.background = 'linear-gradient(45deg, #4a90e2, #63b3ed, #4a90e2)';
    readyGlow.style.backgroundSize = '200% 200%';
    readyGlow.style.opacity = '0';
    readyGlow.style.filter = 'blur(8px)';
    readyGlow.style.zIndex = '0';
    readyGlow.style.pointerEvents = 'none';
    readyGlow.style.animation = 'none';
    
    container.appendChild(readyGlow);
    container.appendChild(cooldownCanvas);
    container.appendChild(img);
    container.appendChild(cooldownOverlay);
    container.appendChild(cooldownText);
    
    abilityHUD.appendChild(container);
  });
  
  // Agregar estilos de animación si no existen
  if (!document.getElementById('abilityHUDStyles')) {
    const style = document.createElement('style');
    style.id = 'abilityHUDStyles';
    style.textContent = `
      @keyframes readyPulse {
        0%, 100% {
          opacity: 0.5;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.1);
        }
      }
      
      @keyframes glowRotate {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      .ability-container:hover {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.5), inset 0 2px 3px rgba(255, 255, 255, 0.2) !important;
      }
      
      .ability-container.ready .ready-glow {
        animation: readyPulse 2s ease-in-out infinite, glowRotate 3s linear infinite;
      }
      
      .ability-container.ready {
        border-color: #63b3ed;
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.8), inset 0 2px 3px rgba(255, 255, 255, 0.1);
      }
      
      .ability-container.ready .ability-icon {
        filter: drop-shadow(0 0 10px rgba(74, 144, 226, 0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(abilityHUD);
}

function actualizarHUDCooldowns() {
  if (!abilityHUD) return;
  
  const now = performance.now();
  const containers = abilityHUD.querySelectorAll('[data-ability]');
  
  containers.forEach(container => {
    const ability = container.dataset.ability;
    const overlay = container.querySelector('.cooldown-overlay');
    const cooldownText = container.querySelector('.cooldown-text');
    const canvas = container.querySelector('.cooldown-canvas');
    const icon = container.querySelector('.ability-icon');
    const readyGlow = container.querySelector('.ready-glow');
    
    let cooldown = 0;
    let remaining = 0;
    let totalCooldown = 0;
    
    switch(ability) {
      case 'click':
        if (mejoraSeleccionada && mejoraSeleccionada.cooldown) {
          totalCooldown = mejoraSeleccionada.cooldown;
          remaining = Math.max(0, totalCooldown - (now - lastFireTime));
        }
        break;
      case 'q':
        if (mejoraQSeleccionada && mejoraQSeleccionada.cooldown) {
          totalCooldown = mejoraQSeleccionada.cooldown;
          remaining = Math.max(0, totalCooldown - (now - lastQFireTime));
        }
        break;
      case 'e':
        const mejoraE = mejorasJugador.find(m => m.proyectilE);
        if (mejoraE && mejoraE.cooldown) {
          totalCooldown = mejoraE.cooldown;
          // Manejar cooldowns específicos para habilidades E
          if (mejoraE.id === 'muro_piedra') {
            // Muro de piedra usa cooldown específico
            if (window.muroDePiedraCooldown) {
              remaining = Math.max(0, totalCooldown - (now - window.muroDePiedraCooldown));
            }
          } else {
            // Otras habilidades E usan cooldown genérico
            const cooldownVar = window[mejoraE.id + 'Cooldown'];
            if (cooldownVar) {
              remaining = Math.max(0, totalCooldown - (now - cooldownVar));
            }
          }
        }
        break;
      case 'space':
        const mejoraEspacio = mejorasJugador.find(m => m.proyectilEspacio);
        if (mejoraEspacio && mejoraEspacio.cooldown) {
          totalCooldown = mejoraEspacio.cooldown;
          remaining = Math.max(0, totalCooldown - (now - window.teleportCooldown));
        }
        break;
      case 'f':
        if (mejoraFSeleccionada && mejoraFSeleccionada.cooldown) {
          totalCooldown = mejoraFSeleccionada.cooldown;
          remaining = Math.max(0, totalCooldown - (now - lastFFireTime));
        }
        break;
    }
    
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 70, 70);
      
      if (remaining > 0 && totalCooldown > 0) {
        // Habilidad en cooldown
        const percent = remaining / totalCooldown;
        
        // Dibujar el arco circular de cooldown
        ctx.save();
        
        // Círculo de fondo (completo)
        ctx.beginPath();
        ctx.arc(35, 35, 30, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Arco de cooldown (animado)
        ctx.beginPath();
        ctx.arc(35, 35, 30, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - percent)));
        const gradient = ctx.createLinearGradient(0, 0, 70, 70);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#ff8e53');
        gradient.addColorStop(1, '#feca57');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 107, 107, 0.8)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        // Punto brillante en el extremo del arco
        const angle = -Math.PI / 2 + (Math.PI * 2 * (1 - percent));
        const dotX = 35 + Math.cos(angle) * 30;
        const dotY = 35 + Math.sin(angle) * 30;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fill();
        
        ctx.restore();
        
        // Mostrar overlay oscuro
        overlay.style.opacity = '1';
        
        // Mostrar tiempo restante
        const seconds = Math.ceil(remaining / 1000);
        cooldownText.textContent = seconds.toFixed(1) + 's';
        cooldownText.style.display = 'block';
        
        // Animación de números
        const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
        cooldownText.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        // Oscurecer el icono
        icon.style.filter = 'grayscale(100%) brightness(0.4) drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
        
        // Quitar el brillo de "listo"
        container.classList.remove('ready');
        readyGlow.style.opacity = '0';
        
      } else {
        // Habilidad lista
        overlay.style.opacity = '0';
        cooldownText.style.display = 'none';
        
        // Restaurar color del icono
        icon.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
        
        // Agregar efecto de "lista" con brillo
        container.classList.add('ready');
        readyGlow.style.opacity = '1';
        
        // Efecto de "recarga completa" (solo una vez)
        if (container.dataset.wasOnCooldown === 'true') {
          // Animación de recarga completa
          ctx.save();
          const pulseProgress = (Date.now() % 500) / 500;
          
          ctx.beginPath();
          ctx.arc(35, 35, 30 + pulseProgress * 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(74, 144, 226, ${1 - pulseProgress})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          
          ctx.restore();
          
          // Quitar la marca después de un breve momento
          setTimeout(() => {
            container.dataset.wasOnCooldown = 'false';
          }, 500);
        }
      }
      
      // Marcar si estaba en cooldown
      if (remaining > 0) {
        container.dataset.wasOnCooldown = 'true';
      }
    }
  });
}

// Old HUD function removed - replaced with new implementation

function iniciarCombate() {
  // Aquí puedes activar controles, proyectiles, etc.
  // Por ahora solo muestra el canvas y permite jugar
  document.getElementById('gameCanvas').focus();
  enableProjectileShooting();
}

// El movimiento ahora es calculado en el backend. Solo enviamos las teclas presionadas.
// ============================================
// 🎮 SISTEMA DE MOVIMIENTO ESTILO BATTLERITE
// ============================================
// Todos los jugadores usan interpolación suave desde el servidor
function updateMovement(dt) {
  // 🌊 TODOS LOS JUGADORES: Interpolación suave hacia posición del servidor
  players.forEach(player => {
    if (player.targetX !== undefined && player.targetY !== undefined) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0.5) {
        // Si está siendo jalado por el gancho, usar interpolación más rápida para seguimiento perfecto
        const interpSpeed = player.beingPulled ? 0.85 : INTERPOLATION_SPEED;
        player.x += dx * interpSpeed;
        player.y += dy * interpSpeed;
      } else {
        // Snap a posición final si está muy cerca
        player.x = player.targetX;
        player.y = player.targetY;
      }
    }
  });
}

function gameLoop() {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;
  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
    document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
  }
  updateMovement(dt);
  // Actualizar proyectiles
  for (let p of proyectiles.values()) {
    p.update(16);
  }
  // Actualizar explosiones
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    if (Date.now() - exp.startTime > exp.duration) {
      explosions.splice(i, 1);
    }
  }
  // Actualizar HUD de cooldowns
  actualizarHUDCooldowns();
  drawMap();
  drawTumbas(); // Dibujar tumbas antes de los jugadores
  drawPlayers();
  // Usar requestAnimationFrame para actualizaciones más suaves
  gameLoopId = requestAnimationFrame(gameLoop);
}

function initGame() {
  // Limpiar intervalos anteriores para evitar acumulación
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  // Mostrar HUD de selección de mejora solo si NO es reinicio de ronda
  // if (!mostrarSoloProyectilQ) {
  //   mostrarHUDMejoras(false);
  // }
  // No resetear mostrarSoloProyectilQ aquí, mantener el estado de la ronda
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  // Create FPS counter div
  const fpsDiv = document.createElement('div');
  fpsDiv.id = 'fps-counter';
  fpsDiv.style.position = 'absolute';
  fpsDiv.style.top = '10px';
  fpsDiv.style.left = '10px';
  fpsDiv.style.color = 'white';
  fpsDiv.style.font = '20px Arial';
  fpsDiv.style.background = 'black';
  fpsDiv.style.padding = '5px';
  fpsDiv.style.zIndex = '1000';
  document.body.appendChild(fpsDiv);
  
  resizeCanvas();
  mostrarHUDRondas();
  crearHUDHabilidades();
  
  // Crear jugadores usando la clase Player
  players = createPlayersFromSala(sala, user.nick);
  
  // Inicializar cámara suave después de crear jugadores
  const localPlayer = players.find(p => p.nick === user.nick);
  if (localPlayer) {
    cameraX = localPlayer.x;
    cameraY = localPlayer.y;
    cameraTargetX = localPlayer.x;
    cameraTargetY = localPlayer.y;
  }
  // Centrar a los dos primeros jugadores en el centro del mapa, uno a la izquierda y otro a la derecha
  if (players.length >= 2) {
    const centerY = MAP_HEIGHT / 2;
    const centerX = MAP_WIDTH / 2;
    players[0].x = centerX - 150;
    players[0].y = centerY;
    players[1].x = centerX + 150;
    players[1].y = centerY;
  }
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // 🆕 Actualizar ángulo del láser si el jugador tiene uno activo
    const myLaser = activeLasers.find(l => l.owner === user.nick && l.mejoraId === 'laser');
    if (myLaser) {
      const localPlayer = players.find(p => p.nick === user.nick);
      if (localPlayer) {
        const offsetX = cameraX - canvas.width / 2;
        const offsetY = cameraY - canvas.height / 2;
        const mouseWorldX = mouseX + offsetX;
        const mouseWorldY = mouseY + offsetY;
        const dx = mouseWorldX - myLaser.x;
        const dy = mouseWorldY - myLaser.y;
        const newAngle = Math.atan2(dy, dx);
        
        // Enviar actualización al servidor (throttled)
        if (!myLaser.lastAngleUpdate || Date.now() - myLaser.lastAngleUpdate > 50) {
          myLaser.lastAngleUpdate = Date.now();
          socket.emit('updateLaserAngle', {
            roomId,
            laserId: myLaser.id,
            angle: newAngle
          });
        }
      }
    }
    
    // Cambiar cursor si está apuntando Roca fangosa
    if (rocaFangosaAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Roca fangosa') {
      canvas.style.cursor = 'none'; // Ocultar cursor normal
    } else {
      canvas.style.cursor = 'default';
    }
  });
  lastTime = performance.now();
  frameCount = 0;
  fps = 0;
  lastFpsUpdate = performance.now();
  enableProjectileShooting(); // Habilitar disparos desde el inicio
  gameLoop();
  
  // Usar debounce para resize para evitar llamadas excesivas
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
    }, 100); // Esperar 100ms después del último resize
  });
}

function drawMap() {
  if (!ctx || !canvas) return;
  
  // Optimización: usar willReadFrequently para mejorar el rendimiento
  if (!ctx.willReadFrequently) {
    ctx.willReadFrequently = false;
  }
  
  // Optimización: desactivar smoothing para objetos del juego (mejor rendimiento)
  // Se puede reactivar solo cuando sea necesario
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low'; // 'low' es más rápido que 'high'
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 🎥 Sistema de cámara suave estilo Battlerite
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  
  if (localPlayer) {
    // Modo espectador: si el jugador local está derrotado, seguir a otro jugador
    let cameraTarget = localPlayer;
    if (localPlayer.defeated) {
      // Buscar un jugador vivo para seguir
      if (!spectatorTarget || !players.find(p => p.nick === spectatorTarget && !p.defeated)) {
        const alivePlayers = players.filter(p => !p.defeated && p.nick !== user.nick);
        spectatorTarget = alivePlayers.length > 0 ? alivePlayers[0].nick : null;
      }
      if (spectatorTarget) {
        const target = players.find(p => p.nick === spectatorTarget);
        if (target) cameraTarget = target;
      }
    } else {
      spectatorTarget = null; // Resetear si el jugador revive
    }
    
    // Calcular influencia del mouse en la cámara (anticipación de movimiento)
    const mouseOffsetX = (mouseX - canvas.width / 2) * CAMERA_MOUSE_INFLUENCE;
    const mouseOffsetY = (mouseY - canvas.height / 2) * CAMERA_MOUSE_INFLUENCE;
    
    // Limitar el desplazamiento del mouse
    const clampedMouseX = Math.max(-CAMERA_MOUSE_MAX_OFFSET, Math.min(CAMERA_MOUSE_MAX_OFFSET, mouseOffsetX));
    const clampedMouseY = Math.max(-CAMERA_MOUSE_MAX_OFFSET, Math.min(CAMERA_MOUSE_MAX_OFFSET, mouseOffsetY));
    
    // Posición objetivo: jugador + offset del mouse
    cameraTargetX = cameraTarget.x + clampedMouseX;
    cameraTargetY = cameraTarget.y + clampedMouseY;
    
    // Inicializar cámara en la primera frame
    if (cameraX === 0 && cameraY === 0) {
      cameraX = cameraTargetX;
      cameraY = cameraTargetY;
    }
    
    // Interpolación suave (lerp) hacia la posición objetivo
    cameraX += (cameraTargetX - cameraX) * CAMERA_LERP_SPEED;
    cameraY += (cameraTargetY - cameraY) * CAMERA_LERP_SPEED;
    
    // Calcular offset del canvas basado en la posición interpolada de la cámara
    offsetX = cameraX - canvas.width / 2;
    offsetY = cameraY - canvas.height / 2;
  }
  
  // 🌌 Primero rellenar TODO el canvas con áreas oscuras (fuera del mapa)
  ctx.fillStyle = '#0a0a0a'; // Negro casi puro para áreas fuera del mapa
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Fondo mejorado con gradiente de arena de batalla (solo dentro del mapa)
  // Usar un gradiente simple sin recreación para evitar parpadeos
  const mapCenterX = MAP_WIDTH / 2 - offsetX;
  const mapCenterY = MAP_HEIGHT / 2 - offsetY;
  const bgGradient = ctx.createRadialGradient(
    mapCenterX, mapCenterY, 0,
    mapCenterX, mapCenterY, MAP_WIDTH / 1.5
  );
  bgGradient.addColorStop(0, '#9B8B7E');  // Arena clara en el centro
  bgGradient.addColorStop(0.6, '#7D6E5D'); // Arena media
  bgGradient.addColorStop(1, '#5D4E37');   // Arena oscura en los bordes
  ctx.fillStyle = bgGradient;
  ctx.fillRect(-offsetX, -offsetY, MAP_WIDTH, MAP_HEIGHT);
  
  // Textura sutil de arena (patrón de puntos) - Optimizado
  // Solo dibujar dentro del área visible para mejor rendimiento
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  const visibleStartX = Math.max(0, Math.floor(offsetX / 30) * 30);
  const visibleEndX = Math.min(MAP_WIDTH, Math.ceil((offsetX + canvas.width) / 30) * 30);
  const visibleStartY = Math.max(0, Math.floor(offsetY / 30) * 30);
  const visibleEndY = Math.min(MAP_HEIGHT, Math.ceil((offsetY + canvas.height) / 30) * 30);
  
  for (let x = visibleStartX; x < visibleEndX; x += 30) {
    for (let y = visibleStartY; y < visibleEndY; y += 30) {
      // Patrón determinístico basado en posición
      if ((x + y) % 60 === 0) {
        ctx.fillRect(x - offsetX, y - offsetY, 2, 2);
      }
    }
  }
  
  // Líneas del borde del mapa más visibles
  ctx.strokeStyle = '#3D2E1F';
  ctx.lineWidth = 4;
  ctx.strokeRect(-offsetX, -offsetY, MAP_WIDTH, MAP_HEIGHT);
  
  // ✨ Degradado sutil en los bordes del mapa hacia la oscuridad
  // SOLUCIÓN: Usar degradados relativos al canvas en lugar de absolutos
  // Esto evita recrear gradientes al moverse (elimina el parpadeo)
  const fadeDistance = 150; // Píxeles de transición
  
  // Calcular qué bordes del mapa son visibles en el canvas
  const mapTopInCanvas = -offsetY;
  const mapBottomInCanvas = MAP_HEIGHT - offsetY;
  const mapLeftInCanvas = -offsetX;
  const mapRightInCanvas = MAP_WIDTH - offsetX;
  
  // Solo dibujar degradados si el borde correspondiente está visible
  const topVisible = mapTopInCanvas < canvas.height && mapTopInCanvas > -fadeDistance;
  const bottomVisible = mapBottomInCanvas > 0 && mapBottomInCanvas < canvas.height + fadeDistance;
  const leftVisible = mapLeftInCanvas < canvas.width && mapLeftInCanvas > -fadeDistance;
  const rightVisible = mapRightInCanvas > 0 && mapRightInCanvas < canvas.width + fadeDistance;
  
  // Degradado superior (solo si es visible)
  if (topVisible) {
    const gradTop = ctx.createLinearGradient(0, mapTopInCanvas, 0, mapTopInCanvas + fadeDistance);
    gradTop.addColorStop(0, 'rgba(10, 10, 10, 1)');
    gradTop.addColorStop(1, 'rgba(10, 10, 10, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(mapLeftInCanvas, mapTopInCanvas, MAP_WIDTH, fadeDistance);
  }
  
  // Degradado inferior (solo si es visible)
  if (bottomVisible) {
    const gradBottom = ctx.createLinearGradient(0, mapBottomInCanvas - fadeDistance, 0, mapBottomInCanvas);
    gradBottom.addColorStop(0, 'rgba(10, 10, 10, 0)');
    gradBottom.addColorStop(1, 'rgba(10, 10, 10, 1)');
    ctx.fillStyle = gradBottom;
    ctx.fillRect(mapLeftInCanvas, mapBottomInCanvas - fadeDistance, MAP_WIDTH, fadeDistance);
  }
  
  // Degradado izquierdo (solo si es visible)
  if (leftVisible) {
    const gradLeft = ctx.createLinearGradient(mapLeftInCanvas, 0, mapLeftInCanvas + fadeDistance, 0);
    gradLeft.addColorStop(0, 'rgba(10, 10, 10, 1)');
    gradLeft.addColorStop(1, 'rgba(10, 10, 10, 0)');
    ctx.fillStyle = gradLeft;
    ctx.fillRect(mapLeftInCanvas, mapTopInCanvas, fadeDistance, MAP_HEIGHT);
  }
  
  // Degradado derecho (solo si es visible)
  if (rightVisible) {
    const gradRight = ctx.createLinearGradient(mapRightInCanvas - fadeDistance, 0, mapRightInCanvas, 0);
    gradRight.addColorStop(0, 'rgba(10, 10, 10, 0)');
    gradRight.addColorStop(1, 'rgba(10, 10, 10, 1)');
    ctx.fillStyle = gradRight;
    ctx.fillRect(mapRightInCanvas - fadeDistance, mapTopInCanvas, fadeDistance, MAP_HEIGHT);
  }

  // Renderizar muros de piedra
  dibujarMurosDePiedra(ctx, offsetX, offsetY);
  
  // Renderizar tornados
  dibujarTornados(ctx, offsetX, offsetY);
  
  // 🆕 Renderizar láseres continuos
  dibujarLaseres(ctx, offsetX, offsetY);

  // Previsualización de muro de piedra
  if (muroPiedraAiming) {
    const muroMejora = mejorasJugador.find(m => m.id === 'muro_piedra');
    const localPlayer = players.find(p => p.nick === user.nick);
    if (muroMejora && localPlayer) {
      // Círculo de rango máximo
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, muroMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Muro en el mouse
      let offsetMouseX = mouseX;
      let offsetMouseY = mouseY;
      // Limitar a rango máximo
      const dx = offsetMouseX - centerX;
      const dy = offsetMouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > muroMejora.maxRange) {
        const angulo = Math.atan2(dy, dx);
        offsetMouseX = centerX + Math.cos(angulo) * muroMejora.maxRange;
        offsetMouseY = centerY + Math.sin(angulo) * muroMejora.maxRange;
      }
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = muroMejora.color;
      if (muroMejora.width && muroMejora.height) {
  // Calcular ángulo real entre jugador y mouse
  const dx = offsetMouseX - centerX;
  const dy = offsetMouseY - centerY;
  // El muro debe estar perpendicular a la dirección apuntada
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  ctx.translate(offsetMouseX, offsetMouseY);
  ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          muroMejora.width,
          muroMejora.height,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      } else {
        ctx.fillRect(offsetMouseX - muroMejora.radius, offsetMouseY - muroMejora.radius, muroMejora.radius * 2, muroMejora.radius * 2);
      }
      ctx.restore();
    }
  }

  // Preview de gancho
  if (ganchoAiming) {
    const ganchoMejora = mejorasJugador.find(m => m.id === 'gancho');
    const localPlayer = players.find(p => p.nick === user.nick);
    if (ganchoMejora && localPlayer) {
      // Círculo de rango máximo
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      
      ctx.save();
      ctx.strokeStyle = '#696969';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, ganchoMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      
      // Línea de trayectoria del gancho
      let targetMouseX = mouseX;
      let targetMouseY = mouseY;
      
      // Limitar a rango máximo
      const dx = targetMouseX - centerX;
      const dy = targetMouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      if (dist > ganchoMejora.maxRange) {
        targetMouseX = centerX + Math.cos(angle) * ganchoMejora.maxRange;
        targetMouseY = centerY + Math.sin(angle) * ganchoMejora.maxRange;
      }
      
      // Dibujar línea de trayectoria
      ctx.save();
      ctx.strokeStyle = 'rgba(105, 105, 105, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(targetMouseX, targetMouseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      
      // Dibujar preview del gancho en el destino
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.translate(targetMouseX, targetMouseY);
      ctx.rotate(angle);
      
      // Cuerpo del gancho preview
      ctx.fillStyle = ganchoMejora.color;
      ctx.beginPath();
      ctx.arc(0, 0, ganchoMejora.radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Forma de gancho simplificada
      ctx.strokeStyle = '#4A4A4A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ganchoMejora.radius * 0.5, 0, ganchoMejora.radius * 0.5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      
      ctx.restore();
    }
  }

  // Preview de teleport
  if (spaceAiming) {
    const spaceMejora = mejorasJugador.find(m => m.proyectilEspacio);
    const localPlayer = players.find(p => p.nick === user.nick);
    if (spaceMejora && localPlayer) {
      // Círculo de rango máximo alrededor del jugador
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = spaceMejora.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, spaceMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Punto de destino o línea de trayectoria
      let targetX = mouseX;
      let targetY = mouseY;
      const dx = targetX - centerX;
      const dy = targetY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > spaceMejora.maxRange) {
        const angulo = Math.atan2(dy, dx);
        targetX = centerX + Math.cos(angulo) * spaceMejora.maxRange;
        targetY = centerY + Math.sin(angulo) * spaceMejora.maxRange;
      }
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = spaceMejora.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.fillStyle = spaceMejora.color;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }

  // Renderizar proyectiles (solo dibujar, no actualizar)
  for (let p of proyectiles.values()) {
    p.draw(ctx, offsetX, offsetY);
    // Eliminar si sale del mapa (opcional, pero el backend ya lo hace)
    if (
      p.x < 0 || p.x > MAP_WIDTH ||
      p.y < 0 || p.y > MAP_HEIGHT ||
      !p.activo
    ) {
      proyectiles.delete(p.id);
    }
  }

  // Dibujar explosiones
  for (const exp of explosions) {
    const elapsed = Date.now() - exp.startTime;
    const progress = Math.min(elapsed / exp.duration, 1);
    const currentRadius = exp.radius * progress;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(exp.x - offsetX, exp.y - offsetY, currentRadius, 0, 2 * Math.PI);
    ctx.fillStyle = exp.color;
    ctx.fill();
    
    // Si es un golpe melee, dibujar contador de combo
    if (exp.comboCount !== undefined) {
      ctx.globalAlpha = alpha * 1.5; // Más opaco el texto
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (exp.isCombo) {
        // Tercer golpe - mostrar "COMBO!" en dorado
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.strokeText('COMBO!', exp.x - offsetX, exp.y - offsetY - 20);
        ctx.fillText('COMBO!', exp.x - offsetX, exp.y - offsetY - 20);
      } else {
        // Mostrar contador (1/3, 2/3)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        const comboText = `${exp.comboCount}/3`;
        ctx.strokeText(comboText, exp.x - offsetX, exp.y - offsetY - 15);
        ctx.fillText(comboText, exp.x - offsetX, exp.y - offsetY - 15);
      }
    }
    
    ctx.restore();
  }

  // Dibujar animación de golpe melee del jugador local (slash/swing)
  for (let i = localMeleeSwings.length - 1; i >= 0; i--) {
    const swing = localMeleeSwings[i];
    const elapsed = Date.now() - swing.startTime;
    const progress = Math.min(elapsed / swing.duration, 1);
    
    if (progress >= 1) {
      localMeleeSwings.splice(i, 1);
      continue;
    }
    
    const swingX = swing.x - offsetX;
    const swingY = swing.y - offsetY;
    
    // Efecto de slash/corte que se proyecta desde el jugador
    ctx.save();
    ctx.translate(swingX, swingY);
    ctx.rotate(swing.angle);
    
    // Arc del golpe (como un abanico)
    const arcAngle = Math.PI / 3; // 60 grados de arco
    const currentRange = swing.range * progress;
    const alpha = (1 - progress) * 0.8;
    
    // Dibujar abanico de golpe
    ctx.globalAlpha = alpha;
    ctx.fillStyle = swing.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, currentRange, -arcAngle / 2, arcAngle / 2);
    ctx.closePath();
    ctx.fill();
    
    // Borde del abanico más brillante
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha * 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, currentRange, -arcAngle / 2, arcAngle / 2);
    ctx.stroke();
    
    // Líneas de velocidad (motion blur)
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    for (let j = 0; j < 5; j++) {
      const lineAngle = -arcAngle / 2 + (arcAngle / 4) * j;
      const lineLength = currentRange * (0.7 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(currentRange * 0.3, 0);
      ctx.lineTo(
        Math.cos(lineAngle) * lineLength,
        Math.sin(lineAngle) * lineLength
      );
      ctx.stroke();
    }
    
    // Partículas de impacto en el borde
    const numParticles = 8;
    ctx.fillStyle = '#FFFFFF';
    for (let j = 0; j < numParticles; j++) {
      const particleAngle = -arcAngle / 2 + (arcAngle / numParticles) * j;
      const particleRadius = 3 + Math.random() * 2;
      const particleX = Math.cos(particleAngle) * currentRange;
      const particleY = Math.sin(particleAngle) * currentRange;
      
      ctx.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
      ctx.beginPath();
      ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Destello central
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 15 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  // Dibujar efectos de golpe melee con ondas expansivas
  for (let i = meleeHits.length - 1; i >= 0; i--) {
    const hit = meleeHits[i];
    const elapsed = Date.now() - hit.startTime;
    const progress = Math.min(elapsed / hit.duration, 1);
    
    if (progress >= 1) {
      meleeHits.splice(i, 1);
      continue;
    }
    
    const hitX = hit.x - offsetX;
    const hitY = hit.y - offsetY;
    
    // Dibujar ondas de impacto
    for (const wave of hit.waves) {
      const waveElapsed = elapsed - (wave.delay || 0);
      if (waveElapsed < 0) continue;
      
      const waveProgress = Math.min(waveElapsed / hit.duration, 1);
      wave.radius = waveProgress * wave.maxRadius;
      const waveAlpha = (1 - waveProgress) * 0.8;
      
      if (wave.radius > 0) {
        ctx.save();
        ctx.globalAlpha = waveAlpha;
        ctx.strokeStyle = hit.color;
        ctx.lineWidth = hit.isCombo ? 5 : 3;
        ctx.beginPath();
        ctx.arc(hitX, hitY, wave.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Efecto de destello central
    const flashAlpha = (1 - progress) * 0.6;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = hit.color;
    ctx.beginPath();
    ctx.arc(hitX, hitY, hit.isCombo ? 25 : 18, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    // Líneas de impacto radiales
    if (hit.isCombo) {
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.7;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      const numLines = 8;
      for (let j = 0; j < numLines; j++) {
        const angle = (j / numLines) * Math.PI * 2 + progress * 0.5;
        const length = 30 + progress * 20;
        ctx.beginPath();
        ctx.moveTo(hitX, hitY);
        ctx.lineTo(hitX + Math.cos(angle) * length, hitY + Math.sin(angle) * length);
        ctx.stroke();
      }
      ctx.restore();
    }
    
    // Mostrar contador de combo SOBRE la barra de vida del jugador golpeado
    const targetPlayer = players.find(p => p.nick === hit.targetNick);
    if (targetPlayer) {
      const targetX = targetPlayer.x - offsetX;
      const targetY = targetPlayer.y - offsetY;
      
      // Posición sobre la barra de vida (arriba del jugador)
      const textY = targetY - 60; // 60 píxeles arriba del jugador
      const textAlpha = Math.max(0, 1 - progress * 1.2);
      const textScale = 1 + (hit.isCombo ? Math.sin(progress * Math.PI) * 0.3 : 0);
      
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.translate(targetX, textY - progress * 20); // Sube mientras desaparece
      ctx.scale(textScale, textScale);
      ctx.font = hit.isCombo ? 'bold 32px Arial' : 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (hit.isCombo) {
        // Tercer golpe - mostrar "COMBO x3!" en dorado con efectos
        ctx.shadowColor = '#FF4500';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.strokeText('★ COMBO x3! ★', 0, 0);
        ctx.fillText('★ COMBO x3! ★', 0, 0);
      } else {
        // Mostrar contador (x1, x2)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#FF6347';
        ctx.lineWidth = 3;
        const comboText = `HIT x${hit.comboCount}`;
        ctx.strokeText(comboText, 0, 0);
        ctx.fillText(comboText, 0, 0);
      }
      
      ctx.restore();
    }
  }

  // Si está apuntando meteoro, dibujar línea azul de rango
  if (meteoroAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Meteoro') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 500;
      const startX = localPlayer.x - offsetX;
      const startY = localPlayer.y - offsetY;
      // Calcular ángulo hacia mouse
      const mouseWorldX = mouseX + offsetX;
      const mouseWorldY = mouseY + offsetY;
      const dx = mouseWorldX - localPlayer.x;
      const dy = mouseWorldY - localPlayer.y;
      const angle = Math.atan2(dy, dx);
      meteoroAimingAngle = angle;
      // Calcular punto final
      const endX = startX + Math.cos(angle) * aimingRange;
      const endY = startY + Math.sin(angle) * aimingRange;
      ctx.save();
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
      // Opcional: dibujar círculo al final
      ctx.save();
      ctx.beginPath();
      ctx.arc(endX, endY, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está apuntando Roca fangosa, dibujar círculo de rango
  if (rocaFangosaAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Roca fangosa') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 800;
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = 'saddlebrown';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]); // Línea punteada
      ctx.beginPath();
      ctx.arc(centerX, centerY, aimingRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]); // Resetear
      ctx.restore();
      // Dibujar círculo en la posición del mouse ajustando el radio si tiene el aumento 'agrandar'
  const modifiedRadius = getMejoraRadius(mejoraQSeleccionada, localPlayer);
      ctx.save();
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, modifiedRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Azul transparente
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está apuntando Cuchilla fria, dibujar línea y las 3 trayectorias menores
  if (cuchillaAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Cuchilla fria') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 350;
      const startX = localPlayer.x - offsetX;
      const startY = localPlayer.y - offsetY;
      const mouseWorldX = mouseX + offsetX;
      const mouseWorldY = mouseY + offsetY;
      const dx = mouseWorldX - localPlayer.x;
      const dy = mouseWorldY - localPlayer.y;
      const angle = Math.atan2(dy, dx);
      cuchillaAimingAngle = angle;
      // Trayectoria principal
      const endX = startX + Math.cos(angle) * aimingRange;
      const endY = startY + Math.sin(angle) * aimingRange;
      ctx.save();
      ctx.strokeStyle = '#00cfff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
      // Trayectorias menores (cono)
      // Obtener el rango de cuchilla menor desde MEJORAS
      const cuchillaMenor = MEJORAS.find(m => m.id === 'cuchilla_fria_menor');
      const menorRange = cuchillaMenor && cuchillaMenor.maxRange ? cuchillaMenor.maxRange : 200;
      const angles = [angle + Math.PI/6, angle, angle - Math.PI/6];
      for (const ang of angles) {
        const minorEndX = endX + Math.cos(ang) * menorRange;
        const minorEndY = endY + Math.sin(ang) * menorRange;
        ctx.save();
        ctx.strokeStyle = '#00cfff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(minorEndX, minorEndY);
        ctx.stroke();
        ctx.restore();
        // Opcional: dibujar círculo al final de cada trayecto menor
        ctx.save();
        ctx.beginPath();
        ctx.arc(minorEndX, minorEndY, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00cfff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      // Círculo al final de la principal
      ctx.save();
      ctx.beginPath();
      ctx.arc(endX, endY, 14, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00cfff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está apuntando Tornado, dibujar círculo de rango y preview en mouse
  if (tornadoAiming && mejoraQSeleccionada && mejoraQSeleccionada.nombre === 'Tornado') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer) {
      const aimingRange = mejoraQSeleccionada.aimRange || 650;
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      
      // Dibujar círculo de rango alrededor del jugador (línea punteada)
      ctx.save();
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]); // Línea punteada
      ctx.beginPath();
      ctx.arc(centerX, centerY, aimingRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]); // Resetear
      ctx.restore();
      
      // Calcular posición del mouse en el mundo
      const mouseWorldX = mouseX + offsetX;
      const mouseWorldY = mouseY + offsetY;
      const dx = mouseWorldX - localPlayer.x;
      const dy = mouseWorldY - localPlayer.y;
      const distToMouse = Math.sqrt(dx * dx + dy * dy);
      
      // Limitar la posición del preview al rango máximo
      let previewX, previewY;
      if (distToMouse > aimingRange) {
        const angle = Math.atan2(dy, dx);
        previewX = centerX + Math.cos(angle) * aimingRange;
        previewY = centerY + Math.sin(angle) * aimingRange;
      } else {
        previewX = mouseX;
        previewY = mouseY;
      }
      
      // Dibujar área circular del tornado en la posición del mouse (radio 100)
      const tornadoRadius = mejoraQSeleccionada.effect?.radius || 100;
      ctx.save();
      ctx.beginPath();
      ctx.arc(previewX, previewY, tornadoRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(135, 206, 235, 0.2)'; // Relleno semi-transparente
      ctx.fill();
      ctx.stroke();
      
      // Dibujar espiral animada para preview
      ctx.strokeStyle = 'rgba(135, 206, 235, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const spiralStart = (performance.now() / 100 + i * Math.PI * 2 / 3) % (Math.PI * 2);
        for (let r = 0; r < tornadoRadius; r += 5) {
          const spiralAngle = spiralStart + (r / tornadoRadius) * Math.PI * 2;
          const sx = previewX + Math.cos(spiralAngle) * r;
          const sy = previewY + Math.sin(spiralAngle) * r;
          if (r === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  // Si está casteando Roca fangosa, dibujar círculos de cast que se llenan
  for (let i = activeCasts.length - 1; i >= 0; i--) {
    const cast = activeCasts[i];
    const now = performance.now();
    const elapsed = now - cast.startTime;
    const castTime = cast.mejora && cast.mejora.castTime ? cast.mejora.castTime : 1500;
    const progress = Math.min(Math.max(elapsed / castTime, 0), 1);
    const castX = cast.position.x - offsetX;
    const castY = cast.position.y - offsetY;
    const localPlayer = players.find(p => p.nick === cast.player);
    const modifiedRadius = localPlayer ? getMejoraRadius(cast.mejora, localPlayer) : (cast.mejora.radius || 20);
    if (cast.mejora.id === 'muro_piedra') {
      // Usar el ángulo guardado en la mejora para el muro de carga
      let angle = cast.mejora.lastCastAngle !== undefined ? cast.mejora.lastCastAngle : 0;
      // Dibujar óvalo de fondo
      ctx.save();
      ctx.strokeStyle = cast.mejora.color;
      ctx.lineWidth = 3;
      if (cast.mejora.width && cast.mejora.height) {
        ctx.translate(castX, castY);
  ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          cast.mejora.width,
          cast.mejora.height,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else if (cast.mejora.id === 'roca_fangosa') {
        ctx.beginPath();
        ctx.arc(castX, castY, modifiedRadius, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        ctx.strokeRect(castX - modifiedRadius, castY - modifiedRadius, modifiedRadius * 2, modifiedRadius * 2);
      }
      ctx.restore();
      // Óvalo de progreso (relleno)
      ctx.save();
      ctx.fillStyle = 'rgba(139, 69, 43, 0.5)'; // color similar al muro
      if (cast.mejora.width && cast.mejora.height) {
        ctx.translate(castX, castY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          cast.mejora.width * progress,
          cast.mejora.height * progress,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else if (cast.mejora.id === 'roca_fangosa') {
        ctx.beginPath();
        ctx.arc(castX, castY, modifiedRadius * progress, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillRect(castX - modifiedRadius * progress, castY - modifiedRadius * progress, modifiedRadius * 2 * progress, modifiedRadius * 2 * progress);
      }
      ctx.restore();
    } else {
      // Círculo de fondo
      ctx.save();
      ctx.beginPath();
  ctx.arc(castX, castY, modifiedRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'saddlebrown';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // Círculo de progreso (relleno)
      ctx.save();
      ctx.beginPath();
  ctx.arc(castX, castY, modifiedRadius * progress, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(139, 69, 19, 0.5)'; // saddlebrown con alpha
      ctx.fill();
      ctx.restore();
    }
    // Si terminó el cast, emitir proyectil o colocar muro (solo si es el cast del jugador local)
    if (progress >= 1) {
      if (cast.player === user.nick) {
        if (cast.mejora.id === 'muro_piedra') {
          // Emitir para que el backend cree el muro
          const localPlayer = players.find(p => p.nick === user.nick);
          if (localPlayer) {
            cancelInvisibilityOnShoot();
            socket.emit('shootProjectile', {
              roomId,
              x: localPlayer.x,
              y: localPlayer.y,
              angle: 0,
              mejoraId: cast.mejora.id,
              velocidad: cast.mejora.velocidad,
              owner: cast.player,
              targetX: cast.position.x,
              targetY: cast.position.y,
              skillShot: true
            });
          }
        } else {
          const localPlayer = players.find(p => p.nick === user.nick);
          if (localPlayer) {
            // 🔊 Reproducir sonido cuando la roca fangosa impacta en el suelo
            if (cast.mejora.id === 'roca_fangosa') {
              if (cast.player === user.nick) {
                // Sonido propio - volumen normal
                if (typeof playAbilitySound === 'function') {
                  playAbilitySound('roca_fangosa', 0.6);
                }
              } else {
                // Sonido de otro jugador - con proximidad
                if (typeof playAbilitySoundWithProximity === 'function' && typeof calculateDistance === 'function') {
                  const distance = calculateDistance(localPlayer.x, localPlayer.y, cast.position.x, cast.position.y);
                  playAbilitySoundWithProximity('roca_fangosa', distance, 800, 0.6);
                }
              }
            }
            
            // Solo el jugador que lanzó el cast emite el shootProjectile
            if (cast.player === user.nick) {
              cancelInvisibilityOnShoot();
              socket.emit('shootProjectile', {
                roomId,
                x: localPlayer.x,
                y: localPlayer.y,
                angle: 0, // No importa para skyfall
                mejoraId: cast.mejora.id,
                velocidad: cast.mejora.velocidad,
                owner: cast.player,
                targetX: cast.position.x,
                targetY: cast.position.y,
                skillShot: true,
                skyfall: true
              });
            }
          }
        }
      }
      // Remover el cast para todos
      activeCasts.splice(i, 1);
    }
  }

  // Dibujar suelos fangosos
  const now = Date.now();
  for (let i = activeMuddyGrounds.length - 1; i >= 0; i--) {
    const muddy = activeMuddyGrounds[i];
    const elapsed = now - muddy.createdAt;
    if (elapsed >= muddy.duration) {
      activeMuddyGrounds.splice(i, 1);
      continue;
    }
    const muddyX = muddy.x - offsetX;
    const muddyY = muddy.y - offsetY;
    ctx.save();
    ctx.beginPath();
    ctx.arc(muddyX, muddyY, muddy.radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)'; // brown with alpha
    ctx.fill();
    ctx.strokeStyle = 'saddlebrown';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Dibujar suelos sagrados
  for (let i = activeSacredGrounds.length - 1; i >= 0; i--) {
    const sacred = activeSacredGrounds[i];
    const elapsed = now - sacred.createdAt;
    if (elapsed >= sacred.duration) {
      activeSacredGrounds.splice(i, 1);
      continue;
    }
    const sacredX = sacred.x - offsetX;
    const sacredY = sacred.y - offsetY;
    const radius = sacred.radius;
    
    // Dibujo mejorado de Suelo Sagrado
    ctx.save();
    
    const time = Date.now() * 0.003;
    const pulseSize = Math.sin(time * 2) * 0.1 + 1;
    
    // Círculo exterior brillante (pulsante)
    const outerGradient = ctx.createRadialGradient(sacredX, sacredY, 0, sacredX, sacredY, radius * pulseSize);
    outerGradient.addColorStop(0, 'rgba(182, 227, 162, 0.8)');
    outerGradient.addColorStop(0.5, 'rgba(144, 238, 144, 0.5)');
    outerGradient.addColorStop(1, 'rgba(152, 251, 152, 0)');
    
    ctx.beginPath();
    ctx.arc(sacredX, sacredY, radius * pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = outerGradient;
    ctx.fill();
    
    // Círculo interior
    const innerGradient = ctx.createRadialGradient(sacredX, sacredY, 0, sacredX, sacredY, radius * 0.7);
    innerGradient.addColorStop(0, 'rgba(240, 255, 240, 0.9)');
    innerGradient.addColorStop(0.6, 'rgba(182, 227, 162, 0.7)');
    innerGradient.addColorStop(1, 'rgba(144, 238, 144, 0.4)');
    
    ctx.beginPath();
    ctx.arc(sacredX, sacredY, radius * 0.7, 0, Math.PI * 2);
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
    
    const crossSize = radius * 0.4;
    // Vertical
    ctx.beginPath();
    ctx.moveTo(sacredX, sacredY - crossSize);
    ctx.lineTo(sacredX, sacredY + crossSize);
    ctx.stroke();
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(sacredX - crossSize, sacredY);
    ctx.lineTo(sacredX + crossSize, sacredY);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Círculos de energía rotantes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    
    for (let j = 0; j < 3; j++) {
      const circleRadius = radius * (0.3 + j * 0.15);
      const angle = time + (j * Math.PI * 2 / 3);
      
      ctx.save();
      ctx.translate(sacredX, sacredY);
      ctx.rotate(angle);
      
      // Arcos decorativos
      for (let k = 0; k < 6; k++) {
        const arcAngle = (Math.PI * 2 * k / 6);
        ctx.beginPath();
        ctx.arc(0, 0, circleRadius, arcAngle, arcAngle + Math.PI / 6);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Partículas curativas ascendentes
    const particleCount = 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let j = 0; j < particleCount; j++) {
      const angle = (Math.PI * 2 * j / particleCount) + time;
      const distance = radius * (0.4 + (time + j) % 1 * 0.4);
      const px = sacredX + Math.cos(angle) * distance;
      const py = sacredY + Math.sin(angle) * distance - ((time * 20 + j * 10) % 40);
      const particleSize = 3 - ((time + j) % 1) * 2;
      
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Borde exterior
    ctx.beginPath();
    ctx.arc(sacredX, sacredY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(182, 227, 162, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }

  // Muros negros en los bordes del mundo
  ctx.fillStyle = '#111';
  // Arriba
  ctx.fillRect(-offsetX, -offsetY, MAP_WIDTH, WALL_THICKNESS);
  // Abajo
  ctx.fillRect(-offsetX, MAP_HEIGHT - WALL_THICKNESS - offsetY, MAP_WIDTH, WALL_THICKNESS);
  // Izquierda
  ctx.fillRect(-offsetX, -offsetY, WALL_THICKNESS, MAP_HEIGHT);
  // Derecha
  ctx.fillRect(MAP_WIDTH - WALL_THICKNESS - offsetX, -offsetY, WALL_THICKNESS, MAP_HEIGHT);

  // Rocas en posiciones absolutas del mundo
  const rocks = [
    { x: 120, y: 180, r: 22 },
    { x: 400, y: 100, r: 18 },
    { x: MAP_WIDTH - 150, y: MAP_HEIGHT - 200, r: 28 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, r: 25 },
    { x: MAP_WIDTH - 80, y: 90, r: 15 },
    { x: 80, y: MAP_HEIGHT - 120, r: 20 }
  ];
  for (const rock of rocks) {
    drawRock(rock.x - offsetX, rock.y - offsetY, rock.r);
  }
}

// Dibuja una roca simple en (x, y) with radio r
function drawRock(x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = '#bbb';
  ctx.shadowColor = '#666';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#888';
  ctx.stroke();
  // Detalles de la roca
  ctx.beginPath();
  ctx.arc(x - r/3, y - r/4, r/4, 0, Math.PI * 2);
  ctx.fillStyle = '#a0a0a0';
  ctx.fill();
  ctx.restore();
}



function handleKeyDown(e) {
  if (hudVisible) return; // No permitir lanzar habilidades si HUD está activo
  const key = e.key.toLowerCase();
  
  // 🎮 MOVIMIENTO ESTILO BATTLERITE - solo enviar teclas al servidor
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    if (!keys[key]) {
      keys[key] = true;
      // Enviar estado al servidor
      socket.emit('keyState', {
        roomId: roomId,
        nick: user.nick,
        key: key,
        pressed: true
      });
    }
    e.preventDefault(); // Prevenir scroll del navegador
    return;
  }
    
    // Habilidad tipo proyectilE: activación según activacionRapida
    if (key === 'e') {
      // Buscar mejora tipo proyectilE que tenga el jugador
      const mejoraE = mejorasJugador.find(m => m.proyectilE);
      if (!mejoraE) return;
      const localPlayer = players.find(p => p.nick === user.nick);
      if (!localPlayer) return;
      let offsetX = localPlayer.x - canvas.width / 2;
      let offsetY = localPlayer.y - canvas.height / 2;
      // ✨ Cámara libre
      if (mejoraE.activacionRapida) {
        // Fastcast: activar directamente debajo del jugador
        const now = performance.now();
        if (window[mejoraE.id + 'Cooldown'] && now - window[mejoraE.id + 'Cooldown'] < mejoraE.cooldown) return;
        window[mejoraE.id + 'Cooldown'] = now;
        cancelInvisibilityOnShoot();
        
        // 🔊 Reproducir sonido de habilidad
        if (typeof playAbilitySound === 'function') {
          playAbilitySound(mejoraE.id, 0.5);
        }
        
        socket.emit('shootProjectile', {
          roomId,
          x: localPlayer.x,
          y: localPlayer.y,
          angle: 0,
          mejoraId: mejoraE.id,
          velocidad: mejoraE.velocidad,
          owner: user.nick,
          targetX: localPlayer.x,
          targetY: localPlayer.y,
          skillShot: false
        });
      } else {
        // Requiere previsualización: usar aiming
        if (mejoraE.id === 'muro_piedra') {
          if (!muroPiedraAiming) {
            const now = performance.now();
            if (window.muroDePiedraCooldown && now - window.muroDePiedraCooldown < mejoraE.cooldown) return;
            muroPiedraAiming = true;
            canvas.style.cursor = 'none';
          } else {
            const now = performance.now();
            if (window.muroDePiedraCooldown && now - window.muroDePiedraCooldown < mejoraE.cooldown) return;
            window.muroDePiedraCooldown = now;
            const targetX = mouseX + offsetX;
            const targetY = mouseY + offsetY;
            const dx = targetX - localPlayer.x;
            const dy = targetY - localPlayer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let muroX = targetX;
            let muroY = targetY;
            if (dist > mejoraE.maxRange) {
              const angulo = Math.atan2(dy, dx);
              muroX = localPlayer.x + Math.cos(angulo) * mejoraE.maxRange;
              muroY = localPlayer.y + Math.sin(angulo) * mejoraE.maxRange;
            }
            
            // 🔊 Reproducir sonido de muro de piedra
            if (typeof playAbilitySound === 'function') {
              playAbilitySound('muro_piedra', 0.5);
            }
            
            // Iniciar cast en lugar de colocar muro inmediatamente
            socket.emit('startCast', {
              roomId,
              position: { x: muroX, y: muroY },
              startTime: now,
              player: user.nick,
              mejora: mejoraE
            });
            muroPiedraAiming = false;
            canvas.style.cursor = 'default';
          }
        } else if (mejoraE.id === 'gancho') {
          if (!ganchoAiming) {
            const now = performance.now();
            if (window.ganchoCooldown && now - window.ganchoCooldown < mejoraE.cooldown) return;
            ganchoAiming = true;
            canvas.style.cursor = 'none';
          } else {
            // Verificar cooldown pero NO establecerlo todavía (esperar confirmación del servidor)
            const now = performance.now();
            if (window.ganchoCooldown && now - window.ganchoCooldown < mejoraE.cooldown) return;
            
            // 🎥 Usar la posición de cámara interpolada
            const offsetX = cameraX - canvas.width / 2;
            const offsetY = cameraY - canvas.height / 2;
            
            const targetX = mouseX + offsetX;
            const targetY = mouseY + offsetY;
            const dx = targetX - localPlayer.x;
            const dy = targetY - localPlayer.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            let finalX = targetX;
            let finalY = targetY;
            
            if (dist > mejoraE.maxRange) {
              finalX = localPlayer.x + Math.cos(angle) * mejoraE.maxRange;
              finalY = localPlayer.y + Math.sin(angle) * mejoraE.maxRange;
            }
            
            cancelInvisibilityOnShoot();
            
            // 🔊 Reproducir sonido de gancho
            if (typeof playAbilitySound === 'function') {
              playAbilitySound('gancho', 0.5);
            }
            
            socket.emit('shootProjectile', {
              roomId,
              x: localPlayer.x,
              y: localPlayer.y,
              angle: angle,
              mejoraId: mejoraE.id,
              velocidad: mejoraE.velocidad,
              owner: user.nick,
              targetX: finalX,
              targetY: finalY,
              skillShot: true,
              maxRange: mejoraE.maxRange
            });
            
            ganchoAiming = false;
            canvas.style.cursor = 'default';
            
            // ✅ Establecer cooldown solo DESPUÉS de enviar (será confirmado por el servidor)
            // El servidor enviará el proyectil de vuelta si es válido, rechazará si es spam
            window.ganchoCooldown = now;
          }
        }
      }
    }
    // Habilidad tipo proyectilEspacio: teleport o impulso_electrico
    if (key === ' ') {
      const mejoraEspacio = mejorasJugador.find(m => m.proyectilEspacio);
      if (!mejoraEspacio) return;
      const localPlayer = players.find(p => p.nick === user.nick);
      if (!localPlayer) return;
      if (mejoraEspacio.activacionRapida) {
        // Fastcast: activar directamente
        const now = performance.now();
        if (window[mejoraEspacio.id + 'Cooldown'] && now - window[mejoraEspacio.id + 'Cooldown'] < mejoraEspacio.cooldown) return;
        window[mejoraEspacio.id + 'Cooldown'] = now;
        
        // 🔊 Reproducir sonido de habilidad
        if (typeof playAbilitySound === 'function') {
          playAbilitySound(mejoraEspacio.id, 0.5);
        }
        
        socket.emit('activateAbility', {
          roomId,
          mejoraId: mejoraEspacio.id,
          owner: user.nick
        });
      } else {
        // Requiere apuntar: teleport or embestida
        if (!spaceAiming) {
          const now = performance.now();
          if (window.teleportCooldown && now - window.teleportCooldown < mejoraEspacio.cooldown) return;
          spaceAiming = true;
          canvas.style.cursor = 'none';
        } else {
          const now = performance.now();
          if (window.teleportCooldown && now - window.teleportCooldown < mejoraEspacio.cooldown) return;
          
          // 🎥 Usar la posición de cámara interpolada
          let offsetX = cameraX - canvas.width / 2;
          let offsetY = cameraY - canvas.height / 2;
          let targetX = mouseX + offsetX;
          let targetY = mouseY + offsetY;
          // Ajuste: Embestida y Teleport se lanzan al máximo rango si el jugador presiona espacio fuera del rango
          const calcularDestinoHabilidadEspacio = (origen, destino, maxRange) => {
            const dx = destino.x - origen.x;
            const dy = destino.y - origen.y;
            const distancia = Math.sqrt(dx * dx + dy * dy);
            if (distancia > maxRange) {
              const angulo = Math.atan2(dy, dx);
              return {
                x: origen.x + Math.cos(angulo) * maxRange,
                y: origen.y + Math.sin(angulo) * maxRange
              };
            } else {
              return destino;
            }
          };
          const destinoFinal = calcularDestinoHabilidadEspacio(localPlayer, { x: targetX, y: targetY }, mejoraEspacio.maxRange);
          targetX = destinoFinal.x;
          targetY = destinoFinal.y;
          
          // Activar cooldown DESPUÉS de calcular el destino válido
          window.teleportCooldown = now;
          
          // 🔊 Reproducir sonido de habilidad
          if (typeof playAbilitySound === 'function') {
            playAbilitySound(mejoraEspacio.id, 0.5);
          }
          
          // Emitir evento de teleport or dash
          if (mejoraEspacio.id === 'embestida' || mejoraEspacio.id === 'salto_sombrio') {
            socket.emit('dashPlayer', {
              roomId,
              targetX,
              targetY,
              owner: user.nick,
              mejoraId: mejoraEspacio.id
            });
          } else if (mejoraEspacio.id === 'teleport') {
            socket.emit('teleportPlayer', {
              roomId,
              targetX,
              targetY,
              owner: user.nick
            });
          }
          spaceAiming = false;
          canvas.style.cursor = 'default';
        }
      }
    }
  // Preview de muro de piedra
  if (muroPiedraAiming) {
    const muroMejora = mejorasJugador.find(m => m.id === 'muro_piedra');
    const localPlayer = players.find(p => p.nick === user.nick);
    if (muroMejora && localPlayer) {
      // 🎥 Usar la posición de cámara interpolada
      const offsetX = cameraX - canvas.width / 2;
      const offsetY = cameraY - canvas.height / 2;
      // Círculo de rango máximo
      const centerX = localPlayer.x - offsetX;
      const centerY = localPlayer.y - offsetY;
      ctx.save();
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, muroMejora.maxRange, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Muro en el mouse
      let offsetMouseX = mouseX;
      let offsetMouseY = mouseY;
      // Limitar a rango máximo
      const dx = offsetMouseX - centerX;
      const dy = offsetMouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > muroMejora.maxRange) {
        const angulo = Math.atan2(dy, dx);
        offsetMouseX = centerX + Math.cos(angulo) * muroMejora.maxRange;
        offsetMouseY = centerY + Math.sin(angulo) * muroMejora.maxRange;
      }
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = muroMejora.color;
      if (muroMejora.width && muroMejora.height) {
        // Calcular ángulo real entre jugador y mouse
        const dx = offsetMouseX - centerX;
        const dy = offsetMouseY - centerY;
        // El muro debe estar perpendicular a la dirección apuntada
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        ctx.translate(offsetMouseX, offsetMouseY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          muroMejora.width,
          muroMejora.height,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      } else {
        ctx.fillRect(offsetMouseX - muroMejora.radius, offsetMouseY - muroMejora.radius, muroMejora.radius * 2, muroMejora.radius * 2);
      }
      ctx.restore();
    }
  }
    if (key === 'q') {
      if (!mejoraQSeleccionada) return;
      if (mejoraQSeleccionada.nombre === 'Meteoro') {
        const aimingRange = mejoraQSeleccionada.aimRange || 500;
        if (!meteoroAiming) {
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          meteoroAiming = true;
        } else {
          meteoroAiming = false;
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          lastQFireTime = now;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          // ? C�mara libre
          // ? C�mara libre
          const endX = localPlayer.x + Math.cos(meteoroAimingAngle) * aimingRange;
          const endY = localPlayer.y + Math.sin(meteoroAimingAngle) * aimingRange;
          cancelInvisibilityOnShoot();
          
          // 🔊 Reproducir sonido de meteoro
          if (typeof playAbilitySound === 'function') {
            playAbilitySound('meteoro', 0.5);
          }
          
          socket.emit('shootProjectile', {
            roomId,
            x: localPlayer.x,
            y: localPlayer.y,
            angle: meteoroAimingAngle,
            mejoraId: mejoraQSeleccionada.id,
            velocidad: mejoraQSeleccionada.velocidad,
            owner: localPlayer.nick,
            targetX: endX,
            targetY: endY,
            skillShot: true
          });
        }
      } else if (mejoraQSeleccionada.nombre === 'Cuchilla fria') {
        const aimingRange = mejoraQSeleccionada.aimRange || 350;
        if (!cuchillaAiming) {
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          cuchillaAiming = true;
        } else {
          cuchillaAiming = false;
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          lastQFireTime = now;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          // ? C�mara libre
          // ? C�mara libre
          const endX = localPlayer.x + Math.cos(cuchillaAimingAngle) * aimingRange;
          const endY = localPlayer.y + Math.sin(cuchillaAimingAngle) * aimingRange;
          cancelInvisibilityOnShoot();
          
          // 🔊 Reproducir sonido de cuchilla fría
          if (typeof playAbilitySound === 'function') {
            playAbilitySound('cuchilla_fria', 0.5);
          }
          
          socket.emit('shootProjectile', {
            roomId,
            x: localPlayer.x,
            y: localPlayer.y,
            angle: cuchillaAimingAngle,
            mejoraId: mejoraQSeleccionada.id,
            velocidad: mejoraQSeleccionada.velocidad,
            owner: localPlayer.nick,
            targetX: endX,
            targetY: endY,
            skillShot: true
          });
        }
      } else if (mejoraQSeleccionada.nombre === 'Roca fangosa') {
        if (!rocaFangosaAiming) {
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          rocaFangosaAiming = true;
        } else {
          // Empezar cast
          rocaFangosaAiming = false;
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          // ? C�mara libre
          // ? C�mara libre
          const targetX = mouseX + offsetX;
          const targetY = mouseY + offsetY;
          const dx = targetX - localPlayer.x;
          const dy = targetY - localPlayer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > mejoraQSeleccionada.aimRange) return; // Fuera de rango
          lastQFireTime = now; // Iniciar cooldown al empezar cast
          
          // Enviar evento al servidor para sincronizar
          socket.emit('startCast', {
            roomId,
            position: { x: targetX, y: targetY },
            startTime: now,
            player: user.nick,
            mejora: mejoraQSeleccionada
          });
        }
      } else if (mejoraQSeleccionada.nombre === 'Tornado') {
        const aimingRange = mejoraQSeleccionada.aimRange || 650;
        if (!tornadoAiming) {
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          tornadoAiming = true;
        } else {
          tornadoAiming = false;
          const now = performance.now();
          if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
          const localPlayer = players.find(p => p.nick === user.nick);
          if (!localPlayer) return;
          
          let offsetX = localPlayer.x - canvas.width / 2;
          let offsetY = localPlayer.y - canvas.height / 2;
          // ? C�mara libre
          // ? C�mara libre
          
          // Calcular posición objetivo basada en la posición del mouse
          const targetX = mouseX + offsetX;
          const targetY = mouseY + offsetY;
          const dx = targetX - localPlayer.x;
          const dy = targetY - localPlayer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Si está fuera de rango, limitar a la distancia máxima
          let finalX, finalY;
          if (dist > aimingRange) {
            const angle = Math.atan2(dy, dx);
            finalX = localPlayer.x + Math.cos(angle) * aimingRange;
            finalY = localPlayer.y + Math.sin(angle) * aimingRange;
          } else {
            finalX = targetX;
            finalY = targetY;
          }
          
          lastQFireTime = now;
          cancelInvisibilityOnShoot();
          
          // 🔊 Reproducir sonido de tornado
          if (typeof playAbilitySound === 'function') {
            playAbilitySound('tornado', 0.5);
          }
          
          socket.emit('shootProjectile', {
            roomId,
            x: localPlayer.x,
            y: localPlayer.y,
            angle: Math.atan2(finalY - localPlayer.y, finalX - localPlayer.x),
            mejoraId: mejoraQSeleccionada.id,
            velocidad: mejoraQSeleccionada.velocidad,
            owner: localPlayer.nick,
            targetX: finalX,
            targetY: finalY,
            skillShot: true
          });
        }
      } else {
        // Otras mejoras Q: disparo normal
        const now = performance.now();
        if (now - lastQFireTime < mejoraQSeleccionada.cooldown) return;
        lastQFireTime = now;
        const localPlayer = players.find(p => p.nick === user.nick);
        if (!localPlayer) return;
        let offsetX = localPlayer.x - canvas.width / 2;
        let offsetY = localPlayer.y - canvas.height / 2;
        // ? C�mara libre
        // ? C�mara libre
        const targetX = mouseX + offsetX;
        const targetY = mouseY + offsetY;
        const dx = targetX - localPlayer.x;
        const dy = targetY - localPlayer.y;
        const angle = Math.atan2(dy, dx);
        cancelInvisibilityOnShoot();
        socket.emit('shootProjectile', {
          roomId,
          x: localPlayer.x,
          y: localPlayer.y,
          angle,
          mejoraId: mejoraQSeleccionada.id,
          velocidad: mejoraQSeleccionada.velocidad,
          owner: localPlayer.nick
        });
      }
    }
    
    // 🆕 Habilidad F - Láser continuo
    if (key === 'f') {
      if (!mejoraFSeleccionada) return;
      
      const now = performance.now();
      if (now - lastFFireTime < mejoraFSeleccionada.cooldown) return;
      
      lastFFireTime = now;
      const localPlayer = players.find(p => p.nick === user.nick);
      if (!localPlayer) return;
      
      // 🎥 Usar la posición de cámara interpolada
      let offsetX = cameraX - canvas.width / 2;
      let offsetY = cameraY - canvas.height / 2;
      
      const targetX = mouseX + offsetX;
      const targetY = mouseY + offsetY;
      const dx = targetX - localPlayer.x;
      const dy = targetY - localPlayer.y;
      const angle = Math.atan2(dy, dx);
      
      cancelInvisibilityOnShoot();
      
      // 🔊 Reproducir sonido de láser
      if (typeof playAbilitySound === 'function') {
        playAbilitySound('laser', 0.5);
      }
      
      socket.emit('shootProjectile', {
        roomId,
        x: localPlayer.x,
        y: localPlayer.y,
        angle,
        mejoraId: mejoraFSeleccionada.id,
        velocidad: mejoraFSeleccionada.velocidad,
        owner: localPlayer.nick
      });
    }
    if (key === 'm') {
      // Cheat para pruebas: reducir 100 vida al rival
      const rival = players.find(p => p.nick !== user.nick);
      if (rival) {
        socket.emit('cheatDamage', { roomId, targetNick: rival.nick, damage: 100 });
      }
    }
}
// Renderizado de muros de piedra mejorado + bloques del editor de mapas
function dibujarMurosDePiedra(ctx, offsetX, offsetY) {
  if (!window.murosDePiedra) {
    return;
  }
  
  // Dibujar todos los muros (sin filtrar en cada frame)
  // El filtrado de muros temporales se hace solo cuando se agregan nuevos
  window.murosDePiedra.forEach((muro, index) => {
    ctx.save();
    
    // 🪨 Si el muro tiene imagen (como muro_roca), renderizarlo con la imagen
    if (muro.imagen) {
      ctx.translate(muro.x - offsetX, muro.y - offsetY);
      ctx.rotate(muro.angle);
      
      // Sombra del muro
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      
      // Cargar y dibujar la imagen si no está cargada
      if (!window.imagenesBloquesCache) {
        window.imagenesBloquesCache = {};
      }
      
      if (!window.imagenesBloquesCache[muro.imagen]) {
        const img = new Image();
        img.src = muro.imagen;
        window.imagenesBloquesCache[muro.imagen] = img;
      }
      
      const img = window.imagenesBloquesCache[muro.imagen];
      if (img.complete) {
        // Dibujar imagen centrada
        ctx.drawImage(
          img,
          -muro.width,
          -muro.height,
          muro.width * 2,
          muro.height * 2
        );
      } else {
        // Mientras carga, dibujar un óvalo temporal
        ctx.fillStyle = muro.color || '#8B7765';
        ctx.beginPath();
        ctx.ellipse(0, 0, muro.width, muro.height, 0, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // 🎨 PRIORIDAD: Bloques del EDITOR DE MAPAS con formas específicas (rect, circle, triangle)
    else if (muro.shape) {
      ctx.translate(muro.x - offsetX, muro.y - offsetY);
      ctx.rotate(muro.angle || 0); // El ángulo ya viene en radianes desde el editor
      
      // Sombra
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      
      // Gradiente 3D
      const baseColor = muro.color || '#8B7765';
      const lightColor = lightenColor(baseColor, 20);
      const darkColor = darkenColor(baseColor, 15);
      
      if (muro.shape === 'rect') {
        // 🟦 RECTÁNGULO (Paredes)
        const gradient = ctx.createLinearGradient(
          -muro.width / 2, -muro.height / 2,
          muro.width / 2, muro.height / 2
        );
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.5, baseColor);
        gradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-muro.width / 2, -muro.height / 2, muro.width, muro.height);
        
        // Borde
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-muro.width / 2, -muro.height / 2, muro.width, muro.height);
        
      } else if (muro.shape === 'circle') {
        // ⭕ CÍRCULO
        const gradient = ctx.createRadialGradient(
          -muro.width * 0.2, -muro.height * 0.2, 0,
          0, 0, muro.width / 2
        );
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, muro.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Borde
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
      } else if (muro.shape === 'triangle') {
        // 🔺 TRIÁNGULO
        const gradient = ctx.createLinearGradient(
          0, -muro.height / 2,
          0, muro.height / 2
        );
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.5, baseColor);
        gradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -muro.height / 2); // Vértice superior
        ctx.lineTo(muro.width / 2, muro.height / 2); // Vértice inferior derecho
        ctx.lineTo(-muro.width / 2, muro.height / 2); // Vértice inferior izquierdo
        ctx.closePath();
        ctx.fill();
        
        // Borde
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // 🪨 Muro de piedra con forma ovalada (width y height)
    else if (muro.width && muro.height) {
      ctx.translate(muro.x - offsetX, muro.y - offsetY);
      ctx.rotate(muro.angle || 0);
      
      // Sombra del muro
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      
      // Gradiente 3D para el óvalo
      const baseColor = muro.color || '#8B7765';
      const lightColor = lightenColor(baseColor, 20);
      const darkColor = darkenColor(baseColor, 15);
      
      const gradient = ctx.createRadialGradient(
        -muro.width * 0.2, -muro.height * 0.2, 0,
        0, 0, Math.max(muro.width, muro.height)
      );
      gradient.addColorStop(0, lightColor);
      gradient.addColorStop(0.7, baseColor);
      gradient.addColorStop(1, darkColor);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, muro.width, muro.height, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Borde del óvalo
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    else {
      // Fallback para muros rectangulares simples antiguos
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = muro.color || '#8B7765';
      ctx.fillRect(
        muro.x - offsetX - (muro.radius || 20),
        muro.y - offsetY - (muro.radius || 20),
        (muro.radius || 20) * 2,
        (muro.radius || 20) * 2
      );
    }
    ctx.restore();
  });
}

// Función para dibujar tornados
function dibujarTornados(ctx, offsetX, offsetY) {
  const now = Date.now();
  
  tornados.forEach(tornado => {
    const x = tornado.x - offsetX;
    const y = tornado.y - offsetY;
    
    // Actualizar rotación para animación
    tornado.rotation = (tornado.rotation || 0) + 0.15;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Dibujar círculo exterior (borde del tornado)
    ctx.beginPath();
    ctx.arc(0, 0, tornado.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(135, 206, 235, 0.15)'; // Azul cielo muy transparente
    ctx.fill();
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Dibujar espirales giratorias del tornado
    ctx.rotate(tornado.rotation);
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      ctx.save();
      ctx.rotate(angle);
      
      // Espiral
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(135, 206, 235, 0.4)';
      ctx.lineWidth = 4;
      for (let r = 0; r < tornado.radius; r += 5) {
        const spiralAngle = (r / tornado.radius) * Math.PI * 3;
        const spiralX = Math.cos(spiralAngle) * r;
        const spiralY = Math.sin(spiralAngle) * r;
        if (r === 0) {
          ctx.moveTo(spiralX, spiralY);
        } else {
          ctx.lineTo(spiralX, spiralY);
        }
      }
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Efecto de partículas giratorias
    ctx.rotate(-tornado.rotation * 0.5); // Rotación más lenta
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const radius = tornado.radius * 0.7;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
    
    ctx.restore();
  });
}

// 🆕 Función para dibujar láseres continuos
function dibujarLaseres(ctx, offsetX, offsetY) {
  const now = Date.now();
  const localPlayer = players.find(p => p.nick === user.nick);
  
  activeLasers.forEach(laser => {
    // Calcular el punto final del láser
    const startX = laser.x - offsetX;
    const startY = laser.y - offsetY;
    const endX = startX + Math.cos(laser.angle) * laser.maxRange;
    const endY = startY + Math.sin(laser.angle) * laser.maxRange;
    
    // Si el láser es del jugador local y es el nuevo láser, actualizar ángulo según el mouse
    if (laser.owner === user.nick && laser.mejoraId === 'laser' && localPlayer) {
      const mouseWorldX = mouseX + (cameraX - canvas.width / 2);
      const mouseWorldY = mouseY + (cameraY - canvas.height / 2);
      const dx = mouseWorldX - laser.x;
      const dy = mouseWorldY - laser.y;
      laser.angle = Math.atan2(dy, dx);
    }
    
    // Animación pulsante para el láser
    const pulse = Math.sin(now / 100) * 0.3 + 1;
    const thickness = laser.radius * pulse;
    
    ctx.save();
    
    // Dibujar el rayo láser con gradiente
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    
    // Color según el tipo de láser
    if (laser.mejoraId === 'laser') {
      // Nuevo láser - magenta/púrpura
      gradient.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 0, 255, 0.2)');
      
      // Efecto de resplandor exterior
      ctx.shadowColor = '#FF00FF';
      ctx.shadowBlur = 20;
    } else {
      // Láser antiguo - colores originales
      gradient.addColorStop(0, `rgba(255, 100, 100, 0.8)`);
      gradient.addColorStop(0.5, `rgba(255, 100, 100, 0.6)`);
      gradient.addColorStop(1, `rgba(255, 100, 100, 0.2)`);
      
      ctx.shadowColor = laser.color || '#ff6464';
      ctx.shadowBlur = 15;
    }
    
    // Dibujar rayo principal
    ctx.strokeStyle = gradient;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Dibujar núcleo brillante del láser
    ctx.shadowBlur = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = thickness * 0.3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Partículas a lo largo del láser
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount + (now / 500) % 1;
      const px = startX + (endX - startX) * (t % 1);
      const py = startY + (endY - startY) * (t % 1);
      
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }
    
    ctx.restore();
  });
}

// Funciones auxiliares para manipular colores
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  
  // 🎮 MOVIMIENTO - liberar tecla
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    if (keys[key]) {
      keys[key] = false;
      socket.emit('keyState', {
        roomId: roomId,
        nick: user.nick,
        key: key,
        pressed: false
      });
    }
  }
}

// Movimiento WASD manejado completamente por el servidor con interpolación suave
socket.on('gameStarted', (updatedSala) => {
  sala = updatedSala;
  
  // 🎵 Cambiar música del menú a batalla (duplicado por seguridad)
  if (menuMusic) {
    menuMusic.pause();
    menuMusic.currentTime = 0;
  }
  if (battleMusic && battleMusic.paused) {
    battleMusic.play().catch(err => console.log('Error al reproducir música de batalla:', err));
  }
  
  // Centrar a los jugadores en el mapa (servidor ya lo hace, pero aseguramos aquí)
  if (sala.players.length >= 2) {
    const centerY = MAP_HEIGHT / 2;
    const centerX = MAP_WIDTH / 2;
    sala.players[0].x = centerX - 150;
    sala.players[0].y = centerY;
    sala.players[1].x = centerX + 150;
    sala.players[1].y = centerY;
  }
  // Ocultar completamente la sala
  document.querySelector('.room-container').style.display = 'none';
  // Mostrar canvas
  const canvas = document.getElementById('gameCanvas');
  canvas.style.display = 'block';
  // Inicializar juego
  initGame();
  // Mostrar HUD de selección de mejoras en ronda 1
  if (sala.round === 1) {
    mostrarHUDSeleccionHabilidades();
  }
});

// Recibir muros del escenario profesional
socket.on('escenarioMuros', (muros) => {
  window.murosDePiedra = muros;
  // El gameLoop se encarga de redibujar automáticamente
});

socket.on('playerMoved', (data) => {
  const { nick, x, y } = data;
  const player = players.find(p => p.nick === nick);
  if (!player) return;
  
  // 🌊 TODOS usan interpolación suave (consistente para todos)
  player.targetX = x;
  player.targetY = y;
  
  // Si es la primera vez, posicionar directamente
  if (player.x === undefined || player.y === undefined) {
    player.x = x;
    player.y = y;
  }
});

// Listener específico para teleport - actualiza la posición inmediatamente
socket.on('playerTeleported', (data) => {
  const { nick, x, y } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    // Actualizar posición inmediatamente, sin interpolación
    player.x = x;
    player.y = y;
    // También actualizar target para interpolación
    player.targetX = x;
    player.targetY = y;
    // Redibujar para mostrar la nueva posición inmediatamente
    drawMap();
    drawPlayers();
    
    // Reproducir sonido de teleport con proximidad (solo para otros jugadores)
    if (nick !== user.nick) {
      const distance = calculateDistance(user.x, user.y, x, y);
      playAbilitySoundWithProximity('teleport', distance, 800, 0.5);
    }
  }
});

// Listener para inicio de dash/embestida
socket.on('playerDashStarted', (data) => {
  const { nick, startX, startY, targetX, targetY } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    // Actualizar posición de inicio y objetivo
    player.x = startX;
    player.y = startY;
    player.targetX = startX;
    player.targetY = startY;
    // Marcar que está en dash para animación fluida
    player.isDashing = true;
    player.dashTargetX = targetX;
    player.dashTargetY = targetY;
    
    // Reproducir sonido de dash con proximidad (solo para otros jugadores)
    if (nick !== user.nick) {
      const distance = calculateDistance(user.x, user.y, startX, startY);
      // Determinar qué sonido de dash usar según la mejora equipada
      const dashSounds = ['embestida', 'salto_sombrio', 'impulso_electrico'];
      // Por ahora usar embestida por defecto, se puede mejorar enviando mejoraId desde el servidor
      playAbilitySoundWithProximity('embestida', distance, 800, 0.5);
    }
  }
});

// Listener para actualizaciones durante el dash - muestra el movimiento en tiempo real
socket.on('playerDashing', (data) => {
  const { nick, x, y } = data;
  const player = players.find(p => p.nick === nick);
  if (player && nick !== user.nick) {
    // Solo actualizar para otros jugadores, el local ya se mueve
    player.x = x;
    player.y = y;
    player.targetX = x;
    player.targetY = y;
  }
});

// Listener para fin de dash/embestida - actualiza la posición final inmediatamente
socket.on('playerDashCompleted', (data) => {
  const { nick, x, y } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    // Actualizar posición inmediatamente
    player.x = x;
    player.y = y;
    player.targetX = x;
    player.targetY = y;
    player.isDashing = false;
    // El gameLoop se encarga de redibujar automáticamente
  }
});

// Listener para invisibilidad (Salto Sombrío)
socket.on('playerInvisible', (data) => {
  const { nick, duration } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    player.invisible = true;
    player.invisibleUntil = Date.now() + duration;
  }
});

// Listener para cambio de visibilidad (cuando se cancela invisibilidad)
socket.on('playerVisibilityChanged', (data) => {
  const { nick, invisible} = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    player.invisible = invisible;
    if (!invisible) {
      player.invisibleUntil = 0;
    }
    // Redibujar inmediatamente para mostrar el cambio
    drawMap();
    drawPlayers();
  }
});

// Listener para gancho impactando (reducir cooldown)
socket.on('hookHit', (data) => {
  const { owner, cdReduction, hitType } = data;
  if (owner === user.nick && window.ganchoCooldown) {
    const ganchoMejora = MEJORAS.find(m => m.id === 'gancho');
    if (ganchoMejora) {
      // Reducir el cooldown
      const now = performance.now();
      const timePassed = now - window.ganchoCooldown;
      const originalCooldown = ganchoMejora.cooldown;
      const reducedCooldown = originalCooldown * (1 - cdReduction);
      
      // Ajustar el tiempo del cooldown
      window.ganchoCooldown = now - (timePassed + (originalCooldown - reducedCooldown));
    }
  }
});

// Listener para jugador siendo jalado
socket.on('playerPulled', (data) => {
  const { nick, targetX, targetY } = data;
  const player = players.find(p => p.nick === nick);
  if (player) {
    player.targetX = targetX;
    player.targetY = targetY;
  }
});

// Listener para proyectil rechazado por spam (resetear cooldown del cliente)
socket.on('projectileRejected', (data) => {
  const { mejoraId } = data;
  console.log(`⚠️ Proyectil rechazado por spam: ${mejoraId}`);
  
  // Resetear el cooldown de esta habilidad específica
  if (mejoraId === 'gancho') {
    window.ganchoCooldown = 0;
    ganchoAiming = false; // También resetear el estado de aiming
    canvas.style.cursor = 'default';
  }
  // Puedes agregar más habilidades aquí si es necesario
});

// Listeners para Tornado
socket.on('tornadoCreated', (data) => {
  tornados.push({
    id: data.id,
    x: data.x,
    y: data.y,
    radius: data.radius, // Empieza en 0
    maxRadius: data.maxRadius, // Radio máximo
    color: data.color,
    createdAt: Date.now(),
    rotation: 0 // Para animación de rotación
  });
});

socket.on('tornadoUpdate', (data) => {
  const tornado = tornados.find(t => t.id === data.id);
  if (tornado) {
    tornado.x = data.x;
    tornado.y = data.y;
    if (data.radius !== undefined) {
      tornado.radius = data.radius;
    }
  }
});

socket.on('tornadoRemoved', (data) => {
  const index = tornados.findIndex(t => t.id === data.id);
  if (index !== -1) {
    tornados.splice(index, 1);
  }
});

// 🆕 Eventos de láseres continuos
socket.on('laserCreated', (laser) => {
  activeLasers.push(laser);
  
  // 🔊 Reproducir sonido del láser con proximidad
  if (laser.owner !== user.nick && typeof playAbilitySoundWithProximity === 'function') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer && typeof calculateDistance === 'function') {
      const distance = calculateDistance(localPlayer.x, localPlayer.y, laser.x, laser.y);
      playAbilitySoundWithProximity(laser.mejoraId, distance, 800, 0.5);
    }
  }
});

socket.on('laserRemoved', (data) => {
  const index = activeLasers.findIndex(l => l.id === data.id);
  if (index !== -1) {
    activeLasers.splice(index, 1);
  }
});

socket.on('laserAngleUpdate', (data) => {
  const laser = activeLasers.find(l => l.id === data.id);
  if (laser && laser.owner !== user.nick) {
    // Solo actualizar si no es nuestro láser (el nuestro ya se actualiza localmente)
    laser.angle = data.angle;
  }
});

socket.on('laserPositionUpdate', (data) => {
  const laser = activeLasers.find(l => l.id === data.id);
  if (laser) {
    // Actualizar posición del láser para que siga al jugador
    laser.x = data.x;
    laser.y = data.y;
  }
});

// Recibir estado de proyectiles del backend
socket.on('proyectilesUpdate', (proys) => {
  // Actualizar targets de proyectiles existentes, o crear nuevos
  const receivedIds = new Set();
  for (let pData of proys) {
    receivedIds.add(pData.id);
    if (proyectiles.has(pData.id)) {
      // Actualizar target
      const p = proyectiles.get(pData.id);
      p.setTarget(pData.x, pData.y);
    } else {
      // Crear nuevo proyectil
      const mejora = MEJORAS.find(m => m.id === pData.mejoraId);
      const modifiedMejora = { ...mejora };
      const player = players.find(p => p.nick === pData.owner);
      if (player && (mejora.proyectil || mejora.proyectilQ)) {
        const agrandadores = player.mejoras.filter(m => m.id === 'agrandar');
        const numAgrandadores = agrandadores.length;
        modifiedMejora.radius = (modifiedMejora.radius || 16) + (numAgrandadores * 10);
      }
      const newP = new Proyectil({
        x: pData.x,
        y: pData.y,
        angle: pData.angle,
        mejora: modifiedMejora,
        owner: pData.owner,
        id: pData.id,
        velocidad: pData.velocidad,
        radius: pData.radius
      });
      proyectiles.set(pData.id, newP);
      
      // 🔊 Reproducir sonido de habilidad de otros jugadores con proximidad
      if (pData.owner !== user.nick && typeof playAbilitySoundWithProximity === 'function') {
        const localPlayer = players.find(p => p.nick === user.nick);
        if (localPlayer && typeof calculateDistance === 'function') {
          const distance = calculateDistance(localPlayer.x, localPlayer.y, pData.x, pData.y);
          playAbilitySoundWithProximity(pData.mejoraId, distance, 800, 0.5);
        }
      }
    }
  }
  // Eliminar proyectiles que ya no existen en el servidor
  for (let [id, p] of proyectiles) {
    if (!receivedIds.has(id)) {
      proyectiles.delete(id);
    }
  }
});

// Recibir actualización de vida de los jugadores
socket.on('playersUpdate', (serverPlayers) => {
  // Sincronizar vida y posición de cada jugador
  for (const sp of serverPlayers) {
    const local = players.find(p => p.nick === sp.nick);
    if (local) {
      local.health = sp.health;
      local.maxHealth = sp.maxHealth || 200; // Actualizar maxHealth desde el servidor
      local.x = sp.x;
      local.y = sp.y;
      local.speed = sp.speed;
    }
  }
});

async function renderSala(sala) {
  // Marcar que está renderizando
  isRendering = true;
  
  const playersGrid = document.getElementById('playersGrid');
  const roomInfo = document.getElementById('roomInfo');
  
  if (!sala) {
    roomInfo.textContent = 'La sala ya no existe.';
    playersGrid.innerHTML = '';
    startBtn.style.display = 'none';
    isRendering = false;
    return;
  }
  
  roomInfo.innerHTML = `<span class="host-badge">👑 Host</span> <strong>${sala.host.nick}</strong>`;
  playersGrid.innerHTML = '';
  
  // Renderizar los 4 slots de jugadores
  for (let i = 0; i < 4; i++) {
    const playerCard = document.createElement('div');
    playerCard.className = 'room-player-card';
    
    if (sala.players[i]) {
      const player = sala.players[i];
      
      // Fetch player stats
      try {
        const response = await fetch(`${SERVER_URL}/stats/${player.nick}`);
        const data = await response.json();
        
        if (data.success) {
          const stats = data.stats;
          const nivel = stats.nivel || 1;
          const exp = stats.exp || 0;
          const victories = stats.victories || 0;
          const kills = stats.totalKills || 0;
          const deaths = stats.totalDeaths || 0;
          const kda = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
          
          // Calcular progreso de experiencia usando la tabla correcta
          const expForCurrentLevel = getExpForLevel(nivel);
          const expForNextLevel = getExpForLevel(nivel + 1);
          const expProgress = Math.max(0, exp - expForCurrentLevel);
          const expNeeded = expForNextLevel - expForCurrentLevel;
          const progressPercent = Math.min(100, (expProgress / expNeeded) * 100);
          
          playerCard.innerHTML = `
            <div class="room-player-card-header">
              <div class="player-avatar">
                <img src="ranks/${nivel}.png" alt="Rango ${nivel}" class="rank-badge">
              </div>
              <div class="room-player-info">
                <div class="room-player-name">${player.nick}</div>
                <div class="room-player-title">⚔️ Guerrero</div>
              </div>
              ${player.nick === sala.host.nick ? '<div class="crown-icon">👑</div>' : ''}
              ${user.nick === sala.host.nick && player.nick !== sala.host.nick ? `<button class="kick-player-btn" data-nick="${player.nick}" title="Expulsar jugador">✕</button>` : ''}
            </div>
            <div class="room-player-stats">
              <div class="stat-row">
                <div class="stat-item">
                  <div class="stat-label">🏆 Victorias</div>
                  <div class="stat-value">${victories}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">⚔️ K/D/A</div>
                  <div class="stat-value">${kda}</div>
                </div>
              </div>
              <div class="exp-bar-container">
                <div class="exp-bar-label">
                  <span>💫 Experiencia</span>
                  <span class="exp-numbers">Exp: ${exp}</span>
                </div>
                <div class="exp-bar">
                  <div class="exp-bar-fill" style="width: ${progressPercent}%">
                    <div class="exp-bar-shine"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="room-player-status ready">
              <span class="status-dot"></span> Listo
            </div>
          `;
        }
      } catch (error) {
        console.error('Error fetching player stats:', error);
        // Renderizado básico si falla la petición
        const nivel = player.nivel || 1;
        playerCard.innerHTML = `
          <div class="room-player-card-header">
            <div class="player-avatar">
              <img src="ranks/${nivel}.png" alt="Rango ${nivel}" class="rank-badge">
            </div>
            <div class="room-player-info">
              <div class="room-player-name">${player.nick}</div>
              <div class="room-player-title">⚔️ Guerrero</div>
            </div>
            ${player.nick === sala.host.nick ? '<div class="crown-icon">👑</div>' : ''}
            ${user.nick === sala.host.nick && player.nick !== sala.host.nick ? `<button class="kick-player-btn" data-nick="${player.nick}" title="Expulsar jugador">✕</button>` : ''}
          </div>
          <div class="room-player-status ready">
            <span class="status-dot"></span> Listo
          </div>
        `;
      }
      
      playerCard.classList.add('occupied');
    } else {
      // Slot vacante
      playerCard.classList.add('vacant');
      playerCard.innerHTML = `
        <div class="vacant-slot">
          <div class="vacant-icon">👤</div>
          <div class="vacant-text">Esperando jugador...</div>
        </div>
      `;
    }
    
    playersGrid.appendChild(playerCard);
  }
  
  // Mostrar botón de iniciar solo para el host
  if (user.nick === sala.host.nick) {
    startBtn.style.display = 'inline-flex';
  } else {
    startBtn.style.display = 'none';
  }
  
  // Agregar event listeners para los botones de kick
  const kickButtons = document.querySelectorAll('.kick-player-btn');
  kickButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nickToKick = btn.getAttribute('data-nick');
      kickPlayer(nickToKick);
    });
  });
  
  // Marcar que terminó el renderizado
  isRendering = false;
}

// Función para expulsar un jugador de la sala (solo el host puede hacerlo)
async function kickPlayer(nickToKick) {
  if (!confirm(`¿Estás seguro de que quieres expulsar a ${nickToKick} de la sala?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${SERVER_URL}/kick-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomId: roomId, 
        hostNick: user.nick,
        kickNick: nickToKick 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Jugador ${nickToKick} expulsado de la sala`);
      // La sala se actualizará automáticamente con el evento del socket
    } else {
      alert(data.error || 'No se pudo expulsar al jugador');
    }
  } catch (error) {
    console.error('Error al expulsar jugador:', error);
    alert('Error al conectar con el servidor');
  }
}

// Función auxiliar para calcular experiencia necesaria por nivel
// Esta función retorna la experiencia BASE (mínima) para alcanzar ese nivel
function getExpForLevel(level) {
  // Tabla de experiencia basada en el backend
  const expTable = {
    1: 0,      // Nivel 1: de 0 a 199 exp (200 exp necesaria)
    2: 200,    // Nivel 2: de 200 a 449 exp (250 exp necesaria)
    3: 450,    // Nivel 3: de 450 a 799 exp (350 exp necesaria)
    4: 800,    // Nivel 4: de 800 a 1449 exp (650 exp necesaria)
    5: 1450,   // Nivel 5: de 1450 a 2349 exp (900 exp necesaria)
    6: 2350,   // Nivel 6: de 2350 a 3399 exp (1050 exp necesaria)
    7: 3400,   // Nivel 7: de 3400 a 4899 exp (1500 exp necesaria)
    8: 4900,   // Nivel 8: de 4900 a 6399 exp (1500 exp necesaria)
    9: 6400,   // Nivel 9: de 6400 a 8799 exp (2400 exp necesaria)
    10: 8800,  // Nivel 10: de 8800 a 10499 exp (1700 exp necesaria)
    11: 10500, // Nivel 11: de 10500 a 14499 exp (4000 exp necesaria)
    12: 14500, // Nivel 12: de 14500 a 19099 exp (4600 exp necesaria)
    13: 19100, // Nivel 13: de 19100 a 24699 exp (5600 exp necesaria)
    14: 24700, // Nivel 14: de 24700 a 32499 exp (7800 exp necesaria)
    15: 32500, // Nivel 15: de 32500 a 39999 exp (7500 exp necesaria)
    16: 40000, // Nivel 16+: más de 40000 exp
  };
  
  // Si el nivel está en la tabla, retornar el valor
  if (expTable[level] !== undefined) {
    return expTable[level];
  }
  
  // Para niveles mayores a 16, usar el último valor conocido
  return 40000;
}

async function cargarSala() {
  // Resetear estado de rondas al cargar sala (siempre empezar con Round 1)
  mostrarSoloProyectilQ = false;
  currentRound = 1;
  // No mostrar HUD de rondas aquí, solo cuando se inicie la partida
  try {
  const res = await fetch(`${SERVER_URL}/rooms`);
    const data = await res.json();
    if (data.success) {
      sala = data.salas.find(s => s.id === roomId);
      renderSala(sala);
      if (sala) {
        // Unirse a la sala de sockets con stats calculadas
        // Usar getUser de ShopSystem para obtener datos migrados
        const user = window.ShopSystem ? window.ShopSystem.getUser() : JSON.parse(localStorage.getItem('batlesd_user'));
        
        // Calcular stats del jugador usando el sistema de tienda
        let playerColor = '#f4c2a0';
        let playerStats = { health: 200, damage: 0, speed: 3.5, maxHealth: 200 };
        
        if (window.ShopSystem && user?.equipped) {
          playerColor = window.ShopSystem.getEquippedColor(user.equipped);
          playerStats = window.ShopSystem.calculatePlayerStats(user.equipped);
          
          // Debug: mostrar stats calculadas
          console.log('🎨 Color equipado:', user.equipped.color);
          console.log('🎨 Color hex:', playerColor);
          console.log('📊 Stats calculadas:', playerStats);
        }
        
        socket.emit('joinRoom', { 
          roomId, 
          color: playerColor, 
          nick: user.nick,
          stats: playerStats // Enviar stats completas al servidor
        });
      }
    }
  } catch (err) {
    roomInfo.textContent = 'Error al conectar al servidor.';
    playersList.innerHTML = '';
  }
}

cargarSala();

// Botón iniciar
startBtn.addEventListener('click', () => {
  socket.emit('startGame', { roomId, nick: user.nick });
});

// Botón salir
document.getElementById('exitBtn').addEventListener('click', () => {
  if (sala && user.nick === sala.host.nick) {
    // Eliminar la sala en el backend
  fetch(`${SERVER_URL}/delete-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId })
    }).then(() => {
      localStorage.removeItem('batlesd_room_id');
      window.location.href = 'menu.html';
    });
  } else {
    // Eliminar jugador de la sala en el backend
  fetch(`${SERVER_URL}/leave-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId, nick: user.nick })
    }).then(() => {
      localStorage.removeItem('batlesd_room_id');
      window.location.href = 'menu.html';
    });
  }
});

socket.on('damageEvent', (data) => {
  showDamageNumber(data);
});

socket.on('healEvent', (data) => {
  showHealNumber(data);
});

socket.on('shieldApplied', (data) => {
  // Actualizar el escudo del jugador
  const player = players.find(p => p.nick === data.nick);
  if (player) {
    player.shieldAmount = data.shieldAmount;
    player.shieldUntil = Date.now() + data.duration;
    
    // Reproducir sonido de escudo con proximidad (solo para otros jugadores)
    if (data.nick !== user.nick) {
      const distance = calculateDistance(user.x, user.y, player.x, player.y);
      playAbilitySoundWithProximity('escudo_magico', distance, 800, 0.5);
    }
  }
});

socket.on('shieldDamage', (data) => {
  // Mostrar daño absorbido por escudo
  showShieldAbsorbed(data);
});

socket.on('availableUpgrades', (data) => {
  if (data.nick === user.nick) {
    availableUpgrades = data.upgrades;
    console.log('Available upgrades received:', availableUpgrades.length, availableUpgrades.map(m => m.nombre));
    
    // 🆕 Detectar si son habilidades F (ronda 4)
    const sonHabilidadesF = availableUpgrades.some(upgrade => upgrade.proyectilF);
    
    if (sonHabilidadesF) {
      // Mostrar HUD especial de habilidades F
      console.log('🔥 Mostrando HUD de Habilidades F');
      mostrarHUDHabilidadesF();
    }
    // Si no son habilidades F, no hacer nada aquí - se mostrará el HUD de aumentos
    // desde el evento roundVictory según la ronda
  }
});

function showDamageNumber({ target, amount, type }) {
  const player = players.find(p => p.nick === target);
  if (!player || !canvas) return;
  // Calcular posición en pantalla
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    // ? C�mara libre
    // ? C�mara libre
  }
  const screenX = player.x - offsetX;
  const screenY = player.y - offsetY - 40; // Arriba del jugador
  // Crear elemento de texto
  const textDiv = document.createElement('div');
  textDiv.textContent = `-${amount}`;
  textDiv.style.position = 'absolute';
  textDiv.style.left = `${screenX}px`;
  textDiv.style.top = `${screenY}px`;
  textDiv.style.color = type === 'dot_fire' ? 'orange' : type === 'dot_poison' ? 'limegreen' : 'black';
  textDiv.style.fontSize = '20px';
  textDiv.style.fontWeight = 'bold';
  textDiv.style.pointerEvents = 'none';
  textDiv.style.zIndex = '2000';
  textDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  document.body.appendChild(textDiv);
  // Animar hacia arriba y desvanecer
  let opacity = 1;
  let yPos = screenY;
  const animate = () => {
    yPos -= 1;
    opacity -= 0.02;
    textDiv.style.top = `${yPos}px`;
    textDiv.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(textDiv);
    }
  };
  requestAnimationFrame(animate);
}

function showHealNumber({ target, amount, type }) {
  const player = players.find(p => p.nick === target);
  if (!player || !canvas) return;
  // Calcular posición en pantalla
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    // ? C�mara libre
    // ? C�mara libre
  }
  const screenX = player.x - offsetX;
  const screenY = player.y - offsetY - 40; // Arriba del jugador
  // Crear elemento de texto
  const textDiv = document.createElement('div');
  textDiv.textContent = `+${amount}`;
  textDiv.style.position = 'absolute';
  textDiv.style.left = `${screenX}px`;
  textDiv.style.top = `${screenY}px`;
  textDiv.style.color = 'lime'; // Verde lima
  textDiv.style.fontSize = '20px';
  textDiv.style.fontWeight = 'bold';
  textDiv.style.pointerEvents = 'none';
  textDiv.style.zIndex = '2000';
  textDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  document.body.appendChild(textDiv);
  // Animar hacia arriba y desvanecer
  let opacity = 1;
  let yPos = screenY;
  const animate = () => {
    yPos -= 1;
    opacity -= 0.02;
    textDiv.style.top = `${yPos}px`;
    textDiv.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(textDiv);
    }
  };
  requestAnimationFrame(animate);
}

// Función para mostrar daño absorbido por escudo
function showShieldAbsorbed({ nick, absorbed }) {
  const player = players.find(p => p.nick === nick);
  if (!player || !canvas) return;
  // Calcular posición en pantalla
  const localPlayer = players.find(p => p.nick === user.nick);
  let offsetX = 0, offsetY = 0;
  if (localPlayer) {
    offsetX = localPlayer.x - canvas.width / 2;
    offsetY = localPlayer.y - canvas.height / 2;
    // ? C�mara libre
    // ? C�mara libre
  }
  const screenX = player.x - offsetX;
  const screenY = player.y - offsetY - 60; // Más arriba
  // Crear elemento de texto
  const textDiv = document.createElement('div');
  textDiv.textContent = `-${absorbed} (escudo)`;
  textDiv.style.position = 'absolute';
  textDiv.style.left = `${screenX}px`;
  textDiv.style.top = `${screenY}px`;
  textDiv.style.color = 'cyan'; // Azul claro para escudo
  textDiv.style.fontSize = '18px';
  textDiv.style.fontWeight = 'bold';
  textDiv.style.pointerEvents = 'none';
  textDiv.style.zIndex = '2000';
  textDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  document.body.appendChild(textDiv);
  // Animar hacia arriba y desvanecer
  let opacity = 1;
  let yPos = screenY;
  const animate = () => {
    yPos -= 1;
    opacity -= 0.02;
    textDiv.style.top = `${yPos}px`;
    textDiv.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(textDiv);
    }
  };
  requestAnimationFrame(animate);
}

// --- MODO ESPECTADOR ---
function checkSpectatorMode() {
  const localPlayer = players.find(p => p.nick === user.nick);
  let spectMsg = document.getElementById('spectatorMsg');
  if (localPlayer && localPlayer.defeated) {
    if (!spectMsg) {
      spectMsg = document.createElement('div');
      spectMsg.id = 'spectatorMsg';
      spectMsg.style.position = 'fixed';
      spectMsg.style.top = '20px';
      spectMsg.style.left = '50%';
      spectMsg.style.transform = 'translateX(-50%)';
      spectMsg.style.background = 'rgba(0,0,0,0.7)';
      spectMsg.style.color = '#fff';
      spectMsg.style.fontSize = '1.5rem';
      spectMsg.style.padding = '16px 32px';
      spectMsg.style.borderRadius = '12px';
      spectMsg.style.zIndex = '2000';
      spectMsg.style.textAlign = 'center';
      spectMsg.style.width = '350px';
      spectMsg.style.maxWidth = '90vw';
      document.body.appendChild(spectMsg);
    }
    // Actualizar texto con el jugador que está siguiendo
    if (spectatorTarget) {
      spectMsg.innerHTML = `💀 Has muerto<br><span style="font-size: 1.1rem; color: #ffd700;">Siguiendo a: ${spectatorTarget}</span>`;
    } else {
      spectMsg.textContent = '💀 Has muerto - Esperando...';
    }
  } else if (spectMsg) {
    spectMsg.remove();
  }
}

// Llamar tras cada playersUpdate
socket.on('playersUpdate', () => { checkSpectatorMode(); });

// Evento cuando un jugador muere: crear tumba
socket.on('playerDied', (data) => {
  // Agregar tumba en la posición donde murió el jugador
  tumbas.push({
    nick: data.nick,
    x: data.x,
    y: data.y
  });
  console.log(`[TUMBA] ${data.nick} murió en (${data.x}, ${data.y})`);
});

// Evento de fin de ronda: mostrar solo mejoras proyectilQ
socket.on('roundEnded', (data) => {
  mostrarHUDRondas();
  mostrarSoloProyectilQ = true;
  activeMuddyGrounds = []; // Clear muddy grounds
  activeSacredGrounds = []; // Clear sacred grounds
  // Limpiar solo muros TEMPORALES (de habilidades), mantener bloques del mapa
  if (window.murosDePiedra) {
    window.murosDePiedra = window.murosDePiedra.filter(muro => muro.muroMapa === true);
  }
  tumbas = []; // Limpiar tumbas al final de cada ronda
  spectatorTarget = null; // Resetear espectador
  currentRound++;
  
  // 🆕 Limpiar availableUpgrades antes de incrementar ronda para evitar bugs
  availableUpgrades = null;
  
  // 🔥 IMPORTANTE: Esperar a que el servidor envíe availableUpgrades para ronda 4
  // Para rondas 2, 3, 5, 6, 7: Mostrar HUD de aumentos (sin usar availableUpgrades)
  if (currentRound >= 2 && currentRound <= 7 && currentRound !== 4) {
    mostrarHUDAumentosRonda2();
  }
  
  // Para ronda 4: Esperar evento availableUpgrades del servidor que activará mostrarHUDHabilidadesF
  // (Ver socket.on('availableUpgrades') más abajo)
  
  if (currentRound >= 6) { // Para rondas 6+ mostrar proyectilQ
    // mostrarHUDMejoras(true);
  }
  
  // Limpiar explosiones
  explosions.length = 0;
});

// Evento de inicio de ronda: resetear modo espectador
socket.on('roundStarted', () => {
  spectatorTarget = null; // Volver al jugador local al iniciar nueva ronda
  const spectMsg = document.getElementById('spectatorMsg');
  if (spectMsg) spectMsg.remove();
});

// Evento de fin del juego: mostrar stats finales
socket.on('gameEnded', (data) => {
  mostrarStatsFinales(data.stats, data.winner);
});

// Evento para forzar cierre del modal
socket.on('forceClose', () => {
  const modal = document.getElementById('gameEndModal');
  if (modal) modal.remove();
  window.location.href = 'menu.html';
});

socket.on('playerUpgraded', (data) => {
  const player = players.find(p => p.nick === data.nick);
  if (player) {
    // Permitir stack ilimitado para aumentos con stack:true, y sin duplicados para los demás
    const mejorasUnicas = [];
    for (const m of data.mejoras) {
      if (m.stack) {
        // Siempre agregar aumentos con stack:true
        mejorasUnicas.push(m);
      } else {
        // No permitir duplicados para los demás
        if (!mejorasUnicas.some(mu => mu.id === m.id)) {
          mejorasUnicas.push(m);
        }
      }
    }
    player.mejoras = mejorasUnicas;
    if (data.nick === user.nick) {
      mejorasJugador = mejorasUnicas;
      // Separar mejoras normales de mejoras Q
      const mejorasNormales = mejorasJugador.filter(m => !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio && !m.aumento);
      const mejorasQ = mejorasJugador.filter(m => m.proyectilQ);

      // Actualizar mejoraSeleccionada a la última mejora normal
      if (mejorasNormales.length > 0) {
        mejoraSeleccionada = mejorasNormales[mejorasNormales.length - 1];
      }

      // Actualizar mejoraQSeleccionada a la última mejora Q
      if (mejorasQ.length > 0) {
        mejoraQSeleccionada = mejorasQ[mejorasQ.length - 1];
      }

      console.log('Tus mejoras actualizadas:', mejorasJugador);
      console.log('Mejora seleccionada (click):', mejoraSeleccionada?.nombre);
      console.log('Mejora Q seleccionada:', mejoraQSeleccionada?.nombre);
      const mejoraESeleccionada = mejorasJugador.find(m => m.proyectilE);
      console.log('Mejora seleccionada E:', mejoraESeleccionada?.nombre);
      const mejoraEspacioSeleccionada = mejorasJugador.find(m => m.proyectilEspacio);
      console.log('Mejora Espacio seleccionada:', mejoraEspacioSeleccionada?.nombre);
    }
  }
});

socket.on('castStarted', (data) => {
  activeCasts.push(data);
  
  // 🔊 Reproducir sonido de cast de otros jugadores con proximidad
  if (data.player !== user.nick && typeof playAbilitySoundWithProximity === 'function') {
    const localPlayer = players.find(p => p.nick === user.nick);
    if (localPlayer && data.mejora && typeof calculateDistance === 'function') {
      const distance = calculateDistance(localPlayer.x, localPlayer.y, data.position.x, data.position.y);
      // Solo reproducir para roca fangosa y muro de piedra (que tienen cast time)
      if (data.mejora.id === 'roca_fangosa') {
        // No reproducir aquí, se reproducirá cuando impacte
      } else if (data.mejora.id === 'muro_piedra') {
        playAbilitySoundWithProximity(data.mejora.id, distance, 800, 0.5);
      }
    }
  }
});

socket.on('castEnded', (data) => {
  activeCasts = activeCasts.filter(cast =>
    !(cast.position.x === data.position.x && cast.position.y === data.position.y && cast.player === data.player)
  );
});

socket.on('startBattle', () => {
  iniciarCombate();
});

socket.on('muddyGroundCreated', (data) => {
  activeMuddyGrounds.push({ ...data, createdAt: Date.now() });
});

socket.on('sacredGroundCreated', (data) => {
  console.log('🌿 Frontend recibió sacredGroundCreated:', data);
  activeSacredGrounds.push({ ...data, createdAt: Date.now() });
  console.log('✅ activeSacredGrounds ahora tiene:', activeSacredGrounds.length, 'elementos');
});

socket.on('shieldApplied', (data) => {
  // Actualizar el shield del jugador
  const player = players.find(p => p.nick === data.nick);
  if (player) {
    player.shield = data.shieldAmount;
    player.shieldExpires = Date.now() + data.duration;
  }
});

socket.on('shieldDamage', (data) => {
  showShieldAbsorbed(data);
});

socket.on('wallPlaced', (wall) => {
  if (!window.murosDePiedra) window.murosDePiedra = [];
  window.murosDePiedra.push(wall);
});

socket.on('wallsUpdate', (walls) => {
  // IMPORTANTE: Preservar bloques del mapa (muroMapa: true) y solo actualizar muros temporales
  if (!window.murosDePiedra) {
    window.murosDePiedra = walls;
  } else {
    // Mantener bloques permanentes del mapa
    const bloquesMapa = window.murosDePiedra.filter(muro => muro.muroMapa === true);
    // Combinar con los nuevos muros temporales
    window.murosDePiedra = [...bloquesMapa, ...walls];
  }
});

// Los bloques del mapa son permanentes.
// Los muros temporales se limpian solo en roundEnded o cuando se recibe wallsUpdate

// Función para mostrar stats finales del juego
function mostrarStatsFinales(stats, winner) {
  // Evitar múltiples modales
  if (document.getElementById('gameEndModal')) return;

  // 🎵 Detener música de batalla cuando termine el juego
  if (battleMusic) {
    battleMusic.pause();
    battleMusic.currentTime = 0; // Reiniciar para la próxima batalla
  }

  // Overlay con efecto de desenfoque
  const overlay = document.createElement('div');
  overlay.id = 'gameEndOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(75, 0, 130, 0.3) 0%, rgba(0,0,0,0.9) 100%)';
  overlay.style.backdropFilter = 'blur(12px)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.5s ease-out';
  document.body.appendChild(overlay);

  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'gameEndModal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
  modal.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
  modal.style.padding = '48px 56px';
  modal.style.borderRadius = '32px';
  modal.style.boxShadow = '0 30px 100px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.1), inset 0 2px 0 rgba(255,255,255,0.2)';
  modal.style.zIndex = '1000';
  modal.style.textAlign = 'center';
  modal.style.width = 'auto';
  modal.style.maxWidth = '90vw';
  modal.style.maxHeight = '85vh';
  modal.style.overflowY = 'auto';
  modal.style.animation = 'slideInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

  // Asegurar animaciones CSS
  if (!document.getElementById('gameEndAnimations')) {
    const style = document.createElement('style');
    style.id = 'gameEndAnimations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.7);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); }
        50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.9); }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-15px) rotate(10deg); }
      }
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      #gameEndModal::-webkit-scrollbar {
        width: 10px;
      }
      #gameEndModal::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.1);
        border-radius: 5px;
      }
      #gameEndModal::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 5px;
      }
      #gameEndModal::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
      }
    `;
    document.head.appendChild(style);
  }

  // Contenedor del título con decoración
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '32px';

  // Icono de trofeo animado
  const trophy = document.createElement('div');
  trophy.textContent = '🏆';
  trophy.style.fontSize = '5rem';
  trophy.style.marginBottom = '16px';
  trophy.style.filter = 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))';
  trophy.style.animation = 'bounce 2s ease-in-out infinite';
  titleContainer.appendChild(trophy);

  // Título principal
  const title = document.createElement('h1');
  title.textContent = '🎮 Fin del Juego 🎮';
  title.style.fontSize = '3rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #ffd700, #ffed4e, #fff59d, #ffed4e, #ffd700)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0 0 12px 0';
  title.style.textShadow = '0 0 40px rgba(255, 215, 0, 0.6)';
  titleContainer.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.textContent = stats.length === 1 ? '🏃 Victoria por Abandono' : '📊 Resultados de la Batalla';
  subtitle.style.fontSize = '1.3rem';
  subtitle.style.color = 'rgba(255,255,255,0.95)';
  subtitle.style.fontWeight = '600';
  subtitle.style.letterSpacing = '1px';
  titleContainer.appendChild(subtitle);

  modal.appendChild(titleContainer);

  // Ganador con diseño destacado
  const winnerContainer = document.createElement('div');
  winnerContainer.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))';
  winnerContainer.style.padding = '24px 32px';
  winnerContainer.style.borderRadius = '20px';
  winnerContainer.style.marginBottom = '32px';
  winnerContainer.style.border = '3px solid rgba(255, 215, 0, 0.6)';
  winnerContainer.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.3), inset 0 2px 0 rgba(255,255,255,0.3)';
  winnerContainer.style.animation = 'pulseGlow 2s infinite';

  const crownIcon = document.createElement('div');
  crownIcon.textContent = '👑';
  crownIcon.style.fontSize = '3rem';
  crownIcon.style.marginBottom = '8px';
  crownIcon.style.filter = 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))';
  winnerContainer.appendChild(crownIcon);

  const winnerLabel = document.createElement('div');
  winnerLabel.textContent = 'GANADOR';
  winnerLabel.style.fontSize = '1rem';
  winnerLabel.style.color = 'rgba(255,255,255,0.9)';
  winnerLabel.style.fontWeight = '700';
  winnerLabel.style.letterSpacing = '3px';
  winnerLabel.style.marginBottom = '8px';
  winnerContainer.appendChild(winnerLabel);

  const winnerName = document.createElement('div');
  winnerName.textContent = winner;
  winnerName.style.fontSize = '2.2rem';
  winnerName.style.fontWeight = '900';
  winnerName.style.color = '#fff';
  winnerName.style.textShadow = '0 4px 12px rgba(0,0,0,0.4)';
  winnerContainer.appendChild(winnerName);

  // Mensaje adicional si ganó por abandono
  if (stats.length === 1) {
    const abandonMessage = document.createElement('div');
    abandonMessage.textContent = '¡Los demás jugadores abandonaron!';
    abandonMessage.style.fontSize = '1rem';
    abandonMessage.style.color = 'rgba(255,255,255,0.85)';
    abandonMessage.style.fontWeight = '600';
    abandonMessage.style.marginTop = '8px';
    abandonMessage.style.fontStyle = 'italic';
    winnerContainer.appendChild(abandonMessage);
  }

  modal.appendChild(winnerContainer);

  // Contenedor de estadísticas
  const statsContainer = document.createElement('div');
  statsContainer.style.display = 'flex';
  statsContainer.style.flexDirection = 'column';
  statsContainer.style.gap = '16px';
  statsContainer.style.marginBottom = '32px';

  stats.forEach((stat, idx) => {
    const isWinner = stat.nick === winner;
    
    const statCard = document.createElement('div');
    statCard.style.background = isWinner 
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 193, 7, 0.15))'
      : 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))';
    statCard.style.padding = '20px 24px';
    statCard.style.borderRadius = '18px';
    statCard.style.border = isWinner 
      ? '2px solid rgba(255, 215, 0, 0.5)'
      : '2px solid rgba(255,255,255,0.2)';
    statCard.style.boxShadow = isWinner
      ? '0 6px 24px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
      : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
    statCard.style.animation = `slideUp 0.5s ease-out ${idx * 0.1}s backwards`;
    statCard.style.position = 'relative';
    statCard.style.overflow = 'hidden';

    // Medalla de posición
    const positionBadge = document.createElement('div');
    positionBadge.textContent = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    positionBadge.style.position = 'absolute';
    positionBadge.style.top = '12px';
    positionBadge.style.right = '12px';
    positionBadge.style.fontSize = '2rem';
    positionBadge.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))';
    statCard.appendChild(positionBadge);

    // Nombre del jugador
    const playerName = document.createElement('div');
    playerName.textContent = stat.nick;
    playerName.style.fontSize = '1.5rem';
    playerName.style.fontWeight = '800';
    playerName.style.color = '#fff';
    playerName.style.marginBottom = '12px';
    playerName.style.textAlign = 'left';
    playerName.style.textShadow = '0 2px 8px rgba(0,0,0,0.3)';
    statCard.appendChild(playerName);

    // Grid de estadísticas
    const statsGrid = document.createElement('div');
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    statsGrid.style.gap = '12px';

    const statsData = [
      { icon: '⚔️', label: 'Kills', value: stat.kills, color: '#ff5252' },
      { icon: '💀', label: 'Muertes', value: stat.deaths, color: '#9e9e9e' },
      { icon: '🏆', label: 'Victorias', value: stat.victories, color: '#ffd700' },
      { icon: '✨', label: 'EXP', value: stat.exp, color: '#64b5f6' },
      { icon: '💰', label: 'Oro', value: stat.gold || 0, color: '#ffc107' }
    ];

    statsData.forEach(data => {
      const statItem = document.createElement('div');
      statItem.style.background = 'rgba(0,0,0,0.2)';
      statItem.style.padding = '12px';
      statItem.style.borderRadius = '12px';
      statItem.style.border = '1px solid rgba(255,255,255,0.1)';
      statItem.style.textAlign = 'center';

      const iconLabel = document.createElement('div');
      iconLabel.style.fontSize = '1.5rem';
      iconLabel.style.marginBottom = '4px';
      iconLabel.textContent = data.icon;
      statItem.appendChild(iconLabel);

      const label = document.createElement('div');
      label.textContent = data.label;
      label.style.fontSize = '0.8rem';
      label.style.color = 'rgba(255,255,255,0.7)';
      label.style.fontWeight = '600';
      label.style.marginBottom = '4px';
      statItem.appendChild(label);

      const value = document.createElement('div');
      value.textContent = data.value;
      value.style.fontSize = '1.4rem';
      value.style.fontWeight = '900';
      value.style.color = data.color;
      value.style.textShadow = `0 2px 8px ${data.color}88`;
      statItem.appendChild(value);

      statsGrid.appendChild(statItem);
    });

    statCard.appendChild(statsGrid);
    statsContainer.appendChild(statCard);
  });

  modal.appendChild(statsContainer);

  // Temporizador con diseño mejorado
  const timerContainer = document.createElement('div');
  timerContainer.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))';
  timerContainer.style.padding = '20px 32px';
  timerContainer.style.borderRadius = '18px';
  timerContainer.style.border = '2px solid rgba(255,255,255,0.3)';
  timerContainer.style.marginTop = '24px';

  let timeLeft = 12;
  const countdown = document.createElement('div');
  countdown.textContent = `⏱️ Regresando al menú en ${timeLeft}s`;
  countdown.style.fontSize = '1.5rem';
  countdown.style.fontWeight = '900';
  countdown.style.background = 'linear-gradient(135deg, #fff, #e0e0e0)';
  countdown.style.WebkitBackgroundClip = 'text';
  countdown.style.WebkitTextFillColor = 'transparent';
  countdown.style.backgroundClip = 'text';
  timerContainer.appendChild(countdown);
  modal.appendChild(timerContainer);

  const interval = setInterval(() => {
    timeLeft--;
    countdown.textContent = `⏱️ Regresando al menú en ${timeLeft}s`;
    
    // Efecto de urgencia cuando queda poco tiempo
    if (timeLeft <= 3) {
      countdown.style.background = 'linear-gradient(135deg, #ff5252, #ff1744)';
      countdown.style.WebkitBackgroundClip = 'text';
      countdown.style.backgroundClip = 'text';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
      timerContainer.style.border = '2px solid rgba(255, 82, 82, 0.6)';
    }
    
    if (timeLeft <= 0) {
      clearInterval(interval);
      // Distribuir exp y cerrar
      socket.emit('gameAccepted', { stats: stats, winner: winner });
      overlay.remove();
      modal.remove();
      window.location.href = 'menu.html';
    }
  }, 1000);

  document.body.appendChild(modal);
}

// Función para mostrar HUD profesional de selección de mejoras para la ronda 1, con 3 habilidades al azar por sección, colores, tooltips y temporizador.
function mostrarHUDSeleccionHabilidades() {
  // Oculta el HUD antiguo si existe
  const hudAntiguo = document.getElementById('hudMejorasInicial');
  if (hudAntiguo) hudAntiguo.remove();
  if (document.getElementById('habilidadesHUD')) return;
  hudVisible = true;

  // Overlay oscuro de fondo
  const overlay = document.createElement('div');
  overlay.id = 'habilidadesOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'radial-gradient(circle at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.92) 100%)';
  overlay.style.zIndex = '999';
  overlay.style.animation = 'fadeIn 0.4s ease-out';
  document.body.appendChild(overlay);

  const hud = document.createElement('div');
  hud.id = 'habilidadesHUD';
  hud.style.position = 'fixed';
  hud.style.top = '50%';
  hud.style.left = '50%';
  hud.style.transform = 'translate(-50%, -50%) scale(0.9)';
  hud.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  hud.style.padding = '24px 32px';
  hud.style.borderRadius = '24px';
  hud.style.boxShadow = '0 20px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)';
  hud.style.zIndex = '1000';
  hud.style.pointerEvents = 'none';
  hud.style.textAlign = 'center';
  hud.style.width = 'auto';
  hud.style.maxWidth = '95vw';
  hud.style.maxHeight = '95vh';
  hud.style.animation = 'slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  hud.style.backdropFilter = 'blur(10px)';
  hud.style.display = 'flex';
  hud.style.flexDirection = 'column';
  hud.style.overflow = 'hidden';

  // Añadir keyframes de animación
  if (!document.getElementById('skillSelectorAnimations')) {
    const style = document.createElement('style');
    style.id = 'skillSelectorAnimations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(255,255,255,0.3);
        }
        50% {
          box-shadow: 0 0 35px rgba(255,255,255,0.5);
        }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Título principal compacto
  const titleContainer = document.createElement('div');
  titleContainer.style.marginBottom = '20px';
  titleContainer.style.flexShrink = '0';
  
  const title = document.createElement('h2');
  title.textContent = '⚡ Selecciona tus Habilidades ⚡';
  title.style.fontSize = '2rem';
  title.style.fontWeight = '900';
  title.style.background = 'linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)';
  title.style.backgroundSize = '200% auto';
  title.style.WebkitBackgroundClip = 'text';
  title.style.WebkitTextFillColor = 'transparent';
  title.style.backgroundClip = 'text';
  title.style.animation = 'shimmer 3s linear infinite';
  title.style.margin = '0';
  title.style.textShadow = '0 0 30px rgba(255,255,255,0.5)';
  titleContainer.appendChild(title);

  hud.appendChild(titleContainer);

  // Contenedor de habilidades en grid 2x2
  const mainGrid = document.createElement('div');
  mainGrid.style.display = 'grid';
  mainGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  mainGrid.style.gap = '16px';
  mainGrid.style.width = '100%';
  mainGrid.style.maxWidth = '1100px';
  mainGrid.style.flexGrow = '1';
  mainGrid.style.alignItems = 'start';

  // Crear secciones para cada tecla con iconos mejorados
  const teclas = [
    { 
      nombre: 'Click Izquierdo', 
      icono: '🖱️',
      color: '#3498db',
      filtro: m => m.proyectil && !m.proyectilQ && !m.proyectilE && !m.proyectilEspacio 
    },
    { 
      nombre: 'Q', 
      icono: '🔥',
      color: '#e74c3c',
      filtro: m => m.proyectilQ 
    },
    { 
      nombre: 'E', 
      icono: '🛡️',
      color: '#9b59b6',
      filtro: m => m.proyectilE 
    },
    { 
      nombre: 'Espacio', 
      icono: '⚡',
      color: '#f1c40f',
      filtro: m => m.proyectilEspacio 
    }
  ];

  // Variables para guardar las habilidades disponibles de cada tecla
  const habilidadesDisponibles = {
    'Click Izquierdo': [],
    'Q': [],
    'E': [],
    'Espacio': []
  };

  // Variables para rastrear si el jugador ya seleccionó cada habilidad
  let clickSeleccionado = false;
  let qSeleccionado = false;
  let eSeleccionado = false;
  let espacioSeleccionado = false;

  teclas.forEach((tecla, idx) => {
    const section = document.createElement('div');
    section.style.padding = '16px';
    section.style.background = 'rgba(255,255,255,0.03)';
    section.style.borderRadius = '16px';
    section.style.border = '1px solid rgba(255,255,255,0.08)';
    section.style.transition = 'all 0.3s ease';
    section.style.animation = `slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.1}s backwards`;
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.height = '100%';
    
    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.alignItems = 'center';
    labelContainer.style.justifyContent = 'center';
    labelContainer.style.gap = '8px';
    labelContainer.style.marginBottom = '12px';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = tecla.icono;
    iconSpan.style.fontSize = '1.5rem';
    iconSpan.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.3))';
    labelContainer.appendChild(iconSpan);

    const label = document.createElement('h3');
    label.textContent = tecla.nombre === 'Click Izquierdo' ? 'Click' : tecla.nombre;
    label.style.fontSize = '1.2rem';
    label.style.fontWeight = '800';
    label.style.background = `linear-gradient(135deg, ${tecla.color}, ${tecla.color}dd)`;
    label.style.WebkitBackgroundClip = 'text';
    label.style.WebkitTextFillColor = 'transparent';
    label.style.backgroundClip = 'text';
    label.style.margin = '0';
    labelContainer.appendChild(label);

    section.appendChild(labelContainer);
    
    // Seleccionar 3 habilidades al azar para cada sección
    let habilidades = MEJORAS.filter(tecla.filtro);
    if (habilidades.length > 3) {
      habilidades = habilidades
        .map(h => ({h, sort: Math.random()}))
        .sort((a, b) => a.sort - b.sort)
        .map(({h}) => h)
        .slice(0, 3);
    }
    
    // Guardar las habilidades disponibles para esta tecla
    habilidadesDisponibles[tecla.nombre] = habilidades;
    
    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap = '8px';
    grid.style.flexGrow = '1';

    habilidades.forEach((hab, habIdx) => {
      const btnWrapper = document.createElement('div');
      btnWrapper.style.position = 'relative';
      btnWrapper.style.animation = `slideInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${(idx * 0.1) + (habIdx * 0.1)}s backwards`;

      const btn = document.createElement('button');
      btn.textContent = hab.nombre;
      btn.style.padding = '12px 20px';
      btn.style.borderRadius = '12px';
      btn.style.border = `2px solid ${hab.color}`;
      btn.style.background = `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`;
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = '700';
      btn.style.fontSize = '0.95rem';
      btn.style.color = '#fff';
      btn.style.boxShadow = `0 4px 15px ${hab.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`;
      btn.style.pointerEvents = 'auto';
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      btn.style.width = '100%';
      btn.style.textShadow = `0 2px 8px ${hab.color}88`;
      btn.style.whiteSpace = 'nowrap';
      btn.style.textOverflow = 'ellipsis';

      // Efecto de brillo en hover
      const shine = document.createElement('span');
      shine.style.position = 'absolute';
      shine.style.top = '0';
      shine.style.left = '-100%';
      shine.style.width = '100%';
      shine.style.height = '100%';
      shine.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)';
      shine.style.transition = 'left 0.5s';
      shine.style.pointerEvents = 'none';
      btn.appendChild(shine);

      btn.onmouseenter = (e) => {
        btn.style.background = `linear-gradient(135deg, ${hab.color}55 0%, ${hab.color}33 100%)`;
        btn.style.transform = 'translateY(-2px) scale(1.03)';
        btn.style.boxShadow = `0 6px 25px ${hab.color}60, inset 0 1px 0 rgba(255,255,255,0.2)`;
        shine.style.left = '100%';
        
        // Tooltip mejorado
        let tooltip = document.createElement('div');
        tooltip.className = 'mejora-tooltip';
        tooltip.textContent = hab.descripcion || '';
        tooltip.style.position = 'fixed';
        tooltip.style.left = (e.clientX + 20) + 'px';
        tooltip.style.top = (e.clientY - 15) + 'px';
        tooltip.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '12px 16px';
        tooltip.style.borderRadius = '10px';
        tooltip.style.fontSize = '0.9rem';
        tooltip.style.zIndex = '2000';
        tooltip.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
        tooltip.style.maxWidth = '280px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.border = `1px solid ${hab.color}`;
        tooltip.style.animation = 'fadeIn 0.2s ease-out';
        document.body.appendChild(tooltip);
        btn._tooltip = tooltip;
      };
      
      btn.onmouseleave = () => {
        btn.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)';
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.boxShadow = `0 4px 15px ${hab.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`;
        shine.style.left = '-100%';
        if (btn._tooltip) {
          btn._tooltip.remove();
          btn._tooltip = null;
        }
      };
      
      btn.onclick = () => {
        // Oculta todos los botones menos el seleccionado
        Array.from(grid.children).forEach(child => {
          const childBtn = child.querySelector('button');
          if (childBtn !== btn) {
            child.style.opacity = '0.3';
            child.style.transform = 'scale(0.95)';
            childBtn.style.pointerEvents = 'none';
          } else {
            childBtn.style.background = `linear-gradient(135deg, ${hab.color} 0%, ${hab.color}dd 100%)`;
            childBtn.style.color = '#fff';
            childBtn.style.transform = 'translateY(-2px) scale(1.05)';
            childBtn.style.boxShadow = `0 8px 30px ${hab.color}80, inset 0 2px 4px rgba(255,255,255,0.3)`;
            childBtn.style.animation = 'pulseGlow 1.5s infinite';
            
            // Efecto de confeti
            for (let i = 0; i < 15; i++) {
              const particle = document.createElement('div');
              particle.style.position = 'fixed';
              particle.style.width = '5px';
              particle.style.height = '5px';
              particle.style.background = hab.color;
              particle.style.borderRadius = '50%';
              particle.style.pointerEvents = 'none';
              particle.style.zIndex = '1001';
              const rect = btn.getBoundingClientRect();
              particle.style.left = (rect.left + rect.width / 2) + 'px';
              particle.style.top = (rect.top + rect.height / 2) + 'px';
              document.body.appendChild(particle);
              
              const angle = (Math.PI * 2 * i) / 15;
              const velocity = 2 + Math.random() * 2;
              const vx = Math.cos(angle) * velocity;
              const vy = Math.sin(angle) * velocity;
              
              let posX = 0, posY = 0;
              let opacity = 1;
              const animate = () => {
                posX += vx;
                posY += vy;
                opacity -= 0.02;
                particle.style.transform = `translate(${posX}px, ${posY}px)`;
                particle.style.opacity = opacity;
                if (opacity > 0) {
                  requestAnimationFrame(animate);
                } else {
                  particle.remove();
                }
              };
              requestAnimationFrame(animate);
            }
          }
        });
        
        socket.emit('selectUpgrade', { roomId, mejoraId: hab.id });
        // Set local variable for immediate use
        if (tecla.nombre === 'Click Izquierdo') {
          mejoraSeleccionada = hab;
          clickSeleccionado = true;
        } else if (tecla.nombre === 'Q') {
          mejoraQSeleccionada = hab;
          qSeleccionado = true;
        } else if (tecla.nombre === 'E') {
          eSeleccionado = true;
        } else if (tecla.nombre === 'Espacio') {
          espacioSeleccionado = true;
        }
        // For E and Espacio, they will be added to mejorasJugador via playerUpgraded event
      };
      
      btnWrapper.appendChild(btn);
      grid.appendChild(btnWrapper);
    });
    
    section.appendChild(grid);
    mainGrid.appendChild(section);
  });

  hud.appendChild(mainGrid);

  // Temporizador con diseño mejorado
  const timerContainer = document.createElement('div');
  timerContainer.style.marginTop = '20px';
  timerContainer.style.padding = '12px 24px';
  timerContainer.style.background = 'linear-gradient(135deg, rgba(46, 125, 50, 0.2), rgba(27, 94, 32, 0.2))';
  timerContainer.style.borderRadius = '12px';
  timerContainer.style.border = '2px solid rgba(76, 175, 80, 0.5)';
  timerContainer.style.flexShrink = '0';
  
  const timerDiv = document.createElement('div');
  timerDiv.style.fontSize = '1.4rem';
  timerDiv.style.fontWeight = '900';
  timerDiv.style.background = 'linear-gradient(135deg, #4caf50, #81c784)';
  timerDiv.style.WebkitBackgroundClip = 'text';
  timerDiv.style.WebkitTextFillColor = 'transparent';
  timerDiv.style.backgroundClip = 'text';
  timerDiv.textContent = '⏱️ Tiempo restante: 20s';
  timerContainer.appendChild(timerDiv);
  hud.appendChild(timerContainer);

  let timeLeft = 20;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `⏱️ Tiempo restante: ${timeLeft}s`;
    
    // Cambiar color cuando queda poco tiempo
    if (timeLeft <= 5) {
      timerDiv.style.background = 'linear-gradient(135deg, #f44336, #ff5722)';
      timerDiv.style.WebkitBackgroundClip = 'text';
      timerDiv.style.backgroundClip = 'text';
      timerContainer.style.background = 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2))';
      timerContainer.style.border = '2px solid rgba(244, 67, 54, 0.5)';
      timerContainer.style.animation = 'pulseGlow 0.5s infinite';
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      
      // Asignar habilidades aleatorias a las que no fueron seleccionadas
      if (!clickSeleccionado && habilidadesDisponibles['Click Izquierdo'].length > 0) {
        const habAleatoria = habilidadesDisponibles['Click Izquierdo'][Math.floor(Math.random() * habilidadesDisponibles['Click Izquierdo'].length)];
        mejoraSeleccionada = habAleatoria;
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      if (!qSeleccionado && habilidadesDisponibles['Q'].length > 0) {
        const habAleatoria = habilidadesDisponibles['Q'][Math.floor(Math.random() * habilidadesDisponibles['Q'].length)];
        mejoraQSeleccionada = habAleatoria;
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      if (!eSeleccionado && habilidadesDisponibles['E'].length > 0) {
        const habAleatoria = habilidadesDisponibles['E'][Math.floor(Math.random() * habilidadesDisponibles['E'].length)];
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      if (!espacioSeleccionado && habilidadesDisponibles['Espacio'].length > 0) {
        const habAleatoria = habilidadesDisponibles['Espacio'][Math.floor(Math.random() * habilidadesDisponibles['Espacio'].length)];
        socket.emit('selectUpgrade', { roomId, mejoraId: habAleatoria.id });
      }
      
      ocultarHUDSeleccionHabilidades();
      socket.emit('startBattle', { roomId });
    }
  }, 1000);

  document.body.appendChild(hud);
}

function ocultarHUDSeleccionHabilidades() {
  hudVisible = false;
  
  // Eliminar todos los tooltips inmediatamente
  document.querySelectorAll('.mejora-tooltip').forEach(t => t.remove());
  
  const hud = document.getElementById('habilidadesHUD');
  const overlay = document.getElementById('habilidadesOverlay');
  
  if (hud) {
    hud.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => hud.remove(), 300);
  }
  
  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => overlay.remove(), 300);
  }
}

// 🐛 FUNCIÓN DE DEBUG - Llamar desde la consola: debugMuros()
window.debugMuros = function() {
  console.log('═══════════════════════════════════════');
  console.log('🐛 DEBUG DE MUROS - ANÁLISIS COMPLETO');
  console.log('═══════════════════════════════════════');
  
  if (!window.murosDePiedra) {
    console.error('❌ window.murosDePiedra NO EXISTE');
    return;
  }
  
  const muros = window.murosDePiedra;
  console.log('📊 TOTAL DE MUROS:', muros.length);
  console.log('');
  
  // Análisis por tipo
  const porShape = {
    rect: muros.filter(m => m.shape === 'rect'),
    circle: muros.filter(m => m.shape === 'circle'),
    triangle: muros.filter(m => m.shape === 'triangle'),
    sinShape: muros.filter(m => !m.shape)
  };
  
  console.log('📐 POR SHAPE:');
  console.log('  - rect:', porShape.rect.length);
  console.log('  - circle:', porShape.circle.length);
  console.log('  - triangle:', porShape.triangle.length);
  console.log('  - sin shape:', porShape.sinShape.length);
  console.log('');
  
  // Análisis de colisión
  const conColision = muros.filter(m => m.colision !== false);
  const sinColision = muros.filter(m => m.colision === false);
  console.log('💥 COLISIÓN:');
  console.log('  - Con colisión activa:', conColision.length);
  console.log('  - Sin colisión:', sinColision.length);
  console.log('');
  
  // Análisis de propiedades
  const conRadius = muros.filter(m => m.radius);
  const conWidthHeight = muros.filter(m => m.width && m.height);
  const murosMapa = muros.filter(m => m.muroMapa === true);
  console.log('🔍 PROPIEDADES:');
  console.log('  - Con radius:', conRadius.length);
  console.log('  - Con width/height:', conWidthHeight.length);
  console.log('  - Muros permanentes del mapa:', murosMapa.length);
  console.log('');
  
  // Mostrar primeros 5 muros en detalle
  console.log('📋 DETALLE DE PRIMEROS 5 MUROS:');
  muros.slice(0, 5).forEach((m, i) => {
    console.log(`  Muro #${i}:`, {
      shape: m.shape || 'sin shape',
      width: m.width,
      height: m.height,
      radius: m.radius,
      colision: m.colision,
      muroMapa: m.muroMapa,
      posición: `(${Math.round(m.x)}, ${Math.round(m.y)})`,
      ángulo: m.angle ? (m.angle * 180 / Math.PI).toFixed(1) + '°' : '0°'
    });
  });
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('Para ver el jugador: debugJugador()');
  console.log('═══════════════════════════════════════');
};

// 🐛 FUNCIÓN DE DEBUG - Posición del jugador
window.debugJugador = function() {
  const localPlayer = players.find(p => p.nick === user.nick);
  if (!localPlayer) {
    console.error('❌ No se encontró el jugador local');
    return;
  }
  
  console.log('═══════════════════════════════════════');
  console.log('🐛 DEBUG DEL JUGADOR');
  console.log('═══════════════════════════════════════');
  console.log('Posición:', `(${Math.round(localPlayer.x)}, ${Math.round(localPlayer.y)})`);
  console.log('Nick:', localPlayer.nick);
  console.log('Velocidad:', localPlayer.speed || DEFAULT_SPEED);
  
  // Verificar muros cercanos
  if (window.murosDePiedra) {
    const murosCercanos = window.murosDePiedra.filter(m => {
      const dx = m.x - localPlayer.x;
      const dy = m.y - localPlayer.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      return dist < 200; // Muros a menos de 200px
    });
    
    console.log('');
    console.log('🎯 MUROS CERCANOS (< 200px):', murosCercanos.length);
    murosCercanos.forEach((m, i) => {
      const dx = m.x - localPlayer.x;
      const dy = m.y - localPlayer.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      console.log(`  Muro #${i}:`, {
        distancia: Math.round(dist) + 'px',
        shape: m.shape || 'sin shape',
        colision: m.colision,
        posición: `(${Math.round(m.x)}, ${Math.round(m.y)})`
      });
    });
  }
  
  console.log('═══════════════════════════════════════');
};
