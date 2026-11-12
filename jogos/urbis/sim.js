'use strict';
// ===================== SIMULAÇÃO =====================
let M = {};
let QBUF = null;
const SETTINGS = { music: true, sfx: true, daynight: true, weather: true, disasters: true, autosave: 5, edgeScroll: false, vol: 0.6, autoLens: true };

function initDerived() {
  const U = () => new Uint8Array(N2), F = () => new Float32Array(N2);
  M = {
    pol: U(), lv: U(), crime: U(), traf: U(), ped: U(), police: U(), fire: U(), health: U(), edu: U(), clean: U(), park: U(), transit: U(),
    rd: U(), rnear: new Int32Array(N2), comp: new Int32Array(N2), wprox: U(), A: F(), B: F(), T: F(), bldList: [], metros: []
  };
  QBUF = new Int32Array(N2);
  if (G.peakPop == null) G.peakPop = 0;
  G.mod = Object.assign({ appr: 0 }, G.mod || {});
  if (!G.cnt) G.cnt = {};
  computeWaterProx();
  netDirty = true; ovDirty = true;
  computeNetworks(); computeTraffic(); computeMaps(); computeDemand(true);
  if (typeof renderInit === 'function') renderInit();
}

// Desfoque em caixa separável. OTIMIZAÇÃO: a passada vertical anda linha por linha
// (somas por coluna), o que é muito mais amigável ao cache que percorrer colunas.
let BLUR_CS = null;
function blur(a, tmp, r) {
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < N; y++) {
    const o = y * N; let s = 0;
    for (let x = 0; x <= r && x < N; x++) s += a[o + x];
    for (let x = 0; x < N; x++) { tmp[o + x] = s * inv; const xa = x + r + 1, xr = x - r; if (xa < N) s += a[o + xa]; if (xr >= 0) s -= a[o + xr]; }
  }
  if (!BLUR_CS || BLUR_CS.length !== N) BLUR_CS = new Float32Array(N);
  const cs = BLUR_CS; cs.fill(0);
  for (let y = 0; y <= r && y < N; y++) { const o = y * N; for (let x = 0; x < N; x++) cs[x] += tmp[o + x]; }
  for (let y = 0; y < N; y++) {
    const o = y * N; for (let x = 0; x < N; x++) a[o + x] = cs[x] * inv;
    const ya = y + r + 1, yr = y - r;
    if (ya < N) { const oa = ya * N; for (let x = 0; x < N; x++) cs[x] += tmp[oa + x]; }
    if (yr >= 0) { const orr = yr * N; for (let x = 0; x < N; x++) cs[x] -= tmp[orr + x]; }
  }
}

function computeWaterProx() {
  const A = M.A; for (let i = 0; i < N2; i++) A[i] = G.terr[i] ? 1 : 0;
  blur(A, M.T, 4); blur(A, M.T, 3);
  for (let i = 0; i < N2; i++) M.wprox[i] = G.terr[i] ? 0 : clamp(A[i] * 900, 0, 255);
  if (typeof BHT !== 'undefined' && BHT && typeof computeWaterDepth === 'function') { computeWaterDepth(); invalidateAll(); }
}


// ===================== TAREFAS FATIADAS (OTIMIZAÇÃO v1.2) =====================
// Os cálculos pesados (redes, trânsito, mapas) são geradores: rodam em fatias de poucos ms
// por quadro (runJobs), então a cidade cresce sem travar a tela, mesmo em mapas gigantes.
const JOBS = new Map();
function runGen(gen) { const it = gen(); while (!it.next().done); }
function computeNetworks() { JOBS.delete('nets'); runGen(computeNetworksGen); }
function computeTraffic() { JOBS.delete('traf'); runGen(computeTrafficGen); }
function computeMaps() { JOBS.delete('maps'); runGen(computeMapsGen); }
function scheduleJob(name, gen) { if (!JOBS.has(name)) JOBS.set(name, gen()); }
function runJobs(budgetMs) {
  const t0 = performance.now();
  for (const [name, it] of JOBS) {
    while (true) {
      if (it.next().done) { JOBS.delete(name); break; }
      if (performance.now() - t0 > budgetMs) return;
    }
  }
}

// ---------- Redes: energia, água, acesso viário, censo ----------
function consumerPower(a) {
  const t = G.type[a];
  if (t === T_ZONE) { if (G.lvl[a] === 0 || (G.flags[a] & F_ABAND)) return 0; return zoneCap(G.zt[a], G.lvl[a], G.bs[a] || 1) * 0.04 + 1; }
  if (t === T_BLD) { const d = BYID[G.bk[a]]; return d.pw ? 0 : (d.use || 4); }
  return 0;
}
function consumerWater(a) {
  const t = G.type[a];
  if (t === T_ZONE) { if (G.lvl[a] === 0 || (G.flags[a] & F_ABAND)) return 0; return zoneCap(G.zt[a], G.lvl[a], G.bs[a] || 1) * 0.03 + 1; }
  if (t === T_BLD) { const d = BYID[G.bk[a]]; if (d.wt) return 0; return d.wuse || (d.use ? d.use * 0.4 : 2); }
  return 0;
}
function plantOutput(d) {
  let p = d.pw;
  if ((d.key === 'solar' || d.key === 'wind') && G.policies.green) p *= 1.5;
  return p;
}

function* labelNet(isCond, isSrcFn, consFn) {
  const comp = M.comp, q = QBUF, type = G.type, own = G.own, F = G.flags;
  comp.fill(-1);
  const sup = [], dem = [];
  let nc = 0;
  for (let s = 0; s < N2; s++) {
    if ((s & 8191) === 0) yield;
    if (comp[s] >= 0 || !isCond(type[s])) continue;
    let h = 0, tl = 0; q[tl++] = s; comp[s] = nc; let su = 0, de = 0;
    while (h < tl) {
      const i = q[h++];
      if ((h & 16383) === 0) yield;
      const a = own[i] >= 0 ? own[i] : i;
      if (a === i) { const sp = isSrcFn(i); if (sp > 0) su += sp; else de += consFn(i); }
      const x = i % N, y = (i - x) / N;
      if (x > 0) { const j = i - 1; if (comp[j] < 0 && isCond(type[j])) { comp[j] = nc; q[tl++] = j; } }
      if (x < N - 1) { const j = i + 1; if (comp[j] < 0 && isCond(type[j])) { comp[j] = nc; q[tl++] = j; } }
      if (y > 0) { const j = i - N; if (comp[j] < 0 && isCond(type[j])) { comp[j] = nc; q[tl++] = j; } }
      if (y < N - 1) { const j = i + N; if (comp[j] < 0 && isCond(type[j])) { comp[j] = nc; q[tl++] = j; } }
    }
    sup.push(su); dem.push(de); nc++;
  }
  return { sup, dem };
}

