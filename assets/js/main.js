/* ==========================================================
   Agência A2 Click — interações do site
   Sem bibliotecas. Cada bloco abaixo cuida de uma seção.
   ========================================================== */
(function () {
  'use strict';

  var WHATSAPP = '5519996022246';

  function $(id) {
    return document.getElementById(id);
  }

  function todos(seletor, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor));
  }

  function linkWhatsApp(texto) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
  }

  var semMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var semMouse = function () {
    return window.matchMedia && matchMedia('(hover: none)').matches;
  };

  /* ---------- Menu do celular ---------- */
  var botaoMenu = $('menu-btn');
  var gaveta = $('gaveta');
  if (botaoMenu && gaveta) {
    botaoMenu.addEventListener('click', function () {
      var abrir = gaveta.hidden;
      gaveta.hidden = !abrir;
      botaoMenu.setAttribute('aria-expanded', String(abrir));
      botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    gaveta.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        gaveta.hidden = true;
        botaoMenu.setAttribute('aria-expanded', 'false');
        botaoMenu.setAttribute('aria-label', 'Abrir menu');
      }
    });
  }

  /* ---------- Barra de busca que "digita" sozinha ---------- */
  var campoDigita = $('digita');
  var frases = [
    'padaria aberta agora perto de mim',
    'salão que atende sábado à tarde',
    'oficina de confiança no centro',
    'pet shop com banho e tosa',
    'dentista que aceita convênio',
    'restaurante com marmitex'
  ];
  if (campoDigita && !semMovimento) {
    var frase = 0;
    var letra = frases[0].length;
    var apagando = true;
    (function passo() {
      if (apagando) {
        letra--;
        if (letra <= 0) {
          apagando = false;
          frase = (frase + 1) % frases.length;
        }
      } else {
        letra++;
        if (letra >= frases[frase].length) {
          apagando = true;
          campoDigita.textContent = frases[frase];
          return setTimeout(passo, 1900);
        }
      }
      campoDigita.textContent = frases[frase].slice(0, Math.max(letra, 0));
      setTimeout(passo, apagando ? 28 : 55);
    })();
  }

  /* ---------- Abas de serviços ---------- */
  var abas = todos('[role="tab"]');
  function abrirAba(aba) {
    abas.forEach(function (outra) {
      var ativa = outra === aba;
      outra.setAttribute('aria-selected', String(ativa));
      outra.tabIndex = ativa ? 0 : -1;
      $(outra.getAttribute('aria-controls')).hidden = !ativa;
    });
  }
  abas.forEach(function (aba, i) {
    aba.addEventListener('click', function () {
      abrirAba(aba);
    });
    aba.addEventListener('keydown', function (e) {
      var passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!passo) return;
      var proxima = abas[(i + passo + abas.length) % abas.length];
      abrirAba(proxima);
      proxima.focus();
    });
  });

  /* ---------- Simulador "Veja o seu negócio no Google" ---------- */
  var textosPorRamo = {
    'Padaria': ['Pão quentinho o dia todo, café da manhã caprichado e encomendas para festas. Veja horários, fotos e chame no WhatsApp.', 'Pão quentinho o dia todo'],
    'Salão de beleza': ['Corte, cor, escova e cuidado de verdade. Veja os serviços, os horários livres e agende pelo WhatsApp.', 'Seu momento de cuidado'],
    'Barbearia': ['Corte, barba e boa conversa, com hora marcada. Veja os serviços e agende pelo WhatsApp.', 'Corte, barba e boa conversa'],
    'Oficina mecânica': ['Revisão, freios, suspensão e diagnóstico honesto. Veja o que fazemos, onde estamos e peça seu orçamento.', 'Mecânica honesta'],
    'Restaurante': ['Comida feita na hora, prato do dia e marmitex. Veja o cardápio, os horários e peça pelo WhatsApp.', 'Comida feita na hora'],
    'Loja de roupas': ['Peças escolhidas a dedo, novidades toda semana e atendimento sem pressa. Veja a vitrine e fale com a gente.', 'Novidades toda semana'],
    'Pet shop': ['Banho, tosa, ração e carinho para o seu bichinho. Veja os serviços, os horários e agende pelo WhatsApp.', 'Carinho para o seu bichinho'],
    'Consultório': ['Atendimento cuidadoso, com hora marcada. Conheça a equipe, os convênios aceitos e agende sua consulta.', 'Atendimento com cuidado'],
    'Loja de materiais': ['Material de construção, elétrica e hidráulica com entrega no bairro. Veja os produtos e peça orçamento.', 'Tudo para a sua obra']
  };

  function paraEndereco(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function iniciais(texto) {
    var palavras = texto.trim().split(/\s+/).filter(function (p) {
      return p.length > 2;
    });
    if (!palavras.length) return 'SN';
    var primeira = palavras[0][0] || '';
    var ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  function preposicao(lugar) {
    if (/^(vila)/i.test(lugar)) return 'na ';
    if (/^(centro|bairro|jardim|parque)/i.test(lugar)) return 'no ';
    return 'em ';
  }

  var formSimulador = $('sim-form');
  function atualizarSimulador() {
    var nome = $('s-nome-in').value.trim() || 'Seu Negócio';
    var ramo = $('s-ramo-in').value;
    var lugar = $('s-lugar-in').value.trim() || 'seu bairro';
    var corEscolhida = document.querySelector('input[name="cor"]:checked');
    var cor = corEscolhida ? corEscolhida.value : '#C2702E';
    var textos = textosPorRamo[ramo] || ['', ''];

    $('s-q').textContent = (ramo + ' ' + lugar).toLowerCase();
    $('s-fav').textContent = iniciais(nome);
    $('s-nome').textContent = nome;
    $('s-url').textContent = (paraEndereco(nome) || 'seunegocio') + '.com.br';
    $('s-tit').textContent = nome + ' | ' + ramo + ' ' + preposicao(lugar) + lugar;
    $('s-desc').textContent = textos[0];

    $('m-nome').textContent = nome;
    $('m-frase').textContent = textos[1];
    $('m-lugar').textContent = lugar;
    $('m-capa').style.background = cor;

    $('sim-cta').href = linkWhatsApp('Olá! Vim pelo site da A2 Click. Quero um site para o meu negócio: ' + nome + ' (' + ramo + ', ' + lugar + ').');
  }
  if (formSimulador) {
    formSimulador.addEventListener('input', atualizarSimulador);
    formSimulador.addEventListener('change', atualizarSimulador);
    formSimulador.addEventListener('submit', function (e) {
      e.preventDefault();
    });
    atualizarSimulador();
  }

  /* ---------- Antes e depois ---------- */
  var comparador = $('ad');
  var alca = $('ad-range');
  if (comparador && alca) {
    var cortar = function () {
      comparador.style.setProperty('--corte', alca.value + '%');
    };
    alca.addEventListener('input', cortar);
    cortar();
  }

  /* ---------- Checklist "Seu negócio está pronto?" ---------- */
  var itens = todos('#perguntas input');
  var falas = [
    'Você está começando do zero, e tudo bem. É aí que a gente mais ajuda.',
    'Já tem um começo. Com um site e o perfil arrumado, o cliente passa a achar você.',
    'Já tem um começo. Com um site e o perfil arrumado, o cliente passa a achar você.',
    'Metade do caminho andado. Faltam alguns ajustes para o seu negócio passar mais confiança.',
    'Está quase lá. Dá para deixar tudo redondo com pouco trabalho.',
    'Está quase lá. Dá para deixar tudo redondo com pouco trabalho.',
    'Que capricho! Seu negócio está bem cuidado. Se quiser, a gente ajuda a manter assim.'
  ];
  function atualizarPlacar() {
    var marcados = itens.filter(function (c) {
      return c.checked;
    }).length;
    var faltando = itens.filter(function (c) {
      return !c.checked;
    }).map(function (c) {
      return '- ' + c.parentNode.textContent.trim();
    });

    $('placar-n').innerHTML = marcados + '<small>/6</small>';
    $('medidor').style.width = (marcados / 6) * 100 + '%';
    $('placar-t').textContent = falas[marcados];

    var mensagem = 'Olá! Fiz o teste no site da A2 Click e marquei ' + marcados + ' de 6.';
    if (faltando.length) mensagem += '\nAinda não tenho:\n' + faltando.join('\n');
    $('placar-cta').href = linkWhatsApp(mensagem);
  }
  if (itens.length) {
    itens.forEach(function (c) {
      c.addEventListener('change', atualizarPlacar);
    });
    atualizarPlacar();
  }

  /* ---------- Quadrados dos sócios que giram para mostrar a foto ---------- */
  var quadrados = todos('.monog');
  quadrados.forEach(function (quadrado) {
    function virar() {
      quadrado.classList.toggle('virado');
    }
    // No computador o giro vem do mouse (CSS). No celular, um toque vira e outro desvira.
    quadrado.addEventListener('click', function () {
      if (semMouse()) virar();
    });
    quadrado.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        virar();
      }
    });
  });

  /* Passar pela faixa "A + A = A²" vira as duas fotos juntas */
  var faixaNome = document.querySelector('.nome-orig');
  var blocoSocios = document.querySelector('.socios');
  if (faixaNome && blocoSocios) {
    var ecoar = function (ligar) {
      blocoSocios.classList.toggle('eco-on', ligar);
      quadrados.forEach(function (q) {
        q.classList.toggle('eco', ligar);
      });
    };
    faixaNome.addEventListener('mouseenter', function () {
      ecoar(true);
    });
    faixaNome.addEventListener('mouseleave', function () {
      ecoar(false);
    });
    faixaNome.addEventListener('click', function () {
      if (semMouse()) ecoar(!blocoSocios.classList.contains('eco-on'));
    });
  }

  /* ---------- Formulário de contato que monta a mensagem do WhatsApp ---------- */
  var formContato = $('contato-form');
  function montarMensagem() {
    var nome = $('f-nome').value.trim();
    var negocio = $('f-neg').value.trim();
    var extra = $('f-msg').value.trim();
    var precisa = todos('input[name="precisa"]:checked').map(function (c) {
      return c.value;
    });

    var texto = 'Olá! Vim pelo site da A2 Click.';
    if (nome) texto += '\nMeu nome é ' + nome + (negocio ? ', do(a) ' + negocio : '') + '.';
    else if (negocio) texto += '\nSou do(a) ' + negocio + '.';
    if (precisa.length) texto += '\nPreciso de: ' + precisa.join(', ') + '.';
    if (extra) texto += '\n' + extra;

    $('previa').textContent = texto;
    $('enviar').href = linkWhatsApp(texto);
  }
  if (formContato) {
    formContato.addEventListener('input', montarMensagem);
    formContato.addEventListener('change', montarMensagem);
    formContato.addEventListener('submit', function (e) {
      e.preventDefault();
    });
    montarMensagem();
  }

  /* ---------- Copiar o número ---------- */
  var botaoCopiar = $('copiar');
  if (botaoCopiar) {
    botaoCopiar.addEventListener('click', function () {
      var aviso = $('copiado');
      function copiado() {
        aviso.textContent = 'Número copiado.';
      }
      function selecionar() {
        var faixa = document.createRange();
        faixa.selectNodeContents($('numero'));
        var selecao = window.getSelection();
        selecao.removeAllRanges();
        selecao.addRange(faixa);
        aviso.textContent = 'Número selecionado. É só copiar.';
      }
      try {
        navigator.clipboard.writeText('(19) 99602-2246').then(copiado, selecionar);
      } catch (e) {
        selecionar();
      }
    });
  }
})();
