(function () {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
$$('.gaveta a').forEach(function (a) {
a.addEventListener('click', function () {
var d = a.closest('details');
if (d) d.open = false;
});
});
function escolherAba(ficha, nome, foco) {
var abas = $$('[role="tab"]', ficha);
var alvo = null;
abas.forEach(function (b) {
var ativo = b.getAttribute('data-aba') === nome;
if (ativo) alvo = b;
b.setAttribute('aria-selected', ativo ? 'true' : 'false');
b.tabIndex = ativo ? 0 : -1;
var p = document.getElementById(b.getAttribute('aria-controls'));
if (p) p.hidden = !ativo;
});
var pn = $('.paineis', ficha);
if (pn) pn.scrollTop = 0;
if (alvo && foco) alvo.focus();
}
$$('.ficha').forEach(function (ficha) {
var abas = $$('[role="tab"]', ficha);
abas.forEach(function (b, i) {
b.addEventListener('click', function () { escolherAba(ficha, b.getAttribute('data-aba'), false); });
b.addEventListener('keydown', function (e) {
var k = e.key, n = null;
if (k === 'ArrowRight') n = (i + 1) % abas.length;
else if (k === 'ArrowLeft') n = (i - 1 + abas.length) % abas.length;
else if (k === 'Home') n = 0;
else if (k === 'End') n = abas.length - 1;
if (n === null) return;
e.preventDefault();
escolherAba(ficha, abas[n].getAttribute('data-aba'), true);
});
});
$$('[data-fechar]', ficha).forEach(function (b) { b.addEventListener('click', function () { ficha.close(); }); });
ficha.addEventListener('click', function (e) { if (e.target === ficha) ficha.close(); });
ficha.addEventListener('close', function () {
if (ficha.id === 'ficha-cabecudos') fecharJogo();
});
});
var ultimo = null;
function abrir(id, aba) {
var f = document.getElementById(id);
if (!f || typeof f.showModal !== 'function') return false;
ultimo = document.activeElement;
escolherAba(f, aba || $('[role="tab"]', f).getAttribute('data-aba'), false);
if (!f.open) f.showModal();
return true;
}
$$('[data-abrir]').forEach(function (el) {
el.hidden = false;
el.addEventListener('click', function (e) {
if (abrir(el.getAttribute('data-abrir'), el.getAttribute('data-aba'))) e.preventDefault();
});
});
$$('.ficha').forEach(function (f) {
f.addEventListener('close', function () { if (ultimo && ultimo.focus) ultimo.focus(); });
});
function porEndereco() {
var h = location.hash;
if (h === '#cabecudos') abrir('ficha-cabecudos', 'jogar');
else if (h === '#urbis') abrir('ficha-urbis', 'baixar');
else if (h === '#atp') abrir('ficha-atp', 'visao');
}
porEndereco();
var jogo = $('#jogo');
var capa = jogo && $('.jogo-capa', jogo);
var frame = null;
function abrirJogo() {
if (frame || !jogo) return frame;
frame = document.createElement('iframe');
frame.src = jogo.getAttribute('data-src');
frame.title = 'Cabeçudos FC, jogo de futebol de cabeção';
frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; clipboard-write');
frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
jogo.appendChild(frame);
if (capa) capa.hidden = true;
frame.focus();
return frame;
}
function fecharJogo() {
if (!frame) return;
frame.remove();
frame = null;
if (capa) capa.hidden = false;
}
var btnJogar = $('#jogar');
if (btnJogar) btnJogar.addEventListener('click', function (e) { e.preventDefault(); abrirJogo(); });
var tela = $('#tela-cheia');
if (tela) {
tela.hidden = false;
tela.addEventListener('click', function () {
var f = abrirJogo();
var pedir = f && (f.requestFullscreen || f.webkitRequestFullscreen);
if (pedir) pedir.call(f);
});
}
$$('[data-galeria]').forEach(function (g) {
var grande = $('[data-grande]', g);
var legenda = $('[data-legenda]', g);
var minis = $$('.mini a', g);
minis.forEach(function (a) {
a.addEventListener('click', function (e) {
e.preventDefault();
var base = a.getAttribute('data-base');
grande.src = base + '-1280w.webp';
grande.srcset = base + '-640w.webp 640w, ' + base + '-1280w.webp 1280w';
grande.alt = a.getAttribute('data-alt') || '';
if (legenda) legenda.textContent = a.getAttribute('data-alt') || '';
minis.forEach(function (m) { m.removeAttribute('aria-current'); });
a.setAttribute('aria-current', 'true');
});
});
});
var avisoSistema = $('#aviso-sistema');
if (avisoSistema && !/Windows/i.test(navigator.userAgent)) avisoSistema.hidden = false;
})();
