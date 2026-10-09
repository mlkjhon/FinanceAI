import { z } from 'zod';
import { funcoes, resolverPeriodo } from './insightsData.js';

/*
 * Blocos dos Insights. A IA devolve "pedidos de bloco" (BlocoPedido): tipo,
 * título, e de qual função de dados os números vêm. Aqui o pedido vira um bloco
 * pronto, com os números calculados pelo servidor. Pedido que não resolve
 * (função vazia, item inexistente, número escrito à mão no texto) é descartado.
 */

export const TIPOS = ['kpi', 'chart', 'table', 'tip', 'story', 'anomaly', 'forecast', 'goal', 'comparison', 'challenge'];
const FNS = Object.keys(funcoes);

const Fonte = z.object({ fn: z.enum(FNS), args: z.record(z.any()).optional().default({}) });
const Ref = Fonte.extend({
    item: z.record(z.union([z.string(), z.number()])).optional(),
    campo: z.string(),
    formato: z.enum(['moeda', 'pct', 'numero']).optional().default('moeda'),
});

export const BlocoPedido = z.object({
    type: z.enum(TIPOS),
    title: z.string().min(2).max(90),
    size: z.enum(['sm', 'md', 'lg', 'full']).optional().default('md'),
    priority: z.number().min(1).max(10).optional().default(5),
    reasoning: z.string().max(240).optional().default(''),
    fonte: Fonte.optional(),
    item: z.record(z.union([z.string(), z.number()])).optional(),
    campo: z.string().optional(),
    formato: z.enum(['moeda', 'pct', 'numero']).optional(),
    subtipo: z.enum(['line', 'bar', 'area', 'donut', 'stacked']).optional(),
    texto: z.string().max(600).optional(),
    slides: z.array(z.string().max(300)).max(5).optional(),
    valores: z.record(Ref).optional(),
    kpis: z.array(z.object({ rotulo: z.string().max(40), valor: z.string() })).max(3).optional(),
    nivel: z.enum(['info', 'atencao', 'oportunidade']).optional(),
    economia: z.string().optional(),
    duracaoDias: z.number().int().min(1).max(90).optional(),
});

// ---------- Formas de cada função (como vira gráfico / tabela) ----------

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

const FORMAS = {
    gastosPorCategoria: { rotulo: 'categoria', series: [['total', 'Gasto']], extras: [['pct', '% do total', 'pct'], ['qtd', 'Lançamentos', 'numero']] },
    topDescricoes: { rotulo: 'descricao', series: [['total', 'Gasto']], extras: [['categoria', 'Categoria', 'texto'], ['qtd', 'Vezes', 'numero']] },
    recorrencias: { rotulo: 'descricao', series: [['mediaMensal', 'Média por mês']], extras: [['categoria', 'Categoria', 'texto'], ['meses', 'Meses', 'numero']] },
    anomalias: { rotulo: 'categoria', series: [['atual', 'Agora'], ['media', 'Média']], extras: [['variacaoPct', 'Variação', 'pct']] },
    comparativoPeriodos: { rotulo: 'categoria', series: [['atual', 'Período atual'], ['anterior', 'Período anterior']], extras: [['variacaoPct', 'Variação', 'pct']] },
    orcamentos: { rotulo: 'categoria', series: [['gasto', 'Gasto'], ['limite', 'Limite']], extras: [['pct', '% usado', 'pct']] },
    metas: { rotulo: 'titulo', series: [['valorAtual', 'Guardado'], ['valorMeta', 'Meta']], extras: [['pct', '% concluído', 'pct']] },
    investimentos: { rotulo: 'nome', series: [['saldo', 'Saldo']], extras: [['tipo', 'Tipo', 'texto']] },
};

function formaSerieMensal(args, linhas) {
    const filtrada = args.categoria || args.termos?.length;
    return {
        linhas: linhas.map((l) => ({ ...l, mes: rotuloMes(l.mes) })),
        forma: filtrada
            ? { rotulo: 'mes', series: [['total', args.categoria || 'Gasto']], extras: [] }
            : { rotulo: 'mes', series: [['entradas', 'Entradas'], ['saidas', 'Gastos']], extras: [] },
    };
}

// ---------- Execução e formatação ----------

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatar(valor, formato) {
    if (formato === 'pct') return `${Math.round(valor).toLocaleString('pt-BR')}%`;
    if (formato === 'numero') return Math.round(valor).toLocaleString('pt-BR');
    return moeda.format(valor);
}

