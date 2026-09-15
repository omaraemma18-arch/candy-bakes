(function () {
  const { api } = window.App;

  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('formAlert');
  const submitBtn = document.getElementById('submitBtn');

  // Already signed in? Go straight through.
  api('/api/auth/me')
    .then(() => { location.replace('/admin/dashboard'); })
    .catch(() => { /* not signed in — stay on the form */ });

  function setInvalid(name, invalid) {
    form.querySelector(`[data-field="${name}"]`)?.classList.toggle('invalid', invalid);
  }

  form.addEventListener('input', (e) => {
    e.target.closest('[data-field]')?.classList.remove('invalid');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.remove('show');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setInvalid('email', !emailOk);
    setInvalid('password', !password);
    if (!emailOk || !password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      location.href = '/admin/dashboard';
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
})();
