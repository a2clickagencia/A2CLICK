'use strict';
// =====================================================================================
//  VEÍCULOS E PEDESTRES
//  Desenhados a cada quadro ENTRE a camada de chão e a de objetos (ver render.js):
//  prédios, árvores e postes que estão à frente cobrem os carros corretamente.
//  Carros em viadutos são desenhados depois dos objetos (estão no alto).
//  OTIMIZAÇÃO: formas agrupadas por cor em Path2D (~60 chamadas de desenho por quadro),
//  pedestres via atlas de sprites (1 drawImage cada) e limites máximos por quadro.
// =====================================================================================
const CAR_COLORS = [[232, 232, 232], [205, 50, 50], [40, 90, 180], [30, 30, 34], [240, 195, 40], [140, 146, 154], [50, 135, 70], [245, 245, 240], [150, 60, 120], [90, 50, 40], [70, 160, 200]];
const TAXI_COL = [245, 200, 30], BUS_COL = [235, 235, 230], TRUCK_BOX = [236, 236, 230], GLASS_COL = [60, 85, 110];
const SHIRTS = ['#e24c4c', '#3f7fe0', '#f2c53d', '#4cbf73', '#ffffff', '#a05ad6', '#ff8a3d', '#2c2c34', '#62d0d8', '#e86fa8'];
const PANTS = ['#2b3550', '#3a3a3a', '#5a4630', '#1e2a44', '#6b6f78'];
const SKINS = ['#f1c9a5', '#d9a77e', '#b07a52', '#7a4e32', '#f6d8bd'];
const V_CAR = 0, V_TAXI = 1, V_BUS = 2, V_TRUCK = 3;
const PED_MIN_ZOOM = 0.8;   // zoom mínimo para ver pedestres
const CAR_MIN_ZOOM = 0.42;  // zoom mínimo para ver veículos
const MAX_PEDS_PER_TILE = 5;
const MAX_CARS = 520, MAX_PEDS = 650;   // limites por quadro (cidades enormes continuam lisas)
let CARS = [], CARS_UP = [];
const DIRS_OF = []; for (let m = 0; m < 16; m++) { const a = []; for (let d = 0; d < 4; d++) if (m & (1 << d)) a.push(d); DIRS_OF.push(a); }
const PARK_KEYS = { plaza: 1, park: 1, bigpark: 1, zoo: 1, sports: 1, playground: 1, skate: 1, soccer: 1, amph: 1, garden: 1, waterpark: 1, ferris: 1 };
function frac(v) { return v - Math.floor(v); }

// ---------- Lotes de desenho ----------
// passes: 0 sombras · 1 carrocerias · 2 cabines/vidros · 3 detalhes
const BATCH = []; for (let k = 0; k < 4; k++) BATCH.push(new Map());
function bp(pass, style) { const m = BATCH[pass]; let p = m.get(style); if (!p) { p = new Path2D(); m.set(style, p); } return p; }
function flushBatch(g) { for (let pass = 0; pass < BATCH.length; pass++) { for (const [style, p] of BATCH[pass]) { g.fillStyle = style; g.fill(p); } BATCH[pass].clear(); } }
const SHADES = new Map();
function shades(c) {
  const key = c[0] * 65536 + c[1] * 256 + c[2]; let s = SHADES.get(key);
  if (!s) { const f = k => 'rgb(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ')'; s = [f(0.8), f(0.62), f(1.06)]; SHADES.set(key, s); }
  return s;
}
// quadrilátero com pontos do MUNDO (usa a projeção global com rotação)
function pq(p, a0, a1, a2, b0, b1, b2, c0, c1, c2, d0, d1, d2) {
  p.moveTo(PX(a0, a1), PY(a0, a1, a2)); p.lineTo(PX(b0, b1), PY(b0, b1, b2)); p.lineTo(PX(c0, c1), PY(c0, c1, c2)); p.lineTo(PX(d0, d1), PY(d0, d1, d2)); p.closePath();
}
// quadrilátero em coordenadas da VISTA (u,v)
function pv(p, a0, a1, a2, b0, b1, b2, c0, c1, c2, d0, d1, d2) {
  p.moveTo((a0 - a1) * HW, (a0 + a1) * HH - a2); p.lineTo((b0 - b1) * HW, (b0 + b1) * HH - b2);
  p.lineTo((c0 - c1) * HW, (c0 + c1) * HH - c2); p.lineTo((d0 - d1) * HW, (d0 + d1) * HH - d2); p.closePath();
}
function wU(gx, gy) { return ROT === 0 ? gx : ROT === 1 ? N - gy : ROT === 2 ? N - gx : gy; }
function wV(gx, gy) { return ROT === 0 ? gy : ROT === 1 ? gx : ROT === 2 ? N - gy : N - gx; }
// caixa: o retângulo do mundo é convertido para a vista; desenha as faces que a câmera vê
function vbox(pass, x0, y0, x1, y1, z0, z1, col, topCol) {
  const ua = wU(x0, y0), ub = wU(x1, y1), va = wV(x0, y0), vb = wV(x1, y1);
  const u0 = ua < ub ? ua : ub, u1 = ua < ub ? ub : ua, v0 = va < vb ? va : vb, v1 = va < vb ? vb : va;
  const s = shades(col);
  pv(bp(pass, s[0]), u0, v1, z0, u1, v1, z0, u1, v1, z1, u0, v1, z1);
  pv(bp(pass, s[1]), u1, v1, z0, u1, v0, z0, u1, v0, z1, u1, v1, z1);
  pv(bp(pass, topCol ? shades(topCol)[2] : s[2]), u0, v0, z1, u1, v0, z1, u1, v1, z1, u0, v1, z1);
}

