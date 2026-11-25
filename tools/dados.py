"""Dados únicos do site: preços, perguntas de balcão e conhecimento do assistente.

Mude um valor aqui e rode  python3 tools/gerar_paginas.py  e depois  python3 tools/build.py.
Os mesmos valores estão na Tabela de Preços (pasta 00. DOCUMENTOS A² CLICK - ATUALIZADOS).
"""

PEDRO = '5519996022246'
IGOR = '5519988659584'

SITES = [
    dict(id='site-start', nome='Site Start', preco='390', pix='350', desc='Uma página direta com quem você é, o que faz e onde fica.',
         itens=['Página com apresentação, serviços e endereço', 'Botão direto para o WhatsApp', 'Feita para abrir bem no celular', '1 rodada de revisão'],
         obs='Domínio .com.br não incluso (cerca de R$ 40 por ano).', bom='quem quer começar já, gastando pouco.'),
    dict(id='site-essencial', nome='Site Essencial', preco='490', pix='440', desc='Página única com tudo o que o cliente precisa ver.',
         itens=['Seu perfil, serviços, fotos e mapa', 'Botão direto para o WhatsApp', '1 ano de domínio .com.br incluso', '3 rodadas de revisão'],
         obs='', bom='padarias, salões, oficinas e prestadores de serviço.'),
    dict(id='site-profissional', nome='Site Profissional', preco='790', pix='710', destaque=True, desc='Site completo, com até 5 páginas.',
         itens=['Uma página para cada serviço, equipe e galeria', 'Formulário e botão de WhatsApp', 'Pronto para aparecer no Google', '1 ano de domínio .com.br incluso', '10 rodadas de revisão'],
         obs='', bom='clínicas, escritórios, lojas e quem tem vários serviços.'),
]

CUIDADO = [
    dict(id='site-no-ar', nome='Site no Ar', preco='29', anual='290', desc='O básico bem feito: o site sempre no ar, seguro e com o endereço renovado.',
         itens=['Hospedagem, cadeado de segurança e cópia do site', 'Renovação anual do .com.br inclusa', 'Se o site cair, a gente resolve', '1 ajuste rápido por mês (até 15 min)', 'Resposta em até 3 dias úteis'],
         bom='quem quase não muda nada no site.'),
    dict(id='cuidado-mensal', nome='Cuidado Mensal', preco='59', anual='590', destaque=True, desc='Você manda a mensagem e a gente atualiza. O site sempre certinho.',
         itens=['Tudo do Site no Ar', 'Até 1 hora de alterações por mês: textos, fotos, horários e preços', 'Revisão mensal do Perfil no Google', 'Feriados e horários especiais no site e no Google', 'Resposta em até 2 dias úteis'],
         bom='comércios que mudam cardápio, preço ou horário.'),
    dict(id='presenca-acompanhada', nome='Presença Acompanhada', preco='119', anual='1.190', desc='A gente cuida de perto do site e do seu Perfil no Google, todo mês.',
         itens=['Tudo do Cuidado Mensal', 'Até 3 horas de alterações por mês', 'Perfil no Google cuidado por nós: 4 publicações por mês e ajuda com as avaliações', '1 seção ou página nova por trimestre', 'Resumo mensal de visitas e contatos, com conversa de 30 min', 'Resposta em até 1 dia útil'],
         bom='quem quer crescer no Google sem pensar nisso.'),
]

