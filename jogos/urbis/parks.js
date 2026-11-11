'use strict';
// =====================================================================================
//  PARQUES E MONUMENTOS
//  drawParkGround(): caminhos, gramados, lagos, quadras, piscinas — vai na CAMADA DE CHÃO,
//     recortado tile a tile. Assim as pessoas andam POR CIMA dos caminhos (antes o parque
//     inteiro era uma "imagem" na camada de objetos e cobria quem passeava).
//  drawParkObjects(): árvores, brinquedos, estufas, arquibancadas — camada de objetos.
//  drawExtraBuilding(): os novos monumentos da versão 1.2.
// =====================================================================================
const PARK_GROUND_KEYS = { plaza: 1, park: 1, bigpark: 1, sports: 1, zoo: 1, playground: 1, skate: 1, soccer: 1, amph: 1, garden: 1, waterpark: 1, ferris: 1 };
const PATH_COL = '#d8caa6', PAVE_COL = '#cfc8b8';
const FERRIS = new Map(); // anchor -> {x,y,r}

function fq(col, x0, y0, x1, y1, z) { _g.fillStyle = col; _g.beginPath(); gq(_g, x0, y0, x1, y1, z || 0); _g.fill(); }
function ell(col, gx, gy, rx, ry, z) { _g.fillStyle = col; _g.beginPath(); _g.ellipse(PX(gx, gy), PY(gx, gy, z || 0), rx, ry, 0, 0, 6.283); _g.fill(); }