function* computeNetworksGen() {
  const type = G.type, own = G.own, F = G.flags, bk = G.bk;
  const pmul = (G.policies.smartgrid ? 0.88 : 1) * (G.mod.powT > 0 ? 1 + G.mod.pow : 1);
  const wmul = (G.policies.watersave ? 0.8 : 1) * (G.mod.watT > 0 ? 1 + G.mod.wat : 1);
  // ENERGIA
  const condP = t => t === T_ROAD || t === T_HWY || t === T_PLINE || t === T_ZONE || t === T_BLD || t === T_BRIDGE;
  const srcP = a => { if (type[a] !== T_BLD) return 0; const d = BYID[bk[a]]; return d.pw ? plantOutput(d) : 0; };
  const r1 = yield* labelNet(condP, srcP, a => consumerPower(a) * pmul);
  let tS = 0, tD = 0; for (let c = 0; c < r1.sup.length; c++) { tS += r1.sup[c]; tD += r1.dem[c]; }
  // contrato de venda de energia
  G.soldPower = 0;
  if (G.contracts.power) {
    let best = -1, bs = 0; for (let c = 0; c < r1.sup.length; c++) { const s = r1.sup[c] - r1.dem[c]; if (s > bs) { bs = s; best = c; } }
    if (best >= 0) { G.soldPower = Math.floor(bs * 0.5); r1.sup[best] -= G.soldPower; }
  }
  const ratioP = r1.sup.map((s, c) => r1.dem[c] <= 0 ? (s > 0 ? 1 : 0) : s / r1.dem[c]);
  let unpow = 0, devTiles = 0;
  for (let i = 0; i < N2; i++) {
    const c = M.comp[i]; let p = false;
    if (c >= 0) { const r = ratioP[c]; const a = own[i] >= 0 ? own[i] : i; p = r >= 1 || (r > 0 && hrand(a, 3) < r); }
    if (p) F[i] |= F_POW; else F[i] &= ~F_POW;
  }
  G.powerSup = tS; G.powerDem = tD;
  yield;
  // ÁGUA (bombas precisam de energia)
  const condW = t => t === T_ROAD || t === T_HWY || t === T_ZONE || t === T_BLD || t === T_BRIDGE;
  const srcW = a => {
    if (type[a] !== T_BLD) return 0; const d = BYID[bk[a]]; if (!d.wt || !(F[a] & F_POW)) return 0;
    let w = d.wt; if (d.key === 'pump' && nearWater(a % N, (a / N) | 0, 1)) w *= 2; return w;
  };
  const r2 = yield* labelNet(condW, srcW, a => consumerWater(a) * wmul);
  tS = 0; tD = 0; for (let c = 0; c < r2.sup.length; c++) { tS += r2.sup[c]; tD += r2.dem[c]; }
  G.soldWater = 0;
  if (G.contracts.water) {
    let best = -1, bs = 0; for (let c = 0; c < r2.sup.length; c++) { const s = r2.sup[c] - r2.dem[c]; if (s > bs) { bs = s; best = c; } }
    if (best >= 0) { G.soldWater = Math.floor(bs * 0.5); r2.sup[best] -= G.soldWater; }
  }
  const ratioW = r2.sup.map((s, c) => r2.dem[c] <= 0 ? (s > 0 ? 1 : 0) : s / r2.dem[c]);
  for (let i = 0; i < N2; i++) {
    const c = M.comp[i]; let p = false;
    if (c >= 0) { const r = ratioW[c]; const a = own[i] >= 0 ? own[i] : i; p = r >= 1 || (r > 0 && hrand(a, 4) < r); }
    if (p) F[i] |= F_WAT; else F[i] &= ~F_WAT;
  }
  G.watSup = tS; G.watDem = tD;
  yield;

  // ACESSO VIÁRIO (BFS multi-fonte até distância 4)
  const rd = M.rd, rn = M.rnear, q = QBUF; let h = 0, tl = 0;
  rd.fill(9);
  for (let i = 0; i < N2; i++) if (type[i] === T_ROAD || type[i] === T_HWY) { rd[i] = 0; rn[i] = i; q[tl++] = i; }
  while (h < tl) {
    const i = q[h++]; const d = rd[i]; if (d >= 4) continue;
    const x = i % N, y = (i - x) / N;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx; if (rd[j] > d + 1) { rd[j] = d + 1; rn[j] = rn[i]; q[tl++] = j; }
    }
  }

  yield;
  // CENSO
  let pop = 0, jc = 0, ji = 0, maxL = 0, nR = 0, nC = 0, nI = 0, unp = 0, unw = 0, dev = 0, edge = 0;
  const cnt = {}; for (const k of BKEYS) cnt[k] = 0;
  const bl = []; const metros = [];
  let roads = 0, hwys = 0, plines = 0, bridges = 0;
  for (let i = 0; i < N2; i++) {
    const t = type[i];
    if (t === T_ROAD) roads++; else if (t === T_HWY) hwys++; else if (t === T_PLINE) plines++; else if (t === T_BRIDGE) bridges++;
    if (own[i] !== i) continue;
    if (t === T_ZONE) {
      const l = G.lvl[i]; if (l === 0) continue;
      if (l > maxL) maxL = l;
      dev++; if (!(F[i] & F_POW)) unp++; if (!(F[i] & F_WAT)) unw++;
      if (F[i] & F_ABAND) continue;
      const c = zoneCap(G.zt[i], l, G.bs[i] || 1);
      if (G.zt[i] === ZR) { pop += c; nR++; } else if (G.zt[i] === ZC) { jc += c; nC++; } else { ji += c; nI++; }
    } else if (t === T_BLD) {
      const d = BYID[bk[i]]; cnt[d.key]++; bl.push(i);
      if (d.key === 'metro') metros.push(i);
      if (d.house && (F[i] & F_POW) && (F[i] & F_WAT)) pop += d.house;
    }
  }
  for (let k = 0; k < N; k++) {
    for (const i of [idx(k, 0), idx(k, N - 1), idx(0, k), idx(N - 1, k)]) { if (type[i] === T_HWY) edge += 2; else if (type[i] === T_ROAD) edge++; }
  }
  G.pop = pop; G.jobsC = jc; G.jobsI = ji; G.cnt = cnt; G.stats.maxLvl = Math.max(G.stats.maxLvl || 0, maxL);
  G.stats.nR = nR; G.stats.nC = nC; G.stats.nI = nI; G.stats.edge = Math.min(edge, 12);
  G.stats.unpow = dev ? unp / dev : 0; G.stats.unwat = dev ? unw / dev : 0;
  G.stats.roads = roads; G.stats.hwys = hwys; G.stats.plines = plines; G.stats.bridges = bridges;
  if (pop > G.peakPop) G.peakPop = pop;
  M.bldList = bl; M.metros = metros;
  netDirty = false; ovDirty = true;
}