// ---------- Laço principal do tráfego ----------
function carsOnTile(x, y, i, t, m, list, tm, z, zFn) {
  const tr = M.traf[i]; if (tr < 8 || !m) return;
  const dirs = DIRS_OF[m];
  let n = tr > 180 ? 4 : tr > 100 ? 3 : tr > 40 ? 2 : 1; if (z < 0.7) n = 1;
  const h = hash32(i + (zFn ? 77777 : 0));
  for (let k = 0; k < n; k++) {
    if (CARS.length + CARS_UP.length >= MAX_CARS * 9) return;
    const hk = hash32(h + k * 977);
    const dA = dirs[hk % dirs.length], dB = dirs[(hk >>> 8) % dirs.length];
    const sp = (t === T_HWY ? 0.9 : 0.55) * (1 - tr / 400);
    const p = frac(tm * sp + (hk & 1023) / 1024);
    let gx, gy, ax, ay, zz = 0;
    if (p < 0.5) { const q = p * 2; gx = x + 0.5 + DX[dA] * 0.5 * (1 - q); gy = y + 0.5 + DY[dA] * 0.5 * (1 - q); ax = -DX[dA]; ay = -DY[dA]; if (zFn) zz = zFn(dA, 1 - q); }
    else { const q = p * 2 - 1; gx = x + 0.5 + DX[dB] * 0.5 * q; gy = y + 0.5 + DY[dB] * 0.5 * q; ax = DX[dB]; ay = DY[dB]; if (zFn) zz = zFn(dB, q); }
    const lane = t === T_HWY ? ((hk >>> 3) & 1 ? 0.13 : 0.32) : 0.12;   // mão direita
    gx += -ay * lane; gy += ax * lane;
    const r = (hk >>> 12) & 63;
    const kind = r < 3 ? V_BUS : r < 7 ? V_TRUCK : r < 10 ? V_TAXI : V_CAR;
    list.push(gx, gy, ax, ay, x, y, kind, (hk >>> 18) % CAR_COLORS.length, zz);
  }
}
function drawTraffic() {
  const z = cam.z, g = ctx;
  CARS = []; CARS_UP = []; PEDQ = [];
  if (z < CAR_MIN_ZOOM) return;
  const tm = frameT, peds = z >= PED_MIN_ZOOM, pedMul = 1 - nightF * 0.7;
  const [x0, y0, x1, y1] = visibleGridBounds(1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * N + x, t = G.type[i];
    if (t === T_BLD) { if (peds && G.own[i] === i && PARK_KEYS[BYID[G.bk[i]].key]) parkWalkers(i, tm); continue; }
    if (t !== T_ROAD && t !== T_HWY && t !== T_BRIDGE) continue;
    if (!onScreen(PX(x + 0.5, y + 0.5), PY(x + 0.5, y + 0.5, 0), 60)) continue;
    const deck = isDeckI(i);
    if (t !== T_BRIDGE) {
      const m = roadConn(x, y);
      if (peds && t === T_ROAD && M.ped && M.ped[i] && !G.terr[i] && PEDQ.length < MAX_PEDS * 3) sidewalkWalkers(x, y, i, m, tm, pedMul);
      carsOnTile(x, y, i, t, m, CARS, tm, z, null);
    }
    if (deck) {
      const m = deckConn(x, y);
      if (brKind(i) === BR_VIA) { const zE = d => viaEndZ(x, y, d), ay = brAxisY(i), zMid = (zE(ay ? 0 : 3) + zE(ay ? 2 : 1)) / 2; carsOnTile(x, y, i, T_ROAD, m, CARS_UP, tm, z, (d, q) => zMid + (zE(d) - zMid) * q); }
      else carsOnTile(x, y, i, T_ROAD, m, CARS, tm, z, null);
    }
  }
  drawCarList(g, CARS, z);
  flushPeds(g, tm);
}
// carros no viaduto: desenhados depois dos objetos, mas escondidos se um prédio à frente os cobre
function drawElevatedTraffic() {
  if (!CARS_UP.length) return;
  const vis = []; for (let k = 0; k < CARS_UP.length; k += 9) if (VIS.hide || !headlightHidden(CARS_UP[k + 4], CARS_UP[k + 5], CARS_UP[k + 8])) for (let j = 0; j < 9; j++) vis.push(CARS_UP[k + j]);
  drawCarList(ctx, vis, cam.z);
}
// OTIMIZAÇÃO v1.2: veículos vêm de um ATLAS de sprites pré-desenhados (tipo × cor × direção na vista).
// Desenhar milhares de polígonos por quadro sobrecarregava a GPU (o app caía para ~10 FPS);
// agora cada veículo é um único drawImage, que a GPU agrupa em lote.
const CAR_CW = 34, CAR_CH = 26, CAR_OX = 17, CAR_OY = 17, CAR_S = 3;   // célula do atlas (px do mundo) e escala
let CAR_ATLAS = null;
const VDIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function carSlot(kind, col, dir) { const c = kind === V_TAXI ? 11 : kind === V_BUS ? 12 : col; return (kind * 13 + c) * 4 + dir; }
function buildCarAtlas() {
  const cells = 4 * 13 * 4, cols = 16, rows = Math.ceil(cells / cols);
  const c = document.createElement('canvas'); c.width = cols * CAR_CW * CAR_S; c.height = rows * CAR_CH * CAR_S;
  const g = c.getContext('2d');
  const saveR = ROT; ROT = 0; setRotCoeffs();   // desenha na orientação padrão da vista
  for (let kind = 0; kind < 4; kind++) for (let col = 0; col < 13; col++) for (let dir = 0; dir < 4; dir++) {
    if (kind === V_TAXI && col !== 11) continue; if (kind === V_BUS && col !== 12) continue; if ((kind === V_CAR || kind === V_TRUCK) && col > 10) continue;
    const slot = carSlot(kind, col, dir), ox = (slot % cols) * CAR_CW * CAR_S, oy = ((slot / cols) | 0) * CAR_CH * CAR_S;
    g.setTransform(CAR_S, 0, 0, CAR_S, ox + CAR_OX * CAR_S, oy + CAR_OY * CAR_S);
    const color = kind === V_TAXI ? TAXI_COL : kind === V_BUS ? BUS_COL : CAR_COLORS[col];
    vehicle(0, 0, VDIR[dir][0], VDIR[dir][1], kind, color, 2, 0);
    flushBatch(g);
  }
  ROT = saveR; setRotCoeffs();
  CAR_ATLAS = { c, cols };
}
function drawCarList(g, list, z) {
  if (!CAR_ATLAS) buildCarAtlas();
  const order = []; for (let k = 0; k < list.length; k += 9) order.push(k);
  order.sort((a, b) => (PY(list[a], list[a + 1], 0) - PY(list[b], list[b + 1], 0)));
  const A = CAR_ATLAS, sw = CAR_CW * CAR_S, shh = CAR_CH * CAR_S;
  for (const k of order) {
    const gx = list[k], gy = list[k + 1], ax = list[k + 2], ay = list[k + 3];
    // direção do movimento NA VISTA (acompanha a rotação da câmera)
    const du = wU(gx + ax, gy + ay) - wU(gx, gy), dv = wV(gx + ax, gy + ay) - wV(gx, gy);
    const dir = dv < -0.5 ? 0 : du > 0.5 ? 1 : dv > 0.5 ? 2 : 3;
    const slot = carSlot(list[k + 6], list[k + 7], dir);
    g.drawImage(A.c, (slot % A.cols) * sw, ((slot / A.cols) | 0) * shh, sw, shh, PX(gx, gy) - CAR_OX, PY(gx, gy, list[k + 8]) - CAR_OY, CAR_CW, CAR_CH);
  }
}