MARCA = [
    dict(id='marca-start', nome='Marca Start', preco='290', pix='260', prazo='até 7 dias úteis', desc='Para quem está começando e precisa de uma cara bonita e séria.',
         itens=['Conversa para entender o seu negócio', '2 caminhos de logo e 2 rodadas de ajuste', 'Versões: principal, uma cor só e selo para foto de perfil', 'Cores e fontes indicadas', 'Arquivos para internet e gráfica (PNG, SVG e PDF)'],
         bom='negócio novo ou que nunca teve logo.'),
    dict(id='identidade-visual', nome='Identidade Visual', preco='590', pix='530', prazo='até 15 dias úteis', destaque=True, desc='Marca pensada do zero, com estudo e manual para usar certo.',
         itens=['Tudo da Marca Start', 'Estudo de marca: público, concorrentes da região e referências', 'Estudo de cor e de tipografia, com o porquê de cada escolha', '3 caminhos de logo e 3 rodadas de ajuste', 'Manual da marca de 10 a 12 páginas', 'Cartão de visita e capas do Instagram'],
         bom='quem quer se apresentar com seriedade.'),
    dict(id='marca-completa', nome='Marca Completa', preco='990', pix='890', prazo='20 a 25 dias úteis', desc='Estudo, posicionamento e reposicionamento da marca, do começo ao fim.',
         itens=['Tudo da Identidade Visual', 'Diagnóstico e reposicionamento da marca atual', 'Posicionamento e jeito de falar, com frases prontas', 'Manual completo, com mais de 20 páginas', 'Modelos para redes, papelaria e até 3 simulações (fachada, uniforme, embalagem)', '4 rodadas de ajuste'],
         bom='quem vai crescer, mudar ou se reposicionar.'),
]

SISTEMAS = [
    dict(id='sistema-basico', nome='Sistema Básico', preco='400', pix='360', prazo='até 10 dias úteis', desc='Um sistema simples para organizar o dia a dia do seu negócio.',
         itens=['Cadastro de clientes ou alunos', 'Login com senha', 'Até 4 telas, feitas para o celular', 'Funciona no navegador, sem instalar nada', '2 rodadas de ajuste'],
         bom='academias, personal trainers, agendamentos e controles simples.'),
    dict(id='sistema-profissional', nome='Sistema Profissional', preco='890', pix='800', prazo='até 20 dias úteis', destaque=True, desc='Mais telas, área do cliente e relatórios.',
         itens=['Tudo do Sistema Básico', 'Até 8 telas', 'Área do cliente ou do aluno', 'Relatórios simples e exportação para planilha', 'Níveis de acesso (dono, equipe, cliente)', 'Instalável no celular como app', '3 rodadas de ajuste'],
         bom='estúdios, clínicas, escolas e quem atende muita gente.'),
    dict(id='sistema-sob-medida', nome='Sistema Sob Medida', preco='1.590', apartir=True, prazo='prazo combinado', desc='Para projetos maiores, com escopo próprio.',
         itens=['Tudo do Sistema Profissional', 'Telas e regras do seu negócio', 'Pagamentos, integrações e avisos automáticos', 'Painel com os números do negócio', 'Orçamento fechado depois da conversa'],
         bom='quem precisa de algo que não existe pronto.'),
]

JOGOS = [
    dict(id='jogo-basico', nome='Jogo Básico 2D', preco='350', pix='310', prazo='até 10 dias úteis', apartir=True, desc='Um jogo 2D simples e divertido, para divulgar a marca ou entreter.',
         itens=['1 fase ou modo de jogo', 'Controles no celular e no computador', 'Roda no navegador, sem instalar', 'Placar e tela de fim de jogo', '2 rodadas de ajuste'],
         bom='ações de marca, eventos, escolas e presentes.'),
    dict(id='jogo-completo', nome='Jogo 2D Completo', preco='790', pix='710', prazo='até 25 dias úteis', destaque=True, desc='Um jogo 2D de verdade, com fases, menus e sons.',
         itens=['Tudo do Jogo Básico 2D', 'Várias fases ou modos', 'Menu, sons e música', 'Ranking e conquistas', 'Instalável no celular e no computador', '3 rodadas de ajuste'],
         bom='quem quer um jogo para publicar e compartilhar.'),
    dict(id='jogo-sob-medida', nome='Jogo Sob Medida', preco='1.490', apartir=True, prazo='prazo combinado', desc='3D, online com amigos ou com economia e loja.',
         itens=['Jogo 3D ou 2D avançado', 'Partidas online entre jogadores', 'Contas, moedas e loja no jogo', 'Versão para Windows', 'Orçamento fechado depois da conversa'],
         bom='projetos grandes, como os do A² LABS.'),
]

