'use strict';
// =====================================================================================
//  RUAS, CALÇADAS, FAIXAS, POSTES, SEMÁFOROS, PONTES E VIADUTOS
//  Todas as funções daqui desenham no "referencial local" do tile (ver setLocalFrame):
//  as máscaras de vizinhança são giradas com rotMask() para acompanhar a câmera.
//  Larguras em unidades de tile (1 = um tile). Altere aqui para mudar o visual das vias.
// =====================================================================================
const ROAD_W = 0.30;      // meia-largura do asfalto da rua
const HWY_W = 0.44;       // meia-largura do asfalto da avenida expressa
const SIDEWALK = 0.10;    // largura da calçada
const VIA_Z = 24;         // altura do tabuleiro dos viadutos
const ROAD_COL = { asphalt: '#4a4c52', hwy: '#3c3e43', walk: '#cdc8bd', curb: '#9a958a', shoulder: '#9d9890', yellow: 'rgba(255,212,70,0.9)', white: 'rgba(255,255,255,0.85)' };
// tipos de ponte (G.br: bits 0-2 = tipo, bit 4 = eixo Y no mundo)
const BR_SIMPLE = 1, BR_ARCH = 2, BR_CABLE = 3, BR_VIA = 4;

function gq(g, x0, y0, x1, y1, z) { mv(x0, y0, z); ln(x1, y0, z); ln(x1, y1, z); ln(x0, y1, z); g.closePath(); }
function roadShape(g, x, y, m, w) {
  const c0 = 0.5 - w, c1 = 0.5 + w;
  gq(g, x + c0, y + c0, x + c1, y + c1, 0);
  if (m & 1) gq(g, x + c0, y, x + c1, y + 0.5, 0);
  if (m & 4) gq(g, x + c0, y + 0.5, x + c1, y + 1, 0);
  if (m & 2) gq(g, x + 0.5, y + c0, x + 1, y + c1, 0);
  if (m & 8) gq(g, x, y + c0, x + 0.5, y + c1, 0);
}
function connCount(m) { return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1); }

// ---------- Conectividade (no MUNDO) ----------
const isDeckI = i => G.br && G.br[i] !== 0;
const brKind = i => G.br[i] & 7;
const brAxisY = i => (G.br[i] & 16) !== 0;
// rua no chão: liga com ruas vizinhas e com a ponta de pontes/viadutos alinhados (rampa)
function roadConn(x, y) {
  const i = y * N + x, self = isDeckI(i); let m = 0;
  for (let d = 0; d < 4; d++) {
    const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
    const j = ny * N + nx, t = G.type[j];
    if (t === T_ROAD || t === T_HWY) m |= 1 << d;
    else if (!self && t === T_BRIDGE && brAxisY(j) === ((d & 1) === 0)) m |= 1 << d;
  }
  return m;
}
// tabuleiro da ponte/viaduto: só ao longo do seu eixo
function deckConn(x, y) {
  const i = y * N + x, ay = brAxisY(i); let m = 0;
  for (const d of ay ? [0, 2] : [1, 3]) {
    const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
    const j = ny * N + nx, t = G.type[j];
    if ((isDeckI(j) && brAxisY(j) === ay) || ((t === T_ROAD || t === T_HWY) && !isDeckI(j))) m |= 1 << d;
  }
  return m;
}
// altura do tabuleiro de viaduto em cada ponta (direção do mundo d) → rampas nas extremidades
function viaEndZ(x, y, d) {
  const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) return VIA_Z;
  const j = ny * N + nx;
  if (isDeckI(j) && brKind(j) === BR_VIA) return VIA_Z;
  return (G.type[j] === T_ROAD || G.type[j] === T_HWY) ? 0 : VIA_Z;
}
// altura do carro sobre o viaduto: p ∈ [0,1] do lado d0 para o lado d1
function viaZ(x, y, d0, d1, p) { const a = viaEndZ(x, y, d0), b = viaEndZ(x, y, d1); return a + (b - a) * p; }

