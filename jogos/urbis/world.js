'use strict';
// ===================== ESTADO DO MUNDO =====================
let G = null;
let N = 0, N2 = 0;
const ARRAYS_U8 = ['terr', 'tree', 'type', 'zt', 'zd', 'lvl', 'bk', 'bs', 'vr', 'flags', 'burn'];

function hash32(a) { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0); }
function hrand(i, s) { return hash32(i * 7919 + (s | 0) * 104729) / 4294967296; }
function mulberry(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let RNG = Math.random;
const idx = (x, y) => y * N + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function allocArrays(g) {
  for (const k of ARRAYS_U8) g[k] = new Uint8Array(N2);
  g.own = new Int32Array(N2).fill(-1);
  g.rubT = new Uint8Array(N2);
  g.br = new Uint8Array(N2);   // pontes/viadutos (v1.2): tipo | eixo Y (bit 4)
}

function newState(opt) {
  N = opt.size; N2 = N * N;
  const g = {
    v: 1, name: opt.name || 'Nova Cidade', N, seed: opt.seed, terrainType: opt.terrain,
    money: opt.money, difficulty: opt.difficulty,
    year: opt.year, startYear: opt.year, month: 0, day: 0, totalDays: 0,
    taxes: { r: 9, c: 9, i: 9 },
    funding: { police: 100, fire: 100, health: 100, edu: 100, transit: 100, roads: 100 },
    policies: {}, built: {}, unlocked: {}, ach: {}, loans: [],
    contracts: { power: false, water: false, waste: false },
    hist: { pop: [], money: [], r: [], c: [], i: [], appr: [], inc: [], exp: [] },
    mod: { appr: 0 },
    dem: { 1: 0.6, 2: 0.2, 3: 0.5 },
    eq: 50, approval: 65, pop: 0, jobsC: 0, jobsI: 0,
    cnt: {}, stats: { maxLvl: 0, crimeAvg: 0, polAvg: 0 },
    last: { inc: {}, exp: {}, income: 0, expense: 0 },
    camX: 0, camY: 0, camZ: 1, phase: 0.3, gcur: 0,
  };
  allocArrays(g);
  G = g;
  RNG = mulberry(opt.seed);
  generateTerrain(opt.terrain, opt.seed);
  initDerived();
  return g;
}

// ---------- Ruído ----------
function makeNoise(seed) {
  const P = 256, grid = new Float32Array(P * P), r = mulberry(seed);
  for (let i = 0; i < P * P; i++) grid[i] = r();
  const sm = t => t * t * (3 - 2 * t);
  const v = (x, y) => grid[((y & 255) << 8) | (x & 255)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
function fbm(n, x, y, oct) { let s = 0, a = 0.5, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += n(x * f, y * f) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; }

function generateTerrain(kind, seed) {
  const n1 = makeNoise(seed + 11), n2 = makeNoise(seed + 77), n3 = makeNoise(seed + 333);
  const sc = 6 / N * 8;
  const r = mulberry(seed + 5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y);
    let h = fbm(n1, x * sc * 0.5, y * sc * 0.5, 5);
    const nx = x / N - 0.5, ny = y / N - 0.5;
    if (kind === 'ilha') { h = h * 0.6 + 0.55 - Math.sqrt(nx * nx + ny * ny) * 1.1; }
    else if (kind === 'costa') { h = h * 0.5 + 0.35 + (x / N) * 0.5 - 0.15; }
    else if (kind === 'lagos') { h = h * 0.9 + 0.12; }
    else if (kind === 'rio') { h = 0.75; }
    else if (kind === 'plano') { h = 1; }
    else { h = h * 0.6 + 0.42; } // continente
    G.terr[i] = h < 0.42 ? 1 : 0;
    const f = fbm(n2, x * sc, y * sc, 4);
    if (!G.terr[i] && f > 0.56) G.tree[i] = f > 0.66 ? 3 : f > 0.6 ? 2 : 1;
  }
  if (kind === 'rio' || kind === 'continente' || kind === 'costa') carveRiver(r, kind === 'rio' ? 3 : 2);
  // limpar ilhotas muito pequenas e poças
  for (let pass = 0; pass < 2; pass++) for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = idx(x, y);
    let w = 0; for (let d = 0; d < 4; d++) { const j = idx(x + DX[d], y + DY[d]); w += G.terr[j]; }
    if (G.terr[i] && w <= 1) G.terr[i] = 0;
    else if (!G.terr[i] && w >= 3) { G.terr[i] = 1; G.tree[i] = 0; }
  }
  for (let i = 0; i < N2; i++) if (G.terr[i]) G.tree[i] = 0;
}
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

function carveRiver(r, width) {
  const vertical = r() < 0.5;
  let p = N * (0.3 + r() * 0.4), drift = 0;
  for (let t = 0; t < N; t++) {
    drift += (r() - 0.5) * 0.35; drift = clamp(drift, -0.9, 0.9); p += drift;
    p = clamp(p, 8, N - 8);
    const w = width + Math.sin(t * 0.05) * 1.2;
    for (let k = -Math.ceil(w); k <= Math.ceil(w); k++) {
      const x = vertical ? Math.round(p + k) : t, y = vertical ? t : Math.round(p + k);
      if (inb(x, y)) { const i = idx(x, y); G.terr[i] = 1; G.tree[i] = 0; }
    }
  }
}

// ===================== OPERAÇÕES DE TILE =====================
let UNDO = [], curAction = null;
function beginAction(label) { curAction = { label, rec: new Map(), cost: 0 }; }
function touch(i) {
  if (!curAction || curAction.rec.has(i)) return;
  const r = {}; for (const k of ARRAYS_U8) r[k] = G[k][i]; r.own = G.own[i]; r.rubT = G.rubT[i]; r.br = G.br[i];
  curAction.rec.set(i, r);
}
function endAction() {
  const a = curAction; curAction = null;
  if (a && a.rec.size) { a.t = performance.now(); UNDO.push(a); if (UNDO.length > 30) UNDO.shift(); }
  return a;
}
function undo() {
  const a = UNDO.pop(); if (!a) { toast('Nada para desfazer'); return; }
  for (const [i, r] of a.rec) { for (const k of ARRAYS_U8) G[k][i] = r[k]; G.own[i] = r.own; G.rubT[i] = r.rubT; G.br[i] = r.br; markDirtyIdx(i); markNeighbors(i); }
  G.money += a.cost; netDirty = true; ovDirty = true;
  toast('↶ Desfeito: ' + a.label + (a.cost ? ' (+$' + fmt(a.cost) + ')' : ''));
}

let netDirty = true, ovDirty = true;

function anchorOf(i) { const o = G.own[i]; return o >= 0 ? o : i; }
function footprint(a) { const s = G.bs[a] || 1, ax = a % N, ay = (a / N) | 0, out = []; for (let y = ay; y < ay + s; y++) for (let x = ax; x < ax + s; x++) out.push(idx(x, y)); return out; }

// Remove tudo de um tile (e da construção inteira). Retorna custo.
function clearTile(i, keepZone) {
  const t = G.type[i];
  let cost = 0;
  if ((t === T_ZONE && G.own[i] >= 0) || t === T_BLD) {
    const a = G.own[i];
    const fp = footprint(a);
    const wasBld = t === T_BLD;
    for (const j of fp) {
      touch(j);
      if (wasBld) { G.type[j] = T_EMPTY; G.zt[j] = 0; G.zd[j] = 0; }
      G.own[j] = -1; G.lvl[j] = 0; G.flags[j] &= ~(F_FIRE | F_ABAND); G.burn[j] = 0; G.bs[j] = 0; G.bk[j] = 0;
      if (!keepZone && !wasBld) { G.type[j] = T_EMPTY; G.zt[j] = 0; G.zd[j] = 0; }
      markDirtyIdx(j);
    }
    cost = 5 * fp.length;
  } else if (G.br[i] && t !== T_BRIDGE) {           // viaduto sobre rua: remove só o viaduto
    touch(i); G.br[i] = 0; cost = 10; markDirtyIdx(i); markNeighbors(i);
  } else if (t !== T_EMPTY) {
    touch(i);
    if (t === T_ZONE && keepZone) return 0;
    G.type[i] = T_EMPTY; G.zt[i] = 0; G.zd[i] = 0; G.lvl[i] = 0; G.own[i] = -1; G.rubT[i] = 0; G.br[i] = 0;
    cost = t === T_RUBBLE ? 3 : t === T_BRIDGE ? 10 : 1; markDirtyIdx(i); markNeighbors(i);
  } else if (G.tree[i]) { touch(i); G.tree[i] = 0; cost = 1; markDirtyIdx(i); }
  netDirty = true;
  return cost;
}

function canBuildOn(i) { const t = G.type[i]; return !G.terr[i] && (t === T_EMPTY || t === T_RUBBLE || (t === T_ZONE && G.own[i] < 0)); }

let BLOCKED_BY_WATER = 0;
function markNeighbors(i) { const x = i % N, y = (i / N) | 0; for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny)) markDirtyIdx(idx(nx, ny)); } }
function placeRoad(i, kind) {
  const t = G.type[i];
  if (t === kind || t === T_BRIDGE) return -1;
  if (t === T_BLD || (t === T_ZONE && G.own[i] >= 0)) return -1;
  if (G.terr[i]) { BLOCKED_BY_WATER++; return -1; }   // v1.2: sobre a água é preciso construir uma PONTE
  let cost = TOOL_DEFS[kind === T_HWY ? 'hwy' : 'road'].cost;
  if (G.tree[i]) cost += 2;
  touch(i);
  G.type[i] = kind; G.zt[i] = 0; G.zd[i] = 0; G.lvl[i] = 0; G.tree[i] = 0; G.own[i] = -1;
  markDirtyIdx(i); markNeighbors(i); netDirty = true;
  return cost;
}
// Pontes e viadutos (v1.2): kind 1 simples · 2 arco · 3 estaiada · 4 viaduto
function placeBridge(i, kind, axisY) {
  const t = G.type[i], water = G.terr[i], v = kind | (axisY ? 16 : 0);
  let cost = TOOL_DEFS[['', 'bridge1', 'bridge2', 'bridge3', 'viaduct'][kind]].cost;
  if (kind === BR_VIA) {
    if (G.br[i]) return -1;
    if (t === T_ROAD || t === T_HWY) { // cruza uma rua: só se ela for perpendicular (ou cruzamento)
      touch(i); G.br[i] = v; markDirtyIdx(i); markNeighbors(i); netDirty = true; return cost;
    }
    if (!(t === T_EMPTY || t === T_RUBBLE || t === T_PLINE)) return -1;
  } else {
    if (!water) {   // terra firme no caminho da ponte: vira rua normal (ou é a própria rua de acesso)
      if (t === T_ROAD || t === T_HWY) return 0;
      return placeRoad(i, T_ROAD);
    }
    if (t !== T_EMPTY) return -1;
  }
  touch(i);
  G.type[i] = T_BRIDGE; G.br[i] = v; G.zt[i] = 0; G.zd[i] = 0; G.lvl[i] = 0; G.tree[i] = 0; G.own[i] = -1;
  markDirtyIdx(i); markNeighbors(i); netDirty = true;
  return cost;
}
function placePline(i) {
  const t = G.type[i];
  if (t !== T_EMPTY && t !== T_RUBBLE) return -1;
  let cost = G.terr[i] ? 25 : 5; if (G.tree[i]) cost += 2;
  touch(i); G.type[i] = T_PLINE; G.tree[i] = 0; markDirtyIdx(i); netDirty = true; return cost;
}
function placeZone(i, zt, zd) {
  const t = G.type[i];
  if (G.terr[i]) return -1;
  if (t === T_ZONE) {
    if (G.zt[i] === zt && G.zd[i] === zd) return -1;
    if (G.own[i] >= 0 && G.zt[i] !== zt) return -1;
    touch(i); G.zt[i] = zt; G.zd[i] = zd; markDirtyIdx(i); return 2;
  }
  if (t !== T_EMPTY && t !== T_RUBBLE) return -1;
  const cost = TOOL_DEFS['z' + 'RCI'[zt - 1] + zd].cost + (G.tree[i] ? 2 : 0);
  touch(i); G.type[i] = T_ZONE; G.zt[i] = zt; G.zd[i] = zd; G.lvl[i] = 0; G.tree[i] = 0; G.own[i] = -1; G.rubT[i] = 0;
  markDirtyIdx(i); netDirty = true; return cost;
}
// v1.3: "Remover Zona" também funciona em lotes já construídos (demole o prédio e tira a zona)
function dezone(i) {
  if (G.type[i] !== T_ZONE) return -1;
  if (G.own[i] >= 0) return clearTile(i, false);
  touch(i); G.type[i] = T_EMPTY; G.zt[i] = 0; G.zd[i] = 0; G.lvl[i] = 0; markDirtyIdx(i); netDirty = true; return 1;
}
function nearWater(ax, ay, s) {
  for (let y = ay - 1; y <= ay + s; y++) for (let x = ax - 1; x <= ax + s; x++) if (inb(x, y) && G.terr[idx(x, y)]) return true;
  return false;
}
function canPlaceBld(key, ax, ay) {
  const d = BLD[key]; const s = d.s;
  if (ax < 0 || ay < 0 || ax + s > N || ay + s > N) return 'Fora do mapa';
  for (let y = ay; y < ay + s; y++) for (let x = ax; x < ax + s; x++) if (!canBuildOn(idx(x, y))) return 'Área ocupada';
  if (d.nearWater && !nearWater(ax, ay, s)) return 'Precisa ficar junto à água';
  if (d.once && G.built[key]) return 'Marco já construído';
  if (key === 'nuclear' && G.policies.nuclearfree) return 'Proibido pela política Cidade Livre de Nucleares';
  if (!isUnlocked(key)) return lockReason(key);
  return null;
}
function placeBld(key, ax, ay) {
  const d = BLD[key], s = d.s, a = idx(ax, ay);
  let extra = 0;
  for (let y = ay; y < ay + s; y++) for (let x = ax; x < ax + s; x++) {
    const i = idx(x, y); touch(i); if (G.tree[i]) extra += 2;
    G.type[i] = T_BLD; G.own[i] = a; G.tree[i] = 0; G.zt[i] = 0; G.zd[i] = 0; G.lvl[i] = 0; G.flags[i] = 0; G.rubT[i] = 0;
    markDirtyIdx(i);
  }
  G.bk[a] = d.id; G.bs[a] = s; G.vr[a] = (RNG() * 255) | 0;
  if (d.once) G.built[key] = 1;
  netDirty = true; ovDirty = true;
  return d.c + extra;
}
function isUnlocked(key) {
  const d = BLD[key]; if (!d) return true;
  if (d.yr && G.year < d.yr) return false;
  if (d.pop && G.peakPop < d.pop) return false;
  return true;
}
function lockReason(key) {
  const d = BLD[key]; const r = [];
  if (d.yr && G.year < d.yr) r.push('disponível em ' + d.yr);
  if (d.pop && G.peakPop < d.pop) r.push('requer ' + fmt(d.pop) + ' hab.');
  return r.join(' e ');
}

