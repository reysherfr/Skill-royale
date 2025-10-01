// ============================================
// SISTEMA DE TIENDA
// ============================================

// ============================================
// DEFINICIÓN DE ESTADÍSTICAS DE ITEMS
// ============================================
const ITEM_STATS = {
  // Colores (Personajes)
  'color-blue': {
    name: 'Color Azul',
    category: 'colors',
    color: '#4A90E2',
    stats: { health: 5, damage: 0, speed: 0 }
  },
  'color-red': {
    name: 'Color Rojo',
    category: 'colors',
    color: '#E74C3C',
    stats: { health: 0, damage: 1, speed: 0 }
  },
  'color-green': {
    name: 'Color Verde',
    category: 'colors',
    color: '#2ECC71',
    stats: { health: 0, damage: 0, speed: 0.3 }
  },
  // Sombreros (futuro)
  // 'hat-crown': {
  //   name: 'Corona Real',
  //   category: 'hats',
  //   stats: { health: 30, damage: 0, speed: 0 }
  // },
  // Armas (futuro)
  // 'weapon-sword': {
  //   name: 'Espada Legendaria',
  //   category: 'weapons',
  //   stats: { health: 0, damage: 5, speed: 0 }
  // },
  // Tumbas (futuro)
  // 'tomb-golden': {
  //   name: 'Tumba Dorada',
  //   category: 'tombs',
  //   stats: { health: 10, damage: 2, speed: 0.1 }
  // }
};

// ============================================
// CALCULAR ESTADÍSTICAS TOTALES DEL JUGADOR
// ============================================
function calculatePlayerStats(equippedItems) {
  const baseStats = {
    health: 200,      // Vida base
    damage: 0,        // Daño base
    speed: 5,         // Velocidad base (DEFAULT_SPEED)
    maxHealth: 200    // Vida máxima base
  };

  let totalStats = { ...baseStats };

  // Sumar estadísticas de cada item equipado
  Object.values(equippedItems).forEach(itemId => {
    if (itemId && ITEM_STATS[itemId]) {
      const itemStats = ITEM_STATS[itemId].stats;
      totalStats.health += itemStats.health || 0;
      totalStats.damage += itemStats.damage || 0;
      totalStats.speed += itemStats.speed || 0;
    }
  });

  // Actualizar maxHealth basado en la vida total
  totalStats.maxHealth = totalStats.health;

  return totalStats;
}

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
      tab.addEventListener('click', () => {
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
}

// Actualizar preview del personaje
function updateShopPreview() {
  const user = getUser();
  if (!user) return;
  
  const characterPreviewCanvas = document.getElementById('characterPreviewCanvas');
  if (!characterPreviewCanvas) return;
  
  const ctx = characterPreviewCanvas.getContext('2d');
  ctx.clearRect(0, 0, 200, 200);
  
  // Obtener color del item equipado usando la nueva función
  const currentColor = getEquippedColor(user.equipped);
  
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
  
  // Actualizar texto de preview con stats calculadas
  const stats = calculatePlayerStats(user.equipped);
  const previewColorName = document.getElementById('previewColorName');
  const previewHatName = document.getElementById('previewHatName');
  const previewWeaponName = document.getElementById('previewWeaponName');
  const previewTombName = document.getElementById('previewTombName');
  
  if (previewColorName) {
    const colorItemId = user.equipped.color;
    const colorName = colorItemId && ITEM_STATS[colorItemId] ? ITEM_STATS[colorItemId].name : 'Por defecto';
    previewColorName.textContent = colorName;
  }
  if (previewHatName) previewHatName.textContent = user.equipped.hat || 'Ninguno';
  if (previewWeaponName) previewWeaponName.textContent = user.equipped.weapon || 'Ninguna';
  if (previewTombName) previewTombName.textContent = user.equipped.tomb || 'Por defecto';
  
  // Mostrar stats totales en consola (puedes agregarlo a la UI después)
  console.log('Stats Totales:', stats);
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
        unequipItem(itemId);
      };
    } else if (isOwned) {
      btn.textContent = 'Equipar';
      btn.classList.add('owned');
      btn.disabled = false;
      item.classList.add('owned');
      
      // Al hacer clic, equipar el item
      btn.onclick = () => {
        equipItem(itemId);
      };
    } else {
      btn.textContent = 'Comprar';
      btn.classList.remove('owned', 'equipped');
      btn.disabled = user.gold < price;
      item.classList.remove('owned', 'equipped');
      
      // Al hacer clic, comprar el item
      btn.onclick = () => {
        buyItem(itemId, price);
      };
    }
  });
}

// Verificar si el item está comprado
function isItemOwned(itemId, user) {
  if (!user || !user.inventory) return false;
  if (itemId.startsWith('color-')) {
    return user.inventory.colors.includes(itemId);
  }
  if (itemId.startsWith('hat-')) {
    return user.inventory.hats.includes(itemId);
  }
  if (itemId.startsWith('weapon-')) {
    return user.inventory.weapons.includes(itemId);
  }
  if (itemId.startsWith('tomb-')) {
    return user.inventory.tombs.includes(itemId);
  }
  return false;
}

// Verificar si el item está equipado
function isItemEquipped(itemId, user) {
  if (!user || !user.equipped) return false;
  if (itemId.startsWith('color-')) {
    return user.equipped.color === itemId; // Comparar con ID, no con color
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
    alert('¡No tienes suficiente oro!');
    return;
  }
  
  // Descontar oro
  user.gold -= price;
  
  // Agregar item al inventario según categoría
  if (itemId.startsWith('color-')) {
    user.inventory.colors.push(itemId);
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
    await fetch('http://localhost:3000/updateGold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick: user.nick, gold: user.gold })
    });
  } catch (error) {
    console.error('Error al actualizar oro:', error);
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
  } else if (itemId.startsWith('hat-')) {
    user.equipped.hat = itemId;
  } else if (itemId.startsWith('weapon-')) {
    user.equipped.weapon = itemId;
  } else if (itemId.startsWith('tomb-')) {
    user.equipped.tomb = itemId;
  }
  
  // Guardar en localStorage
  saveUser(user);
  
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
  } else if (itemId.startsWith('hat-')) {
    user.equipped.hat = null;
  } else if (itemId.startsWith('weapon-')) {
    user.equipped.weapon = null;
  } else if (itemId.startsWith('tomb-')) {
    user.equipped.tomb = null;
  }
  
  // Guardar en localStorage
  saveUser(user);
  
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
    const response = await fetch('http://localhost:3000/saveInventory', {
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
  calculatePlayerStats,    // Nueva función para calcular stats totales
  getEquippedColor,        // Nueva función para obtener color equipado
  ITEM_STATS               // Exportar constantes de items
};