// Veículo em 3D isométrico: carroceria + cabine com vidros (ônibus, caminhão, táxi, carro)
function vehicle(gx, gy, ax, ay, kind, col, z, zo) {
  const L = kind === V_BUS ? 0.42 : kind === V_TRUCK ? 0.34 : 0.2, Wd = kind >= V_BUS ? 0.115 : 0.095;
  const alongX = ax !== 0, hl = L / 2, hw = Wd / 2;
  const x0 = alongX ? gx - hl : gx - hw, x1 = alongX ? gx + hl : gx + hw, y0 = alongX ? gy - hw : gy - hl, y1 = alongX ? gy + hw : gy + hl;
  pq(bp(0, 'rgba(0,0,0,0.22)'), x0 + 0.02, y0 + 0.02, zo, x1 + 0.03, y0 + 0.02, zo, x1 + 0.03, y1 + 0.03, zo, x0 + 0.02, y1 + 0.03, zo);
  if (z < 0.7) { vbox(1, x0, y0, x1, y1, zo + 0.6, zo + (kind >= V_BUS ? 7 : 4), col); return; }
  const s = alongX ? (ax > 0 ? 1 : -1) : (ay > 0 ? 1 : -1);
  const seg = (a, b) => segOf(alongX, s, gx, gy, hl, L, x0, y0, x1, y1, a, b);
  if (kind === V_BUS) {
    vbox(1, x0, y0, x1, y1, zo + 0.8, zo + 8.5, col, [210, 210, 205]);
    const b = seg(0.05, 0.95); vbox(2, b[0] - 0.001, b[1] - 0.001, b[2] + 0.001, b[3] + 0.001, zo + 4, zo + 7.2, [40, 60, 85], [210, 210, 205]);
  } else if (kind === V_TRUCK) {
    const b = seg(0, 0.68).slice(), c = seg(0.7, 1);
    vbox(1, b[0], b[1], b[2], b[3], zo + 0.8, zo + 8, TRUCK_BOX);
    vbox(1, c[0], c[1], c[2], c[3], zo + 0.8, zo + 4, col);
    vbox(2, c[0], c[1], c[2], c[3], zo + 4, zo + 5.8, GLASS_COL, col);
  } else {
    vbox(1, x0, y0, x1, y1, zo + 0.8, zo + 3.3, col);
    const c = seg(0.2, 0.75);
    vbox(2, c[0], c[1], c[2], c[3], zo + 3.3, zo + 5.6, GLASS_COL, col);
    if (kind === V_TAXI) { const cx = (c[0] + c[2]) / 2, cy = (c[1] + c[3]) / 2; vbox(3, cx - 0.02, cy - 0.02, cx + 0.02, cy + 0.02, zo + 5.6, zo + 6.8, [255, 255, 255]); }
  }
}
const SEG = [0, 0, 0, 0];
function segOf(alongX, s, gx, gy, hl, L, x0, y0, x1, y1, a, b) {
  if (alongX) { const u0 = gx - s * hl + s * a * L, u1 = gx - s * hl + s * b * L; SEG[0] = u0 < u1 ? u0 : u1; SEG[1] = y0; SEG[2] = u0 < u1 ? u1 : u0; SEG[3] = y1; }
  else { const v0 = gy - s * hl + s * a * L, v1 = gy - s * hl + s * b * L; SEG[0] = x0; SEG[1] = v0 < v1 ? v0 : v1; SEG[2] = x1; SEG[3] = v0 < v1 ? v1 : v0; }
  return SEG;
}

