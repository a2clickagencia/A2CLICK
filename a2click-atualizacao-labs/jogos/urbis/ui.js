'use strict';
// ===================== INTERFACE, ENTRADA E LAÇO PRINCIPAL =====================
const $ = s => document.querySelector(s);
const UI = { tool: 'inspect', cat: null, drag: null, hover: null, panel: null, speed: 1, prevSpeed: 1, cinema: false, hidden: false, pan: null, keys: {}, inGame: false, mouse: [0, 0] };
const SPEEDS = [0, 420, 160, 55, 14];
const SPEED_MUL = [0, 1, 1.6, 2.4, 3.6];
function fmt(n) { return Math.round(n).toLocaleString('pt-BR'); }
function money(n) { return (n < 0 ? '-$' : '$') + fmt(Math.abs(n)); }

// ---------- Toasts e notícias ----------
function toast(msg, ms) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), ms || 2600); setTimeout(() => el.remove(), (ms || 2600) + 500);
}
const NEWS = [];
function news(msg, important) {
  const d = G ? MONTHS[G.month] + ' ' + G.year : '';
  NEWS.unshift({ msg, d, imp: important }); if (NEWS.length > 80) NEWS.pop();
  const t = $('#tickerText'); if (!t) return;
  t.classList.remove('slide'); void t.offsetWidth; t.textContent = msg; t.classList.add('slide');
  t.classList.toggle('imp', !!important);
  if (UI.panel === 'news') openPanel('news');
}

