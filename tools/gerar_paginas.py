#!/usr/bin/env python3
"""Gera, a partir de tools/dados.py:
  - as Perguntas de balcão da página inicial (entre <!-- @faq --> e <!-- /@faq -->) e o FAQPage do JSON-LD;
  - o conteúdo da página /precos (entre <!-- @precos --> e <!-- /@precos -->);
  - a base do assistente virtual: assets/dados/assistente.json (navegador) e functions/api/_conhecimento.js (IA).

Use na raiz do projeto:  python3 tools/gerar_paginas.py  e depois  python3 tools/build.py
"""
import html
import json
import pathlib
import re
import sys
import unicodedata
import urllib.parse

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / 'tools'))
import dados as D  # noqa: E402


def ler(p):
    return (RAIZ / p).read_text(encoding='utf-8')


def gravar(p, t):
    (RAIZ / p).parent.mkdir(parents=True, exist_ok=True)
    (RAIZ / p).write_text(t, encoding='utf-8')


def trocar(texto, marca, bloco):
    novo, n = re.subn(r'<!-- @%s -->.*?<!-- /@%s -->' % (marca, marca),
                      lambda m: '<!-- @%s -->\n%s\n<!-- /@%s -->' % (marca, bloco, marca), texto, flags=re.S)
    if not n:
        raise SystemExit('Marcador @%s não encontrado' % marca)
    return novo


def sem_tags(t):
    return html.unescape(re.sub(r'<[^>]+>', '', t))


def normal(t):
    t = unicodedata.normalize('NFD', sem_tags(t).lower())
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn')


def zap_url(numero, texto):
    return '/obrigado?phone=%s&amp;text=%s' % (numero, urllib.parse.quote(texto, safe=''))


ICONE_ZAP = '<svg aria-hidden="true"><use href="#i-zap"/></svg>'


def zap(rotulo, texto, classe='btn btn-giz'):
    """Botão que abre a escolha Pedro ou Igor (mesmo padrão do resto do site)."""
    ops = ''.join(
        '<a class="zap-op" href="%s" target="_blank" rel="noopener noreferrer" aria-label="Chamar o %s no WhatsApp" data-zap="%s" data-nome="%s">%s<span>Falar com o %s<small>%s</small></span></a>'
        % (zap_url(num, 'Olá, %s, vim pelo site da A2 Click. %s' % (nome, texto)), nome, num, nome, ICONE_ZAP, nome, fone)
        for nome, num, fone in (('Pedro', D.PEDRO, '(19) 99602-2246'), ('Igor', D.IGOR, '(19) 98865-9584')))
    return '<details class="zap"><summary class="%s">%s<span>%s</span></summary><div class="zap-menu">%s</div></details>' % (classe, ICONE_ZAP, rotulo, ops)


# ------------------------------------------------------------------ perguntas de balcão
def faq():
    assuntos = ''.join('<button type="button" data-cat="%s" aria-pressed="false">%s</button>' % a for a in D.ASSUNTOS)
    itens = '\n'.join(
        '        <details data-cat="%s"><summary>%s</summary><p>%s</p></details>' % (cat, html.escape(q, quote=False), r)
        for cat, q, r in D.PERGUNTAS)
    return '''      <div class="balcao-cab">
        <h2 id="faq-t">Perguntas de balcão.</h2>
        <p class="lede">Digite a sua dúvida ou escolha um assunto. A resposta aparece na hora.</p>
        <div class="balcao-busca" hidden>
          <svg aria-hidden="true"><use href="#i-lupa"/></svg>
          <label class="sr" for="faq-busca">Buscar nas perguntas</label>
          <input id="faq-busca" type="search" placeholder="Ex.: preço, prazo, domínio, OAB" autocomplete="off" enterkeyhint="search">
        </div>
        <div class="balcao-chips" role="group" aria-label="Assuntos" hidden><button type="button" data-cat="" aria-pressed="true">Todas</button>%s</div>
        <p class="balcao-ajuda">Não achou? <button type="button" class="link-assist" data-abrir-assistente hidden>Pergunte ao assistente</button><span class="so-sem-js">Chame o Pedro ou o Igor no WhatsApp.</span></p>
      </div>
      <div class="faq balcao-lista" id="faq-lista">
%s
        <p class="balcao-vazio" hidden>Nada por aqui com essas palavras. <button type="button" class="link-assist" data-abrir-assistente>Pergunte ao assistente</button>, que ele responde na hora.</p>
        <button type="button" class="balcao-mais" hidden>Ver todas as perguntas</button>
      </div>''' % (assuntos, itens)


