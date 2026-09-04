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

  const N = 71;
  const spins = [];
  for (let i = 0; i < N; i++) {
    const row = [];
    for (let j = 0; j < N; j++) {
      row.push(Math.random() < 0.5 ? 1 : -1);
    }
    spins.push(row);
  }

  function neighborSum(i, j) {
    const up = spins[(i - 1 + N) % N][j];
    const down = spins[(i + 1) % N][j];
    const left = spins[i][(j - 1 + N) % N];
    const right = spins[i][(j + 1) % N];
    return up + down + left + right;
  }

  const T_LOW = 1.6;
  const T_HIGH = 3.6;

  function scrollFraction() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  }

  function metropolisStep(temperature) {
    const attempts = Math.round(N * N * 0.35);
    for (let a = 0; a < attempts; a++) {
      const i = Math.floor(Math.random() * N);
      const j = Math.floor(Math.random() * N);
      const dE = 2 * spins[i][j] * neighborSum(i, j);
      if (dE <= 0 || Math.random() < Math.exp(-dE / temperature)) {
        spins[i][j] *= -1;
      }
    }
  }

  function draw() {
    const cx = width;
    const cy = height / 2;
    const radius = width * 0.5;
    const spacing = radius / ((N - 1) / 2);
    const half = radius;
    const maxDist = radius;
    const fadeStart = radius * 0.3;
    const pointRadius = spacing * 0.15;
    const baseOpacity = 0.35;

    const upColor = accent('--blue', '#89b4fa');
    const downColor = accent('--peach', '#fab387');

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = cx - half + j * spacing;
        const y = cy - half + i * spacing;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > maxDist) continue;

        const alpha = dist <= fadeStart
          ? 1
          : Math.max(0, 1 - (dist - fadeStart) / (maxDist - fadeStart));

        if (alpha <= 0.02) continue;

        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = spins[i][j] === 1 ? upColor : downColor;
        ctx.globalAlpha = alpha * baseOpacity;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    const temperature = T_LOW + scrollFraction() * (T_HIGH - T_LOW);
    metropolisStep(temperature);
    draw();
    if (!reduceMotion) requestAnimationFrame(step);
  }

  if (!reduceMotion) {
    requestAnimationFrame(step);
  } else {
    draw();
  }
})();
