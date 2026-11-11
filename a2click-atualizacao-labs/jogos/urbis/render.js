'use strict';
// =====================================================================================
//  RENDERIZAÇÃO ISOMÉTRICA COM CACHE EM CHUNKS — EM CAMADAS, COM ROTAÇÃO DE CÂMERA
//  O mundo é dividido em LADRILHOS de 512×512 px alinhados à tela; cada um tem até 3 canvases:
//    • g = CHÃO     (terreno, ruas, calçadas, lotes, caminhos das praças, pontes baixas)
//    • o = OBJETOS  (prédios, árvores, postes, viadutos)
//    • n = NOITE    (silhuetas + janelas acesas + luzes) — somado com 'lighter'
//  Ordem do quadro: chão → veículos/pedestres → objetos → carros nos viadutos → efeitos
//                   → noite → mapas de dados → cursor.
//  Ferramentas de visibilidade: lente raio-X no cursor, prédios translúcidos, ocultar prédios.
// =====================================================================================
const CH = 16, MT = 580, MX = 110, MB = 50;   // MT: margem superior p/ prédios altos
const GMX = 36, GMB = 30;                       // margens da camada de chão
const LEVELS = [0.25, 0.5, 1];
// OTIMIZAÇÃO v1.2: limites de cache bem menores — antes o cache chegava a ~800 MB de texturas,
// estourando a memória de vídeo e derrubando o FPS. Agora fica em ~150–250 MB no pior caso.
const LIMIT = [700, 170, 64];   // ladrilhos por nível (1 MB por canvas no nível 2)
const REDRAW_MIN = 0.4;                         // um chunk já desenhado só é refeito a cada 0,4 s
let CACHE = [new Map(), new Map(), new Map()];
let cv, ctx, W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, z: 1, tz: 1 };
let nightF = 0, duskF = 0, frameT = 0, minimapDirty = true;
let overlay = null, ovCanvas = null, ovCtx = null;
let weather = { kind: 'sol', t: 0, drops: [], flash: 0 };
let GLOW = null;
let renderStats = { chunks: 0, rendered: 0, fps: 60, ms: 0 };
let GN = null;     // ruído suave do terreno (cor da grama em manchas)
let BHT = null;    // altura (px) do topo do prédio em cada tile — usada p/ ocultar faróis à noite
// ferramentas de visibilidade
const VIS = { lens: false, trans: false, hide: false, lensR: 150 };
let OFF = null, offCtx = null;

function renderInit() {
  setRotCoeffs();
  EPOCH++; TVG.clear(); TVO.clear();
  clearCaches();
  ovCanvas = document.createElement('canvas'); ovCanvas.width = N; ovCanvas.height = N; ovCtx = ovCanvas.getContext('2d');
  ovDirty = true; minimapDirty = true;
  BHT = new Uint16Array(N2);
  GN = new Uint8Array(N2);
  const nz = makeNoise((G.seed | 0) + 99);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) GN[y * N + x] = clamp(fbm(nz, x * 0.07, y * 0.07, 3) * 300 - 20, 0, 255);
  if (!GLOW) {
    GLOW = document.createElement('canvas'); GLOW.width = GLOW.height = 64;
    const g = GLOW.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,220,150,0.9)'); gr.addColorStop(0.3, 'rgba(255,190,110,0.35)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
}
function clearCaches() {
  for (const m of CACHE) { for (const e of m.values()) freeEntry(e); m.clear(); }
  SMOKE_SRC.clear(); BEACONS.clear(); WIND_HUBS.clear(); FERRIS.clear(); LIGHTHOUSES.clear();
}
// marca os ladrilhos afetados por uma mudança no tile do mundo i (chão e objetos altos acima dele)
function markDirtyIdx(i) {
  if (!BHT) return;
  const x = i % N, y = (i - x) / N, U = viewCellU(x, y), V = viewCellV(x, y), cx = (U - V) * HW, cy = (U + V) * HH;
  bumpRect(TVG, cx - HW - 40, cy - 40, cx + HW + 40, cy + 2 * HH + 40);
  bumpRect(TVO, cx - 4 * HW - MX, cy - 620, cx + 4 * HW + MX, cy + 2 * HH + 40);
  minimapDirty = true;
}
function invalidateAll() { EPOCH++; }

// ---------- Rotação da câmera (Q / E) ----------
function setRotation(r) {
  const c = screenToGrid(W / 2, H / 2);
  ROT = ((r % 4) + 4) % 4; setRotCoeffs();
  clearCaches(); invalidateAll(); minimapDirty = true;
  centerOn(c[0], c[1]);
  toast(['🧭 Vista Norte', '🧭 Vista Leste', '🧭 Vista Sul', '🧭 Vista Oeste'][ROT], 1000);
}

// ---------- Cores do terreno ----------
const WATER = [], WATER_SH = [], SAND = '#dcc993';
for (let k = 0; k < 6; k++) { WATER.push('hsl(' + (205 + k) + ',58%,' + (32 + k * 0.9) + '%)'); WATER_SH.push('hsl(' + (192 + k) + ',52%,' + (45 + k) + '%)'); }
const GRASS16 = []; for (let k = 0; k < 16; k++) GRASS16.push('hsl(' + (88 + k * 1.6) + ',' + (36 + (k % 5)) + '%,' + (35 + k * 0.62).toFixed(1) + '%)');
function grassColor(i) { return GRASS16[GN[i] >> 4]; }
const ZONE_TINT = { 1: 'rgba(80,220,120,', 2: 'rgba(80,150,255,', 3: 'rgba(250,200,60,' };

function diamond(g, wx, wy, e) { g.beginPath(); g.moveTo(wx, wy - e); g.lineTo(wx + HW + 2 * e, wy + HH); g.lineTo(wx, wy + 2 * HH + e); g.lineTo(wx - HW - 2 * e, wy + HH); g.closePath(); }
const isRoadT = t => t === T_ROAD || t === T_HWY;
const isPowT = t => t === T_ROAD || t === T_HWY || t === T_PLINE || t === T_BLD || t === T_ZONE || t === T_BRIDGE;
function roadSide(x, y) { // direção (do mundo) da rua vizinha: -1 se não houver
  for (const d of [2, 1, 3, 0]) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny) && isRoadT(G.type[ny * N + nx])) return d; }
  return -1;
}

