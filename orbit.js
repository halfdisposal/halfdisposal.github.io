(function () {
  const canvas = document.getElementById('orbit-canvas');
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth = window.innerWidth;
    height = canvas.clientHeight = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize);
  resize();

  function accent(name, fallback) {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }

  const cx = () => width * 0.78;
  const cy = () => height * 0.32;
  const trail = [];
  const maxTrail = 220;
  let t = 0;

  let pointerX = null;
  let pointerY = null;
  let pullX = 0;
  let pullY = 0;

  if (!reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
    });
    window.addEventListener('pointerleave', () => {
      pointerX = null;
      pointerY = null;
    });
  }

  function step() {
    t += 0.012;
    const amp = Math.min(width, height) * 0.16;
    const baseX = cx() + amp * Math.cos(t) * 1.15;
    const baseY = cy() + amp * Math.sin(t * 1.31);

    let targetPullX = 0;
    let targetPullY = 0;
    if (pointerX !== null) {
      const dx = pointerX - baseX;
      const dy = pointerY - baseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const reach = Math.min(width, height) * 0.35;
      const strength = Math.max(0, 1 - dist / reach);
      const maxPull = 26;
      targetPullX = (dx / dist) * strength * maxPull;
      targetPullY = (dy / dist) * strength * maxPull;
    }
    pullX += (targetPullX - pullX) * 0.06;
    pullY += (targetPullY - pullY) * 0.06;

    const x = baseX + pullX;
    const y = baseY + pullY;

    trail.push({ x, y });
    if (trail.length > maxTrail) trail.shift();

    ctx.clearRect(0, 0, width, height);

    const lineColor = accent('--blue', '#89b4fa');
    for (let i = 1; i < trail.length; i++) {
      const a = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = a * 0.5;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = accent('--lavender', '#b4befe');
    ctx.fill();

    if (!reduceMotion) requestAnimationFrame(step);
  }

  if (!reduceMotion) {
    requestAnimationFrame(step);
  } else {
    step();
  }
})();
