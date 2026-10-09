import { z } from 'zod';
import { funcoes, resolverPeriodo, descricoesQueCasam } from './insightsData.js';

/*
 * Blocos dos Insights. A IA devolve "pedidos de bloco" (BlocoPedido): tipo,
 * título, e de qual função de dados os números vêm. Aqui o pedido vira um bloco
 * pronto, com os números calculados pelo servidor. Pedido que não resolve
 * (função vazia, item inexistente, número escrito à mão no texto) é descartado.
 */

// tip e challenge ficam no schema só para análises antigas salvas (e são descartados)
export const TIPOS = ['kpi', 'chart', 'table', 'tip', 'story', 'anomaly', 'forecast', 'goal', 'comparison', 'challenge', 'action'];
export const ACOES = ['criar_meta', 'depositar_meta', 'criar_orcamento', 'aportar', 'criar_investimento'];
const TIPOS_INVESTIMENTO = ['CDB', 'LCI / LCA', 'Tesouro Direto', 'Poupança', 'Fundos de Investimento', 'Previdência Privada'];
const INDEXADORES = ['CDI', 'SELIC', 'IPCA', 'POUPANCA', 'PREFIXADO'];
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
    // blocos de ação
    acao: z.enum(ACOES).optional(),
    alvo: z.string().max(80).optional(),
    // nome de um valor declarado em "valores" OU a referência direto (fn + campo)
    valorBase: z.union([z.string(), Ref]).optional(),
    fator: z.number().min(0.01).max(24).optional(),
    nomeSugerido: z.string().max(60).optional(),
    dataObjetivo: z.string().regex(/^d{4}-d{2}-d{2}$/).optional(),
    tipoInvestimento: z.enum(TIPOS_INVESTIMENTO).optional(),
    indexador: z.enum(INDEXADORES).optional(),
    taxa: z.number().min(0.1).max(200).optional(),
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
        const { inclui, nota } = transparencia(ctx, p, base);
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
            ...(inclui ? { inclui } : {}),
            ...(nota ? { nota } : {}),
        };
    } catch (e) {
        console.warn(`[INSIGHTS] bloco "${p.title}" descartado: ${e.message}`);
        return null;
    }
}

/*
 * O que o bloco considerou, para o usuário conferir:
 * - buscas por termos (delivery, uber...) listam os lançamentos que entraram;
 * - blocos de "gastos" avisam quanto foi para investimentos/metas, que o
 *   Dashboard conta como saída e aqui não entra como gasto.
 */
function transparencia(ctx, p, base) {
    const fontes = [p.fonte, ...Object.values(p.valores || {})].filter(Boolean);
    const termos = [...new Set(fontes.flatMap((f) => f.args?.termos || []))];
    let inclui = null;
    if (termos.length) {
        const meses = fontes.find((f) => f.fn === 'serieMensal')?.args?.meses;
        let inicio = base.inicio;
        if (meses) {
            const [y, m] = ctx.hoje.split('-').map(Number);
            inicio = new Date(Date.UTC(y, m - Math.min(Math.max(meses, 2), 12), 1)).toISOString().slice(0, 10);
        }
        inclui = descricoesQueCasam(ctx, termos, inicio).slice(0, 8);
    }
    const usaGastos = fontes.some((f) => f.fn === 'resumoPeriodo' && (f.campo === 'saidas' || p.campo === 'saidas')) || p.type === 'story';
    let nota = null;
    if (usaGastos) {
        const guardado = funcoes.resumoPeriodo.run(ctx, {}, base).guardado;
        if (guardado > 0) nota = `Gastos sem contar ${formatar(guardado)} que foram para investimentos e metas (no Dashboard eles entram como saída).`;
    }
    return { inclui, nota };
}

// Valor redondo para uma sugestão (R$ 437,18 vira R$ 440): é uma proposta, não um extrato
function arredondarSugestao(v) {
    const passo = v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 50 : 100;
    return Math.max(passo, Math.round(v / passo) * passo);
}

