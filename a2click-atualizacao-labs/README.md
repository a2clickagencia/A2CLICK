# Agência A2 Click: site

Site estático (HTML, CSS e JavaScript, sem bibliotecas) publicado no Cloudflare Pages em https://a2click.com.br.

## Estrutura

```
index.html, labs.html, quem-somos.html, politica-de-privacidade.html, termos-de-uso.html, 404.html, offline.html
partials/        Cabeçalho, rodapé e botão flutuante (copiados para as páginas pelo build)
src/css/         style.css (site) e labs.css (A² LABS): fonte do visual, cores no início, em :root
src/js/          main.js: fonte das interações (simulador, abas, formulário, menus)
assets/js/       main.<hash>.js gerado pelo build (não edite à mão)
assets/fonts/    Bricolage Grotesque e Stretch Pro em WOFF2 (só caracteres latinos)
assets/img/      Fotos em WebP (várias larguras), logos em SVG, ícones
portfolio/       Sites de clientes publicados como vitrine (fora do Google)
tools/build.py   Build (só Python 3, sem instalar nada)
jogos/urbis/     Urbis rodando no navegador (/jogos/urbis/)
sw.js            Modo offline
_headers         Segurança e cache (Cloudflare Pages)
_redirects       Atalhos (/whatsapp-pedro, /whatsapp-igor, /instagram) e endereços antigos
```

## Alterar o site

1. Edite o texto direto nas páginas `.html`, o visual em `src/css/style.css` ou o comportamento em `src/js/main.js`.
   Cabeçalho, rodapé e botão flutuante: edite em `partials/` (vale para todas as páginas).
2. Rode na raiz do projeto:

   ```
   python3 tools/build.py
   ```

   Ele copia os parciais, embute o CSS minificado nas páginas, gera o JS com hash no nome e atualiza o `sw.js`.
3. Para ver no computador: `npx serve .` (URLs limpas, como no Cloudflare) e abra http://localhost:3000.

Números de WhatsApp: Pedro `5519996022246`, Igor `5519988659584`. Aparecem nas páginas, em `partials/` e no objeto `FUNDADORES` de `src/js/main.js`.

Fotos novas: exporte em WebP (qualidade ~82) nas mesmas larguras dos arquivos atuais e mantenha os nomes.
Se trocar uma fonte, mude também o nome do arquivo (as fontes ficam guardadas por 1 ano no navegador).

## A² LABS (/labs)

Página própria, com menu próprio e cores invertidas (fundo verde-campo, tinta clara, giz dourado). Abriga o Cabeçudos FC (jogável dentro da página, carregado só ao clicar) e o Urbis (galeria, download e versão no navegador).

- Fonte da página: `build/labs_page.py` (fora do repositório publicado) e `src/css/labs.css`, `src/js/labs.js`. Edite o texto e rode o gerador e o `python3 tools/build.py`.
- Botão "LABS" no topo do site, ao lado do WhatsApp, e faixa "Entrar no A² LABS" no fim da página inicial.
- `_headers` tem um bloco `/labs` com a CSP que libera o jogo (`frame-src https://cabecudosfcfinal.netlify.app`).

### Publicar o instalador do Urbis (82 MB)

O Cloudflare Pages aceita até 25 MiB por arquivo, então o instalador fica no **GitHub Releases**:
1. No repositório: Releases → Draft a new release → tag `urbis-v1.2.0`.
2. Envie `Urbis Setup 1.2.0.exe` renomeado para **`Urbis-Setup.exe`**. Publique.
3. Em `_redirects`, troque a linha `/baixar/urbis ...` por:
   `/baixar/urbis https://github.com/SEU-USUARIO/SEU-REPOSITORIO/releases/latest/download/Urbis-Setup.exe 302`
4. Enquanto isso não for feito, o botão leva de volta à /labs com um aviso.
O instalador não é assinado: o Windows pode mostrar o SmartScreen ("Mais informações" → "Executar assim mesmo").

### Novo projeto no LABS
Duplique um bloco `<section class="jogo">` em `labs_page.py`, inclua o link no menu da `.barra`, no `JSON-LD` e no `sitemap.xml`. Se for embutir um site de terceiros, acrescente o endereço em `frame-src` no `_headers`.

## Publicar (Cloudflare Pages)

