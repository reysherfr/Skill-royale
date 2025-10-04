// ============================================
// SISTEMA DE TIENDA
// ============================================

// Determine server URL based on environment
// SERVER_URL se carga desde config.js

// ============================================
// DEFINICIÓN DE ITEMS (SOLO ESTÉTICOS)
// ============================================
const ITEM_STATS = {
  // Colores (Personajes)
  'color-blue': {
    name: 'Color Azul',
    category: 'colors',
    color: '#4A90E2'
  },
  'color-red': {
    name: 'Color Rojo',
    category: 'colors',
    color: '#E74C3C'
  },
  'color-green': {
    name: 'Color Verde',
    category: 'colors',
    color: '#2ECC71'
  },
  // Rostros (caras)
  'face-enojado': {
    name: 'Enojado',
    category: 'faces',
    image: 'caras/enojado.png',
    price: 220
  },
  // Sombreros (futuro)
  // 'hat-crown': {
  //   name: 'Corona Real',
  //   category: 'hats'
  // },
  // Armas (futuro)
  // 'weapon-sword': {
  //   name: 'Espada Legendaria',
  //   category: 'weapons'
  // },
  // Tumbas (futuro)
  // 'tomb-golden': {
  //   name: 'Tumba Dorada',
  //   category: 'tombs'
  // }
};

// Items son solo estéticos, no afectan estadísticas del jugador

// ============================================
// OBTENER COLOR DEL ITEM EQUIPADO
// ============================================
function getEquippedColor(equippedItems) {
  const colorItemId = equippedItems.color;
  if (colorItemId && ITEM_STATS[colorItemId]) {
    return ITEM_STATS[colorItemId].color;
  }
  return '#f4c2a0'; // Color por defecto
}

// Obtener referencia al usuario desde localStorage
function getUser() {
  const user = JSON.parse(localStorage.getItem('batlesd_user'));
  
  // Migración: convertir colores antiguos (hex) a nuevos IDs
  if (user && user.equipped && user.equipped.color) {
    const colorHexToId = {
      '#4A90E2': 'color-blue',
      '#E74C3C': 'color-red',
      '#2ECC71': 'color-green'
    };
    
    // Si el color está en formato hex antiguo, convertirlo a ID
    if (colorHexToId[user.equipped.color]) {
      user.equipped.color = colorHexToId[user.equipped.color];
      saveUser(user); // Guardar la migración
    }
  }
  
  return user;
}

// Guardar usuario en localStorage
function saveUser(user) {
  localStorage.setItem('batlesd_user', JSON.stringify(user));
}

// Inicializar tienda
function initShop() {
  const user = getUser();
  // Estado temporal para previsualización
  let previewState = {
    color: user?.equipped?.color,
    face: user?.equipped?.face,
    hat: user?.equipped?.hat,
    weapon: user?.equipped?.weapon,
    tomb: user?.equipped?.tomb
  };
  if (!user) {
    console.error('No hay usuario logueado');
    return;
  }

  // Referencias a elementos del DOM
  const shopBtn = document.getElementById('shopBtn');
  const shopModalOverlay = document.getElementById('shopModalOverlay');
  const closeShopModal = document.getElementById('closeShopModal');
  const shopTabs = document.querySelectorAll('.shop-tab');
  const shopItemsContainers = document.querySelectorAll('.shop-items');
  const characterPreviewCanvas = document.getElementById('characterPreviewCanvas');

  // Inicializar oro del jugador
  if (user.gold === undefined) {
    user.gold = 500; // Por ahora, empiezan con 500 oro para pruebas
    saveUser(user);
  }

  // Actualizar oro en UI
  const playerGoldElement = document.getElementById('playerGold');
  if (playerGoldElement) {
    playerGoldElement.textContent = user.gold || 0;
  }

  // Inicializar inventario del jugador (items comprados)
  if (!user.inventory) {
    user.inventory = {
      colors: [],
      hats: [],
      weapons: [],
      tombs: []
    };
    saveUser(user);
  }

  // Inicializar items equipados
  if (!user.equipped) {
    user.equipped = {
      color: null,
      hat: null,
      weapon: null,
      tomb: null
    };
    saveUser(user);
  }

  // Event Listeners
  setupEventListeners(shopBtn, shopModalOverlay, closeShopModal, shopTabs, shopItemsContainers);
}