// ---------- Chão das ruas ----------
function drawRoadGround(g, x, y, i, t) {
  const m = rotMask(roadConn(x, y)), hw = t === T_HWY, legacyBridge = G.terr[i], w = hw ? HWY_W : ROAD_W, n = connCount(m);
  if (legacyBridge) { drawWaterDeck(g, x, y, i, m, BR_SIMPLE); return; }
  if (!hw) {
    g.fillStyle = ROAD_COL.walk; g.beginPath(); roadShape(g, x, y, m, w + SIDEWALK); g.fill();
    if (LOD >= 2) { // juntas da calçada
      g.strokeStyle = 'rgba(120,115,105,0.25)'; g.lineWidth = 0.35; g.beginPath();
      for (let k = 1; k < 4; k++) { const u = k / 4; if (m & 10) { mv(x + u, y + 0.5 - w - SIDEWALK, 0); ln(x + u, y + 0.5 - w, 0); mv(x + u, y + 0.5 + w, 0); ln(x + u, y + 0.5 + w + SIDEWALK, 0); } if (m & 5) { mv(x + 0.5 - w - SIDEWALK, y + u, 0); ln(x + 0.5 - w, y + u, 0); mv(x + 0.5 + w, y + u, 0); ln(x + 0.5 + w + SIDEWALK, y + u, 0); } }
      g.stroke();
    }
    if (LOD >= 1) { g.fillStyle = ROAD_COL.curb; g.beginPath(); roadShape(g, x, y, m, w + 0.018); g.fill(); }
  } else { g.fillStyle = ROAD_COL.shoulder; g.beginPath(); roadShape(g, x, y, m, w + 0.05); g.fill(); }
  g.fillStyle = hw ? ROAD_COL.hwy : ROAD_COL.asphalt; g.beginPath(); roadShape(g, x, y, m, w); g.fill();
  if (LOD >= 2) {
    const h = hash32(i * 3 + 1);
    if ((h & 7) < 3) { g.fillStyle = 'rgba(0,0,0,0.12)'; const gx = x + 0.5 + (((h >>> 4) & 63) / 63 - 0.5) * w, gy = y + 0.5 + (((h >>> 10) & 63) / 63 - 0.5) * w; g.beginPath(); g.ellipse(PX(gx, gy), PY(gx, gy, 0), 4, 1.6, 0, 0, 6.283); g.fill(); }
    if ((h & 15) === 5 && !hw) { g.fillStyle = '#3a3b3f'; g.beginPath(); g.ellipse(PX(x + 0.42, y + 0.42), PY(x + 0.42, y + 0.42, 0), 2.2, 1.1, 0, 0, 6.283); g.fill(); }
  }
  if (LOD < 1) return;
  roadMarkings(g, x, y, m, hw, w, n, 0);
}
const DIRS_END = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
function roadMarkings(g, x, y, m, hw, w, n, z) {
  if (hw) {
    if (n <= 2) { g.fillStyle = '#b7b2a8'; g.beginPath(); for (let d = 0; d < 4; d++) if (m & (1 << d)) { const [ex, ey] = DIRS_END[d]; if (d % 2) gq(g, Math.min(x + 0.5, x + ex), y + 0.48, Math.max(x + 0.5, x + ex), y + 0.52, z); else gq(g, x + 0.48, Math.min(y + 0.5, y + ey), x + 0.52, Math.max(y + 0.5, y + ey), z); } g.fill(); }
    g.strokeStyle = ROAD_COL.white; g.lineWidth = 0.7; g.setLineDash([4, 5]); g.beginPath();
    for (let d = 0; d < 4; d++) if (m & (1 << d)) { const [ex, ey] = DIRS_END[d]; for (const o of [-0.24, 0.24]) { if (d % 2) { mv(x + 0.5, y + 0.5 + o, z); ln(x + ex, y + 0.5 + o, z); } else { mv(x + 0.5 + o, y + 0.5, z); ln(x + 0.5 + o, y + ey, z); } } }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6; g.beginPath();
    for (let d = 0; d < 4; d++) if (m & (1 << d)) { const [ex, ey] = DIRS_END[d]; for (const o of [-w + 0.03, w - 0.03]) { if (d % 2) { mv(x + 0.5, y + 0.5 + o, z); ln(x + ex, y + 0.5 + o, z); } else { mv(x + 0.5 + o, y + 0.5, z); ln(x + 0.5 + o, y + ey, z); } } }
    g.stroke();
  } else if (n <= 2) {
    g.strokeStyle = ROAD_COL.yellow; g.lineWidth = 0.75; g.setLineDash([4, 4]); g.beginPath();
    for (let d = 0; d < 4; d++) if (m & (1 << d)) { const [ex, ey] = DIRS_END[d]; mv(x + 0.5, y + 0.5, z); ln(x + ex, y + ey, z); }
    g.stroke(); g.setLineDash([]);
  } else {
    g.fillStyle = 'rgba(245,245,240,0.92)'; g.beginPath();
    const s0 = w + 0.015, s1 = Math.min(0.49, w + 0.13), st = (2 * w) / 9;
    for (let d = 0; d < 4; d++) if (m & (1 << d)) {
      for (let k = 0; k < 9; k += 2) {
        const a = 0.5 - w + k * st, b = a + st;
        if (d === 1) gq(g, x + 0.5 + s0, y + a, x + 0.5 + s1, y + b, z);
        else if (d === 3) gq(g, x + 0.5 - s1, y + a, x + 0.5 - s0, y + b, z);
        else if (d === 2) gq(g, x + a, y + 0.5 + s0, x + b, y + 0.5 + s1, z);
        else gq(g, x + a, y + 0.5 - s1, x + b, y + 0.5 - s0, z);
      }
    }
    g.fill();
  }
}

