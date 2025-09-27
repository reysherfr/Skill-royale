document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nick = document.getElementById('registerNick').value;
  const password = document.getElementById('registerPassword').value;
  const msg = document.getElementById('registerMsg');
  msg.textContent = '';
  try {
  const res = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, password })
    });
    const data = await res.json();
    if (data.success) {
      msg.style.color = '#388e3c';
      msg.textContent = '¡Registro exitoso!';
      document.getElementById('registerForm').reset();
    } else {
      msg.style.color = '#d32f2f';
      msg.textContent = data.error || 'Error en el registro.';
    }
  } catch (err) {
    msg.style.color = '#d32f2f';
    msg.textContent = 'No se pudo conectar al servidor.';
  }
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nick = document.getElementById('loginNick').value;
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';
  try {
  const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, password })
    });
    const data = await res.json();
    if (data.success) {
      // Guardar usuario en localStorage
      localStorage.setItem('batlesd_user', JSON.stringify(data.user));
      // Redirigir al menú principal
      window.location.href = 'menu.html';
    } else {
      msg.style.color = '#d32f2f';
      msg.textContent = data.error || 'Error en el inicio de sesión.';
    }
  } catch (err) {
    msg.style.color = '#d32f2f';
    msg.textContent = 'No se pudo conectar al servidor.';
  }
});