// ---------- Construção da interface ----------
function buildToolbar() {
  const tb = $('#toolbar'); tb.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button'); b.className = 'tbtn'; b.innerHTML = '<span>' + c.icon + '</span>'; b.title = c.n; b.dataset.cat = c.id;
    b.onclick = () => { sfx('click'); if (c.tool) { selectTool(c.tool); closeFlyout(); } else toggleFlyout(c); };
    tb.appendChild(b);
  }
  const u = document.createElement('button'); u.className = 'tbtn small'; u.innerHTML = '<span>↶</span>'; u.title = 'Desfazer (Ctrl+Z)'; u.onclick = () => undo(); tb.appendChild(u);
}
function toggleFlyout(c) {
  if (UI.cat === c.id) { closeFlyout(); return; }
  UI.cat = c.id; const f = $('#flyout'); f.innerHTML = '<div class="fly-title">' + c.n + '</div>';
  for (const k of c.items) {
    const isB = !!BLD[k], d = isB ? BLD[k] : TOOL_DEFS[k];
    const locked = isB && !isUnlocked(k), done = isB && d.once && G.built[k];
    if (k.startsWith('d') && !SETTINGS.disasters && c.id === 'disaster') continue;
    const it = document.createElement('div'); it.className = 'fitem' + (locked ? ' locked' : '') + (done ? ' done' : '') + (UI.tool === k ? ' sel' : '');
    const cost = isB ? d.c : d.cost;
    const ic = isB ? BLD_ICONS[k] : d.icon;
    let sub = cost ? '$' + fmt(cost) + (isB ? '' : (k.startsWith('z') || k === 'road' || k === 'hwy' || k === 'pline' || k === 'trees' || k.startsWith('t') || isBridgeTool(k) ? '/tile' : '')) : '';
    if (isB && d.u) sub += ' · $' + d.u + '/mês';
    if (locked) sub = '🔒 ' + lockReason(k); if (done) sub = '✔ Construído';
    const extra = isB ? (d.pw ? ' ⚡' + fmt(d.pw) + ' MW' : d.wt ? ' 💧' + fmt(d.wt) : d.house ? ' 👥' + fmt(d.house) : '') : '';
    it.innerHTML = '<div class="fic">' + ic + '</div><div class="ftx"><b>' + d.n + '</b><small>' + sub + extra + '</small></div>';
    it.title = (d.d || '') + (isB ? '\nTamanho: ' + d.s + '×' + d.s : '');
    it.onclick = () => { if (locked || done) { sfx('err'); toast(locked ? '🔒 ' + lockReason(k) : 'Marco já construído'); return; } sfx('click'); selectTool(k); if (k === 'dQuake') { earthquake(); selectTool('inspect'); } closeFlyout(); };
    f.appendChild(it);
  }
  f.classList.add('open');
  const btn = document.querySelector('.tbtn[data-cat="' + c.id + '"]'); const r = btn.getBoundingClientRect();
  f.style.top = Math.min(r.top, window.innerHeight - f.offsetHeight - 70) + 'px';
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('active', b.dataset.cat === c.id));
}
function closeFlyout() { UI.cat = null; $('#flyout').classList.remove('open'); document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active')); highlightTool(); }
function selectTool(t) { UI.tool = t; UI.drag = null; highlightTool(); const d = BLD[t] || TOOL_DEFS[t]; $('#toolLabel').textContent = t === 'inspect' ? '🔍 Inspecionar' : t === 'bulldoze' ? '🧨 Demolir' : ((BLD[t] ? BLD_ICONS[t] : d.icon) + ' ' + d.n); }
function highlightTool() {
  document.querySelectorAll('.tbtn').forEach(b => { const c = CATEGORIES.find(x => x.id === b.dataset.cat); if (!c) return; b.classList.toggle('cur', c.tool === UI.tool || (c.items && c.items.includes(UI.tool))); });
}

// ---------- HUD ----------
let hudT = 0;
function updateHUD(force) {
  if (!G) return;
  const now = performance.now(); if (!force && now - hudT < 250) return; hudT = now;
  $('#hCity').textContent = G.name;
  $('#hDate').textContent = MONTHS[G.month] + ' ' + G.year;
  const m = $('#hMoney'); m.textContent = money(G.money); m.classList.toggle('neg', G.money < 0);
  $('#hPop').textContent = fmt(G.pop);
  $('#hAppr').textContent = Math.round(G.approval) + '%';
  $('#hAppr').style.color = G.approval > 60 ? '#6ef0a0' : G.approval > 35 ? '#ffd36a' : '#ff7070';
  const pw = G.powerDem > 0 ? G.powerSup / G.powerDem : 1, wt = G.watDem > 0 ? G.watSup / G.watDem : 1;
  $('#hPow').textContent = fmt(G.powerSup) + ' / ' + fmt(G.powerDem); $('#hPow').parentNode.classList.toggle('warn', pw < 1);
  $('#hWat').textContent = fmt(G.watSup) + ' / ' + fmt(G.watDem); $('#hWat').parentNode.classList.toggle('warn', wt < 1);
  for (const [k, id] of [[1, '#dR'], [2, '#dC'], [3, '#dI']]) {
    const v = G.dem[k], el = $(id);
    el.style.height = Math.abs(v) * 50 + '%'; el.style.bottom = v >= 0 ? '50%' : (50 - Math.abs(v) * 50) + '%';
    el.style.opacity = v >= 0 ? 1 : 0.45;
  }
  const wi = { sol: '☀️', nublado: '⛅', chuva: '🌧️', tempestade: '⛈️' }[weather.kind];
  const tod = nightF > 0.5 ? '🌙' : duskF > 0.15 ? '🌇' : '';
  $('#hWeather').textContent = wi + tod;
  $('#hFps').textContent = renderStats.fps + ' fps';
  document.querySelectorAll('.spd').forEach(b => b.classList.toggle('on', +b.dataset.s === UI.speed));
  if (UI.panel && PANELS[UI.panel].live) PANELS[UI.panel].live();
}

// ---------- Painéis ----------
const PANELS = {
  budget: {
    t: '💰 Orçamento', build: () => {
      const L = G.last, row = (n, v, c) => '<tr><td>' + n + '</td><td class="' + (c || '') + '">' + money(v || 0) + '</td></tr>';
      const slider = (id, label, val, min, max, unit) => '<div class="srow"><label>' + label + '</label><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '"><span id="' + id + 'v">' + val + unit + '</span></div>';
      let h = '<h4>Impostos</h4>' + slider('txr', '🏘️ Residencial', G.taxes.r, 0, 20, '%') + slider('txc', '🏬 Comercial', G.taxes.c, 0, 20, '%') + slider('txi', '🏭 Industrial', G.taxes.i, 0, 20, '%');
      h += '<h4>Financiamento dos departamentos</h4>';
      for (const [k, n] of [['police', '👮 Polícia'], ['fire', '🚒 Bombeiros'], ['health', '🏥 Saúde'], ['edu', '🎓 Educação'], ['transit', '🚌 Transporte'], ['roads', '🛣️ Vias']]) h += slider('fd_' + k, n, G.funding[k], 0, 150, '%');
      h += '<div class="cols"><div><h4>Receitas (último mês)</h4><table>' + row('Imposto residencial', L.inc.r) + row('Imposto comercial', L.inc.c) + row('Imposto industrial', L.inc.i) + row('Contratos', L.inc.contracts) + (L.inc.casino ? row('Cassino', L.inc.casino) : '') + '<tr class="tot"><td>Total</td><td class="pos">' + money(L.income) + '</td></tr></table></div>';
      h += '<div><h4>Despesas</h4><table>' + row('Polícia', L.exp.police) + row('Bombeiros', L.exp.fire) + row('Saúde', L.exp.health) + row('Educação', L.exp.edu) + row('Transporte', L.exp.transit) + row('Energia/Água', L.exp.util) + row('Lazer/Marcos', L.exp.parks) + row('Vias', L.exp.roads) + row('Políticas', L.exp.policies) + row('Empréstimos', L.exp.loans) + '<tr class="tot"><td>Total</td><td class="neg">' + money(L.expense) + '</td></tr></table></div></div>';
      h += '<div class="bal">Saldo mensal: <b class="' + (L.income - L.expense >= 0 ? 'pos' : 'neg') + '">' + money(L.income - L.expense) + '</b></div>';
      h += '<h4>Empréstimos (7% a.a., 10 anos)</h4><div class="btns"><button data-loan="10000">$10.000</button><button data-loan="25000">$25.000</button><button data-loan="50000">$50.000</button><button data-loan="100000">$100.000</button></div>';
      if (G.loans.length) h += '<table>' + G.loans.map(l => '<tr><td>' + money(l.amount) + '</td><td>' + money(l.pay) + '/mês · ' + l.left + ' meses</td></tr>').join('') + '</table>';
      return h;
    }, bind: (el) => {
      for (const [id, k] of [['txr', 'r'], ['txc', 'c'], ['txi', 'i']]) { const s = el.querySelector('#' + id); s.oninput = () => { G.taxes[k] = +s.value; el.querySelector('#' + id + 'v').textContent = s.value + '%'; }; }
      for (const k of ['police', 'fire', 'health', 'edu', 'transit', 'roads']) { const s = el.querySelector('#fd_' + k); s.oninput = () => { G.funding[k] = +s.value; el.querySelector('#fd_' + k + 'v').textContent = s.value + '%'; }; s.onchange = () => { computeMaps(); }; }
      el.querySelectorAll('[data-loan]').forEach(b => b.onclick = () => { takeLoan(+b.dataset.loan); openPanel('budget'); });
    }
  },
  stats: {
    t: '📊 Cidade', build: () => {
      const st = G.stats, it = (n, v) => '<div class="stat"><small>' + n + '</small><b>' + v + '</b></div>';
      let h = '<div class="sgrid">' + it('População', fmt(G.pop)) + it('Recorde', fmt(G.peakPop)) + it('Empregos comércio', fmt(G.jobsC)) + it('Empregos indústria', fmt(G.jobsI)) +
        it('Desemprego', Math.max(0, Math.round((st.unemp || 0) * 100)) + '%') + it('Aprovação', Math.round(G.approval) + '%') + it('QE (Educação)', Math.round(G.eq)) + it('Indústria tecnológica', Math.round(hitechShare() * 100) + '%') +
        it('Energia', fmt(G.powerSup) + ' / ' + fmt(G.powerDem) + ' MW') + it('Água', fmt(G.watSup) + ' / ' + fmt(G.watDem)) + it('Poluição média', Math.round(st.polAvg || 0)) + it('Crime médio', Math.round(st.crimeAvg || 0)) +
        it('Trânsito médio', Math.round(st.trafAvg || 0)) + it('Valor do solo', Math.round(st.lvAvg || 0)) + it('Ruas / Avenidas', fmt(st.roads || 0) + ' / ' + fmt(st.hwys || 0)) + it('Prédio mais alto', 'Nível ' + (st.maxLvl || 0)) + '</div>';
      h += '<h4>Gráficos</h4><div class="btns gsel"><button data-g="pop" class="on">População</button><button data-g="money">Caixa</button><button data-g="appr">Aprovação</button><button data-g="jobs">Empregos</button><button data-g="fin">Receita × Despesa</button></div><canvas id="graph" width="460" height="170"></canvas>';
      h += '<h4>🗣️ Voz das ruas</h4><div class="quotes">' + citizenQuotes().map(q => '<div class="q">“' + q + '”</div>').join('') + '</div>';
      return h;
    }, bind: (el) => {
      let cur = 'pop';
      const draw = () => drawGraph(el.querySelector('#graph'), cur);
      el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { cur = b.dataset.g; el.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      draw();
    }
  },
  policies: {
    t: '📜 Políticas', build: () => {
      let h = '<p class="hint">Políticas custam por habitante/mês (mínimo $15).</p>';
      for (const k in POLICIES) {
        const p = POLICIES[k], lock = p.yr && G.year < p.yr;
        h += '<label class="pol' + (lock ? ' locked' : '') + '"><input type="checkbox" data-p="' + k + '" ' + (G.policies[k] ? 'checked' : '') + (lock ? ' disabled' : '') + '><div><b>' + p.n + '</b><small>' + p.d + ' · ' + (lock ? '🔒 ' + p.yr : money(Math.max(15, p.cost * G.pop)) + '/mês') + '</small></div></label>';
      }
      return h;
    }, bind: el => el.querySelectorAll('[data-p]').forEach(c => c.onchange = () => { G.policies[c.dataset.p] = c.checked; sfx('click'); netDirty = true; computeMaps(); computeDemand(); toast((c.checked ? '✔ Ativada: ' : '✖ Desativada: ') + POLICIES[c.dataset.p].n); })
  },
  maps: {
    t: '🗺️ Mapas de Dados', build: () => {
      let h = '<div class="ogrid"><button data-o="" class="' + (!overlay ? 'on' : '') + '">Nenhum</button>';
      for (const k in OVERLAYS) h += '<button data-o="' + k + '" class="' + (overlay === k ? 'on' : '') + '">' + OVERLAYS[k].n + '</button>';
      return h + '</div><p class="hint">Atalho: tecla M alterna o último mapa.</p>';
    }, bind: el => el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { setOverlay(b.dataset.o || null); openPanel('maps'); })
  },
  neighbors: {
    t: '🤝 Região e Contratos', build: () => {
      const c = G.contracts;
      const sp = Math.max(0, G.powerSup - G.powerDem), sw = Math.max(0, G.watSup - G.watDem);
      let h = '<p class="hint">Ruas e avenidas que chegam à borda do mapa conectam a cidade à região: +demanda comercial e industrial.</p>';
      h += '<div class="stat wide"><small>Conexões regionais</small><b>' + (G.stats.edge || 0) + ' / 12</b></div>';
      h += '<label class="pol"><input type="checkbox" data-c="power" ' + (c.power ? 'checked' : '') + '><div><b>⚡ Vender energia excedente</b><small>Vende 50% da sobra a $0,30/MW. Venda atual: ' + fmt(G.soldPower || 0) + ' MW (sobra: ' + fmt(sp) + ')</small></div></label>';
      h += '<label class="pol"><input type="checkbox" data-c="water" ' + (c.water ? 'checked' : '') + '><div><b>💧 Vender água excedente</b><small>Vende 50% da sobra. Venda atual: ' + fmt(G.soldWater || 0) + ' (sobra: ' + fmt(sw) + ')</small></div></label>';
      h += '<label class="pol"><input type="checkbox" data-c="waste" ' + (c.waste ? 'checked' : '') + '><div><b>🗑️ Receber lixo dos vizinhos</b><small>Rende $250 + $0,004/hab. por mês, mas aumenta a poluição e reduz a aprovação.</small></div></label>';
      return h;
    }, bind: el => el.querySelectorAll('[data-c]').forEach(c => c.onchange = () => { G.contracts[c.dataset.c] = c.checked; if (c.dataset.c === 'waste') { G.mod.polT = c.checked ? 9999 : 0; G.mod.pol = 0.15; G.mod.appr -= c.checked ? 3 : 0; } computeNetworks(); sfx('click'); openPanel('neighbors'); })
  },
  ach: {
    t: '🏆 Conquistas', build: () => {
      let h = '<div class="achs">';
      for (const a of ACHIEVEMENTS) h += '<div class="ach ' + (G.ach[a.id] ? 'got' : '') + '"><b>' + (G.ach[a.id] ? '🏆 ' : '🔒 ') + a.n + '</b><small>' + a.d + (G.ach[a.id] ? ' · ' + G.ach[a.id] : '') + '</small></div>';
      h += '</div><h4>Marcos da cidade</h4><div class="achs">';
      for (const k of CATEGORIES.find(c => c.id === 'mark').items) { const d = BLD[k]; h += '<div class="ach ' + (G.built[k] || (k === 'arco' && G.cnt.arco) ? 'got' : '') + '"><b>' + BLD_ICONS[k] + ' ' + d.n + '</b><small>' + (isUnlocked(k) ? 'Disponível' : '🔒 ' + lockReason(k)) + '</small></div>'; }
      return h + '</div>';
    }
  },
  news: { t: '📰 Notícias', build: () => '<div class="newslist">' + NEWS.map(n => '<div class="nw ' + (n.imp ? 'imp' : '') + '"><small>' + n.d + '</small>' + n.msg + '</div>').join('') + '</div>' },
  settings: {
    t: '⚙️ Opções', build: () => {
      const tg = (k, n) => '<label class="pol"><input type="checkbox" data-s="' + k + '" ' + (SETTINGS[k] ? 'checked' : '') + '><div><b>' + n + '</b></div></label>';
      return '<div class="btns col"><button id="bSave">💾 Salvar (Ctrl+S)</button><button id="bExport">📤 Exportar para arquivo</button><button id="bLoad">📂 Carregar cidade</button><button id="bShot">📸 Capturar tela (F2)</button><button id="bMenu">🏠 Menu principal</button></div>' +
        '<h4>Jogo</h4>' + tg('daynight', '🌗 Ciclo dia/noite') + tg('weather', '🌦️ Clima dinâmico') + tg('disasters', '🌋 Desastres aleatórios') + tg('edgeScroll', '🖱️ Rolar pela borda da tela') + tg('hq', '🖥️ Alta resolução (telas 4K — mais pesado)') + tg('autoLens', '🔎 Lente raio-X automática ao construir') +
        '<h4>Áudio</h4>' + tg('music', '🎵 Música ambiente') + tg('sfx', '🔊 Efeitos sonoros') + '<div class="srow"><label>Volume</label><input type="range" id="vol" min="0" max="100" value="' + Math.round(SETTINGS.vol * 100) + '"></div>' +
        '<h4>Atalhos</h4><p class="hint keys">WASD/Setas: mover · Roda: zoom · Botão direito: arrastar · Espaço: pausar · 1-4: velocidade · B demolir · R rua · Z zonas · P energia · I inspecionar · M mapas · F modo cinema · H esconder interface · Q/E girar a câmera · X lente raio-X · T prédios translúcidos · O ocultar prédios · Ctrl+Z desfazer · Esc cancelar</p>';
    }, bind: el => {
      el.querySelectorAll('[data-s]').forEach(c => c.onchange = () => { SETTINGS[c.dataset.s] = c.checked; saveSettings(); if (c.dataset.s === 'music') { if (c.checked) startMusic(); else stopMusic(); } if (c.dataset.s === 'hq') resize(); });
      el.querySelector('#vol').oninput = e => { setVolume(e.target.value / 100); saveSettings(); };
      el.querySelector('#bSave').onclick = quickSave; el.querySelector('#bExport').onclick = exportFile; el.querySelector('#bLoad').onclick = showLoad;
      el.querySelector('#bShot').onclick = screenshot; el.querySelector('#bMenu').onclick = () => { autosave(); showMainMenu(); };
    }
  },
};
function openPanel(id) {
  const p = $('#panel');
  if (!id || (UI.panel === id && p.dataset.toggle === '1')) { p.classList.remove('open'); UI.panel = null; document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('on')); return; }
  UI.panel = id; const P = PANELS[id];
  p.innerHTML = '<div class="ptitle">' + P.t + '<button class="x" onclick="openPanel(null)">✕</button></div><div class="pbody">' + P.build() + '</div>';
  if (P.bind) P.bind(p);
  p.classList.add('open'); p.dataset.toggle = '0';
  document.querySelectorAll('.pbtn').forEach(b => b.classList.toggle('on', b.dataset.p === id));
}
function togglePanel(id) { if (UI.panel === id) { $('#panel').dataset.toggle = '1'; openPanel(id); } else openPanel(id); }
function setOverlay(o) { overlay = o; ovDirty = true; if (o) toast('🗺️ Mapa: ' + OVERLAYS[o].n, 1200); UI.lastOverlay = o || UI.lastOverlay; $('#legend').textContent = o ? OVERLAYS[o].n : ''; $('#legend').style.display = o ? 'block' : 'none'; }