// ---------- Pontes sobre a água (camada de chão: carros passam por cima) ----------
function drawWaterDeck(g, x, y, i, mView, kind) {
  const axisY = mView ? (mView & 5) !== 0 && !(mView & 10) : false;
  const ax = axisY ? 'y' : 'x', w = ROAD_W, e = w + 0.07;
  const cx = x + 0.5, cy = y + 0.5;
  // estrutura sob o tabuleiro
  if (LOD >= 1) {
    if (kind === BR_ARCH) {
      // arcada de pedra: parede da frente com abertura em arco
      const fy = y + 0.5 + e, fx = x + 0.5 + e;
      g.fillStyle = '#a58f72';
      if (ax === 'x') { g.beginPath(); q4(x, fy, 0, x + 1, fy, 0, x + 1, fy, -15, x, fy, -15); g.fill(); g.fillStyle = WATER_SH[2]; g.beginPath(); g.ellipse(PX(cx, fy), PY(cx, fy, -15), 11, 10, 0, Math.PI, 0); g.fill(); }
      else { g.beginPath(); q4(fx, y, 0, fx, y + 1, 0, fx, y + 1, -15, fx, y, -15); g.fill(); g.fillStyle = WATER_SH[2]; g.beginPath(); g.ellipse(PX(fx, cy), PY(fx, cy, -15), 11, 10, 0, Math.PI, 0); g.fill(); }
    } else {
      const sx = PX(cx, cy), sy = PY(cx, cy, 0);
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(sx + 3, sy + 17, 9, 3.5, 0, 0, 6.283); g.fill();
      g.fillStyle = kind === BR_CABLE ? '#e5e3de' : '#7b746a'; g.fillRect(sx - 3, sy, 6, 17); g.fillStyle = kind === BR_CABLE ? '#b9b6ae' : '#5f594f'; g.fillRect(sx + 1, sy, 2, 17);
    }
  }
  // tabuleiro
  g.fillStyle = kind === BR_CABLE ? '#e2e0da' : kind === BR_ARCH ? '#b8a68a' : '#a39d92';
  g.beginPath(); if (ax === 'x') gq(g, x, cy - e, x + 1, cy + e, 0); else gq(g, cx - e, y, cx + e, y + 1, 0); g.fill();
  g.fillStyle = ROAD_COL.asphalt; g.beginPath(); if (ax === 'x') gq(g, x, cy - w, x + 1, cy + w, 0); else gq(g, cx - w, y, cx + w, y + 1, 0); g.fill();
  if (LOD < 1) return;
  g.strokeStyle = ROAD_COL.yellow; g.lineWidth = 0.75; g.setLineDash([4, 4]); g.beginPath();
  if (ax === 'x') { mv(x, cy, 0); ln(x + 1, cy, 0); } else { mv(cx, y, 0); ln(cx, y + 1, 0); }
  g.stroke(); g.setLineDash([]);
  // guarda-corpos
  g.strokeStyle = kind === BR_CABLE ? '#f4f4f0' : '#d8d2c6'; g.lineWidth = 1; g.beginPath();
  if (ax === 'x') { for (const o of [-e, e]) { mv(x, cy + o, 3); ln(x + 1, cy + o, 3); } for (let k = 0; k <= 4; k++) { mv(x + k / 4, cy + e, 0); ln(x + k / 4, cy + e, 3); } }
  else { for (const o of [-e, e]) { mv(cx + o, y, 3); ln(cx + o, y + 1, 3); } for (let k = 0; k <= 4; k++) { mv(cx + e, y + k / 4, 0); ln(cx + e, y + k / 4, 3); } }
  g.stroke();
}
function bridgeViewMask(x, y, i) { const m = rotMask(deckConn(x, y)); if (m) return m; return rotMask(brAxisY(i) ? 5 : 10); }

