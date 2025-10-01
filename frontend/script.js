// Determine server URL based on environment
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'http://138.68.250.124:3000';

// ============================================
// MANEJO DE PESTAÑAS (LOGIN / REGISTRO)
// ============================================
const authTabs = document.querySelectorAll('.auth-tab');
const loginContainer = document.getElementById('loginContainer');
const registerContainer = document.getElementById('registerContainer');

authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remover clase active de todas las pestañas
    authTabs.forEach(t => t.classList.remove('active'));
    // Agregar clase active a la pestaña clickeada
    tab.classList.add('active');
    
    // Mostrar el contenedor correspondiente
    const tabName = tab.getAttribute('data-tab');
    if (tabName === 'login') {
      loginContainer.classList.add('active');
      registerContainer.classList.remove('active');
    } else {
      registerContainer.classList.add('active');
      loginContainer.classList.remove('active');
    }
  });
});

// ============================================
// MOSTRAR/OCULTAR CONTRASEÑA
// ============================================
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

togglePasswordButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeOpen.style.display = 'none';
      eyeClosed.style.display = 'block';
    } else {
      passwordInput.type = 'password';
      eyeOpen.style.display = 'block';
      eyeClosed.style.display = 'none';
    }
  });
});

// ============================================
// FORMULARIO DE REGISTRO
// ============================================
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nick = document.getElementById('registerNick').value;
  const password = document.getElementById('registerPassword').value;
  const msg = document.getElementById('registerMsg');
  msg.textContent = '';
  msg.className = 'auth-msg';
  
  try {
    const res = await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, password })
    });
    const data = await res.json();
    
    if (data.success) {
      msg.className = 'auth-msg success';
      msg.textContent = '✓ ¡Registro exitoso! Ahora puedes iniciar sesión';
      document.getElementById('registerForm').reset();
      
      // Cambiar a pestaña de login después de 1.5 segundos
      setTimeout(() => {
        document.querySelector('[data-tab="login"]').click();
        msg.textContent = '';
      }, 1500);
    } else {
      msg.className = 'auth-msg error';
      msg.textContent = data.error || '✗ Error en el registro';
    }
  } catch (err) {
    msg.className = 'auth-msg error';
    msg.textContent = '✗ No se pudo conectar al servidor';
  }
});

// ============================================
// FORMULARIO DE LOGIN
// ============================================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nick = document.getElementById('loginNick').value;
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';
  msg.className = 'auth-msg';
  
  try {
    const res = await fetch(`${SERVER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, password })
    });
    const data = await res.json();
    
    if (data.success) {
      msg.className = 'auth-msg success';
      msg.textContent = '✓ ¡Bienvenido de nuevo!';
      
      // Guardar usuario en localStorage
      localStorage.setItem('batlesd_user', JSON.stringify(data.user));
      
      // Redirigir al menú principal después de 0.5 segundos
      setTimeout(() => {
        window.location.href = 'menu.html';
      }, 500);
    } else {
      msg.className = 'auth-msg error';
      msg.textContent = data.error || '✗ Credenciales incorrectas';
    }
  } catch (err) {
    msg.className = 'auth-msg error';
    msg.textContent = '✗ No se pudo conectar al servidor';
  }
});
