/* A² LABS: comportamentos da página. Tudo aqui é melhoria: sem JavaScript os links dos cards continuam funcionando. */
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

  // ---------- abas de cada ficha ----------
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

    // fechar: botão, clique fora da janela
    $$('[data-fechar]', ficha).forEach(function (b) { b.addEventListener('click', function () { ficha.close(); }); });
    ficha.addEventListener('click', function (e) { if (e.target === ficha) ficha.close(); });
    ficha.addEventListener('close', function () {
      if (ficha.id === 'ficha-cabecudos') fecharJogo();
    });
  });

  // ---------- abrir a ficha pelos botões dos cards ----------
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

  // atalhos de endereço: /labs#cabecudos e /labs#urbis abrem a ficha
  function porEndereco() {
    var h = location.hash;
    if (h === '#cabecudos') abrir('ficha-cabecudos', 'jogar');
    else if (h === '#urbis') abrir('ficha-urbis', 'baixar');
    else if (h === '#atp') abrir('ficha-atp', 'visao');
  }
  porEndereco();

  // ---------- jogo dentro da ficha: só carrega quando a pessoa pede ----------
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

  // ---------- carrossel: setas, pontos e troca automática (pausa ao passar o mouse, focar ou tocar) ----------
  (function () {
    var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Array.prototype.slice.call(document.querySelectorAll('[data-car]')).forEach(function (c) {
      var slides = Array.prototype.slice.call(c.querySelectorAll('.car-s'));
      var ctl = c.querySelector('.car-ctl');
      if (slides.length < 2 || !ctl) return;
      var i = 0, tempo = parseInt(c.getAttribute('data-auto'), 10) || 0, t = null, parado = reduz, solto = false;
      function btn(txt, rot, fn) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', rot);
        b.addEventListener('click', fn);
        return b;
      }
      var pontos = document.createElement('div');
      pontos.className = 'car-pontos';
      var bp = slides.map(function (s, n) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-label', 'Imagem ' + (n + 1) + ' de ' + slides.length);
        b.addEventListener('click', function () { ir(n); parar(true); });
        pontos.appendChild(b);
        return b;
      });
      var anterior = btn('‹', 'Imagem anterior', function () { ir(i - 1); parar(true); });
      var proximo = btn('›', 'Próxima imagem', function () { ir(i + 1); parar(true); });
      ctl.appendChild(anterior); ctl.appendChild(pontos); ctl.appendChild(proximo);
      var pausa = null;
      if (tempo && !reduz) {
        pausa = btn('❚❚', 'Pausar a troca automática', function () { parar(!solto); });
        ctl.appendChild(pausa);
      }
      ctl.hidden = false;
      function ir(n) {
        i = (n + slides.length) % slides.length;
        slides.forEach(function (s, k) {
          var on = k === i;
          s.classList.toggle('is-ativo', on);
          s.setAttribute('aria-hidden', on ? 'false' : 'true');
          bp[k].setAttribute('aria-current', on ? 'true' : 'false');
        });
      }
      function rodar() {
        clearInterval(t);
        if (tempo && !parado && !solto && !document.hidden) t = setInterval(function () { ir(i + 1); }, tempo);
      }
      function parar(sim) {
        solto = sim;
        if (pausa) { pausa.textContent = sim ? '▶' : '❚❚'; pausa.setAttribute('aria-label', sim ? 'Retomar a troca automática' : 'Pausar a troca automática'); }
        rodar();
      }
      c.addEventListener('mouseenter', function () { parado = true; rodar(); });
      c.addEventListener('mouseleave', function () { parado = reduz; rodar(); });
      c.addEventListener('focusin', function () { parado = true; rodar(); });
      c.addEventListener('focusout', function () { parado = reduz; rodar(); });
      c.addEventListener('touchstart', function () { parado = true; rodar(); }, { passive: true });
      document.addEventListener('visibilitychange', rodar);
      ir(0);
      rodar();
    });
  })();

  // o instalador é só para Windows
  var avisoSistema = $('#aviso-sistema');
  if (avisoSistema && !/Windows/i.test(navigator.userAgent)) avisoSistema.hidden = false;
})();