// ---------- Objetos das pontes: torres estaiadas e viadutos ----------
function drawDeckObjects(g, x, y, i) {
  const kind = brKind(i), mView = bridgeViewMask(x, y, i);
  const axisYv = (mView & 5) !== 0 && !(mView & 10);
  const cx = x + 0.5, cy = y + 0.5;
  if (kind === BR_CABLE && G.terr[i]) {
    const along = brAxisY(i) ? y : x;
    if (along % 6 !== 3 || NIGHT) { if (NIGHT && along % 6 === 3) { const sx = PX(cx, cy), sy = PY(cx, cy, 92); g.drawImage(GLOW, sx - 6, sy - 6, 12, 12); } return; }
    const e = ROAD_W + 0.12, H = 92;
    const masts = axisYv ? [[cx - e, cy], [cx + e, cy]] : [[cx, cy - e], [cx, cy + e]];
    // cabos em leque (desenhados antes das torres)
    g.strokeStyle = 'rgba(240,240,235,0.85)'; g.lineWidth = 0.5; g.beginPath();
    for (const [mx, my] of masts) for (let k = 1; k <= 3; k++) for (const sgn of [-1, 1]) {
      const tx = axisYv ? mx : mx + sgn * k * 0.85, ty = axisYv ? my + sgn * k * 0.85 : my;
      mv(mx, my, H - k * 6); ln(tx, ty, 3);
    }
    g.stroke();
    for (const [mx, my] of masts) box(mx - 0.05, my - 0.05, mx + 0.05, my + 0.05, 0, H, [236, 234, 228]);
    if (axisYv) box(cx - e, cy - 0.04, cx + e, cy + 0.04, H - 18, H - 13, [220, 218, 212]); else box(cx - 0.04, cy - e, cx + 0.04, cy + e, H - 18, H - 13, [220, 218, 212]);
    beacon(-1 - i, cx, cy, H + 2, '#ff3030');
    return;
  }
  if (kind !== BR_VIA) return;
  // ---- viaduto: tabuleiro elevado com rampas nas pontas ----
  // altura nas duas pontas (direções de vista do eixo → direções do mundo)
  const dA = axisYv ? 0 : 3, dB = axisYv ? 2 : 1;
  const zA = viaEndZ(x, y, (dA - ROT) & 3), zB = viaEndZ(x, y, (dB - ROT) & 3);
  const e = ROAD_W + 0.07, th = 3;
  if (NIGHT) {
    g.fillStyle = '#000'; g.beginPath();
    if (axisYv) q4(cx - e, y, zA, cx + e, y, zA, cx + e, y + 1, zB, cx - e, y + 1, zB); else q4(x, cy - e, zA, x + 1, cy - e, zB, x + 1, cy + e, zB, x, cy + e, zA);
    g.fill();
    if (G.flags[i] & F_POW) { const sx = PX(cx, cy), sy = PY(cx, cy, (zA + zB) / 2 + 12); g.globalAlpha = 0.6; g.drawImage(GLOW, sx - 10, sy - 10, 20, 20); g.globalAlpha = 1; }
    if ((zA + zB) / 2 + 30 > MAXZ) MAXZ = (zA + zB) / 2 + 30;
    return;
  }
  const zMin = Math.min(zA, zB);
  if (zMin > 6 && G.type[i] !== T_ROAD && G.type[i] !== T_HWY) box(cx - 0.07, cy - 0.07, cx + 0.07, cy + 0.07, 0, zMin - th, [176, 172, 164]);   // pilar
  else if (zMin > 6) { // pilares nas laterais quando cruza uma rua
    if (axisYv) { box(cx - e - 0.08, cy - 0.06, cx - e + 0.02, cy + 0.06, 0, zMin - th, [176, 172, 164]); box(cx + e - 0.02, cy - 0.06, cx + e + 0.08, cy + 0.06, 0, zMin - th, [176, 172, 164]); }
    else { box(cx - 0.06, cy - e - 0.08, cx + 0.06, cy - e + 0.02, 0, zMin - th, [176, 172, 164]); box(cx - 0.06, cy + e - 0.02, cx + 0.06, cy + e + 0.08, 0, zMin - th, [176, 172, 164]); }
  }
  // laje: face lateral visível + topo inclinado
  if (axisYv) {
    fillQ('#8e8a82', cx + e, y, zA - th, cx + e, y + 1, zB - th, cx + e, y + 1, zB, cx + e, y, zA);
    fillQ('#a9a59c', cx - e, y + 1, zB - th, cx + e, y + 1, zB - th, cx + e, y + 1, zB, cx - e, y + 1, zB);
    fillQ('#b9b5ac', cx - e, y, zA, cx + e, y, zA, cx + e, y + 1, zB, cx - e, y + 1, zB);
    fillQ(ROAD_COL.asphalt, cx - ROAD_W, y, zA + 0.2, cx + ROAD_W, y, zA + 0.2, cx + ROAD_W, y + 1, zB + 0.2, cx - ROAD_W, y + 1, zB + 0.2);
  } else {
    fillQ('#a9a59c', x, cy + e, zA - th, x + 1, cy + e, zB - th, x + 1, cy + e, zB, x, cy + e, zA);
    fillQ('#8e8a82', x + 1, cy + e, zB - th, x + 1, cy - e, zB - th, x + 1, cy - e, zB, x + 1, cy + e, zB);
    fillQ('#b9b5ac', x, cy - e, zA, x + 1, cy - e, zB, x + 1, cy + e, zB, x, cy + e, zA);
    fillQ(ROAD_COL.asphalt, x, cy - ROAD_W, zA + 0.2, x + 1, cy - ROAD_W, zB + 0.2, x + 1, cy + ROAD_W, zB + 0.2, x, cy + ROAD_W, zA + 0.2);
  }
  if (LOD >= 1) {
    g.strokeStyle = ROAD_COL.yellow; g.lineWidth = 0.75; g.setLineDash([4, 4]); g.beginPath();
    if (axisYv) { mv(cx, y, zA + 0.3); ln(cx, y + 1, zB + 0.3); } else { mv(x, cy, zA + 0.3); ln(x + 1, cy, zB + 0.3); }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#e6e2d8'; g.lineWidth = 1; g.beginPath();
    for (const o of [-e, e]) { if (axisYv) { mv(cx + o, y, zA + 3); ln(cx + o, y + 1, zB + 3); } else { mv(x, cy + o, zA + 3); ln(x + 1, cy + o, zB + 3); } }
    g.stroke();
  }
  if (Math.max(zA, zB) + 4 > MAXZ) MAXZ = Math.max(zA, zB) + 4;
}