function drawGraph(c, kind) {
  const g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0, 0, w, h);
  const H = G.hist; let series;
  if (kind === 'jobs') series = [[H.r, '#5fe08a', 'Residentes'], [H.c, '#5aa0ff', 'Comércio'], [H.i, '#ffcc44', 'Indústria']];
  else if (kind === 'fin') series = [[H.inc, '#5fe08a', 'Receita'], [H.exp, '#ff6b6b', 'Despesa']];
  else series = [[H[kind], kind === 'money' ? '#ffd36a' : kind === 'appr' ? '#c78bff' : '#5fe08a', '']];
  const all = series.flatMap(s => s[0]); if (!all.length) { g.fillStyle = '#9ab'; g.font = '13px sans-serif'; g.fillText('Sem dados ainda — aguarde alguns meses.', 20, h / 2); return; }
  let mn = Math.min(0, ...all), mx = Math.max(1, ...all); const n = Math.max(...series.map(s => s[0].length));
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; for (let k = 0; k <= 4; k++) { const y = 10 + (h - 30) * k / 4; g.beginPath(); g.moveTo(40, y); g.lineTo(w - 5, y); g.stroke(); g.fillStyle = '#8899aa'; g.font = '10px sans-serif'; g.fillText(fmtShort(mx - (mx - mn) * k / 4), 2, y + 3); }
  for (const [arr, col] of series) {
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
    arr.forEach((v, k) => { const x = 40 + (w - 45) * (n <= 1 ? 1 : k / (n - 1)), y = 10 + (h - 30) * (1 - (v - mn) / (mx - mn || 1)); k ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
  let lx = 45; for (const [, col, lab] of series) if (lab) { g.fillStyle = col; g.fillRect(lx, h - 12, 10, 8); g.fillStyle = '#ccd'; g.fillText(lab, lx + 14, h - 5); lx += 90; }
}
function fmtShort(v) { const a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(0) + 'k' : Math.round(a)); }
function citizenQuotes() {
  const q = [], st = G.stats;
  if (st.polAvg > 70) q.push('Não aguento mais essa fumaça das fábricas! Quero ar puro.');
  if (st.crimeAvg > 60) q.push('Tenho medo de andar na rua à noite. Cadê a polícia?');
  if (st.trafAvg > 100) q.push('Levei duas horas para chegar ao trabalho hoje. Que trânsito!');
  if ((st.unemp || 0) > 0.12) q.push('Estou procurando emprego há meses...');
  if (G.taxes.r > 11) q.push('Os impostos estão altos demais! Assim não dá.');
  if (st.eduCov < 0.4 && G.pop > 2000) q.push('Meus filhos precisam de uma escola perto de casa.');
  if (st.unpow > 0.03) q.push('Ficamos sem luz de novo! Que absurdo.');
  if (G.approval > 70) q.push('Adoro morar aqui. Melhor prefeito(a) que já tivemos!');
  if (G.cnt.bigpark || G.cnt.park > 3) q.push('Os parques da cidade são lindos. Corro lá todo dia.');
  if (G.cnt.metro > 1) q.push('O metrô mudou a minha vida. Chego em 15 minutos!');
  if (hitechShare() > 0.4) q.push('As empresas de tecnologia estão contratando muito por aqui.');
  if (G.taxes.r <= 7) q.push('Impostos baixos? Assim que eu gosto.');
  const fill = ['Bom dia, prefeito(a)! A cidade está crescendo.', 'Que tal mais praças no meu bairro?', 'O pôr do sol na orla é o mais bonito do país.', 'Abriram uma padaria nova na minha rua!'];
  while (q.length < 4) q.push(fill[q.length]);
  return q.slice(0, 5);
}

// ---------- Eventos com escolha ----------
function showEvent(e) {
  sfx('event');
  const m = $('#modal');
  m.innerHTML = '<div class="mbox ev"><div class="evtag">📢 Evento</div><h2>' + e.t + '</h2><p>' + e.d + '</p><div class="btns"><button class="pri" id="evA">' + e.a[0] + '</button><button id="evB">' + e.b[0] + '</button></div></div>';
  m.classList.add('open'); UI.prevSpeed = UI.speed || UI.prevSpeed; setSpeed(0);
  const done = f => { if (f() === false) return; m.classList.remove('open'); pendingEvent = null; setSpeed(UI.prevSpeed || 1); updateHUD(true); };
  $('#evA').onclick = () => done(e.a[1]); $('#evB').onclick = () => done(e.b[1]);
}

// ---------- Ferramentas ----------
function linePath(x0, y0, x1, y1) {
  const out = []; const dx = x1 - x0, dy = y1 - y0;
  if (Math.abs(dx) >= Math.abs(dy)) { for (let x = x0; x !== x1 + Math.sign(dx || 1); x += Math.sign(dx || 1)) out.push([x, y0]); for (let y = y0 + Math.sign(dy); dy && y !== y1 + Math.sign(dy); y += Math.sign(dy)) out.push([x1, y]); }
  else { for (let y = y0; y !== y1 + Math.sign(dy || 1); y += Math.sign(dy || 1)) out.push([x0, y]); for (let x = x0 + Math.sign(dx); dx && x !== x1 + Math.sign(dx); x += Math.sign(dx)) out.push([x, y1]); }
  return out.filter(([x, y]) => inb(x, y));
}
function rectTiles(x0, y0, x1, y1) { const out = []; for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (inb(x, y)) out.push([x, y]); return out; }
const LINE_TOOLS = ['road', 'hwy', 'pline', 'bridge1', 'bridge2', 'bridge3', 'viaduct'];
const isBridgeTool = t => t === 'bridge1' || t === 'bridge2' || t === 'bridge3' || t === 'viaduct';
function isRectTool(t) { return t === 'bulldoze' || t === 'dezone' || t === 'trees' || t === 'tWater' || t === 'tLand' || (TOOL_DEFS[t] && TOOL_DEFS[t].zt); }
function dragTiles() {
  if (!UI.drag || !UI.hover) return [];
  const [x0, y0] = UI.drag, [x1, y1] = UI.hover.map(Math.floor);
  if (isBridgeTool(UI.tool)) { // pontes: sempre em linha reta no eixo dominante
    if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) return linePath(x0, y0, x1, y0); return linePath(x0, y0, x0, y1);
  }
  return LINE_TOOLS.includes(UI.tool) ? linePath(x0, y0, x1, y1) : rectTiles(x0, y0, x1, y1);
}
function bldAnchor(key) { const s = BLD[key].s, [gx, gy] = UI.hover; return [Math.floor(gx - s / 2 + 0.5), Math.floor(gy - s / 2 + 0.5)]; }