// Configurar event listeners
function setupEventListeners(shopBtn, shopModalOverlay, closeShopModal, shopTabs, shopItemsContainers) {
  // Abrir modal de tienda
  if (shopBtn) {
    shopBtn.addEventListener('click', () => {
      if (shopModalOverlay) {
        shopModalOverlay.style.display = 'flex';
        // Forzar reflow para que la animación funcione
        shopModalOverlay.offsetHeight;
        shopModalOverlay.classList.add('active');
        updateShopPreview();
        updateShopItems();
      }
    });
  }

  // Cerrar modal de tienda
  if (closeShopModal) {
    closeShopModal.addEventListener('click', () => {
      shopModalOverlay.classList.remove('active');
      setTimeout(() => {
        shopModalOverlay.style.display = 'none';
      }, 300); // Esperar a que termine la animación
    });
  }

  if (shopModalOverlay) {
    shopModalOverlay.addEventListener('click', (e) => {
      if (e.target === shopModalOverlay) {
        shopModalOverlay.classList.remove('active');
        setTimeout(() => {
          shopModalOverlay.style.display = 'none';
        }, 300);
      }
    });
  }

  // Cambiar entre tabs de categorías
  if (shopTabs) {
    shopTabs.forEach(tab => {
      // Agregar sonido de hover a las tabs
      tab.addEventListener('mouseenter', () => {
        if (typeof soundManager !== 'undefined') {
          soundManager.playHover();
        }
      });
      
      tab.addEventListener('click', () => {
        // Sonido de click en tab
        if (typeof soundManager !== 'undefined') {
          soundManager.playClick();
        }
        
        const category = tab.dataset.category;
        
        // Activar tab
        shopTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Mostrar items de la categoría
        shopItemsContainers.forEach(container => {
          if (container.dataset.category === category) {
            container.classList.add('active');
          } else {
            container.classList.remove('active');
          }
        });
      });
    });
  }
  
  // Agregar sonidos de hover a todos los items de la tienda
  const shopItems = document.querySelectorAll('.shop-item');
  shopItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (typeof soundManager !== 'undefined') {
        soundManager.playHover();
      }
    });
  });
}

// Actualizar preview del personaje
function updateShopPreview() {
  const user = getUser();
  if (!user) return;
  // Usar previewState si existe
  const preview = window.previewState || user.equipped;
  
  const characterPreviewCanvas = document.getElementById('characterPreviewCanvas');
  if (!characterPreviewCanvas) return;
  
  const ctx = characterPreviewCanvas.getContext('2d');
  ctx.clearRect(0, 0, 200, 200);
  
  // Obtener color del item equipado usando la nueva función
  const currentColor = getEquippedColor(preview);
  
  ctx.beginPath();
  ctx.arc(100, 100, 40, 0, 2 * Math.PI);
  ctx.fillStyle = currentColor;
  ctx.shadowColor = '#0008';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Borde blanco
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  
  // Dibujar rostro si está equipado
  if (preview && preview.face) {
    const faceItemId = preview.face;
    const faceItem = ITEM_STATS[faceItemId];
    if (faceItem && faceItem.image) {
      const faceImg = new Image();
      faceImg.onload = function() {
        // Dibujar la imagen del rostro centrada en el círculo
        const imgSize = 100; // Tamaño de la imagen del rostro
        ctx.drawImage(faceImg, 100 - imgSize/2, 114 - imgSize/2, imgSize, imgSize);
      };
      faceImg.src = faceItem.image;
    }
  }
  
  // Actualizar texto de preview
  const previewColorName = document.getElementById('previewColorName');
  const previewFaceName = document.getElementById('previewFaceName');
  const previewHatName = document.getElementById('previewHatName');
  const previewWeaponName = document.getElementById('previewWeaponName');
  const previewTombName = document.getElementById('previewTombName');
  
  if (previewColorName) {
    const colorItemId = preview.color;
    const colorName = colorItemId && ITEM_STATS[colorItemId] ? ITEM_STATS[colorItemId].name : 'Por defecto';
    previewColorName.textContent = colorName;
  }
  if (previewFaceName) {
    const faceItemId = preview.face;
    const faceName = faceItemId && ITEM_STATS[faceItemId] ? ITEM_STATS[faceItemId].name : 'Ninguno';
    previewFaceName.textContent = faceName;
  }
  if (previewHatName) previewHatName.textContent = preview.hat || 'Ninguno';
  if (previewWeaponName) previewWeaponName.textContent = preview.weapon || 'Ninguna';
  if (previewTombName) previewTombName.textContent = preview.tomb || 'Por defecto';
}

// Obtener nombre del color
function getColorName(colorCode) {
  const colors = {
    '#f4c2a0': 'Por defecto',
    '#4A90E2': 'Azul',
    '#E74C3C': 'Rojo',
    '#2ECC71': 'Verde'
  };
  return colors[colorCode] || 'Personalizado';
}