// ---------- CAMADA DE CHÃO ----------
function drawGround(g, x, y) {
  const i = y * N + x, t = G.type[i], U = viewCellU(x, y), V = viewCellV(x, y), wx = (U - V) * HW, wy = (U + V) * HH;
  _g = g; setLocalFrame(x, y, U, V);
  const h = hash32(i);
  if (G.terr[i]) {
    let landMask = 0;
    for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny) && !G.terr[ny * N + nx]) landMask |= 1 << d; }
    g.fillStyle = landMask ? WATER_SH[h % 6] : WATER[h % 6]; diamond(g, wx, wy, 0.6); g.fill();
    if (LOD >= 1) {
      if ((h & 7) < 3) { g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.8; g.beginPath(); const ox = ((h >>> 4) % 20) - 10, oy = ((h >>> 9) % 10) + 8; g.moveTo(wx + ox - 6, wy + oy); g.quadraticCurveTo(wx + ox, wy + oy - 2, wx + ox + 6, wy + oy); g.stroke(); }
      if (landMask && !isRoadT(t) && t !== T_BRIDGE) { // espuma na margem
        const lm = rotMask(landMask);
        g.strokeStyle = 'rgba(235,248,255,0.55)'; g.lineWidth = 1.3; g.beginPath();
        const E = [[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]]];
        for (let d = 0; d < 4; d++) if (lm & (1 << d)) { const [a, b] = E[d]; mv(x + a[0] + (0.5 - a[0]) * 0.12, y + a[1] + (0.5 - a[1]) * 0.12, 0); ln(x + b[0] + (0.5 - b[0]) * 0.12, y + b[1] + (0.5 - b[1]) * 0.12, 0); }
        g.stroke();
      }
    }
  } else {
    let col = null;
    if (t === T_EMPTY || t === T_PLINE || t === T_BRIDGE) {
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny) && G.terr[ny * N + nx]) { col = SAND; break; } }
    } else if (t === T_RUBBLE) col = '#7a6e62';
    g.fillStyle = col || grassColor(i); diamond(g, wx, wy, 0.6); g.fill();
    if (LOD >= 2 && !col && (t === T_EMPTY || t === T_ZONE) && (h & 31) < 4) { // flores / tufos
      g.fillStyle = ['#f3e27a', '#ffffff', '#e98ad0', '#9fd36a'][(h >>> 6) & 3];
      for (let k = 0; k < 5; k++) { const r1 = hash32(h + k); const gx = x + 0.15 + (r1 & 255) / 255 * 0.7, gy = y + 0.15 + ((r1 >>> 8) & 255) / 255 * 0.7; g.fillRect(PX(gx, gy) - 0.6, PY(gx, gy, 0) - 0.6, 1.2, 1.2); }
    }
  }
  if (t === T_ZONE) drawLotGround(g, x, y, i);
  else if (t === T_BLD) drawBldGround(g, x, y, i, wx, wy);
  else if (isRoadT(t)) drawRoadGround(g, x, y, i, t);
  else if (t === T_BRIDGE && G.terr[i] && brKind(i) !== BR_VIA) drawWaterDeck(g, x, y, i, bridgeViewMask(x, y, i), brKind(i));
  else if (t === T_RUBBLE && LOD >= 1) { const r = mulberry(h); for (let k = 0; k < 7; k++) { const gx = x + 0.15 + r() * 0.7, gy = y + 0.15 + r() * 0.7; g.fillStyle = k % 2 ? '#5d554c' : '#958b7f'; g.beginPath(); g.ellipse(PX(gx, gy), PY(gx, gy, 0) - 1, 3 + r() * 3, 2 + r() * 1.5, 0, 0, 6.283); g.fill(); } }
}

// Chão dos lotes: gramado, entrada de garagem, estacionamento, pátio industrial
function drawLotGround(g, x, y, i) {
  const zt = G.zt[i], a = G.own[i], built = a >= 0 && G.lvl[a] > 0;
  if (!built) {
    g.fillStyle = ZONE_TINT[zt] + (0.2 + G.zd[i] * 0.06) + ')'; g.beginPath(); gq(g, x, y, x + 1, y + 1, 0); g.fill();
    if (LOD >= 1) { g.strokeStyle = ZONE_TINT[zt] + '0.85)'; g.lineWidth = 0.9; g.setLineDash([3, 2]); g.beginPath(); gq(g, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0); g.stroke(); g.setLineDash([]); }
    return;
  }
  const l = G.lvl[a], s = G.bs[a] || 1;
  const rw = roadSide(x, y), rs = rw < 0 ? -1 : rotDir(rw);
  if (zt === ZR) {
    if (l <= 2 && s === 1) {
      g.fillStyle = '#6fae52'; g.beginPath(); gq(g, x + 0.03, y + 0.03, x + 0.97, y + 0.97, 0); g.fill();
      if (LOD >= 1 && rs >= 0) {
        g.fillStyle = '#c9c4b8'; g.beginPath();
        if (rs === 2) gq(g, x + 0.62, y + 0.6, x + 0.8, y + 1, 0); else if (rs === 1) gq(g, x + 0.6, y + 0.62, x + 1, y + 0.8, 0);
        else if (rs === 3) gq(g, x, y + 0.62, x + 0.3, y + 0.8, 0); else gq(g, x + 0.62, y, x + 0.8, y + 0.3, 0);
        g.fill();
      }
      if (LOD >= 2) { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.5; g.beginPath(); gq(g, x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0); g.stroke(); }
    } else {
      g.fillStyle = '#78a85e'; g.beginPath(); gq(g, x, y, x + 1, y + 1, 0); g.fill();
      g.fillStyle = '#d3cec2'; g.beginPath(); gq(g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0); g.fill();
    }
  } else if (zt === ZC) {
    g.fillStyle = '#c7c3b9'; g.beginPath(); gq(g, x, y, x + 1, y + 1, 0); g.fill();
    if (LOD >= 2) { g.strokeStyle = 'rgba(120,115,105,0.35)'; g.lineWidth = 0.4; g.beginPath(); for (let k = 1; k < 4; k++) { mv(x + k / 4, y, 0); ln(x + k / 4, y + 1, 0); mv(x, y + k / 4, 0); ln(x + 1, y + k / 4, 0); } g.stroke(); }
    if (l <= 2 && s === 1 && LOD >= 1 && rs >= 0) {
      g.fillStyle = '#56585d'; g.beginPath();
      if (rs === 2 || rs === 0) gq(g, x + 0.05, rs === 2 ? y + 0.86 : y, x + 0.95, rs === 2 ? y + 1 : y + 0.14, 0); else gq(g, rs === 1 ? x + 0.86 : x, y + 0.05, rs === 1 ? x + 1 : x + 0.14, y + 0.95, 0);
      g.fill();
    }
  } else {
    g.fillStyle = '#857c6c'; g.beginPath(); gq(g, x, y, x + 1, y + 1, 0); g.fill();
    if (LOD >= 2) { g.strokeStyle = 'rgba(240,200,60,0.5)'; g.lineWidth = 0.6; g.beginPath(); mv(x + 0.08, y + 0.92, 0); ln(x + 0.92, y + 0.92, 0); g.stroke(); }
  }
}
function drawBldGround(g, x, y, i, wx, wy) {
  const a = G.own[i], d = BYID[G.bk[a]];
  if (PARK_GROUND_KEYS[d.key]) {
    // praças/parques: o chão do parque inteiro, recortado neste tile, no referencial do prédio
    g.save(); diamond(g, wx, wy, 0.6); g.clip();
    const ax = a % N, ay = (a / N) | 0; setLocalFrame(ax, ay, viewFootU(ax, ay, d.s), viewFootV(ax, ay, d.s));
    drawParkGround(a, d.key);
    g.restore(); setLocalFrame(x, y, viewCellU(x, y), viewCellV(x, y));
    return;
  }
  const grassy = d.cat === 'park' || d.key === 'univ' || d.key === 'airport' || d.key === 'solar' || d.key === 'school' || d.key === 'wind';
  if (d.key === 'marina') return;
  g.fillStyle = grassy ? '#68a653' : '#bdb8ad'; g.beginPath(); gq(g, x, y, x + 1, y + 1, 0); g.fill();
  if (!grassy && LOD >= 2) { g.strokeStyle = 'rgba(110,105,95,0.3)'; g.lineWidth = 0.4; g.beginPath(); for (let k = 1; k < 3; k++) { mv(x + k / 3, y, 0); ln(x + k / 3, y + 1, 0); mv(x, y + k / 3, 0); ln(x + 1, y + k / 3, 0); } g.stroke(); }
}