// ---------- Pedestres ----------
function sidewalkWalkers(x, y, i, m, tm, mul) {
  const canX = m & 10, canY = m & 5; if (!canX && !canY) return;
  const cnt = Math.min(MAX_PEDS_PER_TILE, 1 + (M.ped[i] >> 3)) * mul;
  const h = hash32(i * 13 + 5), off = ROAD_W + SIDEWALK * 0.55;
  for (let k = 0; k < cnt; k++) {
    const hk = hash32(h + k * 7919);
    const axisX = canX && canY ? (hk & 1) : canX;
    const side = (hk >>> 1) & 1 ? 1 : -1, dir = (hk >>> 2) & 1 ? 1 : -1, sp = 0.09 + ((hk >>> 3) & 7) * 0.012;
    const p = frac(tm * sp * dir + ((hk >>> 6) & 1023) / 1024);
    person(axisX ? x + p : x + 0.5 + side * off, axisX ? y + 0.5 + side * off : y + p, hk);
  }
}
// visitantes andando SOBRE os caminhos (o chão do parque está na camada de chão)
function parkWalkers(a, tm) {
  const d = BYID[G.bk[a]], s = d.s, X0 = a % N, Y0 = (a / N) | 0, cx = X0 + s / 2, cy = Y0 + s / 2;
  if (!onScreen(PX(cx, cy), PY(cx, cy, 0), 140)) return;
  const n = d.key === 'plaza' ? 5 : d.key === 'playground' ? 4 : s * 4;
  for (let k = 0; k < n; k++) {
    const hk = hash32(a * 31 + k * 101);
    let gx, gy;
    const loop = r0 => { const an = tm * (0.22 + (hk & 7) * 0.03) * ((hk >>> 3) & 1 ? 1 : -1) + (hk & 1023); gx = cx + Math.cos(an) * r0; gy = cy + Math.sin(an) * r0; };
    const roam = (m0) => { const an = tm * 0.5 + (hk & 255); gx = cx + Math.cos(an * 0.7 + hk) * (s / 2 - m0) * Math.sin(an * 0.31); gy = cy + Math.sin(an * 0.9 + hk) * (s / 2 - m0) * Math.cos(an * 0.23); };
    const cross = (w) => { const p = frac(tm * (0.03 + (hk & 7) * 0.004) * ((hk >>> 4) & 1 ? 1 : -1) + ((hk >>> 8) & 1023) / 1024); const o = (hk >>> 5) & 1 ? w : -w; if ((hk >>> 6) & 1) { gx = X0 + 0.05 + p * (s - 0.1); gy = cy + o; } else { gx = cx + o; gy = Y0 + 0.05 + p * (s - 0.1); } };
    switch (d.key) {
      case 'plaza': loop(0.33); break;
      case 'playground': roam(0.18); break;
      case 'sports': case 'skate': case 'soccer': case 'waterpark': roam(0.3); break;
      case 'ferris': case 'amph': loop(s * 0.32); break;
      case 'bigpark': if ((hk >>> 9) & 1) loop(0.32); else cross(0.03); break;
      default: cross(0.025);
    }
    person(gx, gy, hk);
  }
}
// Pessoas: sprites pré-desenhados num atlas (camisa × pele × calça × 4 passos)
const PED_W = 5, PED_H = 9, PED_S = 3, PED_FRAMES = 4;
let PED_ATLAS = null, PEDQ = [];
function buildPedAtlas() {
  const combos = SHIRTS.length * SKINS.length * PANTS.length;
  const cw = PED_W * PED_S, chh = PED_H * PED_S, cols = PED_FRAMES * 10;
  const c = document.createElement('canvas'); c.width = cw * cols; c.height = chh * Math.ceil(combos * PED_FRAMES / cols);
  const g = c.getContext('2d');
  for (let k = 0; k < combos; k++) {
    const sh0 = SHIRTS[k % SHIRTS.length], sk = SKINS[((k / SHIRTS.length) | 0) % SKINS.length], pa = PANTS[(k / (SHIRTS.length * SKINS.length)) | 0];
    for (let f = 0; f < PED_FRAMES; f++) {
      const cell = k * PED_FRAMES + f, ox = (cell % cols) * cw, oy = ((cell / cols) | 0) * chh;
      g.setTransform(PED_S, 0, 0, PED_S, ox + 2.5 * PED_S, oy + 8.4 * PED_S);
      const sw = Math.sin(f / PED_FRAMES * Math.PI * 2) * 0.9;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0.6, 0, 1.6, 0.7, 0, 0, 6.283); g.fill();
      g.strokeStyle = pa; g.lineWidth = 0.85; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.4, -2.8); g.lineTo(-0.4 + sw, 0); g.moveTo(0.4, -2.8); g.lineTo(0.4 - sw, 0); g.stroke();
      g.fillStyle = sh0; g.fillRect(-0.95, -5.8, 1.9, 3.1);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0.3, -5.8, 0.65, 3.1);
      g.fillStyle = sk; g.beginPath(); g.arc(0, -6.8, 0.95, 0, 6.283); g.fill();
      if (k % 3 === 0) { g.fillStyle = '#2a2420'; g.beginPath(); g.arc(0, -7.15, 0.92, Math.PI, 0); g.fill(); }
    }
  }
  PED_ATLAS = { c, cw, chh, cols };
}
function person(gx, gy, hk) { if (PEDQ.length < MAX_PEDS * 3) PEDQ.push(PX(gx, gy), PY(gx, gy, 0), hk); }
function flushPeds(g, tm) {
  if (!PEDQ.length) return;
  if (!PED_ATLAS) buildPedAtlas();
  const A = PED_ATLAS, combos = SHIRTS.length * SKINS.length * PANTS.length;
  for (let k = 0; k < PEDQ.length; k += 3) {
    const sx = PEDQ[k], sy = PEDQ[k + 1], hk = PEDQ[k + 2];
    const f = ((tm * 6 + (hk & 63)) | 0) % PED_FRAMES, cell = ((hk >>> 9) % combos) * PED_FRAMES + f;
    g.drawImage(A.c, (cell % A.cols) * A.cw, ((cell / A.cols) | 0) * A.chh, A.cw, A.chh, sx - 2.5, sy - 8.4, PED_W, PED_H);
  }
}

