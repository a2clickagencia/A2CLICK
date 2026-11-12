'use strict';
// ===================== ARTE PROCEDURAL DOS EDIFÍCIOS =====================
const HW = 32, HH = 16;
let _g = null, NIGHT = false, LOD = 2, LIT = true, ABAND = false;
const SMOKE_SRC = new Map();   // anchor -> [{x,y}] (coordenadas mundo)
const BEACONS = new Map();     // anchor -> [{x,y,c}] luzes piscantes

const R_WALL = [[236, 224, 200], [214, 198, 168], [242, 238, 228], [200, 164, 130], [182, 110, 88], [164, 96, 76], [224, 208, 160], [192, 198, 206], [240, 222, 204], [170, 186, 160]];
const R_ROOF = [[170, 66, 52], [124, 74, 58], [92, 92, 100], [152, 98, 62], [72, 82, 96], [140, 50, 40]];
const APT = [[196, 112, 88], [176, 92, 74], [214, 196, 160], [226, 220, 206], [160, 150, 140], [204, 176, 140], [150, 84, 70], [232, 228, 216]];
const GLASS = [[86, 142, 194], [66, 118, 152], [112, 164, 176], [156, 134, 100], [164, 174, 190], [58, 92, 124], [96, 170, 160], [130, 150, 200]];
const CONC = [[206, 204, 196], [186, 182, 172], [222, 218, 206], [170, 172, 178], [196, 186, 168]];
const IND = [[172, 166, 152], [152, 152, 146], [188, 178, 152], [132, 128, 124], [160, 150, 132]];
const AWN = [[214, 58, 58], [44, 132, 214], [60, 170, 90], [230, 170, 40], [160, 70, 180], [240, 120, 40]];

function sh(c, f) {
  let r = c[0] * f, g = c[1] * f, b = c[2] * f;
  if (ABAND) { const m = (r + g + b) / 3; r = m * 0.75 + r * 0.25; g = m * 0.75 + g * 0.25; b = m * 0.72 + b * 0.25; r *= 0.8; g *= 0.8; b *= 0.8; }
  return 'rgb(' + (r > 255 ? 255 : r | 0) + ',' + (g > 255 ? 255 : g | 0) + ',' + (b > 255 ? 255 : b | 0) + ')';
}
// ===================== PROJEÇÃO COM ROTAÇÃO DE CÂMERA =====================
// tela_x = (RA·gx + RB·gy + RC)·HW      tela_y = (RD·gx + RE·gy + RF)·HH − z
// ROT 0..3 gira a vista em 90°. Durante o desenho de um tile/prédio usamos um
// "referencial local" (orientação identidade + deslocamento), então a arte procedural
// sempre mostra a fachada para a câmera — sem faces invertidas ao girar.
let ROT = 0, RA = 1, RB = -1, RC = 0, RD = 1, RE = 1, RF = 0;
function setRotCoeffs() {
  if (ROT === 0) { RA = 1; RB = -1; RC = 0; RD = 1; RE = 1; RF = 0; }
  else if (ROT === 1) { RA = -1; RB = -1; RC = N; RD = 1; RE = -1; RF = N; }
  else if (ROT === 2) { RA = -1; RB = 1; RC = 0; RD = -1; RE = -1; RF = 2 * N; }
  else { RA = 1; RB = 1; RC = -N; RD = -1; RE = 1; RF = N; }
}
// referencial local: o ponto do mundo (wx,wy) vai para a célula de vista (u,v)
function setLocalFrame(wx, wy, u, v) { RA = 1; RB = -1; RC = (u - wx) - (v - wy); RD = 1; RE = 1; RF = (u - wx) + (v - wy); }
// célula de vista (U,V) de um tile do mundo, e o inverso
function viewCellU(x, y) { return ROT === 0 ? x : ROT === 1 ? N - 1 - y : ROT === 2 ? N - 1 - x : y; }
function viewCellV(x, y) { return ROT === 0 ? y : ROT === 1 ? x : ROT === 2 ? N - 1 - y : N - 1 - x; }
function worldCellX(u, v) { return ROT === 0 ? u : ROT === 1 ? v : ROT === 2 ? N - 1 - u : N - 1 - v; }
function worldCellY(u, v) { return ROT === 0 ? v : ROT === 1 ? N - 1 - u : ROT === 2 ? N - 1 - v : u; }
// canto mínimo (na vista) de uma pegada s×s com origem (ax,ay) no mundo
function viewFootU(ax, ay, s) { return ROT === 0 ? ax : ROT === 1 ? N - ay - s : ROT === 2 ? N - ax - s : ay; }
function viewFootV(ax, ay, s) { return ROT === 0 ? ay : ROT === 1 ? ax : ROT === 2 ? N - ay - s : N - ax - s; }
const rotDir = d => (d + ROT) & 3;                                   // direção do mundo → direção na vista
const rotMask = m => ((m << ROT) | (m >> (4 - ROT))) & 15;            // máscara de vizinhos → vista
const PX = (gx, gy) => (RA * gx + RB * gy + RC) * HW;
const PY = (gx, gy, z) => (RD * gx + RE * gy + RF) * HH - z;
function mv(gx, gy, z) { _g.moveTo((RA * gx + RB * gy + RC) * HW, (RD * gx + RE * gy + RF) * HH - z); }
function ln(gx, gy, z) { _g.lineTo((RA * gx + RB * gy + RC) * HW, (RD * gx + RE * gy + RF) * HH - z); }
function q4(a0, a1, a2, b0, b1, b2, c0, c1, c2, d0, d1, d2) { mv(a0, a1, a2); ln(b0, b1, b2); ln(c0, c1, c2); ln(d0, d1, d2); _g.closePath(); }
function fillQ(col, a0, a1, a2, b0, b1, b2, c0, c1, c2, d0, d1, d2) { _g.fillStyle = col; _g.beginPath(); q4(a0, a1, a2, b0, b1, b2, c0, c1, c2, d0, d1, d2); _g.fill(); }