function applyTiles(tool, tiles) {
  beginAction(TOOL_DEFS[tool] ? TOOL_DEFS[tool].n : tool);
  let spent = 0, n = 0, broke = false;
  BLOCKED_BY_WATER = 0;
  const bAxisY = tiles.length > 1 && tiles[0][0] === tiles[tiles.length - 1][0];
  for (const [x, y] of tiles) {
    const i = idx(x, y); let c = -1;
    if (G.money - spent < 25) { broke = true; break; }
    if (isBridgeTool(tool)) c = placeBridge(i, TOOL_DEFS[tool].br, bAxisY);
    else if (tool === 'road') c = placeRoad(i, T_ROAD);
    else if (tool === 'hwy') c = placeRoad(i, T_HWY);
    else if (tool === 'pline') c = placePline(i);
    else if (tool === 'dezone') c = dezone(i);
    else if (tool === 'bulldoze') { const t = G.type[i]; if (t === T_EMPTY && !G.tree[i]) continue; if (t === T_BLD) { const d = BYID[G.bk[G.own[i]]]; if (d.once) delete G.built[d.key]; } c = clearTile(i, t === T_ZONE && G.own[i] >= 0); }
    else if (tool === 'trees') { if (G.type[i] === T_EMPTY && !G.terr[i] && G.tree[i] < 3) { touch(i); G.tree[i] = Math.min(3, G.tree[i] + 2); markDirtyIdx(i); c = 3; } }
    else if (tool === 'tWater') { if (!G.terr[i] && (G.type[i] === T_EMPTY || G.type[i] === T_RUBBLE)) { touch(i); G.terr[i] = 1; G.tree[i] = 0; G.type[i] = T_EMPTY; markDirtyIdx(i); for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny)) markDirtyIdx(idx(nx, ny)); } c = 50; } }
    else if (tool === 'tLand') { if (G.terr[i] && G.type[i] === T_EMPTY) { touch(i); G.terr[i] = 0; markDirtyIdx(i); for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny)) markDirtyIdx(idx(nx, ny)); } c = 50; } }
    else if (TOOL_DEFS[tool] && TOOL_DEFS[tool].zt) c = placeZone(i, TOOL_DEFS[tool].zt, TOOL_DEFS[tool].zd);
    if (c >= 0) { spent += c; n++; }
  }
  // roads também redesenham vizinhos (conexões)
  G.money -= spent;
  const a = endAction(); if (a) a.cost = spent;
  if (tool === 'tWater' || tool === 'tLand') computeWaterProx();
  if (n) {
    sfx(tool === 'bulldoze' ? 'bulldoze' : LINE_TOOLS.includes(tool) ? 'road' : tool.startsWith('z') ? 'zone' : 'build');
    floatText(money(-spent));
    if (tool !== 'trees') { computeNetworks(); }
  } else if (broke) { sfx('err'); toast('💸 Fundos insuficientes'); }
  if (broke && n) toast('💸 Dinheiro acabou no meio da obra');
  if (BLOCKED_BY_WATER && !isBridgeTool(tool)) { toast('🌉 A rua parou na água: use a ferramenta Ponte (menu Transporte) para atravessar.', 4200); sfx('err'); }
}
function placeBuilding(key) {
  const [ax, ay] = bldAnchor(key);
  const err = canPlaceBld(key, ax, ay);
  if (err) { sfx('err'); toast('⛔ ' + err); return; }
  const d = BLD[key];
  if (G.money < d.c) { sfx('err'); toast('💸 Fundos insuficientes: ' + d.n + ' custa ' + money(d.c)); return; }
  beginAction(d.n);
  const cost = placeBld(key, ax, ay);
  G.money -= cost; const a = endAction(); if (a) a.cost = cost;
  sfx('build'); floatText(money(-cost));
  computeNetworks(); computeMaps();
  if (d.once) { toast('🏆 Marco construído: ' + d.n + '!'); news('🎉 Inaugurado: ' + d.n + '! A população celebra.'); selectTool('inspect'); }
}
function floatText(t) {
  const el = document.createElement('div'); el.className = 'float'; el.textContent = t;
  el.style.left = UI.mouse[0] + 'px'; el.style.top = UI.mouse[1] - 20 + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1100);
}