- Framework preset: **None** · Build command: **em branco** · Output directory: **/**
- Os arquivos gerados já estão no repositório; rode o build antes de cada envio.

### Configurações no painel da Cloudflare (domínio a2click.com.br)

1. **SSL/TLS → Overview:** modo **Full (strict)**.
2. **SSL/TLS → Edge Certificates:** Always Use HTTPS **ligado**; Automatic HTTPS Rewrites **ligado**; Minimum TLS **1.2**; TLS 1.3 **ligado**; HSTS só depois de confirmar que tudo abre em HTTPS (o `_headers` já envia HSTS de 1 ano).
3. **www → sem www:** Rules → Redirect Rules → modelo "Redirect from WWW to root" (301), e um registro DNS `www` com proxy laranja. Em Workers & Pages → projeto → Custom domains, adicione `a2click.com.br` e `www.a2click.com.br`.
4. **Speed → Optimization:** Brotli ligado; Early Hints ligado; HTTP/3 ligado (Network). Deixe Rocket Loader **desligado** (quebra a CSP).
5. **Caching → Configuration:** Browser Cache TTL em **Respect Existing Headers**.
6. **Security:** Bot Fight Mode ligado; Security Level Medium. Não ative Web Analytics/Zaraz sem atualizar a Política de Privacidade (o site declara que não usa estatísticas nem cookies).
7. **Email Obfuscation:** desligado (o e-mail é um link `mailto:` comum e o recurso injeta script, bloqueado pela CSP).

## Google Ads: página /obrigado

Todo botão de WhatsApp do site (e o formulário) leva primeiro para `/obrigado?phone=...&text=...`.
Essa página mostra "Obrigado pelo contato!", registra a conversão do Google Ads e, em cerca de 2 segundos,
abre o WhatsApp do Pedro ou do Igor com a mensagem pronta. Se não abrir sozinho, há um botão manual.
Só os números do Pedro e do Igor são aceitos; visita direta à /obrigado mostra os dois botões e não conta conversão.

Para ligar a contagem:
1. No Google Ads: Metas → Conversões → Nova ação de conversão → Site → digite `a2click.com.br` →
   "Adicionar uma ação de conversão manualmente" → categoria **Contato** (ou Lead), valor opcional, contagem **Uma**.
2. Em "Configuração da tag" → "Instalar a tag você mesmo", copie o **ID da conversão** (`AW-123456789`)
   e o **rótulo da conversão** (o texto depois da barra em `send_to: 'AW-123456789/AbCdEf...'`).
3. Em `obrigado.html`, preencha na tag `<body>`: `data-aw-id="AW-123456789"` e `data-aw-label="AbCdEf..."`.
   Envie para o GitHub. Enquanto os dois estiverem vazios, a página só abre o WhatsApp, sem carregar nada do Google.
4. Nos anúncios, use a página inicial como URL final e deixe a **codificação automática (gclid)** ligada.
   O site guarda o gclid do anúncio e o repassa para a /obrigado, para a conversão ser atribuída ao anúncio certo.
5. Teste: clique num botão de WhatsApp do site e confira em Google Ads → Conversões o status da tag (pode levar algumas horas).

Atalhos que também contam conversão: `a2click.com.br/whatsapp-pedro` e `a2click.com.br/whatsapp-igor`.

## Depois de publicar

- Rode https://pagespeed.web.dev/ para `/` e `/quem-somos` (celular).
- Google Search Console: verifique o domínio (registro TXT no DNS da Cloudflare), envie `https://a2click.com.br/sitemap.xml`, peça indexação de `/` e `/quem-somos`.
- Perfil da Empresa no Google: categoria "Web designer" ou "Agência de marketing"; área atendida Americana/SP e região; site `https://a2click.com.br`; telefone principal do Pedro e adicional do Igor; mesmos horários e descrição do site; fotos dos fundadores e de trabalhos.

## Licenças

- **Bricolage Grotesque:** SIL Open Font License, auto-hospedada.
- **Stretch Pro:** a versão usada é gratuita **apenas para uso pessoal**. Compre a licença comercial (com uso em web) antes de manter o site no ar.
- **Old London** (o "A" da logo e as iniciais P e I): distribuída gratuitamente pelo autor; já convertida em desenho dentro dos SVGs.