// ---------- CHÃO ----------
function drawParkGround(a, k) {
  const d = BYID[G.bk[a]], s = d.s, X0 = a % N, Y0 = (a / N) | 0, X1 = X0 + s, Y1 = Y0 + s, cx = X0 + s / 2, cy = Y0 + s / 2, g = _g;
  fq('#67a852', X0, Y0, X1, Y1);
  const cross = (w) => { fq(PATH_COL, cx - w, Y0, cx + w, Y1); fq(PATH_COL, X0, cy - w, X1, cy + w); };
  switch (k) {
    case 'plaza':
      fq(PAVE_COL, X0 + 0.04, Y0 + 0.04, X1 - 0.04, Y1 - 0.04);
      if (LOD >= 2) { g.strokeStyle = 'rgba(140,130,115,0.35)'; g.lineWidth = 0.4; g.beginPath(); for (let k2 = 1; k2 < 5; k2++) { mv(X0 + k2 / 5, Y0, 0); ln(X0 + k2 / 5, Y1, 0); mv(X0, Y0 + k2 / 5, 0); ln(X1, Y0 + k2 / 5, 0); } g.stroke(); }
      fq('#6aa956', X0 + 0.06, Y0 + 0.06, X0 + 0.3, Y0 + 0.3); fq('#6aa956', X1 - 0.3, Y1 - 0.3, X1 - 0.06, Y1 - 0.06);
      ell('#bbb3a3', cx, cy, 9, 4.5); ell('#5fb2e6', cx, cy, 6.5, 3.2, 0.3);
      break;
    case 'park': cross(0.05); ell('#3d86c0', X0 + 0.5, Y1 - 0.5, 7, 3.5); break;
    case 'bigpark':
      cross(0.06);
      ell('#3d86c0', X0 + s * 0.27, Y1 - s * 0.27, s * 8.5, s * 4.25); if (LOD >= 1) { g.strokeStyle = '#cfe6f5'; g.lineWidth = 1; g.stroke(); }   // lago num quadrante livre
      ell('#bbb3a3', cx, cy, 11, 5.5); ell('#5fb2e6', cx, cy, 8, 4, 0.3);
      break;
    case 'sports':
      fq('#c8683c', X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15);
      if (LOD >= 1) { g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.beginPath(); gq(g, X0 + 0.3, Y0 + 0.3, X1 - 0.3, Y1 - 0.3, 0.1); mv(cx, Y0 + 0.3, 0.1); ln(cx, Y1 - 0.3, 0.1); g.stroke(); }
      break;
    case 'zoo':
      cross(0.06);
      for (let j = 0; j < 4; j++) { const gx = X0 + 0.2 + (j % 2) * s * 0.52, gy = Y0 + 0.2 + ((j / 2) | 0) * s * 0.52, w = s * 0.38; fq(['#c9b37a', '#7fb069', '#a58a5c', '#6f9fc0'][j], gx, gy, gx + w, gy + w); }
      break;
    case 'playground':
      fq('#e4cf96', X0 + 0.1, Y0 + 0.1, X1 - 0.1, Y1 - 0.1); fq('#d8503c', X0 + 0.15, Y0 + 0.55, X0 + 0.45, Y0 + 0.85); fq('#3f88d8', X0 + 0.55, Y0 + 0.15, X0 + 0.85, Y0 + 0.45);
      break;
    case 'skate':
      fq('#c9c6be', X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05);
      ell('#9d9a93', cx - 0.25, cy + 0.2, 22, 11); ell('#7f7c76', cx - 0.25, cy + 0.2, 15, 7.5, -2);
      if (LOD >= 2) { g.fillStyle = '#ff5ad1'; g.font = 'bold 6px sans-serif'; g.fillText('SK8', PX(X1 - 0.7, Y0 + 0.4), PY(X1 - 0.7, Y0 + 0.4, 0)); }
      break;
    case 'soccer': {
      fq('#4f9c3f', X0 + 0.12, Y0 + 0.12, X1 - 0.12, Y1 - 0.12);
      if (LOD >= 1) {
        for (let k2 = 0; k2 < 6; k2 += 2) fq('rgba(255,255,255,0.08)', X0 + 0.12 + k2 * (s - 0.24) / 6, Y0 + 0.12, X0 + 0.12 + (k2 + 1) * (s - 0.24) / 6, Y1 - 0.12);
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9; g.beginPath(); gq(g, X0 + 0.3, Y0 + 0.35, X1 - 0.3, Y1 - 0.35, 0.1); mv(cx, Y0 + 0.35, 0.1); ln(cx, Y1 - 0.35, 0.1);
        gq(g, X0 + 0.3, cy - 0.45, X0 + 0.65, cy + 0.45, 0.1); gq(g, X1 - 0.65, cy - 0.45, X1 - 0.3, cy + 0.45, 0.1); g.stroke();
        g.beginPath(); g.ellipse(PX(cx, cy), PY(cx, cy, 0.1), 12, 6, 0, 0, 6.283); g.stroke();
      }
      break;
    }
    case 'amph':
      fq(PAVE_COL, X0 + 0.1, Y0 + 0.1, X1 - 0.1, Y1 - 0.1);
      for (let k2 = 0; k2 < 5; k2++) { g.strokeStyle = k2 % 2 ? '#b8ae98' : '#a39a86'; g.lineWidth = 3.2; g.beginPath(); g.ellipse(PX(X0 + 0.4, Y0 + 0.4), PY(X0 + 0.4, Y0 + 0.4, 0), 30 + k2 * 9, 15 + k2 * 4.5, 0, 0.1, 1.45); g.stroke(); }
      break;
    case 'garden':
      cross(0.05);
      { const cols = ['#e24c6c', '#f2c53d', '#a05ad6', '#ff8a3d', '#f6f6f6', '#e86fa8'];
        let n = 0; for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) { if (xx === 1 || yy === 1) continue; const gx = X0 + 0.2 + xx * 1.0, gy = Y0 + 0.2 + yy * 1.0; fq('#5a8f3e', gx, gy, gx + 0.6, gy + 0.6); for (let r = 0; r < 3; r++) fq(cols[(n + r) % cols.length], gx + 0.08, gy + 0.08 + r * 0.17, gx + 0.52, gy + 0.18 + r * 0.17, 0.3); n++; } }
      break;
    case 'waterpark':
      fq('#e9e3d4', X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05);
      fq('#3fb6e8', X0 + 0.25, Y0 + 0.3, X0 + 1.6, Y0 + 1.4, 0.2); fq('#59c8f0', X0 + 1.9, Y0 + 1.7, X1 - 0.3, Y1 - 0.3, 0.2);
      ell('#2fa6dc', X0 + 0.9, Y1 - 0.75, 20, 10, 0.2);
      break;
    case 'ferris': fq(PAVE_COL, X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05); break;
  }
}

