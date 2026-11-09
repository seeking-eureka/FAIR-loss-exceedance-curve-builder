(() => {
  'use strict';
  // ---------- constants & defaults ----------
  const STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const NS = STEPS.length, NMAX = STEPS[NS - 1];
  const MAX_SCEN = 10, MAX_APP = 5;
  const DEFAULTS = {
    seed: 42,
    scen: [
      { name: 'Ransomware outage', mode: 'derived', tef: [0.5, 2, 6], vul: [3, 8, 20], lef: [0.02, 0.16, 1.2], pl: [300, 1500, 6000], slef: [20, 40, 70], slm: [200, 800, 4000] },
      { name: 'Business email compromise', mode: 'derived', tef: [6, 12, 30], vul: [2, 5, 10], lef: [0.12, 0.6, 3], pl: [30, 250, 1500], slef: [5, 10, 25], slm: [20, 100, 500] },
      { name: 'Customer data breach', mode: 'derived', tef: [0.5, 1.5, 4], vul: [2, 6, 15], lef: [0.01, 0.09, 0.6], pl: [300, 1000, 4000], slef: [60, 80, 95], slm: [1000, 4000, 15000] },
      { name: 'Critical vendor/cloud outage', mode: 'derived', tef: [0.5, 1, 3], vul: [10, 25, 50], lef: [0.05, 0.25, 1.5], pl: [200, 800, 3000], slef: [10, 20, 40], slm: [100, 500, 2000] },
      { name: 'Insider misuse', mode: 'derived', tef: [0.5, 1, 3], vul: [5, 15, 30], lef: [0.025, 0.15, 0.9], pl: [100, 400, 1500], slef: [20, 30, 50], slm: [100, 500, 2000] },
      { name: 'DDoS on payment API', mode: 'derived', tef: [2, 5, 12], vul: [5, 15, 30], lef: [0.1, 0.75, 3.6], pl: [20, 100, 400], slef: [0, 5, 15], slm: [50, 150, 500] }
    ],
    app: [{ x: 1000, p: 60 }, { x: 5000, p: 10 }, { x: 20000, p: 1 }],
    focus: 1,
    ctrl: { on: true, name: 'Immutable backups + EDR upgrade', cost: 150, target: 0, tef: 0, vul: 40, pl: 40, sl: 0 }
  };
  const FACTORS = {
    derived: [
      ['tef', 'TEF', 'attempts / yr', 'rate'],
      ['vul', 'Vulnerability', '% of attempts', 'pct'],
      ['pl', 'Primary loss', '$K per event', 'money'],
      ['slef', 'SLEF', '% of events', 'pct'],
      ['slm', 'Secondary loss', '$K per event', 'money']
    ],
    direct: [
      ['lef', 'LEF', 'loss events / yr', 'rate'],
      ['pl', 'Primary loss', '$K per event', 'money'],
      ['slef', 'SLEF', '% of events', 'pct'],
      ['slm', 'Secondary loss', '$K per event', 'money']
    ]
  };
  const $ = id => document.getElementById(id);
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- formatting ----------
  function fm(v){
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v), s = v < 0 ? '−$' : '$';
    if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return s + (a / 1e6).toFixed(a < 1e7 ? 2 : a < 1e8 ? 1 : 0) + 'M';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'K';
    return s + Math.round(a);
  }
  const fmAxis = v => v >= 1e9 ? '$' + (v / 1e9) + 'B' : v >= 1e6 ? '$' + (v / 1e6) + 'M' : '$' + (v / 1e3) + 'K';
  function pc(v, d = 1){ return v == null || !isFinite(v) ? '—' : (v * 100).toFixed(d) + '%'; }
  function pcs(v){ // smart precision
    if (v == null || !isFinite(v)) return '—';
    const x = v * 100; return (x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(1) : x.toFixed(2)) + '%';
  }
  const fn = (v, d = 2) => Number(v).toFixed(d);
  const fint = v => Math.round(v).toLocaleString('en-US');
  const fyrs = n => n >= 1000 ? (n / 1000) + 'K' : String(n);
  const fk = v => { // $K input display
    if (!isFinite(v)) return '';
    return Number.isInteger(v) ? v.toLocaleString('en-US') : String(+v.toFixed(3));
  };
  const fr = v => String(+(+v).toFixed(4));

  function parseMoney(str){ // returns $K
    let s = String(str).trim().replace(/[$,\s]/g, '').toLowerCase();
    if (!s) return NaN;
    let mult = 1;
    if (/[kmb]$/.test(s)){ const c = s.slice(-1); s = s.slice(0, -1); mult = c === 'k' ? 1 : c === 'm' ? 1000 : 1e6; }
    if (!/^\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s) * mult;
  }
  function parseNum(str){
    const s = String(str).trim().replace(/[,%\s]/g, '');
    if (!/^\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  }

  // ---------- random numbers (seeded, reproducible, common random numbers) ----------
  let rs = 1;
  function rnd(){
    rs = (rs + 0x6D2B79F5) | 0;
    let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function seedFor(seed, s, y){
    let h = (seed ^ 0x9E3779B9) >>> 0;
    h = Math.imul(h ^ ((s + 1) * 0x7F4A7C15), 0x85EBCA6B); h ^= h >>> 13;
    h = Math.imul(h ^ ((y + 1) * 0x165667B1), 0xC2B2AE35); h ^= h >>> 16;
    return h | 0;
  }
  function normal(){ let u = rnd(); if (u < 1e-12) u = 1e-12; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
  function gamma(a){ // Marsaglia–Tsang, a >= 1 (always true for PERT shapes)
    const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;){
      let x, v;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; const u = rnd();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function pertP(r){ // r = [min, ml, max]
    const [a, m, b] = r;
    if (b <= a) return { a, m, b, al: 1, be: 1, mean: a, fixed: true };
    const al = 1 + 4 * (m - a) / (b - a), be = 1 + 4 * (b - m) / (b - a);
    return { a, m, b, al, be, mean: (a + 4 * m + b) / 6, fixed: false };
  }
  function pertSd(p){ if (p.fixed) return 0; const s = p.al + p.be; return (p.b - p.a) * Math.sqrt(p.al * p.be / (s * s * (s + 1))); }
  function pertDraw(p){ if (p.fixed) return p.a; const x = gamma(p.al), y = gamma(p.be); return p.a + (p.b - p.a) * x / (x + y); }
  function poisInv(l, u){
    if (l <= 0) return 0;
    let k = 0, p = Math.exp(-l), F = p;
    while (u > F && k < 3000){ k++; p *= l / k; F += p; }
    return k;
  }

  // ---------- model ----------
  function prep(sc){
    return sc.map(s => ({ mode: s.mode, tef: pertP(s.tef), vul: pertP(s.vul.map(v => v / 100)), lef: pertP(s.lef),
      pl: pertP(s.pl.map(v => v * 1000)), slef: pertP(s.slef.map(v => v / 100)), slm: pertP(s.slm.map(v => v * 1000)) }));
  }
  function ctrlFactors(c, s){
    if (!c || !c.on || c.target !== s) return { lf: 1, pf: 1, sf: 1 };
    return { lf: (1 - c.tef / 100) * (1 - c.vul / 100), pf: 1 - c.pl / 100, sf: 1 - c.sl / 100 };
  }
  // exact expected values from PERT means (inputs independent)
  function exactScen(p, f){
    const lef = (p.mode === 'derived' ? p.tef.mean * p.vul.mean : p.lef.mean) * f.lf;
    const prim = p.pl.mean * f.pf, sec = p.slef.mean * p.slm.mean * f.sf;
    return { lef, prim, sec, perEvent: prim + sec, ale: lef * (prim + sec) };
  }
  function simulate(P, seed, c){
    const N = NMAX, S = P.length, tot = new Float64Array(N);
    const cum = P.map(() => new Float64Array(NS)), maxEv = new Float64Array(S), evCount = new Float64Array(S);
    for (let s = 0; s < S; s++){
      const p = P[s], f = ctrlFactors(c, s), derived = p.mode === 'derived';
      let acc = 0, si = 0, mx = 0, ev = 0;
      for (let y = 0; y < N; y++){
        rs = seedFor(seed, s, y);
        let lam;
        if (derived){ lam = pertDraw(p.tef) * pertDraw(p.vul); } else { lam = pertDraw(p.lef); }
        const u = rnd(), sl = pertDraw(p.slef);
        const k = poisInv(Math.min(500, lam * f.lf), u);
        let ann = 0;
        for (let j = 0; j < k; j++){
          const prim = pertDraw(p.pl) * f.pf, ub = rnd(), sec = pertDraw(p.slm) * f.sf;
          const loss = prim + (ub < sl ? sec : 0);
          ann += loss; if (loss > mx) mx = loss;
        }
        ev += k; tot[y] += ann; acc += ann;
        if (y + 1 === STEPS[si]){ cum[s][si] = acc; si++; }
      }
      maxEv[s] = mx; evCount[s] = ev;
    }
    return { tot, cum, maxEv, evCount };
  }
  const GRID = (() => { const g = []; for (let i = 0; i <= 180; i++) g.push(Math.pow(10, 4 + i * 6 / 180)); return g; })();
  function ub(a, x){ let lo = 0, hi = a.length; while (lo < hi){ const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; } return lo; }
  function quant(a, q){ const n = a.length, h = (n - 1) * q, l = Math.floor(h), u = Math.min(n - 1, l + 1); return a[l] + (h - l) * (a[u] - a[l]); }
  function stats(sim, n, appX){
    const a = sim.tot.slice(0, n).sort();
    let sum = 0, sq = 0, zero = 0;
    for (let i = 0; i < n; i++){ const v = a[i]; sum += v; sq += v * v; if (v === 0) zero++; }
    const mean = sum / n, sd = Math.sqrt(Math.max(0, sq / n - mean * mean) * n / (n - 1));
    const exc = appX.map(x => { const p = (n - ub(a, x)) / n; return { p, se: Math.sqrt(p * (1 - p) / n) }; });
    const curve = GRID.map(x => (n - ub(a, x)) / n);
    const r = 0.99 * n, d = 1.96 * Math.sqrt(n * 0.99 * 0.01);
    const q99lo = a[Math.max(0, Math.floor(r - d) - 1)], q99hi = a[Math.min(n - 1, Math.ceil(r + d) - 1)];
    const i99 = Math.floor(0.99 * n); let es = 0; for (let i = i99; i < n; i++) es += a[i]; es /= (n - i99);
    return { n, mean, sd, se: sd / Math.sqrt(n), p0: zero / n, q90: quant(a, 0.9), q95: quant(a, 0.95), q99: quant(a, 0.99), q999: quant(a, 0.999),
      q99lo, q99hi, es99: es, worst: a[n - 1], exc, curve, nOver: appX.map(x => n - ub(a, x)) };
  }

  // ---------- state ----------
  let state = clone(DEFAULTS);
  let step = NS - 1, model = null, playing = null, scale = 'lin', metric = 'p', calcIdx = 0, simTimer = null, valid = true;

  // ---------- validation ----------
  function validateAll(){
    const sm = [], am = [], cm = []; let ok = true;
    state.scen.forEach((s, i) => {
      const box = document.querySelector(`details.scen[data-i="${i}"]`);
      let bad = false;
      FACTORS[s.mode].forEach(([key, label, , kind]) => {
        const r = s[key], inputs = box ? box.querySelectorAll(`input[data-k="${key}"]`) : [];
        inputs.forEach(inp => inp.classList.remove('bad', 'warn'));
        const markBad = idx => { (idx == null ? [...inputs] : [inputs[idx]]).forEach(el => el && el.classList.add('bad')); bad = true; ok = false; };
        const markWarn = idx => { (idx == null ? [...inputs] : [inputs[idx]]).forEach(el => el && el.classList.add('warn')); };
        if (r.some(v => !isFinite(v) || v < 0)){ r.forEach((v, j) => { if (!isFinite(v) || v < 0) markBad(j); }); sm.push(['err', `${s.name || 'Scenario ' + (i + 1)}: ${label} needs three numbers, 0 or more.`]); return; }
        if (r[0] > r[1] || r[1] > r[2]){ markBad(); sm.push(['err', `${s.name || 'Scenario ' + (i + 1)}: ${label} needs minimum ≤ most likely ≤ maximum.`]); return; }
        if (kind === 'pct' && r[2] > 100){ markBad(2); sm.push(['err', `${s.name || 'Scenario ' + (i + 1)}: ${label} can't exceed 100%.`]); return; }
        if (kind === 'rate' && r[2] > 500){ markBad(2); sm.push(['err', `${s.name || 'Scenario ' + (i + 1)}: ${label} can't exceed 500 a year.`]); return; }
        if (kind === 'rate' && r[2] > 50){ markWarn(2); sm.push(['warn', `${s.name}: a ${label} maximum of ${fr(r[2])} a year is very high for a single loss scenario.`]); }
        if (kind === 'money' && r[0] > 0 && r[2] / r[0] > 100){ markWarn(); sm.push(['warn', `${s.name}: the ${label.toLowerCase()} maximum is more than 100× the minimum, which implies an extreme tail.`]); }
      });
      if (box) box.classList.toggle('has-err', bad);
    });
    // appetite
    const rows = document.querySelectorAll('#appList .app-row');
    rows.forEach(r => r.querySelectorAll('input.num').forEach(x => x.classList.remove('bad')));
    state.app.forEach((a, i) => {
      const r = rows[i]; if (!r) return;
      if (!isFinite(a.x) || a.x <= 0){ r.querySelector('.ax').classList.add('bad'); am.push(['err', `Point ${i + 1}: the loss amount must be above 0.`]); ok = false; }
      if (!isFinite(a.p) || a.p <= 0 || a.p > 100){ r.querySelector('.ap').classList.add('bad'); am.push(['err', `Point ${i + 1}: the probability must be above 0% and at most 100%.`]); ok = false; }
    });
    if (am.length === 0){
      const idx = state.app.map((a, i) => i).sort((i, j) => state.app[i].x - state.app[j].x);
      for (let k = 1; k < idx.length; k++){
        const A = state.app[idx[k - 1]], B = state.app[idx[k]];
        if (A.x === B.x){ am.push(['err', `Two points share the same loss amount (${fm(A.x * 1000)}).`]); ok = false; rows[idx[k]].querySelector('.ax').classList.add('bad'); }
        else if (B.p > A.p){ am.push(['err', `A larger loss (${fm(B.x * 1000)}) can't have a higher tolerance (${B.p}%) than a smaller one (${fm(A.x * 1000)} at ${A.p}%).`]); ok = false; rows[idx[k]].querySelector('.ap').classList.add('bad'); }
      }
    }
    // control
    const cc = $('ctrlCost'); cc.classList.remove('bad');
    if (!isFinite(state.ctrl.cost) || state.ctrl.cost < 0){ cc.classList.add('bad'); cm.push(['err', 'The control cost must be a number, 0 or more.']); ok = false; }
    if (state.ctrl.on && state.scen[state.ctrl.target] && state.scen[state.ctrl.target].mode === 'direct' && (state.ctrl.tef > 0 || state.ctrl.vul > 0))
      cm.push(['warn', `${state.scen[state.ctrl.target].name} estimates LEF directly, so the TEF and Vulnerability reductions are applied to LEF as a whole.`]);
    renderMsgs($('scenMsgs'), sm.slice(0, 6)); renderMsgs($('appMsgs'), am); renderMsgs($('ctrlMsgs'), cm);
    valid = ok;
    return ok;
  }
  function renderMsgs(el, list){ el.innerHTML = list.map(([t, m]) => `<div class="msg ${t}">${m}</div>`).join(''); }

  // ---------- compute ----------
  function compute(){
    const t0 = performance.now();
    const P = prep(state.scen);
    const appX = state.app.map(a => a.x * 1000);
    const base = simulate(P, state.seed, null);
    const ctrlOn = state.ctrl.on;
    const ctl = ctrlOn ? simulate(P, state.seed, state.ctrl) : null;
    const exB = P.map((p, s) => exactScen(p, { lf: 1, pf: 1, sf: 1 }));
    const exC = P.map((p, s) => exactScen(p, ctrlFactors(state.ctrl, s)));
    const states = STEPS.map((n, i) => {
      const b = stats(base, n, appX), c = ctl ? stats(ctl, n, appX) : null;
      const perB = base.cum.map(cs => cs[i] / n), perC = ctl ? ctl.cum.map(cs => cs[i] / n) : null;
      // CRN difference: mean of paired differences and its SE
      let dSE = null;
      if (ctl){
        let s1 = 0, s2 = 0; for (let y = 0; y < n; y++){ const d = base.tot[y] - ctl.tot[y]; s1 += d; s2 += d * d; }
        const dm = s1 / n, dv = Math.max(0, s2 / n - dm * dm) * n / (n - 1); dSE = Math.sqrt(dv / n);
      }
      return { i, n, b, c, perB, perC, dSE };
    });
    const exactB = exB.reduce((s, e) => s + e.ale, 0), exactC = exC.reduce((s, e) => s + e.ale, 0);
    return { P, appX, base, ctl, states, exB, exC, exactB, exactC, ms: performance.now() - t0, seed: state.seed };
  }

  // ---------- register UI ----------
  function scenSummary(i){
    const s = state.scen[i];
    try {
      const p = prep([s])[0], e = exactScen(p, { lf: 1, pf: 1, sf: 1 });
      if (!isFinite(e.ale)) throw 0;
      return `LEF ${fn(e.lef, 3)}/yr · ${fm(e.perEvent)} per event · ALE <b>${fm(e.ale)}</b>`;
    } catch (err){ return 'Check inputs'; }
  }
  function buildRegister(openIdx){
    const list = $('scenList'); list.innerHTML = '';
    state.scen.forEach((s, i) => {
      const d = document.createElement('details'); d.className = 'scen'; d.dataset.i = i;
      if (openIdx === i) d.open = true;
      const facs = FACTORS[s.mode];
      const rows = facs.map(([key, label, unit, kind]) => {
        const vals = s[key].map(v => kind === 'money' ? fk(v) : fr(v));
        return `<div class="fl">${label}<small>${unit}</small></div>` + vals.map((v, j) =>
          `<input class="num" data-k="${key}" data-j="${j}" data-kind="${kind}" inputmode="decimal" value="${v}" aria-label="${s.name} ${label} ${['minimum', 'most likely', 'maximum'][j]}">`).join('') +
          (key === 'vul' ? `<div class="sep"></div><div class="fl">LEF<small>derived</small></div><div class="derived" data-derived></div>` : '') +
          (key === 'lef' ? `<div class="sep"></div>` : '');
      }).join('');
      d.innerHTML = `<summary><span class="scen-title"><span>${esc(s.name)}</span><span class="bad-dot" title="Has input errors"></span></span><span class="scen-sum mono" data-sum>${scenSummary(i)}</span></summary>
        <div class="scen-body">
          <div class="scen-name"><input class="num txt" data-name value="${esc(s.name)}" aria-label="Scenario name"><button class="x-btn" data-del title="Remove scenario" aria-label="Remove scenario" ${state.scen.length <= 1 ? 'disabled' : ''}>×</button></div>
          <div class="mode-row">
            <button class="chip ${s.mode === 'derived' ? 'on' : ''}" data-mode="derived">Derive LEF (TEF × Vulnerability)</button>
            <button class="chip ${s.mode === 'direct' ? 'on' : ''}" data-mode="direct">Estimate LEF directly</button>
          </div>
          <div class="fgrid"><span></span><span class="fh">Min</span><span class="fh">Most likely</span><span class="fh">Max</span>${rows}</div>
        </div>`;
      list.appendChild(d);
      wireScen(d, i);
      updateDerived(d, i);
    });
    $('addScen').disabled = state.scen.length >= MAX_SCEN;
    buildTargetSelects();
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function updateDerived(d, i){
    const s = state.scen[i], el = d.querySelector('[data-derived]');
    if (el){
      const ok = s.tef.every(isFinite) && s.vul.every(isFinite);
      el.textContent = ok ? `mean ${fn(pertP(s.tef).mean * pertP(s.vul).mean / 100, 3)} events / yr` : '—';
    }
    d.querySelector('[data-sum]').innerHTML = scenSummary(i);
  }
  function wireScen(d, i){
    d.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.k, j = +inp.dataset.j, kind = inp.dataset.kind;
      state.scen[i][k][j] = kind === 'money' ? parseMoney(inp.value) : parseNum(inp.value);
      updateDerived(d, i); onChange();
    }));
    d.querySelector('[data-name]').addEventListener('input', e => {
      state.scen[i].name = e.target.value.trim() || `Scenario ${i + 1}`;
      d.querySelector('.scen-title span').textContent = state.scen[i].name;
      buildTargetSelects(); scheduleSim(true);
    });
    d.querySelector('[data-del]').addEventListener('click', e => {
      e.preventDefault(); if (state.scen.length <= 1) return;
      state.scen.splice(i, 1);
      if (state.ctrl.target === i) state.ctrl.target = 0; else if (state.ctrl.target > i) state.ctrl.target--;
      if (calcIdx >= state.scen.length) calcIdx = 0;
      buildRegister(-1); onChange();
    });
    d.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); const m = b.dataset.mode, s = state.scen[i];
      if (s.mode === m) return;
      if (m === 'direct' && s.tef.every(isFinite) && s.vul.every(isFinite)){
        s.lef = [0, 1, 2].map(j => +(s.tef[j] * s.vul[j] / 100).toPrecision(3));
      }
      s.mode = m; buildRegister(i); onChange();
    }));
  }
  function buildTargetSelects(){
    const opts = state.scen.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join('');
    $('ctrlTarget').innerHTML = opts; $('ctrlTarget').value = state.ctrl.target;
    $('calcScen').innerHTML = opts; $('calcScen').value = calcIdx;
  }
  $('addScen').addEventListener('click', () => {
    if (state.scen.length >= MAX_SCEN) return;
    state.scen.push({ name: `New scenario ${state.scen.length + 1}`, mode: 'derived', tef: [0.5, 1, 3], vul: [5, 10, 25], lef: [0.025, 0.1, 0.75], pl: [100, 500, 2000], slef: [10, 20, 40], slm: [100, 300, 1500] });
    buildRegister(state.scen.length - 1); onChange();
  });

  // ---------- appetite UI ----------
  function buildAppetite(){
    const list = $('appList'); list.innerHTML = '';
    state.app.forEach((a, i) => {
      const r = document.createElement('div'); r.className = 'app-row';
      r.innerHTML = `<span class="unit"><input class="num ax" inputmode="decimal" value="${fk(a.x)}" aria-label="Appetite point ${i + 1} loss in $K"><i>$K</i></span>
        <span class="unit"><input class="num ap" inputmode="decimal" value="${fr(a.p)}" aria-label="Appetite point ${i + 1} maximum probability"><i>%</i></span>
        <span class="radio"><input type="radio" name="focus" ${state.focus === i ? 'checked' : ''} aria-label="Make point ${i + 1} the focus"></span>
        <button class="x-btn" title="Remove point" aria-label="Remove point" ${state.app.length <= 1 ? 'disabled' : ''}>×</button>`;
      r.querySelector('.ax').addEventListener('input', e => { state.app[i].x = parseMoney(e.target.value); onChange(); });
      r.querySelector('.ap').addEventListener('input', e => { state.app[i].p = parseNum(e.target.value); onChange(); });
      r.querySelector('input[type=radio]').addEventListener('change', () => { state.focus = i; renderAll(); });
      r.querySelector('.x-btn').addEventListener('click', () => {
        if (state.app.length <= 1) return;
        state.app.splice(i, 1);
        if (state.focus === i) state.focus = Math.min(i, state.app.length - 1); else if (state.focus > i) state.focus--;
        buildAppetite(); onChange();
      });
      list.appendChild(r);
    });
    $('addApp').disabled = state.app.length >= MAX_APP;
  }
  $('addApp').addEventListener('click', () => {
    if (state.app.length >= MAX_APP) return;
    const mx = Math.max(...state.app.map(a => a.x).filter(isFinite), 1000), mn = Math.min(...state.app.map(a => a.p).filter(isFinite), 10);
    state.app.push({ x: mx * 2, p: +(mn / 2).toPrecision(2) });
    buildAppetite(); onChange();
  });

  // ---------- control UI ----------
  function syncCtrl(){
    const c = state.ctrl;
    $('ctrlOn').checked = c.on; $('ctrlName').value = c.name; $('ctrlCost').value = fk(c.cost);
    $('ctrlTarget').value = c.target;
    [['rTef', 'tef'], ['rVul', 'vul'], ['rPl', 'pl'], ['rSl', 'sl']].forEach(([id, k]) => { $(id).value = c[k]; $(id + 'V').textContent = c[k] + '%'; });
    $('ctrlBody').classList.toggle('off', !c.on);
  }
  $('ctrlOn').addEventListener('change', e => { state.ctrl.on = e.target.checked; syncCtrl(); onChange(); });
  $('ctrlName').addEventListener('input', e => { state.ctrl.name = e.target.value.trim() || 'Control'; renderAll(); });
  $('ctrlCost').addEventListener('input', e => { state.ctrl.cost = parseMoney(e.target.value); if (validateAll() && model) renderAll(); else renderAll(); });
  $('ctrlTarget').addEventListener('change', e => { state.ctrl.target = +e.target.value; onChange(); });
  [['rTef', 'tef'], ['rVul', 'vul'], ['rPl', 'pl'], ['rSl', 'sl']].forEach(([id, k]) => $(id).addEventListener('input', e => {
    state.ctrl[k] = +e.target.value; $(id + 'V').textContent = state.ctrl[k] + '%'; onChange();
  }));
  $('calcScen').addEventListener('change', e => { calcIdx = +e.target.value; renderSteps(model); renderGuide(model); });

  // ---------- change handling ----------
  function onChange(){ if (validateAll()) scheduleSim(); else renderAll(); }
  function scheduleSim(immediate){
    clearTimeout(simTimer);
    $('simTime').textContent = 'simulating…';
    simTimer = setTimeout(() => { if (!validateAll()) { renderAll(); return; } model = compute(); renderAll(); }, immediate ? 0 : 280);
  }

  // ---------- rendering: KPIs, appetite, precision ----------
  const statusOf = (p, se, tol) => { const lo = p - 1.96 * se, hi = p + 1.96 * se; return lo <= tol && hi >= tol && se > 0 ? 'unsure' : p > tol ? 'out' : 'in'; };
  const CHIP = { in: '<span class="zchip g">Inside</span>', out: '<span class="zchip r">Outside</span>', unsure: '<span class="zchip y">Unclear</span>' };
  function appSorted(){ return state.app.map((a, i) => ({ ...a, i })).sort((u, v) => u.x - v.x); }
  function verdictOf(st, which){
    const S = which === 'c' ? st.c : st.b; if (!S) return null;
    const ss = state.app.map((a, i) => statusOf(S.exc[i].p, S.exc[i].se, a.p / 100));
    return ss.includes('out') ? 'out' : ss.includes('unsure') ? 'unsure' : 'in';
  }
  const VTXT = { in: 'Inside appetite', out: 'Outside appetite', unsure: 'Too close to call' };

  function renderKpis(m){
    const st = m.states[step], b = st.b, c = st.c;
    $('stepLabel').textContent = `${fint(st.n)} simulated years`;
    $('stepRange').value = step;
    $('seedLabel').textContent = `Seed ${m.seed}`;
    $('simTime').textContent = `simulated in ${Math.round(m.ms)} ms`;
    $('k1').textContent = fm(b.mean);
    $('k1s').textContent = `± ${fm(1.96 * b.se)} · exact ${fm(m.exactB)}`;
    $('k3').textContent = fm(b.q99);
    $('k3s').textContent = `1-in-20 ${fm(b.q95)} · worst-1% avg ${fm(b.es99)}`;
    if (c){
      const d = b.mean - c.mean, cost = state.ctrl.cost * 1000;
      const roi = cost > 0 ? (d - cost) / cost : null;
      $('k4').textContent = roi == null ? (d > 0 ? 'Free' : '—') : (roi >= 0 ? '+' : '−') + Math.abs(Math.round(roi * 100)) + '%';
      $('k4').style.color = roi == null || roi >= 0 ? '' : 'var(--red)';
      $('k4s').textContent = `ALE −${fm(d)}/yr vs ${fm(cost)} cost`;
    } else { $('k4').textContent = '—'; $('k4').style.color = ''; $('k4s').textContent = 'control switched off'; }
    // appetite
    const vb = verdictOf(st, 'b'), vc = c ? verdictOf(st, 'c') : null;
    $('k2v').innerHTML = `<span class="verdict ${vb}">${VTXT[vb]}</span>` + (vc ? ` <span class="small muted mono" style="margin-left:8px">with control: <span style="color:var(--${vc === 'in' ? 'zg' : vc === 'out' ? 'zr' : 'zy'})">${VTXT[vc].toLowerCase()}</span></span>` : '');
    $('k2').innerHTML = appSorted().map(a => {
      const e = b.exc[a.i], tol = a.p / 100, s = statusOf(e.p, e.se, tol);
      const ce = c ? c.exc[a.i].p : null;
      const top = Math.max(tol * 2, e.p * 1.1, ce || 0) || 1;
      return `<div class="arow"><span class="lbl ${a.i === state.focus ? 'focus' : ''}">&gt; ${fm(a.x * 1000)}</span>
        <span class="abar" title="Simulated ${pcs(e.p)} vs tolerance ${pcs(tol)}"><span class="fill ${s}" style="width:${Math.min(100, e.p / top * 100)}%"></span><span class="tol" style="left:${tol / top * 100}%"></span>${ce != null ? `<span class="ctl" style="left:${Math.min(100, ce / top * 100)}%" title="With control ${pcs(ce)}"></span>` : ''}</span>
        <span class="val">${pcs(e.p)} <small>≤ ${pcs(tol)}</small></span><span class="st">${CHIP[s]}</span></div>`;
    }).join('');
  }

  function runsNeeded(p, tol){ const g = Math.abs(p - tol); if (g < 1e-9) return Infinity; return p * (1 - p) * Math.pow(1.96 / g, 2); }
  function renderPrecision(m){
    const st = m.states[step], f = state.focus, e = st.b.exc[f], tol = state.app[f].p / 100, x = state.app[f].x * 1000;
    const s = statusOf(e.p, e.se, tol), lo = Math.max(0, e.p - 1.96 * e.se), hi = Math.min(1, e.p + 1.96 * e.se);
    const need = runsNeeded(e.p, tol);
    const fl = $('precFlag');
    fl.className = `flag mono ${s === 'unsure' ? 'maybe' : 'ok'}`;
    fl.textContent = s === 'unsure' ? "Can't tell yet" : 'Clear call';
    const needTxt = !isFinite(need) ? 'The estimate sits exactly on the tolerance, so no number of runs will separate them.'
      : need <= st.n ? `About ${fint(Math.max(100, need))} runs are enough to separate the estimate from the tolerance, and you're using ${fint(st.n)}.`
      : `You'd need about ${fint(need)} runs to separate them${need > NMAX ? ', more than this app simulates' : ''}.`;
    $('precTxt').innerHTML = `At ${fint(st.n)} years, P(loss &gt; ${fm(x)}) = ${pcs(e.p)}, with a 95% Monte Carlo band of ${pcs(lo)}–${pcs(hi)}. ` +
      (s === 'unsure' ? `The band straddles the ${pcs(tol)} tolerance, so this run can't say whether you're inside or outside appetite. ` : `The whole band sits ${e.p > tol ? 'above' : 'below'} the ${pcs(tol)} tolerance. `) +
      needTxt + ` The 1-in-100 year loss band is ${fm(st.b.q99lo)}–${fm(st.b.q99hi)}. See Guide, section 6.`;
  }

  // ---------- step-by-step ----------
  function renderSteps(m){
    if (!m) return;
    const i = Math.min(calcIdx, state.scen.length - 1), s = state.scen[i], p = m.P[i], st = m.states[step];
    const e = m.exB[i], ec = m.exC[i], items = [];
    const pertLine = (lab, pp, unit, mul = 1, dig = 2) => `${lab} PERT(${fr(pp.a * mul)}, ${fr(pp.m * mul)}, ${fr(pp.b * mul)})${pp.fixed ? '  fixed value' : `: α = ${fn(pp.al)}, β = ${fn(pp.be)}`}
     mean = (${fr(pp.a * mul)} + 4×${fr(pp.m * mul)} + ${fr(pp.b * mul)}) / 6 = ${fn(pp.mean * mul, dig)}${unit}`;
    if (p.mode === 'derived'){
      items.push(`<li><span class="what">Turn each frequency range into a PERT distribution, then multiply.</span>
<pre>${pertLine('TEF ', p.tef, ' attempts/yr')}
${pertLine('Vuln', p.vul, '%', 100)}
LEF = ${fn(p.tef.mean)} × ${fn(p.vul.mean * 100)}% = <span class="res">${fn(e.lef, 3)} loss events/yr</span></pre></li>`);
    } else {
      items.push(`<li><span class="what">LEF is estimated directly, as one PERT distribution.</span>
<pre>${pertLine('LEF', p.lef, ' events/yr', 1, 3)}
LEF = <span class="res">${fn(e.lef, 3)} loss events/yr</span></pre></li>`);
    }
    items.push(`<li><span class="what">Loss per event = primary loss + (chance of secondary loss × its size).</span>
<pre>E[primary]   = (${fk(s.pl[0])} + 4×${fk(s.pl[1])} + ${fk(s.pl[2])}) / 6 = ${fm(p.pl.mean)}
E[secondary] = ${pc(p.slef.mean)} × ${fm(p.slm.mean)} = ${fm(e.sec)}
per event    = <span class="res">${fm(e.perEvent)}</span></pre></li>`);
    const simAle = st.perB[i];
    items.push(`<li><span class="what">Scenario annualized loss = LEF × loss per event.</span>
<pre>exact     = ${fn(e.lef, 3)} × ${fm(e.perEvent)} = <span class="res">${fm(e.ale)}</span>
simulated = ${fm(simAle)}  (${fint(st.n)} years)
P(no ${esc(s.name.toLowerCase())} loss in a year) ≈ e^(−${fn(e.lef, 3)}) = ${pc(Math.exp(-e.lef))}${state.ctrl.on && state.ctrl.target === i ? `
with control: exact ${fm(ec.ale)}, simulated ${fm(st.perC[i])}` : ''}</pre></li>`);
    items.push(`<li><span class="what">Add every scenario, year by year, to get the annual loss.</span>
<pre>exact ALE     = ${m.exB.map(x => fm(x.ale)).join(' + ')}
              = ${fm(m.exactB)}
simulated ALE = ${fm(st.b.mean)} ± ${fm(1.96 * st.b.se)}  → <span class="res">${fm(st.b.mean)}</span></pre></li>`);
    const f = state.focus, xx = state.app[f].x * 1000, ef = st.b.exc[f];
    items.push(`<li><span class="what">Read the loss exceedance curve at the focus point and in the tail.</span>
<pre>P(loss > ${fm(xx)}) = ${fint(st.b.nOver[f])} / ${fint(st.n)} = <span class="res">${pcs(ef.p)}</span> ± ${pcs(1.96 * ef.se)}   (tolerance ${pcs(state.app[f].p / 100)})
1-in-20  = 95th percentile = ${fm(st.b.q95)}
1-in-100 = 99th percentile = ${fm(st.b.q99)}
average of worst 1% of years = ${fm(st.b.es99)}</pre></li>`);
    if (st.c){
      const d = st.b.mean - st.c.mean, cost = state.ctrl.cost * 1000, roi = cost > 0 ? (d - cost) / cost : null;
      items.push(`<li><span class="what">Value the control with the same random numbers, with and without it.</span>
<pre>ALE reduction = ${fm(st.b.mean)} − ${fm(st.c.mean)} = ${fm(d)} ± ${fm(1.96 * st.dSE)}
exact         = ${fm(m.exactB)} − ${fm(m.exactC)} = ${fm(m.exactB - m.exactC)}
return        = (${fm(d)} − ${fm(cost)}) / ${fm(cost)} = <span class="res">${roi == null ? 'n/a (no cost)' : (roi * 100).toFixed(0) + '%'}</span>
P(loss > ${fm(xx)}): ${pcs(ef.p)} → ${pcs(st.c.exc[f].p)}</pre></li>`);
    } else items.push(`<li><span class="what">The control is switched off, so there's nothing to value.</span></li>`);
    $('steps').innerHTML = items.join('');
  }

  // ---------- charts ----------
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, txt) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; return e; };
  const COL = { acc: '#6fd3a0', gold: '#f2c46d', blue: '#7fb2ff', red: '#f2818a', text: '#e6ebf2', grid: '#1c2638', axis: '#2a3850' };
  const NICE = [1e6, 3e6, 1e7, 3e7, 1e8, 3e8, 1e9, 3e9, 1e10];
  let lecGeom = null;

  function lecRange(m){
    const fin = m.states[NS - 1].b, maxApp = Math.max(...m.appX);
    const need = Math.max(fin.q999 * 1.4, maxApp * 1.4, 2e6);
    const xmax = NICE.find(v => v >= need) || 1e10;
    const xmin = m.exactB < 2e5 && xmax <= 3e7 ? 1e4 : 1e5;
    return { xmin, xmax };
  }
  function renderLec(m){
    const svg = $('lecChart'); svg.innerHTML = '';
    const W = 640, H = 330, L = 50, R = 16, T = 14, B = 42;
    const { xmin, xmax } = lecRange(m), lx0 = Math.log10(xmin), lx1 = Math.log10(xmax);
    const X = v => L + (Math.log10(v) - lx0) / (lx1 - lx0) * (W - L - R);
    const YMIN = 1e-4;
    const Y = scale === 'lin' ? (p => T + (1 - p) * (H - T - B)) : (p => T + (0 - Math.log10(Math.max(YMIN, p))) / 4 * (H - T - B));
    // grid
    const yt = scale === 'lin' ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [1e-4, 1e-3, 1e-2, 1e-1, 1];
    yt.forEach(v => {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: COL.grid }));
      svg.appendChild(el('text', { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, scale === 'lin' ? Math.round(v * 100) + '%' : (v * 100 >= 1 ? (v * 100) + '%' : (v * 100).toFixed(v < 1e-3 ? 2 : 1) + '%')));
    });
    for (let d = Math.ceil(lx0); d <= lx1; d++){
      [1, 3].forEach(mlt => {
        const v = mlt * Math.pow(10, d); if (v < xmin || v > xmax) return;
        svg.appendChild(el('line', { x1: X(v), x2: X(v), y1: T, y2: H - B, stroke: COL.grid, 'stroke-dasharray': mlt === 3 ? '2 4' : '' }));
        svg.appendChild(el('text', { x: X(v), y: H - B + 16, 'text-anchor': 'middle' }, fmAxis(v)));
      });
    }
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: COL.axis }));
    svg.appendChild(el('text', { x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle' }, 'annual loss, log scale  ·  curve = P(annual loss > x)'));
    const pts = (curve, f = p => p) => {
      let d = '', started = false;
      for (let g = 0; g < GRID.length; g++){
        const x = GRID[g]; if (x < xmin || x > xmax * 1.0001) continue;
        const p = f(curve[g], g);
        if (scale === 'log' && p <= 0){ if (started){ d += `L${X(x).toFixed(1)},${(H - B).toFixed(1)}`; } break; }
        d += `${started ? 'L' : 'M'}${X(x).toFixed(1)},${Y(Math.max(0, Math.min(1, p))).toFixed(1)}`; started = true;
      }
      return d;
    };
    const st = m.states[step];
    // band
    const n = st.n, cv = st.b.curve;
    const up = [], dn = [];
    for (let g = 0; g < GRID.length; g++){
      const x = GRID[g]; if (x < xmin || x > xmax * 1.0001) continue;
      const p = cv[g], se = Math.sqrt(p * (1 - p) / n), hi = Math.min(1, p + 1.96 * se), lo = Math.max(scale === 'log' ? YMIN : 0, p - 1.96 * se);
      if (scale === 'log' && p <= 0) break;
      up.push(`${X(x).toFixed(1)},${Y(hi).toFixed(1)}`); dn.push(`${X(x).toFixed(1)},${Y(lo).toFixed(1)}`);
    }
    if (up.length) svg.appendChild(el('path', { d: `M${up.join('L')}L${dn.reverse().join('L')}Z`, fill: 'rgba(111,211,160,.16)' }));
    for (let k = 0; k < step; k++) svg.appendChild(el('path', { d: pts(m.states[k].b.curve), fill: 'none', stroke: 'rgba(230,235,242,.2)', 'stroke-width': 1.1 }));
    if (st.c) svg.appendChild(el('path', { d: pts(st.c.curve), fill: 'none', stroke: COL.blue, 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    svg.appendChild(el('path', { d: pts(cv), fill: 'none', stroke: COL.acc, 'stroke-width': 2.8 }));
    // appetite
    const ap = appSorted().filter(a => a.x * 1000 >= xmin && a.x * 1000 <= xmax);
    if (ap.length > 1) svg.appendChild(el('path', { d: 'M' + ap.map(a => `${X(a.x * 1000).toFixed(1)},${Y(a.p / 100).toFixed(1)}`).join('L'), fill: 'none', stroke: COL.gold, 'stroke-width': 1.8, 'stroke-dasharray': '5 4' }));
    // curve sample points (current + control) for label collision checks
    const obst = [];
    [cv, st.c ? st.c.curve : null].forEach(c => { if (!c) return; for (let g = 0; g < GRID.length; g++){ const x = GRID[g]; if (x < xmin || x > xmax * 1.0001) continue; const p = c[g]; if (scale === 'log' && p <= 0) break; obst.push([X(x), Y(Math.max(0, Math.min(1, p)))]); } });
    const placed = [{ x0: W - R - 300, x1: W - R, y0: T, y1: T + 18 }];
    const apPts = ap.map(a => [X(a.x * 1000), Y(a.p / 100)]);
    apPts.forEach(q => placed.push({ x0: q[0] - 8, x1: q[0] + 8, y0: q[1] - 8, y1: q[1] + 8 }));
    ap.forEach(a => {
      const e = st.b.exc[a.i], s = statusOf(e.p, e.se, a.p / 100), cx = X(a.x * 1000), cy = Y(a.p / 100);
      const fill = s === 'in' ? COL.acc : s === 'out' ? COL.red : COL.gold;
      if (a.i === state.focus) svg.appendChild(el('circle', { cx, cy, r: 9.5, fill: 'none', stroke: COL.gold, 'stroke-width': 1.5 }));
      svg.appendChild(el('circle', { cx, cy, r: 5.5, fill, stroke: '#0a0e16', 'stroke-width': 2 }));
      const label = `${fm(a.x * 1000)} ≤ ${pcs(a.p / 100)}`, tw = label.length * 6.9 + 10, th = 18;
      const cands = [];
      [[14, -30], [14, 12], [-14 - tw, -30], [-14 - tw, 12], [14, -52], [-14 - tw, -52], [-tw / 2, -40], [-tw / 2, 18], [14, 34], [-14 - tw, 34]].forEach(([dx, dy]) => cands.push({ x0: cx + dx, y0: cy + dy, x1: cx + dx + tw, y1: cy + dy + th }));
      const score = b => {
        let sc = 0;
        if (b.x0 < L + 2 || b.x1 > W - R - 2 || b.y0 < T || b.y1 > H - B - 2) sc += 1000;
        placed.forEach(o => { if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) sc += 500; });
        obst.forEach(([px, py]) => { if (px > b.x0 - 3 && px < b.x1 + 3 && py > b.y0 - 3 && py < b.y1 + 3) sc += 10; });
        return sc;
      };
      let best = cands[0], bs = Infinity;
      cands.forEach((b, k) => { const v = score(b) + k * 0.5; if (v < bs){ bs = v; best = b; } });
      placed.push(best);
      svg.appendChild(el('line', { x1: cx, y1: cy, x2: Math.max(best.x0, Math.min(best.x1, cx)), y2: Math.max(best.y0, Math.min(best.y1, cy)), stroke: 'rgba(242,196,109,.55)', 'stroke-width': 1 }));
      svg.appendChild(el('rect', { x: best.x0, y: best.y0, width: tw, height: th, rx: 4, fill: '#0d1420', stroke: 'rgba(242,196,109,.45)', 'stroke-width': 1 }));
      svg.appendChild(el('text', { x: best.x0 + tw / 2, y: best.y0 + 13, 'text-anchor': 'middle', style: `fill:${COL.gold};font-weight:600` }, label));
    });
    svg.appendChild(el('text', { x: W - R, y: T + 12, 'text-anchor': 'end', style: `fill:${COL.text};font-weight:600` }, `${fyrs(st.n)} years · ALE ${fm(st.b.mean)} · 1-in-100 ${fm(st.b.q99)}`));
    // hover
    const guide = el('line', { x1: 0, x2: 0, y1: T, y2: H - B, stroke: COL.text, opacity: 0, 'stroke-width': 1 });
    const dot = el('circle', { cx: 0, cy: 0, r: 4, fill: COL.acc, opacity: 0 });
    svg.appendChild(guide); svg.appendChild(dot);
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', style: 'cursor:crosshair' });
    svg.appendChild(hit);
    lecGeom = { svg, W, H, L, R, T, B, xmin, xmax, X, Y, guide, dot, lx0, lx1 };
    const tip = $('lecTip');
    const move = ev => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      const lv = lx0 + (px - L) / (W - L - R) * (lx1 - lx0), xv = Math.pow(10, lv);
      const g = Math.max(0, Math.min(GRID.length - 1, Math.round((lv - 4) / 6 * 180)));
      const p = cv[g];
      guide.setAttribute('x1', px); guide.setAttribute('x2', px); guide.setAttribute('opacity', .35);
      dot.setAttribute('cx', px); dot.setAttribute('cy', Y(p)); dot.setAttribute('opacity', 1);
      tip.hidden = false;
      tip.innerHTML = `P(loss &gt; ${fm(xv)}) = <b>${pcs(p)}</b>` + (st.c ? ` · <span class="c">with control ${pcs(st.c.curve[g])}</span>` : '');
      tip.style.left = Math.min(r.width - 120, Math.max(120, px / W * r.width)) + 'px';
      tip.style.top = (Y(p) / H * r.height) + 'px';
    };
    hit.addEventListener('mousemove', move);
    hit.addEventListener('mouseleave', () => { tip.hidden = true; guide.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); });
  }

  function renderBars(m){
    const svg = $('barChart'); svg.innerHTML = '';
    const st = m.states[step], S = state.scen.length, rowH = 34, T = 8, H = T + S * rowH + 8, W = 640, L = 228, R = 112;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const vals = st.perB, cv = st.perC, tot = vals.reduce((a, b) => a + b, 0) || 1;
    const vmax = Math.max(...vals, 1);
    state.scen.forEach((s, i) => {
      const y = T + i * rowH, nm = s.name.length > 32 ? s.name.slice(0, 31) + '…' : s.name;
      const isT = st.c && state.ctrl.target === i;
      svg.appendChild(el('text', { x: L - 10, y: y + 15, 'text-anchor': 'end', style: `fill:${isT ? COL.text : '#b9c3d1'};font-family:Inter,sans-serif;font-size:12.5px` }, nm));
      const w = vals[i] / vmax * (W - L - R);
      svg.appendChild(el('rect', { x: L, y: y + 5, width: Math.max(1, w), height: isT ? 10 : 14, rx: 3, fill: COL.acc, opacity: 0.9 }));
      if (isT){ const wc = cv[i] / vmax * (W - L - R); svg.appendChild(el('rect', { x: L, y: y + 18, width: Math.max(1, wc), height: 7, rx: 2, fill: COL.blue })); }
      svg.appendChild(el('text', { x: W - R + 8, y: y + 15, 'text-anchor': 'start', style: `fill:${COL.text}` }, `${fm(vals[i])}  ${Math.round(vals[i] / tot * 100)}%`));
      if (isT) svg.appendChild(el('text', { x: W - R + 8, y: y + 28, 'text-anchor': 'start', style: `fill:${COL.blue}` }, `→ ${fm(cv[i])}`));
    });
    $('barNote').textContent = `Simulated, ${fyrs(st.n)} years · total ${fm(st.b.mean)}`;
  }

  function renderTraj(m){
    const svg = $('trajChart'); svg.innerHTML = '';
    const W = 640, H = 250, L = 56, R = 16, T = 14, B = 30, S = m.states;
    const X = n => L + (Math.log10(n) - 2) / 3 * (W - L - R);
    const f = state.focus, tol = state.app[f].p / 100;
    let get, ctrlGet, ref, refLab, fmt;
    if (metric === 'p'){
      get = s => { const e = s.b.exc[f]; return [e.p, Math.max(0, e.p - 1.96 * e.se), Math.min(1, e.p + 1.96 * e.se)]; };
      ctrlGet = s => s.c ? s.c.exc[f].p : null; ref = tol; refLab = `tolerance ${pcs(tol)}`; fmt = v => pcs(v);
    } else if (metric === 'ale'){
      get = s => [s.b.mean, s.b.mean - 1.96 * s.b.se, s.b.mean + 1.96 * s.b.se];
      ctrlGet = s => s.c ? s.c.mean : null; ref = m.exactB; refLab = `exact ${fm(m.exactB)}`; fmt = fm;
    } else {
      get = s => [s.b.q99, s.b.q99lo, s.b.q99hi];
      ctrlGet = s => s.c ? s.c.q99 : null; ref = null; refLab = ''; fmt = fm;
    }
    const V = S.map(get);
    let ymax = Math.max(...V.map(v => v[2]), ref || 0, ...S.map(s => ctrlGet(s) || 0)) * 1.12;
    let ymin = metric === 'p' ? 0 : Math.max(0, Math.min(...V.map(v => v[1]), ref || Infinity, ...S.map(s => ctrlGet(s) ?? Infinity)) * 0.88);
    if (ymax <= ymin) ymax = ymin + 1;
    const Y = v => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
    for (let k = 0; k <= 4; k++){
      const v = ymin + (ymax - ymin) * k / 4;
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: COL.grid }));
      svg.appendChild(el('text', { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    S.forEach(s => { if ([100, 1000, 10000, 100000].includes(s.n)) svg.appendChild(el('text', { x: X(s.n), y: H - 10, 'text-anchor': 'middle' }, fyrs(s.n))); });
    svg.appendChild(el('text', { x: W - R, y: H - 10, 'text-anchor': 'end', style: 'fill:#5b6678' }, ''));
    const up = S.map((s, k) => `${X(s.n).toFixed(1)},${Y(V[k][2]).toFixed(1)}`), dn = S.map((s, k) => `${X(s.n).toFixed(1)},${Y(V[k][1]).toFixed(1)}`).reverse();
    svg.appendChild(el('path', { d: `M${up.join('L')}L${dn.join('L')}Z`, fill: 'rgba(111,211,160,.14)' }));
    if (ref != null){
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: Y(ref), y2: Y(ref), stroke: COL.text, 'stroke-dasharray': '6 4', opacity: .55 }));
      svg.appendChild(el('text', { x: W - R - 4, y: Y(ref) - 6, 'text-anchor': 'end' }, refLab));
    }
    if (S[0].c) svg.appendChild(el('path', { d: 'M' + S.map(s => `${X(s.n).toFixed(1)},${Y(ctrlGet(s)).toFixed(1)}`).join('L'), fill: 'none', stroke: COL.blue, 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }));
    svg.appendChild(el('path', { d: 'M' + S.map((s, k) => `${X(s.n).toFixed(1)},${Y(V[k][0]).toFixed(1)}`).join('L'), fill: 'none', stroke: COL.acc, 'stroke-width': 2.6 }));
    S.forEach((s, k) => svg.appendChild(el('circle', { cx: X(s.n), cy: Y(V[k][0]), r: 3, fill: COL.acc, opacity: k <= step ? 1 : .35 })));
    if (step < NS - 1) svg.appendChild(el('rect', { x: X(S[step].n) + 4, y: T, width: X(NMAX) - X(S[step].n), height: H - T - B, fill: 'rgba(10,14,22,.58)' }));
    const cx = X(S[step].n);
    svg.appendChild(el('line', { x1: cx, x2: cx, y1: T, y2: H - B, stroke: COL.text, 'stroke-width': 1, opacity: .5 }));
    svg.appendChild(el('circle', { cx, cy: Y(V[step][0]), r: 5.5, fill: COL.acc, stroke: '#0a0e16', 'stroke-width': 2 }));
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', style: 'cursor:pointer' });
    hit.addEventListener('click', ev => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      let best = 0, bd = Infinity; S.forEach((s, k) => { const d = Math.abs(X(s.n) - px); if (d < bd){ bd = d; best = k; } });
      stopPlay(); setStep(best);
    });
    svg.appendChild(hit);
    const lab = metric === 'p' ? `P(loss &gt; ${fm(state.app[f].x * 1000)})` : metric === 'ale' ? 'Annualized loss' : '1-in-100 year loss';
    $('trajLegend').innerHTML = `<span><i class="sw main"></i>${lab}</span><span><i class="sw band"></i>95% Monte Carlo band</span>` +
      (S[0].c ? `<span><i class="sw ctrl"></i>With control</span>` : '') + (ref != null ? `<span><i class="sw tol"></i>${metric === 'p' ? 'Tolerance' : 'Exact value'}</span>` : '');
  }

  function renderTable(m){
    const tb = $('logBody'), f = state.focus;
    $('thFocus').innerHTML = `P(&gt; ${fm(state.app[f].x * 1000)})`;
    tb.innerHTML = m.states.map((s, k) => {
      const e = s.b.exc[f], dots = appSorted().map(a => { const x = s.b.exc[a.i], st = statusOf(x.p, x.se, a.p / 100); return `<i class="${st === 'in' ? 'g' : st === 'out' ? 'r' : 'y'}" title="${fm(a.x * 1000)}: ${pcs(x.p)}"></i>`; }).join('');
      return `<tr data-k="${k}" class="${k === step ? 'sel' : ''} ${k > step ? 'future' : ''}"><td>${fint(s.n)}</td><td>${fm(s.b.mean)} <span class="muted">±${fm(1.96 * s.b.se).replace('$', '')}</span></td>
        <td>${pcs(e.p)} <span class="muted">±${pcs(1.96 * e.se)}</span></td><td>${fm(s.b.q95)}</td><td class="bayes">${fm(s.b.q99)}</td><td>${fm(s.b.worst)}</td><td><span class="mini-dots">${dots}</span></td></tr>`;
    }).join('');
    tb.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => { stopPlay(); setStep(+tr.dataset.k); }));
  }

  // ---------- guide ----------
  function renderGuide(m){
    if (!m) return;
    const st = m.states[step], fin = m.states[NS - 1], b = st.b, f = state.focus, fx = state.app[f].x * 1000, tol = state.app[f].p / 100;
    const i = Math.min(calcIdx, state.scen.length - 1), sc = state.scen[i], p = m.P[i], e = m.exB[i];
    const nD = state.scen.filter(s => s.mode === 'derived').length, nX = state.scen.length - nD;
    const apps = appSorted();
    const appList = apps.map(a => `no more than a ${pcs(a.p / 100)} chance of losing over ${fm(a.x * 1000)}`).join('; ');
    const ef = b.exc[f], sF = statusOf(ef.p, ef.se, tol);
    const ctrl = state.ctrl, cOn = !!st.c, tgt = state.scen[ctrl.target];
    const vb = verdictOf(st, 'b'), vc = cOn ? verdictOf(st, 'c') : null;
    const note = `Worked numbers below use your current inputs, ${fint(st.n)} simulated years (the step selected in the Simulator), and the "${esc(sc.name)}" scenario chosen in "The Calculation, Step by Step."`;
    const tp = p.mode === 'derived' ? p.tef : p.lef, tpName = p.mode === 'derived' ? 'TEF' : 'LEF';
    const s1000 = m.states[3], e1000 = s1000.b.exc[f];
    const need = runsNeeded(ef.p, tol);
    const maxEvent = Math.max(...m.P.map(q => q.pl.b + q.slm.b));
    const maxEventName = state.scen[m.P.findIndex(q => q.pl.b + q.slm.b === maxEvent)].name;
    const d = cOn ? b.mean - st.c.mean : 0, cost = ctrl.cost * 1000, roi = cOn && cost > 0 ? (d - cost) / cost : null;
    const cats = [];
    if (cOn){
      if (ctrl.tef) cats.push(`an avoidance or deterrent effect that cuts TEF by ${ctrl.tef}%`);
      if (ctrl.vul) cats.push(`a vulnerability control that cuts Vulnerability by ${ctrl.vul}%`);
      if (ctrl.pl) cats.push(`a responsive control that cuts primary loss by ${ctrl.pl}%`);
      if (ctrl.sl) cats.push(`a responsive control that cuts secondary loss by ${ctrl.sl}%`);
    }
    const catTxt = cats.length ? cats.join(', and ') : 'no reductions yet (every slider is at 0%)';
    let ctrlRemark = '';
    if (cOn && roi != null){
      const fC = st.c.exc[f].p;
      ctrlRemark = roi >= 0 && fC <= tol && ef.p > tol ? 'Here the control pays for itself and also brings the focus point back inside appetite, so both arguments point the same way.'
        : roi < 0 && fC < ef.p ? 'Here the expected-loss return is negative, yet the control still lowers the tail. That is a real trade-off for leadership: paying more than the average saving to buy down the chance of a bad year.'
        : roi >= 0 ? 'Here the control pays for itself on expected loss alone.' : 'Here the control costs more than it saves on average.';
    }

    $('guideDyn').innerHTML = `
      <section class="card">
        <h2 class="g">1. The Question</h2>
        <p class="guide-note">${note}</p>
        <p>A payments fintech with about $150M in revenue keeps a register of <b>${state.scen.length}</b> cyber loss scenarios. Leadership has set a risk appetite of ${appList}. How likely is a year with losses above ${fm(fx)}? Is the firm inside appetite? And what would "${esc(ctrl.name)}" buy?</p>
        <p>At ${fint(st.n)} simulated years, the answer is an annualized loss of <b>${fm(b.mean)}</b>, a <b>${pcs(ef.p)}</b> chance of losing more than ${fm(fx)} against a ${pcs(tol)} tolerance, and a verdict of <b>${VTXT[vb].toLowerCase()}</b>${cOn ? `. With the control it's <b>${VTXT[vc].toLowerCase()}</b>` : ''}.</p>
        <div class="callout"><b>One picture instead of a heat map.</b> A loss exceedance curve shows the chance of losing more than any amount in a year. Laying the risk-appetite curve over it turns "is this risk acceptable?" into a question anyone in the boardroom can check by eye.</div>
      </section>

      <section class="card">
        <h2 class="g">2. The Open FAIR Model</h2>
        <p>Open FAIR defines risk as the probable frequency and probable magnitude of future loss. The Risk Taxonomy (O-RT) breaks each one into factors that are easier to estimate:</p>
        <pre class="eq">Risk
├─ Loss Event Frequency (LEF)              loss events per year
│   ├─ Threat Event Frequency (TEF)        attempts per year
│   └─ Vulnerability                       P(an attempt becomes a loss)
└─ Loss Magnitude (LM)                     $ per loss event
    ├─ Primary Loss                        direct cost to the firm
    └─ Secondary Loss
        ├─ Secondary Loss Event Frequency  P(stakeholders react), a probability
        └─ Secondary Loss Magnitude        fines, lawsuits, lost customers</pre>
        <p>The Risk Analysis standard (O-RA) works top-down. An analyst can estimate LEF directly when data supports it, or derive it from TEF × Vulnerability when a control acts on one of them or the decision calls for that detail. Your register has <b>${nD}</b> derived scenario${nD === 1 ? '' : 's'} and <b>${nX}</b> estimated directly.</p>
        <p>Each magnitude estimate rolls up FAIR's six forms of loss: productivity, response, replacement, fines and judgments, competitive advantage, and reputation. Primary loss usually carries the first three. Secondary loss carries the costs that arrive when regulators, customers, or partners react.</p>
        <div class="callout"><b>How deep to go.</b> The app stops at TEF and Vulnerability. Contact Frequency, Probability of Action, Threat Capability, and Resistance Strength sit lower in the taxonomy. O-RA only asks you to go as deep as the data or the decision requires.</div>
      </section>

      <section class="card">
        <h2 class="g">3. From Three Points to a Distribution</h2>
        <p>Every input is a calibrated estimate: a minimum, a most likely value, and a maximum. The app turns each one into a <b>PERT distribution</b>, a Beta distribution stretched over [min, max] with its peak at the most likely value:</p>
        <pre class="eq">α = 1 + 4·(ML − min) / (max − min)      β = 1 + 4·(max − ML) / (max − min)
X = min + (max − min)·Beta(α, β)
mean = (min + 4·ML + max) / 6</pre>
        <p>For ${esc(sc.name)}, ${tpName} is PERT(${fr(tp.a)}, ${fr(tp.m)}, ${fr(tp.b)})${tp.fixed ? ', a fixed value' : `, so α = ${fn(tp.al)}, β = ${fn(tp.be)}, the mean is <b>${fn(tp.mean, 3)}</b> a year and the standard deviation is ${fn(pertSd(tp), 3)}`}. The mean sits above the most likely value because the range stretches further to the right.</p>
        <div class="callout"><b>Why PERT?</b> O-RA 2.0 is officially agnostic about distributions, and it dropped the old "confidence in the most likely value" parameter. PERT remains the common convention, and the Open FAIR process guide assumes it, because it matches how experts give estimates and never goes outside the range they set. Section 8 covers the cost of that last property.</div>
      </section>

      <section class="card">
        <h2 class="g">4. Simulating One Year</h2>
        <p>Each simulated year runs the same recipe for every scenario:</p>
        <ol>
          <li>Draw this year's ${p.mode === 'derived' ? 'TEF and Vulnerability' : 'LEF'} from ${p.mode === 'derived' ? 'their PERT ranges and multiply them' : 'its PERT range'} to get the loss-event rate λ.</li>
          <li>Draw the number of loss events from a <b>Poisson(λ)</b> distribution.</li>
          <li>For each event, draw a primary loss. Then, with probability SLEF, add a secondary loss.</li>
          <li>Add up every event in every scenario. That's one year's total loss.</li>
        </ol>
        <pre class="eq">P(k loss events) = e^(−λ) · λ^k / k!
P(no loss from ${esc(sc.name)}) ≈ e^(−${fn(e.lef, 3)}) = ${pc(Math.exp(-e.lef))}</pre>
        <p>The expected annual loss has a closed form, so you can check the simulation against it: <b>ALE = Σ E[LEF] × (E[primary] + E[SLEF] × E[secondary])</b> = ${fm(m.exactB)}. At ${fint(st.n)} years, the simulation gives ${fm(b.mean)} ± ${fm(1.96 * b.se)}.</p>
        <div class="callout"><b>Why not just multiply LEF × LM?</b> For ${esc(sc.name)}, that would book ${fm(e.ale)} of loss every single year. Real years look different: most have no event, and a few have a large one. The exceedance curve comes from that lumpiness, so the app counts discrete events instead. Because λ is redrawn each year, the event count also reflects uncertainty about the rate itself, which makes it more variable than a plain Poisson.</div>
      </section>

      <section class="card">
        <h2 class="g">5. Reading the Curve Against Appetite</h2>
        <p>Sort the simulated years by total loss. For any amount x, the curve's height is the share of years that lost more than x:</p>
        <pre class="eq">LEC(x) = P(annual loss > x) ≈ (number of years with loss > x) / n</pre>
        <p>At ${fint(st.n)} years, ${pc(1 - b.p0)} of years have some loss. The 1-in-20 year loss (95th percentile) is ${fm(b.q95)}, the 1-in-100 year loss (99th percentile) is <b>${fm(b.q99)}</b>, and the worst 1% of years average ${fm(b.es99)}. That last figure is the expected shortfall, or tail value at risk.</p>
        <div class="tablewrap"><table class="zt">
          <tr><th>Annual loss above</th><th>Tolerance</th><th>Simulated</th><th>95% band</th><th>Status</th></tr>
          ${apps.map(a => { const x = b.exc[a.i], s = statusOf(x.p, x.se, a.p / 100); return `<tr><td>${fm(a.x * 1000)}${a.i === f ? ' ●' : ''}</td><td>${pcs(a.p / 100)}</td><td>${pcs(x.p)}</td><td>${pcs(Math.max(0, x.p - 1.96 * x.se))}–${pcs(Math.min(1, x.p + 1.96 * x.se))}</td><td>${CHIP[s]}</td></tr>`; }).join('')}
        </table></div>
        <div class="callout"><b>Why a curve, not a single line?</b> Boards usually accept frequent small losses more readily than rare large ones. A tolerance curve with points at several loss sizes captures that. A single-point appetite statement is the special case with one point, and the app lets you delete down to it.</div>
      </section>

      <section class="card">
        <h2 class="g">6. Monte Carlo Error</h2>
        <p>Every number on the Simulator tab is an estimate from a finite sample of years, so each has sampling error that shrinks with the square root of the number of runs:</p>
        <pre class="eq">SE(ALE)  = s / √n                 = ${fm(b.sd)} / √${fint(st.n)} = ${fm(b.se)}
SE(P̂)    = √( P̂·(1 − P̂) / n )      = √(${fn(ef.p, 4)} × ${fn(1 - ef.p, 4)} / ${fint(st.n)}) = ${pcs(ef.se)}
runs to separate P̂ from tolerance  ≈ P̂·(1 − P̂)·(1.96 / |P̂ − tolerance|)² = ${isFinite(need) ? fint(need) : '∞'}</pre>
        <p>At ${fint(st.n)} years, the focus estimate of ${pcs(ef.p)} has a 95% band of ±${pcs(1.96 * ef.se)}, ${sF === 'unsure' ? 'which straddles the tolerance, so the call is still open' : `which sits clear of the ${pcs(tol)} tolerance`}. At 1,000 runs, a common spreadsheet default, the band is ${pcs(e1000.p)} ± ${pcs(1.96 * e1000.se)}.</p>
        <div class="callout"><b>The tail converges last.</b> The mean is stable after a few thousand runs. A tail probability near the tolerance line, or a 1-in-100 year loss, needs far more, because only about 1% of the years inform it. If a decision rests on the tail, run enough years to put a band on it, and report that band.</div>
      </section>

      <section class="card">
        <h2 class="g">7. Controls and What They're Worth</h2>
        <p>O-RA sorts controls by the factor they change. Loss prevention controls reduce LEF, and loss mitigation controls reduce loss magnitude:</p>
        <div class="tablewrap"><table class="zt">
          <tr><th>Control type</th><th>Acts on</th><th>Slider in the app</th></tr>
          <tr><td>Avoidance</td><td>Contact Frequency → TEF</td><td>TEF −%</td></tr>
          <tr><td>Deterrent</td><td>Probability of Action → TEF</td><td>TEF −%</td></tr>
          <tr><td>Vulnerability</td><td>Resistance Strength → Vulnerability</td><td>Vulnerability −%</td></tr>
          <tr><td>Responsive</td><td>Loss Magnitude</td><td>Primary / Secondary loss −%</td></tr>
        </table></div>
        ${cOn ? `<p>"${esc(ctrl.name)}" applies to ${esc(tgt.name)} as ${catTxt}. Both runs use the <b>same random numbers</b>, so year by year the only difference is the control. That makes the comparison much sharper: the ALE reduction is ${fm(d)} ± ${fm(1.96 * st.dSE)}, a far tighter band than either ALE has on its own.</p>
        <pre class="eq">return on control = (ALE reduction − annual cost) / annual cost
                  = (${fm(d)} − ${fm(cost)}) / ${fm(cost)} = ${roi == null ? 'n/a' : (roi * 100).toFixed(0) + '%'}
P(loss > ${fm(fx)}): ${pcs(ef.p)} → ${pcs(st.c.exc[f].p)}</pre>
        <p>${ctrlRemark}</p>` : '<p>The control is switched off. Switch it on in the Simulator to see its value.</p>'}
      </section>

      <section class="card">
        <h2 class="g">8. Caveats</h2>
        <h3 class="g3">PERT caps the tail</h3>
        <p>A PERT draw can never exceed its maximum. In your register, the largest possible single event is ${fm(maxEvent)} (${esc(maxEventName)}: maximum primary plus maximum secondary loss). The worst simulated year, ${fm(fin.b.worst)}, can only exceed that when several events land in the same year. Real cyber losses have heavier tails than most experts' "maximum." A lognormal fitted to the same range, which my first design sketch used, keeps a small chance of going far beyond it. If a scenario's tail matters, stress its maximum and watch the 1-in-100 year loss move.</p>
        <h3 class="g3">Scenarios are independent</h3>
        <p>The app draws each scenario on its own. In reality, one cloud outage can trigger a vendor loss and a ransomware recovery in the same week, and a breach can bring a lawsuit and a regulator together. Positive dependence across scenarios fattens the tail beyond what this curve shows. Read the curve's upper end as a lower bound.</p>
        <h3 class="g3">Garbage in, curve out</h3>
        <p>The curve is only as good as the estimates behind it. Hubbard and Seiersen's research on calibration shows that untrained experts give ranges that are far too narrow. Calibration training, and checking estimates against incident data, matter more than any modeling choice here.</p>
        <h3 class="g3">Out of scope for version 1</h3>
        <p>Cyber insurance (deductibles and limits), multi-year horizons, and correlated scenarios are all planned for later versions.</p>
      </section>`;
  }

  // ---------- render all ----------
  function renderAll(){
    if (!model) return;
    renderKpis(model); renderPrecision(model); renderSteps(model);
    renderLec(model); renderBars(model); renderTraj(model); renderTable(model); renderGuide(model);
    const stale = !valid;
    document.querySelectorAll('.col-right .card, .kpis, .cluster-card').forEach(e => e.style.opacity = stale ? .45 : '');
    if (stale) $('simTime').textContent = 'fix inputs to re-run';
    const cr = $('ctrlResult');
    if (model.states[step].c){
      const st = model.states[step], dd = st.b.mean - st.c.mean;
      cr.textContent = `${state.scen[state.ctrl.target].name}: ALE ${fm(model.exB[state.ctrl.target].ale)} → ${fm(model.exC[state.ctrl.target].ale)} (exact) · saves ${fm(dd)}/yr`;
    } else cr.textContent = 'Control off: results show the current state only.';
  }
  function setStep(k){ step = Math.max(0, Math.min(NS - 1, k)); renderAll(); }

  // ---------- wiring ----------
  $('resetBtn').addEventListener('click', () => {
    stopPlay(); state = clone(DEFAULTS); step = NS - 1; calcIdx = 0;
    buildRegister(-1); buildAppetite(); syncCtrl(); validateAll(); model = compute(); renderAll();
  });
  $('seedBtn').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 1e6) + 1; if (validateAll()){ model = compute(); renderAll(); } });
  $('stepRange').addEventListener('input', e => { stopPlay(); setStep(+e.target.value); });
  $('prevBtn').addEventListener('click', () => { stopPlay(); setStep(step - 1); });
  $('nextBtn').addEventListener('click', () => { stopPlay(); setStep(step + 1); });
  function stopPlay(){ if (playing){ clearInterval(playing); playing = null; $('playBtn').textContent = 'Play'; } }
  $('playBtn').addEventListener('click', () => {
    if (playing) return stopPlay();
    if (step >= NS - 1) setStep(0);
    $('playBtn').textContent = 'Pause';
    playing = setInterval(() => { if (step >= NS - 1) return stopPlay(); setStep(step + 1); }, 900);
  });
  document.querySelectorAll('[data-scale]').forEach(b => b.addEventListener('click', () => {
    scale = b.dataset.scale; document.querySelectorAll('[data-scale]').forEach(x => x.classList.toggle('on', x === b)); renderLec(model);
  }));
  document.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => {
    metric = b.dataset.metric; document.querySelectorAll('[data-metric]').forEach(x => x.classList.toggle('on', x === b)); renderTraj(model);
  }));
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
    $('tab-sim').classList.toggle('hidden', t.dataset.tab !== 'sim');
    $('tab-guide').classList.toggle('hidden', t.dataset.tab !== 'guide');
  }));

  buildRegister(0); buildAppetite(); syncCtrl(); validateAll(); model = compute(); renderAll();
})();