// ---------- Trânsito ----------
function* computeTrafficGen() {
  const A = M.A, B = M.B, type = G.type, own = G.own;
  A.fill(0);
  const pol = (G.policies.carfree ? 0.8 : 1) * (G.policies.bike ? 0.9 : 1);
  for (let i = 0; i < N2; i++) {
    if (own[i] !== i) continue;
    let trips = 0;
    if (type[i] === T_ZONE && G.lvl[i] > 0 && !(G.flags[i] & F_ABAND)) trips = zoneCap(G.zt[i], G.lvl[i], G.bs[i] || 1) * (G.zt[i] === ZR ? 0.12 : 0.09);
    else if (type[i] === T_BLD) { const d = BYID[G.bk[i]]; trips = (d.use || 0) * 0.3 + (d.house ? d.house * 0.08 : 0); }
    if (trips <= 0 || M.rd[i] > 4) continue;
    trips *= pol * (1 - M.transit[i] / 255);
    A[M.rnear[i]] += trips;
  }
  // OTIMIZAÇÃO: lista compacta só com as vias e seus vizinhos-via (em vez de varrer o mapa inteiro 10×)
  const roads = [], nb = [];
  for (let i = 0; i < N2; i++) { const t = type[i]; if (t === T_ROAD || t === T_HWY || t === T_BRIDGE) roads.push(i); }
  const RN = roads.length, isR = j => type[j] === T_ROAD || type[j] === T_HWY || type[j] === T_BRIDGE;
  const nbStart = new Int32Array(RN + 1);
  for (let k = 0; k < RN; k++) {
    const i = roads[k], x = i % N; nbStart[k] = nb.length;
    if (x > 0 && isR(i - 1)) nb.push(i - 1); if (x < N - 1 && isR(i + 1)) nb.push(i + 1);
    if (i >= N && isR(i - N)) nb.push(i - N); if (i < N2 - N && isR(i + N)) nb.push(i + N);
  }
  nbStart[RN] = nb.length;
  const nbA = Int32Array.from(nb), roadA = Int32Array.from(roads);
  yield;
  for (let it = 0; it < 10; it++) {
    if (it & 1) yield;
    for (let k = 0; k < RN; k++) {
      const i = roadA[k]; let s = A[i] * 2, n = 2;
      for (let q = nbStart[k]; q < nbStart[k + 1]; q++) { s += A[nbA[q]]; n++; }
      B[i] = s / n * 1.06;
    }
    for (let k = 0; k < RN; k++) { const i = roadA[k]; A[i] = B[i]; }
  }
  yield;
  // pedestres: proporcionais aos prédios residenciais/comerciais vizinhos da rua
  M.ped.fill(0);
  for (let k = 0; k < RN; k++) {
    const i = roadA[k]; if (type[i] !== T_ROAD) continue;
    const x = i % N, y = (i - x) / N; let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx; if (type[j] === T_ZONE && G.lvl[j] > 0 && G.zt[j] !== ZI) s += G.lvl[j] * (G.zt[j] === ZC ? 2 : 1);
      else if (type[j] === T_BLD) s += 3;
    }
    M.ped[i] = s > 255 ? 255 : s;
  }
  let sum = 0, nr = 0;
  M.traf.fill(0);
  for (let k = 0; k < RN; k++) {
    const i = roadA[k], t = type[i];
    const cap = t === T_HWY ? 160 : 40;
    const v = clamp(A[i] / cap * 140, 0, 255); M.traf[i] = v; sum += v; nr++;
  }
  G.stats.trafAvg = nr ? sum / nr : 0;
}