// ---------- OBJETOS ----------
function parkTrees(X0, Y0, s, n, r, seed, avoid) {
  const pts = [], cx = X0 + s / 2, cy = Y0 + s / 2;
  for (let j = 0; j < n; j++) {
    const gx = X0 + 0.12 + r() * (s - 0.24), gy = Y0 + 0.12 + r() * (s - 0.24);
    if (Math.abs(gx - cx) < 0.12 || Math.abs(gy - cy) < 0.12) continue;
    if (avoid && avoid(gx, gy)) continue;
    pts.push([gx, gy]);
  }
  pts.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));
  for (const [gx, gy] of pts) treeAt(gx, gy, 5 + r() * 3, seed + ((gx * 100) | 0));
}
function fountainJet(a, gx, gy, h) { if (!NIGHT) { _g.fillStyle = 'rgba(230,245,255,0.9)'; _g.fillRect(PX(gx, gy) - 0.8, PY(gx, gy, h), 1.6, h); } beacon(a, gx, gy, 2, '#ffe9b0'); }
function bench(gx, gy) { box(gx - 0.08, gy - 0.025, gx + 0.08, gy + 0.025, 0, 1.6, [130, 90, 55]); }
function lampPost(gx, gy) { if (!NIGHT) { line3(gx, gy, 0, gx, gy, 12, '#4a4c50', 0.9); box(gx - 0.025, gy - 0.025, gx + 0.025, gy + 0.025, 11, 13, [240, 235, 210]); } else { _g.globalAlpha = 0.8; _g.drawImage(GLOW, PX(gx, gy) - 6, PY(gx, gy, 12) - 6, 12, 12); _g.globalAlpha = 1; } }