let MAXZ = 0; // maior altura desenhada no prédio atual (usada p/ oclusão dos faróis)
// Caixa isométrica: face esquerda (+y), face direita (+x) e topo.
// Detalhes extras (LOD>=1): gradiente vertical nas faces altas, sombra de contato na base e borda clara no topo.
function box(x0, y0, x1, y1, z0, z1, c, topC) {
  const g = _g;
  if (z1 > MAXZ) MAXZ = z1;
  if (NIGHT) {
    g.fillStyle = '#000'; g.beginPath(); mv(x0, y1, z0); ln(x1, y1, z0); ln(x1, y0, z0); ln(x1, y0, z1); ln(x0, y0, z1); ln(x0, y1, z1); g.closePath(); g.fill(); return;
  }
  const hgt = z1 - z0;
  // OTIMIZAÇÃO v1.2: faces com cor sólida (gradientes eram o item mais caro ao redesenhar a cidade)
  fillQ(sh(c, 0.8), x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1);
  fillQ(sh(c, 0.62), x1, y1, z0, x1, y0, z0, x1, y0, z1, x1, y1, z1);
  fillQ(topC ? sh(topC, 1) : sh(c, 1.05), x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
  if (LOD >= 1 && hgt > 5 && z0 < 1) { // sombra de contato (oclusão ambiente) junto ao chão
    const ao = Math.min(5, hgt * 0.35);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); q4(x0, y1, z0, x1, y1, z0, x1, y1, z0 + ao, x0, y1, z0 + ao); q4(x1, y1, z0, x1, y0, z0, x1, y0, z0 + ao, x1, y1, z0 + ao); g.fill();
  }
  if (LOD >= 2 && hgt > 3) {
    g.strokeStyle = sh(c, 1.22); g.lineWidth = 0.55; g.beginPath(); mv(x0, y1, z1); ln(x1, y1, z1); ln(x1, y0, z1); if (hgt > 14) { mv(x1, y1, z0); ln(x1, y1, z1); } g.stroke();
  }
}
// Sombra projetada no chão (luz vindo da frente-esquerda → sombra para trás-direita)
function castShadow(x0, y0, x1, y1, H) {
  if (NIGHT || LOD === 0 || H < 4) return;
  const k = Math.min(1.7, H / 70);
  const g = _g; g.fillStyle = 'rgba(20,30,40,0.2)'; g.beginPath();
  mv(x0, y1, 0); ln(x1, y1, 0); ln(x1, y0 - k, 0); ln(x0, y0 - k, 0); g.closePath(); g.fill();
}
// janelas nas duas faces visíveis
function windows(x0, y0, x1, y1, z0, z1, nf, cpt, wc, seed, litP, opt) {
  if (nf < 1) return;
  if (NIGHT) { if (!LIT || ABAND) return; }
  else if (LOD === 0) return;
  const g = _g, fh = (z1 - z0) / nf, ncL = Math.max(1, Math.round((x1 - x0) * cpt)), ncR = Math.max(1, Math.round((y1 - y0) * cpt));
  const wf = opt && opt.wf || 0.56, hf = opt && opt.hf || 0.55, band = opt && opt.band;
  if (NIGHT && LOD === 0) {
    g.fillStyle = 'rgba(255,205,130,' + (0.18 + litP * 0.25) + ')';
    g.beginPath(); q4(x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1); q4(x1, y1, z0, x1, y0, z0, x1, y0, z1, x1, y1, z1); g.fill(); return;
  }
  const r = mulberry(seed);
  if (NIGHT && !band) { nightWindows(x0, y0, x1, y1, z0, fh, hf, wf, nf, ncL, ncR, r, litP); return; }
  for (let face = 0; face < 2; face++) {
    const nc = face ? ncR : ncL;
    if (NIGHT) { g.fillStyle = face ? 'rgb(235,190,110)' : 'rgb(255,214,140)'; }
    else g.fillStyle = face ? wc[1] : wc[0];
    g.beginPath();
    for (let f = 0; f < nf; f++) {
      const za = z0 + f * fh + fh * (1 - hf) * 0.6, zb = za + fh * hf;
      for (let c = 0; c < nc; c++) {
        if (NIGHT && r() > litP) continue;
        if (band) { // faixa contínua (vidro)
          if (c > 0) continue;
          if (face === 0) q4(x0 + 0.02, y1, za, x1 - 0.02, y1, za, x1 - 0.02, y1, zb, x0 + 0.02, y1, zb);
          else q4(x1, y1 - 0.02, za, x1, y0 + 0.02, za, x1, y0 + 0.02, zb, x1, y1 - 0.02, zb);
          continue;
        }
        const u0 = (c + (1 - wf) / 2) / nc, u1 = (c + (1 + wf) / 2) / nc;
        if (face === 0) { const a = x0 + (x1 - x0) * u0, b = x0 + (x1 - x0) * u1; q4(a, y1, za, b, y1, za, b, y1, zb, a, y1, zb); }
        else { const a = y1 - (y1 - y0) * u0, b = y1 - (y1 - y0) * u1; q4(x1, a, za, x1, b, za, x1, b, zb, x1, a, zb); }
      }
    }
    g.fill();
    // reflexo do céu na parte de cima de cada janela (só de dia, com zoom próximo)
    if (!NIGHT && LOD >= 2 && !band && fh >= 5 && SETTINGS.hq) {   // reflexo do céu: só no modo alta qualidade (custo alto ao redesenhar)
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath();
      for (let f = 0; f < nf; f++) {
        const za = z0 + f * fh + fh * (1 - hf) * 0.6 + fh * hf * 0.62, zb = z0 + f * fh + fh * (1 - hf) * 0.6 + fh * hf;
        for (let c = 0; c < nc; c++) {
          const u0 = (c + (1 - wf) / 2) / nc, u1 = (c + (1 + wf) / 2) / nc;
          if (face === 0) { const a = x0 + (x1 - x0) * u0, b = x0 + (x1 - x0) * u1; q4(a, y1, za, b, y1, za, b, y1, zb, a, y1, zb); }
          else { const a = y1 - (y1 - y0) * u0, b = y1 - (y1 - y0) * u1; q4(x1, a, za, x1, b, za, x1, b, zb, x1, a, zb); }
        }
      }
      g.fill();
    }
  }
}
// v1.3: janelas acesas com cores variadas (luz quente, luz fria, TV azulada) — 3 lotes por face
const NIGHT_WIN = [['rgb(255,214,140)', 'rgb(235,190,110)'], ['rgb(240,240,225)', 'rgb(210,214,205)'], ['rgb(150,190,255)', 'rgb(120,160,230)']];
function nightWindows(x0, y0, x1, y1, z0, fh, hf, wf, nf, ncL, ncR, r, litP) {
  const g = _g;
  for (let face = 0; face < 2; face++) {
    const nc = face ? ncR : ncL;
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    for (let f = 0; f < nf; f++) {
      const za = z0 + f * fh + fh * (1 - hf) * 0.6, zb = za + fh * hf;
      for (let c = 0; c < nc; c++) {
        const rv = r(); if (rv > litP) continue;
        const kind = rv < litP * 0.7 ? 0 : rv < litP * 0.92 ? 1 : 2, p = paths[kind];
        const u0 = (c + (1 - wf) / 2) / nc, u1 = (c + (1 + wf) / 2) / nc;
        let a, b;
        if (face === 0) { a = x0 + (x1 - x0) * u0; b = x0 + (x1 - x0) * u1; p.moveTo(PX(a, y1), PY(a, y1, za)); p.lineTo(PX(b, y1), PY(b, y1, za)); p.lineTo(PX(b, y1), PY(b, y1, zb)); p.lineTo(PX(a, y1), PY(a, y1, zb)); }
        else { a = y1 - (y1 - y0) * u0; b = y1 - (y1 - y0) * u1; p.moveTo(PX(x1, a), PY(x1, a, za)); p.lineTo(PX(x1, b), PY(x1, b, za)); p.lineTo(PX(x1, b), PY(x1, b, zb)); p.lineTo(PX(x1, a), PY(x1, a, zb)); }
        p.closePath();
      }
    }
    for (let k = 0; k < 3; k++) { g.fillStyle = NIGHT_WIN[k][face]; g.fill(paths[k]); }
  }
}
// v1.3: linhas de laje entre andares (fachada mais arquitetônica)
function floorBands(x0, y0, x1, y1, z0, z1, nf, c) {
  if (NIGHT || LOD < 2 || nf < 3) return;
  const g = _g, fh = (z1 - z0) / nf;
  g.strokeStyle = sh(c, 1.18); g.lineWidth = 0.45; g.beginPath();
  for (let f = 1; f < nf; f++) { const z = z0 + f * fh; mv(x0, y1, z); ln(x1, y1, z); ln(x1, y0, z); }
  g.stroke();
}
// v1.3: térreo comercial (vitrine de vidro + marquise colorida) — prédios altos
function storefront(x0, y0, x1, y1, h, colr) {
  if (LOD < 1) return;
  const g = _g;
  if (NIGHT) { if (!LIT || ABAND) return; g.fillStyle = 'rgba(255,225,160,0.9)'; g.beginPath(); q4(x0 + 0.02, y1, 0.5, x1 - 0.02, y1, 0.5, x1 - 0.02, y1, h - 1, x0 + 0.02, y1, h - 1); q4(x1, y1 - 0.02, 0.5, x1, y0 + 0.02, 0.5, x1, y0 + 0.02, h - 1, x1, y1 - 0.02, h - 1); g.fill(); return; }
  fillQ('rgba(170,210,235,0.92)', x0 + 0.02, y1, 0.5, x1 - 0.02, y1, 0.5, x1 - 0.02, y1, h - 1, x0 + 0.02, y1, h - 1);
  fillQ('rgba(120,160,190,0.92)', x1, y1 - 0.02, 0.5, x1, y0 + 0.02, 0.5, x1, y0 + 0.02, h - 1, x1, y1 - 0.02, h - 1);
  fillQ(sh(colr, 0.95), x0, y1, h, x1, y1, h, x1, y1 + 0.07, h - 1.5, x0, y1 + 0.07, h - 1.5);
  fillQ(sh(colr, 0.72), x1, y1, h, x1, y0, h, x1 + 0.07, y0, h - 1.5, x1 + 0.07, y1, h - 1.5);
}
// v1.3: telhados variados — mureta, ar-condicionado, caixa d'água, painéis solares, jardim, piscina, heliponto, antena
function rooftop(a, x0, y0, x1, y1, H, r, l, isCom) {
  const g = _g, w = x1 - x0, d = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (!NIGHT && LOD >= 1) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.9; g.beginPath(); q4(x0 + 0.02, y0 + 0.02, H + 0.6, x1 - 0.02, y0 + 0.02, H + 0.6, x1 - 0.02, y1 - 0.02, H + 0.6, x0 + 0.02, y1 - 0.02, H + 0.6); g.stroke(); }
  const pickF = r();
  if (pickF < 0.17 && w > 0.4) {            // jardim no terraço
    if (!NIGHT) { flat(x0 + w * 0.1, y0 + d * 0.1, x1 - w * 0.1, y1 - d * 0.1, H + 0.3, '#5f9e4a'); flat(x0 + w * 0.42, y0 + d * 0.1, x0 + w * 0.58, y1 - d * 0.1, H + 0.4, '#cfc4a4'); }
    treeAt(x0 + w * 0.25, y0 + d * 0.28, 3.6, a % 97, H); treeAt(x0 + w * 0.7, y0 + d * 0.3, 3.2, (a + 7) % 97, H); treeAt(x1 - w * 0.25, y1 - d * 0.28, 3.6, (a + 3) % 97, H);
    if (!NIGHT) { g.strokeStyle = '#3f7a33'; g.lineWidth = 1.4; g.beginPath(); q4(x0 + w * 0.1, y0 + d * 0.1, H + 1, x1 - w * 0.1, y0 + d * 0.1, H + 1, x1 - w * 0.1, y1 - d * 0.1, H + 1, x0 + w * 0.1, y1 - d * 0.1, H + 1); g.stroke(); }
    if (NIGHT && LIT) beacon(a, cx, cy, H + 2, '#ffe9b0');
  } else if (pickF < 0.40 && w > 0.4) {     // piscina com deck
    if (!NIGHT) { flat(x0 + w * 0.12, y0 + d * 0.15, x1 - w * 0.12, y1 - d * 0.15, H + 0.3, '#d9cdb0'); flat(x0 + w * 0.2, y0 + d * 0.3, x1 - w * 0.2, y1 - d * 0.45, H + 0.4, '#38b6e6'); flat(x0 + w * 0.22, y0 + d * 0.32, x1 - w * 0.4, y0 + d * 0.38, H + 0.5, 'rgba(255,255,255,0.5)'); }
    box(x0 + w * 0.2, y1 - d * 0.32, x0 + w * 0.42, y1 - d * 0.18, H, H + 5, [235, 235, 230]);
  } else if (pickF < 0.58) {                // painéis solares
    if (!NIGHT) for (let k = 0; k < 4; k++) { const u = x0 + w * (0.12 + k * 0.2); fillQ('#27497d', u, y0 + d * 0.15, H + 2.2, u + w * 0.15, y0 + d * 0.15, H + 2.2, u + w * 0.15, y1 - d * 0.15, H + 0.6, u, y1 - d * 0.15, H + 0.6); }
  } else if (pickF < 0.78) {                // máquinas de ar-condicionado
    for (let k = 0; k < 3; k++) { const u = x0 + w * (0.15 + k * 0.25); box(u, y0 + d * 0.2, u + w * 0.14, y0 + d * 0.38, H, H + 3.5, [168, 170, 172], [190, 192, 194]); }
    box(x1 - w * 0.35, y1 - d * 0.35, x1 - w * 0.12, y1 - d * 0.12, H, H + 7, [150, 150, 150]);
  } else {                                  // caixa d'água + casa de máquinas
    box(x0 + w * 0.15, y0 + d * 0.2, x0 + w * 0.42, y0 + d * 0.45, H, H + 6, [150, 150, 150]);
    cyl(x0 + w * 0.72, y0 + d * 0.3, Math.min(0.09, w * 0.12), H, H + 10, [120, 90, 70]);
  }
  if (l >= 9) {
    if (isCom && r() < 0.5) {               // coroa iluminada (luz colorida à noite)
      const cc = [[80, 220, 255], [255, 90, 200], [255, 200, 80]][(a >>> 3) % 3];
      if (NIGHT && LIT) { g.strokeStyle = 'rgb(' + cc + ')'; g.lineWidth = 1.6; g.beginPath(); mv(x0, y1, H - 2); ln(x1, y1, H - 2); ln(x1, y0, H - 2); g.stroke(); }
      else if (!NIGHT) { g.strokeStyle = 'rgba(' + cc + ',0.55)'; g.lineWidth = 1.1; g.beginPath(); mv(x0, y1, H - 2); ln(x1, y1, H - 2); ln(x1, y0, H - 2); g.stroke(); }
    }
    line3(cx + w * 0.1, cy + d * 0.1, H, cx + w * 0.1, cy + d * 0.1, H + 30, '#888', 1.2); beacon(a, cx + w * 0.1, cy + d * 0.1, H + 30, '#ff3030');
  }
}
function cyl(gx, gy, r, z0, z1, c, topC) {
  const g = _g, sx = PX(gx, gy), sy = PY(gx, gy, 0), rx = r * HW * 1.414, ry = r * HH * 1.414;
  if (z1 > MAXZ) MAXZ = z1;
  if (NIGHT) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(sx, sy - z0, rx, ry, 0, 0, Math.PI); g.lineTo(sx - rx, sy - z1); g.ellipse(sx, sy - z1, rx, ry, 0, Math.PI, Math.PI * 2); g.closePath(); g.fill(); return; }
  const gr = g.createLinearGradient(sx - rx, 0, sx + rx, 0);
  gr.addColorStop(0, sh(c, 0.85)); gr.addColorStop(0.45, sh(c, 1.08)); gr.addColorStop(1, sh(c, 0.55));
  g.fillStyle = gr; g.beginPath(); g.ellipse(sx, sy - z0, rx, ry, 0, 0, Math.PI); g.lineTo(sx - rx, sy - z1); g.lineTo(sx + rx, sy - z1); g.closePath(); g.fill();
  g.fillRect(sx - rx, sy - z1, rx * 2, z1 - z0);
  g.fillStyle = topC ? sh(topC, 1) : sh(c, 1.12); g.beginPath(); g.ellipse(sx, sy - z1, rx, ry, 0, 0, Math.PI * 2); g.fill();
}
function coolTower(gx, gy, r, h) {
  const g = _g, sx = PX(gx, gy), sy = PY(gx, gy, 0), rx = r * HW * 1.414, ry = r * HH * 1.414;
  if (h > MAXZ) MAXZ = h;
  g.beginPath(); g.moveTo(sx - rx, sy); g.quadraticCurveTo(sx - rx * 0.5, sy - h * 0.6, sx - rx * 0.68, sy - h);
  g.lineTo(sx + rx * 0.68, sy - h); g.quadraticCurveTo(sx + rx * 0.5, sy - h * 0.6, sx + rx, sy); g.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); g.closePath();
  if (NIGHT) { g.fillStyle = '#000'; g.fill(); return; }
  const gr = g.createLinearGradient(sx - rx, 0, sx + rx, 0); gr.addColorStop(0, '#b9b6ae'); gr.addColorStop(0.4, '#e8e5dc'); gr.addColorStop(1, '#8d8a84');
  g.fillStyle = gr; g.fill();
  g.fillStyle = '#5d5a55'; g.beginPath(); g.ellipse(sx, sy - h, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2); g.fill();
}
function dome(gx, gy, r, z0, c) {
  const g = _g, sx = PX(gx, gy), sy = PY(gx, gy, 0) - z0, rx = r * HW * 1.414;
  g.beginPath(); g.ellipse(sx, sy, rx, rx * 0.85, 0, Math.PI, Math.PI * 2); g.closePath();
  if (NIGHT) { g.fillStyle = '#000'; g.fill(); return; }
  const gr = g.createRadialGradient(sx - rx * 0.3, sy - rx * 0.5, 1, sx, sy, rx * 1.1); gr.addColorStop(0, sh(c, 1.25)); gr.addColorStop(1, sh(c, 0.6));
  g.fillStyle = gr; g.fill();
}
function gable(x0, y0, x1, y1, h, rh, wall, roof, alongX) {
  const g = _g;
  if (alongX) {
    const ym = (y0 + y1) / 2;
    if (NIGHT) { g.fillStyle = '#000'; g.beginPath(); q4(x0, y0, h, x1, y0, h, x1, ym, h + rh, x0, ym, h + rh); q4(x0, y1, h, x1, y1, h, x1, ym, h + rh, x0, ym, h + rh); g.fill(); return; }
    fillQ(sh(roof, 0.95), x0, y0, h, x1, y0, h, x1, ym, h + rh, x0, ym, h + rh);
    g.fillStyle = sh(wall, 0.6); g.beginPath(); mv(x1, y1, h); ln(x1, y0, h); ln(x1, ym, h + rh); g.closePath(); g.fill();
    fillQ(sh(roof, 0.78), x0, y1, h, x1, y1, h, x1, ym, h + rh, x0, ym, h + rh);
  } else {
    const xm = (x0 + x1) / 2;
    if (NIGHT) { g.fillStyle = '#000'; g.beginPath(); q4(x0, y0, h, x0, y1, h, xm, y1, h + rh, xm, y0, h + rh); q4(x1, y0, h, x1, y1, h, xm, y1, h + rh, xm, y0, h + rh); g.fill(); return; }
    fillQ(sh(roof, 1.0), x0, y0, h, x0, y1, h, xm, y1, h + rh, xm, y0, h + rh);
    g.fillStyle = sh(wall, 0.78); g.beginPath(); mv(x0, y1, h); ln(x1, y1, h); ln(xm, y1, h + rh); g.closePath(); g.fill();
    fillQ(sh(roof, 0.68), x1, y0, h, x1, y1, h, xm, y1, h + rh, xm, y0, h + rh);
  }
}
function flat(x0, y0, x1, y1, z, col) { if (NIGHT) return; fillQ(col, x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z); }
function line3(gx0, gy0, z0, gx1, gy1, z1, col, w) { if (NIGHT) return; _g.strokeStyle = col; _g.lineWidth = w || 1; _g.beginPath(); mv(gx0, gy0, z0); ln(gx1, gy1, z1); _g.stroke(); }
function treeAt(gx, gy, sz, seed, z) {
  const g = _g, sx = PX(gx, gy), sy = PY(gx, gy, z || 0);
  if (NIGHT) return;
  if (LOD === 0) { g.fillStyle = '#2f6b2a'; g.beginPath(); g.arc(sx, sy - sz, sz * 1.1, 0, 6.283); g.fill(); return; }
  // sombra projetada (mesma direção das sombras dos prédios)
  g.fillStyle = 'rgba(20,30,20,0.2)'; g.beginPath(); g.ellipse(sx + sz * 0.7, sy - sz * 0.25, sz * 1.1, sz * 0.5, -0.45, 0, 6.283); g.fill();
  const hue = 92 + (seed % 34), lt = 25 + (seed % 9);
  if (seed % 5 === 0) { // conífera
    g.fillStyle = '#5b3d22'; g.fillRect(sx - 0.8, sy - sz * 0.6, 1.6, sz * 0.6);
    for (let k = 0; k < 3; k++) {
      const by = sy - sz * (0.5 + k * 0.75), w = sz * (1.05 - k * 0.25);
      g.fillStyle = 'hsl(' + (hue + 25) + ',42%,' + (lt - 3 + k * 3) + '%)'; g.beginPath(); g.moveTo(sx - w, by); g.lineTo(sx, by - sz * 1.2); g.lineTo(sx + w, by); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.moveTo(sx, by - sz * 1.2); g.lineTo(sx + w, by); g.lineTo(sx, by); g.closePath(); g.fill();
    }
    return;
  }
  g.fillStyle = '#5b3d22'; g.fillRect(sx - 0.8, sy - sz * 0.9, 1.6, sz * 0.9);
  // v1.3: ipês floridos (rosa e amarelo) e algumas copas outonais
  const special = seed % 53 === 0 ? [320, 62, 62] : seed % 61 === 0 ? [48, 88, 55] : seed % 71 === 0 ? [24, 70, 46] : null;
  const H0 = special ? special[0] : hue, S0 = special ? special[1] : 46, L0 = special ? special[2] - 6 : lt;
  g.fillStyle = 'hsl(' + H0 + ',' + (S0 - 2) + '%,' + (L0 - 4) + '%)'; g.beginPath(); g.arc(sx + sz * 0.25, sy - sz * 1.35, sz * 0.85, 0, 6.283); g.fill();
  g.fillStyle = 'hsl(' + H0 + ',' + S0 + '%,' + L0 + '%)'; g.beginPath(); g.arc(sx - sz * 0.15, sy - sz * 1.5, sz * 0.9, 0, 6.283); g.fill();
  g.fillStyle = 'hsl(' + H0 + ',' + (S0 + 6) + '%,' + (L0 + 10) + '%)'; g.beginPath(); g.arc(sx - sz * 0.38, sy - sz * 1.78, sz * 0.48, 0, 6.283); g.fill();
  if (LOD >= 2) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(sx - sz * 0.5, sy - sz * 1.95, sz * 0.22, 0, 6.283); g.fill(); }
}
function beacon(a, gx, gy, z, c) { const arr = BEACONS.get(a) || []; arr.push({ x: PX(gx, gy), y: PY(gx, gy, z), c }); BEACONS.set(a, arr); }
function smokeAt(a, gx, gy, z) { const arr = SMOKE_SRC.get(a) || []; arr.push({ x: PX(gx, gy), y: PY(gx, gy, z) }); SMOKE_SRC.set(a, arr); }
function pick(arr, r) { return arr[(r() * arr.length) | 0]; }