// ---------- Mapas: cobertura, poluição, crime, valor do solo ----------
function stamp(map, ax, ay, s, r, val, add) {
  const cx = ax + s / 2, cy = ay + s / 2, R = Math.ceil(r + s / 2);
  for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(N, Math.ceil(cy + R)); y++)
    for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(N, Math.ceil(cx + R)); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy; const d = Math.sqrt(dx * dx + dy * dy) - s / 2;
      if (d > r) continue; const v = val * (d <= 0 ? 1 : 1 - d / r * 0.7);
      const i = y * N + x; if (add) map[i] += v; else if (v > map[i]) map[i] = v;
    }
}
function fundOf(d) {
  const f = G.funding;
  if (d.cov === 'police') return f.police / 100; if (d.cov === 'fire') return f.fire / 100; if (d.cov === 'health') return f.health / 100;
  if (d.cov === 'edu') return f.edu / 100; if (d.transit) return f.transit / 100; return 1;
}
function* computeMapsGen() {
  const A = M.A, T = M.T, type = G.type, F = G.flags;
  const covs = { police: M.police, fire: M.fire, health: M.health, edu: M.edu, clean: M.clean };
  // OTIMIZAÇÃO: buffers reaproveitados entre meses (sem alocar ~4 MB por mês → menos coleta de lixo)
  if (!M.covTmp) { M.covTmp = {}; for (const k in covs) M.covTmp[k] = new Float32Array(N2); M.parkTmp = new Float32Array(N2); M.transTmp = new Float32Array(N2); }
  const tmp = M.covTmp; for (const k in tmp) tmp[k].fill(0);
  const park = M.parkTmp, transit = M.transTmp; park.fill(0); transit.fill(0);
  let apprB = 0, tour = 0;
  const metroOK = M.metros.length >= 2;
  for (const a of M.bldList) {
    const d = BYID[G.bk[a]], ax = a % N, ay = (a / N) | 0; const on = (F[a] & F_POW) || d.pw;
    if (d.cov && on) { const f = fundOf(d); stamp(tmp[d.cov], ax, ay, d.s, d.r * (0.6 + 0.4 * Math.min(f, 1.2)), 255 * Math.min(1, 0.4 + 0.6 * f)); }
    if (d.park) stamp(park, ax, ay, d.s, d.r, d.park * 45, true);
    if (d.transit && on && (d.key !== 'metro' || metroOK)) { const f = fundOf(d); stamp(transit, ax, ay, d.s, d.r, 255 * d.transit * Math.min(1.1, f)); }
    if (d.appr) apprB += d.appr; if (d.tour) tour += d.tour;
  }
  for (const k in covs) { const s = tmp[k], o = covs[k]; for (let i = 0; i < N2; i++) o[i] = s[i] > 255 ? 255 : s[i]; }
  for (let i = 0; i < N2; i++) { M.park[i] = park[i] > 255 ? 255 : park[i]; M.transit[i] = transit[i] > 255 ? 255 : transit[i]; }
  G.stats.apprB = apprB; G.stats.tour = tour;

  yield;
  // Poluição
  const hitech = hitechShare();
  const polMul = (G.policies.recycle ? 0.8 : 1) * (G.policies.bike ? 0.95 : 1) * (G.mod.polT > 0 ? 1 + G.mod.pol : 1);
  const indMul = (1 - 0.75 * hitech) * (G.policies.green ? 0.9 : 1);
  A.fill(0);
  for (let i = 0; i < N2; i++) {
    const t = type[i];
    if (t === T_ZONE && G.zt[i] === ZI && G.lvl[i] > 0) { const a = G.own[i] >= 0 ? G.own[i] : i; if (!(F[a] & F_ABAND)) A[i] += G.lvl[a] * 3 * indMul; }
    else if (t === T_BLD) { const d = BYID[G.bk[G.own[i]]]; if (d.pol) A[i] += d.pol / (d.s * d.s) * 1.2; }
    else if (t === T_ROAD || t === T_HWY) A[i] += M.traf[i] / 255 * 5;
  }
  blur(A, T, 4); yield; blur(A, T, 3); yield;
  let polSum = 0, polN = 0;
  for (let i = 0; i < N2; i++) {
    let v = A[i] * 28 * polMul - G.tree[i] * 6; v *= 1 - M.clean[i] / 255 * 0.45;
    v = clamp(v, 0, 255); M.pol[i] = v;
    if (type[i] === T_ZONE && G.zt[i] === ZR && G.lvl[i] > 0) { polSum += v; polN++; }
  }
  G.stats.polAvg = polN ? polSum / polN : 0;

  yield;
  // Crime
  A.fill(0);
  for (let i = 0; i < N2; i++) {
    if (type[i] === T_ZONE && G.lvl[i] > 0) { const a = G.own[i] >= 0 ? G.own[i] : i; A[i] += (F[a] & F_ABAND) ? 14 : (G.zt[i] === ZI ? 1.5 : 2.2) * Math.sqrt(G.lvl[a]); }
  }
  if (G.mod.casino) { for (const a of M.bldList) { } }
  blur(A, T, 3); yield; blur(A, T, 2); yield;
  const crMul = (G.policies.curfew ? 0.85 : 1) * (G.policies.neighborhood ? 0.92 : 1) * (G.mod.casino ? 1.12 : 1);
  let crSum = 0, crN = 0;
  for (let i = 0; i < N2; i++) {
    let v = A[i] * 30 * crMul; v += (128 - M.lv[i]) / 128 * 12 * (A[i] > 0.3 ? 1 : 0);
    v *= 1 - M.police[i] / 255 * 0.85;
    v = clamp(v, 0, 255); M.crime[i] = v;
    if (type[i] === T_ZONE && G.lvl[i] > 0) { crSum += v; crN++; }
  }
  G.stats.crimeAvg = crN ? crSum / crN : 0;

  yield;
  // Valor do solo
  A.fill(0); const B = M.B; B.fill(0);
  for (let i = 0; i < N2; i++) { A[i] = G.tree[i] * 6; if (type[i] === T_ZONE && G.zt[i] === ZC && G.lvl[i] > 0) B[i] = G.lvl[i]; }
  blur(A, T, 3); yield; blur(B, T, 10); yield; blur(B, T, 8); yield;
  let lvSum = 0, lvN = 0;
  for (let i = 0; i < N2; i++) {
    let v = 70 + M.wprox[i] * 0.45 + M.park[i] * 0.5 + A[i] * 1.5 + (M.health[i] + M.edu[i]) * 0.1 + M.police[i] * 0.05
      + Math.min(60, B[i] * 90) - M.pol[i] * 0.55 - M.crime[i] * 0.35 - (type[i] === T_HWY ? 25 : 0);
    v = clamp(v, 0, 255); M.lv[i] = v;
    if (type[i] === T_ZONE) { lvSum += v; lvN++; }
  }
  G.stats.lvAvg = lvN ? lvSum / lvN : 100;
  ovDirty = true;
}

function hitechShare() { return clamp((G.eq - 70) / 60 + (G.mod.techT > 0 ? G.mod.tech : 0), 0, 1); }