function destroyTile(i, toRubble) {
  // destruição por desastre/fogo
  const t = G.type[i];
  if (t === T_EMPTY && !G.tree[i]) return;
  if (t === T_ZONE && G.own[i] >= 0 || t === T_BLD) {
    const a = G.own[i], fp = footprint(a), isB = t === T_BLD;
    const key = isB ? BYID[G.bk[a]].key : null;
    if (key && BLD[key].once) delete G.built[key];
    for (const j of fp) {
      G.own[j] = -1; G.lvl[j] = 0; G.flags[j] &= ~(F_FIRE | F_ABAND); G.burn[j] = 0; G.bs[j] = 0; G.bk[j] = 0;
      if (toRubble) { G.type[j] = T_RUBBLE; G.rubT[j] = 40 + ((RNG() * 30) | 0); if (isB) G.zt[j] = 0; }
      else { G.type[j] = isB ? T_EMPTY : T_ZONE; }
      markDirtyIdx(j);
    }
  } else if (t === T_ROAD || t === T_HWY || t === T_PLINE || t === T_BRIDGE) {
    if (!G.terr[i] || RNG() < 0.5) { G.type[i] = G.terr[i] ? T_EMPTY : T_RUBBLE; G.rubT[i] = 30; G.zt[i] = 0; G.br[i] = 0; markDirtyIdx(i); markNeighbors(i); }
  } else if (G.tree[i]) { G.tree[i] = 0; markDirtyIdx(i); }
  netDirty = true;
}