// ---------- Prédios das zonas ----------
const WIN_DARK = ['rgba(40,52,72,0.85)', 'rgba(28,38,56,0.9)'];
const WIN_GLASS = ['rgba(150,200,235,0.55)', 'rgba(90,130,170,0.6)'];
const WIN_WARM = ['rgba(60,50,40,0.8)', 'rgba(40,34,30,0.85)'];

function drawZoneBuilding(a) {
  const zt = G.zt[a], l = G.lvl[a], s = G.bs[a] || 1, ax = a % N, ay = (a / N) | 0, v = G.vr[a];
  ABAND = !!(G.flags[a] & F_ABAND); LIT = !!(G.flags[a] & F_POW);
  SMOKE_SRC.delete(a); BEACONS.delete(a);
  const r = mulberry(a * 31 + v * 7 + 1);
  const seed = a * 13 + v;
  const litP = 0.35 + r() * 0.4;
  // sombra projetada (altura estimada pelo tipo/nível)
  const FR = s === 1 ? [0, 0, 0, 0, 5, 7, 10, 14, 18, 24, 30, 38] : [0, 0, 0, 0, 6, 9, 13, 18, 24, 31, 40, 52];
  const FC = s === 1 ? [0, 0, 0, 0, 6, 9, 12, 16, 22, 28, 36, 46] : [0, 0, 0, 0, 8, 12, 16, 22, 30, 38, 48, 62];
  const estH = zt === ZR ? (s === 1 && l <= 2 ? 16 : s === 1 && l === 3 ? 26 : FR[l] * 7) : zt === ZC ? (s === 1 && l <= 2 ? (l === 1 ? 12 : 18) : s === 1 && l === 3 ? 30 : FC[l] * 7.5) : 12 + l * 3;
  castShadow(ax + 0.13, ay + 0.13, ax + s - 0.13, ay + s - 0.13, estH);
  if (zt === ZR) {
    if (s === 1 && l <= 2) {
      const wall = pick(R_WALL, r), roof = pick(R_ROOF, r);
      const rw = roadSide(ax, ay), rs = rw < 0 ? -1 : rotDir(rw);
      if (!NIGHT && LOD >= 1 && (rs === 1 || rs === 2) && r() < 0.32) {   // piscina no quintal
        flat(ax + 0.03, ay + 0.03, ax + 0.24, ay + 0.34, 0.2, '#e7dfcc'); flat(ax + 0.05, ay + 0.06, ax + 0.21, ay + 0.31, 0.3, '#3cb8e8');
      }
      if (l === 1) {
        const ax2 = r() < 0.5;
        box(ax + 0.24, ay + 0.26, ax + 0.76, ay + 0.74, 0, 9, wall); windows(ax + 0.24, ay + 0.26, ax + 0.76, ay + 0.74, 0, 9, 1, 3, WIN_DARK, seed, litP);
        houseDetails(ax + 0.24, ay + 0.26, ax + 0.76, ay + 0.74, 9, wall, r);
        gable(ax + 0.2, ay + 0.22, ax + 0.8, ay + 0.78, 9, 8, wall, roof, ax2);
        if (r() < 0.7) box(ax + 0.58, ay + 0.32, ax + 0.66, ay + 0.4, 12, 21, [150, 88, 66]);
        if (r() < 0.6) treeAt(ax + 0.85, ay + 0.2, 5, seed); else if (!NIGHT && LOD >= 1) { _g.fillStyle = '#4d8f3a'; _g.beginPath(); _g.ellipse(PX(ax + 0.15, ay + 0.6), PY(ax + 0.15, ay + 0.6, 2), 3.5, 2.2, 0, 0, 6.283); _g.fill(); }
      } else {
        const w2 = pick(R_WALL, r);
        box(ax + 0.1, ay + 0.12, ax + 0.55, ay + 0.55, 0, 10, wall); windows(ax + 0.1, ay + 0.12, ax + 0.55, ay + 0.55, 0, 10, 1, 3, WIN_DARK, seed, litP);
        gable(ax + 0.07, ay + 0.09, ax + 0.58, ay + 0.58, 10, 8, wall, roof, true);
        box(ax + 0.5, ay + 0.52, ax + 0.9, ay + 0.9, 0, 13, w2); windows(ax + 0.5, ay + 0.52, ax + 0.9, ay + 0.9, 0, 13, 2, 3, WIN_DARK, seed + 5, litP);
        houseDetails(ax + 0.5, ay + 0.52, ax + 0.9, ay + 0.9, 13, w2, r);
        gable(ax + 0.47, ay + 0.49, ax + 0.93, ay + 0.93, 13, 7, w2, pick(R_ROOF, r), false);
      }
      if (rs >= 0 && r() < 0.65 && LOD >= 1) {   // carro estacionado na garagem
        const C = [[0.64, 0.02, 0.78, 0.2], [0.8, 0.64, 0.98, 0.78], [0.64, 0.8, 0.78, 0.98], [0.02, 0.64, 0.2, 0.78]][rs];
        const col = CAR_COLORS[(seed >>> 2) % CAR_COLORS.length], along = rs === 1 || rs === 3;
        box(ax + C[0], ay + C[1], ax + C[2], ay + C[3], 0.5, 3.2, col);
        if (along) box(ax + C[0] + 0.04, ay + C[1] + 0.01, ax + C[2] - 0.05, ay + C[3] - 0.01, 3.2, 5.2, [60, 85, 110], col);
        else box(ax + C[0] + 0.01, ay + C[1] + 0.04, ax + C[2] - 0.01, ay + C[3] - 0.05, 3.2, 5.2, [60, 85, 110], col);
      }
      return;
    }
    if (s === 1 && l === 3) {
      const c = pick(APT, r);
      box(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 0, 22, c); windows(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 0, 22, 3, 4, WIN_DARK, seed, litP);
      floorBands(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 0, 22, 3, c);
      box(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 22, 24, sh2(c, 0.85));
      rooftop(a, ax + 0.14, ay + 0.14, ax + 0.86, ay + 0.86, 24, r, l, false);
      return;
    }
    const F = s === 1 ? [0, 0, 0, 0, 5, 7, 10, 14, 18, 24, 30, 38][l] : Math.round([0, 0, 0, 0, 6, 9, 13, 18, 24, 31, 40, 52][l]);
    resTower(a, ax, ay, s, F, r, seed, litP, l);
    return;
  }
  if (zt === ZC) {
    if (s === 1 && l <= 2) {
      const c = pick(CONC, r), aw = pick(AWN, r);
      const h = l === 1 ? 10 : 17;
      box(ax + 0.14, ay + 0.14, ax + 0.86, ay + 0.86, 0, h, c);
      windows(ax + 0.14, ay + 0.14, ax + 0.86, ay + 0.86, 0, 8, 1, 3, WIN_GLASS, seed, 0.9, { wf: 0.8, hf: 0.7 });
      if (l === 2) windows(ax + 0.14, ay + 0.14, ax + 0.86, ay + 0.86, 9, h, 1, 4, WIN_DARK, seed + 3, litP);
      if (!NIGHT) { // toldo listrado
        fillQ(sh(aw, 0.9), ax + 0.14, ay + 0.86, 8, ax + 0.86, ay + 0.86, 8, ax + 0.86, ay + 0.96, 6, ax + 0.14, ay + 0.96, 6);
        fillQ(sh(aw, 0.7), ax + 0.86, ay + 0.86, 8, ax + 0.86, ay + 0.14, 8, ax + 0.96, ay + 0.14, 6, ax + 0.96, ay + 0.86, 6);
        if (LOD >= 2) {
          _g.fillStyle = 'rgba(255,255,255,0.55)'; _g.beginPath();
          for (let k = 0; k < 6; k += 2) { const u0 = ax + 0.14 + k * 0.12, u1 = u0 + 0.12; q4(u0, ay + 0.86, 8, u1, ay + 0.86, 8, u1, ay + 0.96, 6, u0, ay + 0.96, 6); const v0 = ay + 0.86 - k * 0.12, v1 = v0 - 0.12; q4(ax + 0.86, v0, 8, ax + 0.86, v1, 8, ax + 0.96, v1, 6, ax + 0.96, v0, 6); }
          _g.fill();
          fillQ('rgba(40,30,25,0.85)', ax + 0.44, ay + 0.86, 0, ax + 0.56, ay + 0.86, 0, ax + 0.56, ay + 0.86, 5.5, ax + 0.44, ay + 0.86, 5.5);
        }
        // letreiro
        fillQ(sh(aw, 1.1), ax + 0.3, ay + 0.5, h, ax + 0.7, ay + 0.5, h, ax + 0.7, ay + 0.5, h + 5, ax + 0.3, ay + 0.5, h + 5);
      } else if (LIT && !ABAND) { _g.fillStyle = sh(aw, 1.3); _g.beginPath(); q4(ax + 0.3, ay + 0.5, h, ax + 0.7, ay + 0.5, h, ax + 0.7, ay + 0.5, h + 5, ax + 0.3, ay + 0.5, h + 5); _g.fill(); }
      return;
    }
    if (s === 1 && l === 3) {
      const c = pick(APT, r);
      box(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 0, 28, c); windows(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 0, 28, 4, 4, WIN_DARK, seed, litP, { wf: 0.7 });
      box(ax + 0.12, ay + 0.12, ax + 0.88, ay + 0.88, 28, 30, sh2(c, 0.8));
      return;
    }
    const F = s === 1 ? [0, 0, 0, 0, 6, 9, 12, 16, 22, 28, 36, 46][l] : [0, 0, 0, 0, 8, 12, 16, 22, 30, 38, 48, 62][l];
    comTower(a, ax, ay, s, F, r, seed, litP, l);
    return;
  }
  // INDUSTRIAL
  const hi = hrand(a, 9) < hitechShare();
  if (hi) {
    const c = [226, 230, 236], h = 10 + l * 4;
    const i0 = 0.1, i1 = s - 0.1;
    box(ax + i0, ay + i0, ax + i1, ay + i1 * 0.75, 0, h, c);
    windows(ax + i0, ay + i0, ax + i1, ay + i1 * 0.75, 0, h, Math.max(1, l), 1, WIN_GLASS, seed, 0.7, { band: true, hf: 0.5 });
    box(ax + i0 + 0.1, ay + i1 * 0.75, ax + i1 * 0.6, ay + i1, 0, 8, [90, 150, 210]);
    if (!NIGHT) for (let k = 0; k < 3 * s; k++) { const u = ax + i0 + 0.1 + k * (i1 - i0 - 0.2) / (3 * s); fillQ('#2c4f86', u, ay + i0 + 0.1, h + 0.3, u + 0.18, ay + i0 + 0.1, h + 0.3, u + 0.18, ay + i1 * 0.7, h + 0.3, u, ay + i1 * 0.7, h + 0.3); }
    return;
  }
  const c = pick(IND, r);
  if (l === 1 && s === 1) {
    box(ax + 0.1, ay + 0.15, ax + 0.9, ay + 0.85, 0, 11, c);
    if (!NIGHT && LOD) { _g.strokeStyle = sh(c, 0.55); _g.lineWidth = 0.5; _g.beginPath(); for (let k = 1; k < 8; k++) { const u = ax + 0.1 + k * 0.1; mv(u, ay + 0.85, 0); ln(u, ay + 0.85, 11); } _g.stroke(); }
    box(ax + 0.3, ay + 0.85, ax + 0.6, ay + 0.88, 0, 7, [90, 90, 90]);
    windows(ax + 0.1, ay + 0.15, ax + 0.9, ay + 0.85, 0, 11, 1, 2, WIN_DARK, seed, litP * 0.6);
    return;
  }
  const i0 = 0.08, i1 = s - 0.08;
  const h = 12 + l * 3;
  // galpão com telhado em serra
  box(ax + i0, ay + i0, ax + i1 * 0.7, ay + i1, 0, h, c);
  windows(ax + i0, ay + i0, ax + i1 * 0.7, ay + i1, 0, h, Math.max(1, (h / 9) | 0), 2, WIN_DARK, seed, litP * 0.7);
  const teeth = Math.max(3, Math.round(s * 4));
  const xa = ax + i0, xb = ax + i1 * 0.7, tw = (xb - xa) / teeth;
  for (let k = 0; k < teeth; k++) {
    const u0 = xa + k * tw, u1 = u0 + tw;
    if (NIGHT) { _g.fillStyle = '#000'; _g.beginPath(); q4(u0, ay + i0, h, u1, ay + i0, h + 6, u1, ay + i1, h + 6, u0, ay + i1, h); _g.fill(); continue; }
    fillQ(sh(c, 1.1), u0, ay + i0, h, u1, ay + i0, h + 6, u1, ay + i1, h + 6, u0, ay + i1, h);
    fillQ('rgb(120,150,170)', u1, ay + i1, h, u1, ay + i0, h, u1, ay + i0, h + 6, u1, ay + i1, h + 6);
    _g.fillStyle = sh(c, 0.8); _g.beginPath(); mv(u0, ay + i1, h); ln(u1, ay + i1, h); ln(u1, ay + i1, h + 6); _g.closePath(); _g.fill();
  }
  // pátio: pilhas de contêineres coloridos e um caminhão (v1.3)
  if (LOD >= 1) {
    const yx0 = ax + i1 * 0.72, yx1 = ax + i1 - 0.02, yy0 = ay + i1 * 0.55;
    const CC = [[200, 70, 50], [40, 110, 170], [230, 170, 40], [60, 140, 80], [140, 140, 150]];
    const nC = Math.max(1, Math.round((i1 - i0) * 2));
    for (let k = 0; k < nC; k++) {
      const vy = yy0 + k * 0.17; if (vy + 0.13 > ay + i1) break;
      const stack = 1 + ((seed >>> k) & 1);
      for (let st = 0; st < stack; st++) box(yx0, vy, yx1, vy + 0.13, st * 5, st * 5 + 5, CC[(seed + k * 3 + st) % CC.length]);
    }
  }
  // tanques e chaminés
  const tx = ax + i1 * 0.86, ty = ay + i0 + 0.25;
  if (l >= 3) cyl(tx, ty, 0.14 * s, 0, 16 + l * 2, [200, 200, 196]);
  if (l >= 4) cyl(tx, ty + 0.4 * s, 0.12 * s, 0, 14 + l * 2, [180, 186, 190]);
  const ch = 30 + l * 7, cx = ax + i1 * 0.55, cy = ay + i0 + 0.18;
  cyl(cx, cy, 0.06 * Math.max(1, s * 0.8), 0, ch, [160, 70, 60]);
  if (!NIGHT) cyl(cx, cy, 0.062 * Math.max(1, s * 0.8), ch - 6, ch - 3, [235, 235, 235]);
  if (!ABAND) smokeAt(a, cx, cy, ch + 2);
  if (l >= 5) { const c2 = ax + i1 * 0.35; cyl(c2, cy, 0.06 * s, 0, ch * 0.8, [150, 150, 150]); if (!ABAND) smokeAt(a, c2, cy, ch * 0.8 + 2); }
}
function sh2(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }
// Porta, degrau e molduras brancas das janelas de casas
function houseDetails(x0, y0, x1, y1, h, wall, r) {
  if (NIGHT || LOD < 2) return;
  const g = _g, m = (x0 + x1) / 2;
  fillQ('#5a3a24', m - 0.05, y1, 0, m + 0.05, y1, 0, m + 0.05, y1, 6.5, m - 0.05, y1, 6.5);
  fillQ('#d8d2c6', m - 0.08, y1 + 0.05, 0.6, m + 0.08, y1 + 0.05, 0.6, m + 0.08, y1, 0.6, m - 0.08, y1, 0.6);
  g.fillStyle = '#ffd77a'; g.beginPath(); g.arc(PX(m + 0.03, y1), PY(m + 0.03, y1, 3.4), 0.35, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.4; g.beginPath(); mv(x0, y1, h); ln(x1, y1, h); ln(x1, y0, h); g.stroke();
}

function resTower(a, ax, ay, s, F, r, seed, litP, l) {
  const style = (r() * 3) | 0;
  const ins = s === 1 ? 0.13 : 0.16;
  const x0 = ax + ins, y0 = ay + ins, x1 = ax + s - ins, y1 = ay + s - ins;
  const c = l >= 7 && style === 0 ? pick(CONC, r) : pick(APT, r);
  const fh = 7, H = F * fh;
  const lobby = l >= 6 && r() < 0.6;   // térreo com portaria de vidro
  if (F >= 14 && style !== 2) {
    const f1 = Math.round(F * 0.65), h1 = f1 * fh, d = (x1 - x0) * 0.14;
    box(x0, y0, x1, y1, 0, h1, c); windows(x0, y0, x1, y1, lobby ? fh : 0, h1, lobby ? f1 - 1 : f1, 4, WIN_DARK, seed, litP); floorBands(x0, y0, x1, y1, 0, h1, f1, c);
    if (lobby) storefront(x0, y0, x1, y1, fh, pick(AWN, r));
    box(x0 + d, y0 + d, x1 - d, y1 - d, h1, H, c); windows(x0 + d, y0 + d, x1 - d, y1 - d, h1, H, F - f1, 4, WIN_DARK, seed + 9, litP); floorBands(x0 + d, y0 + d, x1 - d, y1 - d, h1, H, F - f1, c);
    if (!NIGHT) flat(x0 + 0.01, y0 + 0.01, x1 - 0.01, y1 - 0.01, h1 + 0.2, sh(c, 1.0));   // terraço do recuo
    rooftop(a, x0 + d, y0 + d, x1 - d, y1 - d, H, r, l, false);
  } else {
    box(x0, y0, x1, y1, 0, H, c); windows(x0, y0, x1, y1, lobby ? fh : 0, H, lobby ? F - 1 : F, 4, WIN_DARK, seed, litP);
    if (lobby) storefront(x0, y0, x1, y1, fh, pick(AWN, r));
    if (style === 2 && !NIGHT && LOD >= 1) { // varandas com guarda-corpo de vidro
      const p1 = new Path2D(), p2 = new Path2D();
      for (let f = 1; f < F; f += 1) {
        const z = f * fh; p1.moveTo(PX(x0, y1), PY(x0, y1, z)); p1.lineTo(PX(x1, y1), PY(x1, y1, z)); p1.lineTo(PX(x1, y1 + 0.05), PY(x1, y1 + 0.05, z - 1)); p1.lineTo(PX(x0, y1 + 0.05), PY(x0, y1 + 0.05, z - 1)); p1.closePath();
        p2.moveTo(PX(x0, y1 + 0.05), PY(x0, y1 + 0.05, z - 1)); p2.lineTo(PX(x1, y1 + 0.05), PY(x1, y1 + 0.05, z - 1)); p2.lineTo(PX(x1, y1 + 0.05), PY(x1, y1 + 0.05, z + 2)); p2.lineTo(PX(x0, y1 + 0.05), PY(x0, y1 + 0.05, z + 2)); p2.closePath();
      }
      _g.fillStyle = sh(c, 1.15); _g.fill(p1); _g.fillStyle = 'rgba(200,225,240,0.35)'; _g.fill(p2);
    } else floorBands(x0, y0, x1, y1, 0, H, F, c);
    rooftop(a, x0, y0, x1, y1, H, r, l, false);
  }
}
function roofStuff(a, x0, y0, x1, y1, H, r, l) {
  const w = x1 - x0;
  box(x0 + w * 0.15, y0 + w * 0.2, x0 + w * 0.4, y0 + w * 0.45, H, H + 5, [150, 150, 150]);
  if (r() < 0.5) cyl(x0 + w * 0.72, y0 + w * 0.3, Math.min(0.09, w * 0.12), H, H + 10, [120, 90, 70]);
  if (l >= 9) { line3(x0 + w * 0.6, y0 + w * 0.6, H, x0 + w * 0.6, y0 + w * 0.6, H + 30, '#888', 1.2); beacon(a, x0 + w * 0.6, y0 + w * 0.6, H + 30, '#ff3030'); }
}
function comTower(a, ax, ay, s, F, r, seed, litP, l) {
  const style = (r() * 4) | 0;
  const ins = s === 1 ? 0.12 : 0.14;
  let x0 = ax + ins, y0 = ay + ins, x1 = ax + s - ins, y1 = ay + s - ins;
  const gc = pick(GLASS, r);
  const fh = 7.5, H = F * fh;
  const glassWin = [sh(gc, 1.35).replace('rgb', 'rgba').replace(')', ',0.7)'), sh(gc, 0.9).replace('rgb', 'rgba').replace(')', ',0.7)')];
  if (style === 0 || F < 10) { // bloco de vidro com faixas
    box(x0, y0, x1, y1, 0, H, gc); windows(x0, y0, x1, y1, 0, H, F, 1, glassWin, seed, litP, { band: true, hf: 0.62 });
  } else if (style === 1) { // escalonado
    const segs = 3; let z = 0, d = 0, w = x1 - x0;
    for (let k = 0; k < segs; k++) {
      const fz = Math.round(F * [0.5, 0.3, 0.2][k]), h = fz * fh;
      box(x0 + d, y0 + d, x1 - d, y1 - d, z, z + h, gc); windows(x0 + d, y0 + d, x1 - d, y1 - d, z, z + h, fz, 5, glassWin, seed + k, litP);
      z += h; d += w * 0.12;
    }
    x0 += d - w * 0.12; y0 += d - w * 0.12; x1 -= d - w * 0.12; y1 -= d - w * 0.12;
  } else if (style === 2) { // concreto com pilares + térreo comercial
    const c = pick(CONC, r);
    box(x0, y0, x1, y1, 0, H, c); windows(x0, y0, x1, y1, fh, H, F - 1, 5, WIN_DARK, seed, litP, { wf: 0.7, hf: 0.6 });
    floorBands(x0, y0, x1, y1, 0, H, F, c); storefront(x0, y0, x1, y1, fh, pick(AWN, r));
  } else { // torre com base
    const bh = 4 * fh, d = (x1 - x0) * 0.18;
    box(x0, y0, x1, y1, 0, bh, pick(CONC, r)); windows(x0, y0, x1, y1, 0, bh, 4, 5, WIN_GLASS, seed, litP);
    box(x0 + d, y0 + d, x1 - d, y1 - d, bh, H, gc); windows(x0 + d, y0 + d, x1 - d, y1 - d, bh, H, F - 4, 1, glassWin, seed + 1, litP, { band: true, hf: 0.6 });
    x0 += d; y0 += d; x1 -= d; y1 -= d;
  }
  const w = x1 - x0;
  if (l >= 7 && r() < 0.45) { rooftop(a, x0, y0, x1, y1, H, r, l, true); return; }
  if (l >= 9 && r() < 0.6) { // coroa + antena
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    box(x0 + w * 0.2, y0 + w * 0.2, x1 - w * 0.2, y1 - w * 0.2, H, H + 12, sh2(gc, 0.8));
    line3(cx, cy, H + 12, cx, cy, H + 12 + 20 + l * 3, '#ccc', 1.5); beacon(a, cx, cy, H + 32 + l * 3, '#ff3030');
  } else if (l >= 7) { // heliponto
    if (!NIGHT) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = PX(cx, cy), sy = PY(cx, cy, H + 0.5); const rr = Math.min(w, 0.7) * 0.5; _g.fillStyle = '#6a6d72'; _g.beginPath(); _g.ellipse(sx, sy, rr * HW, rr * HH, 0, 0, 6.283); _g.fill(); _g.strokeStyle = '#ffd34d'; _g.lineWidth = 0.8; _g.stroke(); _g.fillStyle = '#fff'; _g.font = 'bold 6px sans-serif'; _g.textAlign = 'center'; _g.fillText('H', sx, sy + 2); }
    beacon(a, (x0 + x1) / 2, (y0 + y1) / 2, H + 2, '#30ff60');
  } else rooftop(a, x0, y0, x1, y1, H, r, l, true);
}