function drawPreview() {
  if (!UI.hover || UI.cinema) return;
  const g = ctx, [gx, gy] = UI.hover, hx = Math.floor(gx), hy = Math.floor(gy);
  const t = UI.tool;
  g.lineWidth = 0.06;
  if (BLD[t]) {
    const d = BLD[t], [ax, ay] = bldAnchor(t), ok = !canPlaceBld(t, ax, ay) && G.money >= d.c;
    g.fillStyle = ok ? 'rgba(80,255,140,0.35)' : 'rgba(255,70,70,0.4)'; g.fillRect(ax, ay, d.s, d.s);
    g.strokeStyle = ok ? '#7fffb0' : '#ff7070'; g.strokeRect(ax, ay, d.s, d.s);
    const r = d.r || (d.transit ? d.r : 0);
    if (r) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.setLineDash([0.4, 0.3]); g.beginPath(); g.arc(ax + d.s / 2, ay + d.s / 2, r + d.s / 2, 0, 6.283); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill(); }
    tipText(d.n + ' — ' + money(d.c) + (canPlaceBld(t, ax, ay) ? ' · ⛔ ' + canPlaceBld(t, ax, ay) : ''));
    return;
  }
  if (t === 'inspect' || t === 'dFire' || t === 'dTornado' || t === 'dMeteor') {
    if (!inb(hx, hy)) return;
    const i = idx(hx, hy); let x0 = hx, y0 = hy, s = 1;
    if (G.own[i] >= 0) { const a = G.own[i]; x0 = a % N; y0 = (a / N) | 0; s = G.bs[a] || 1; }
    g.strokeStyle = t === 'inspect' ? 'rgba(255,255,255,0.9)' : '#ff7a30'; g.strokeRect(x0, y0, s, s);
    tipText(''); return;
  }
  const tiles = UI.drag ? dragTiles() : (inb(hx, hy) ? [[hx, hy]] : []);
  const col = t === 'bulldoze' ? 'rgba(255,80,60,0.45)' : TOOL_DEFS[t] && TOOL_DEFS[t].zt ? ({ 1: 'rgba(80,230,120,0.45)', 2: 'rgba(80,150,255,0.45)', 3: 'rgba(255,200,60,0.45)' })[TOOL_DEFS[t].zt] : 'rgba(255,255,255,0.35)';
  g.fillStyle = col; g.beginPath(); for (const [x, y] of tiles) g.rect(x + 0.04, y + 0.04, 0.92, 0.92); g.fill();
  let est = 0; const d = TOOL_DEFS[t]; if (d) for (const [x, y] of tiles) { const i = idx(x, y); est += (t === 'road' || t === 'hwy') && G.terr[i] ? d.cost * 6 : d.cost; }
  tipText(UI.drag ? (tiles.length + ' tiles · ~' + money(est)) : '');
}
let tipEl = null;
function tipText(s) { if (!tipEl) tipEl = $('#tip'); tipEl.textContent = s; tipEl.style.display = s ? 'block' : 'none'; tipEl.style.left = UI.mouse[0] + 18 + 'px'; tipEl.style.top = UI.mouse[1] + 18 + 'px'; }

// ---------- Inspeção ----------
function bName(a) { const h = hash32(a * 3 + G.vr[a]); const zt = G.zt[a]; const p = BLD_PREFIX[zt] || ['Edifício']; return p[h % p.length] + ' ' + STREET_NAMES[(h >> 8) % STREET_NAMES.length]; }
function inspect(x, y) {
  if (!inb(x, y)) return;
  const i = idx(x, y), t = G.type[i], a = G.own[i] >= 0 ? G.own[i] : i, F = G.flags[a];
  const bar = (n, v, inv) => { const p = Math.round(v / 255 * 100); const c = inv ? (p > 60 ? '#ff6b6b' : p > 30 ? '#ffd36a' : '#6ef0a0') : (p > 60 ? '#6ef0a0' : p > 30 ? '#ffd36a' : '#ff6b6b'); return '<div class="ibar"><span>' + n + '</span><div><i style="width:' + p + '%;background:' + c + '"></i></div></div>'; };
  let title = '', body = '';
  const yes = (b) => b ? '<b class="pos">Sim</b>' : '<b class="neg">Não</b>';
  if (t === T_ZONE) {
    const l = G.lvl[a], zt = G.zt[a], cap = zoneCap(zt, l, G.bs[a] || 1);
    title = l > 0 ? (ZONE_NAMES[zt] === 'Residencial' ? '🏘️ ' : zt === ZC ? '🏬 ' : '🏭 ') + bName(a) : '📐 Lote ' + ZONE_NAMES[zt];
    body += '<div class="irow">Zona: <b>' + ZONE_NAMES[zt] + ' · densidade ' + DEN_NAMES[G.zd[a]] + '</b></div>';
    if (l > 0) body += '<div class="irow">Nível: <b>' + l + ' / ' + ZMAX[zt][G.zd[a]] + '</b> · ' + (zt === ZR ? 'Moradores' : 'Empregos') + ': <b>' + fmt(F & F_ABAND ? 0 : cap) + '</b></div>';
    if (F & F_ABAND) body += '<div class="irow neg">⚠️ Prédio abandonado</div>';
    body += '<div class="irow">Energia: ' + yes(F & F_POW) + ' · Água: ' + yes(F & F_WAT) + ' · Acesso viário: ' + yes(M.rd[a] <= 3) + '</div>';
    const de = desirability(a, zt);
    body += '<div class="irow">Atratividade: <b class="' + (de > 0.3 ? 'pos' : de < -0.3 ? 'neg' : '') + '">' + (de > 0.8 ? 'Excelente' : de > 0.3 ? 'Boa' : de > -0.3 ? 'Regular' : 'Ruim') + '</b></div>';
    if (!(F & F_WAT) && l >= 2) body += '<div class="irow hint">💡 Sem água, prédios não passam do nível 2.</div>';
    if (zt !== ZI && l > 0 && l >= Math.min(ZMAX[zt][G.zd[a]], 2 + Math.floor(M.lv[a] / 255 * 11))) body += '<div class="irow hint">💡 Valorize a região (parques, serviços, menos poluição) para prédios maiores.</div>';
  } else if (t === T_BLD) {
    const d = BYID[G.bk[a]];
    title = BLD_ICONS[d.key] + ' ' + d.n; body += '<div class="irow hint">' + d.d + '</div>';
    if (d.pw) body += '<div class="irow">Produção: <b>' + fmt(plantOutput(d)) + ' MW</b></div>';
    else body += '<div class="irow">Energia: ' + yes(F & F_POW) + '</div>';
    if (d.wt) body += '<div class="irow">Água: <b>' + fmt(d.key === 'pump' && nearWater(a % N, (a / N) | 0, 1) ? d.wt * 2 : d.wt) + '</b>' + (F & F_POW ? '' : ' <b class="neg">(sem energia!)</b>') + '</div>';
    if (d.house) body += '<div class="irow">Moradores: <b>' + fmt((F & F_POW) && (F & F_WAT) ? d.house : 0) + '</b></div>';
    body += '<div class="irow">Manutenção: <b>' + money(d.u * fundOf(d)) + '/mês</b></div>';
    if (d.r) body += '<div class="irow">Raio de alcance: <b>' + d.r + ' tiles</b></div>';
  } else if (t === T_ROAD || t === T_HWY) {
    title = t === T_HWY ? '🛤️ Avenida Expressa' : '🛣️ Rua ' + STREET_NAMES[(hash32(Math.floor(x / 6) * 31 + Math.floor(y / 6)) >> 4) % STREET_NAMES.length];
    if (G.terr[i]) title = '🌉 Ponte';
    const tr = M.traf[i]; body += '<div class="irow">Trânsito: <b class="' + (tr > 160 ? 'neg' : tr > 80 ? '' : 'pos') + '">' + (tr > 200 ? 'Engarrafado' : tr > 130 ? 'Intenso' : tr > 60 ? 'Moderado' : tr > 10 ? 'Leve' : 'Livre') + '</b></div>';
  } else if (t === T_BRIDGE) {
    title = ['', '🌉 Ponte Simples', '🌁 Ponte em Arco', '🎐 Ponte Estaiada', '🛣️ Viaduto'][brKind(i)] || '🌉 Ponte';
    const tr = M.traf[i]; body += '<div class="irow">Trânsito: <b>' + (tr > 200 ? 'Engarrafado' : tr > 130 ? 'Intenso' : tr > 60 ? 'Moderado' : tr > 10 ? 'Leve' : 'Livre') + '</b></div>';
  } else if (t === T_PLINE) title = '🔌 Linha de Energia';
  else if (t === T_RUBBLE) title = '🧱 Escombros';
  else title = G.terr[i] ? '🌊 Água' : G.tree[i] ? '🌳 Floresta' : '🌱 Terreno vazio';
  body += '<div class="isep"></div>' + bar('Valor do solo', M.lv[i]) + bar('Poluição', M.pol[i], true) + bar('Crime', M.crime[i], true) + bar('Polícia', M.police[i]) + bar('Bombeiros', M.fire[i]) + bar('Saúde', M.health[i]) + bar('Educação', M.edu[i]) + bar('Lazer', M.park[i]) + bar('Transporte público', M.transit[i]);
  if (G.flags[i] & F_FIRE) body = '<div class="irow neg">🔥 EM CHAMAS!</div>' + body;
  const p = $('#inspect'); p.innerHTML = '<div class="ititle">' + title + '<button class="x" onclick="this.parentNode.parentNode.classList.remove(\'open\')">✕</button></div><small class="coord">(' + x + ', ' + y + ')</small>' + body;
  p.classList.add('open');
}

