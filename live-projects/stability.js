// Utility functions for numerical analysis
const NumericalAnalysis = {
  // Numerical gradient using central difference
  gradient(f, x, y, h = 1e-5) {
    const fx = (f(x + h, y) - f(x - h, y)) / (2 * h);
    const fy = (f(x, y + h) - f(x, y - h)) / (2 * h);
    return [fx, fy];
  },

  // Compute Jacobian matrix at a point
  jacobian(f1, f2, x, y, h = 1e-5) {
    const df1 = this.gradient(f1, x, y, h);
    const df2 = this.gradient(f2, x, y, h);
    return [
      [df1[0], df1[1]],
      [df2[0], df2[1]]
    ];
  },

  // Eigenvalues of 2x2 matrix
  eigenvalues(A) {
    const [[a, b], [c, d]] = A;
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;
    
    if (discriminant < 0) {
      const real = trace / 2;
      const imag = Math.sqrt(-discriminant) / 2;
      return [
        { real, imag },
        { real, imag: -imag }
      ];
    } else {
      const sqrt_disc = Math.sqrt(discriminant);
      return [
        (trace + sqrt_disc) / 2,
        (trace - sqrt_disc) / 2
      ];
    }
  },

  // Find fixed points using Newton's method
  findFixedPoints(f1, f2, x0, y0, maxIter = 50, tol = 1e-6) {
    let x = x0;
    let y = y0;
    
    for (let i = 0; i < maxIter; i++) {
      const J = this.jacobian(f1, f2, x, y);
      const fx = f1(x, y);
      const fy = f2(x, y);
      
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      if (Math.abs(det) < 1e-10) break;
      
      const dx = -(J[1][1] * fx - J[0][1] * fy) / det;
      const dy = -(J[0][0] * fy - J[1][0] * fx) / det;
      
      x += dx;
      y += dy;
      
      if (Math.abs(dx) < tol && Math.abs(dy) < tol) {
        return { x, y };
      }
    }
    return null;
  },

  // Determine stability type
  determineStability(J) {
    const [[a, b], [c, d]] = J;
    const trace = a + d;
    const det = a * d - b * c;
    
    if (Math.abs(det) < 1e-10) return "Degenerate";
    if (det < 0) return "Saddle";
    
    const discriminant = trace * trace - 4 * det;
    
    if (Math.abs(trace) < 1e-10) {
      if (discriminant < 0) return "Center";
      return "Degenerate";
    }
    
    if (trace > 0) {
      if (discriminant < 0) return "Unstable Spiral";
      else if (Math.abs(discriminant) < 1e-10) return "Unstable Star";
      else return "Unstable Node";
    } else {
      if (discriminant < 0) return "Stable Spiral";
      else if (Math.abs(discriminant) < 1e-10) return "Stable Star";
      else return "Stable Node";
    }
  }
};

// Main Application
class StabilityAnalyzer {
  constructor() {
    // name -> { value, min, max, step }, one entry per free symbol that
    // shows up in eq1/eq2 but isn't var1, var2, or a known math.js symbol.
    this.parameters = {};
    this._analyzeTimer = null;

    this.setupEventListeners();
    this.setupThemeSync();
    this.initializePlot();
    this.setupResizeHandler();
    this.syncParameters();
  }