AVULSOS = [
    ('Estudo de posicionamento', '190', 'Diagnóstico, posicionamento e jeito de falar, entregues num documento.'),
    ('Estudo de cor e tipografia', '150', 'Paleta e fontes com o porquê de cada escolha.'),
    ('Manual para a logo que você já tem', '290', 'Organiza cores, fontes e usos certos da marca atual.'),
    ('Redesenho de logo', '220', 'Moderniza sem perder o que o cliente já reconhece.'),
    ('Kit de redes sociais', '150', '6 modelos editáveis de post e story.'),
    ('Cartão de visita', '70', 'Frente e verso, pronto para a gráfica.'),
    ('Papelaria', '90', 'Papel timbrado e assinatura de e-mail.'),
]

COMBOS = [
    dict(nome='Começo Certo', inclui='Marca Start + Site Start', soma='680', preco='590', pix='530'),
    dict(nome='Presença Completa', inclui='Identidade Visual + Site Essencial', soma='1.080', preco='950', pix='850', destaque=True),
    dict(nome='Marca e Site Profissional', inclui='Marca Completa + Site Profissional + 1º mês de Cuidado Mensal grátis', soma='1.839', preco='1.590', pix='1.430'),
]

EXTRAS = [
    ('Perfil da Empresa no Google', 'R$ 120', 'Criação ou arrumação completa, uma vez. No Pix, R$ 100.'),
    ('Página adicional', 'R$ 80', 'Uma página a mais no Site Profissional.'),
    ('Textos escritos pela gente', 'R$ 50 por página', 'A partir de uma conversa com você.'),
    ('Tratamento de fotos', 'R$ 50', 'Até 20 fotos ajustadas e prontas para o site.'),
    ('Entrega expressa', '+30%', 'Até 5 dias úteis, com todo o conteúdo em mãos.'),
    ('Alteração fora do plano', 'R$ 60 por hora', 'Sempre com orçamento aprovado antes.'),
    ('Domínio .com.br', 'cerca de R$ 40 por ano', 'Pago ao Registro.br, sempre no nome do seu negócio.'),
    ('Hospedagem de sistema ou jogo', 'a partir de R$ 59 por mês', 'Servidor, banco de dados e suporte, quando o projeto precisar.'),
]

PAGAMENTO = [
    ('10% de desconto no Pix', 'Vale para sites, marca, sistemas, jogos e combos.'),
    ('Pix em duas partes', 'Metade na aprovação e metade na entrega (antes de publicar o site, o sistema ou o jogo, ou de entregar os arquivos da marca).'),
    ('Cartão em até 12x', 'Crédito com a taxa da maquininha, ou débito pelo valor de tabela.'),
    ('Mensalidade sem fidelidade', 'Data fixa, por Pix, boleto ou cartão. Para cancelar, é só avisar com 30 dias.'),
    ('Plano anual', 'Pague 10 mensalidades e leve 12.'),
    ('Proposta válida por 7 dias', 'O prazo de entrega conta a partir do recebimento dos textos, fotos e informações.'),
]

# Perguntas de balcão: (assunto, pergunta, resposta em HTML simples). O assistente usa as mesmas.
ASSUNTOS = [('precos', 'Preços'), ('processo', 'Prazos e processo'), ('google', 'Google'), ('cuidado', 'Depois do site'), ('marca', 'Marca'), ('sistemas', 'Sistemas e jogos'), ('advocacia', 'Advocacia')]

