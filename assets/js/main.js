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

  /* ---------- Modelos de site por ramo (telinha do celular) ---------- */
  // Ícones de traço, desenhados num quadro de 24 × 24.
  var ICONES = {
    pao: 'M4 14a8 6 0 0 1 16 0v5H4z M8.5 10.5l1 3 M12 9.5l1 3.5 M15.5 10.5l1 3',
    bolo: 'M4 13h16v7H4z M6 13v-3h12v3 M4 16.5c2 1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4 0 M12 6v4 M12 3.5v.5',
    xicara: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 10h1.5a2.5 2.5 0 0 1 0 5H16 M9 3c-1 1 1 2 0 3.5 M12.5 3c-1 1 1 2 0 3.5',
    tesoura: 'M8.6 7.6L20 18 M8.6 16.4L20 6 M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    secador: 'M14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0z M14 7h6v4h-6 M8 14l-1 7h3l1-6 M9 9h.01',
    esmalte: 'M7 11h10v10H7z M10 3h4v8h-4z M9.5 15h5',
    poste: 'M9 3h6v18H9z M8 3h8 M8 21h8 M9 8l6-3.5 M9 13l6-3.5 M9 18l6-3.5',
    navalha: 'M3 21l8-8 M10 11l7-7 3 3-7 7z M14 7l3 3',
    pente: 'M4 7h16v4H4z M6 11v6 M9 11v6 M12 11v6 M15 11v6 M18 11v6',
    chave: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
    pneu: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M12 4v5 M12 15v5 M4 12h5 M15 12h5',
    gota: 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z',
    talher: 'M7 3v7a2 2 0 0 0 4 0V3 M9 10v11 M17 3c-2.2 2-2.2 7 0 9v9',
    prato: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    panela: 'M4 11h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M2 11h20 M10 7h4 M12 7v4',
    sacola: 'M5 8h14l-1 12H6z M9 8V6.5a3 3 0 0 1 6 0V8',
    cabide: 'M10 5.5a2 2 0 1 1 2 2v1.5 M12 9L3 16.5h18z',
    camiseta: 'M8 4L3 7l2 4 3-1v10h8V10l3 1 2-4-5-3c-1 2-2.5 2.5-4 2.5S9 6 8 4z',
    pata: 'M16 16.5c0 2-1.8 3.5-4 3.5s-4-1.5-4-3.5S9.8 12 12 12s4 2.5 4 4.5z M7 10a1.6 1.6 0 1 1-3.2 0A1.6 1.6 0 0 1 7 10z M11 6.5a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z M16.2 6.5a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z M20.2 10a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z',
    osso: 'M8 8L16 16 M8 8a2.2 2.2 0 1 0-3-1 2.2 2.2 0 1 0 1 3 M16 16a2.2 2.2 0 1 0 3 1 2.2 2.2 0 1 0-1-3',
    banho: 'M3 12h18v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z M6 12V6a2 2 0 0 1 4 0 M14 6.5h.01 M17 4.5h.01 M17.5 8h.01',
    coracao: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z M7 12h3l1.5-2.5 2 4.5 1.5-2h2',
    agenda: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 14h3 M8 17h6',
    cruz: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
    tijolo: 'M3 6h18v12H3z M3 10h18 M3 14h18 M9 6v4 M15 6v4 M6 10v4 M12 10v4 M18 10v4 M9 14v4 M15 14v4',
    martelo: 'M14 4l6 6-3 3-6-6z M11.5 9.5L3 18l3 3 8.5-8.5',
    raio: 'M13 2L5 14h6l-1 8 8-12h-6z',
    balanca: 'M12 4v16 M7.5 20h9 M5 7h14 M5 7l-3 6h6z M19 7l-3 6h6z M12 4h.01',
    documento: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7',
    livro: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5V5.5 M8 7h8'
  };

  function icone(nome, classe) {
    var d = ICONES[nome] || '';
    return '<svg class="' + (classe || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  var SERIFA = "Georgia, 'Times New Roman', serif";
  var RAMOS = {
    'Padaria': {
      cor: '#C2702E', fonte: SERIFA, kick: 'Padaria artesanal', frase: 'Pão quentinho saindo o dia todo',
      cta: 'Encomendar pelo WhatsApp', ilu: 'pao',
      tiles: [['pao', 'Pães'], ['bolo', 'Bolos'], ['xicara', 'Café']],
      info: [['Hoje', '6h às 20h'], ['Entrega', 'No bairro']],
      lista: [['Pão francês', 'kg'], ['Bolo de fubá', 'un.'], ['Café da manhã', 'mesa']],
      desc: 'Pão quentinho o dia todo, café da manhã caprichado e encomendas para festas. Veja horários, fotos e chame no WhatsApp.'
    },
    'Salão de beleza': {
      cor: '#8A2D4B', fonte: SERIFA, kick: 'Beleza e cuidado', frase: 'Seu momento de cuidado',
      cta: 'Agendar horário', ilu: 'tesoura', bg: '#FBF5F6', ink: '#3A1622',
      tiles: [['tesoura', 'Corte'], ['secador', 'Escova'], ['esmalte', 'Unhas']],
      info: [['Agenda', 'Seg a sáb'], ['Sábado', 'Até 18h']],
      lista: [['Corte e escova', '1h'], ['Coloração', '2h'], ['Manicure', '40 min']],
      desc: 'Corte, cor, escova e cuidado de verdade. Veja os serviços, os horários livres e agende pelo WhatsApp.'
    },
    'Barbearia': {
      cor: '#1A1A1A', fonte: SERIFA, kick: 'Barbearia', frase: 'Corte, barba e boa conversa',
      cta: 'Agendar horário', ilu: 'poste', bg: '#F4EFE6', ink: '#1A1A1A', caixa: 'uppercase', track: '.06em',
      tiles: [['tesoura', 'Corte'], ['navalha', 'Barba'], ['pente', 'Combo']],
      info: [['Horário', 'Ter a sáb'], ['Espera', 'Hora marcada']],
      lista: [['Corte', '40 min'], ['Barba', '30 min'], ['Corte + barba', '1h']],
      desc: 'Corte, barba e boa conversa, com hora marcada. Veja os serviços e agende pelo WhatsApp.'
    },
    'Oficina mecânica': {
      cor: '#0F2340', kick: 'Mecânica geral', frase: 'Mecânica honesta, preço combinado',
      cta: 'Pedir orçamento', ilu: 'chave', bg: '#F2F4F7', ink: '#0F2340', caixa: 'uppercase', track: '.04em', raio: '6px', ctaCor: '#E0A100',
      tiles: [['chave', 'Revisão'], ['pneu', 'Freios'], ['gota', 'Óleo']],
      info: [['Horário', '8h às 18h'], ['Diagnóstico', 'Na hora']],
      lista: [['Troca de óleo', 'carro'], ['Alinhamento', 'carro'], ['Suspensão', 'orçamento']],
      desc: 'Revisão, freios, suspensão e diagnóstico honesto. Veja o que fazemos, onde estamos e peça seu orçamento.'
    },
    'Restaurante': {
      cor: '#7A2E1C', fonte: SERIFA, kick: 'Comida caseira', frase: 'Comida feita na hora, todo dia',
      cta: 'Pedir pelo WhatsApp', ilu: 'talher', bg: '#FFF8EE', ink: '#3A1D10',
      tiles: [['prato', 'Prato do dia'], ['panela', 'Marmitex'], ['sacola', 'Entrega']],
      info: [['Almoço', '11h às 15h'], ['Entrega', 'Até 3 km']],
      lista: [['Prato do dia', 'seg a sex'], ['Feijoada', 'sábado'], ['Marmitex', 'média']],
      desc: 'Comida feita na hora, prato do dia e marmitex. Veja o cardápio, os horários e peça pelo WhatsApp.'
    },
    'Loja de roupas': {
      cor: '#1A1A1A', kick: 'Moda', frase: 'Peças escolhidas a dedo', caixa: 'uppercase', track: '.12em',
      cta: 'Ver a vitrine', ilu: 'cabide', bg: '#F7F5F2', ink: '#1A1A1A', raio: '2px', btnr: '2px',
      tiles: [['camiseta', 'Novidades'], ['cabide', 'Vestidos'], ['sacola', 'Promoção']],
      info: [['Loja', '9h às 19h'], ['Troca', 'Até 30 dias']],
      lista: [['Coleção nova', 'chegou'], ['Básicos', 'P ao GG'], ['Acessórios', 'na loja']],
      desc: 'Peças escolhidas a dedo, novidades toda semana e atendimento sem pressa. Veja a vitrine e fale com a gente.'
    },
    'Pet shop': {
      cor: '#1E6B52', kick: 'Pet shop', frase: 'Carinho para o seu bichinho',
      cta: 'Agendar banho e tosa', ilu: 'pata', bg: '#F3F8F4', ink: '#123A2C', raio: '22px', tiler: '16px',
      tiles: [['banho', 'Banho'], ['tesoura', 'Tosa'], ['osso', 'Ração']],
      info: [['Banho', 'Com hora'], ['Leva e traz', 'No bairro']],
      lista: [['Banho', 'pequeno porte'], ['Banho e tosa', 'todos'], ['Ração', 'entrega']],
      desc: 'Banho, tosa, ração e carinho para o seu bichinho. Veja os serviços, os horários e agende pelo WhatsApp.'
    },
    'Consultório': {
      cor: '#1D5C8C', kick: 'Saúde', frase: 'Atendimento com cuidado e hora marcada',
      cta: 'Agendar consulta', ilu: 'coracao', bg: '#F4F8FB', ink: '#0F2A40',
      tiles: [['agenda', 'Consultas'], ['coracao', 'Exames'], ['cruz', 'Convênios']],
      info: [['Atendimento', 'Seg a sex'], ['Convênios', 'Ver lista']],
      lista: [['Consulta', '30 min'], ['Retorno', 'em 30 dias'], ['Convênios', 'aceitos']],
      desc: 'Atendimento cuidadoso, com hora marcada. Conheça a equipe, os convênios aceitos e agende sua consulta.'
    },
    'Loja de materiais': {
      cor: '#B5541C', kick: 'Materiais de construção', frase: 'Tudo para a sua obra, com entrega',
      cta: 'Pedir orçamento', ilu: 'tijolo', bg: '#F6F3EE', ink: '#2B2014', caixa: 'uppercase', track: '.03em', raio: '6px', ctaCor: '#2B2014',
      tiles: [['tijolo', 'Básico'], ['raio', 'Elétrica'], ['gota', 'Hidráulica']],
      info: [['Horário', '7h às 18h'], ['Entrega', 'Na obra']],
      lista: [['Cimento', 'saco 50 kg'], ['Areia', 'm³'], ['Tinta', 'galão']],
      desc: 'Material de construção, elétrica e hidráulica com entrega no bairro. Veja os produtos e peça orçamento.'
    },
    'Escritório de advocacia': {
      cor: '#14233C', fonte: SERIFA, kick: 'Advocacia', frase: 'Orientação jurídica clara e próxima',
      cta: 'Agendar uma conversa', ilu: 'balanca', bg: '#F7F5F0', ink: '#14233C', raio: '4px', btnr: '4px', ctaCor: '#9A7B3F', headw: '400',
      tiles: [['documento', 'Família'], ['balanca', 'Trabalhista'], ['livro', 'Cível']],
      info: [['Atendimento', 'Com hora marcada'], ['Consulta', 'Presencial ou online']],
      lista: [['Direito de família', ''], ['Direito do trabalho', ''], ['Contratos', '']],
      desc: 'Orientação jurídica clara em direito de família, trabalhista e cível. Conheça o escritório e agende uma conversa.'
    }
  };

  var ICONE_ZAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-zap"/></svg>';

  function escapar(texto) {
    return String(texto).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function montarTela(alvo, ramo, nome, lugar, cor) {
    var r = RAMOS[ramo] || RAMOS['Padaria'];
    var estilo = [
      '--c:' + (cor || r.cor),
      '--t-bg:' + (r.bg || '#FBF8F1'),
      '--t-ink:' + (r.ink || '#2A1F14'),
      r.fonte ? '--t-head:' + r.fonte : '',
      r.caixa ? '--t-case:' + r.caixa : '',
      r.track ? '--t-track:' + r.track : '',
      r.raio ? '--t-radius:' + r.raio : '',
      r.btnr ? '--t-btnr:' + r.btnr : '',
      r.tiler ? '--t-tiler:' + r.tiler : '',
      r.headw ? '--t-headw:' + r.headw : '',
      r.ctaCor ? '--t-cta:' + r.ctaCor : ''
    ].filter(Boolean).join(';');

    var tiles = r.tiles.map(function (t) {
      return '<div>' + icone(t[0]) + '<span>' + t[1] + '</span></div>';
    }).join('');
    var info = r.info.map(function (i) {
      return '<div><small>' + i[0] + '</small>' + i[1] + '</div>';
    }).join('');
    var lista = r.lista.map(function (l) {
      return '<div><span>' + l[0] + '</span><em>' + l[1] + '</em></div>';
    }).join('');

    alvo.innerHTML =
      '<div class="tpl" style="' + estilo + '">' +
        '<div class="t-top" style="font-family:' + (r.fonte || 'inherit') + '"><span>' + escapar(nome) + '</span><i></i></div>' +
        '<div class="t-hero">' + icone(r.ilu, 't-ilu') +
          '<small class="t-kick">' + r.kick + '</small><b>' + r.frase + '</b><span>' + escapar(lugar) + '</span></div>' +
        '<div class="t-cta">' + ICONE_ZAP + r.cta + '</div>' +
        '<div class="t-tiles">' + tiles + '</div>' +
        '<div class="t-info">' + info + '</div>' +
        '<div class="t-list">' + lista + '</div>' +
      '</div>';
  }

  // Telinha do topo da página
  var telaTopo = $('hero-tela');
  if (telaTopo) {
    montarTela(telaTopo, telaTopo.dataset.ramo, telaTopo.dataset.nome, telaTopo.dataset.lugar);
  }

  /* ---------- Simulador "Veja o seu negócio no Google" ---------- */
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
  var campoRamo = $('s-ramo-in');
  var telaSimulador = $('m-tela');

  function corEscolhida() {
    var marcada = document.querySelector('input[name="cor"]:checked');
    return marcada ? marcada.value : null;
  }

  function atualizarSimulador() {
    var nome = $('s-nome-in').value.trim() || 'Seu Negócio';
    var ramo = campoRamo.value;
    var lugar = $('s-lugar-in').value.trim() || 'seu bairro';
    var dados = RAMOS[ramo] || RAMOS['Padaria'];

    $('s-q').textContent = (ramo + ' ' + lugar).toLowerCase();
    $('s-fav').textContent = iniciais(nome);
    $('s-nome').textContent = nome;
    $('s-url').textContent = (paraEndereco(nome) || 'seunegocio') + '.com.br';
    $('s-tit').textContent = nome + ' | ' + ramo + ' ' + preposicao(lugar) + lugar;
    $('s-desc').textContent = dados.desc;

    if (telaSimulador) montarTela(telaSimulador, ramo, nome, lugar, corEscolhida());

    $('sim-cta').href = linkWhatsApp('Olá! Vim pelo site da A2 Click. Quero um site para o meu negócio: ' + nome + ' (' + ramo + ', ' + lugar + ').');
  }

  // Ao trocar de ramo, a cor volta para a sugestão daquele ramo
  function corDoRamo() {
    var dados = RAMOS[campoRamo.value];
    var radios = todos('input[name="cor"]');
    radios.forEach(function (r) {
      r.checked = false;
    });
    var igual = radios.filter(function (r) {
      return dados && r.value.toLowerCase() === dados.cor.toLowerCase();
    })[0];
    if (igual) igual.checked = true;
  }

  if (formSimulador && campoRamo) {
    // Exemplo inicial com nomes que combinam com cada ramo
    var EXEMPLOS = {
      'Padaria': 'Padaria Dona Rosa', 'Salão de beleza': 'Studio Bela Flor', 'Barbearia': 'Barbearia do Tonho',
      'Oficina mecânica': 'Auto Center Boa Roda', 'Restaurante': 'Cantinho da Vó', 'Loja de roupas': 'Ateliê Lume',
      'Pet shop': 'Patinhas Pet Shop', 'Consultório': 'Clínica Bem Viver', 'Loja de materiais': 'Casa do Construtor',
      'Escritório de advocacia': 'Moraes & Lima Advocacia'
    };
    var nomeEditado = false;
    $('s-nome-in').addEventListener('input', function () {
      nomeEditado = true;
    });
    campoRamo.addEventListener('change', function () {
      corDoRamo();
      if (!nomeEditado) $('s-nome-in').value = EXEMPLOS[campoRamo.value] || '';
      atualizarSimulador();
    });
    formSimulador.addEventListener('input', atualizarSimulador);
    formSimulador.addEventListener('change', atualizarSimulador);
    formSimulador.addEventListener('submit', function (e) {
      e.preventDefault();
    });
    atualizarSimulador();
  }

  /* ---------- Antes e depois: site antigo x site novo da União Paulista ---------- */
  var comparador = $('cmp');
  var alca = $('ad-range');
  if (comparador && alca) {
    var cortar = function () {
      comparador.style.setProperty('--corte', alca.value + '%');
    };
    alca.addEventListener('input', cortar);
    cortar();

    // Os sites aparecem em tamanho real, reduzidos para caber na moldura
    var quadros = todos('iframe', comparador);
    var ajustar = function () {
      var largura = comparador.clientWidth;
      var altura = comparador.clientHeight;
      var base = window.innerWidth < 640 ? 400 : 1280;
      var escala = largura / base;
      quadros.forEach(function (q) {
        q.style.width = base + 'px';
        q.style.height = Math.ceil(altura / escala) + 'px';
        q.style.transform = 'scale(' + escala + ')';
      });
    };
    ajustar();
    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(comparador);
    else window.addEventListener('resize', ajustar);
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