// ---------- Demanda ----------
function computeDemand(init) {
  const pop = G.pop, jc = G.jobsC, ji = G.jobsI, jobs = jc + ji;
  const tour = (G.stats.tour || 0) + (G.policies.tourism ? 0.08 : 0);
  const ext = 1 + (G.stats.edge || 0) * 0.04;
  const ht = hitechShare();
  let rT = jobs * 1.9 + 450, cT = (pop * 0.24 + 100) * (1 + tour) * ext, iT = (pop * 0.3 + 350) * ext * (0.8 + 0.4 * ht);
  if (G.cnt && G.cnt.airport) { cT *= 1.1; iT *= 1.1; }
  let r = (rT - pop) / Math.max(rT, pop, 400), c = (cT - jc) / Math.max(cT, jc, 150), i = (iT - ji) / Math.max(iT, ji, 200);
  r *= 1.4; c *= 1.4; i *= 1.4;
  r -= (G.taxes.r - 9) * 0.07; c -= (G.taxes.c - 9) * 0.07; i -= (G.taxes.i - 9) * 0.07;
  if (G.policies.freezone) i += 0.15;
  if (G.policies.curfew) c -= 0.06;
  if (G.mod.cdemT > 0) c += G.mod.cdem; if (G.mod.idemT > 0) i += G.mod.idem;
  if (G.approval < 30) r -= 0.2;
  if (G.stats.unpow > 0.3) { r -= 0.2; c -= 0.2; i -= 0.2; }
  r = clamp(r, -1, 1); c = clamp(c, -1, 1); i = clamp(i, -1, 1);
  const k = init ? 1 : 0.45;
  G.dem[1] += (r - G.dem[1]) * k; G.dem[2] += (c - G.dem[2]) * k; G.dem[3] += (i - G.dem[3]) * k;
  G.stats.unemp = pop > 0 ? (pop * 0.5 - jobs) / (pop * 0.5) : 0;
}

// ---------- Crescimento diário ----------
const PRIME = 40009;
function growthPass() {
  const per = Math.ceil(N2 / DAYS_PER_MONTH);
  let k = G.gcur;
  for (let n = 0; n < per; n++) {
    k = (k + 1) % N2;
    const i = (k * PRIME) % N2;
    if (G.type[i] === T_ZONE && (G.own[i] < 0 || G.own[i] === i)) evalZone(i);
    else if (G.type[i] === T_RUBBLE) { if (G.rubT[i] > 0) G.rubT[i]--; if (G.rubT[i] === 0) { G.type[i] = G.zt[i] ? T_ZONE : T_EMPTY; G.lvl[i] = 0; markDirtyIdx(i); } }
    else if (G.type[i] === T_EMPTY && !G.terr[i] && G.tree[i] < 3 && RNG() < 0.004) {
      // árvores crescem lentamente perto de outras árvores
      const x = i % N; if (x > 0 && G.tree[i - 1] || x < N - 1 && G.tree[i + 1]) { G.tree[i]++; markDirtyIdx(i); }
    }
  }
  G.gcur = k;
}

function desirability(i, zt) {
  const lv = M.lv[i], pol = M.pol[i], cr = M.crime[i], tr = M.rd[i] <= 4 ? M.traf[M.rnear[i]] : 0;
  let d = G.dem[zt] * 2.2;
  if (zt === ZR) d += (lv - 110) / 128 * 1.2 - pol / 255 * 1.6 - cr / 255 * 1.1 + (M.edu[i] + M.health[i]) / 255 * 0.25 - tr / 255 * 0.3;
  else if (zt === ZC) d += (lv - 100) / 128 * 1.0 - pol / 255 * 0.6 - cr / 255 * 0.9 - tr / 255 * 0.5 + Math.min(tr, 120) / 255 * 0.3;
  else d += (lv - 80) / 128 * 0.25 - cr / 255 * 0.4 - tr / 255 * 0.4;
  return d;
}

function evalZone(i) {
  const F = G.flags, zt = G.zt[i], zd = G.zd[i];
  const s = G.bs[i] || 1;
  const lvl = G.lvl[i];
  const roadOK = M.rd[i] <= 3 || (s > 1 && (M.rd[i + 1] <= 3 || M.rd[i + N] <= 3 || M.rd[i + N + 1] <= 3));
  const pow = F[i] & F_POW, wat = F[i] & F_WAT;
  if (G.flags[i] & F_FIRE) return;
  const d = desirability(i, zt) + (RNG() - 0.5) * 0.6;
  if (lvl === 0) {
    if (!roadOK || !pow) return;
    if (d > 0.1 && RNG() < 0.5) { G.lvl[i] = 1; G.vr[i] = (RNG() * 255) | 0; G.own[i] = i; G.bs[i] = 1; markDirtyIdx(i); }
    return;
  }
  // abandono
  if (F[i] & F_ABAND) {
    if (pow && roadOK && d > 0.3 && RNG() < 0.3) { G.flags[i] &= ~F_ABAND; G.vr[i] = (RNG() * 255) | 0; markDirtyAll(i); }
    else if (RNG() < 0.04) { // demolição natural
      for (const j of footprint(i)) { G.own[j] = -1; G.lvl[j] = 0; G.bs[j] = 0; G.flags[j] &= ~F_ABAND; markDirtyIdx(j); }
    }
    return;
  }
  if ((!pow || !roadOK) && RNG() < 0.25) { setAband(i); return; }
  let cap = ZMAX[zt][zd];
  if (!wat) cap = Math.min(cap, 2);
  if (zt !== ZI) cap = Math.min(cap, 2 + Math.floor(M.lv[i] / 255 * 11));
  if (d > 0.35 && lvl < cap && RNG() < 0.45) {
    const nl = lvl + 1;
    for (const j of footprint(i)) G.lvl[j] = nl;
    G.vr[i] = (RNG() * 255) | 0; markDirtyAll(i);
    if (s === 1 && zd >= 2 && nl >= 4 && RNG() < 0.35) tryMerge(i);
  } else if ((d < -0.7 || lvl > cap) && RNG() < 0.3) {
    if (d < -1.4 && RNG() < 0.3) { setAband(i); return; }
    const nl = lvl - 1;
    if (s > 1 && nl < 4) { // desfaz fusão
      const fp = footprint(i); for (const j of fp) { G.own[j] = j; G.bs[j] = 1; G.lvl[j] = nl; G.vr[j] = (RNG() * 255) | 0; markDirtyIdx(j); }
    } else if (nl <= 0) { G.lvl[i] = 0; G.own[i] = -1; G.bs[i] = 0; markDirtyIdx(i); }
    else { for (const j of footprint(i)) G.lvl[j] = nl; markDirtyAll(i); }
   
  }
}
function setAband(i) { for (const j of footprint(i)) G.flags[j] |= F_ABAND; markDirtyAll(i); }
function markDirtyAll(a) { for (const j of footprint(a)) markDirtyIdx(j); }