// ---------- Entrada ----------
function setupInput() {
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    audioInit(); if (AC && AC.state === 'suspended') AC.resume();
    if (!UI.inGame) return;
    closeFlyout();
    const [gx, gy] = screenToGrid(e.clientX, e.clientY);
    UI.hover = [gx, gy]; UI.mouse = [e.clientX, e.clientY];
    if (e.button === 2 || e.button === 1) { if (UI.drag) { UI.drag = null; return; } UI.pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; return; }
    if (e.button !== 0) return;
    const hx = Math.floor(gx), hy = Math.floor(gy), t = UI.tool;
    if (t === 'inspect') { inspect(hx, hy); sfx('click'); return; }
    if (BLD[t]) { placeBuilding(t); return; }
    if (t === 'dFire') { if (inb(hx, hy) && ignite(idx(hx, hy))) { sfx('alarm'); news('🔥 Incêndio iniciado!', true); } return; }
    if (t === 'dTornado') { startTornado(gx, gy); selectTool('inspect'); return; }
    if (t === 'dMeteor') { meteorStrike(hx, hy); selectTool('inspect'); return; }
    if (inb(hx, hy)) UI.drag = [hx, hy];
  });
  window.addEventListener('mousemove', e => {
    UI.mouse = [e.clientX, e.clientY];
    if (UI.pan) { const dx = e.clientX - UI.pan.x, dy = e.clientY - UI.pan.y; if (Math.abs(dx) + Math.abs(dy) > 3) UI.pan.moved = true; cam.x = UI.pan.cx - dx / cam.z; cam.y = UI.pan.cy - dy / cam.z; clampCam(); }
    if (e.target === cv) UI.hover = screenToGrid(e.clientX, e.clientY); else if (!UI.drag) { UI.hover = null; tipText(''); }
  });
  window.addEventListener('mouseup', e => {
    if (UI.pan && (e.button === 2 || e.button === 1)) { UI.pan = null; return; }
    if (e.button === 0 && UI.drag) { const tiles = dragTiles(); const t = UI.tool; UI.drag = null; applyTiles(t, tiles); }
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault(); if (!UI.inGame) return;
    const f = Math.exp(-e.deltaY * 0.0015);
    const before = screenToGrid(e.clientX, e.clientY);
    cam.z = clamp(cam.z * f, 0.18, 3); cam.tz = cam.z;
    const after = screenToGrid(e.clientX, e.clientY);
    cam.x += PX(before[0], before[1]) - PX(after[0], after[1]); cam.y += PY(before[0], before[1], 0) - PY(after[0], after[1], 0); clampCam();
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    UI.keys[e.key.toLowerCase()] = true;
    if (!UI.inGame) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === 'z') { undo(); e.preventDefault(); return; }
    if (e.ctrlKey && k === 's') { quickSave(); e.preventDefault(); return; }
    if (k === ' ') { setSpeed(UI.speed ? 0 : (UI.prevSpeed || 1)); e.preventDefault(); }
    else if (k >= '1' && k <= '4') setSpeed(+k);
    else if (k === 'escape') { if (UI.cinema) toggleCinema(); UI.drag = null; selectTool('inspect'); closeFlyout(); $('#inspect').classList.remove('open'); }
    else if (k === 'b') selectTool('bulldoze');
    else if (k === 'i') selectTool('inspect');
    else if (k === 'r') toggleFlyout(CATEGORIES.find(c => c.id === 'trans'));
    else if (k === 'z') toggleFlyout(CATEGORIES.find(c => c.id === 'zones'));
    else if (k === 'p') toggleFlyout(CATEGORIES.find(c => c.id === 'power'));
    else if (k === 'm') setOverlay(overlay ? null : (UI.lastOverlay || 'power'));
    else if (k === 'f') toggleCinema();
    else if (k === 'h') { UI.hidden = !UI.hidden; document.body.classList.toggle('hideui', UI.hidden); }
    else if (k === 'q') setRotation(ROT + 1);
    else if (k === 'e') setRotation(ROT + 3);
    else if (k === 'x') toggleVis('lens');
    else if (k === 't') toggleVis('trans');
    else if (k === 'o') toggleVis('hide');
    else if (k === 'f2') { screenshot(); e.preventDefault(); }
    else if (k === '+' || k === '=') cam.z = clamp(cam.z * 1.2, 0.18, 3);
    else if (k === '-') cam.z = clamp(cam.z / 1.2, 0.18, 3);
  });
  window.addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('resize', resize);
  const mm = $('#minimap');
  const mmGo = e => { const r = mm.getBoundingClientRect(); const [gx, gy] = minimapToGrid((e.clientX - r.left) * mm.width / r.width, (e.clientY - r.top) * mm.height / r.height); centerOn(clamp(gx, 0, N), clamp(gy, 0, N)); };
  mm.addEventListener('mousedown', e => { mmGo(e); const mv = ev => mmGo(ev); const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up); });
  document.querySelectorAll('.spd').forEach(b => b.onclick = () => { sfx('click'); setSpeed(+b.dataset.s); });
  document.querySelectorAll('.vbtn').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'rl') setRotation(ROT + 1); else if (a === 'rr') setRotation(ROT + 3); else toggleVis(b.dataset.v); });
  document.querySelectorAll('.pbtn').forEach(b => b.onclick = () => { sfx('click'); togglePanel(b.dataset.p); });
  $('#ticker').onclick = () => togglePanel('news');
}
function setSpeed(s) { if (s > 0) UI.prevSpeed = s; UI.speed = s; $('#pauseBadge').style.display = s === 0 && UI.inGame ? 'block' : 'none'; updateHUD(true); }
// ---------- Ferramentas de visibilidade ----------
const VIS_NAMES = { lens: '🔎 Lente raio-X no cursor', trans: '◐ Prédios translúcidos', hide: '▦ Ocultar prédios (planta da cidade)' };
function toggleVis(k) {
  VIS[k] = !VIS[k];
  if (k === 'hide' && VIS.hide) VIS.trans = false; if (k === 'trans' && VIS.trans) VIS.hide = false;
  toast(VIS_NAMES[k] + (VIS[k] ? ': ligado' : ': desligado'), 1200); sfx('click'); refreshViewBar();
}
function refreshViewBar() { document.querySelectorAll('.vbtn[data-v]').forEach(b => b.classList.toggle('on', !!VIS[b.dataset.v])); }
function toggleCinema() { UI.cinema = !UI.cinema; document.body.classList.toggle('cinema', UI.cinema); if (UI.cinema) { toast('🎬 Modo cinema — Esc para sair', 1800); UI.cineT = 0; } }