// ---------- Faróis à noite ----------
// escondidos quando um prédio À FRENTE NA VISTA cobre o carro (usa a altura BHT dos prédios)
function headlightHidden(x, y, zo) {
  const U = viewCellU(x, y), V = viewCellV(x, y);
  for (let s = 1; s <= 12; s++) for (let i = 0; i <= s; i++) {
    const j = s - i; if (Math.abs(i - j) > 1) continue;
    const u = U + i, v = V + j; if (u >= N || v >= N) continue;
    if (BHT[worldCellY(u, v) * N + worldCellX(u, v)] > s * HH - 2 + zo) return true;
  }
  return false;
}
function drawHeadlights(g) {
  if (!BHT) return;
  const front = new Path2D(), back = new Path2D(), ga = g.globalAlpha;
  for (const list of [CARS, CARS_UP]) for (let k = 0; k < list.length; k += 9) {
    const gx = list[k], gy = list[k + 1], ax = list[k + 2], ay = list[k + 3], zo = list[k + 8];
    if (headlightHidden(list[k + 4], list[k + 5], zo)) continue;
    const L = list[k + 6] >= V_BUS ? 0.2 : 0.1;
    front.rect(PX(gx + ax * L, gy + ay * L) - 0.9, PY(gx + ax * L, gy + ay * L, 2 + zo) - 0.9, 1.8, 1.8);
    back.rect(PX(gx - ax * L, gy - ay * L) - 0.7, PY(gx - ax * L, gy - ay * L, 2 + zo) - 0.7, 1.4, 1.4);
    const ex = PX(gx + ax * (L + 0.18), gy + ay * (L + 0.18)), ey = PY(gx + ax * (L + 0.18), gy + ay * (L + 0.18), zo);
    g.globalAlpha = ga * 0.35; g.drawImage(GLOW, ex - 7, ey - 4, 14, 8); g.globalAlpha = ga;
  }
  g.fillStyle = 'rgba(255,245,200,0.95)'; g.fill(front);
  g.fillStyle = 'rgba(255,40,30,0.9)'; g.fill(back);
}