// ---------- Postes e semáforos (na calçada DA FRENTE da vista) ----------
function drawRoadObjects(g, x, y, i, t) {
  if (LOD < 1 || t === T_HWY || G.terr[i]) return;
  const m = rotMask(roadConn(x, y)), n = connCount(m), h = hash32(i * 7 + 3), w = ROAD_W;
  const powered = G.flags[i] & F_POW;
  if (n >= 3) {
    if (isDeckI(i)) return;
    const gx = x + 0.5 + w + 0.05, gy = y + 0.5 + w + 0.05;
    if (!NIGHT) {
      line3(gx, gy, 0, gx, gy, 15, '#3b3d41', 1.1);
      box(gx - 0.025, gy - 0.025, gx + 0.025, gy + 0.025, 12.5, 18.5, [46, 48, 52]);
      const ph = ((x * 7 + y * 3) & 1); _g.fillStyle = ph ? '#4cff7a' : '#ff4a3a'; _g.beginPath(); _g.arc(PX(gx, gy + 0.025), PY(gx, gy + 0.025, ph ? 13.8 : 17.2), 0.8, 0, 6.283); _g.fill();
    } else if (powered) { const ph = ((x * 7 + y * 3) & 1); g.globalAlpha = 0.9; g.drawImage(GLOW, PX(gx, gy) - 5, PY(gx, gy, ph ? 13.8 : 17.2) - 5, 10, 10); g.globalAlpha = 1; }
    return;
  }
  if (h & 1) return;
  const alongX = (m & 10) && !(m & 5), alongY = (m & 5) && !(m & 10);
  if (!alongX && !alongY) return;
  const gx = alongX ? x + 0.5 : x + 0.5 + w + 0.055, gy = alongX ? y + 0.5 + w + 0.055 : y + 0.5;
  const hx = alongX ? gx : gx - 0.14, hy = alongX ? gy - 0.14 : gy;
  if (!NIGHT) {
    line3(gx, gy, 0, gx, gy, 18, '#5a5d62', 1.1);
    line3(gx, gy, 18, hx, hy, 18.5, '#5a5d62', 0.9);
    box(hx - 0.035, hy - 0.035, hx + 0.035, hy + 0.035, 17, 18.6, [70, 72, 76], [230, 230, 220]);
  } else if (powered) {
    g.globalAlpha = 0.75; g.drawImage(GLOW, PX(hx, hy) - 7, PY(hx, hy, 17) - 7, 14, 14);
    g.globalAlpha = 0.35; const cx = PX(x + 0.5, y + 0.5), cy = PY(x + 0.5, y + 0.5, 0); g.drawImage(GLOW, cx - 22, cy - 11, 44, 22); g.globalAlpha = 1;
  }
}
