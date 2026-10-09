import type { Bloco } from './types';

/*
 * Sugestões da barra de comando. Geradas no navegador (sem gastar IA) a partir
 * de modelos + o que existe na página do usuário (categorias, estabelecimentos).
 * Cada sugestão mostrada é lembrada e não volta enquanto houver novas; quando
 * todas já tiverem aparecido, o ciclo recomeça.
 */

const CHAVE_USADAS = 'financeai:insights:sugestoes-usadas';

const CATEGORIAS_PADRAO = ['mercado', 'delivery', 'transporte', 'lazer', 'restaurantes', 'farmácia', 'assinaturas', 'compras online', 'contas da casa', 'saúde'];
const PERIODOS = ['no último mês', 'nos últimos 3 meses', 'este ano', 'nas últimas semanas'];
const VALORES = ['R$ 100', 'R$ 200', 'R$ 300', 'R$ 500', 'R$ 800', 'R$ 1.000'];

const POR_CATEGORIA = [
  (c: string, p: string) => `Crie um gráfico dos meus gastos com ${c} ${p}`,
  (c: string) => `Compare ${c} com o mês passado`,
  (c: string) => `Quanto eu gasto com ${c} por semana?`,
  (c: string) => `Onde eu gasto mais dentro de ${c}?`,
  (c: string) => `Me dê um desafio para gastar menos com ${c}`,
  (c: string) => `Mostre uma tabela com tudo de ${c}`,
  (c: string) => `Os gastos com ${c} estão acima do normal?`,
  (c: string, p: string) => `Como os gastos com ${c} mudaram ${p}?`,
  (c: string) => `Quanto eu economizaria cortando metade de ${c}?`,
  (c: string) => `Projete quanto vou gastar com ${c} até o fim do mês`,
];

const POR_LUGAR = [
  (l: string) => `Quanto já gastei no ${l}?`,
  (l: string) => `Mostre a evolução dos gastos com ${l}`,
  (l: string) => `Vale a pena cortar ${l}?`,
];

const POR_VALOR = [
  (v: string) => `Onde eu posso economizar ${v}?`,
  (v: string) => `Monte um plano para guardar ${v} por mês`,
  (v: string) => `Quais gastos somam mais de ${v}?`,
];

const GERAIS = [
  'Quais são minhas assinaturas e quanto custam?',
  'Mostre meus 5 maiores gastos do mês',
  'Compare este mês com o mês passado',
  'Em que dia da semana eu mais gasto?',
  'Crie um gráfico de entradas e saídas dos últimos 6 meses',
  'Minha taxa de poupança está melhorando?',
  'Como o mês deve fechar no ritmo atual?',
  'Transforma a tabela em gráfico',
  'Coloque os gráficos primeiro',
  'Tira as dicas da página',
  'Junte meus gastos fixos em um bloco',
  'Quais gastos fogem do meu padrão?',
  'Sugira uma meta realista para este mês',
  'Quanto falta para minhas metas?',
  'Mostre meus orçamentos estourados',
  'Qual categoria mais cresceu no ano?',
  'Me mostre gastos pequenos que somam muito',
  'Crie um desafio de 7 dias para mim',
  'Resuma meu mês em três frases',
  'Remova os blocos de investimento',
];

const minusc = (s: string) => s.trim().toLowerCase();

// Categorias e estabelecimentos que aparecem nos blocos da página
function extrairDaPagina(blocos: Bloco[]) {
  const categorias = new Set<string>();
  const lugares = new Set<string>();
  for (const b of blocos) {
    if (b.type === 'anomaly') categorias.add(minusc(b.data.categoria));
    if (b.type === 'comparison') b.data.linhas.forEach((l) => categorias.add(minusc(l.categoria)));
    if (b.type === 'chart' && b.pedido?.fonte?.fn === 'gastosPorCategoria') b.data.pontos.forEach((p) => categorias.add(minusc(String(p.rotulo))));
    if (b.type === 'table' && b.pedido?.fonte?.fn === 'topDescricoes') b.data.linhas.forEach((l) => typeof l.descricao === 'string' && lugares.add(l.descricao.trim()));
  }
  categorias.delete('sem categoria');
  return { categorias: [...categorias], lugares: [...lugares].filter((l) => !/^\[INV:/.test(l)).slice(0, 8) };
}

function todasAsSugestoes(blocos: Bloco[]) {
  const { categorias, lugares } = extrairDaPagina(blocos);
  const cats = [...new Set([...categorias, ...CATEGORIAS_PADRAO])];
  const lista: { texto: string; grupo: string }[] = [];
  cats.forEach((c) => POR_CATEGORIA.forEach((t, i) => lista.push({ texto: t(c, PERIODOS[(i + c.length) % PERIODOS.length]), grupo: `cat${i}` })));
  lugares.forEach((l) => POR_LUGAR.forEach((t, i) => lista.push({ texto: t(l), grupo: `lugar${i}` })));
  VALORES.forEach((v) => POR_VALOR.forEach((t, i) => lista.push({ texto: t(v), grupo: `valor${i}` })));
  GERAIS.forEach((g, i) => lista.push({ texto: g, grupo: `geral${i}` }));
  return lista;
}

function lerUsadas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_USADAS) || '[]'));
  } catch {
    return new Set();
  }
}

function salvarUsadas(usadas: Set<string>) {
  try {
    localStorage.setItem(CHAVE_USADAS, JSON.stringify([...usadas].slice(-600)));
  } catch {
    /* sem storage: só não lembra entre recarregamentos */
  }
}

/*
 * Sorteia n sugestões que nunca apareceram antes, e de modelos diferentes entre
 * si (para a mesma rodada não ter quatro frases do mesmo jeito).
 */
export function sortearSugestoes(blocos: Bloco[], n = 4): string[] {
  const todas = todasAsSugestoes(blocos);
  let usadas = lerUsadas();
  let livres = todas.filter((s) => !usadas.has(s.texto));
  if (livres.length < n) {
    usadas = new Set(); // todas já apareceram: recomeça o ciclo
    livres = todas;
  }
  // embaralha (Fisher-Yates)
  for (let i = livres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [livres[i], livres[j]] = [livres[j], livres[i]];
  }
  const escolhidas: string[] = [];
  const grupos = new Set<string>();
  for (const s of livres) {
    if (escolhidas.length === n) break;
    if (grupos.has(s.grupo)) continue;
    grupos.add(s.grupo);
    escolhidas.push(s.texto);
  }
  escolhidas.forEach((t) => usadas.add(t));
  salvarUsadas(usadas);
  return escolhidas;
}