def faq_jsonld(index):
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', index, re.S)
    grafo = json.loads(m.group(2))
    for no in grafo['@graph']:
        if no['@type'] == 'FAQPage':
            no['mainEntity'] = [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': sem_tags(r)}} for _, q, r in D.PERGUNTAS]
    return index[:m.start(2)] + '\n' + json.dumps(grafo, ensure_ascii=False, indent=1) + '\n  ' + index[m.end(2):]


# ------------------------------------------------------------------ página de preços
def lista(itens):
    return '<ul class="pl-lista">%s</ul>' % ''.join('<li>%s</li>' % i for i in itens)


LOGOS = {  # nome desenhado (assets/img/precos/<id>-<cor>.webp): largura x altura
    'site-start': (900, 68), 'site-essencial': (900, 55), 'site-profissional': (900, 46),
}


def nome_plano(p):
    """Sites usam o nome desenhado; os outros produtos, o texto (em maiúsculas pelo CSS)."""
    if p['id'] not in LOGOS:
        # A Stretch Pro não tem Á nem Ú maiúsculos: o acento é desenhado pelo CSS (.agudo)
        return re.sub(r'([áÁúÚ])', r'<span class="agudo">\1</span>', p['nome'])
    w, h = LOGOS[p['id']]
    base = '/assets/img/precos/' + p['id']
    if p.get('destaque'):
        return '<img class="pl-logo" src="%s-giz.webp" alt="%s" width="%d" height="%d" decoding="async">' % (base, p['nome'], w, h)
    return ('<picture><source srcset="%s-claro.webp" media="(prefers-color-scheme: dark)">'
            '<img class="pl-logo" src="%s-pinho.webp" alt="%s" width="%d" height="%d" decoding="async"></picture>') % (base, base, p['nome'], w, h)


def cartao_plano(p, preco_html, rodape, chamada):
    """Cartão de plano. Com JavaScript, mostra só nome e preço; os detalhes abrem ao passar o mouse,
    no botão "Ver o que inclui" ou em "Comparar valores" (todos abertos)."""
    d = ' pl-destaque' if p.get('destaque') else ''
    selo = '<span class="pl-selo">Mais escolhido</span>' if p.get('destaque') else ''
    return '''<article class="pl%s" id="%s">%s
  <h3>%s</h3>
  %s
  <button type="button" class="pl-ver" aria-expanded="false" aria-controls="%s-mais" hidden>Ver o que inclui</button>
  <div class="pl-mais" id="%s-mais"><div>
  <p class="pl-desc">%s</p>
  %s
  <p class="pl-bom"><b>Bom para:</b> %s</p>
  %s
  <div class="pl-acoes">%s<button type="button" class="pr-comparar pr-comparar-mini" aria-pressed="false" hidden>Comparar valores</button></div>
  </div></div>
</article>''' % (d, p['id'], selo, nome_plano(p), preco_html, p['id'], p['id'], p['desc'], lista(p['itens']), p['bom'], rodape,
                 zap('Quero o ' + p['nome'], chamada, 'btn ' + ('btn-giz' if d else 'btn-tinta') + ' largo'))


def preco_projeto(x):
    de = '<span class="pl-de">a partir de</span>' if x.get('apartir') else ''
    pix = ('R$ %s no Pix · %s' % (x['pix'], x['prazo'])) if x.get('pix') else ('Orçamento fechado · %s' % x['prazo'])
    return '<p class="pl-preco">%s<span class="pl-rs">R$</span> %s</p><p class="pl-pix">%s</p>' % (de, x['preco'], pix)


def precos():
    sites = '\n'.join(cartao_plano(
        s, '<p class="pl-preco"><span class="pl-rs">R$</span> %s</p><p class="pl-pix">R$ %s no Pix · ou em até 12x</p>' % (s['preco'], s['pix']),
        '<p class="pl-obs">%s</p>' % s['obs'] if s['obs'] else '',
        'Quero o %s (R$ %s).' % (s['nome'], s['preco'])) for s in D.SITES)
    cuidado = '\n'.join(cartao_plano(
        c, '<p class="pl-preco"><span class="pl-rs">R$</span> <span data-mensal="%s" data-anual="%s">%s</span><span class="pl-per" data-mensal="por mês" data-anual="por ano">por mês</span></p><p class="pl-pix" data-mensal="ou R$ %s no plano anual" data-anual="equivale a 2 meses grátis">ou R$ %s no plano anual</p>' % (c['preco'], c['anual'], c['preco'], c['anual'], c['anual']),
        '', 'Quero o plano %s (R$ %s por mês).' % (c['nome'], c['preco'])) for c in D.CUIDADO)
    marca = '\n'.join(cartao_plano(m, preco_projeto(m), '', 'Quero a %s (R$ %s).' % (m['nome'], m['preco'])) for m in D.MARCA)
    sistemas = '\n'.join(cartao_plano(x, preco_projeto(x), '', 'Quero conversar sobre o %s (R$ %s).' % (x['nome'], x['preco'])) for x in D.SISTEMAS)
    jogos = '\n'.join(cartao_plano(x, preco_projeto(x), '', 'Quero conversar sobre o %s (R$ %s).' % (x['nome'], x['preco'])) for x in D.JOGOS)
    avulsos = ''.join('<li><span><b>%s</b><small>%s</small></span><em>R$ %s</em></li>' % (a[0], a[2], a[1]) for a in D.AVULSOS)
    combos = '\n'.join('''<article class="combo%s"><h3>%s</h3><p>%s</p><p class="combo-soma">Separado: <s>R$ %s</s></p><p class="combo-preco"><span class="pl-rs">R$</span> %s</p><p class="combo-pix">R$ %s no Pix</p>%s</article>''' % (
        ' combo-destaque' if c.get('destaque') else '', c['nome'], c['inclui'], c['soma'], c['preco'], c['pix'],
        zap('Quero este combo', 'Quero o combo %s (R$ %s).' % (c['nome'], c['preco']), 'btn ' + ('btn-tinta' if c.get('destaque') else 'btn-giz') + ' largo')) for c in D.COMBOS)
    extras = ''.join('<li><span><b>%s</b><small>%s</small></span><em>%s</em></li>' % e for e in D.EXTRAS)
    pag = ''.join('<li><b>%s</b><span>%s</span></li>' % p for p in D.PAGAMENTO)
    return '''  <section class="campo pr-topo" aria-labelledby="h1">
    <div class="wrap">
      <nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> <span aria-hidden="true">›</span> <span aria-current="page">Preços</span></nav>
      <div class="pr-topo-grade">
        <h1 id="h1"><span>Preço claro,</span> <span>sem letra miúda.</span></h1>
        <p class="lede">Sites, cuidado mensal, marca, sistemas, jogos e Perfil no Google. Tudo com o que está incluso e como pagar, para você escolher com calma.</p>
      </div>
      <nav class="pr-atalhos" aria-label="Nesta página"><a href="#sites">Sites</a><a href="#cuidado">Cuidado mensal</a><a href="#marca">Marca</a><a href="#sistemas">Sistemas</a><a href="#jogos">Jogos</a><a href="#combos">Combos</a><a href="#extras">Extras</a><a href="#pagamento">Pagamento</a></nav>
    </div>
  </section>

  <section class="sec pr-sec" id="sites" aria-labelledby="sites-t">
    <div class="wrap">
      <div class="pr-cab"><h2 id="sites-t">Sites.</h2><p class="lede">Feitos à mão, para o seu negócio aparecer no Google e receber o cliente no WhatsApp.</p></div>
      <div class="pr-barra" hidden><span>Passe o mouse ou toque num plano para ver o que inclui.</span><button type="button" class="pr-comparar" aria-pressed="false">Comparar valores</button></div>
      <div class="pl-grade">
%s
      </div>
    </div>
  </section>

  <section class="sec pr-sec pr-alt" id="cuidado" aria-labelledby="cuidado-t">
    <div class="wrap">
      <div class="pr-cab"><h2 id="cuidado-t">Cuidado mensal.</h2><p class="lede">Opcional. Você manda a mensagem e a gente atualiza o site, sem você precisar mexer em nada.</p>
        <div class="pr-periodo" role="group" aria-label="Ver valores" hidden><button type="button" data-periodo="mensal" aria-pressed="true">Mensal</button><button type="button" data-periodo="anual" aria-pressed="false">Anual <small>2 meses grátis</small></button></div>
      </div>
      <div class="pr-barra" hidden><span>Passe o mouse ou toque num plano para ver o que inclui.</span><button type="button" class="pr-comparar" aria-pressed="false">Comparar valores</button></div>
      <div class="pl-grade">
%s
      </div>
      <p class="pr-nota">Fechou o Site Profissional? O primeiro mês do Cuidado Mensal é por nossa conta. As horas do mês não acumulam; o que passar do limite custa R$ 60 por hora, com orçamento antes.</p>
    </div>
  </section>

  <section class="sec pr-sec" id="marca" aria-labelledby="marca-t">
    <div class="wrap">
      <div class="pr-cab"><h2 id="marca-t">Marca e identidade.</h2><p class="lede">Estudo de marca, posicionamento, cores, logo e manual. Para o cliente reconhecer você de longe e confiar de perto.</p></div>
      <div class="pr-barra" hidden><span>Passe o mouse ou toque num plano para ver o que inclui.</span><button type="button" class="pr-comparar" aria-pressed="false">Comparar valores</button></div>
      <div class="pl-grade">
%s
      </div>
      <div class="pr-avulsos">
        <h3>Também separado</h3>
        <p class="nota">Já tem logo? Faça só a parte que falta. No Pix, 10%% de desconto.</p>
        <ul class="pr-linhas">%s</ul>
      </div>
    </div>
  </section>

  <section class="sec pr-sec pr-alt" id="sistemas" aria-labelledby="sistemas-t">
    <div class="wrap">
      <div class="pr-cab"><h2 id="sistemas-t">Sistemas.</h2><p class="lede">Sistemas sob medida para academias, personal trainers, clínicas, agendamentos e o controle do seu negócio. Funcionam no celular, sem instalar nada.</p></div>
      <div class="pr-barra" hidden><span>Passe o mouse ou toque num plano para ver o que inclui.</span><button type="button" class="pr-comparar" aria-pressed="false">Comparar valores</button></div>
      <div class="pl-grade">
%s
      </div>
      <p class="pr-nota">Exemplo real: o ATP, sistema de treinos para personal, no <a href="/labs#atp">A² LABS</a>. Hospedagem e suporte do sistema depois de pronto: a partir de R$ 59 por mês, combinado no orçamento.</p>
    </div>
  </section>

  <section class="sec pr-sec" id="jogos" aria-labelledby="jogos-t">
    <div class="wrap">
      <div class="pr-cab"><h2 id="jogos-t">Jogos.</h2><p class="lede">Jogos 2D e 3D feitos à mão, para divulgar a sua marca, entreter ou vender. Rodam no navegador, no celular e no computador.</p></div>
      <div class="pr-barra" hidden><span>Passe o mouse ou toque num plano para ver o que inclui.</span><button type="button" class="pr-comparar" aria-pressed="false">Comparar valores</button></div>
      <div class="pl-grade">
%s
      </div>
      <p class="pr-nota">Veja o que já construímos no <a href="/labs">A² LABS</a>: Cabeçudos FC, Truco Universitário, Faunópolis e Urbis.</p>
    </div>
  </section>

  <section class="sec pr-sec campo" id="combos" aria-labelledby="combos-t">
    <div class="wrap">
      <div class="pr-cab"><h2 id="combos-t">Marca + site.</h2><p class="lede">Fazendo os dois juntos, tudo combina desde o primeiro dia e sai mais em conta.</p></div>
      <div class="combo-grade">
%s
      </div>
    </div>
  </section>

  <section class="sec pr-sec" id="extras" aria-labelledby="extras-t">
    <div class="wrap pr-duas">
      <div>
        <h2 id="extras-t">Extras.</h2>
        <p class="lede">O que não está no pacote, com o valor dito antes.</p>
        <ul class="pr-linhas">%s</ul>
      </div>
      <div id="pagamento">
        <h2>Pagamento.</h2>
        <p class="lede">Do jeito que for melhor para você.</p>
        <ul class="pr-pag">%s</ul>
      </div>
    </div>
  </section>

  <section class="sec pr-fim campo" aria-labelledby="fim-t">
    <div class="wrap pr-fim-grade">
      <div>
        <h2 id="fim-t">Ficou alguma dúvida?</h2>
        <p class="lede">Pergunte ao assistente aqui no canto ou fale direto com o Pedro ou o Igor. A primeira conversa é sem compromisso.</p>
      </div>
      <div class="pr-fim-acts">
        %s
        <button type="button" class="btn btn-claro" data-abrir-assistente hidden>Perguntar ao assistente</button>
      </div>
    </div>
  </section>''' % (sites, cuidado, marca, avulsos, sistemas, jogos, combos, extras, pag, zap('Conversar no WhatsApp', 'Quero conversar sobre os preços.'))


# ------------------------------------------------------------------ assistente
def assistente():
    base = []
    for cat, q, r in D.PERGUNTAS:
        base.append({'p': q, 'r': r, 'c': normal(q)})
    for chaves, r in D.ASSISTENTE_EXTRA:
        base.append({'k': [normal(k) for k in chaves], 'r': r})
    gravar('assets/dados/assistente.json', json.dumps({'v': 1, 'base': base}, ensure_ascii=False, separators=(',', ':')))

    linhas = ['# Agência A2 Click: o que o assistente pode dizer', '',
              'Agência de Americana/SP. Fundadores: Pedro Augusto (WhatsApp (19) 99602-2246) e Igor Amaral (WhatsApp (19) 98865-9584). Atende Americana e região presencialmente e todo o Brasil online. Lema: Feito à mão, para ser encontrado.', '',
              '## Sites']
    linhas += ['- %s: R$ %s (R$ %s no Pix). %s Inclui: %s. %s' % (s['nome'], s['preco'], s['pix'], s['desc'], '; '.join(s['itens']), s['obs']) for s in D.SITES]
    linhas += ['', '## Cuidado mensal (opcional)']
    linhas += ['- %s: R$ %s por mês ou R$ %s no plano anual. %s Inclui: %s.' % (c['nome'], c['preco'], c['anual'], c['desc'], '; '.join(c['itens'])) for c in D.CUIDADO]
    linhas += ['', '## Marca e identidade visual']
    linhas += ['- %s: R$ %s (R$ %s no Pix), prazo %s. %s Inclui: %s.' % (m['nome'], m['preco'], m['pix'], m['prazo'], m['desc'], '; '.join(m['itens'])) for m in D.MARCA]
    linhas += ['- Avulso: %s, R$ %s. %s' % a for a in D.AVULSOS]
    linhas += ['', '## Sistemas (academias, personal trainers, clínicas, agendamentos)']
    linhas += ['- %s: %sR$ %s%s, prazo %s. %s Inclui: %s.' % (x['nome'], 'a partir de ' if x.get('apartir') else '', x['preco'], (' (R$ %s no Pix)' % x['pix']) if x.get('pix') else ' (orçamento fechado depois da conversa)', x['prazo'], x['desc'], '; '.join(x['itens'])) for x in D.SISTEMAS]
    linhas += ['', '## Jogos']
    linhas += ['- %s: %sR$ %s%s, prazo %s. %s Inclui: %s.' % (x['nome'], 'a partir de ' if x.get('apartir') else '', x['preco'], (' (R$ %s no Pix)' % x['pix']) if x.get('pix') else ' (orçamento fechado depois da conversa)', x['prazo'], x['desc'], '; '.join(x['itens'])) for x in D.JOGOS]
    linhas += ['', '## Combos']
    linhas += ['- %s (%s): R$ %s, R$ %s no Pix (separado sairia R$ %s).' % (c['nome'], c['inclui'], c['preco'], c['pix'], c['soma']) for c in D.COMBOS]
    linhas += ['', '## Extras'] + ['- %s: %s. %s' % e for e in D.EXTRAS]
    linhas += ['', '## Pagamento'] + ['- %s: %s' % p for p in D.PAGAMENTO]
    linhas += ['', '## Perguntas de balcão'] + ['- %s %s' % (q, sem_tags(r)) for _, q, r in D.PERGUNTAS]
    texto = '\n'.join(linhas).replace('`', "'").replace('${', '$ {')
    gravar('functions/api/_conhecimento.js', '// Gerado por tools/gerar_paginas.py a partir de tools/dados.py. Não edite à mão.\nexport const CONHECIMENTO = `%s`;\n' % texto)


if __name__ == '__main__':
    idx = ler('index.html')
    idx = trocar(idx, 'faq', faq())
    idx = faq_jsonld(idx)
    gravar('index.html', idx)
    gravar('precos.html', trocar(ler('precos.html'), 'precos', precos()))
    assistente()
    print('Perguntas: %d · Preços e assistente atualizados.' % len(D.PERGUNTAS))