// ---------- Edifícios de serviço ----------
function drawServiceBuilding(a) {
  const d = BYID[G.bk[a]], s = d.s, ax = a % N, ay = (a / N) | 0, k = d.key;
  ABAND = false; LIT = !!(G.flags[a] & F_POW) || !!d.pw;
  SMOKE_SRC.delete(a); BEACONS.delete(a);
  const r = mulberry(a * 17 + 3), seed = a * 7;
  const X0 = ax, Y0 = ay, X1 = ax + s, Y1 = ay + s;
  const g = _g;
  const sH = SV_H[k]; if (sH) castShadow(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, sH);
  switch (k) {
    case 'coal': {
      box(X0 + 0.2, Y0 + 1.1, X0 + 2.0, Y1 - 0.2, 0, 34, [150, 120, 100]); windows(X0 + 0.2, Y0 + 1.1, X0 + 2.0, Y1 - 0.2, 0, 34, 3, 3, WIN_DARK, seed, 0.6);
      box(X0 + 2.1, Y0 + 1.4, X1 - 0.2, Y1 - 0.3, 0, 20, [110, 104, 98]);
      if (!NIGHT) for (let j = 0; j < 3; j++) { const sx = PX(X0 + 0.6 + j * 0.5, Y0 + 0.5), sy = PY(X0 + 0.6 + j * 0.5, Y0 + 0.5, 0); g.fillStyle = '#222'; g.beginPath(); g.ellipse(sx, sy - 3, 14, 7, 0, Math.PI, 0); g.fill(); }
      for (const [cx, cy] of [[X0 + 0.9, Y0 + 1.3], [X0 + 1.6, Y0 + 1.3]]) { cyl(cx, cy, 0.14, 0, 110, [175, 70, 60]); if (!NIGHT) { cyl(cx, cy, 0.142, 90, 98, [240, 240, 240]); } smokeAt(a, cx, cy, 112); beacon(a, cx, cy, 112, '#ff3030'); }
      break;
    }
    case 'gas': {
      box(X0 + 0.15, Y0 + 0.9, X0 + 1.2, Y1 - 0.15, 0, 22, [170, 175, 180]); windows(X0 + 0.15, Y0 + 0.9, X0 + 1.2, Y1 - 0.15, 0, 22, 2, 3, WIN_DARK, seed, 0.6);
      cyl(X0 + 1.55, Y0 + 0.5, 0.3, 0, 22, [220, 220, 215]); cyl(X0 + 1.55, Y0 + 1.4, 0.26, 0, 18, [205, 205, 200]);
      cyl(X0 + 0.6, Y0 + 0.4, 0.09, 0, 60, [190, 190, 190]); smokeAt(a, X0 + 0.6, Y0 + 0.4, 62);
      break;
    }
    case 'wind': {
      const cx = X0 + 0.5, cy = Y0 + 0.5, sx = PX(cx, cy), sy = PY(cx, cy, 0);
      if (!NIGHT) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(sx, sy, 6, 3, 0, 0, 6.283); g.fill(); g.strokeStyle = '#f0f0f0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - 62); g.stroke(); }
      WIND_HUBS.set(a, { x: sx, y: sy - 62 });
      break;
    }
    case 'solar': {
      if (!NIGHT) {
        for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 6; xx++) {
          const gx = X0 + 0.1 + xx * 0.48, gy = Y0 + 0.1 + yy * 0.48;
          fillQ('#1d3c6e', gx, gy, 3, gx + 0.4, gy, 3, gx + 0.4, gy + 0.36, 0.8, gx, gy + 0.36, 0.8);
          g.strokeStyle = '#6f9bd8'; g.lineWidth = 0.4; g.beginPath(); mv(gx, gy, 3); ln(gx + 0.4, gy, 3); g.stroke();
        }
      }
      box(X1 - 0.6, Y1 - 0.6, X1 - 0.1, Y1 - 0.1, 0, 8, [220, 220, 220]);
      break;
    }
    case 'nuclear': {
      box(X0 + 0.2, Y0 + 2.2, X0 + 2.2, Y1 - 0.2, 0, 26, [200, 200, 196]); windows(X0 + 0.2, Y0 + 2.2, X0 + 2.2, Y1 - 0.2, 0, 26, 3, 3, WIN_DARK, seed, 0.6);
      cyl(X0 + 1.2, Y0 + 3.0, 0.45, 26, 34, [190, 190, 190]); dome(X0 + 1.2, Y0 + 3.0, 0.45, 34, [210, 210, 210]);
      coolTower(X0 + 1.0, Y0 + 1.0, 0.75, 85); coolTower(X0 + 2.9, Y0 + 1.2, 0.7, 80);
      smokeAt(a, X0 + 1.0, Y0 + 1.0, 92); smokeAt(a, X0 + 2.9, Y0 + 1.2, 87);
      box(X0 + 2.5, Y0 + 2.5, X1 - 0.2, Y1 - 0.3, 0, 16, [170, 175, 180]);
      break;
    }
    case 'fusion': {
      box(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, 0, 10, [60, 70, 90]);
      cyl(X0 + 2, Y0 + 2, 1.35, 10, 24, [120, 130, 160], [30, 40, 60]);
      dome(X0 + 2, Y0 + 2, 1.1, 24, [140, 200, 255]);
      if (NIGHT || !NIGHT) { const sx = PX(X0 + 2, Y0 + 2), sy = PY(X0 + 2, Y0 + 2, 18); g.strokeStyle = NIGHT ? '#4ff' : '#7df'; g.lineWidth = NIGHT ? 3 : 2; g.beginPath(); g.ellipse(sx, sy, 1.5 * HW * 1.41, 1.5 * HH * 1.41, 0, 0, 6.283); g.stroke(); }
      beacon(a, X0 + 2, Y0 + 2, 70, '#40e0ff');
      break;
    }
    case 'pump': {
      box(X0 + 0.2, Y0 + 0.25, X0 + 0.8, Y0 + 0.75, 0, 12, [120, 150, 180]); windows(X0 + 0.2, Y0 + 0.25, X0 + 0.8, Y0 + 0.75, 0, 12, 1, 2, WIN_DARK, seed, 0.6);
      cyl(X0 + 0.75, Y0 + 0.2, 0.12, 0, 16, [80, 120, 170]);
      break;
    }
    case 'wtower': {
      const cx = X0 + 0.5, cy = Y0 + 0.5;
      for (const [dx, dy] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) line3(cx + dx, cy + dy, 0, cx + dx * 0.6, cy + dy * 0.6, 30, '#666', 1.5);
      cyl(cx, cy, 0.27, 30, 48, [120, 170, 210]); dome(cx, cy, 0.27, 48, [100, 150, 190]);
      break;
    }
    case 'desal': {
      box(X0 + 0.2, Y0 + 0.2, X0 + 1.6, Y1 - 0.2, 0, 18, [220, 228, 236]); windows(X0 + 0.2, Y0 + 0.2, X0 + 1.6, Y1 - 0.2, 0, 18, 2, 3, WIN_GLASS, seed, 0.6);
      for (let j = 0; j < 3; j++) cyl(X0 + 2.3, Y0 + 0.5 + j * 0.9, 0.32, 0, 14, [70, 140, 200]);
      break;
    }
    case 'treat': {
      box(X0 + 0.15, Y0 + 0.15, X0 + 1.0, Y1 - 0.15, 0, 16, [110, 170, 110]); windows(X0 + 0.15, Y0 + 0.15, X0 + 1.0, Y1 - 0.15, 0, 16, 2, 3, WIN_DARK, seed, 0.5);
      cyl(X0 + 1.5, Y0 + 0.5, 0.33, 0, 6, [150, 150, 150], [90, 140, 90]); cyl(X0 + 1.5, Y0 + 1.45, 0.33, 0, 6, [150, 150, 150], [100, 150, 170]);
      break;
    }
    case 'police': case 'policehq': {
      const hq = k === 'policehq';
      const h = hq ? 42 : 20, c = [110, 130, 170];
      box(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - (hq ? 0.9 : 0.6), 0, h, c); windows(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - (hq ? 0.9 : 0.6), 0, h, hq ? 6 : 3, 3, WIN_DARK, seed, 0.7);
      flat(X0 + 0.15, Y1 - (hq ? 0.85 : 0.55), X1 - 0.15, Y1 - 0.1, 0.5, '#55595e');
      if (!NIGHT) for (let j = 0; j < (hq ? 5 : 3); j++) { const gx = X0 + 0.3 + j * 0.42; box(gx, Y1 - 0.4, gx + 0.25, Y1 - 0.22, 0, 4, [240, 240, 245]); }
      beacon(a, X0 + s / 2, Y0 + 0.5, h + 3, '#3070ff'); if (hq) beacon(a, X0 + s / 2 + 0.5, Y0 + 0.5, h + 3, '#ff3030');
      break;
    }
    case 'fire': {
      const c = [190, 70, 55];
      box(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 0, 18, c);
      if (!NIGHT) { g.fillStyle = '#eee'; for (let j = 0; j < 3; j++) { const u = X0 + 0.3 + j * 0.5; g.beginPath(); q4(u, Y1 - 0.15, 0, u + 0.35, Y1 - 0.15, 0, u + 0.35, Y1 - 0.15, 11, u, Y1 - 0.15, 11); g.fill(); } }
      windows(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 12, 18, 1, 4, WIN_DARK, seed, 0.7);
      box(X0 + 0.2, Y0 + 0.2, X0 + 0.55, Y0 + 0.55, 18, 40, [170, 60, 50]);
      beacon(a, X0 + 0.37, Y0 + 0.37, 42, '#ff3030');
      break;
    }
    case 'clinic': case 'hospital': {
      const hos = k === 'hospital', h = hos ? 56 : 14;
      box(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 0, h, [236, 238, 240]); windows(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 0, h, hos ? 8 : 2, 4, WIN_GLASS, seed, 0.85);
      const cx = X0 + s / 2, cy = Y0 + s / 2;
      if (!NIGHT) { const w = hos ? 0.5 : 0.25, t = w / 3; fillQ('#e03030', cx - w, cy - t, h + 0.5, cx + w, cy - t, h + 0.5, cx + w, cy + t, h + 0.5, cx - w, cy + t, h + 0.5); fillQ('#e03030', cx - t, cy - w, h + 0.5, cx + t, cy - w, h + 0.5, cx + t, cy + w, h + 0.5, cx - t, cy + w, h + 0.5); }
      if (hos) { box(X0 + 0.15, Y1 - 0.15, X1 - 0.15, Y1 - 0.15 + 0.01, 0, 0, [0, 0, 0]); beacon(a, cx, cy, h + 2, '#ff3030'); }
      break;
    }
    case 'school': {
      const c = [196, 110, 80];
      flat(X0 + 0.1, Y0 + 0.1, X1 - 0.1, Y0 + 0.9, 0.5, '#5aa04a');
      if (!NIGHT) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.8; g.beginPath(); q4(X0 + 0.25, Y0 + 0.2, 0.6, X1 - 0.25, Y0 + 0.2, 0.6, X1 - 0.25, Y0 + 0.8, 0.6, X0 + 0.25, Y0 + 0.8, 0.6); g.stroke(); }
      box(X0 + 0.15, Y0 + 1.0, X1 - 0.15, Y1 - 0.15, 0, 18, c); windows(X0 + 0.15, Y0 + 1.0, X1 - 0.15, Y1 - 0.15, 0, 18, 2, 4, WIN_DARK, seed, 0.4);
      box(X1 - 0.8, Y0 + 0.2, X1 - 0.15, Y0 + 1.0, 0, 18, c);
      line3(X0 + 0.3, Y1 - 0.3, 18, X0 + 0.3, Y1 - 0.3, 34, '#ddd', 1); if (!NIGHT) fillQ('#2c9b48', X0 + 0.3, Y1 - 0.3, 34, X0 + 0.55, Y1 - 0.3, 33, X0 + 0.55, Y1 - 0.3, 29, X0 + 0.3, Y1 - 0.3, 30);
      break;
    }
    case 'library': {
      box(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 0, 16, [222, 214, 196]);
      if (!NIGHT) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); for (let j = 0; j < 5; j++) { const u = X0 + 0.22 + j * 0.14; mv(u, Y1 - 0.12, 0); ln(u, Y1 - 0.12, 14); } g.stroke(); }
      windows(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 0, 14, 1, 3, WIN_WARM, seed, 0.8);
      gable(X0 + 0.12, Y0 + 0.12, X1 - 0.12, Y1 - 0.12, 16, 7, [222, 214, 196], [160, 160, 160], false);
      break;
    }
    case 'univ': {
      flat(X0 + 0.1, Y0 + 0.1, X1 - 0.1, Y1 - 0.1, 0.3, '#6fae55');
      box(X0 + 0.2, Y0 + 0.2, X0 + 1.5, Y0 + 3.8, 0, 26, [200, 120, 90]); windows(X0 + 0.2, Y0 + 0.2, X0 + 1.5, Y0 + 3.8, 0, 26, 3, 3, WIN_DARK, seed, 0.6);
      box(X0 + 1.6, Y0 + 0.2, X1 - 0.2, Y0 + 1.3, 0, 24, [210, 130, 100]); windows(X0 + 1.6, Y0 + 0.2, X1 - 0.2, Y0 + 1.3, 0, 24, 3, 3, WIN_DARK, seed + 1, 0.6);
      box(X0 + 2.0, Y0 + 2.0, X0 + 3.4, Y0 + 3.4, 0, 30, [232, 226, 210]); windows(X0 + 2.0, Y0 + 2.0, X0 + 3.4, Y0 + 3.4, 0, 30, 3, 4, WIN_WARM, seed + 2, 0.7);
      cyl(X0 + 2.7, Y0 + 2.7, 0.45, 30, 36, [232, 226, 210]); dome(X0 + 2.7, Y0 + 2.7, 0.45, 36, [90, 140, 120]);
      for (let j = 0; j < 3; j++) treeAt(X0 + 1.8 + j * 0.6, Y1 - 0.3, 6, seed + j);
      break;
    }
    case 'plaza': case 'park': case 'bigpark': case 'sports': case 'zoo':
    case 'playground': case 'skate': case 'soccer': case 'amph': case 'garden': case 'waterpark': case 'ferris': {
      drawParkObjects(a, k, X0, Y0, X1, Y1, r, seed);
      break;
    }
    case 'marina': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.4, '#9c7a52');
      box(X0 + 0.2, Y0 + 0.2, X0 + 0.9, Y0 + 0.9, 0, 12, [240, 240, 236]); windows(X0 + 0.2, Y0 + 0.2, X0 + 0.9, Y0 + 0.9, 0, 12, 1, 3, WIN_GLASS, seed, 0.8);
      for (let j = 0; j < 4; j++) { const gx = X0 + 1.1 + (j % 2) * 0.45, gy = Y0 + 0.5 + ((j / 2) | 0) * 0.8; flat(gx, gy, gx + 0.25, gy + 0.5, 1, '#fff'); line3(gx + 0.12, gy + 0.25, 1, gx + 0.12, gy + 0.25, 20, '#ddd', 0.8); if (!NIGHT) { g.fillStyle = '#fff'; g.beginPath(); mv(gx + 0.12, gy + 0.25, 19); ln(gx + 0.12, gy + 0.25, 4); ln(gx + 0.12, gy + 0.6, 4); g.closePath(); g.fill(); } }
      break;
    }
    case 'bus': {
      flat(X0 + 0.1, Y0 + 0.1, X1 - 0.1, Y1 - 0.1, 0.4, '#6d7075');
      for (let j = 0; j < 3; j++) { const gy = Y0 + 0.3 + j * 0.5; box(X0 + 0.3, gy, X0 + 1.5, gy + 0.22, 0, 8, [240, 190, 40]); windows(X0 + 0.3, gy, X0 + 1.5, gy + 0.22, 3, 7, 1, 5, WIN_DARK, seed + j, 0.8); }
      line3(X0 + 0.2, Y0 + 0.2, 0, X0 + 0.2, Y0 + 0.2, 14, '#888', 1); line3(X1 - 0.2, Y1 - 0.2, 0, X1 - 0.2, Y1 - 0.2, 14, '#888', 1);
      flat(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, 14, 'rgba(180,200,210,0.6)');
      break;
    }
    case 'metro': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.3, '#b9b4aa');
      box(X0 + 0.3, Y0 + 0.3, X0 + 0.72, Y0 + 0.72, 0, 9, [60, 90, 160]);
      flat(X0 + 0.26, Y0 + 0.26, X0 + 0.76, Y0 + 0.76, 9.5, 'rgba(200,220,240,0.85)');
      line3(X0 + 0.85, Y0 + 0.2, 0, X0 + 0.85, Y0 + 0.2, 18, '#555', 1.2);
      if (!NIGHT) { const sx = PX(X0 + 0.85, Y0 + 0.2), sy = PY(X0 + 0.85, Y0 + 0.2, 22); g.fillStyle = '#1e5bd6'; g.beginPath(); g.arc(sx, sy, 5, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.fillText('M', sx, sy + 2.5); }
      beacon(a, X0 + 0.85, Y0 + 0.2, 22, '#5090ff');
      break;
    }
    case 'airport': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.2, '#7d9a62');
      flat(X0 + 0.2, Y0 + 0.6, X1 - 0.2, Y0 + 1.4, 0.4, '#3d3f43');
      if (!NIGHT) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.setLineDash([6, 6]); g.beginPath(); mv(X0 + 0.3, Y0 + 1.0, 0.5); ln(X1 - 0.3, Y0 + 1.0, 0.5); g.stroke(); g.setLineDash([]); }
      flat(X0 + 0.2, Y0 + 1.6, X0 + 1.0, Y1 - 0.3, 0.4, '#4a4c50');
      box(X0 + 1.3, Y0 + 2.6, X1 - 0.3, Y1 - 0.3, 0, 22, [220, 224, 230]); windows(X0 + 1.3, Y0 + 2.6, X1 - 0.3, Y1 - 0.3, 0, 22, 2, 1, WIN_GLASS, seed, 0.85, { band: true });
      cyl(X0 + 1.6, Y0 + 2.0, 0.15, 0, 50, [220, 220, 220]); cyl(X0 + 1.6, Y0 + 2.0, 0.28, 50, 60, [90, 140, 170]);
      beacon(a, X0 + 1.6, Y0 + 2.0, 62, '#ff3030');
      for (const [gx, gy] of [[X0 + 2.2, Y0 + 2.1], [X0 + 3.2, Y0 + 2.1], [X0 + 2.0, Y0 + 1.0]]) plane(gx, gy);
      break;
    }
    case 'cityhall': {
      box(X0 + 0.15, Y0 + 0.3, X1 - 0.15, Y1 - 0.3, 0, 26, [236, 230, 214]); windows(X0 + 0.15, Y0 + 0.3, X1 - 0.15, Y1 - 0.3, 0, 26, 3, 4, WIN_WARM, seed, 0.8);
      if (!NIGHT) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); for (let j = 0; j < 8; j++) { const u = X0 + 0.3 + j * 0.33; mv(u, Y1 - 0.25, 0); ln(u, Y1 - 0.25, 22); } g.stroke(); }
      cyl(X0 + 1.5, Y0 + 1.5, 0.55, 26, 40, [236, 230, 214]); dome(X0 + 1.5, Y0 + 1.5, 0.55, 40, [120, 170, 140]);
      line3(X0 + 1.5, Y0 + 1.5, 62, X0 + 1.5, Y0 + 1.5, 76, '#ccc', 1); if (!NIGHT) fillQ('#2c9b48', X0 + 1.5, Y0 + 1.5, 76, X0 + 1.8, Y0 + 1.5, 75, X0 + 1.8, Y0 + 1.5, 70, X0 + 1.5, Y0 + 1.5, 71);
      break;
    }
    case 'statue': {
      flat(X0 + 0.05, Y0 + 0.05, X1 - 0.05, Y1 - 0.05, 0.3, '#c8c0b0');
      box(X0 + 0.32, Y0 + 0.32, X0 + 0.68, Y0 + 0.68, 0, 14, [180, 175, 165]);
      box(X0 + 0.43, Y0 + 0.43, X0 + 0.57, Y0 + 0.57, 14, 36, [80, 160, 140]);
      line3(X0 + 0.5, Y0 + 0.45, 30, X0 + 0.5, Y0 + 0.3, 46, '#4d9f8c', 2.5);
      if (!NIGHT) { g.fillStyle = '#ffcc40'; g.beginPath(); g.arc(PX(X0 + 0.5, Y0 + 0.3), PY(X0 + 0.5, Y0 + 0.3, 48), 3, 0, 6.283); g.fill(); }
      beacon(a, X0 + 0.5, Y0 + 0.3, 48, '#ffcc40');
      break;
    }
    case 'cathedral': {
      const c = [200, 190, 170];
      box(X0 + 0.3, Y0 + 0.6, X1 - 0.3, Y1 - 0.6, 0, 40, c); windows(X0 + 0.3, Y0 + 0.6, X1 - 0.3, Y1 - 0.6, 6, 34, 1, 4, ['rgba(90,60,140,0.8)', 'rgba(60,40,110,0.8)'], seed, 0.9, { hf: 0.8 });
      gable(X0 + 0.3, Y0 + 0.6, X1 - 0.3, Y1 - 0.6, 40, 20, c, [90, 90, 100], true);
      for (const [gx, gy] of [[X1 - 0.75, Y0 + 0.45], [X1 - 0.75, Y1 - 0.45]]) { box(gx - 0.25, gy - 0.25, gx + 0.25, gy + 0.25, 0, 70, c); if (!NIGHT) { g.fillStyle = '#5a5a66'; g.beginPath(); mv(gx - 0.25, gy + 0.25, 70); ln(gx + 0.25, gy + 0.25, 70); ln(gx + 0.25, gy - 0.25, 70); ln(gx, gy, 100); g.closePath(); g.fill(); } }
      break;
    }
    case 'stadium': {
      const cx = X0 + 2, cy = Y0 + 2, sx = PX(cx, cy), sy = PY(cx, cy, 0);
      const rx = 1.8 * HW * 1.41, ry = 1.8 * HH * 1.41;
      if (NIGHT) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(sx, sy - 14, rx, ry, 0, 0, 6.283); g.rect(sx - rx, sy - 14, rx * 2, 14); g.fill(); }
      else {
        g.fillStyle = '#8c8f96'; g.beginPath(); g.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); g.lineTo(sx - rx, sy - 26); g.lineTo(sx + rx, sy - 26); g.closePath(); g.fill(); g.fillRect(sx - rx, sy - 26, rx * 2, 26);
        g.fillStyle = '#b8bcc4'; g.beginPath(); g.ellipse(sx, sy - 26, rx, ry, 0, 0, 6.283); g.fill();
        g.fillStyle = '#d04040'; g.beginPath(); g.ellipse(sx, sy - 22, rx * 0.86, ry * 0.86, 0, 0, 6.283); g.fill();
        g.fillStyle = '#3f9a3a'; g.beginPath(); g.ellipse(sx, sy - 12, rx * 0.62, ry * 0.62, 0, 0, 6.283); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(sx, sy - 12, rx * 0.3, ry * 0.3, 0, 0, 6.283); g.stroke();
      }
      for (const [dx, dy] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { line3(cx + dx, cy + dy, 0, cx + dx, cy + dy, 60, '#999', 1.5); beacon(a, cx + dx, cy + dy, 60, '#ffffff'); }
      break;
    }
    case 'tvtower': {
      const cx = X0 + 1, cy = Y0 + 1;
      box(X0 + 0.3, Y0 + 0.3, X1 - 0.3, Y1 - 0.3, 0, 12, [200, 200, 205]);
      cyl(cx, cy, 0.18, 12, 300, [225, 225, 228]);
      cyl(cx, cy, 0.5, 300, 320, [200, 210, 225]); windows(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 302, 318, 2, 3, WIN_GLASS, seed, 0.9, { band: true });
      cyl(cx, cy, 0.38, 320, 330, [180, 190, 205]); line3(cx, cy, 330, cx, cy, 390, '#ddd', 2); beacon(a, cx, cy, 390, '#ff3030'); beacon(a, cx, cy, 300, '#ff3030');
      break;
    }
    case 'arco': {
      let z = 0, d = 0.1;
      for (let j = 0; j < 6; j++) { const h = 42; box(X0 + d, Y0 + d, X1 - d, Y1 - d, z, z + h, j % 2 ? [190, 210, 220] : [120, 170, 200]); windows(X0 + d, Y0 + d, X1 - d, Y1 - d, z, z + h, 6, 4, WIN_GLASS, seed + j, 0.8, { band: j % 2 === 0 }); z += h; d += 0.28; }
      dome(X0 + 2, Y0 + 2, 0.4, z, [150, 220, 200]); beacon(a, X0 + 2, Y0 + 2, z + 20, '#40ff90');
      break;
    }
    case 'spire': {
      let z = 0, d = 0.15;
      for (let j = 0; j < 9; j++) { const h = 50 - j * 2; box(X0 + d, Y0 + d, X1 - d, Y1 - d, z, z + h, [150 + j * 6, 180 + j * 4, 210]); windows(X0 + d, Y0 + d, X1 - d, Y1 - d, z, z + h, 6, 1, WIN_GLASS, seed + j, 0.85, { band: true }); z += h; d += 0.13; }
      line3(X0 + 1.5, Y0 + 1.5, z, X0 + 1.5, Y0 + 1.5, z + 50, '#eee', 2.5); beacon(a, X0 + 1.5, Y0 + 1.5, z + 50, '#ffffff');
      break;
    }
    default: if (!drawExtraBuilding(a, k, X0, Y0, X1, Y1, r, seed)) box(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, 0, 14, [180, 180, 180]);
  }
}
const WIND_HUBS = new Map();
// altura aproximada de cada edifício de serviço (para a sombra projetada)
const SV_H = { coal: 40, gas: 24, nuclear: 70, fusion: 30, pump: 12, wtower: 40, desal: 18, treat: 16, police: 20, policehq: 42, fire: 26, clinic: 14, hospital: 56, school: 18, library: 22, univ: 32, cityhall: 40, statue: 24, cathedral: 70, stadium: 26, tvtower: 60, arco: 160, spire: 200, airport: 24, bus: 14, metro: 9, zoo: 12,
  obelisk: 70, clock: 70, lighthouse: 64, archmon: 66, museum: 34, planet: 40, opera: 50, pyramid: 62, castle: 50, colossus: 140, garden: 30, waterpark: 30, ferris: 90, amph: 24 };
