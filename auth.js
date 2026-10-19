/* ==========================================================
   auth.js — sign-in dialog + demo session for BUSCAR
   Include at the end of <body> on every page:
   <script src="auth.js"></script>
   DEMO MODE: any phone + password signs in. Replace login() with your API.
   ========================================================== */
(() => {
  const LOGO = 'public/logo-2.png';
  const CODES = ['254', '256', '255', '250', '257', '251', '211', '243', '1', '44'];

  /* ---------- Session ---------- */
  const read = () => window.BuscarSite.getCookie('user');
  const save = (user, remember) => {
    window.BuscarSite.setCookie('user', user, remember === false ? null : 30);
    renderAccount();
  };
  const logout = () => {
    window.BuscarSite.removeCookie('user');
    renderAccount();
  };

  // TODO: replace with fetch('/api/login', ...) — for now everything succeeds
  const login = (user, remember) => { save(user, remember); return Promise.resolve(user); };

  /* ---------- Dialog markup ---------- */
  const eyeSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const lockSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  const backdrop = document.createElement('div');
  backdrop.className = 'auth-backdrop';
  backdrop.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button class="auth-close" type="button" aria-label="Close sign in">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <img class="auth-logo" src="${LOGO}" alt="BUSCAR">
      <h2 class="auth-title" id="authTitle">SIGN IN</h2>

      <form id="authForm" novalidate>
        <div class="auth-row">
          <label><span>CODE</span>
            <select name="code" aria-label="Country code">${CODES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
          </label>
          <label><span>PHONE NUMBER</span>
            <input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="700000000">
          </label>
        </div>

        <label class="auth-field"><span>PASSWORD</span>
          <div class="auth-pass">
            <span class="lock">${lockSvg}</span>
            <input name="password" type="password" autocomplete="current-password" aria-label="Password">
            <button class="eye" type="button" aria-label="Show password">${eyeSvg}</button>
          </div>
        </label>

        <div class="auth-meta">
          <label class="auth-check"><input type="checkbox" name="remember" checked> Remember me</label>
          <a href="#" id="authForgot">Forgot password?</a>
        </div>

        <p class="auth-error" id="authError" role="alert"></p>
        <button class="auth-primary" type="submit">SIGN IN</button>
      </form>

      <div class="auth-or"><span>OR CONTINUE</span></div>
      <button class="auth-ghost" id="authGuest" type="button">AS GUEST</button>
      <p class="auth-foot">Don't have an account? <a href="signup.html">Sign up</a></p>
    </div>`;
  document.body.appendChild(backdrop);

  const form = backdrop.querySelector('#authForm');
  const err = backdrop.querySelector('#authError');
  let lastFocus = null;

  const open = () => {
    lastFocus = document.activeElement;
    err.textContent = '';
    backdrop.classList.add('show');
    document.body.classList.add('auth-open');
    setTimeout(() => form.phone.focus(), 50);
  };
  const close = () => {
    backdrop.classList.remove('show');
    document.body.classList.remove('auth-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  backdrop.querySelector('.auth-close').addEventListener('click', close);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('show')) close(); });

  backdrop.querySelector('.eye').addEventListener('click', (e) => {
    const show = form.password.type === 'password';
    form.password.type = show ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  backdrop.querySelector('#authForgot').addEventListener('click', (e) => {
    e.preventDefault();
    err.textContent = 'Password reset isn\u2019t connected yet.';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = form.phone.value.replace(/\D/g, '');
    if (!phone) { err.textContent = 'Enter your phone number.'; form.phone.focus(); return; }
    if (!form.password.value) { err.textContent = 'Enter your password.'; form.password.focus(); return; }
    login({ guest: false, name: '', code: form.code.value, phone }, form.remember.checked).then(() => {
      form.reset();
      close();
    });
  });

  backdrop.querySelector('#authGuest').addEventListener('click', () => {
    login({ guest: true, name: 'Guest' }, false).then(close);
  });

  /* ---------- "My Account" button ---------- */
  const accountBtns = document.querySelectorAll('.account-btn');
  const menu = document.createElement('div');
  menu.className = 'account-menu';
  menu.innerHTML = '<p>Signed in as<b></b></p><button type="button" data-act="out">Sign out</button>';
  const navActions = document.querySelector('.nav-actions');
  if (navActions) navActions.appendChild(menu);

  const label = (u) => (u.guest ? 'Guest' : (u.name || ('+' + u.code + ' ' + u.phone)));

  function renderAccount() {
    const u = read();
    accountBtns.forEach((b) => {
      b.textContent = u ? (label(u).length > 14 ? label(u).slice(0, 13) + '\u2026' : label(u)) : 'My Account';
    });
    menu.querySelector('b').textContent = u ? label(u) : '';
    if (!u) menu.classList.remove('show');
  }

  accountBtns.forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (read()) menu.classList.toggle('show'); else open();
  }));
  menu.addEventListener('click', (e) => { if (e.target.dataset.act === 'out') { logout(); menu.classList.remove('show'); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.account-menu')) menu.classList.remove('show'); });

  // any element with .js-open-signin (e.g. "Sign in" link on the sign-up page) opens the dialog
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.js-open-signin');
    if (t) { e.preventDefault(); open(); }
  });

  renderAccount();
  if (new URLSearchParams(location.search).get('signin') === '1' && !read()) open();

  window.BuscarAuth = { open, close, login, logout, user: read, codes: CODES };
})();