PERGUNTAS = [
    ('precos', 'Quanto custa um site?', 'Temos três opções: o <b>Site Start</b> por R$ 390 (uma página direta), o <b>Site Essencial</b> por R$ 490 (página completa, com 1 ano de domínio) e o <b>Site Profissional</b> por R$ 790 (até 5 páginas). No Pix tem 10% de desconto. Veja tudo em <a href="/precos">Preços</a>.'),
    ('precos', 'Como posso pagar?', 'No Pix, com 10% de desconto, em duas partes: metade na aprovação e metade antes de o site ir ao ar. Também aceitamos débito e cartão de crédito em até 12x, com a taxa da maquininha.'),
    ('cuidado', 'Quanto custa manter o site depois?', 'É opcional. O <b>Site no Ar</b> sai por R$ 29 por mês, o <b>Cuidado Mensal</b> por R$ 59 e a <b>Presença Acompanhada</b> por R$ 119. No plano anual você paga 10 meses e leva 12, e todos incluem a renovação do .com.br.'),
    ('precos', 'O domínio .com.br está incluso?', 'No Site Essencial e no Site Profissional, o primeiro ano está incluso. No Site Start, o registro custa cerca de R$ 40 por ano no Registro.br. Ele fica sempre no nome do seu negócio.'),
    ('processo', 'Quanto tempo leva para ficar pronto?', 'A meta é de 7 a 10 dias úteis depois que recebemos os textos, as fotos e as informações. Com pressa? Existe a entrega expressa, em até 5 dias úteis.'),
    ('processo', 'Eu não entendo nada de internet. Tem problema?', 'Nenhum. Essa parte é com a gente. Você só precisa conhecer bem o seu negócio, e isso você já conhece melhor que ninguém.'),
    ('processo', 'Preciso ter fotos e textos prontos?', 'Não. A gente conversa com você e organiza as informações. Se quiser, escrevemos os textos (R$ 50 por página) e ajustamos as suas fotos.'),
    ('processo', 'Vocês atendem fora de Americana?', 'Atendemos presencialmente em Americana/SP e região, como Santa Bárbara d’Oeste, Nova Odessa e Sumaré, e online para todo o Brasil.'),
    ('processo', 'O site fica no meu nome?', 'Fica. O endereço (o seunegocio.com.br) é registrado em nome do seu negócio. É seu, e a gente cuida da parte técnica.'),
    ('google', 'Já tenho Instagram. Preciso mesmo de um site?', 'O Instagram é ótimo para mostrar o dia a dia. O site é o seu endereço oficial: aparece no Google, passa mais credibilidade e é seu, não depende de algoritmo nenhum. Os dois juntos funcionam muito melhor.'),
    ('google', 'Vocês cuidam do Google também?', 'Cuidamos. Criamos ou arrumamos o Perfil da sua empresa no Google (R$ 120, uma vez) e ligamos ele ao site, para quem procurar encontrar endereço, horário e contato do jeito certo.'),
    ('google', 'O site aparece no Google na hora?', 'O Google costuma levar de alguns dias a algumas semanas para mostrar um site novo. A gente prepara tudo para ele encontrar você pelo nome e pela cidade, mas ninguém pode prometer a primeira posição, e a gente não promete.'),
    ('cuidado', 'E se eu quiser mudar algo depois?', 'É só chamar no WhatsApp. Com um plano de cuidado mensal, as alterações do mês já estão incluídas. Sem plano, cobramos R$ 60 por hora, sempre com orçamento antes.'),
    ('marca', 'Vocês fazem logo e identidade visual?', 'Fazemos. <b>Marca Start</b> por R$ 290 (logo, versões e cores), <b>Identidade Visual</b> por R$ 590 (estudo de marca, cores, tipografia e manual) e <b>Marca Completa</b> por R$ 990 (estudo, posicionamento e reposicionamento). Marca e site juntos saem mais em conta.'),
    ('marca', 'O que é estudo e reposicionamento de marca?', 'É olhar com calma para o seu negócio, o seu público e a concorrência da região para decidir como você quer ser visto. Daí saem o posicionamento, o jeito de falar, as cores e a nova marca. Está na Marca Completa ou separado, no Estudo de posicionamento (R$ 190).'),
    ('sistemas', 'Vocês fazem sistemas, como para academia ou personal?', 'Fazemos. O <b>Sistema Básico</b> sai por R$ 400 (cadastro de clientes ou alunos, login e até 4 telas), o <b>Sistema Profissional</b> por R$ 890 e projetos maiores a partir de R$ 1.590. Veja em <a href="/precos#sistemas">Sistemas</a>.'),
    ('sistemas', 'Vocês fazem jogos?', 'Fazemos. Jogos 2D a partir de R$ 350 (uma fase, no navegador e no celular), o <b>Jogo 2D Completo</b> por R$ 790 e jogos 3D ou online a partir de R$ 1.490. Veja exemplos no <a href="/labs">A² LABS</a>.'),
    ('advocacia', 'Vocês fazem site para escritório de advocacia?', 'Fazemos. O site apresenta o escritório, as áreas de atuação e as formas de contato, com linguagem sóbria e informativa, no espírito do Provimento 205/2021 do Conselho Federal da OAB. Não usamos promessa de resultado, depoimentos de clientes nem chamadas de captação. A revisão final é sempre do advogado responsável.'),
    ('advocacia', 'O domínio pode ser .adv.br?', 'Pode. O endereço fica em nome do escritório ou do advogado responsável. Além do .com.br, existe o .adv.br, exclusivo para advogados e sociedades de advogados.'),
    ('advocacia', 'E o sigilo dos clientes do escritório?', 'O site não guarda dados de clientes. O contato vai direto para o WhatsApp do escritório, respeitando a LGPD e o sigilo profissional.'),
    ('advocacia', 'Depois de pronto, tem suporte?', 'Tem. Ajustes e atualizações podem entrar no cuidado mensal, e você fala direto com o Pedro ou o Igor pelo WhatsApp.'),
]

