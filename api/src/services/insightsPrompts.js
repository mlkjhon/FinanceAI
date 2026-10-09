import { catalogoParaIA } from './insightsBlocos.js';

const REGRAS_BLOCOS = `
FORMATO DE UM BLOCO (JSON):
{ "type": tipo, "title": "título curto em português", "size": "sm"|"md"|"lg"|"full", "priority": 1-10 (10 = mais importante),
  "reasoning": "uma frase dizendo por que este bloco importa para ESTE usuário", ...campos do tipo }

REGRA DOS NÚMEROS (obrigatória): você NUNCA escreve valores em reais nem porcentagens nos textos.
Todo número vem de uma função de dados. Nos textos use marcadores {{nome}} e declare cada um em "valores":
  "valores": { "nome": { "fn": função, "args": {...}, "item": { "campo": "valor" } (opcional, para escolher um item de uma lista), "campo": "campo numérico", "formato": "moeda"|"pct"|"numero" } }
Exemplo: "texto": "Mercado levou {{mercado}} este mês.", "valores": { "mercado": { "fn": "gastosPorCategoria", "item": { "categoria": "Mercado" }, "campo": "total" } }
Números pequenos de contagem de dias (ex.: "7 dias") podem ser escritos normalmente.

TIPOS E CAMPOS:
- story: "slides": [2 a 4 frases curtas que contam o período, com marcadores], "kpis": [{"rotulo": "Gastos", "valor": "nomeDeUmValor"}] (2 ou 3), "valores": {...}
- kpi: "fonte": {"fn","args"}, "campo": campo numérico, "item"? , "formato"?  (com resumoPeriodo, a variação vs. período anterior vem automática)
- chart: "subtipo": "line"|"bar"|"area"|"donut"|"stacked", "fonte": {"fn","args"}  (funções que devolvem listas; donut só para partes de um todo, ex. gastosPorCategoria)
- table: "fonte": {"fn","args"}, "item"? (linha a destacar)
- tip: "nivel": "info"|"atencao"|"oportunidade", "texto": com marcadores, "valores", "economia"?: nome de um valor que é a economia estimada
- anomaly: "item": {"categoria": "..."} de uma linha de anomalias, "texto"? curto
- forecast: "texto"? curto (os números vêm de projecaoFimMes)
- goal: "item": {"titulo": "..."} de uma meta existente, "texto"?; OU sugestão de meta nova: "texto" + "valores" + "economia" (valor sugerido)
- comparison: "fonte": {"fn": "comparativoPeriodos", "args"}, "texto"?
- challenge: "texto" (desafio prático, ex. "7 dias sem delivery"), "duracaoDias", "valores", "economia": nome do valor da economia estimada

FUNÇÕES DE DADOS DISPONÍVEIS (fn e args):
${catalogoParaIA()}
Sem "periodo" nos args, as funções usam o período escolhido pelo usuário.
Campos úteis: resumoPeriodo -> entradas, saidas, guardado, saldo, taxaPoupanca, variacaoSaidas, variacaoEntradas, anterior.saidas;
gastosPorCategoria -> categoria, total, pct, qtd; topDescricoes -> descricao, total, qtd; buscarGastos -> total, qtd, media;
recorrencias -> descricao, mediaMensal; anomalias -> categoria, atual, media, variacaoPct; projecaoFimMes -> projecao, gastoAteHoje, mediaAnteriores, diferenca;
comparativoPeriodos -> categoria, atual, anterior, diferenca; metas -> titulo, valorAtual, valorMeta, falta, pct; orcamentos -> categoria, limite, gasto, pct.
"gastos" nunca incluem dinheiro guardado em investimentos ou metas (isso é "guardado").
`;

const TOM = `Escreva em português do Brasil, direto e humano, sem jargão e sem markdown. Frases curtas. Nada de "Olá!" nem exclamações.`;

export function promptAnalise(snapshot, periodoRotulo) {
    return `Você é o analista financeiro do FinanceAI. Monte a página de Insights do usuário escolhendo blocos que tragam valor real.
${TOM}

Período analisado: ${periodoRotulo} (${snapshot.periodo.inicio} a ${snapshot.periodo.fim}).

DADOS AGREGADOS DO USUÁRIO (calculados pelo servidor, use para decidir o que mostrar):
${JSON.stringify(snapshot)}

O QUE FAZER:
- Crie de 6 a 10 blocos variados. O primeiro é OBRIGATORIAMENTE um "story" (size "full", priority 10) com o resumo do período.
- Escreva os blocos JÁ NA ORDEM em que devem aparecer (eles vão para a tela conforme você escreve): depois do story, o mais relevante para este usuário primeiro (o que mudou, o que preocupa, onde dá para economizar).
- Use tipos variados (gráficos, tabela, dicas, anomalias, projeção, metas, desafio). Só crie um bloco se os dados acima sustentarem.
  Ex.: sem anomalias na lista -> não crie anomaly; sem metas -> não crie goal de meta existente; projecaoFimMes null -> sem forecast.
- Dicas e desafios precisam ser específicos (citar categoria ou estabelecimento real dos dados) e acionáveis.
- Tamanhos: kpi "sm"; dicas/anomalia/projeção "sm" ou "md"; gráficos e tabelas "md" ou "lg".
${REGRAS_BLOCOS}
Responda SOMENTE com JSON: { "blocos": [ ...blocos ] }`;
}

export function promptComando(comando, blocosAtuais, snapshot, periodoRotulo) {
    return `Você controla a página de Insights do FinanceAI. O usuário deu um comando e você responde com OPERAÇÕES na página, não com conversa.
${TOM}

Período atual da página: ${periodoRotulo}.
Blocos na página agora (na ordem): ${JSON.stringify(blocosAtuais)}

DADOS AGREGADOS (para decidir):
${JSON.stringify(snapshot)}

COMANDO DO USUÁRIO: ${JSON.stringify(comando)}

OPERAÇÕES POSSÍVEIS:
- { "op": "create", "bloco": {...novo bloco} }
- { "op": "update", "id": "id de um bloco existente", "bloco": {...bloco completo substituto} }  (ex.: "transforma essa tabela em gráfico": mesmo assunto, outro type)
- { "op": "remove", "ids": ["..."] }
- { "op": "reorder", "ids": [todos os ids na nova ordem] }
Se o comando citar "essa"/"esse" sem dizer qual, use o bloco mais provável pelo assunto.
Para buscar um tipo de gasto por nome (delivery, uber, streaming), use buscarGastos ou serieMensal com "termos" (ex.: ["ifood","rappi","delivery","ze delivery"]).
Se não houver dados para atender, devolva operacoes vazia e explique em "resposta".
${REGRAS_BLOCOS}
Responda SOMENTE com JSON: { "operacoes": [...], "resposta": "uma frase curta dizendo o que você fez na página" }`;
}