// ---------- CAMADA DE OBJETOS ----------
function drawObjects(g, x, y) {
  const i = y * N + x, t = G.type[i], U = viewCellU(x, y), V = viewCellV(x, y);
  _g = g; setLocalFrame(x, y, U, V);
  if (G.own[i] < 0) BHT[i] = 0;
  const deck = isDeckI(i);
  if (!NIGHT) {
    if (G.tree[i] && (t === T_EMPTY || t === T_PLINE)) {
      const h = hash32(i); const n = G.tree[i] * (LOD ? 2 : 1); const r = mulberry(h + 1); const pts = [];
      for (let k = 0; k < n; k++) pts.push([x + 0.15 + r() * 0.7, y + 0.15 + r() * 0.7, 4 + r() * 3.5, (r() * 1000) | 0]);
      pts.sort((p, q) => p[0] + p[1] - q[0] - q[1]);
      for (const p of pts) treeAt(p[0], p[1], p[2], p[3]);
    }
    if (t === T_PLINE) drawPline(g, x, y, i);
  }
  if (isRoadT(t)) drawRoadObjects(g, x, y, i, t);
  if (deck) { MAXZ = 0; drawDeckObjects(g, x, y, i); BHT[i] = Math.max(BHT[i], MAXZ | 0); }
  if (t === T_BLD || (t === T_ZONE && G.own[i] >= 0)) {
    const a = G.own[i], s = G.bs[a] || 1, ax = a % N, ay = (a / N) | 0;
    const u0 = viewFootU(ax, ay, s), v0 = viewFootV(ax, ay, s);
    if (U === u0 + s - 1 && V === v0 + s - 1) {   // tile mais à frente da pegada (na vista)
      MAXZ = 0; setLocalFrame(ax, ay, u0, v0);
      if (t === T_BLD) drawServiceBuilding(a); else if (G.lvl[a] > 0) drawZoneBuilding(a);
      ABAND = false;
      for (const j of footprint(a)) BHT[j] = Math.min(65535, MAXZ | 0);
    }
  }
}
function drawPline(g, x, y, i) {
  const cx = x + 0.5, cy = y + 0.5, H = 26;
  if (LOD >= 1) {
    g.strokeStyle = '#6b6b70'; g.lineWidth = 1.2; g.beginPath(); mv(cx - 0.08, cy, 0); ln(cx, cy, H); ln(cx + 0.08, cy, 0); mv(cx, cy - 0.08, 0); ln(cx, cy, H); g.stroke();
    g.beginPath(); mv(cx - 0.15, cy + 0.15, H - 3); ln(cx + 0.15, cy - 0.15, H - 3); g.stroke();
  }
  let pm = 0; for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(nx, ny) && isPowT(G.type[ny * N + nx])) pm |= 1 << d; }
  pm = rotMask(pm);
  g.strokeStyle = 'rgba(40,40,40,0.7)'; g.lineWidth = 0.6; g.beginPath();
  for (let d = 0; d < 4; d++) if (pm & (1 << d)) { mv(cx, cy, H - 3); ln(cx + DX[d] * 0.5, cy + DY[d] * 0.5, H - 6); }
  g.stroke();
}

