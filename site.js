(() => {
  const isEditable = (target) => target instanceof Element
    && (target.closest('input, textarea, select, [contenteditable="true"]') !== null);

  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('copy', (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  });
  document.addEventListener('cut', (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  });
  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const devToolsShortcut = event.key === 'F12'
      || ((event.ctrlKey || event.metaKey) && event.shiftKey && ['c', 'i', 'j'].includes(key))
      || ((event.ctrlKey || event.metaKey) && ['u', 's'].includes(key));

    if (devToolsShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

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
      phone: String(selection.phone || '').replace(/[^\d+]/g, '').slice(0, 20),
      idNumber: String(selection.idNumber || '').slice(0, 40),
      luggage: String(selection.luggage || '').slice(0, 100),
      medical: String(selection.medical || '').slice(0, 160)
    };
    const keys = Object.keys(state.selections);
    keys.slice(0, Math.max(0, keys.length - 20)).forEach((oldKey) => delete state.selections[oldKey]);
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

  const analyticsConfig = window.BUSCAR_CONFIG || {};
  const posthogProjectApiKey = String(analyticsConfig.posthogProjectApiKey || '').trim();
  const posthogHost = String(analyticsConfig.posthogHost || 'https://us.i.posthog.com').replace(/\/+$/, '');
  const siteName = 'buscar';
  let analyticsDistinctId;

  function getAnalyticsDistinctId() {
    if (analyticsDistinctId) return analyticsDistinctId;
    const storageKey = `${siteName}_analytics_distinct_id`;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored && /^[0-9a-f-]{36}$/i.test(stored)) {
        analyticsDistinctId = stored;
        return analyticsDistinctId;
      }
    } catch (error) {
      console.warn('PostHog anonymous ID could not be read from local storage.', error);
    }

    if (!window.crypto || !window.crypto.getRandomValues) {
      console.error('PostHog anonymous tracking requires browser cryptography support.');
      return null;
    }
    if (window.crypto.randomUUID) {
      analyticsDistinctId = window.crypto.randomUUID();
    } else {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
      analyticsDistinctId = `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
    }

    try {
      window.localStorage.setItem(storageKey, analyticsDistinctId);
    } catch (error) {
      console.warn('PostHog anonymous ID could not be saved; it will be temporary.', error);
    }
    return analyticsDistinctId;
  }

  function captureAnalyticsEvent(eventName, properties = {}) {
    if (!posthogProjectApiKey) return;
    if (!['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(posthogHost)) {
      console.error('PostHog host must be the US or EU ingestion host.');
      return;
    }

    const payload = {
      api_key: posthogProjectApiKey,
      event: eventName,
      distinct_id: getAnalyticsDistinctId(),
      properties: {
        $process_person_profile: false,
        $geoip_disable: true,
        site: siteName,
        page_path: window.location.pathname,
        ...properties
      }
    };
    if (!payload.distinct_id) return;
    const endpoint = `${posthogHost}/i/v0/e/`;
    const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (navigator.sendBeacon(endpoint, body)) return;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch((error) => console.error('PostHog event could not be sent.', error));
  }

  function trackWhatsAppRedirect(details = {}) {
    const properties = { source: String(details.source || 'support_link').slice(0, 40) };
    const route = String(details.route || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
    const fare = Number(details.fare_kes);
    if (route) properties.route = route;
    if (Number.isFinite(fare) && fare >= 0 && fare <= 1000000) properties.fare_kes = fare;
    captureAnalyticsEvent('whatsapp_redirect', properties);
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('a, button, [role="button"]');
    if (!target) return;

    const label = String(target.getAttribute('aria-label') || target.textContent || '')
      .replace(/\s+/g, ' ').trim().slice(0, 80);
    captureAnalyticsEvent('site_click', { click_label: label });
    if (target.matches('a[data-whatsapp-link]') && /^https:\/\/wa\.me\//i.test(target.href)) {
      trackWhatsAppRedirect({ source: target.dataset.whatsappSource || 'support_link' });
    }
  });
  captureAnalyticsEvent('page_view');

  const getWhatsappNumber = () => String((window.BUSCAR_CONFIG && window.BUSCAR_CONFIG.whatsappNumber) || '').trim();
  function whatsappUrl(message) {
    const digits = getWhatsappNumber().replace(/\D/g, '');
    const number = digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
    if (!/^\d{8,15}$/.test(number)) return null;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
  const whatsappNumber = getWhatsappNumber();
  document.querySelectorAll('[data-whatsapp-contact]').forEach((element) => {
    element.hidden = !whatsappNumber;
  });
  document.querySelectorAll('[data-whatsapp-number]').forEach((element) => {
    element.textContent = whatsappNumber;
  });

  window.BuscarSite = {
    getCookie,
    setCookie,
    removeCookie,
    getState,
    recordSearch,
    saveSelection,
    saveRecentBooking,
    trackWhatsAppRedirect,
    getWhatsappNumber,
    whatsappUrl
  };

  const revealTargets = document.querySelectorAll(
    '.content-section h2, .content-section .section-subtitle, .amenity-card, .benefit-card'
  );
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -24px 0px' });
    revealTargets.forEach((target) => {
      target.classList.add('scroll-reveal');
      revealObserver.observe(target);
    });
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  const siteHeader = menuToggle && menuToggle.closest('.site-header');
  if (menuToggle && mainNav && siteHeader) {
    const mobileMenu = window.matchMedia('(max-width: 780px)');
    if (!mainNav.id) mainNav.id = 'main-navigation';
    menuToggle.setAttribute('aria-controls', mainNav.id);

    const sheetHead = document.createElement('div');
    sheetHead.className = 'menu-sheet-head';
    const sheetBrand = document.createElement('span');
    sheetBrand.className = 'menu-sheet-brand';
    const sheetLogo = document.createElement('img');
    sheetLogo.className = 'menu-sheet-logo';
    sheetLogo.src = 'public/logo-2.png';
    sheetLogo.alt = '';
    const sheetTitle = document.createElement('strong');
    sheetTitle.textContent = 'BUSCAR';
    sheetBrand.append(sheetLogo, sheetTitle);
    const closeButton = document.createElement('button');
    closeButton.className = 'menu-sheet-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close navigation');
    closeButton.textContent = '\u00d7';
    sheetHead.append(sheetBrand, closeButton);
    mainNav.prepend(sheetHead);

    const closeMenu = (restoreFocus = true) => {
      mainNav.classList.remove('is-open');
      siteHeader.classList.remove('menu-open');
      document.body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      mainNav.setAttribute('aria-hidden', String(mobileMenu.matches));
      if (restoreFocus) menuToggle.focus({ preventScroll: true });
    };
    const openMenu = () => {
      if (!mobileMenu.matches) return;
      mainNav.classList.add('is-open');
      siteHeader.classList.add('menu-open');
      document.body.classList.add('menu-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      mainNav.setAttribute('aria-hidden', 'false');
      closeButton.focus({ preventScroll: true });
    };

    menuToggle.addEventListener('click', () => {
      if (mainNav.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    closeButton.addEventListener('click', () => closeMenu());
    mainNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('click', (event) => {
      if (mainNav.classList.contains('is-open') && !mainNav.contains(event.target) && !menuToggle.contains(event.target)) {
        closeMenu(false);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (!mainNav.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...mainNav.querySelectorAll('a[href], button:not([disabled])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    const syncMenuViewport = () => {
      if (mobileMenu.matches) mainNav.setAttribute('aria-hidden', String(!mainNav.classList.contains('is-open')));
      else {
        mainNav.removeAttribute('aria-hidden');
        if (mainNav.classList.contains('is-open')) closeMenu(false);
      }
    };
    mobileMenu.addEventListener('change', syncMenuViewport);
    syncMenuViewport();
  }

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

    const dismissBanner = () => {
      if (banner.contains(document.activeElement)) {
        banner.addEventListener('focusout', dismissBanner, { once: true });
        return;
      }
      banner.style.maxHeight = `${banner.getBoundingClientRect().height}px`;
      banner.getBoundingClientRect();
      banner.classList.add('is-dismissed');
      banner.setAttribute('aria-hidden', 'true');
      banner.inert = true;
      window.setTimeout(() => {
        banner.style.maxHeight = '0px';
        banner.style.paddingTop = '0px';
        banner.style.paddingBottom = '0px';
        banner.style.borderBottomWidth = '0px';
        banner.style.opacity = '0';
        banner.style.visibility = 'hidden';
      }, 0);
    };
    window.setTimeout(dismissBanner, 7000);
  }

  if (document.body.dataset.showSafety === 'true' && !getCookie('safetyDismissed')) {
    const overlay = document.createElement('div');
    overlay.className = 'safety-dialog-backdrop';
    overlay.innerHTML = `
      <section class="safety-dialog" role="dialog" aria-modal="true" aria-labelledby="safetyTitle">
        <button class="safety-dialog-close" type="button" aria-label="Close notice">&times;</button>
        <img src="public/logo-2.png" alt="BUSCAR">
        <h2 id="safetyTitle">Please book safely</h2>
        <p>Bookings are confirmed manually. Do not pay through unverified links or send money before BUSCAR confirms your trip. <span data-whatsapp-contact hidden>WhatsApp contact number: <strong data-whatsapp-number></strong>.</span></p>
        <div class="safety-dialog-actions">
          <button type="button" data-dismiss>Continue to site</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-whatsapp-contact]').hidden = !whatsappNumber;
    overlay.querySelector('[data-whatsapp-number]').textContent = whatsappNumber;
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
