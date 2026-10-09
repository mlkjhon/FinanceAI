import { z } from 'zod';

/*
 * Blocos dos Insights. O servidor monta cada bloco com números calculados dos
 * dados reais; aqui só validamos o formato antes de renderizar. Um bloco que
 * não passa na validação é ignorado (não quebra a página).
 */

const Formato = z.enum(['moeda', 'pct', 'numero']);

const KpiData = z.object({
  valor: z.number(),
  formato: Formato,
  anterior: z.number().nullable().optional(),
  variacaoPct: z.number().nullable().optional(),
  campo: z.string().optional(),
});

const ChartData = z.object({
  subtipo: z.enum(['line', 'bar', 'area', 'donut', 'stacked']),
  series: z.array(z.object({ chave: z.string(), rotulo: z.string() })).min(1),
  pontos: z.array(z.record(z.union([z.string(), z.number()]))).min(1),
  formato: Formato.optional(),
});

const TableData = z.object({
  colunas: z.array(z.object({ chave: z.string(), rotulo: z.string(), formato: z.enum(['moeda', 'pct', 'numero', 'texto']) })),
  linhas: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  destaque: z.array(z.number()).optional(),
});

const TipData = z.object({
  texto: z.string(),
  nivel: z.enum(['info', 'atencao', 'oportunidade']),
  economia: z.number().nullable().optional(),
  duracaoDias: z.number().optional(),
});

const StoryData = z.object({
  slides: z.array(z.string()).min(1),
  kpis: z.array(z.object({ rotulo: z.string(), valor: z.number(), formato: Formato })),
});

const AnomalyData = z.object({
  categoria: z.string(),
  atual: z.number(),
  media: z.number(),
  variacaoPct: z.number(),
  texto: z.string().nullable().optional(),
});

const ForecastData = z.object({
  gastoAteHoje: z.number(),
  diasPassados: z.number(),
  diasNoMes: z.number(),
  projecao: z.number(),
  mediaAnteriores: z.number(),
  diferenca: z.number(),
  texto: z.string().nullable().optional(),
});

const GoalData = z.union([
  z.object({
    sugestao: z.literal(false),
    titulo: z.string(),
    valorMeta: z.number(),
    valorAtual: z.number(),
    falta: z.number(),
    pct: z.number(),
    dataObjetivo: z.string().nullable().optional(),
    texto: z.string().nullable().optional(),
  }),
  z.object({ sugestao: z.literal(true), texto: z.string(), valorSugerido: z.number() }),
]);

const ComparisonData = z.object({
  periodoA: z.object({ inicio: z.string(), fim: z.string() }),
  periodoB: z.object({ inicio: z.string(), fim: z.string() }),
  linhas: z.array(z.object({ categoria: z.string(), atual: z.number(), anterior: z.number(), diferenca: z.number(), variacaoPct: z.number().nullable() })),
  texto: z.string().nullable().optional(),
});

const ActionData = z.object({
  acao: z.enum(['criar_meta', 'depositar_meta', 'criar_orcamento', 'aportar', 'criar_investimento']),
  texto: z.string(),
  titulo: z.string(),
  valor: z.number().nullable(),
  alvoId: z.string().optional(),
  dataObjetivo: z.string().nullable().optional(),
  falta: z.number().optional(),
  mes: z.number().optional(),
  ano: z.number().optional(),
  tipoInvestimento: z.string().optional(),
  indexador: z.string().optional(),
  taxa: z.number().optional(),
});

const Base = {
  id: z.string(),
  title: z.string(),
  size: z.enum(['sm', 'md', 'lg', 'full']),
  priority: z.number(),
  reasoning: z.string(),
  createdAt: z.string(),
  pedido: z.record(z.any()),
  fixado: z.boolean().optional(),
  // ação já executada: quando, com qual valor e o que foi criado/alterado
  feito: z.object({ em: z.string(), valor: z.number().nullable().optional(), alvoId: z.string().nullable().optional() }).optional(),
  // o que o bloco considerou (busca por termos) e avisos sobre a conta
  inclui: z.array(z.string()).optional(),
  nota: z.string().optional(),
};

export const Bloco = z.discriminatedUnion('type', [
  z.object({ ...Base, type: z.literal('kpi'), data: KpiData }),
  z.object({ ...Base, type: z.literal('chart'), data: ChartData }),
  z.object({ ...Base, type: z.literal('table'), data: TableData }),
  z.object({ ...Base, type: z.literal('tip'), data: TipData }),
  z.object({ ...Base, type: z.literal('challenge'), data: TipData }),
  z.object({ ...Base, type: z.literal('story'), data: StoryData }),
  z.object({ ...Base, type: z.literal('anomaly'), data: AnomalyData }),
  z.object({ ...Base, type: z.literal('forecast'), data: ForecastData }),
  z.object({ ...Base, type: z.literal('goal'), data: GoalData }),
  z.object({ ...Base, type: z.literal('comparison'), data: ComparisonData }),
  z.object({ ...Base, type: z.literal('action'), data: ActionData }),
]);
export type Bloco = z.infer<typeof Bloco>;
export type BlocoDe<T extends Bloco['type']> = Extract<Bloco, { type: T }>;

export const Operacao = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create'), bloco: Bloco }),
  z.object({ op: z.literal('update'), id: z.string(), bloco: Bloco }),
  z.object({ op: z.literal('remove'), ids: z.array(z.string()) }),
  z.object({ op: z.literal('reorder'), ids: z.array(z.string()) }),
]);
export type Operacao = z.infer<typeof Operacao>;

export type Periodo = 'mes' | '3m' | 'ano' | { inicio: string; fim: string };
export type EstadoIA = 'ocioso' | 'analisando' | 'gerando' | 'executando';