// ---------- CACHE EM LADRILHOS ALINHADOS À TELA (OTIMIZAÇÃO v1.2) ----------
// Antes: um canvas grande (1300×1170) por chunk de 16×16 tiles, sobrepostos → a GPU pintava
// ~25× a área da tela por quadro. Agora: ladrilhos de 512×512 px do mundo, SEM sobreposição.
// Cada ladrilho desenha todas as células (em ordem de profundidade) que o tocam, recortadas
// pela borda do próprio canvas → pintura por quadro ≈ 2× a área da tela, em qualquer cidade.
const TS = 512;
let EPOCH = 1;
const TVG = new Map(), TVO = new Map();        // versões por ladrilho: chão / objetos
const tkey = (tx, ty) => (tx + 128) * 512 + (ty + 128);
function bumpRect(map, x0, y0, x1, y1) {
  const a = Math.floor(x0 / TS), b = Math.floor(x1 / TS), c = Math.floor(y0 / TS), d = Math.floor(y1 / TS);
  for (let ty = c; ty <= d; ty++) for (let tx = a; tx <= b; tx++) { const k = tkey(tx, ty); map.set(k, (map.get(k) || 0) + 1); }
}
// altura máxima (px) que os objetos de uma célula podem alcançar — limite superior p/ recorte
const REACH_BLD = { tvtower: 410, spire: 560, arco: 330, colossus: 175, coal: 130, nuclear: 110, ferris: 110, cathedral: 110, hospital: 70, policehq: 60, airport: 75, lighthouse: 80, obelisk: 90, clock: 90, archmon: 90, opera: 85, pyramid: 75, castle: 70, fusion: 80, wind: 90, garden: 40, waterpark: 45, univ: 50, cityhall: 90, statue: 60, stadium: 70, gas: 70 };
const REACH_R1 = [0, 40, 40, 40, 50, 64, 85, 112, 140, 182, 225, 280], REACH_R2 = [0, 40, 40, 40, 57, 78, 106, 141, 182, 232, 295, 380];
const REACH_C1 = [0, 30, 30, 45, 60, 82, 105, 135, 180, 225, 285, 360], REACH_C2 = [0, 30, 30, 45, 75, 105, 135, 180, 240, 300, 375, 480];
function objReach(i) {
  const t = G.type[i];
  if (t === T_ZONE) { const a = G.own[i]; if (a < 0) return 0; const l = G.lvl[a], s = G.bs[a] || 1, zt = G.zt[a]; if (zt === ZI) return 130; return (zt === ZR ? (s > 1 ? REACH_R2 : REACH_R1) : (s > 1 ? REACH_C2 : REACH_C1))[l] + 50; }
  if (t === T_BLD) { const k = BYID[G.bk[G.own[i]]].key; return REACH_BLD[k] || ((SV_H[k] || 30) + 50); }
  if (G.br[i]) return 110;
  if (t === T_PLINE) return 32; if (t === T_ROAD) return 26; if (G.tree[i]) return 28;
  return 0;
}
// percorre as células (U,V) da vista que tocam um retângulo do mundo, em ordem de profundidade
function forCellsInRect(X0, Y0, X1, Y1, fn) {
  const d0 = Math.max(0, Math.floor(Y0 / HH) - 2), d1 = Math.min(2 * N - 2, Math.ceil(Y1 / HH) + 1);
  for (let d = d0; d <= d1; d++) {
    const u0 = Math.max(0, Math.floor((d + X0 / HW) / 2) - 1, d - N + 1), u1 = Math.min(N - 1, Math.ceil((d + X1 / HW) / 2) + 1, d);
    for (let u = u0; u <= u1; u++) fn(u, d - u);
  }
}
let OBJ_ANY = false, TILE_R = [0, 0, 0, 0];
function prepTile(e, key, px) {
  let c = e[key]; if (!c) { c = document.createElement('canvas'); e[key] = c; }
  if (c.width !== px || c.height !== px) { c.width = px; c.height = px; }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, px, px); return g;
}
function renderTile(e, level, k, which) {
  const s = LEVELS[level], px = Math.round(TS * s), tx = Math.floor(k / 512) - 128, ty = (k % 512) - 128;
  const X0 = tx * TS, Y0 = ty * TS, X1 = X0 + TS, Y1 = Y0 + TS;
  LOD = s >= 1 ? 2 : s >= 0.5 ? 1 : 0;
  if (which === 'g') {
    const g = prepTile(e, 'g', px); g.setTransform(s, 0, 0, s, -X0 * s, -Y0 * s); NIGHT = false;
    forCellsInRect(X0 - HW - 40, Y0 - 40, X1 + HW + 40, Y1 + 40, (u, v) => drawGround(g, worldCellX(u, v), worldCellY(u, v)));
    e.gv = (TVG.get(k) || 0); e.gep = EPOCH;
  } else {
    const night = which === 'n', key = night ? 'n' : 'o';
    const g = prepTile(e, key, px); g.setTransform(s, 0, 0, s, -X0 * s, -Y0 * s); NIGHT = night;
    OBJ_ANY = false; TILE_R[0] = X0; TILE_R[1] = Y0; TILE_R[2] = X1; TILE_R[3] = Y1;
    const mx = 4 * HW + MX;
    forCellsInRect(X0 - mx, Y0 - 40, X1 + mx, Y1 + 620, (u, v) => {
      const x = worldCellX(u, v), y = worldCellY(u, v), i = y * N + x;
      const reach = objReach(i);
      if (reach === 0) { if (G.own[i] < 0) BHT[i] = 0; return; }
      const base = (u + v) * HH, cx = (u - v) * HW;
      if (base - reach > Y1 || base + 2 * HH + 30 < Y0 || cx + mx < X0 || cx - mx > X1) return;
      drawObjects(g, x, y); OBJ_ANY = true;
    });
    NIGHT = false;
    if (!OBJ_ANY) { e[key].width = 0; e[key] = null; }
    e[key + 'E'] = !OBJ_ANY; e[key + 'v'] = (TVO.get(k) || 0); e[key + 'ep'] = EPOCH;
  }
  setRotCoeffs();
}
const tileFresh = (e, k, which) => which === 'g' ? (e.g && e.gv === (TVG.get(k) || 0) && e.gep === EPOCH)
  : ((e[which] || e[which + 'E']) && e[which + 'v'] === (TVO.get(k) || 0) && e[which + 'ep'] === EPOCH);
const tileHas = (e, which) => which === 'g' ? !!e.g : !!(e[which] || e[which + 'E']);
function getEntry(level, k) {
  const m = CACHE[level]; let e = m.get(k);
  if (!e) { e = { g: null, o: null, n: null, used: 0, lastF: -9, lastN: -9, lv: level }; m.set(k, e); }
  return e;
}
function freeEntry(e) { for (const k of ['g', 'o', 'n']) if (e[k]) { e[k].width = 0; e[k] = null; } }
function evictCache() {
  for (let l = 0; l < 3; l++) {
    const m = CACHE[l]; if (m.size <= LIMIT[l]) continue;
    const arr = Array.from(m.entries()).sort((a, b) => a[1].used - b[1].used);
    for (let k = 0; k < arr.length - LIMIT[l]; k++) { freeEntry(arr[k][1]); m.delete(arr[k][0]); }
  }
}