function drawParkObjects(a, k, X0, Y0, X1, Y1, r, seed) {
  const s = X1 - X0, cx = X0 + s / 2, cy = Y0 + s / 2;
  switch (k) {
    case 'plaza':
      fountainJet(a, cx, cy, 9); bench(X0 + 0.25, cy + 0.32); bench(X1 - 0.25, cy - 0.32);
      lampPost(X0 + 0.12, Y1 - 0.12); lampPost(X1 - 0.12, Y0 + 0.12);
      treeAt(X0 + 0.18, Y0 + 0.18, 5.5, seed); treeAt(X1 - 0.18, Y1 - 0.18, 5.5, seed + 3);
      break;
    case 'park': parkTrees(X0, Y0, s, 8, r, seed, (gx, gy) => Math.hypot(gx - (X0 + 0.5), gy - (Y1 - 0.5)) < 0.36); bench(cx + 0.25, cy + 0.12); lampPost(cx + 0.12, cy + 0.12); break;
    case 'bigpark':
      fountainJet(a, cx, cy, 12);
      parkTrees(X0, Y0, s, 26, r, seed, (gx, gy) => Math.hypot(gx - (X0 + s * 0.27), gy - (Y1 - s * 0.27)) < s * 0.24 || Math.hypot(gx - cx, gy - cy) < 0.45);
      for (const [gx, gy] of [[cx + 0.15, Y0 + 0.4], [cx + 0.15, Y1 - 0.4], [X0 + 0.4, cy + 0.15], [X1 - 0.4, cy + 0.15]]) lampPost(gx, gy);
      break;
    case 'sports':
      line3(X0 + 0.15, Y1 - 0.15, 0, X0 + 0.15, Y1 - 0.15, 10, '#888', 1); line3(X1 - 0.15, Y1 - 0.15, 0, X1 - 0.15, Y1 - 0.15, 10, '#888', 1);
      box(X0 + 0.32, cy - 0.05, X0 + 0.36, cy + 0.05, 6, 9, [240, 240, 240]); box(X1 - 0.36, cy - 0.05, X1 - 0.32, cy + 0.05, 6, 9, [240, 240, 240]);
      for (const [gx, gy] of [[X0 + 0.15, Y0 + 0.15], [X1 - 0.15, Y1 - 0.15]]) { line3(gx, gy, 0, gx, gy, 30, '#999', 1); beacon(a, gx, gy, 30, '#ffffff'); }
      break;
    case 'zoo': {
      for (let j = 0; j < 4; j++) {
        const gx = X0 + 0.2 + (j % 2) * s * 0.52, gy = Y0 + 0.2 + ((j / 2) | 0) * s * 0.52, w = s * 0.38;
        if (!NIGHT) { _g.strokeStyle = '#6b5233'; _g.lineWidth = 0.8; _g.beginPath(); q4(gx, gy, 3, gx + w, gy, 3, gx + w, gy + w, 3, gx, gy + w, 3); _g.stroke(); _g.fillStyle = ['#e0a030', '#8b6b4a', '#555', '#f0f0f0'][j]; for (let m = 0; m < 3; m++) { _g.beginPath(); _g.ellipse(PX(gx + w * (0.3 + m * 0.2), gy + w * 0.5), PY(gx + w * (0.3 + m * 0.2), gy + w * 0.5, 3), 3, 2, 0, 0, 6.283); _g.fill(); } }
        treeAt(gx + w * 0.85, gy + w * 0.15, 5, seed + j);
      }
      box(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 0, 14, [200, 150, 90]); gable(cx - 0.33, cy - 0.33, cx + 0.33, cy + 0.33, 14, 8, [200, 150, 90], [120, 80, 50], true);
      break;
    }
    case 'playground':
      box(X0 + 0.2, Y0 + 0.2, X0 + 0.42, Y0 + 0.42, 0, 9, [240, 200, 60], [220, 70, 60]);      // casinha
      if (!NIGHT) { fillQ('#3fa4e8', X0 + 0.42, Y0 + 0.22, 8, X0 + 0.42, Y0 + 0.4, 8, X0 + 0.8, Y0 + 0.4, 1, X0 + 0.8, Y0 + 0.22, 1); }  // escorregador
      line3(X0 + 0.6, Y0 + 0.62, 0, X0 + 0.6, Y0 + 0.62, 9, '#c33', 0.9); line3(X0 + 0.85, Y0 + 0.62, 0, X0 + 0.85, Y0 + 0.62, 9, '#c33', 0.9); line3(X0 + 0.6, Y0 + 0.62, 9, X0 + 0.85, Y0 + 0.62, 9, '#c33', 0.9); // balanço
      line3(X0 + 0.68, Y0 + 0.62, 9, X0 + 0.68, Y0 + 0.62, 3, '#444', 0.5); line3(X0 + 0.78, Y0 + 0.62, 9, X0 + 0.78, Y0 + 0.62, 3, '#444', 0.5);
      treeAt(X1 - 0.15, Y1 - 0.15, 5, seed);
      break;
    case 'skate':
      if (!NIGHT) { fillQ('#b4b0a8', X1 - 0.55, Y0 + 0.15, 0, X1 - 0.15, Y0 + 0.15, 0, X1 - 0.15, Y0 + 0.15, 8, X1 - 0.55, Y0 + 0.15, 0.5); }
      box(X1 - 0.55, Y0 + 0.15, X1 - 0.15, Y0 + 0.55, 0, 5, [180, 176, 168]);
      box(X0 + 0.2, Y1 - 0.4, X0 + 0.9, Y1 - 0.3, 0, 2, [150, 150, 155]);
      lampPost(X1 - 0.1, Y1 - 0.1); lampPost(X0 + 0.1, Y0 + 0.1);
      break;
    case 'soccer':
      for (const gx of [X0 + 0.3, X1 - 0.3]) { line3(gx, cy - 0.18, 0, gx, cy - 0.18, 6, '#fff', 1); line3(gx, cy + 0.18, 0, gx, cy + 0.18, 6, '#fff', 1); line3(gx, cy - 0.18, 6, gx, cy + 0.18, 6, '#fff', 1); }
      box(X0 + 0.15, Y1 - 0.12, X1 - 0.15, Y1 - 0.02, 0, 3, [190, 190, 195]); box(X0 + 0.15, Y1 - 0.07, X1 - 0.15, Y1 - 0.02, 3, 6, [170, 170, 176]);
      for (const [gx, gy] of [[X0 + 0.1, Y0 + 0.1], [X1 - 0.1, Y0 + 0.1], [X0 + 0.1, Y1 - 0.1], [X1 - 0.1, Y1 - 0.1]]) { line3(gx, gy, 0, gx, gy, 34, '#999', 1); beacon(a, gx, gy, 34, '#ffffff'); }
      break;
    case 'amph': {
      const st = [X1 - 0.95, Y1 - 0.95];
      box(st[0], st[1], X1 - 0.15, Y1 - 0.15, 0, 4, [140, 110, 80], [170, 140, 100]);
      if (!NIGHT) { fillQ('rgba(255,255,255,0.88)', st[0], st[1], 4, X1 - 0.15, st[1], 4, X1 - 0.15, st[1], 26, st[0], st[1], 22); }
      line3(st[0], st[1], 4, st[0], st[1], 22, '#888', 1); line3(X1 - 0.15, st[1], 4, X1 - 0.15, st[1], 26, '#888', 1);
      beacon(a, st[0] + 0.4, st[1] + 0.4, 24, '#ffd060');
      break;
    }
    case 'garden': {
      parkTrees(X0, Y0, s, 6, r, seed, (gx, gy) => Math.hypot(gx - cx, gy - cy) < 0.8);
      // estufa de vidro (cúpula)
      cyl(cx, cy, 0.55, 0, 10, [170, 220, 230], [190, 230, 240]); dome(cx, cy, 0.55, 10, [170, 225, 235]);
      if (!NIGHT && LOD >= 1) { const sx = PX(cx, cy), sy = PY(cx, cy, 10), rx = 0.55 * HW * 1.414; _g.strokeStyle = 'rgba(255,255,255,0.7)'; _g.lineWidth = 0.5; _g.beginPath(); for (let k2 = -2; k2 <= 2; k2++) { _g.moveTo(sx + k2 * rx / 3, sy + 4); _g.lineTo(sx + k2 * rx / 4, sy - rx * 0.8); } _g.stroke(); }
      beacon(a, cx, cy, 30, '#a0ffd0');
      break;
    }
    case 'waterpark': {
      // toboáguas: torre + tubos coloridos
      box(X1 - 0.8, Y0 + 0.2, X1 - 0.45, Y0 + 0.55, 0, 34, [240, 240, 236], [230, 80, 60]);
      if (!NIGHT) {
        const g = _g; g.lineCap = 'round';
        for (const [col, dx] of [['#ff5a3c', 0], ['#ffd23c', 0.18], ['#3cc8ff', 0.36]]) { g.strokeStyle = col; g.lineWidth = 2.6; g.beginPath(); mv(X1 - 0.62, Y0 + 0.37, 33); g.bezierCurveTo(PX(X1 - 0.3 + dx, Y0 + 1.2), PY(X1 - 0.3 + dx, Y0 + 1.2, 28), PX(X0 + 1.2, Y0 + 0.9 + dx), PY(X0 + 1.2, Y0 + 0.9 + dx, 12), PX(X0 + 1.1, Y0 + 1.0 + dx), PY(X0 + 1.1, Y0 + 1.0 + dx, 1)); g.stroke(); }
        g.lineCap = 'butt';
      }
      for (let k2 = 0; k2 < 4; k2++) { const gx = X0 + 1.9 + k2 * 0.18; box(gx, Y0 + 0.6, gx + 0.1, Y0 + 0.75, 0, 7, [[255, 90, 90], [90, 180, 255], [255, 210, 60], [120, 220, 120]][k2]); }
      break;
    }
    case 'ferris': {
      box(X0 + 0.15, Y1 - 0.5, X0 + 0.65, Y1 - 0.15, 0, 9, [230, 80, 90], [250, 240, 230]);  // bilheteria
      // estrutura em A (o aro gira na camada de efeitos)
      line3(cx - 0.35, cy, 0, cx, cy, 52, '#e8e8f0', 2); line3(cx + 0.35, cy, 0, cx, cy, 52, '#e8e8f0', 2);
      // aro, raios e cabines (na camada de objetos → respeita a profundidade dos prédios)
      { const fx = PX(cx, cy), fy = PY(cx, cy, 52), R = 44, g = _g;
        if (NIGHT) { if (LIT) { g.globalAlpha = 0.55; g.drawImage(GLOW, fx - R, fy - R * 1.3, R * 2, R * 2.6); g.globalAlpha = 1; } g.strokeStyle = 'rgba(255,200,240,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(fx, fy, R * 0.55, R, 0, 0, 6.283); g.stroke(); }
        else {
          g.strokeStyle = '#e8e8f0'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(fx, fy, R * 0.55, R, 0, 0, 6.283); g.stroke();
          g.lineWidth = 0.7; g.beginPath(); for (let b = 0; b < 12; b++) { const an = b * 0.5236 + (seed % 7); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(an) * R * 0.55, fy + Math.sin(an) * R); } g.stroke();
          for (let b = 0; b < 12; b++) { const an = b * 0.5236 + (seed % 7); g.fillStyle = ['#ff5a5a', '#ffd23c', '#3cc8ff', '#7ae07a'][b % 4]; g.fillRect(fx + Math.cos(an) * R * 0.55 - 2.5, fy + Math.sin(an) * R - 1, 5, 4.5); }
        }
      }
      if (52 + 46 > MAXZ) MAXZ = 98;
      break;
    }
  }
}