// ---------- Salvar / Carregar ----------
async function quickSave() { if (await saveSlot(G.name)) { toast('💾 Cidade salva: ' + G.name); sfx('cash'); } }
async function autosave() { try { if (G && UI.inGame) { await saveSlot('__auto__'); } } catch (e) { } }
async function exportFile() {
  const data = await serialize();
  if (window.native) { if (await window.native.saveFile(G.name, data)) toast('📤 Arquivo salvo!'); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data])); a.download = G.name + '.urbis'; a.click();
}
async function loadFromString(str) { try { await deserialize(str); startGame(true); toast('📂 Cidade carregada: ' + G.name); } catch (e) { console.error(e); toast('⚠️ Erro ao carregar: ' + e.message); } }
function screenshot() {
  const url = cv.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = (G ? G.name : 'urbis') + '_' + Date.now() + '.png'; a.click(); toast('📸 Captura salva');
}
function saveSettings() { try { localStorage.setItem('urbis_settings', JSON.stringify(SETTINGS)); } catch (e) { } }
function loadSettings() { try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('urbis_settings') || '{}')); } catch (e) { } }

// ---------- Menus ----------
function showMainMenu() {
  UI.inGame = false; setSpeed(0);
  document.body.classList.add('inmenu');
  const auto = localStorage.getItem('urbis_slot___auto__');
  let info = {}; try { info = JSON.parse(localStorage.getItem('urbis_info___auto__') || '{}'); } catch (e) { }
  const m = $('#menu');
  m.innerHTML = '<canvas id="skyline"></canvas><div class="mlogo"><div class="mtitle">URBIS</div><div class="msub">Construa, governe e sonhe a sua metrópole</div></div><div class="mbtns">' +
    (auto ? '<button class="pri" id="mCont">▶ Continuar<small>' + (info.city || '') + ' · ' + fmt(info.pop || 0) + ' hab. · ' + (info.year || '') + '</small></button>' : '') +
    '<button id="mNew" class="' + (auto ? '' : 'pri') + '">✨ Nova Cidade</button><button id="mLoad">📂 Carregar Cidade</button>' + (window.native ? '<button id="mQuit">🚪 Sair</button>' : '') + '</div><div class="mfoot">v1.0 · Dica: F11 tela cheia</div>';
  m.classList.add('open');
  if (auto) $('#mCont').onclick = () => loadFromString(localStorage.getItem('urbis_slot___auto__'));
  $('#mNew').onclick = showNewCity; $('#mLoad').onclick = showLoad;
  if (window.native) $('#mQuit').onclick = () => window.native.quit();
  drawMenuSkyline();
}
function drawMenuSkyline() {
  const c = $('#skyline'); c.width = window.innerWidth; c.height = window.innerHeight; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#0b1430'); gr.addColorStop(0.55, '#3a2f6b'); gr.addColorStop(0.8, '#e0785a'); gr.addColorStop(1, '#f5b26b');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  for (let k = 0; k < 120; k++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.8 + ')'; g.fillRect(Math.random() * c.width, Math.random() * c.height * 0.5, 1.5, 1.5); }
  const r = mulberry(42);
  for (let layer = 0; layer < 3; layer++) {
    let x = -20; const base = c.height * (0.78 + layer * 0.08);
    while (x < c.width) {
      const w = 30 + r() * 70, h = (60 + r() * (layer === 0 ? 380 : 220)) * (1 - layer * 0.25);
      g.fillStyle = ['#2a2450', '#1c1838', '#100d22'][layer]; g.fillRect(x, base - h, w, h + 400);
      if (layer === 0 && r() < 0.3) { g.fillRect(x + w / 2 - 2, base - h - 40, 4, 40); }
      g.fillStyle = 'rgba(255,210,130,' + (0.5 - layer * 0.12) + ')';
      for (let wy = base - h + 8; wy < base; wy += 9) for (let wx = x + 5; wx < x + w - 5; wx += 8) if (r() < 0.32) g.fillRect(wx, wy, 3, 4);
      x += w + r() * 8;
    }
  }
}
function showNewCity() {
  const m = $('#modal');
  m.innerHTML = '<div class="mbox"><h2>✨ Nova Cidade</h2>' +
    '<div class="frow"><label>Nome da cidade</label><input type="text" id="ncName" value="' + ['Nova Aurora', 'Vila Esperança', 'Porto Solar', 'Monte Verde', 'Cidade Jardim', 'Bela Lumen'][(Math.random() * 6) | 0] + '" maxlength="28"></div>' +
    '<div class="frow"><label>Tamanho do mapa</label><select id="ncSize"><option value="128">Pequeno (128×128)</option><option value="256" selected>Grande (256×256)</option><option value="384">Gigante (384×384 — 147 mil tiles)</option></select></div>' +
    '<div class="frow"><label>Terreno</label><select id="ncTerr"><option value="continente">Continente com rio</option><option value="costa">Litoral</option><option value="ilha">Ilha</option><option value="lagos">Região de lagos</option><option value="rio">Vale do rio</option><option value="plano">Planície (sem água)</option></select></div>' +
    '<div class="frow"><label>Dificuldade</label><select id="ncDiff"><option value="100000">Fácil — $100.000</option><option value="50000" selected>Normal — $50.000</option><option value="20000">Difícil — $20.000</option><option value="10000000">Sandbox — $10 milhões</option></select></div>' +
    '<div class="frow"><label>Ano inicial</label><select id="ncYear"><option value="1900">1900</option><option value="1950" selected>1950</option><option value="2000">2000</option><option value="2050">2050 (futuro)</option></select></div>' +
    '<div class="frow"><label>Semente do mapa</label><input type="text" id="ncSeed" value="' + ((Math.random() * 1e6) | 0) + '"></div>' +
    '<div class="btns"><button class="pri" id="ncGo">🏗️ Fundar cidade</button><button id="ncBack">Voltar</button></div></div>';
  m.classList.add('open');
  $('#ncBack').onclick = () => m.classList.remove('open');
  $('#ncGo').onclick = () => {
    const seedS = $('#ncSeed').value; let seed = parseInt(seedS); if (isNaN(seed)) { seed = 0; for (const ch of seedS) seed = (seed * 31 + ch.charCodeAt(0)) | 0; }
    newState({ name: $('#ncName').value || 'Nova Cidade', size: +$('#ncSize').value, terrain: $('#ncTerr').value, money: +$('#ncDiff').value, difficulty: $('#ncDiff').value, year: +$('#ncYear').value, seed: Math.abs(seed) });
    m.classList.remove('open');
    // começar com a câmera no centro, em terra
    let bx = N / 2, by = N / 2;
    for (let r = 0; r < N / 2; r += 2) { let f = false; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, x = (N / 2 + Math.cos(a) * r) | 0, y = (N / 2 + Math.sin(a) * r) | 0; if (inb(x, y) && !G.terr[idx(x, y)]) { bx = x; by = y; f = true; break; } } if (f) break; }
    centerOn(bx, by); cam.z = 1;
    startGame(false);
    news('🏗️ Bem-vindo(a), prefeito(a) de ' + G.name + '! Comece com ruas, zonas e uma usina de energia.', true);
    setTimeout(showTutorial, 400);
  };
}
function showTutorial() {
  const m = $('#modal');
  m.innerHTML = '<div class="mbox tut"><h2>🏛️ Primeiros passos</h2><ol>' +
    '<li><b>🛣️ Construa ruas</b> — elas levam energia e água a toda a cidade (clique e arraste).</li>' +
    '<li><b>🏘️ Zoneie</b> áreas residenciais, comerciais e industriais perto das ruas (até 3 tiles).</li>' +
    '<li><b>⚡ Construa uma usina</b> conectada às ruas. Sem energia nada cresce.</li>' +
    '<li><b>💧 Água</b>: bombas d\'água permitem prédios acima do nível 2.</li>' +
    '<li>Acompanhe as barras <b>R C I</b> (demanda) no topo e equilibre o orçamento 💰.</li>' +
    '<li>Serviços, parques e baixa poluição <b>valorizam o solo</b> → arranha-céus!</li></ol>' +
    '<p class="hint">Novidades do Urbis: ciclo dia/noite com luzes, clima, metrô automático, eventos com escolhas, políticas, contratos regionais, megaestruturas, desfazer (Ctrl+Z), modo cinema (F) e mapas de até 384×384.</p>' +
    '<div class="btns"><button class="pri" onclick="document.getElementById(\'modal\').classList.remove(\'open\')">Vamos lá!</button></div></div>';
  m.classList.add('open');
}
function showLoad() {
  const m = $('#modal'); const slots = listSlots().sort((a, b) => (b.info.when || 0) - (a.info.when || 0));
  m.innerHTML = '<div class="mbox"><h2>📂 Carregar Cidade</h2><div class="slots">' + (slots.length ? slots.map(s => '<div class="slot" data-k="' + encodeURIComponent(s.k) + '"><b>' + (s.k === '__auto__' ? '⏱️ Salvamento automático' : s.info.city || s.k) + '</b><small>' + fmt(s.info.pop || 0) + ' hab. · ' + (MONTHS[s.info.month] || '') + ' ' + (s.info.year || '') + ' · ' + new Date(s.info.when || 0).toLocaleString('pt-BR') + '</small><button class="del" data-del="' + encodeURIComponent(s.k) + '">🗑️</button></div>').join('') : '<p class="hint">Nenhuma cidade salva ainda.</p>') + '</div>' +
    '<div class="btns"><button id="lFile">📁 Abrir arquivo .urbis…</button><button id="lBack">Voltar</button></div><input type="file" id="lInput" accept=".urbis" style="display:none"></div>';
  m.classList.add('open');
  m.querySelectorAll('.slot').forEach(el => el.onclick = e => { if (e.target.dataset.del) return; m.classList.remove('open'); loadFromString(localStorage.getItem('urbis_slot_' + decodeURIComponent(el.dataset.k))); });
  m.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const k = decodeURIComponent(b.dataset.del); if (confirm('Excluir o salvamento "' + k + '"?')) { localStorage.removeItem('urbis_slot_' + k); localStorage.removeItem('urbis_info_' + k); showLoad(); } });
  $('#lBack').onclick = () => m.classList.remove('open');
  $('#lFile').onclick = async () => {
    if (window.native) { const s = await window.native.openFile(); if (s) { m.classList.remove('open'); loadFromString(s); } return; }
    $('#lInput').click();
  };
  $('#lInput').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { m.classList.remove('open'); loadFromString(rd.result); }; rd.readAsText(f); };
}

