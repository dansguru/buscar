(() => {
  const COOKIE_PREFIX = 'buscar_';

  function getCookie(name) {
    const prefix = `${COOKIE_PREFIX}${name}=`;
    const item = document.cookie.split('; ').find((part) => part.startsWith(prefix));
    if (item) {
      try { return JSON.parse(decodeURIComponent(item.slice(prefix.length))); }
      catch (error) { return null; }
    }
    const key = prefix.slice(0, -1);
    for (const storageName of ['localStorage', 'sessionStorage']) {
      try {
        const storage = window[storageName];
        const raw = storage.getItem(key);
        if (raw === null) continue;
        const stored = JSON.parse(raw);
        if (stored && stored.__buscarStored) {
          if (stored.expiresAt && stored.expiresAt <= Date.now()) {
            storage.removeItem(key);
            continue;
          }
          return stored.value;
        }
        return stored;
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  function setCookie(name, value, days = 90) {
    const key = `${COOKIE_PREFIX}${name}`;
    const encoded = encodeURIComponent(JSON.stringify(value));
    try {
      const expiry = Number.isFinite(days) ? ` Max-Age=${Math.floor(days * 86400)};` : '';
      document.cookie = `${key}=${encoded}; Path=/;${expiry} SameSite=Lax`;
      if (!document.cookie.split('; ').some((part) => part.startsWith(`${key}=`))) throw new Error('Cookie storage unavailable');
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      try {
        const storage = Number.isFinite(days) ? window.localStorage : window.sessionStorage;
        const otherStorage = Number.isFinite(days) ? window.sessionStorage : window.localStorage;
        try { otherStorage.removeItem(key); } catch (storageError) {}
        const expiresAt = Number.isFinite(days) ? Date.now() + days * 86400000 : null;
        storage.setItem(key, JSON.stringify({ __buscarStored: true, value, expiresAt }));
        return false;
      } catch (storageError) { return false; }
    }
  }

  function removeCookie(name) {
    const key = `${COOKIE_PREFIX}${name}`;
    try { document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`; } catch (error) {}
    try { window.localStorage.removeItem(key); } catch (error) {}
    try { window.sessionStorage.removeItem(key); } catch (error) {}
  }

  function getState() {
    let state = getCookie('state');
    if (!state || typeof state !== 'object' || !Number.isFinite(state.seed)) {
      const seed = window.crypto && window.crypto.getRandomValues
        ? window.crypto.getRandomValues(new Uint32Array(1))[0]
        : Math.floor(Math.random() * 0xffffffff);
      state = { seed, searches: [], selections: {}, recentBooking: null };
      setCookie('state', state);
    }
    state.searches = Array.isArray(state.searches) ? state.searches : [];
    state.selections = state.selections && typeof state.selections === 'object' ? state.selections : {};
    return state;
  }

  function updateState(state) { setCookie('state', state); }
  function recordSearch(from, to, date) {
    const state = getState();
    const key = `${from}|${to}|${date}`;
    const prior = state.searches.find((search) => search.key === key);
    const variant = prior ? prior.count : 0;
    state.searches = state.searches.filter((search) => search.key !== key);
    state.searches.unshift({ key, count: variant + 1 });
    state.searches = state.searches.slice(0, 12);
    updateState(state);
    return variant;
  }

  function saveSelection(key, selection) {
    const state = getState();
    state.selections[key] = {
      seats: Array.isArray(selection.seats) ? selection.seats.slice(0, 6) : [],
      board: String(selection.board || '').slice(0, 100),
      drop: String(selection.drop || '').slice(0, 100),
      name: String(selection.name || '').slice(0, 80),
      phone: String(selection.phone || '').replace(/[^\d+]/g, '').slice(0, 20)
    };
    const keys = Object.keys(state.selections);
    keys.slice(0, Math.max(0, keys.length - 8)).forEach((oldKey) => delete state.selections[oldKey]);
    updateState(state);
  }

  function saveRecentBooking(booking) {
    const state = getState();
    state.recentBooking = {
      id: String(booking.id || '').slice(0, 24),
      route: String(booking.route || '').slice(0, 100),
      sentAt: new Date().toISOString()
    };
    updateState(state);
  }

  function whatsappUrl(message) {
    return `https://wa.me/254745342479?text=${encodeURIComponent(message)}`;
  }

  window.BuscarSite = {
    getCookie,
    setCookie,
    removeCookie,
    getState,
    recordSearch,
    saveSelection,
    saveRecentBooking,
    whatsappUrl
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/\.html$/i.test(url.pathname) || url.pathname === location.pathname) return;
    event.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, 170);
  });

  const banner = document.querySelector('.safety-banner');
  if (banner) {
    banner.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      const dialog = document.querySelector('.safety-dialog-backdrop');
      if (dialog) dialog.classList.add('show');
    });
  }

  if (document.body.dataset.showSafety === 'true' && !getCookie('safetyDismissed')) {
    const overlay = document.createElement('div');
    overlay.className = 'safety-dialog-backdrop';
    overlay.innerHTML = `
      <section class="safety-dialog" role="dialog" aria-modal="true" aria-labelledby="safetyTitle">
        <button class="safety-dialog-close" type="button" aria-label="Close notice">&times;</button>
        <img src="public/logo-2.png" alt="BUSCAR">
        <h2 id="safetyTitle">Please book safely</h2>
        <p>To protect you from scammers, bookings are confirmed manually on WhatsApp. Do not pay through links or send money to unverified numbers. Our team will confirm your trip and payment instructions directly.</p>
        <div class="safety-dialog-actions">
          <a href="${whatsappUrl('Hello BUSCAR, please help me confirm a booking safely.')}">Chat with BUSCAR</a>
          <button type="button" data-dismiss>Continue to site</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    const dismiss = () => {
      overlay.classList.remove('show');
      setCookie('safetyDismissed', true, 30);
    };
    overlay.querySelector('.safety-dialog-close').addEventListener('click', dismiss);
    overlay.querySelector('[data-dismiss]').addEventListener('click', dismiss);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) dismiss(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') dismiss(); });
    setTimeout(() => overlay.classList.add('show'), 650);
  }
})();