// ---------- Câmera ----------
function worldToScreen(wx, wy) { return [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + H / 2]; }
// tela → coordenadas contínuas do MUNDO (considera a rotação)
function viewToWorld(u, v) { return ROT === 0 ? [u, v] : ROT === 1 ? [v, N - u] : ROT === 2 ? [N - u, N - v] : [N - v, u]; }
function screenToGrid(sx, sy) {
  const wx = (sx - W / 2) / cam.z + cam.x, wy = (sy - H / 2) / cam.z + cam.y;
  return viewToWorld((wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2);
}
function centerOn(gx, gy) { cam.x = PX(gx, gy); cam.y = PY(gx, gy, 0); }
function clampCam() { cam.x = clamp(cam.x, -N * HW, N * HW); cam.y = clamp(cam.y, 0, 2 * N * HH); }
function gridMatrix(g, z, shx, shy) { // matriz: grade do mundo → tela
  g.setTransform(z * HW * RA * DPR, z * HH * RD * DPR, z * HW * RB * DPR, z * HH * RE * DPR,
    (W / 2 - cam.x * z + shx + z * HW * RC) * DPR, (H / 2 - cam.y * z + shy + z * HH * RF) * DPR);
}

// ---------- Mapa de dados (overlay) ----------
const OVERLAYS = {
  power: { n: 'Energia', f: i => isPowT(G.type[i]) ? (G.flags[i] & F_POW ? [60, 220, 90] : [240, 50, 50]) : null },
  water: { n: 'Água', f: i => (G.type[i] === T_ZONE || G.type[i] === T_BLD || isRoadT(G.type[i])) ? (G.flags[i] & F_WAT ? [60, 150, 255] : [240, 60, 50]) : null },
  pol: { n: 'Poluição', f: i => ramp(M.pol[i], [[0, [40, 200, 80]], [120, [240, 200, 40]], [255, [160, 40, 30]]]) },
  lv: { n: 'Valor do Solo', f: i => G.terr[i] ? null : ramp(M.lv[i], [[0, [150, 40, 40]], [110, [230, 200, 60]], [255, [40, 200, 120]]]) },
  crime: { n: 'Criminalidade', f: i => ramp(M.crime[i], [[0, [50, 160, 220]], [100, [230, 180, 50]], [255, [200, 20, 60]]]) },
  traf: { n: 'Trânsito', f: i => (isRoadT(G.type[i]) || G.type[i] === T_BRIDGE) ? ramp(M.traf[i], [[0, [60, 220, 90]], [128, [250, 210, 40]], [255, [230, 30, 30]]]) : null },
  police: { n: 'Polícia', f: i => covRamp(M.police[i], [60, 110, 255]) },
  fire: { n: 'Bombeiros', f: i => covRamp(M.fire[i], [255, 90, 40]) },
  health: { n: 'Saúde', f: i => covRamp(M.health[i], [255, 80, 140]) },
  edu: { n: 'Educação', f: i => covRamp(M.edu[i], [180, 110, 255]) },
  park: { n: 'Lazer', f: i => covRamp(M.park[i], [60, 220, 120]) },
  transit: { n: 'Transporte Público', f: i => covRamp(M.transit[i], [40, 200, 255]) },
  dens: { n: 'Densidade', f: i => G.type[i] === T_ZONE && G.lvl[i] > 0 ? ramp(G.lvl[i] * 23, [[0, [80, 200, 255]], [128, [250, 220, 60]], [255, [255, 60, 160]]]) : null },
};
function ramp(v, stops) {
  for (let k = 1; k < stops.length; k++) if (v <= stops[k][0]) { const [a, ca] = stops[k - 1], [b, cb] = stops[k]; const t = (v - a) / (b - a); return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]; }
  return stops[stops.length - 1][1];
}
function covRamp(v, c) { if (v < 4) return [70, 70, 80]; const t = v / 255; return [70 + (c[0] - 70) * t, 70 + (c[1] - 70) * t, 80 + (c[2] - 80) * t]; }
function rebuildOverlay() {
  if (!overlay || !ovCtx) return;
  const img = ovCtx.createImageData(N, N), d = img.data, f = OVERLAYS[overlay].f;
  for (let i = 0; i < N2; i++) { const c = f(i); const o = i * 4; if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 200; } else d[o + 3] = 0; }
  ovCtx.putImageData(img, 0, 0); ovDirty = false;
}