function startGame(loaded) {
  $('#menu').classList.remove('open'); document.body.classList.remove('inmenu');
  if (loaded) { cam.x = G.camX || 0; cam.y = G.camY || N * HH; cam.z = G.camZ || 1; }
  UI.inGame = true; FIRES.clear(); JOBS.clear(); for (let i = 0; i < N2; i++) if (G.flags[i] & F_FIRE) FIRES.add(i);
  TORNADO = null; METEORS = []; NEWS.length = 0; pendingEvent = null;
  G.unlocked = G.unlocked || {}; for (const k of BKEYS) if (isUnlocked(k)) G.unlocked[k] = 1;
  buildToolbar(); selectTool('inspect'); setSpeed(1); openPanel(null); setOverlay(null);
  $('#inspect').classList.remove('open');
  updateHUD(true);
}

// ---------- Clima ----------
function weatherDay() {
  weather.t--;
  if (weather.t <= 0) {
    const r = Math.random(), m = G.month; const wet = m <= 2 || m >= 10 ? 0.45 : 0.25;
    weather.kind = r < 1 - wet - 0.15 ? 'sol' : r < 1 - wet ? 'nublado' : r < 1 - wet * 0.25 ? 'chuva' : 'tempestade';
    weather.t = 4 + (Math.random() * 10) | 0;
  }
  if ((weather.kind === 'chuva' || weather.kind === 'tempestade') && FIRES.size) for (const i of Array.from(FIRES)) if (Math.random() < 0.2) { G.flags[i] &= ~F_FIRE; FIRES.delete(i); }
}

// ---------- Laço principal ----------
let simAcc = 0, last = performance.now(), autosaveT = 0;
function loop(now) {
  const dtms = Math.min(100, now - last); last = now; const dt = dtms / 1000;
  if (G && UI.inGame) {
    if (UI.speed > 0) {
      simAcc += dtms; const per = SPEEDS[UI.speed]; const t0 = performance.now(); let n = 0;
      while (simAcc >= per) { simDay(); weatherDay(); simAcc -= per; n++; if (performance.now() - t0 > 9) { simAcc = Math.min(simAcc, per * 2); break; } }
      G.phase = (G.phase + dt * SPEED_MUL[UI.speed] / 300) % 1;
    }
    const sun = -Math.cos(G.phase * Math.PI * 2);
    nightF = SETTINGS.daynight ? clamp((0.12 - sun) / 0.5, 0, 1) * 0.92 : 0;
    duskF = SETTINGS.daynight ? Math.max(0, 1 - Math.abs(sun - 0.02) * 4) * 0.32 : 0;
    // teclado
    const sp = 900 * dt / cam.z, K = UI.keys;
    if (K['w'] || K['arrowup']) cam.y -= sp; if (K['s'] || K['arrowdown']) cam.y += sp;
    if (K['a'] || K['arrowleft']) cam.x -= sp; if (K['d'] || K['arrowright']) cam.x += sp;
    if (SETTINGS.edgeScroll && document.hasFocus() && !UI.pan) { const [mx, my] = UI.mouse, e = 6; if (mx < e) cam.x -= sp; if (mx > W - e) cam.x += sp; if (my < e) cam.y -= sp; if (my > H - e) cam.y += sp; }
    if (UI.cinema) { UI.cineT = (UI.cineT || 0) + dt; cam.x += Math.cos(UI.cineT * 0.05) * 30 * dt; cam.y += Math.sin(UI.cineT * 0.037) * 15 * dt; cam.z = clamp(0.9 + Math.sin(UI.cineT * 0.08) * 0.35, 0.3, 2); }
    clampCam();
    runJobs(UI.speed >= 3 ? 7 : 4);   // cálculos pesados da simulação, em fatias por quadro
    autosaveT += dt; if (autosaveT > 90) { autosaveT = 0; autosave(); }
    render(dt); updateHUD();
  }
  requestAnimationFrame(loop);
}

function boot() {
  loadSettings();
  cv = $('#game'); ctx = cv.getContext('2d', { alpha: false });
  minimapInit($('#minimap'));
  resize(); setupInput();
  window.addEventListener('beforeunload', () => { autosave(); });
  if (window.native && window.native.onClosing) window.native.onClosing(async () => { try { await autosave(); } catch (e) { } window.native.quit(); });
  document.addEventListener('click', () => { audioInit(); if (AC && AC.state === 'suspended') AC.resume(); }, { once: false });
  showMainMenu();
  requestAnimationFrame(loop);
}
window.addEventListener('load', boot);