// Actualizar estado de los items en la tienda
function updateShopItems() {
  // Permitir previsualización al hacer click en cualquier item
  const shopItems = document.querySelectorAll('.shop-item');
  shopItems.forEach(item => {
    item.onclick = () => {
      const itemId = item.dataset.itemId;
      if (!itemId) return;
      // Detectar tipo de item y actualizar previewState
      if (!window.previewState) window.previewState = { ...getUser().equipped };
      if (itemId.startsWith('color-')) window.previewState.color = itemId;
      if (itemId.startsWith('face-')) window.previewState.face = itemId;
      if (itemId.startsWith('hat-')) window.previewState.hat = itemId;
      if (itemId.startsWith('weapon-')) window.previewState.weapon = itemId;
      if (itemId.startsWith('tomb-')) window.previewState.tomb = itemId;
      updateShopPreview();
    };
  });

  // Al cerrar la tienda, restaurar previewState
  const shopModalOverlay = document.getElementById('shopModalOverlay');
  if (shopModalOverlay) {
    shopModalOverlay.addEventListener('transitionend', () => {
      if (shopModalOverlay.style.display === 'none') {
        window.previewState = null;
        updateShopPreview();
      }
    });
  }
  const user = getUser();
  if (!user) return;
  
  const itemButtons = document.querySelectorAll('.item-buy-btn');
  
  itemButtons.forEach(btn => {
    const item = btn.closest('.shop-item');
    if (!item) return;
    
    const itemId = item.dataset.itemId;
    const price = parseInt(item.dataset.price);
    
    // Verificar si el item ya fue comprado
    const isOwned = isItemOwned(itemId, user);
    const isEquipped = isItemEquipped(itemId, user);
    
    if (isEquipped) {
      btn.textContent = 'Desequipar';
      btn.classList.add('equipped');
      btn.disabled = false;
      item.classList.add('equipped');
      
      // Al hacer clic, desequipar el item
      btn.onclick = () => {
        if (typeof soundManager !== 'undefined') {
          soundManager.playClick();
        }
        unequipItem(itemId);
      };
    } else if (isOwned) {
      btn.textContent = 'Equipar';
      btn.classList.add('owned');
      btn.disabled = false;
      item.classList.add('owned');
      
      // Al hacer clic, equipar el item
      btn.onclick = () => {
        if (typeof soundManager !== 'undefined') {
          soundManager.playClick();
        }
        equipItem(itemId);
      };
    } else {
      btn.textContent = 'Comprar';
      btn.classList.remove('owned', 'equipped');
      btn.disabled = user.gold < price;
      item.classList.remove('owned', 'equipped');
      
      // Al hacer clic, comprar el item
      btn.onclick = () => {
        if (typeof soundManager !== 'undefined') {
          soundManager.playClick();
        }
        buyItem(itemId, price);
      };
    }
  });
}

// Verificar si el item está comprado
function isItemOwned(itemId, user) {
  if (!user || !user.inventory) return false;
  if (itemId.startsWith('color-')) {
    return user.inventory.colors && user.inventory.colors.includes(itemId);
  }
  if (itemId.startsWith('face-')) {
    return user.inventory.faces && user.inventory.faces.includes(itemId);
  }
  if (itemId.startsWith('hat-')) {
    return user.inventory.hats && user.inventory.hats.includes(itemId);
  }
  if (itemId.startsWith('weapon-')) {
    return user.inventory.weapons && user.inventory.weapons.includes(itemId);
  }
  if (itemId.startsWith('tomb-')) {
    return user.inventory.tombs && user.inventory.tombs.includes(itemId);
  }
  return false;
}

// Verificar si el item está equipado
function isItemEquipped(itemId, user) {
  if (!user || !user.equipped) return false;
  if (itemId.startsWith('color-')) {
    return user.equipped.color === itemId; // Comparar con ID, no con color
  }
  if (itemId.startsWith('face-')) {
    return user.equipped.face === itemId;
  }
  if (itemId.startsWith('hat-')) {
    return user.equipped.hat === itemId;
  }
  if (itemId.startsWith('weapon-')) {
    return user.equipped.weapon === itemId;
  }
  if (itemId.startsWith('tomb-')) {
    return user.equipped.tomb === itemId;
  }
  return false;
}

// Obtener código de color
function getColorCode(itemId) {
  const colors = {
    'color-blue': '#4A90E2',
    'color-red': '#E74C3C',
    'color-green': '#2ECC71'
  };
  return colors[itemId];
}