  setupEventListeners() {
    document.getElementById('analyze-btn').addEventListener('click', () => this.analyze());
    document.getElementById('reset-btn').addEventListener('click', () => this.reset());
    
    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.analyze();
      });
    });

    // Re-scan for undefined symbols as the system definition changes, so
    // sliders appear/disappear as parameters are typed in or removed.
    ['eq1', 'eq2', 'var1', 'var2'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.syncParameters());
    });
  }

  // Returns the free symbol names referenced in `exprStr` that are not
  // var1, var2, or already defined by math.js (functions like sin/sqrt,
  // constants like pi/e, etc). Returns null if the expression doesn't
  // parse yet (e.g. mid-keystroke) so callers can leave sliders alone.
  extractFreeSymbols(exprStr, var1, var2) {
    if (!exprStr) return [];
    let node;
    try {
      node = math.parse(exprStr);
    } catch (e) {
      return null;
    }
    const names = node.filter(n => n.isSymbolNode).map(n => n.name);
    return names.filter(name => name !== var1 && name !== var2 && !(name in math));
  }

  // Scans eq1/eq2 for undefined symbols and keeps this.parameters (and the
  // sliders rendered from it) in sync: adds a slider with default bounds
  // for each newly-seen symbol, and drops sliders for symbols that no
  // longer appear in either equation.
  syncParameters() {
    const var1 = document.getElementById('var1').value.trim() || 'x';
    const var2 = document.getElementById('var2').value.trim() || 'y';
    const eq1Str = document.getElementById('eq1').value.trim();
    const eq2Str = document.getElementById('eq2').value.trim();

    const s1 = this.extractFreeSymbols(eq1Str, var1, var2);
    const s2 = this.extractFreeSymbols(eq2Str, var1, var2);
    if (s1 === null || s2 === null) return;

    const names = Array.from(new Set([...s1, ...s2]));

    for (const name of Object.keys(this.parameters)) {
      if (!names.includes(name)) delete this.parameters[name];
    }

    const DEFAULT_MIN = -10;
    const DEFAULT_MAX = 10;
    for (const name of names) {
      if (!this.parameters[name]) {
        this.parameters[name] = {
          min: DEFAULT_MIN,
          max: DEFAULT_MAX,
          step: (DEFAULT_MAX - DEFAULT_MIN) / 100,
          value: 1
        };
      }
    }

    this.renderParameterSliders();
  }

  renderParameterSliders() {
    const container = document.getElementById('param-sliders');
    if (!container) return;

    const names = Object.keys(this.parameters);
    if (names.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = names.map(name => {
      const p = this.parameters[name];
      return `
        <div class="param-slider-row" data-param="${name}">
          <div class="param-slider-label">
            <span class="param-name">${name}</span>
            <span class="param-value" data-role="value">${p.value.toFixed(3)}</span>
          </div>
          <input type="range" data-role="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}">
          <div class="param-slider-bounds">
            <input type="number" data-role="min" value="${p.min}" step="any">
            <span class="param-bounds-sep">to</span>
            <input type="number" data-role="max" value="${p.max}" step="any">
          </div>
        </div>
      `;
    }).join('');

    names.forEach(name => {
      const row = container.querySelector(`.param-slider-row[data-param="${CSS.escape(name)}"]`);
      if (!row) return;
      const range = row.querySelector('[data-role="range"]');
      const valueLabel = row.querySelector('[data-role="value"]');
      const minInput = row.querySelector('[data-role="min"]');
      const maxInput = row.querySelector('[data-role="max"]');

      range.addEventListener('input', () => {
        const p = this.parameters[name];
        if (!p) return;
        p.value = parseFloat(range.value);
        valueLabel.textContent = p.value.toFixed(3);
        this.debouncedAnalyze();
      });

      const updateBounds = () => {
        const p = this.parameters[name];
        if (!p) return;
        const min = parseFloat(minInput.value);
        const max = parseFloat(maxInput.value);
        if (isNaN(min) || isNaN(max) || max <= min) return;

        p.min = min;
        p.max = max;
        p.step = (max - min) / 100;
        p.value = Math.min(Math.max(p.value, min), max);

        range.min = String(min);
        range.max = String(max);
        range.step = String(p.step);
        range.value = String(p.value);
        valueLabel.textContent = p.value.toFixed(3);
        this.debouncedAnalyze();
      };

      minInput.addEventListener('change', updateBounds);
      maxInput.addEventListener('change', updateBounds);
    });
  }

  debouncedAnalyze() {
    clearTimeout(this._analyzeTimer);
    this._analyzeTimer = setTimeout(() => this.analyze(), 120);
  }

  setupThemeSync() {
    // Theme state, the toggle button, and the favicon are already owned by
    // the shared script.js (loaded on every page). Re-implementing that
    // logic here attached a second click handler to #theme-toggle, so each
    // click toggled the theme twice (once here, once in script.js) and it
    // appeared to do nothing. Instead, just watch for theme changes -
    // wherever they come from - and keep the plot colors in sync.
    const root = document.documentElement;
    const observer = new MutationObserver(() => this.updatePlotColors());
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  setupResizeHandler() {
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const container = document.getElementById('plot-container');
        if (container && container.children.length > 0) {
          Plotly.Plots.resize(container);
        }
      }, 150);
    });
  }

  initializePlot() {
    const layout = this.getPlotLayout();
    Plotly.newPlot('plot-container', [], layout, { responsive: false, displayModeBar: false });
  }

  getPlotLayout() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') || 'mocha';
    const colors = theme === 'latte' ? {
      bg: '#eff1f5',
      text: '#4c4f69',
      line: '#9ca0b0',
      gridline: '#ccd0da'
    } : {
      bg: '#1e1e2e',
      text: '#cdd6f4',
      line: '#7f849c',
      gridline: '#45475a'
    };

    return {
      title: { text: '', font: { color: colors.text } },
      xaxis: {
        title: { text: 'x', font: { color: colors.text, size: 14 } },
        gridcolor: colors.gridline,
        zerolinecolor: colors.line,
        zeroline: true,
        tickfont: { color: colors.text, size: 12 },
        scaleanchor: 'y',
        scaleratio: 1
      },
      yaxis: {
        title: { text: 'y', font: { color: colors.text, size: 14 } },
        gridcolor: colors.gridline,
        zerolinecolor: colors.line,
        zeroline: true,
        tickfont: { color: colors.text, size: 12 },
        scaleanchor: 'x',
        scaleratio: 1
      },
      plot_bgcolor: colors.bg,
      paper_bgcolor: 'transparent',
      margin: { l: 50, r: 40, t: 30, b: 50 },
      hovermode: 'closest',
      font: { color: colors.text, family: 'IBM Plex Sans, sans-serif' }
    };
  }

  updatePlotColors() {
    const layout = this.getPlotLayout();
    Plotly.relayout('plot-container', layout);
  }

  getColors() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') || 'mocha';
    return theme === 'latte' ? {
      vector: '#1e66f5',
      fixed: '#d20f39',
      stable: '#40a02b'
    } : {
      vector: '#89b4fa',
      fixed: '#f38ba8',
      stable: '#a6e3a1'
    };
  }

  parseInput() {
    try {
      const var1 = document.getElementById('var1').value.trim() || 'x';
      const var2 = document.getElementById('var2').value.trim() || 'y';
      const eq1Str = document.getElementById('eq1').value.trim();
      const eq2Str = document.getElementById('eq2').value.trim();

      if (!eq1Str || !eq2Str) {
        throw new Error('Both equations must be defined');
      }

      const f1 = math.compile(eq1Str);
      const f2 = math.compile(eq2Str);

      // Any slider values for undefined symbols (e.g. "k" in "-k*x") get
      // fed into the scope alongside the two phase-plane variables.
      const paramScope = {};
      for (const [name, p] of Object.entries(this.parameters)) {
        paramScope[name] = p.value;
      }

      const f1Func = (x, y) => f1.evaluate({ [var1]: x, [var2]: y, ...paramScope });
      const f2Func = (x, y) => f2.evaluate({ [var1]: x, [var2]: y, ...paramScope });

      const xlim = [
        parseFloat(document.getElementById('xlim-min').value),
        parseFloat(document.getElementById('xlim-max').value)
      ];
      const ylim = [
        parseFloat(document.getElementById('ylim-min').value),
        parseFloat(document.getElementById('ylim-max').value)
      ];

      return { f1: f1Func, f2: f2Func, var1, var2, xlim, ylim };
    } catch (e) {
      throw new Error(`Parse error: ${e.message}`);
    }
  }

  analyze() {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.style.display = 'none';
    this.syncParameters();

    try {
      const { f1, f2, var1, var2, xlim, ylim } = this.parseInput();

      let nx = Math.max(5, parseInt(document.getElementById('nx').value) || 20);
      let ny = Math.max(5, parseInt(document.getElementById('ny').value) || 20);

      // Find fixed points
      const fixedPoints = [];
      const grid_sample_x = math.range(xlim[0], xlim[1], (xlim[1] - xlim[0]) / 8).toArray();
      const grid_sample_y = math.range(ylim[0], ylim[1], (ylim[1] - ylim[0]) / 8).toArray();

      const visited = new Set();
      for (let xi of grid_sample_x) {
        for (let yi of grid_sample_y) {
          const fp = NumericalAnalysis.findFixedPoints(f1, f2, xi, yi);
          if (fp) {
            const key = `${fp.x.toFixed(3)},${fp.y.toFixed(3)}`;
            if (!visited.has(key) && 
                fp.x >= xlim[0] && fp.x <= xlim[1] &&
                fp.y >= ylim[0] && fp.y <= ylim[1]) {
              visited.add(key);
              
              const J = NumericalAnalysis.jacobian(f1, f2, fp.x, fp.y);
              const stability = NumericalAnalysis.determineStability(J);
              const eigenvals = NumericalAnalysis.eigenvalues(J);
              
              fixedPoints.push({
                x: fp.x,
                y: fp.y,
                stability,
                eigenvalues: eigenvals,
                trace: J[0][0] + J[1][1],
                det: J[0][0] * J[1][1] - J[0][1] * J[1][0]
              });
            }
          }
        }
      }

      const colors = this.getColors();
      const traces = [];
      const annotations = [];

      // Generate streamlines via numerical integration using nx and ny for seeding density
      const seedX = math.range(xlim[0], xlim[1], (xlim[1] - xlim[0]) / Math.max(5, Math.floor(nx / 2))).toArray();
      const seedY = math.range(ylim[0], ylim[1], (ylim[1] - ylim[0]) / Math.max(5, Math.floor(ny / 2))).toArray();
      const dt = 0.05;
      const steps = 100;

      for (let sx of seedX) {
        for (let sy of seedY) {
          let xPath = [sx];
          let yPath = [sy];
          let cx = sx, cy = sy;
          
          for (let s = 0; s < steps; s++) {
            const u = f1(cx, cy);
            const v = f2(cx, cy);
            const mag = Math.sqrt(u * u + v * v);
            if (mag < 1e-5 || isNaN(mag)) break;
            
            cx += (u / mag) * dt;
            cy += (v / mag) * dt;
            
            if (cx < xlim[0] || cx > xlim[1] || cy < ylim[0] || cy > ylim[1]) break;
            xPath.push(cx);
            yPath.push(cy);
          }

          if (xPath.length > 5) {
            traces.push({
              type: 'scatter',
              mode: 'lines',
              x: xPath,
              y: yPath,
              line: { color: colors.vector, width: 1.0 },
              hoverinfo: 'skip',
              showlegend: false
            });

            // Add an arrow annotation along the middle of the streamline path
            const midIdx = Math.floor(xPath.length / 2);
            const p1x = xPath[midIdx - 1];
            const p1y = yPath[midIdx - 1];
            const p2x = xPath[midIdx];
            const p2y = yPath[midIdx];

            annotations.push({
              ax: p1x,
              ay: p1y,
              axref: 'x',
              ayref: 'y',
              x: p2x,
              y: p2y,
              xref: 'x',
              yref: 'y',
              showarrow: true,
              arrowhead: 3,
              arrowsize: 1,
              arrowwidth: 1.5,
              arrowcolor: colors.vector
            });
          }
        }
      }

      // Fixed points
      if (fixedPoints.length > 0) {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          x: fixedPoints.map(fp => fp.x),
          y: fixedPoints.map(fp => fp.y),
          marker: {
            size: 10,
            color: colors.fixed,
            symbol: 'x',
            line: { color: colors.fixed, width: 1 }
          },
          text: fixedPoints.map(fp => `(${fp.x.toFixed(2)}, ${fp.y.toFixed(2)})<br>${fp.stability}`),
          hovertemplate: '%{text}<extra></extra>',
          showlegend: false
        });
      }

      const layout = this.getPlotLayout();
      layout.xaxis.range = xlim;
      layout.yaxis.range = ylim;
      layout.annotations = annotations;

      Plotly.react('plot-container', traces, layout, { 
        responsive: false,
        displayModeBar: false,
        staticPlot: false
      });

      this.displayResults(fixedPoints, var1, var2);

    } catch (e) {
      errorMsg.textContent = e.message;
      errorMsg.style.display = 'block';
    }
  }

  displayResults(fixedPoints, var1, var2) {
    const resultsPanel = document.getElementById('results-panel');
    const fpTable = document.getElementById('fp-table');

    if (fixedPoints.length === 0) {
      resultsPanel.classList.remove('show');
      return;
    }

    resultsPanel.classList.add('show');

    let html = `
      <div class="fp-row header">
        <div class="fp-cell">${var1}</div>
        <div class="fp-cell">${var2}</div>
        <div class="fp-cell">Trace</div>
        <div class="fp-cell">Stability</div>
      </div>
    `;

    for (const fp of fixedPoints) {
      const stabilityClass = this.getStabilityClass(fp.stability);
      html += `
        <div class="fp-row">
          <div class="fp-cell">${fp.x.toFixed(3)}</div>
          <div class="fp-cell">${fp.y.toFixed(3)}</div>
          <div class="fp-cell">${fp.trace.toFixed(3)}</div>
          <div class="fp-cell"><span class="stability-badge ${stabilityClass}">${fp.stability}</span></div>
        </div>
      `;
    }

    fpTable.innerHTML = html;
  }

  getStabilityClass(stability) {
    if (stability.includes('Stable')) return 'stability-stable';
    if (stability.includes('Unstable')) return 'stability-unstable';
    if (stability.includes('Saddle')) return 'stability-saddle';
    if (stability.includes('Center')) return 'stability-center';
    return '';
  }

  reset() {
    document.getElementById('var1').value = 'x';
    document.getElementById('var2').value = 'y';
    document.getElementById('eq1').value = 'y';
    document.getElementById('eq2').value = '-x - 0.5*y';
    document.getElementById('xlim-min').value = '-2';
    document.getElementById('xlim-max').value = '2';
    document.getElementById('ylim-min').value = '-2';
    document.getElementById('ylim-max').value = '2';
    document.getElementById('nx').value = '10';
    document.getElementById('ny').value = '10';
    document.getElementById('error-msg').style.display = 'none';
    document.getElementById('results-panel').classList.remove('show');
    this.parameters = {};
    this.renderParameterSliders();
    this.initializePlot();
  }
}

// Initialize when DOM is ready
// Nav-toggle, theme-toggle, the scroll rail, and the footer year are all
// already wired up by the shared ../script.js on every page - they don't
// need to be repeated here. This file only owns the analyzer itself.
document.addEventListener('DOMContentLoaded', () => {
  new StabilityAnalyzer();
});