// ---------- Minimapa ----------
let mmCanvas, mmCtx, mmBase, mmBaseCtx, mmLast = 0;
function minimapInit(c) { mmCanvas = c; mmCtx = c.getContext('2d'); }
function rebuildMinimap() {
  if (!mmBase || mmBase.width !== N) { mmBase = document.createElement('canvas'); mmBase.width = mmBase.height = N; mmBaseCtx = mmBase.getContext('2d'); }
  const img = mmBaseCtx.createImageData(N, N), d = img.data;
  for (let i = 0; i < N2; i++) {
    const t = G.type[i]; let c;
    if (G.terr[i] && !isRoadT(t) && t !== T_BRIDGE) c = [36, 84, 140];
    else if (t === T_ZONE) { const l = G.lvl[i]; c = G.zt[i] === ZR ? [70 + l * 5, 190 - l * 4, 90] : G.zt[i] === ZC ? [70, 130 + l * 4, 230] : [230, 180 + l * 3, 60]; if (l === 0) c = [c[0] * 0.6 + 40, c[1] * 0.6 + 40, c[2] * 0.6 + 40]; }
    else if (isRoadT(t)) c = t === T_HWY ? [40, 40, 44] : [95, 95, 100];
    else if (t === T_BRIDGE) c = [150, 140, 130];
    else if (t === T_BLD) c = [210, 210, 220];
    else if (t === T_RUBBLE) c = [120, 100, 80];
    else if (t === T_PLINE) c = [150, 140, 120];
    else c = G.tree[i] ? [42, 104, 40] : [96, 146, 70];
    if (G.flags[i] & F_FIRE) c = [255, 90, 20];
    const o = i * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  mmBaseCtx.putImageData(img, 0, 0); minimapDirty = false;
}
function drawMinimap() {
  if (!mmCtx) return;
  const now = performance.now();
  if (minimapDirty && now - mmLast > 3000) { rebuildMinimap(); mmLast = now; }
  if (!mmBase) rebuildMinimap();
  const w = mmCanvas.width, h = mmCanvas.height, k = (w - 8) / (2 * N), oy = (h - N * k) / 2;
  mmCtx.setTransform(1, 0, 0, 1, 0, 0); mmCtx.clearRect(0, 0, w, h);
  mmCtx.imageSmoothingEnabled = false;
  mmCtx.setTransform(k * RA, k * 0.5 * RD, k * RB, k * 0.5 * RE, w / 2 + k * RC, oy + k * 0.5 * RF);
  mmCtx.drawImage(mmBase, 0, 0);
  if (overlay && ovCanvas) { mmCtx.globalAlpha = 0.85; mmCtx.drawImage(ovCanvas, 0, 0); mmCtx.globalAlpha = 1; }
  const c = [screenToGrid(0, 0), screenToGrid(W, 0), screenToGrid(W, H), screenToGrid(0, H)];
  mmCtx.strokeStyle = '#fff'; mmCtx.lineWidth = 1.5 / k; mmCtx.beginPath(); mmCtx.moveTo(c[0][0], c[0][1]); for (let j = 1; j < 4; j++) mmCtx.lineTo(c[j][0], c[j][1]); mmCtx.closePath(); mmCtx.stroke();
}
function minimapToGrid(mx, my) {
  const w = mmCanvas.width, h = mmCanvas.height, k = (w - 8) / (2 * N);
  const X = (mx - w / 2) / k, Y = (my - (h - N * k) / 2) / (k * 0.5);
  return viewToWorld((X + Y) / 2, (Y - X) / 2);
}

// ---------- Quadro principal ----------
let fpsAcc = 0, fpsN = 0;
function resize() {
  DPR = SETTINGS.hq ? Math.min(window.devicePixelRatio || 1, 2) : 1;   // OTIMIZAÇÃO: 1:1 por padrão
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  if (OFF) { OFF.width = cv.width; OFF.height = cv.height; }
  if (!UI.inGame && document.querySelector('#skyline')) drawMenuSkyline();
}
function lensOn() { return !UI.cinema && UI.hover && (VIS.lens || (SETTINGS.autoLens && UI.tool !== 'inspect' && UI.tool !== 'bulldoze')); }
// desenha a camada de objetos (dia 'o' ou noite 'n') aplicando lente raio-X / transparência
function drawObjLayer(vis, which, alpha, comp) {
  const lens = lensOn(), special = lens || VIS.trans;
  let g = ctx;
  if (special) {
    if (!OFF) { OFF = document.createElement('canvas'); OFF.width = cv.width; OFF.height = cv.height; offCtx = OFF.getContext('2d'); }
    g = offCtx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, OFF.width, OFF.height);
  }
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (const t of vis) { const c = t.e[which] || (which === 'o' ? t.fo : null); if (c) g.drawImage(c, t.sx, t.sy, t.w, t.h); }
  if (!special) return;
  if (lens) {
    const [mx, my] = UI.mouse, R = VIS.lensR;
    const gr = g.createRadialGradient(mx, my, R * 0.55, mx, my, R);
    gr.addColorStop(0, 'rgba(0,0,0,0.88)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.beginPath(); g.arc(mx, my, R, 0, 6.283); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const ga = ctx.globalAlpha, co = ctx.globalCompositeOperation;
  ctx.globalAlpha = alpha * (VIS.trans ? 0.32 : 1); if (comp) ctx.globalCompositeOperation = comp;
  ctx.drawImage(OFF, 0, 0);
  ctx.globalAlpha = ga; ctx.globalCompositeOperation = co;
}
function render(dt) {
  if (!G) return;
  const tStart = performance.now();
  frameT += dt;
  const z = cam.z;
  let shx = 0, shy = 0;
  if (SHAKE > 0) { shx = (Math.random() - 0.5) * 14 * SHAKE; shy = (Math.random() - 0.5) * 10 * SHAKE; SHAKE = Math.max(0, SHAKE - dt * 1.2); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#1f4f7c'; ctx.fillRect(0, 0, W, H);
  const level = z <= 0.3 ? 0 : z <= 0.6 ? 1 : 2;
  const night = SETTINGS.daynight && nightF > 0.02;
  // de dia, as camadas noturnas são liberadas (economiza memória de vídeo)
  if (!night && frameT - (render.freedN || 0) > 2) { render.freedN = frameT; for (const m of CACHE) for (const e of m.values()) if (e.n || e.nE) { if (e.n) e.n.width = 0; e.n = null; e.nE = false; e.nv = -1; } }
  const t0 = performance.now();
  let rendered = 0, drawn = 0;
  ctx.imageSmoothingEnabled = true;
  // ladrilhos visíveis
  const wx0 = cam.x - (W / 2 + shx) / z, wx1 = cam.x + (W / 2 - shx) / z, wy0 = cam.y - (H / 2 + shy) / z, wy1 = cam.y + (H / 2 - shy) / z;
  const tx0 = Math.max(Math.floor(-N * HW / TS) - 1, Math.floor(wx0 / TS)), tx1 = Math.min(Math.ceil(N * HW / TS) + 1, Math.floor(wx1 / TS));
  const ty0 = Math.max(-2, Math.floor(wy0 / TS)), ty1 = Math.min(Math.ceil((2 * N * HH + 60) / TS), Math.floor(wy1 / TS));
  const vis = [];
  const offX = W / 2 - cam.x * z + shx, offY = H / 2 - cam.y * z + shy;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const k = tkey(tx, ty), e = getEntry(level, k); e.used = frameT;
    const sx = Math.round(tx * TS * z + offX), sy = Math.round(ty * TS * z + offY);
    const t = { k, e, sx, sy, w: Math.round((tx + 1) * TS * z + offX) - sx, h: Math.round((ty + 1) * TS * z + offY) - sy, cx: sx - W / 2, cy: sy - H / 2 };
    vis.push(t);
  }
  // 0) OTIMIZAÇÃO: ladrilhos que ainda não existem são criados com orçamento de tempo;
  //    no máximo UM ladrilho desatualizado é refeito por quadro (o mais perto do centro).
  const redrawMin = UI.speed >= 3 ? 1.0 : REDRAW_MIN;
  vis.sort((a, b) => (a.cx * a.cx + a.cy * a.cy) - (b.cx * b.cx + b.cy * b.cy));
  let best = null;
  for (const t of vis) {
    const e = t.e;
    for (const w of ['g', 'o']) {
      if (!tileHas(e, w)) { if (performance.now() - t0 < 35) { renderTile(e, level, t.k, w); e.lastF = frameT; rendered++; } }
      else if (!best && !tileFresh(e, t.k, w) && frameT - e.lastF > redrawMin) best = [e, t.k, w];
    }
  }
  if (best && rendered === 0) { renderTile(best[0], level, best[1], best[2]); if (best[2] === 'o') { const e2 = best[0]; if (!tileFresh(e2, best[1], 'g')) renderTile(e2, level, best[1], 'g'); } best[0].lastF = frameT; rendered++; }
  // substitutos de outro nível de zoom enquanto o ladrilho não existe
  for (const t of vis) { if (!t.e.g || (!t.e.o && !t.e.oE)) for (let l = 2; l >= 0; l--) { if (l === level) continue; const o = CACHE[l].get(t.k); if (o) { if (!t.e.g && o.g) t.fg = o.g; if (!t.e.o && !t.e.oE && o.o) t.fo = o.o; } } }
  // 1) chão
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (const t of vis) { const c = t.e.g || t.fg; if (c) { ctx.drawImage(c, t.sx, t.sy, t.w, t.h); drawn++; } }
  const worldT = () => ctx.setTransform(z * DPR, 0, 0, z * DPR, offX * DPR, offY * DPR);
  // 2) veículos e pedestres no chão (entre o chão e os objetos)
  worldT(); drawTraffic();
  // 3) objetos (cobrem corretamente quem está atrás)
  if (!VIS.hide) drawObjLayer(vis, 'o', 1, null);
  // 3b) carros sobre os viadutos
  worldT(); drawElevatedTraffic();
  // 4) efeitos
  worldT(); drawEffects();
  // 5) noite
  if (night) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    const k = nightF;
    ctx.fillStyle = 'rgb(' + (255 - 205 * k | 0) + ',' + (255 - 190 * k | 0) + ',' + (255 - 120 * k | 0) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    let nr = 0;
    for (const t of vis) {
      const e = t.e; if (!tileFresh(e, t.k, 'o')) continue;
      if (!tileHas(e, 'n') ? performance.now() - t0 < 35 : (nr === 0 && rendered === 0 && !tileFresh(e, t.k, 'n') && frameT - e.lastN > redrawMin)) { renderTile(e, level, t.k, 'n'); e.lastN = frameT; nr++; }
    }
    if (!VIS.hide) {
      if (lensOn() || VIS.trans) drawObjLayer(vis, 'n', Math.min(1, k * 1.3), 'lighter');
      else { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k * 1.3); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); for (const t of vis) if (t.e.n) ctx.drawImage(t.e.n, t.sx, t.sy, t.w, t.h); }
    }
    worldT(); drawNightLights();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (duskF > 0.02 && SETTINGS.daynight) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,120,40,' + duskF + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // 6) mapas de dados
  if (overlay) {
    if (ovDirty) rebuildOverlay();
    gridMatrix(ctx, z, shx, shy); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.62; ctx.drawImage(ovCanvas, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
    if (overlay === 'transit') drawMetroLines();
  }
  // 7) cursor / pré-visualização / anel da lente
  gridMatrix(ctx, z, shx, shy); drawPreview();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (lensOn() && !VIS.hide) { const [mx, my] = UI.mouse; ctx.strokeStyle = 'rgba(120,220,255,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(mx, my, VIS.lensR, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
  drawWeather(dt);
  evictCache();
  renderStats.rendered = rendered; renderStats.chunks = drawn; renderStats.ms = performance.now() - tStart;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { renderStats.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  drawMinimap();
}

function visibleGridBounds(margin) {
  const c = [screenToGrid(0, 0), screenToGrid(W, 0), screenToGrid(W, H + MT * cam.z * 0.5), screenToGrid(0, H + MT * cam.z * 0.5)];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [Math.max(0, Math.floor(x0) - margin), Math.max(0, Math.floor(y0) - margin), Math.min(N - 1, Math.ceil(x1) + margin), Math.min(N - 1, Math.ceil(y1) + margin)];
}
function onScreen(wx, wy, m) { const sx = (wx - cam.x) * cam.z + W / 2, sy = (wy - cam.y) * cam.z + H / 2; return sx > -m && sy > -m && sx < W + m && sy < H + m; }

// ---------- Efeitos por cima dos objetos ----------
function drawEffects() {
  const z = cam.z, g = ctx, tm = frameT; _g = g;
  if (z >= 0.3) {
    for (const [a, arr] of SMOKE_SRC) {
      if (G.own[a] !== a) { SMOKE_SRC.delete(a); continue; }
      for (const s of arr) {
        if (!onScreen(s.x, s.y, 120)) continue;
        for (let k = 0; k < 5; k++) {
          const p = ((tm * 0.18 + k / 5 + (a % 97) / 97) % 1);
          const rr = 3 + p * 14, sx = s.x + p * 26 + Math.sin(tm + k) * 2, sy = s.y - p * 40;
          g.fillStyle = 'rgba(205,205,205,' + (0.45 * (1 - p)) + ')'; g.beginPath(); g.arc(sx, sy, rr, 0, 6.283); g.fill();
        }
      }
    }
    for (const [a, hub] of WIND_HUBS) {
      if (G.own[a] !== a) { WIND_HUBS.delete(a); continue; }
      if (!onScreen(hub.x, hub.y, 60)) continue;
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 2; g.beginPath();
      for (let b = 0; b < 3; b++) { const an = tm * 2.2 + b * 2.094 + a; g.moveTo(hub.x, hub.y); g.lineTo(hub.x + Math.cos(an) * 20, hub.y + Math.sin(an) * 20); }
      g.stroke(); g.fillStyle = '#ddd'; g.beginPath(); g.arc(hub.x, hub.y, 2.4, 0, 6.283); g.fill();
    }
  }
  for (const i of FIRES) {
    const x = i % N, y = (i / N) | 0, wx = PX(x + 0.5, y + 0.5), wy = PY(x + 0.5, y + 0.5, 0);
    if (!onScreen(wx, wy, 80)) continue;
    const a = G.own[i] >= 0 ? G.own[i] : i; const hgt = G.type[i] === T_ZONE ? Math.min(60, 8 + G.lvl[a] * 6) : 14;
    for (let k = 0; k < 4; k++) {
      const f = Math.sin(tm * 9 + k * 1.7 + i) * 0.5 + 0.5, ox = (k - 1.5) * 7, h = hgt * (0.5 + f * 0.6);
      g.fillStyle = k % 2 ? 'rgba(255,120,20,0.85)' : 'rgba(255,210,60,0.8)';
      g.beginPath(); g.moveTo(wx + ox - 6, wy); g.quadraticCurveTo(wx + ox, wy - h * 1.3, wx + ox + 6, wy); g.fill();
    }
    g.fillStyle = 'rgba(60,60,60,0.35)'; g.beginPath(); g.arc(wx + 10 + Math.sin(tm) * 3, wy - hgt - 20, 14, 0, 6.283); g.fill();
  }
  if (TORNADO) {
    const wx = PX(TORNADO.x, TORNADO.y), wy = PY(TORNADO.x, TORNADO.y, 0);
    for (let k = 0; k < 22; k++) {
      const p = k / 22, rr = 6 + p * 40, an = tm * 8 + k * 0.6;
      g.strokeStyle = 'rgba(120,115,110,' + (0.6 - p * 0.3) + ')'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(wx + Math.sin(tm * 3 + p * 3) * 10 * p, wy - p * 200, rr, rr * 0.35, 0, an, an + 4.5); g.stroke();
    }
  }
  const now = performance.now();
  METEORS = METEORS.filter(m => {
    const p = (now - m.t0) / 1300;
    const wx = PX(m.x, m.y), wy = PY(m.x, m.y, 0);
    if (p >= 1) { meteorImpact(m); return false; }
    const sx = wx + (1 - p) * 500, sy = wy - (1 - p) * 900;
    g.strokeStyle = 'rgba(255,180,80,0.6)'; g.lineWidth = 10; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 80, sy - 140); g.stroke();
    g.fillStyle = '#ffdd88'; g.beginPath(); g.arc(sx, sy, 9, 0, 6.283); g.fill();
    return true;
  });
}
function drawNightLights() {
  const g = ctx; _g = g;
  drawHeadlights(g);
  const blink = Math.sin(frameT * 4) > 0.3, ga = g.globalAlpha;
  if (blink) for (const [a, arr] of BEACONS) {
    if (a >= 0 ? G.own[a] !== a : !isDeckI(-1 - a)) { BEACONS.delete(a); continue; }
    for (const b of arr) { if (!onScreen(b.x, b.y, 30)) continue; g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, 2.2, 0, 6.283); g.fill(); g.globalAlpha = ga * 0.5; g.drawImage(GLOW, b.x - 10, b.y - 10, 20, 20); g.globalAlpha = ga; }
  }
  for (const [a, l] of LIGHTHOUSES) { // feixe giratório do farol
    if (G.own[a] !== a) { LIGHTHOUSES.delete(a); continue; }
    const an = frameT * 1.2; g.fillStyle = 'rgba(255,245,200,0.18)'; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(l.x + Math.cos(an - 0.08) * 260, l.y + Math.sin(an - 0.08) * 130); g.lineTo(l.x + Math.cos(an + 0.08) * 260, l.y + Math.sin(an + 0.08) * 130); g.closePath(); g.fill();
  }
  for (const i of FIRES) { const x = i % N, y = (i / N) | 0, wx = PX(x + 0.5, y + 0.5), wy = PY(x + 0.5, y + 0.5, 0); if (onScreen(wx, wy, 80)) g.drawImage(GLOW, wx - 40, wy - 60, 80, 80); }
}
function drawMetroLines() {
  const ms = M.metros; if (ms.length < 2) return;
  ctx.strokeStyle = 'rgba(80,160,255,0.95)'; ctx.lineWidth = 0.35; ctx.setLineDash([0.8, 0.5]);
  ctx.beginPath();
  for (let a = 0; a < ms.length; a++) {
    const ax = ms[a] % N + 0.5, ay = ((ms[a] / N) | 0) + 0.5;
    let best = -1, bd = 1e9;
    for (let b = 0; b < ms.length; b++) { if (a === b) continue; const bx = ms[b] % N + 0.5, by = ((ms[b] / N) | 0) + 0.5; const d = Math.hypot(bx - ax, by - ay); if (d < bd) { bd = d; best = b; } }
    if (best >= 0) { ctx.moveTo(ax, ay); ctx.lineTo(ms[best] % N + 0.5, ((ms[best] / N) | 0) + 0.5); }
  }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#fff'; for (const m of ms) { ctx.beginPath(); ctx.arc(m % N + 0.5, ((m / N) | 0) + 0.5, 0.45, 0, 6.283); ctx.fill(); }
}
function drawWeather(dt) {
  if (!SETTINGS.weather) return;
  const k = weather.kind;
  if (k === 'nublado' || k === 'chuva' || k === 'tempestade') { ctx.fillStyle = k === 'nublado' ? 'rgba(40,50,70,0.10)' : 'rgba(30,40,60,0.22)'; ctx.fillRect(0, 0, W, H); }
  if (k === 'chuva' || k === 'tempestade') {
    const n = k === 'tempestade' ? 420 : 240;
    while (weather.drops.length < n) weather.drops.push([Math.random() * W, Math.random() * H, 0.7 + Math.random() * 0.6]);
    weather.drops.length = n;
    ctx.strokeStyle = 'rgba(190,210,240,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const d of weather.drops) { d[1] += dt * 900 * d[2]; d[0] -= dt * 160 * d[2]; if (d[1] > H) { d[1] = -10; d[0] = Math.random() * (W + 200); } ctx.moveTo(d[0], d[1]); ctx.lineTo(d[0] - 3, d[1] + 12 * d[2]); }
    ctx.stroke();
  }
  if (k === 'tempestade') {
    if (Math.random() < dt * 0.25) { weather.flash = 1; setTimeout(() => sfx('thunder'), 300 + Math.random() * 900); }
    if (weather.flash > 0) { ctx.fillStyle = 'rgba(230,235,255,' + weather.flash * 0.55 + ')'; ctx.fillRect(0, 0, W, H); weather.flash -= dt * 4; }
  }
}