// Comprar item
async function buyItem(itemId, price) {
  const user = getUser();
  if (!user) return;
  
  if (user.gold < price) {
    if (typeof soundManager !== 'undefined') {
      soundManager.playError(); // Sonido de error - no tiene oro suficiente
    }
    alert('¡No tienes suficiente oro!');
    return;
  }
  
  // Asegurar que el inventario existe y tiene todas las propiedades
  if (!user.inventory) {
    user.inventory = {
      colors: [],
      faces: [],
      hats: [],
      weapons: [],
      tombs: []
    };
  }
  if (!user.inventory.colors) user.inventory.colors = [];
  if (!user.inventory.faces) user.inventory.faces = [];
  if (!user.inventory.hats) user.inventory.hats = [];
  if (!user.inventory.weapons) user.inventory.weapons = [];
  if (!user.inventory.tombs) user.inventory.tombs = [];
  
  // Descontar oro
  user.gold -= price;
  
  // Agregar item al inventario según categoría
  if (itemId.startsWith('color-')) {
    user.inventory.colors.push(itemId);
  } else if (itemId.startsWith('face-')) {
    user.inventory.faces.push(itemId);
  } else if (itemId.startsWith('hat-')) {
    user.inventory.hats.push(itemId);
  } else if (itemId.startsWith('weapon-')) {
    user.inventory.weapons.push(itemId);
  } else if (itemId.startsWith('tomb-')) {
    user.inventory.tombs.push(itemId);
  }
  
  // Guardar en localStorage
  saveUser(user);
  
  // Actualizar UI
  const playerGoldElement = document.getElementById('playerGold');
  if (playerGoldElement) {
    playerGoldElement.textContent = user.gold;
  }
  updateShopItems();
  
  // Sincronizar con la base de datos
  await syncInventoryWithBackend(user);
  
  // Actualizar oro en el backend también
  try {
    await fetch(`${SERVER_URL}/updateGold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick: user.nick, gold: user.gold })
    });
  } catch (error) {
    console.error('Error al actualizar oro:', error);
  }
  
  // Sonido de éxito al comprar
  if (typeof soundManager !== 'undefined') {
    soundManager.playSuccess();
  }
  
  alert('¡Compra exitosa!');
}

// Equipar item
function equipItem(itemId) {
  const user = getUser();
  if (!user) return;
  
  // Guardar el ID del item equipado en la categoría correspondiente
  if (itemId.startsWith('color-')) {
    user.equipped.color = itemId; // Guardar ID completo, no solo el color
  } else if (itemId.startsWith('face-')) {
    user.equipped.face = itemId;
  } else if (itemId.startsWith('hat-')) {
    user.equipped.hat = itemId;
  } else if (itemId.startsWith('weapon-')) {
    user.equipped.weapon = itemId;
  } else if (itemId.startsWith('tomb-')) {
    user.equipped.tomb = itemId;
  }
  
  // Guardar en localStorage
  saveUser(user);
  
  // Sonido de equipar item
  if (typeof soundManager !== 'undefined') {
    soundManager.playCustom(880, 0.15, 'triangle', 0.3); // Sonido agradable de equipar
  }
  
  // Actualizar preview y botones
  updateShopPreview();
  updateShopItems();
  
  // Sincronizar con la base de datos
  syncInventoryWithBackend(user);
}

// Desequipar item
function unequipItem(itemId) {
  const user = getUser();
  if (!user) return;
  
  if (itemId.startsWith('color-')) {
    user.equipped.color = null;
  } else if (itemId.startsWith('face-')) {
    user.equipped.face = null;
  } else if (itemId.startsWith('hat-')) {
    user.equipped.hat = null;
  } else if (itemId.startsWith('weapon-')) {
    user.equipped.weapon = null;
  } else if (itemId.startsWith('tomb-')) {
    user.equipped.tomb = null;
  }
  
  // Guardar en localStorage
  saveUser(user);
  
  // Sonido de desequipar item
  if (typeof soundManager !== 'undefined') {
    soundManager.playCustom(440, 0.1, 'sine', 0.2); // Sonido más bajo para desequipar
  }
  
  // Actualizar preview y botones
  updateShopPreview();
  updateShopItems();
  
  // Sincronizar con la base de datos
  syncInventoryWithBackend(user);
}

// ============================================
// SINCRONIZAR CON BACKEND
// ============================================
async function syncInventoryWithBackend(user) {
  if (!user || !user.nick) return;
  
  try {
    const response = await fetch(`${SERVER_URL}/saveInventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nick: user.nick,
        inventory: user.inventory || {},
        equipped: user.equipped || {}
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      console.error('Error al sincronizar inventory:', data.error);
    }
  } catch (error) {
    console.error('Error al sincronizar con el backend:', error);
  }
}

// Actualizar oro en la UI (función pública para usar desde menu.js)
function updateGoldDisplay() {
  const user = getUser();
  if (!user) return;
  
  const playerGoldElement = document.getElementById('playerGold');
  if (playerGoldElement) {
    playerGoldElement.textContent = user.gold || 0;
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShop);
} else {
  initShop();
}

// Exportar funciones públicas para uso externo
window.ShopSystem = {
  updateGoldDisplay,
  initShop,
  getUser,
  saveUser,
  // Items son solo estéticos - no hay stats
  getEquippedColor,        // Nueva función para obtener color equipado
  ITEM_STATS               // Exportar constantes de items
};