function tryMerge(i) {
  const x = i % N, y = (i / N) | 0, zt = G.zt[i];
  for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
    const ax = x + ox, ay = y + oy; if (ax < 0 || ay < 0 || ax + 1 >= N || ay + 1 >= N) continue;
    let ok = true, ml = 0;
    for (let yy = ay; yy < ay + 2 && ok; yy++) for (let xx = ax; xx < ax + 2; xx++) {
      const j = idx(xx, yy);
      if (G.type[j] !== T_ZONE || G.zt[j] !== zt || G.zd[j] < 2 || G.lvl[j] < 2 || G.own[j] !== j || (G.flags[j] & (F_FIRE | F_ABAND))) { ok = false; break; }
      ml = Math.max(ml, G.lvl[j]);
    }
    if (!ok) continue;
    const a = idx(ax, ay);
    for (let yy = ay; yy < ay + 2; yy++) for (let xx = ax; xx < ax + 2; xx++) { const j = idx(xx, yy); G.own[j] = a; G.lvl[j] = ml; G.bs[j] = 0; markDirtyIdx(j); }
    G.bs[a] = 2; G.vr[a] = (RNG() * 255) | 0;
    return true;
  }
  return false;
}

// ---------- Fogo e desastres ----------
let TORNADO = null, METEORS = [], SHAKE = 0;
function ignite(i) {
  const t = G.type[i];
  if (!((t === T_ZONE && G.own[i] >= 0) || t === T_BLD || G.tree[i])) return false;
  if (t === T_ZONE || t === T_BLD) { for (const j of footprint(G.own[i])) { G.flags[j] |= F_FIRE; G.burn[j] = 1; } }
  else { G.flags[i] |= F_FIRE; G.burn[i] = 1; }
  FIRES.add(i); return true;
}
const FIRES = new Set();
function fireStep() {
  if (FIRES.size === 0) return;
  const ff = G.funding.fire / 100;
  const list = Array.from(FIRES);
  for (const i of list) {
    if (!(G.flags[i] & F_FIRE)) { FIRES.delete(i); continue; }
    G.burn[i]++;
    const cov = M.fire[i] / 255 * Math.min(1.2, ff);
    if (RNG() < 0.04 + cov * 0.35) { G.flags[i] &= ~F_FIRE; G.burn[i] = 0; FIRES.delete(i); continue; }
    if (RNG() < 0.12 * (1 - cov * 0.8)) {
      const k = (RNG() * 4) | 0, x = i % N + DX[k], y = ((i / N) | 0) + DY[k];
      if (inb(x, y)) { const j = idx(x, y); if (!(G.flags[j] & F_FIRE)) ignite(j); }
    }
    if (G.burn[i] > 28) {
      FIRES.delete(i); G.flags[i] &= ~F_FIRE;
      if (G.tree[i] && G.type[i] === T_EMPTY) { G.tree[i] = 0; G.type[i] = T_RUBBLE; G.rubT[i] = 20; markDirtyIdx(i); }
      else { const a = G.own[i] >= 0 ? G.own[i] : i; for (const j of footprint(a)) { FIRES.delete(j); } destroyTile(i, true); }
    }
  }
}
function randomFire() {
  for (let t = 0; t < 30; t++) { const i = (RNG() * N2) | 0; if (G.type[i] === T_ZONE && G.lvl[i] > 0 || G.type[i] === T_BLD) { ignite(i); return i; } }
  return -1;
}
function startTornado(x, y) {
  if (x == null) { x = RNG() * N; y = RNG() * N; }
  const a = RNG() * Math.PI * 2;
  TORNADO = { x, y, dx: Math.cos(a), dy: Math.sin(a), life: 45 + RNG() * 30 };
  news('🌪️ ALERTA: Tornado avistado na cidade!', true); sfx('alarm');
  centerOn(x, y);
}
function tornadoStep() {
  if (!TORNADO) return;
  const T = TORNADO;
  const ang = Math.atan2(T.dy, T.dx) + (RNG() - 0.5) * 0.7;
  T.dx = Math.cos(ang); T.dy = Math.sin(ang);
  T.x += T.dx * 0.8; T.y += T.dy * 0.8; T.life--;
  if (T.x < 0 || T.y < 0 || T.x >= N || T.y >= N || T.life <= 0) { TORNADO = null; return; }
  for (let k = 0; k < 3; k++) {
    const x = Math.floor(T.x + (RNG() - 0.5) * 2.5), y = Math.floor(T.y + (RNG() - 0.5) * 2.5);
    if (inb(x, y) && RNG() < 0.7) destroyTile(idx(x, y), true);
  }
}
function meteorStrike(x, y) {
  if (x == null) { for (let t = 0; t < 40; t++) { x = (RNG() * N) | 0; y = (RNG() * N) | 0; if (!G.terr[idx(x, y)]) break; } }
  METEORS.push({ x: x + 0.5, y: y + 0.5, t0: performance.now() });
  sfx('alarm');
}
function meteorImpact(m) {
  const R = 3;
  for (let y = Math.floor(m.y - R); y <= m.y + R; y++) for (let x = Math.floor(m.x - R); x <= m.x + R; x++) {
    if (!inb(x, y)) continue; const d = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (d <= R) destroyTile(idx(x, y), true); else if (d <= R + 2 && RNG() < 0.5) ignite(idx(x, y));
  }
  SHAKE = 1; sfx('boom'); news('☄️ Meteoro atinge a cidade! Destruição na região de impacto.', true);
}
function earthquake() {
  SHAKE = 2.5; sfx('boom'); news('🫨 TERREMOTO! Danos espalhados pela cidade.', true);
  let n = 0;
  for (let t = 0; t < N2 / 30; t++) {
    const i = (RNG() * N2) | 0; const tp = G.type[i];
    if ((tp === T_ZONE && G.lvl[i] > 0) || tp === T_BLD || tp === T_ROAD) { if (RNG() < 0.25) { destroyTile(i, true); n++; } else if (RNG() < 0.15) ignite(i); }
  }
}