// ===================== SALVAR / CARREGAR =====================
function u8ToB64(u8) { let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
function b64ToU8(b) { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function gz(u8, dec) {
  const cs = dec ? new DecompressionStream('gzip') : new CompressionStream('gzip');
  const buf = await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer();
  return new Uint8Array(buf);
}
async function serialize() {
  G.camX = cam.x; G.camY = cam.y; G.camZ = cam.z;
  const meta = {}; for (const k in G) { if (ARRAYS_U8.includes(k) || k === 'own' || k === 'rubT' || k === 'br') continue; meta[k] = G[k]; }
  const parts = [];
  for (const k of ARRAYS_U8) parts.push(G[k]);
  parts.push(new Uint8Array(G.own.buffer.slice(0)));
  parts.push(G.rubT);
  parts.push(G.br);            // v1.2 (anexado no fim: saves antigos continuam abrindo)
  let total = 0; for (const p of parts) total += p.length;
  const all = new Uint8Array(total); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  const z = await gz(all);
  return JSON.stringify({ urbis: 1, meta, data: u8ToB64(z) });
}
async function deserialize(str) {
  const obj = JSON.parse(str);
  if (!obj.urbis) throw new Error('Arquivo inválido');
  const meta = obj.meta; N = meta.N; N2 = N * N;
  const all = await gz(b64ToU8(obj.data), true);
  const g = Object.assign({}, meta);
  let o = 0;
  for (const k of ARRAYS_U8) { g[k] = all.slice(o, o + N2); o += N2; }
  g.own = new Int32Array(all.slice(o, o + N2 * 4).buffer); o += N2 * 4;
  g.rubT = all.slice(o, o + N2); o += N2;
  g.br = all.length >= o + N2 ? all.slice(o, o + N2) : new Uint8Array(N2);
  G = g; RNG = mulberry((G.seed + G.totalDays) | 0);
  UNDO = [];
  initDerived();
  return g;
}
function listSlots() { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('urbis_slot_')) { try { const info = JSON.parse(localStorage.getItem('urbis_info_' + k.slice(11)) || '{}'); out.push({ k: k.slice(11), info }); } catch (e) { } } } return out; }
async function saveSlot(name) {
  const data = await serialize();
  try {
    localStorage.setItem('urbis_slot_' + name, data);
    localStorage.setItem('urbis_info_' + name, JSON.stringify({ city: G.name, pop: G.pop, year: G.year, month: G.month, when: Date.now() }));
    return true;
  } catch (e) { toast('⚠️ Sem espaço no armazenamento local. Exporte para arquivo.'); return false; }
}
