(function () {
'use strict';
var FUNDADORES = {
'5519996022246': 'Pedro',
'5519988659584': 'Igor'
};
var TEXTO_PADRAO = 'Olá, {nome}, vim pelo site da A2 Click e quero conversar sobre um site.';
var ESPERA = 1800;
var LIMITE_TAG = 2500;
function $(id) { return document.getElementById(id); }
var params = new URLSearchParams(location.search);
var numero = (params.get('phone') || '').replace(/\D/g, '');
var nome = FUNDADORES[numero];
var corpo = document.body;
var AW_ID = (corpo.getAttribute('data-aw-id') || '').trim();
var AW_LABEL = (corpo.getAttribute('data-aw-label') || '').trim();
if (!nome) {
corpo.classList.add('sem-escolha');
return;
}
var texto = (params.get('text') || '').slice(0, 1000) || TEXTO_PADRAO.replace('{nome}', nome);
var destino = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
$('obg-nome').textContent = nome;
var botao = $('obg-abrir');
botao.href = destino;
botao.querySelector('span').textContent = 'Abrir o WhatsApp do ' + nome;
corpo.classList.add('com-escolha');
var inicio = Date.now();
var foi = false;
function abrir() {
if (foi) return;
foi = true;
corpo.classList.add('abrindo');
location.replace(destino);
}
var chave = 'a2-conv:' + location.search;
var jaContou = false;
try { jaContou = sessionStorage.getItem(chave) === '1'; } catch (e) {}
if (AW_ID && AW_LABEL && !jaContou) {
window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', AW_ID);
window.gtag('event', 'conversion', {
send_to: AW_ID + '/' + AW_LABEL,
event_callback: function () { setTimeout(abrir, Math.max(300, ESPERA - (Date.now() - inicio))); }
});
try { sessionStorage.setItem(chave, '1'); } catch (e) {}
var tag = document.createElement('script');
tag.async = true;
tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(AW_ID);
document.head.appendChild(tag);
setTimeout(abrir, Math.max(ESPERA, LIMITE_TAG));
} else {
setTimeout(abrir, ESPERA);
}
})();
