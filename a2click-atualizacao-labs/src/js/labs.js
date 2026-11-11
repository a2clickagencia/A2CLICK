/* A² LABS: pequenos comportamentos da página. Tudo aqui é melhoria: sem JavaScript os links e botões continuam funcionando. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Menu do celular: fecha ao tocar num link
  $$('.gaveta a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = a.closest('details');
      if (d) d.open = false;
    });
  });

  // Jogo dentro da página: o jogo só é carregado quando a pessoa pede (nada é baixado de terceiros antes disso)
  var jogo = $('#jogo');
  if (jogo) {
    var capa = $('.jogo-capa', jogo);
    var abrirBtn = $('#jogar');
    var telaCheia = $('#tela-cheia');
    var frame = null;

    var abrir = function () {
      if (frame) return frame;
      frame = document.createElement('iframe');
      frame.src = jogo.getAttribute('data-src');
      frame.title = 'Cabeçudos FC, jogo de futebol de cabeção';
      frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; clipboard-write');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      jogo.appendChild(frame);
      if (capa) capa.hidden = true;
      frame.focus();
      return frame;
    };

    if (abrirBtn) {
      abrirBtn.addEventListener('click', function (e) {
        e.preventDefault();
        abrir();
      });
    }
    if (telaCheia) {
      telaCheia.hidden = false;
      telaCheia.addEventListener('click', function () {
        var f = abrir();
        var pedir = f.requestFullscreen || f.webkitRequestFullscreen;
        if (pedir) pedir.call(f);
      });
    }
  }

  // Galeria do Urbis: o clique troca a foto grande; sem JavaScript cada miniatura abre a imagem
  var grande = $('#foto-grande');
  var legenda = $('#foto-legenda');
  var miniaturas = $$('.mini a');
  if (grande && miniaturas.length) {
    miniaturas.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var base = a.getAttribute('data-base');
        grande.src = base + '-1280w.webp';
        grande.srcset = base + '-640w.webp 640w, ' + base + '-1280w.webp 1280w';
        grande.alt = a.getAttribute('data-alt') || '';
        if (legenda) legenda.textContent = a.getAttribute('data-legenda') || '';
        miniaturas.forEach(function (m) { m.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'true');
      });
    });
  }

  // O instalador é só para Windows: quem está em outro sistema recebe o aviso
  var avisoSistema = $('#aviso-sistema');
  if (avisoSistema && !/Windows/i.test(navigator.userAgent)) avisoSistema.hidden = false;

  // O botão de download leva de volta para cá enquanto o instalador não estiver publicado
  var avisoBaixar = $('#aviso-baixar');
  if (avisoBaixar && /(^|[?&])baixar=aguardando(&|$)/.test(location.search)) {
    avisoBaixar.hidden = false;
  }
})();
