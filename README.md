# Agência A2 Click — site

Site institucional da Agência A2 Click, de Pedro Augusto e Igor Amaral.
É um site estático: só HTML, CSS e JavaScript, sem instalação e sem etapa de build.

## Estrutura

```
a2click-site/
├── index.html                 Página principal (todo o conteúdo e textos)
├── 404.html                   Página de "não encontrada"
├── portfolio/                 Sites de clientes, publicados como vitrine (sem indexação no Google)
│   ├── uniao-paulista/        Usado no "antes e depois" (comparado ao site antigo, ao vivo)
│   ├── mecanica-suica/
│   ├── aline-oliveira-podologia/
│   └── amaral-training/
├── robots.txt                 Orientações para o Google
├── sitemap.xml                Mapa do site para o Google Search Console
├── _headers                   Cabeçalhos de segurança e cache (Cloudflare Pages)
├── .gitignore
└── assets/
    ├── css/style.css          Visual do site. Cores e fontes no início, em :root
    ├── js/main.js             Interações (menu, simulador, abas, fotos que giram, formulário)
    ├── fonts/stretch-pro.woff Fonte dos títulos
    └── img/
        ├── equipe/            Fotos do Pedro e do Igor
        ├── logo/              Todas as versões da logo em SVG
        ├── favicon.svg        Ícone da aba do navegador
        ├── favicon-32.png
        ├── apple-touch-icon.png
        ├── icon-512.png
        └── og-a2click.png     Imagem que aparece ao compartilhar o link no WhatsApp
```

## Ver o site no computador

Basta abrir o `index.html` no navegador.
Para testar exatamente como ficará no ar (com a página 404 e os caminhos certos), rode dentro da pasta:

```
python3 -m http.server 8000
```

e acesse http://localhost:8000.

## Subir para o GitHub

1. Crie um repositório novo no GitHub (por exemplo, `a2click-site`).
2. Na pasta do projeto, rode:

```
git init
git add .
git commit -m "Site da Agência A2 Click"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/a2click-site.git
git push -u origin main
```

Se preferir sem terminal: no GitHub, abra o repositório vazio, clique em "uploading an existing file" e arraste todo o conteúdo desta pasta (não a pasta em si).

## Publicar no Cloudflare Pages

1. No painel da Cloudflare, vá em **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
2. Configuração do build:
   - Framework preset: **None**
   - Build command: deixe **em branco**
   - Build output directory: **/** (a raiz)
3. Clique em **Save and Deploy**. Em instantes o site fica no ar num endereço `*.pages.dev`.
4. Para usar o domínio próprio (ex.: `a2click.com.br`): no projeto, vá em **Custom domains → Set up a custom domain** e siga os passos.

A cada `git push`, a Cloudflare publica a nova versão sozinha.

## Depois de ter o domínio

(Já feito para a2click.com.br.) Os endereços completos ficam em `index.html`, para o WhatsApp e as redes mostrarem a imagem certinho:

```html
<meta property="og:image" content="https://a2click.com.br/assets/img/og-a2click.png">
```

Também vale adicionar, dentro do `<head>`:

```html
<link rel="canonical" href="https://a2click.com.br/">
<meta property="og:url" content="https://a2click.com.br/">
```

E, quando o endereço físico sair no Google, atualizar os trechos "Endereço em breve no Google" no `index.html`.

## Ao alterar o CSS ou o JavaScript

No `index.html`, os arquivos de estilo e de script têm uma "versão" no fim do endereço (`style.css?v=20261017-2`). Sempre que mudar o `style.css` ou o `main.js`, troque esse número (por exemplo, para a data do dia). Assim o navegador de quem já visitou o site baixa a versão nova, em vez de usar a antiga guardada.

## Onde mexer no dia a dia

- **Textos:** tudo está no `index.html`, em português, na ordem em que aparece na tela.
- **Número do WhatsApp:** aparece no `index.html` (links `wa.me/5519996022246`) e na constante `WHATSAPP`, no início do `assets/js/main.js`.
- **Cores:** variáveis no início do `assets/css/style.css` (`--pinho`, `--campo`, `--giz`...).
- **Portfólio:** para incluir um site novo, crie uma pasta em `portfolio/` com o `index.html` do cliente, coloque uma imagem 960 × 600 em `assets/img/portfolio/` e copie um dos cartões `port-card` no `index.html`.
- **Modelos do simulador:** cada ramo (cores, textos, ícones da telinha) fica no objeto `RAMOS`, no `assets/js/main.js`. Para criar um ramo novo, copie um bloco e adicione a opção no `<select id="s-ramo-in">`.
- **Fotos da equipe:** substitua os arquivos em `assets/img/equipe/` mantendo os mesmos nomes (quadradas, de preferência 480 × 480 px).

## Licenças das fontes

- **Stretch Pro** (títulos): a versão usada é gratuita **apenas para uso pessoal**. Antes de colocar o site no ar com fins comerciais, compre a licença comercial da fonte.
- **Old London** (o "A" da logo e as iniciais P e I): distribuída gratuitamente pelo autor; as letras já estão convertidas em desenho dentro dos SVGs.
- **Bricolage Grotesque** (textos): Google Fonts, licença livre (OFL), carregada direto do Google.