const igual = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/*
 * Bloco de ação: a IA propõe, o servidor confere tudo contra os dados reais.
 * O valor é sempre uma função de dados (valorBase) vezes um fator escolhido
 * pela IA (ex.: 6x o gasto mensal para a reserva de emergência). Ação que
 * aponta para meta, categoria ou investimento inexistente é descartada.
 */
function montarAcao(ctx, p, valores, periodoBase) {
    if (!p.acao || !p.texto) return null;
    const texto = preencher(p.texto, valores);
    const base = !p.valorBase ? null : typeof p.valorBase === 'string' ? valores[p.valorBase] : resolverRef(ctx, p.valorBase, periodoBase);
    const valor = base && base.valor > 0 ? arredondarSugestao(base.valor * (p.fator ?? 1)) : null;
    const hoje = ctx.hoje;

    switch (p.acao) {
        case 'criar_meta': {
            if (!p.nomeSugerido || !valor) return null;
            if (ctx.metas.some((m) => igual(m.titulo, p.nomeSugerido))) return null;
            const data = p.dataObjetivo && p.dataObjetivo > hoje ? p.dataObjetivo : null;
            return { acao: p.acao, texto, titulo: p.nomeSugerido, valor, dataObjetivo: data };
        }
        case 'depositar_meta': {
            const meta = ctx.metas.find((m) => igual(m.titulo, p.alvo));
            if (!meta || !valor) return null;
            const falta = Math.max(meta.valor_meta - meta.valor_atual, 0);
            if (falta <= 0) return null;
            return { acao: p.acao, texto, alvoId: String(meta.id_meta), titulo: meta.titulo, valor: Math.min(valor, Math.ceil(falta)), falta };
        }
        case 'criar_orcamento': {
            const cat = ctx.categorias.find((c) => igual(c.nome, p.alvo) && ['S', 'despesa'].includes(c.tipo));
            if (!cat || !valor) return null;
            const [y, m] = hoje.split('-').map(Number);
            const jaTem = ctx.orcamentos.some((o) => igual(o.categoria, cat.nome) && Number(o.mes) === m && Number(o.ano) === y);
            if (jaTem) return null;
            return { acao: p.acao, texto, alvoId: String(cat.id_categoria), titulo: cat.nome, valor, mes: m, ano: y };
        }
        case 'aportar': {
            const inv = ctx.investimentos.find((i) => igual(i.nome, p.alvo));
            if (!inv || !valor) return null;
            return { acao: p.acao, texto, alvoId: String(inv.id_investimento), titulo: inv.nome, valor };
        }
        case 'criar_investimento': {
            if (!p.nomeSugerido || !p.tipoInvestimento || !p.indexador || !p.taxa) return null;
            if (ctx.investimentos.some((i) => igual(i.nome, p.nomeSugerido))) return null;
            return { acao: p.acao, texto, titulo: p.nomeSugerido, tipoInvestimento: p.tipoInvestimento, indexador: p.indexador, taxa: p.taxa, valor: null };
        }
        default:
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

        // Dicas e desafios em texto foram substituídos por blocos de ação
        case 'tip':
        case 'challenge':
            return null;

        case 'action':
            return montarAcao(ctx, p, valores, base);

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
            // os números do próprio bloco podem aparecer no texto ({{atual}}, {{media}}, {{variacaoPct}})
            const proprios = { atual: { valor: alvo.atual, formato: 'moeda' }, media: { valor: alvo.media, formato: 'moeda' }, variacaoPct: { valor: alvo.variacaoPct, formato: 'pct' } };
            return { ...alvo, texto: p.texto ? preencher(p.texto, { ...proprios, ...valores }) : null };
        }

        case 'forecast': {
            const proj = executar(ctx, { fn: 'projecaoFimMes', args: {} }, base);
            if (!proj) return null;
            const proprios = Object.fromEntries(['projecao', 'gastoAteHoje', 'mediaAnteriores', 'diferenca'].map((k) => [k, { valor: Math.abs(proj[k]), formato: 'moeda' }]));
            return { ...proj, texto: p.texto ? preencher(p.texto, { ...proprios, ...valores }) : null };
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