function executar(ctx, fonte, base) {
    const f = funcoes[fonte.fn];
    if (!f) return null;
    try {
        return f.run(ctx, fonte.args || {}, base);
    } catch (e) {
        console.error(`[INSIGHTS] ${fonte.fn} falhou:`, e.message);
        return null;
    }
}

const vazio = (r) => r == null || (Array.isArray(r) && r.length === 0);

function selecionar(resultado, item) {
    if (!Array.isArray(resultado)) return resultado;
    if (!item) return resultado[0];
    const [chave, valor] = Object.entries(item)[0];
    return resultado.find((r) => String(r[chave]).toLowerCase() === String(valor).toLowerCase());
}

const pegar = (obj, caminho) => caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function resolverRef(ctx, ref, base) {
    const r = executar(ctx, ref, base);
    if (vazio(r)) return null;
    const alvo = selecionar(r, ref.item);
    const v = alvo == null ? undefined : pegar(alvo, ref.campo);
    return typeof v === 'number' && Number.isFinite(v) ? { valor: v, formato: ref.formato } : null;
}

// Número escrito à mão no texto (R$ 300, 12%) não passa: tem que vir de {{valor}}
const NUMERO_SOLTO = /R\$\s?\d|\d+(?:[.,]\d+)?\s?%/;

function preencher(texto, valores) {
    if (!texto) return texto;
    if (NUMERO_SOLTO.test(texto)) throw new Error('número escrito sem marcador');
    return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, nome) => {
        const v = valores[nome];
        if (!v) throw new Error(`marcador {{${nome}}} sem valor`);
        return formatar(v.valor, v.formato);
    });
}