function plane(gx, gy) {
  if (NIGHT) return; const g = _g, sx = PX(gx, gy), sy = PY(gx, gy, 1);
  g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(sx - 12, sy - 6); g.lineTo(sx + 12, sy + 6); g.lineTo(sx + 10, sy + 7); g.lineTo(sx - 14, sy - 5); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(sx - 2, sy + 1); g.lineTo(sx - 10, sy + 6); g.lineTo(sx - 7, sy + 7); g.lineTo(sx + 2, sy + 2); g.lineTo(sx + 9, sy - 2); g.lineTo(sx + 6, sy - 3); g.closePath(); g.fill();
}
function drawPark(a, k, X0, Y0, X1, Y1, r, seed) {
  const g = _g;
  if (k === 'sports') {
    flat(X0 + 0.15, Y0 + 0.15, X1 - 0.15, Y1 - 0.15, 0.4, '#c8683c');
    if (!NIGHT) { g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.beginPath(); q4(X0 + 0.3, Y0 + 0.3, 0.5, X1 - 0.3, Y0 + 0.3, 0.5, X1 - 0.3, Y1 - 0.3, 0.5, X0 + 0.3, Y1 - 0.3, 0.5); mv((X0 + X1) / 2, Y0 + 0.3, 0.5); ln((X0 + X1) / 2, Y1 - 0.3, 0.5); g.stroke(); }
    line3(X0 + 0.15, Y1 - 0.15, 0, X0 + 0.15, Y1 - 0.15, 10, '#888', 1); line3(X1 - 0.15, Y1 - 0.15, 0, X1 - 0.15, Y1 - 0.15, 10, '#888', 1);
    for (const [gx, gy] of [[X0 + 0.15, Y0 + 0.15], [X1 - 0.15, Y1 - 0.15]]) { line3(gx, gy, 0, gx, gy, 30, '#999', 1); beacon(a, gx, gy, 30, '#ffffff'); }
    return;
  }
  const s = X1 - X0;
  // caminhos
  if (!NIGHT) {
    g.fillStyle = '#d6c8a4';
    g.beginPath(); q4(X0 + s * 0.45, Y0, 0.3, X0 + s * 0.55, Y0, 0.3, X0 + s * 0.55, Y1, 0.3, X0 + s * 0.45, Y1, 0.3); g.fill();
    g.beginPath(); q4(X0, Y0 + s * 0.45, 0.3, X1, Y0 + s * 0.45, 0.3, X1, Y0 + s * 0.55, 0.3, X0, Y0 + s * 0.55, 0.3); g.fill();
  }
  const cx = X0 + s / 2, cy = Y0 + s / 2;
  if (k === 'bigpark') { // lago
    if (!NIGHT) { const sx = PX(cx - s * 0.18, cy + s * 0.2), sy = PY(cx - s * 0.18, cy + s * 0.2, 0); g.fillStyle = '#3d86c0'; g.beginPath(); g.ellipse(sx, sy, s * 14, s * 7, 0, 0, 6.283); g.fill(); g.strokeStyle = '#cfe6f5'; g.lineWidth = 1; g.stroke(); }
  }
  if (k === 'zoo') {
    if (!NIGHT) for (let j = 0; j < 4; j++) {
      const gx = X0 + 0.2 + (j % 2) * s * 0.52, gy = Y0 + 0.2 + ((j / 2) | 0) * s * 0.52, w = s * 0.38;
      flat(gx, gy, gx + w, gy + w, 0.4, ['#c9b37a', '#7fb069', '#a58a5c', '#6f9fc0'][j]);
      g.strokeStyle = '#6b5233'; g.lineWidth = 0.8; g.beginPath(); q4(gx, gy, 3, gx + w, gy, 3, gx + w, gy + w, 3, gx, gy + w, 3); g.stroke();
      g.fillStyle = ['#e0a030', '#8b6b4a', '#555', '#f0f0f0'][j]; for (let m = 0; m < 3; m++) { g.beginPath(); g.ellipse(PX(gx + w * (0.3 + m * 0.2), gy + w * 0.5), PY(gx + w * (0.3 + m * 0.2), gy + w * 0.5, 3), 3, 2, 0, 0, 6.283); g.fill(); }
    }
    box(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 0, 14, [200, 150, 90]); gable(cx - 0.33, cy - 0.33, cx + 0.33, cy + 0.33, 14, 8, [200, 150, 90], [120, 80, 50], true);
    return;
  }
  // fonte
  if (k !== 'park' || s > 1) {
    const sx = PX(cx, cy), sy = PY(cx, cy, 0);
    if (!NIGHT) { g.fillStyle = '#bbb3a3'; g.beginPath(); g.ellipse(sx, sy, 10 * (k === 'plaza' ? 0.8 : 1.2), 5 * (k === 'plaza' ? 0.8 : 1.2), 0, 0, 6.283); g.fill(); g.fillStyle = '#5fb2e6'; g.beginPath(); g.ellipse(sx, sy - 1, 7 * (k === 'plaza' ? 0.8 : 1.2), 3.5 * (k === 'plaza' ? 0.8 : 1.2), 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(230,245,255,0.9)'; g.fillRect(sx - 0.8, sy - 9, 1.6, 8); }
    beacon(a, cx, cy, 2, '#ffe9b0');
  }
  const nT = k === 'plaza' ? 3 : k === 'park' ? 7 : 22;
  const pts = [];
  for (let j = 0; j < nT; j++) {
    let gx = X0 + 0.12 + r() * (s - 0.24), gy = Y0 + 0.12 + r() * (s - 0.24);
    if (Math.abs(gx - cx) < s * 0.1 || Math.abs(gy - cy) < s * 0.1) continue;
    if (k === 'bigpark' && Math.hypot(gx - (cx - s * 0.18), gy - (cy + s * 0.2)) < s * 0.28) continue;
    pts.push([gx, gy]);
  }
  pts.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));
  for (const [gx, gy] of pts) treeAt(gx, gy, 5 + r() * 3, seed + ((gx * 100) | 0));
  if (k === 'plaza' && !NIGHT) { box(X0 + 0.15, Y0 + 0.7, X0 + 0.4, Y0 + 0.78, 0, 2, [120, 80, 50]); }
}
