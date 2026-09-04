(function () {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const favicon = document.getElementById('favicon');
  const stored = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (stored) {
    root.setAttribute('data-theme', stored);
  } else if (prefersLight) {
    root.setAttribute('data-theme', 'latte');
  }

  function syncFavicon() {
    if (!favicon) return;
    const theme = root.getAttribute('data-theme') === 'latte' ? 'latte' : 'mocha';
    favicon.setAttribute('href', `favicon-${theme}.svg`);
  }

  syncFavicon();

  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'latte' ? 'mocha' : 'latte';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncFavicon();
  });
})();

(function () {
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('nav-panel');
  const overlay = document.getElementById('nav-overlay');
  const links = document.querySelectorAll('.nav-link');

  function open() {
    panel.classList.add('open');
    overlay.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
  }

  function close() {
    panel.classList.remove('open');
    overlay.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? close() : open();
  });

  overlay.addEventListener('click', close);
  links.forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

(function () {
  const links = document.querySelectorAll('.nav-link[href^="#"]');
  const sections = Array.from(links).map((link) =>
    document.querySelector(link.getAttribute('href'))
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        links.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === id);
        });
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach((section) => section && observer.observe(section));
})();

(function () {
  document.getElementById('year').textContent = new Date().getFullYear();
})();

(function () {
  const fill = document.getElementById('scroll-rail-fill');
  const dot = document.getElementById('scroll-rail-dot');
  if (!fill || !dot) return;

  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    fill.style.width = `${fraction * 100}%`;
    dot.style.left = `${fraction * 100}%`;
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