// ---------- NOVOS MONUMENTOS ----------
function drawExtraBuilding(a, k, X0, Y0, X1, Y1, r, seed) {
  const s = X1 - X0, cx = X0 + s / 2, cy = Y0 + s / 2, g = _g;
  switch (k) {
    case 'obelisk':
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.2, '#cfc8b8');
      box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 0, 6, [190, 182, 168]);
      box(cx - 0.09, cy - 0.09, cx + 0.09, cy + 0.09, 6, 66, [214, 206, 190]);
      if (!NIGHT) { fillQ(sh([214, 206, 190], 0.8), cx - 0.09, cy + 0.09, 66, cx + 0.09, cy + 0.09, 66, cx, cy, 76, cx, cy, 76); fillQ(sh([214, 206, 190], 0.62), cx + 0.09, cy + 0.09, 66, cx + 0.09, cy - 0.09, 66, cx, cy, 76, cx, cy, 76); }
      if (MAXZ < 76) MAXZ = 76; beacon(a, cx, cy, 77, '#ff3030');
      return true;
    case 'clock':
      box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 0, 52, [180, 120, 90]); windows(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 6, 40, 5, 2, WIN_WARM, seed, 0.6);
      box(cx - 0.23, cy - 0.23, cx + 0.23, cy + 0.23, 52, 62, [200, 190, 170]);
      if (!NIGHT) {
        for (const [fx, fy] of [[cx, cy + 0.23], [cx + 0.23, cy]]) { g.fillStyle = '#f8f4e8'; g.beginPath(); g.ellipse(PX(fx, fy), PY(fx, fy, 57), 3.2, 3.6, 0, 0, 6.283); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(PX(fx, fy), PY(fx, fy, 57)); g.lineTo(PX(fx, fy), PY(fx, fy, 59.5)); g.moveTo(PX(fx, fy), PY(fx, fy, 57)); g.lineTo(PX(fx, fy) + 1.8, PY(fx, fy, 57)); g.stroke(); }
        fillQ('#4a6b5a', cx - 0.25, cy + 0.25, 62, cx + 0.25, cy + 0.25, 62, cx, cy, 78, cx, cy, 78); fillQ('#3a574a', cx + 0.25, cy + 0.25, 62, cx + 0.25, cy - 0.25, 62, cx, cy, 78, cx, cy, 78);
      }
      if (MAXZ < 78) MAXZ = 78; beacon(a, cx, cy, 57, '#fff4c0');
      return true;
    case 'lighthouse': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.2, '#b9b2a4');
      for (let j = 0; j < 6; j++) cyl(cx, cy, 0.2 - j * 0.012, j * 10, j * 10 + 10, j % 2 ? [240, 240, 236] : [210, 50, 45]);
      cyl(cx, cy, 0.16, 60, 68, [200, 230, 240]); dome(cx, cy, 0.16, 68, [200, 50, 45]);
      if (NIGHT) { g.globalAlpha = 0.9; g.drawImage(GLOW, PX(cx, cy) - 30, PY(cx, cy, 64) - 30, 60, 60); g.globalAlpha = 1; }
      LIGHTHOUSES.set(a, { x: PX(cx, cy), y: PY(cx, cy, 64) });
      return true;
    }
    case 'archmon': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.2, '#cfc8b8');
      const c = [222, 214, 196];
      box(X0 + 0.25, Y0 + 0.55, X0 + 0.65, Y1 - 0.55, 0, 48, c); box(X1 - 0.65, Y0 + 0.55, X1 - 0.25, Y1 - 0.55, 0, 48, c);
      box(X0 + 0.2, Y0 + 0.5, X1 - 0.2, Y1 - 0.5, 48, 66, c, [210, 200, 182]);
      if (!NIGHT) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); q4(X0 + 0.25, Y1 - 0.5, 56, X1 - 0.25, Y1 - 0.5, 56, X1 - 0.25, Y1 - 0.5, 60, X0 + 0.25, Y1 - 0.5, 60); g.fill(); }
      line3(cx, cy, 66, cx, cy, 80, '#bfa26a', 2); beacon(a, cx, cy, 80, '#ffd060');
      return true;
    }
    case 'museum': {
      box(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.9, 0, 18, [244, 244, 240]); windows(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.9, 0, 18, 1, 1, WIN_GLASS, seed, 0.8, { band: true, hf: 0.7 });
      box(X0 + 0.6, Y0 + 0.5, X1 - 0.4, Y1 - 0.4, 18, 34, [230, 232, 236]);                       // volume em balanço
      box(X0 + 1.4, Y1 - 0.9, X1 - 0.3, Y1 - 0.25, 0, 10, [90, 150, 210]);
      if (!NIGHT) for (let j = 0; j < 4; j++) fillQ(['#e24c4c', '#f2c53d', '#3f7fe0', '#4cbf73'][j], X0 + 0.7 + j * 0.4, Y1 - 0.4, 22, X0 + 1.0 + j * 0.4, Y1 - 0.4, 22, X0 + 1.0 + j * 0.4, Y1 - 0.4, 30, X0 + 0.7 + j * 0.4, Y1 - 0.4, 30);
      treeAt(X0 + 0.3, Y1 - 0.3, 6, seed);
      return true;
    }
    case 'planet':
      box(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, 0, 12, [210, 214, 222]); windows(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, 0, 12, 1, 3, WIN_GLASS, seed, 0.7);
      cyl(cx, cy, 0.62, 12, 16, [200, 205, 215]); dome(cx, cy, 0.62, 16, [225, 230, 240]);
      beacon(a, cx, cy, 44, '#a0c8ff');
      return true;
    case 'opera': {
      const c = [232, 222, 196];
      box(X0 + 0.15, Y0 + 0.3, X1 - 0.15, Y1 - 0.3, 0, 30, c); windows(X0 + 0.15, Y0 + 0.3, X1 - 0.15, Y1 - 0.3, 10, 30, 2, 3, WIN_WARM, seed, 0.85);
      if (!NIGHT) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); for (let j = 0; j < 9; j++) { const u = X0 + 0.25 + j * 0.31; mv(u, Y1 - 0.22, 0); ln(u, Y1 - 0.22, 24); } g.stroke(); fillQ(sh(c, 0.9), X0 + 0.2, Y1 - 0.22, 24, X1 - 0.2, Y1 - 0.22, 24, X1 - 0.2, Y1 - 0.22, 28, X0 + 0.2, Y1 - 0.22, 28); }
      gable(X0 + 0.15, Y1 - 0.95, X1 - 0.15, Y1 - 0.3, 30, 10, c, [120, 150, 130], true);
      cyl(cx, cy - 0.2, 0.5, 30, 42, c); dome(cx, cy - 0.2, 0.5, 42, [90, 140, 115]);
      line3(cx, cy - 0.2, 62, cx, cy - 0.2, 72, '#d8b458', 1.5); beacon(a, cx, cy - 0.2, 72, '#ffd060');
      return true;
    }
    case 'pyramid': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.2, '#d8d2c4');
      const H = 62, e = 0.15;
      if (NIGHT) { g.fillStyle = LIT ? 'rgba(255,220,160,0.35)' : '#000'; g.beginPath(); mv(X0 + e, Y1 - e, 0); ln(X1 - e, Y1 - e, 0); ln(X1 - e, Y0 + e, 0); ln(cx, cy, H); g.closePath(); g.fill(); }
      else {
        fillQ('rgba(130,180,215,0.92)', X0 + e, Y1 - e, 0, X1 - e, Y1 - e, 0, cx, cy, H, cx, cy, H);
        fillQ('rgba(95,140,180,0.92)', X1 - e, Y1 - e, 0, X1 - e, Y0 + e, 0, cx, cy, H, cx, cy, H);
        if (LOD >= 1) { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.4; g.beginPath(); for (let j = 1; j < 6; j++) { const t = j / 6; mv(X0 + e + (cx - X0 - e) * t, Y1 - e + (cy - Y1 + e) * t, H * t); ln(X1 - e + (cx - X1 + e) * t, Y1 - e + (cy - Y1 + e) * t, H * t); ln(X1 - e + (cx - X1 + e) * t, Y0 + e + (cy - Y0 - e) * t, H * t); } g.stroke(); }
      }
      if (MAXZ < H) MAXZ = H; beacon(a, cx, cy, H + 1, '#ffffff');
      return true;
    }
    case 'castle': {
      const c = [176, 168, 150];
      box(X0 + 0.35, Y0 + 0.35, X1 - 0.35, Y0 + 0.5, 0, 18, c); box(X0 + 0.35, Y1 - 0.5, X1 - 0.35, Y1 - 0.35, 0, 18, c);
      box(X0 + 0.35, Y0 + 0.35, X0 + 0.5, Y1 - 0.35, 0, 18, c); box(X1 - 0.5, Y0 + 0.35, X1 - 0.35, Y1 - 0.35, 0, 18, c);
      box(cx - 0.45, cy - 0.45, cx + 0.45, cy + 0.45, 0, 40, [186, 178, 160]); windows(cx - 0.45, cy - 0.45, cx + 0.45, cy + 0.45, 8, 38, 3, 2, WIN_WARM, seed, 0.5);
      for (const [tx, ty] of [[X0 + 0.42, Y0 + 0.42], [X1 - 0.42, Y0 + 0.42], [X0 + 0.42, Y1 - 0.42], [X1 - 0.42, Y1 - 0.42]]) {
        cyl(tx, ty, 0.2, 0, 34, [190, 182, 164]);
        if (!NIGHT) { const sx = PX(tx, ty), sy = PY(tx, ty, 34), rx = 0.22 * HW * 1.414; g.fillStyle = '#7a3b34'; g.beginPath(); g.moveTo(sx - rx, sy); g.lineTo(sx, sy - 22); g.lineTo(sx + rx, sy); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.moveTo(sx, sy - 22); g.lineTo(sx + rx, sy); g.lineTo(sx, sy + 3); g.closePath(); g.fill(); }
        beacon(a, tx, ty, 57, '#ffcc66');
      }
      if (MAXZ < 58) MAXZ = 58;
      line3(cx, cy, 40, cx, cy, 56, '#555', 1); if (!NIGHT) fillQ('#c8302c', cx, cy, 56, cx + 0.25, cy, 55, cx + 0.25, cy, 51, cx, cy, 52);
      return true;
    }
    case 'colossus': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.2, '#cfc8b8');
      const c = [92, 168, 148];
      box(cx - 0.55, cy - 0.55, cx + 0.55, cy + 0.55, 0, 26, [188, 180, 166]); windows(cx - 0.55, cy - 0.55, cx + 0.55, cy + 0.55, 6, 22, 1, 3, WIN_DARK, seed, 0.5);
      box(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 26, 34, [170, 162, 148]);
      // corpo (túnica afunilada)
      if (!NIGHT) {
        fillQ(sh(c, 0.85), cx - 0.24, cy + 0.2, 34, cx + 0.2, cy + 0.2, 34, cx + 0.12, cy + 0.12, 110, cx - 0.12, cy + 0.12, 110);
        fillQ(sh(c, 0.65), cx + 0.2, cy + 0.2, 34, cx + 0.2, cy - 0.22, 34, cx + 0.12, cy - 0.12, 110, cx + 0.12, cy + 0.12, 110);
      } else { g.fillStyle = '#000'; g.beginPath(); mv(cx - 0.24, cy + 0.2, 34); ln(cx + 0.2, cy + 0.2, 34); ln(cx + 0.2, cy - 0.22, 34); ln(cx + 0.12, cy - 0.12, 110); ln(cx - 0.12, cy + 0.12, 110); g.closePath(); g.fill(); }
      dome(cx, cy, 0.13, 110, c); cyl(cx, cy, 0.1, 108, 118, c); dome(cx, cy, 0.1, 118, c);
      // braço erguido com tocha
      line3(cx + 0.1, cy - 0.05, 100, cx + 0.22, cy - 0.15, 140, sh(c, 0.75), 4);
      box(cx + 0.19, cy - 0.18, cx + 0.25, cy - 0.12, 140, 146, [200, 170, 80]);
      if (!NIGHT) { g.fillStyle = '#ffb02e'; g.beginPath(); const fx = PX(cx + 0.22, cy - 0.15), fy = PY(cx + 0.22, cy - 0.15, 146); g.moveTo(fx - 3, fy); g.quadraticCurveTo(fx, fy - 12, fx + 3, fy); g.fill(); }
      if (MAXZ < 158) MAXZ = 158; beacon(a, cx + 0.22, cy - 0.15, 152, '#ffb02e');
      return true;
    }
  }
  return false;
}
const LIGHTHOUSES = new Map();