// ---------- Dia / mês ----------
function simDay() {
  G.day++; G.totalDays++;
  growthPass(); fireStep(); tornadoStep();
  // OTIMIZAÇÃO: o trabalho pesado do mês é espalhado em dias diferentes (sem travadas)
  // e a rede só é recalculada fora do mês quando o jogador/desastre mudou algo (no máx. a cada 5 dias).
  if (netDirty && (G.totalDays % 5 === 0)) scheduleJob('nets', computeNetworksGen);
  if (G.day === 10) scheduleJob('traf', computeTrafficGen);
  else if (G.day === 20) scheduleJob('maps', computeMapsGen);
  // ignições aleatórias
  if (RNG() < 0.02 * (G.pop / 20000 + 0.1)) { const i = (RNG() * N2) | 0; if ((G.type[i] === T_ZONE && G.lvl[i] > 2) || G.type[i] === T_BLD) { if (RNG() > M.fire[i] / 255 * 0.9) ignite(i); } }
  if (G.day >= DAYS_PER_MONTH) { G.day = 0; monthly(); G.month++; if (G.month >= 12) { G.month = 0; G.year++; yearly(); } }
}

function monthly() {
  scheduleJob('nets', computeNetworksGen); computeDemand();
  budget();
  // educação
  let eduSum = 0, nr = 0;
  for (let i = 0; i < N2; i += 3) if (G.type[i] === T_ZONE && G.zt[i] === ZR && G.lvl[i] > 0) { eduSum += M.edu[i]; nr++; }
  const eduCov = nr ? eduSum / nr / 255 : 0;
  const univ = G.cnt.univ ? 15 : 0;
  const eqT = 35 + eduCov * 95 + univ + (G.policies.literacy ? 10 : 0);
  G.eq += (eqT - G.eq) * (G.policies.literacy ? 0.08 : 0.04);
  G.stats.eduCov = eduCov;
  // aprovação
  let healthSum = 0, policeSum = 0, fireSum = 0, nd = 0;
  for (let i = 0; i < N2; i += 3) if (G.type[i] === T_ZONE && G.lvl[i] > 0) { healthSum += M.health[i]; policeSum += M.police[i]; fireSum += M.fire[i]; nd++; }
  const covAvg = nd ? (healthSum + policeSum + fireSum) / (3 * nd) / 255 : 0;
  G.stats.servCov = clamp(covAvg, 0, 1);
  const avgTax = (G.taxes.r + G.taxes.c + G.taxes.i) / 3;
  let a = 68 - (avgTax - 9) * 3.5 - G.stats.polAvg * 0.13 - G.stats.crimeAvg * 0.16 - Math.max(0, G.stats.unemp) * 35
    - G.stats.trafAvg * 0.06 + G.stats.servCov * 16 + eduCov * 6 - G.stats.unpow * 30 - G.stats.unwat * 15
    + G.mod.appr + (G.stats.apprB || 0) + (G.policies.nuclearfree ? 3 : 0) + (G.policies.bike ? 1 : 0) + (G.policies.neighborhood ? 1 : 0) - (G.policies.carfree ? 3 : 0)
    - (G.money < 0 ? 10 : 0);
  if (G.pop < 500) a = Math.max(a, 60);
  G.approval += (clamp(a, 0, 100) - G.approval) * 0.3;
  G.mod.appr *= 0.85;
  for (const k of ['cdemT', 'idemT', 'polT', 'techT', 'powT', 'watT']) if (G.mod[k] > 0) G.mod[k]--;
  // históricos
  const H = G.hist, push = (k, v) => { H[k].push(Math.round(v)); if (H[k].length > 600) H[k].shift(); };
  push('pop', G.pop); push('money', G.money); push('r', G.pop); push('c', G.jobsC); push('i', G.jobsI); push('appr', G.approval);
  push('inc', G.last.income); push('exp', G.last.expense);
  checkUnlocks(); checkAchievements(); advisorTick();
  // eventos
  if (!pendingEvent && G.pop > 1000 && RNG() < 0.07) triggerEvent();
  // desastres aleatórios
  if (SETTINGS.disasters && G.pop > 8000 && RNG() < 0.008) { const r = RNG(); if (r < 0.5) { const i = randomFire(); if (i >= 0) { news('🔥 Incêndio de grandes proporções!', true); centerOn(i % N, i / N); } } else if (r < 0.8) startTornado(); else meteorStrike(); }
  // usina nuclear: risco
  for (const a of M.bldList) { const d = BYID[G.bk[a]]; if (d.key === 'nuclear' && M.fire[a] < 60 && G.totalDays > 3600 && RNG() < 0.0004) { const x = a % N, y = (a / N) | 0; news('☢️ ACIDENTE NUCLEAR! Sem cobertura de bombeiros a usina explodiu.', true); meteorImpact({ x: x + 2, y: y + 2 }); } }
  ovDirty = true;
  updateHUD(true);
}
function yearly() {
  for (const L of G.loans) { }
  if (G.year % 10 === 0) news('🎆 Feliz ' + G.year + '! A cidade entra em uma nova década.');
}