const novoId = () => `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/*
 * Pedido da IA -> bloco pronto. Devolve null quando não há dados que sustentem
 * o bloco (a página simplesmente não mostra nada no lugar).
 */
export function resolverBloco(ctx, pedidoBruto, periodo, extra = {}) {
    const parsed = BlocoPedido.safeParse(pedidoBruto);
    if (!parsed.success) {
        console.warn('[INSIGHTS] bloco inválido:', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
        return null;
    }
    const p = parsed.data;
    const base = resolverPeriodo(periodo, ctx.hoje);

    try {
        // Valores nomeados usados nos textos
        const valores = {};
        for (const [nome, ref] of Object.entries(p.valores || {})) {
            const v = resolverRef(ctx, ref, base);
            if (v) valores[nome] = v;
        }
        const data = montarDados(ctx, p, base, valores);
        if (!data) return null;
        return {
            id: extra.id || novoId(),
            type: p.type,
            title: p.title,
            size: p.size,
            priority: p.priority,
            reasoning: p.reasoning,
            createdAt: new Date().toISOString(),
            pedido: p, // guardado para refazer, fixar e recalcular em outro período
            data,
        };
    } catch (e) {
        console.warn(`[INSIGHTS] bloco "${p.title}" descartado: ${e.message}`);
        return null;
    }
}

function montarDados(ctx, p, base, valores) {
    const principal = p.fonte ? executar(ctx, p.fonte, base) : null;

    switch (p.type) {
        case 'kpi': {
            if (!p.fonte || vazio(principal) || !p.campo) return null;
            const alvo = selecionar(principal, p.item);
            const valor = pegar(alvo, p.campo);
            if (typeof valor !== 'number') return null;
            // Para o resumo do período, a comparação com o anterior vem junto
            const anterior = p.fonte.fn === 'resumoPeriodo' ? pegar(alvo.anterior, p.campo) : undefined;
            const formato = p.formato || (p.campo.toLowerCase().includes('pct') || p.campo === 'taxaPoupanca' ? 'pct' : 'moeda');
            // Para métricas que já são %, a comparação é a diferença em pontos (p.p.), não % de %
            const variacaoPct = typeof anterior !== 'number' ? null : formato === 'pct' ? Math.round((valor - anterior) * 10) / 10 : anterior > 0 ? Math.round(((valor - anterior) / anterior) * 1000) / 10 : null;
            return { valor, formato, anterior: anterior ?? null, variacaoPct, campo: p.campo };
        }

        case 'chart':
        case 'table': {
            if (!p.fonte || vazio(principal) || !Array.isArray(principal)) return null;
            let linhas = principal;
            let forma = FORMAS[p.fonte.fn];
            if (p.fonte.fn === 'serieMensal') ({ linhas, forma } = formaSerieMensal(p.fonte.args || {}, principal));
            if (!forma) return null;
            if (linhas.every((l) => forma.series.every(([k]) => !l[k]))) return null;
            const series = forma.series.map(([chave, rotulo]) => ({ chave, rotulo }));
            if (p.type === 'chart') {
                const subtipo = p.subtipo || (p.fonte.fn === 'serieMensal' ? 'line' : 'bar');
                return {
                    subtipo: subtipo === 'donut' && series.length > 1 ? 'bar' : subtipo,
                    series,
                    pontos: linhas.map((l) => ({ rotulo: String(l[forma.rotulo]), ...Object.fromEntries(series.map((s) => [s.chave, l[s.chave] ?? 0])) })),
                    formato: 'moeda',
                };
            }
            const colunas = [
                { chave: forma.rotulo, rotulo: forma.rotulo === 'mes' ? 'Mês' : 'Item', formato: 'texto' },
                ...series.map((s) => ({ chave: s.chave, rotulo: s.rotulo, formato: 'moeda' })),
                ...forma.extras.map(([chave, rotulo, formato]) => ({ chave, rotulo, formato })),
            ];
            const destaque = p.item ? linhas.findIndex((l) => Object.entries(p.item).every(([k, v]) => String(l[k]).toLowerCase() === String(v).toLowerCase())) : -1;
            return { colunas, linhas: linhas.map((l) => Object.fromEntries(colunas.map((c) => [c.chave, l[c.chave] ?? null]))), destaque: destaque >= 0 ? [destaque] : [] };
        }

        case 'tip':
        case 'challenge': {
            if (!p.texto) return null;
            const economia = p.economia ? valores[p.economia] : null;
            if (p.economia && !economia) return null;
            return {
                texto: preencher(p.texto, valores),
                nivel: p.nivel || 'info',
                economia: economia ? economia.valor : null,
                duracaoDias: p.type === 'challenge' ? p.duracaoDias || 7 : undefined,
            };
        }

        case 'story': {
            const slides = (p.slides || []).map((s) => preencher(s, valores)).filter(Boolean);
            if (!slides.length) return null;
            const kpis = (p.kpis || [])
                .map((k) => (valores[k.valor] ? { rotulo: k.rotulo, valor: valores[k.valor].valor, formato: valores[k.valor].formato } : null))
                .filter(Boolean);
            return { slides, kpis };
        }

        case 'anomaly': {
            const lista = p.fonte?.fn === 'anomalias' ? principal : executar(ctx, { fn: 'anomalias', args: {} }, base);
            if (vazio(lista)) return null;
            const alvo = selecionar(lista, p.item);
            if (!alvo) return null;
            return { ...alvo, texto: p.texto ? preencher(p.texto, valores) : null };
        }

        case 'forecast': {
            const proj = executar(ctx, { fn: 'projecaoFimMes', args: {} }, base);
            if (!proj) return null;
            return { ...proj, texto: p.texto ? preencher(p.texto, valores) : null };
        }

        case 'goal': {
            if (p.fonte?.fn === 'metas' || p.item) {
                const lista = executar(ctx, { fn: 'metas', args: {} }, base);
                const alvo = selecionar(lista, p.item);
                if (!alvo) return null;
                return { ...alvo, sugestao: false, texto: p.texto ? preencher(p.texto, valores) : null };
            }
            // Sugestão de meta nova: texto + um valor de referência obrigatório
            if (!p.texto) return null;
            const ref = p.economia ? valores[p.economia] : Object.values(valores)[0];
            if (!ref) return null;
            return { sugestao: true, texto: preencher(p.texto, valores), valorSugerido: ref.valor };
        }

        case 'comparison': {
            const lista = p.fonte?.fn === 'comparativoPeriodos' ? principal : executar(ctx, { fn: 'comparativoPeriodos', args: p.fonte?.args || {} }, base);
            if (vazio(lista)) return null;
            const per = p.fonte?.args?.periodo ? resolverPeriodo(p.fonte.args.periodo, ctx.hoje) : base;
            return { periodoA: { inicio: per.inicio, fim: per.fim }, periodoB: per.anterior, linhas: lista, texto: p.texto ? preencher(p.texto, valores) : null };
        }
        default:
            return null;
    }
}

// Texto para a IA: o catálogo de funções e os campos que cada uma devolve
export function catalogoParaIA() {
    return Object.entries(funcoes)
        .map(([nome, f]) => `- ${nome}${f.args}: ${f.descricao}`)
        .join('\n');
}