# Conhecimento extra do assistente (além das perguntas acima): palavras-chave e resposta.
ASSISTENTE_EXTRA = [
    (['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'opa', 'e ai'], 'Oi! Sou o assistente da A2 Click. Posso falar de preços, prazos, Google, cuidado mensal e marca. O que você quer saber?'),
    (['whatsapp', 'falar com', 'contato', 'telefone', 'ligar', 'atendente', 'humano', 'pessoa', 'pedro', 'igor', 'orcamento'], 'Claro! Você fala direto com os fundadores: o <b>Pedro</b>, no (19) 99602-2246, ou o <b>Igor</b>, no (19) 98865-9584. Use os botões de WhatsApp aqui embaixo.'),
    (['quem sao', 'quem faz', 'fundador', 'socios', 'empresa', 'agencia'], 'A A2 Click são dois fundadores, o Pedro Augusto e o Igor Amaral. Cada projeto passa pelas mãos dos dois, e você fala direto com quem faz. Conheça em <a href="/quem-somos">Quem somos</a>.'),
    (['portfolio', 'exemplo', 'trabalhos', 'clientes', 'ja fizeram', 'modelo de site'], 'Dá para ver alguns sites que fizemos no <a href="/#portfolio">Portfólio</a>: a União Paulista, a Auto Mecânica Suíça, a Aline Oliveira Podologia e a Amaral Training. E no simulador você vê como o seu pode ficar.'),
    (['labs', 'aplicativo', 'app', 'software'], 'Além de sites, fazemos tecnologia sob medida: <b>sistemas</b> a partir de R$ 400 e <b>jogos 2D</b> a partir de R$ 350. Veja os pacotes em <a href="/precos#sistemas">Sistemas e jogos</a> e o que já construímos no <a href="/labs">A² LABS</a>.'),
    (['sistema', 'sistemas', 'academia', 'personal', 'agendamento', 'agenda', 'controle de alunos', 'cadastro', 'gestao', 'clinica'], 'Fazemos sistemas sob medida: o <b>Sistema Básico</b> sai por R$ 400 (cadastro de clientes ou alunos, login e até 4 telas), o <b>Sistema Profissional</b> por R$ 890 (área do cliente, relatórios e níveis de acesso) e projetos maiores a partir de R$ 1.590. Bom para academias, personal trainers, clínicas e agendamentos. Veja em <a href="/precos#sistemas">Sistemas</a>.'),
    (['jogo', 'jogos', 'game', 'games', '2d', '3d', 'multiplayer'], 'Fazemos jogos: o <b>Jogo Básico 2D</b> sai a partir de R$ 350 (uma fase ou modo, roda no navegador e no celular), o <b>Jogo 2D Completo</b> por R$ 790 (várias fases, menu, sons e ranking) e jogos 3D ou online a partir de R$ 1.490. Veja exemplos no <a href="/labs">A² LABS</a> e os pacotes em <a href="/precos#jogos">Jogos</a>.'),
    (['loja virtual', 'ecommerce', 'e-commerce', 'vender online', 'carrinho'], 'Loja virtual e integrações têm escopo próprio, então fazemos um orçamento sob medida. Chama a gente no WhatsApp e conta o que você quer vender.'),
    (['anuncio', 'trafego pago', 'google ads', 'instagram ads', 'impulsionar', 'redes sociais', 'social media'], 'Hoje o nosso foco é o site, o Perfil no Google e a marca. Gestão de anúncios e de redes sociais não entra nos planos, mas a gente deixa tudo pronto para quem for anunciar.'),
    (['combo', 'combos', 'pacote', 'pacotes', 'junto', 'juntos', 'juntar', 'misturar', 'mistura', 'combinar', 'combinado', 'os dois', 'mais de um', 'varios servicos', 'dois servicos', 'kit', 'marca e site', 'site e marca', 'logo e site', 'site e logo', 'site com logo', 'logo com site', 'tudo junto', 'completo'], 'Dá sim! Marca e site juntos já têm combo e saem mais em conta:<br>• <b>Começo Certo</b> (Marca Start + Site Start): R$ 590, ou R$ 530 no Pix<br>• <b>Presença Completa</b> (Identidade Visual + Site Essencial): R$ 950, ou R$ 850 no Pix<br>• <b>Marca e Site Profissional</b> (Marca Completa + Site Profissional + 1º mês de Cuidado Mensal grátis): R$ 1.590, ou R$ 1.430 no Pix<br>Também dá para contratar outros serviços juntos (site + Perfil no Google, site + sistema…), somando os valores de cada um. Veja em <a href="/precos#combos">Combos</a>.'),
    (['desconto', 'descontos', 'promocao', 'mais barato', 'abatimento', 'sai mais em conta', 'condicao especial'], 'Os descontos são dois: <b>10% no Pix</b> (vale para sites, marca, sistemas, jogos e combos) e os <b>combos de marca + site</b>, que saem mais baratos que separado. Nos planos mensais, o <b>anual</b> sai por 10 mensalidades e leva 12. Outra condição só o Pedro ou o Igor podem combinar.'),
    (['parcela', 'parcelas', 'parcelar', 'parcelado', 'parcelamento', 'em vezes', '12x', 'cartao de credito', 'credito', 'debito', 'maquininha'], 'Dá para parcelar no <b>cartão de crédito em até 12x</b>, com a taxa da maquininha. No débito é o valor de tabela, e no <b>Pix</b> tem <b>10% de desconto</b>, pago em duas partes: metade na aprovação e metade na entrega.'),
    (['fidelidade', 'cancelar', 'cancelamento', 'contrato', 'multa', 'sair do plano'], 'Os planos mensais <b>não têm fidelidade</b>. Para cancelar, é só avisar com 30 dias. A mensalidade tem data fixa e pode ser paga por Pix, boleto ou cartão.'),
    (['anual', 'plano anual', 'pagar o ano', 'por ano'], 'No plano anual você paga <b>10 mensalidades e leva 12</b>: Site no Ar R$ 290 por ano, Cuidado Mensal R$ 590 e Presença Acompanhada R$ 1.190.'),
    (['urgente', 'urgencia', 'pressa', 'expressa', 'expresso', 'mais rapido', 'para ontem'], 'Com pressa tem a <b>entrega expressa</b>: até 5 dias úteis, com todo o conteúdo em mãos, por +30% no valor. O prazo normal de um site é de 7 a 10 dias úteis.'),
    (['proposta', 'validade', 'valido'], 'A proposta vale por 7 dias. O prazo de entrega começa a contar quando a gente recebe os textos, as fotos e as informações.'),
    (['qual escolher', 'qual o melhor', 'qual plano', 'qual site', 'indica', 'recomenda', 'diferenca', 'qual a diferenca', 'nao sei qual'], 'Depende do seu momento:<br>• <b>Site Start</b> (R$ 390): para começar já, gastando pouco, com uma página direta.<br>• <b>Site Essencial</b> (R$ 490): o mais pedido por padarias, salões, oficinas e prestadores de serviço, com 1 ano de domínio.<br>• <b>Site Profissional</b> (R$ 790): até 5 páginas, para clínicas, escritórios, lojas e quem tem vários serviços.<br>Se me disser qual é o seu negócio, eu te ajudo a escolher.'),
    (['hospedagem', 'servidor', 'fora do ar', 'seguranca', 'ssl', 'backup'], 'A gente publica e cuida da hospedagem para o site ficar no ar, rápido e seguro. Nos planos de cuidado mensal, a partir de R$ 29 por mês, isso está incluso, junto com a renovação do domínio.'),
    (['perfil do google', 'perfil no google', 'perfil da empresa', 'google meu negocio', 'google maps', 'ficha do google'], 'Criamos ou arrumamos o <b>Perfil da Empresa no Google</b> por R$ 120, uma vez (R$ 100 no Pix): categoria, horários, fotos e ligação com o site e o WhatsApp. Nos planos Cuidado Mensal e Presença Acompanhada, a gente segue cuidando dele todo mês.'),
    (['o que voces fazem', 'o que fazem', 'quais servicos', 'servicos', 'trabalham com'], 'A gente faz cinco coisas que se encaixam: <b>sites</b> (a partir de R$ 390), <b>Perfil no Google</b> (R$ 120), <b>cuidado mensal</b> (a partir de R$ 29 por mês), <b>marca e identidade visual</b> (a partir de R$ 290), <b>sistemas</b> (a partir de R$ 400) e <b>jogos</b> (a partir de R$ 350). Veja tudo em <a href="/precos">Preços</a>.'),
    (['padaria', 'salao', 'barbearia', 'oficina', 'mecanica', 'restaurante', 'lanchonete', 'loja', 'pet shop', 'manicure', 'podologia', 'dentista', 'nutricionista', 'psicologo', 'fisioterapia', 'estetica', 'confeitaria', 'meu negocio', 'minha empresa', 'comercio', 'prestador'], 'Fazemos sim! Para a maioria dos comércios e prestadores de serviço, o <b>Site Essencial</b> (R$ 490, ou R$ 440 no Pix) resolve: perfil, serviços, fotos, mapa e WhatsApp, com 1 ano de domínio. Se você tem vários serviços ou equipe, o <b>Site Profissional</b> (R$ 790) dá uma página para cada. E vale somar o <b>Perfil no Google</b> (R$ 120) para ser encontrado no mapa.'),
    (['avulso', 'avulsos', 'cartao de visita', 'papelaria', 'papel timbrado', 'kit de redes', 'post', 'posts', 'stories', 'redesenho', 'redesenhar', 'manual da marca', 'so o manual'], 'Também fazemos serviços avulsos de marca: <b>cartão de visita</b> R$ 70, <b>papelaria</b> R$ 90, <b>kit de redes sociais</b> (6 modelos) R$ 150, <b>estudo de cor e tipografia</b> R$ 150, <b>estudo de posicionamento</b> R$ 190, <b>redesenho de logo</b> R$ 220 e <b>manual para a logo que você já tem</b> R$ 290. Veja em <a href="/precos#marca">Marca</a>.'),
    (['de onde', 'onde ficam', 'onde fica', 'onde voces sao', 'cidade de voces', 'localizacao', 'endereco de voces', 'presencial'], 'A A2 Click é de <b>Americana/SP</b>. Atendemos presencialmente em Americana e região (Santa Bárbara d’Oeste, Nova Odessa, Sumaré) e online para todo o Brasil.'),
    (['obrigado', 'valeu', 'agradeco', 'brigado'], 'Imagina! Se precisar de mais alguma coisa, é só perguntar. Quando quiser, chame o Pedro ou o Igor no WhatsApp.'),
]