function budget() {
  const inc = {}, exp = {};
  const lvF = 0.7 + (G.stats.lvAvg || 100) / 255 * 0.6;
  inc.r = G.pop * G.taxes.r * 0.0105 * lvF;
  inc.c = G.jobsC * G.taxes.c * 0.0125 * lvF;
  inc.i = G.jobsI * G.taxes.i * 0.0115 * (G.policies.freezone ? 0.7 : 1);
  inc.contracts = (G.soldPower || 0) * 0.3 + (G.soldWater || 0) * 0.12 + (G.contracts.waste ? 250 + G.pop * 0.004 : 0);
  if (G.mod.casino) inc.casino = 600;
  const dept = { police: 0, fire: 0, health: 0, edu: 0, transit: 0, util: 0, parks: 0 };
  for (const a of M.bldList) {
    const d = BYID[G.bk[a]]; const f = fundOf(d);
    const k = d.cov === 'police' ? 'police' : d.cov === 'fire' ? 'fire' : d.cov === 'health' ? 'health' : d.cov === 'edu' ? 'edu' : d.transit || d.key === 'airport' ? 'transit' : (d.pw || d.wt || d.key === 'treat') ? 'util' : 'parks';
    dept[k] += d.u * f;
  }
  Object.assign(exp, dept);
  exp.roads = (G.stats.roads * 0.05 + G.stats.hwys * 0.18 + G.stats.plines * 0.02 + (G.stats.bridges || 0) * 0.3) * G.funding.roads / 100;
  let pc = 0; for (const k in G.policies) if (G.policies[k]) pc += Math.max(15, POLICIES[k].cost * G.pop);
  exp.policies = pc;
  let lp = 0; for (const L of G.loans) { lp += L.pay; L.left--; } G.loans = G.loans.filter(L => L.left > 0);
  exp.loans = lp;
  let ti = 0, te = 0; for (const k in inc) ti += inc[k]; for (const k in exp) te += exp[k];
  G.money += ti - te;
  G.last = { inc, exp, income: ti, expense: te };
  if (G.money < 0 && G.money + te - ti >= 0) news('⚠️ O caixa da cidade está negativo! Ajuste impostos ou peça um empréstimo.', true);
}
function takeLoan(amount) {
  if (G.loans.length >= 5) { toast('Limite de 5 empréstimos atingido'); return; }
  const months = 120, rate = 0.07 / 12; const pay = amount * rate / (1 - Math.pow(1 + rate, -months));
  G.loans.push({ amount, pay: Math.round(pay), left: months }); G.money += amount; sfx('cash');
  toast('💰 Empréstimo de $' + fmt(amount) + ' (10 anos, $' + fmt(pay) + '/mês)');
}
function spend(v) { if (G.money < v) { toast('💸 Fundos insuficientes'); sfx('err'); return false; } G.money -= v; return true; }

function checkUnlocks() {
  for (const k of BKEYS) {
    const d = BLD[k]; if (!d.pop && !d.yr) continue;
    if (!G.unlocked[k] && isUnlocked(k)) { G.unlocked[k] = 1; if (G.totalDays > 40) { news('🔓 Novo disponível: ' + d.n + '!', true); toast('🔓 Desbloqueado: ' + (BLD_ICONS[k] || '') + ' ' + d.n); sfx('unlock'); } }
  }
}
function checkAchievements() {
  for (const a of ACHIEVEMENTS) if (!G.ach[a.id] && a.f()) { G.ach[a.id] = G.year; toast('🏆 Conquista: ' + a.n + ' — ' + a.d, 5000); sfx('unlock'); news('🏆 Conquista desbloqueada: ' + a.n); }
}
let lastAdv = 0;
function advisorTick() {
  const msgs = [];
  if (G.powerDem > G.powerSup * 0.98 && G.pop > 0) msgs.push('⚡ Conselheiro de Energia: a demanda supera a produção. Construa usinas!');
  if (G.watDem > G.watSup && G.pop > 300) msgs.push('💧 Conselheiro de Saneamento: falta água. Construa bombas ou caixas d\'água.');
  if (G.stats.polAvg > 80) msgs.push('🌫️ Conselheira Ambiental: a poluição nos bairros residenciais está alta.');
  if (G.stats.crimeAvg > 70) msgs.push('🚨 Chefe de Polícia: o crime está aumentando. Precisamos de delegacias.');
  if (G.stats.trafAvg > 110) msgs.push('🚗 Secretário de Transportes: congestionamentos! Considere avenidas, ônibus e metrô.');
  if (G.stats.unemp > 0.15 && G.pop > 1000) msgs.push('📉 Conselheiro Econômico: desemprego alto. Zoneie mais comércio e indústria.');
  if (G.stats.eduCov < 0.3 && G.pop > 3000) msgs.push('🎓 Secretária de Educação: faltam escolas nos bairros.');
  if (G.stats.unpow > 0.05) msgs.push('🔌 Há prédios sem energia — verifique as conexões.');
  if (G.money < 2000) msgs.push('💰 Conselheiro de Finanças: o caixa está baixo. Cuidado com os gastos.');
  if (G.dem[1] > 0.6 && G.pop > 0) msgs.push('🏘️ Há grande procura por moradias. Zoneie áreas residenciais.');
  if (G.dem[2] > 0.6 && G.pop > 500) msgs.push('🏬 Comerciantes querem se instalar. Zoneie áreas comerciais.');
  if (G.dem[3] > 0.6) msgs.push('🏭 Indústrias procuram terrenos. Zoneie áreas industriais.');
  if (msgs.length && RNG() < 0.7) news(msgs[(RNG() * msgs.length) | 0]);
  else if (RNG() < 0.5) news('📰 ' + NEWS_FLAVOR[(RNG() * NEWS_FLAVOR.length) | 0]);
}

let pendingEvent = null;
function triggerEvent() {
  const cands = EVENTS.filter(e => { try { return e.cond() && (!G.events || !G.events[e.id] || G.totalDays - G.events[e.id] > 720); } catch (x) { return false; } });
  if (!cands.length) return;
  const e = cands[(RNG() * cands.length) | 0];
  G.events = G.events || {}; G.events[e.id] = G.totalDays;
  pendingEvent = e; showEvent(e);
}
