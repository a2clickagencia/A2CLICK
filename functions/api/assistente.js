// Assistente virtual da A2 Click: Cloudflare Pages Function em /api/assistente.
//
// Responde com a IA do Claude quando a variável ANTHROPIC_API_KEY existe no projeto do Cloudflare Pages
// (Settings → Variables and secrets, tipo "Secret"). Sem a chave, devolve 503 e o site usa as respostas
// prontas do navegador (assets/dados/assistente.json), então o assistente funciona dos dois jeitos.
// Opcional: ASSISTENTE_MODELO troca o modelo (padrão claude-opus-5-5; claude-haiku-5-5 custa bem menos).
import { CONHECIMENTO } from './_conhecimento.js';

const SISTEMA = `Você é o assistente virtual do site da Agência A2 Click (a2click.com.br).
Fale como a marca: português do Brasil, frases curtas, palavras do dia a dia ("a gente", "sem pressa", "certinho"), simpático e direto, como quem atende no balcão. Nada de termo técnico sem explicar (diga "aparecer no Google", não "SEO").
Responda só com base nas informações abaixo. Se a pergunta fugir do que está aqui, ou pedir algo que só os fundadores podem decidir (orçamento sob medida, desconto, prazo especial), diga com sinceridade que não sabe e convide a pessoa a chamar o Pedro ou o Igor no WhatsApp.
Nunca invente preço, prazo, cliente ou resultado. Não prometa primeira posição no Google.
Respostas curtas: até 3 frases, ou uma lista curta quando comparar planos. Escreva em texto simples, sem Markdown; pode usar **negrito** em nomes de planos e valores.

${CONHECIMENTO}`;

const LIMITE_TEXTO = 600;
const LIMITE_HISTORICO = 8;

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ erro: 'sem-ia' }, 503);

  // Só aceita chamadas do próprio site
  const origem = request.headers.get('origin');
  if (origem && new URL(origem).host !== new URL(request.url).host) return json({ erro: 'origem' }, 403);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: 'formato' }, 400); }
  const historico = Array.isArray(corpo && corpo.mensagens) ? corpo.mensagens.slice(-LIMITE_HISTORICO) : [];
  const mensagens = historico
    .filter((m) => m && (m.papel === 'usuario' || m.papel === 'assistente') && typeof m.texto === 'string' && m.texto.trim())
    .map((m) => ({ role: m.papel === 'usuario' ? 'user' : 'assistant', content: m.texto.slice(0, LIMITE_TEXTO) }));
  while (mensagens.length && mensagens[0].role !== 'user') mensagens.shift();
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== 'user') return json({ erro: 'formato' }, 400);

  let resposta;
  try {
    resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2026-10-21',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: env.ASSISTENTE_MODELO || 'claude-opus-5-5',
        max_tokens: 4000,
        output_config: { effort: 'low' },
        fallbacks: 'default',
        system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
        messages: mensagens,
      }),
    });
  } catch {
    return json({ erro: 'rede' }, 502);
  }
  if (!resposta.ok) return json({ erro: 'api', status: resposta.status }, 502);

  const dados = await resposta.json();
  if (dados.stop_reason === 'refusal') return json({ erro: 'recusa' }, 502);
  const texto = (dados.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!texto) return json({ erro: 'vazio' }, 502);
  return json({ texto });
}

export function onRequest() {
  return json({ erro: 'metodo' }, 405);
}
