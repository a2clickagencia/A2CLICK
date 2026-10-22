#!/usr/bin/env python3
"""Prepara o site para publicação. Usa só a biblioteca padrão do Python 3.

O que faz, nesta ordem:
  1. Copia cabeçalho, rodapé e botão flutuante de partials/ para todas as páginas
     (entre os marcadores <!-- @inc nome --> e <!-- /@inc nome -->).
  2. Minifica src/css/style.css e coloca o resultado dentro de cada página
     (entre <!-- @css --> e <!-- /@css -->), para a página abrir sem esperar outro arquivo.
  3. Minifica src/js/main.js e grava em assets/js/main.<hash>.js (nome muda quando o
     conteúdo muda, então o navegador nunca usa versão velha). Atualiza o <script> das páginas.
  4. Atualiza a versão e a lista de arquivos guardados pelo sw.js (modo offline).

Como usar, na raiz do projeto:  python3 tools/build.py
"""
import hashlib
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PAGINAS = sorted(p for p in RAIZ.glob('*.html'))


def ler(p):
    return p.read_text(encoding='utf-8')


def gravar(p, texto):
    p.write_text(texto, encoding='utf-8')


# ------------------------------------------------------------------ minificação
def minificar_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};,>])\s*', r'\1', css)
    css = re.sub(r':\s+', ':', css)          # "color: red" -> "color:red"
    css = css.replace(';}', '}')
    # ":" depois de seletor (ex.: "a :hover") não existe no projeto; espaços dentro de calc() ficam preservados
    css = re.sub(r'\(\s+', '(', css)
    css = re.sub(r'\s+\)', ')', css)
    return css.strip()


def minificar_js(js):
    """Minificação conservadora: tira comentários e indentação, sem renomear nada."""
    saida, i, n = [], 0, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':                      # texto entre aspas: copia como está
            j = i + 1
            while j < n and js[j] != c:
                j += 2 if js[j] == '\\' else 1
            saida.append(js[i:j + 1])
            i = j + 1
        elif js.startswith('/*', i):
            i = js.index('*/', i) + 2
        elif js.startswith('//', i) and (i == 0 or js[i - 1] in ' \t\n;{}(,'):
            i = js.index('\n', i) if '\n' in js[i:] else n
        elif c == '/' and (''.join(saida[-30:]).rstrip()[-1:] or ';') in '=(,:!&|?{};':
            # expressão regular: copia até a barra final
            j = i + 1
            em_classe = False
            while j < n and (js[j] != '/' or em_classe):
                if js[j] == '\\':
                    j += 1
                elif js[j] == '[':
                    em_classe = True
                elif js[j] == ']':
                    em_classe = False
                j += 1
            saida.append(js[i:j + 1])
            i = j + 1
        else:
            saida.append(c)
            i += 1
    js = ''.join(saida)
    linhas = [l.strip() for l in js.split('\n')]
    return '\n'.join(l for l in linhas if l) + '\n'


def hash8(texto):
    return hashlib.sha256(texto.encode('utf-8')).hexdigest()[:8]


# ------------------------------------------------------------------ etapas
def incluir_parciais():
    for pagina in PAGINAS:
        html = ler(pagina)
        for parcial in (RAIZ / 'partials').glob('*.html'):
            nome = parcial.stem
            bloco = ler(parcial).rstrip('\n')
            html = re.sub(r'<!-- @inc %s -->.*?<!-- /@inc %s -->' % (nome, nome),
                          lambda m: '<!-- @inc %s -->\n%s\n<!-- /@inc %s -->' % (nome, bloco, nome),
                          html, flags=re.S)
        gravar(pagina, html)


def css_embutido():
    css = minificar_css(ler(RAIZ / 'src/css/style.css'))
    for pagina in PAGINAS:
        html = re.sub(r'<!-- @css -->.*?<!-- /@css -->',
                      lambda m: '<!-- @css --><style>%s</style><!-- /@css -->' % css,
                      ler(pagina), flags=re.S)
        gravar(pagina, html)
    return len(css.encode('utf-8'))


def js_com_hash():
    js = minificar_js(ler(RAIZ / 'src/js/main.js'))
    nome = 'main.%s.js' % hash8(js)
    pasta = RAIZ / 'assets/js'
    pasta.mkdir(parents=True, exist_ok=True)
    for velho in pasta.glob('main*.js'):
        velho.unlink()
    gravar(pasta / nome, js)
    for pagina in PAGINAS:
        html = re.sub(r'/assets/js/main(\.[0-9a-f]{8})?\.js', '/assets/js/' + nome, ler(pagina))
        gravar(pagina, html)
    return nome, len(js.encode('utf-8'))


def atualizar_sw(nome_js):
    sw = RAIZ / 'sw.js'
    texto = ler(sw)
    guardar = ['/', '/quem-somos', '/offline', '/assets/js/' + nome_js,
               '/assets/fonts/stretch-pro-latin.woff2', '/assets/fonts/bricolage-grotesque-latin.woff2',
               '/assets/img/logo/a2click-horizontal-negativo.svg', '/assets/img/favicon.svg']
    impressao = hashlib.sha256(''.join(ler(p) for p in PAGINAS).encode('utf-8') + nome_js.encode()).hexdigest()[:10]
    lista = ',\n  '.join("'%s'" % g for g in guardar)
    texto = re.sub(r"const VERSAO = '[^']*';", "const VERSAO = 'a2-%s';" % impressao, texto)
    texto = re.sub(r'const GUARDAR = \[.*?\];', 'const GUARDAR = [\n  %s\n];' % lista, texto, flags=re.S)
    gravar(sw, texto)
    return impressao


if __name__ == '__main__':
    incluir_parciais()
    tam_css = css_embutido()
    nome_js, tam_js = js_com_hash()
    versao = atualizar_sw(nome_js)
    print('Páginas: %s' % ', '.join(p.name for p in PAGINAS))
    print('CSS embutido: %.1f KB' % (tam_css / 1024))
    print('JS: assets/js/%s (%.1f KB)' % (nome_js, tam_js / 1024))
    print('Service worker: versão a2-%s' % versao)
