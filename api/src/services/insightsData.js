import { BD } from '../../db.js';
import { garantirCategoriasPorUsuario } from './categoriasUsuario.js';

/*
 * Funções de dados dos Insights. A IA nunca calcula nada: ela escolhe qual
 * destas funções alimenta cada bloco, e os números saem daqui, dos lançamentos
 * reais do usuário. Tudo trabalha sobre uma lista carregada uma vez por requisição
 * (os últimos 13 meses), então as funções são puras e fáceis de testar.
 */

const MS_DIA = 864e5;
const arred = (v) => Math.round(v * 100) / 100;
const iso = (d) => d.toISOString().slice(0, 10);
const mesDe = (dia) => dia.slice(0, 7);

// Aporte em investimento ou depósito em meta sai da conta, mas não é consumo
const ehTransferencia = (descricao = '') =>
    /^\[INV:\d+\]/.test(descricao) || /^Investido na meta:/i.test(descricao);

export async function carregarContexto(idUsuario, hoje = new Date()) {
    const desde = new Date(hoje.getFullYear(), hoje.getMonth() - 12, 1);
    const [lanc, metas, orc, inv, cats] = await Promise.all([
        BD.query(
            `SELECT t.descricao, t.valor::float AS valor, t.tipo,
                    to_char(t.data_registro, 'YYYY-MM-DD') AS dia,
                    COALESCE(c.nome, 'Sem categoria') AS categoria
             FROM transacoes t
             LEFT JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
             LEFT JOIN categorias c ON s.id_categoria = c.id_categoria
             WHERE t.id_usuario = $1 AND t.data_registro >= $2`,
            [idUsuario, iso(desde)]
        ),
        BD.query(
            `SELECT id_meta, titulo, valor_meta::float AS valor_meta, valor_atual::float AS valor_atual,
                    to_char(data_objetivo, 'YYYY-MM-DD') AS data_objetivo
             FROM metas_financeiras WHERE id_usuario = $1`,
            [idUsuario]
        ),
        BD.query(
            `SELECT c.nome AS categoria, o.valor_limite::float AS limite, o.mes, o.ano
             FROM orcamentos o JOIN categorias c ON o.id_categoria = c.id_categoria
             WHERE o.id_usuario = $1`,
            [idUsuario]
        ),
        BD.query(
            `SELECT i.id_investimento, i.nome, i.tipo,
                    COALESCE((SELECT SUM(CASE WHEN tipo IN ('aporte','rendimento') THEN valor ELSE -valor END)
                              FROM transacoes_investimentos ti WHERE ti.id_investimento = i.id_investimento), 0)::float AS saldo
             FROM investimentos i WHERE i.id_usuario = $1`,
            [idUsuario]
        ).catch(() => ({ rows: [] })),
        // categorias padrão + as do usuário; os blocos de ação usam para criar orçamento
        garantirCategoriasPorUsuario()
            .then(() => BD.query(`SELECT id_categoria, nome, tipo FROM categorias WHERE id_usuario IS NULL OR id_usuario = $1`, [idUsuario]))
            .catch(() => ({ rows: [] })),
    ]);
    return criarContexto({ lancamentos: lanc.rows, metas: metas.rows, orcamentos: orc.rows, investimentos: inv.rows, categorias: cats.rows, hoje });
}

// Separado de carregarContexto para poder testar com dados de exemplo
export function criarContexto({ lancamentos, metas = [], orcamentos = [], investimentos = [], categorias = [], hoje = new Date() }) {
    return {
        hoje: iso(hoje),
        lancamentos: lancamentos.map((l) => ({
            ...l,
            valor: Number(l.valor),
            transferencia: l.tipo === 'S' && ehTransferencia(l.descricao),
        })),
        metas,
        orcamentos,
        investimentos,
        categorias,
    };
}

// ---------- Períodos ----------

/*
 * 'mes' = mês atual até hoje, '3m' = três meses até hoje, 'ano' = ano atual,
 * ou { inicio, fim } personalizado. "anterior" é o mesmo trecho no ciclo anterior:
 * 1 a 20/out compara com 1 a 20/set (e não com os 20 dias corridos antes, que
 * cortariam salário e aluguel do começo do mês e gerariam variações falsas).
 */
function deslocarMeses(isoDia, meses) {
    const [y, m, d] = isoDia.split('-').map(Number);
    const ultimo = new Date(Date.UTC(y, m - 1 + meses + 1, 0)).getUTCDate();
    return iso(new Date(Date.UTC(y, m - 1 + meses, Math.min(d, ultimo), 12)));
}

// k-ésimo período anterior (k = 1 é o imediatamente anterior)
export function periodoAnterior(p, k = 1) {
    if (p.passoMeses) return { inicio: deslocarMeses(p.inicio, -p.passoMeses * k), fim: deslocarMeses(p.fim, -p.passoMeses * k) };
    const ini = new Date(`${p.inicio}T12:00:00Z`).getTime() - p.dias * MS_DIA * k;
    return { inicio: iso(new Date(ini)), fim: iso(new Date(ini + (p.dias - 1) * MS_DIA)) };
}

export function resolverPeriodo(periodo, hojeIso) {
    const hoje = new Date(`${hojeIso}T12:00:00Z`);
    let inicio;
    let fim = hoje;
    let passoMeses = 0;
    if (periodo && typeof periodo === 'object' && periodo.inicio) {
        inicio = new Date(`${periodo.inicio}T12:00:00Z`);
        fim = new Date(`${periodo.fim || hojeIso}T12:00:00Z`);
    } else if (periodo === '3m') {
        inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 2, 1, 12));
        passoMeses = 3;
    } else if (periodo === 'ano') {
        inicio = new Date(Date.UTC(hoje.getUTCFullYear(), 0, 1, 12));
        passoMeses = 12;
    } else {
        inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1, 12));
        passoMeses = 1;
    }
    const p = { inicio: iso(inicio), fim: iso(fim), dias: Math.round((fim - inicio) / MS_DIA) + 1, passoMeses };
    return { ...p, anterior: periodoAnterior(p, 1) };
}

const noPeriodo = (ctx, p) => ctx.lancamentos.filter((l) => l.dia >= p.inicio && l.dia <= p.fim);
const gastos = (lista) => lista.filter((l) => l.tipo === 'S' && !l.transferencia);
const soma = (lista) => arred(lista.reduce((s, l) => s + l.valor, 0));
const variacao = (atual, anterior) => (anterior > 0 ? arred(((atual - anterior) / anterior) * 100) : null);

const mesesAte = (hojeIso, n) => {
    const [y, m] = hojeIso.split('-').map(Number);
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
        return iso(d).slice(0, 7);
    });
};

/*
 * Busca por termos (delivery, uber, streaming...). Antes era "contém o pedaço",
 * e termos curtos casavam com lançamentos que não tinham nada a ver. Agora:
 * sem acento, sem maiúsculas, e só PALAVRA INTEIRA (ou expressão inteira) na
 * descrição ou no nome da categoria. Termos com menos de 3 letras são ignorados.
 */
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regexDoTermo = (termo) => {
    const t = normalizar(termo).trim().replace(/\s+/g, ' ');
    if (t.replace(/\s/g, '').length < 3) return null;
    return new RegExp(`(^|[^a-z0-9])${escaparRegex(t)}([^a-z0-9]|$)`);
};
const casaTermo = (lancamento, termos) => {
    const alvo = `${normalizar(lancamento.descricao)} | ${normalizar(lancamento.categoria)}`;
    return termos.some((x) => {
        const re = regexDoTermo(x);
        return re ? re.test(alvo) : false;
    });
};

// Descrições que entraram numa busca por termos (o bloco mostra o que considerou)
export function descricoesQueCasam(ctx, termos, inicio) {
    const nomes = new Map();
    for (const l of gastos(ctx.lancamentos)) {
        if (inicio && l.dia < inicio) continue;
        if (!casaTermo(l, termos)) continue;
        const chave = normalizar(l.descricao).trim();
        if (!nomes.has(chave)) nomes.set(chave, l.descricao.trim());
    }
    return [...nomes.values()];
}

// ---------- Catálogo ----------

export const funcoes = {
    resumoPeriodo: {
        descricao: 'Entradas, gastos (sem transferências), guardado em investimentos/metas, saldo e taxa de poupança do período, com o período anterior e a variação %',
        args: '{ periodo?: "mes"|"3m"|"ano" }',
        run(ctx, { periodo } = {}, base) {
            const p = periodo ? resolverPeriodo(periodo, ctx.hoje) : base;
            const calc = (pp) => {
                const lista = noPeriodo(ctx, pp);
                const entradas = soma(lista.filter((l) => l.tipo === 'E'));
                const saidas = soma(gastos(lista));
                const guardado = soma(lista.filter((l) => l.transferencia));
                return {
                    entradas,
                    saidas,
                    guardado,
                    saldo: arred(entradas - saidas - guardado),
                    taxaPoupanca: entradas > 0 ? arred(((entradas - saidas) / entradas) * 100) : null,
                    lancamentos: lista.length,
                };
            };
            const atual = calc(p);
            const anterior = calc(p.anterior);
            return {
                ...atual,
                anterior,
                variacaoSaidas: variacao(atual.saidas, anterior.saidas),
                variacaoEntradas: variacao(atual.entradas, anterior.entradas),
                inicio: p.inicio,
                fim: p.fim,
            };
        },
    },

    gastosPorCategoria: {
        descricao: 'Gastos do período agrupados por categoria, do maior para o menor, com % do total e quantidade',
        args: '{ periodo?: "mes"|"3m"|"ano", limite?: number }',
        run(ctx, { periodo, limite = 8 } = {}, base) {
            const p = periodo ? resolverPeriodo(periodo, ctx.hoje) : base;
            const lista = gastos(noPeriodo(ctx, p));
            const total = soma(lista);
            const mapa = new Map();
            for (const l of lista) {
                const g = mapa.get(l.categoria) || { categoria: l.categoria, total: 0, qtd: 0 };
                g.total += l.valor;
                g.qtd += 1;
                mapa.set(l.categoria, g);
            }
            return [...mapa.values()]
                .map((g) => ({ ...g, total: arred(g.total), pct: total > 0 ? arred((g.total / total) * 100) : 0 }))
                .sort((a, b) => b.total - a.total)
                .slice(0, limite);
        },
    },

    serieMensal: {
        descricao: 'Entradas e gastos mês a mês (até 12 meses). Com categoria ou termos, devolve só o total daquele gasto por mês',
        args: '{ meses?: number, categoria?: string, termos?: string[] }',
        run(ctx, { meses = 6, categoria, termos } = {}) {
            const lista = mesesAte(ctx.hoje, Math.min(Math.max(meses, 2), 12));
            return lista.map((mes) => {
                const doMes = ctx.lancamentos.filter((l) => mesDe(l.dia) === mes);
                if (categoria || termos?.length) {
                    const filtrados = gastos(doMes).filter(
                        (l) => (!categoria || l.categoria.toLowerCase() === categoria.toLowerCase()) && (!termos?.length || casaTermo(l, termos))
                    );
                    return { mes, total: soma(filtrados) };
                }
                return { mes, entradas: soma(doMes.filter((l) => l.tipo === 'E')), saidas: soma(gastos(doMes)) };
            });
        },
    },

    topDescricoes: {
        descricao: 'Onde mais se gastou no período, agrupando pela descrição do lançamento (estabelecimentos, serviços)',
        args: '{ periodo?: "mes"|"3m"|"ano", limite?: number, categoria?: string }',
        run(ctx, { periodo, limite = 8, categoria } = {}, base) {
            const p = periodo ? resolverPeriodo(periodo, ctx.hoje) : base;
            const mapa = new Map();
            for (const l of gastos(noPeriodo(ctx, p))) {
                if (categoria && l.categoria.toLowerCase() !== categoria.toLowerCase()) continue;
                const chave = l.descricao.trim().toLowerCase();
                const g = mapa.get(chave) || { descricao: l.descricao.trim(), categoria: l.categoria, total: 0, qtd: 0 };
                g.total += l.valor;
                g.qtd += 1;
                mapa.set(chave, g);
            }
            return [...mapa.values()].map((g) => ({ ...g, total: arred(g.total) })).sort((a, b) => b.total - a.total).slice(0, limite);
        },
    },

    buscarGastos: {
        descricao: 'Total gasto com lançamentos cuja descrição contém algum dos termos (ex.: ["ifood","rappi","delivery"]), no período, com os maiores lançamentos',
        args: '{ termos: string[], periodo?: "mes"|"3m"|"ano" }',
        run(ctx, { termos = [], periodo } = {}, base) {
            if (!termos.length) return null;
            const p = periodo ? resolverPeriodo(periodo, ctx.hoje) : base;
            const lista = gastos(noPeriodo(ctx, p)).filter((l) => casaTermo(l, termos));
            if (!lista.length) return null;
            return {
                total: soma(lista),
                qtd: lista.length,
                media: arred(soma(lista) / lista.length),
                maiores: [...lista].sort((a, b) => b.valor - a.valor).slice(0, 5).map((l) => ({ descricao: l.descricao, dia: l.dia, valor: l.valor })),
            };
        },
    },

    mediaPorCategoria: {
        descricao: 'Média mensal de gasto de cada categoria nos últimos meses completos (base para sugerir orçamento)',
        args: '{ meses?: number }',
        run(ctx, { meses = 3 } = {}) {
            const n = Math.min(Math.max(meses, 1), 12);
            const lista = mesesAte(ctx.hoje, n + 1).slice(0, n); // meses completos, sem o atual
            const mapa = new Map();
            for (const l of gastos(ctx.lancamentos)) {
                if (!lista.includes(mesDe(l.dia))) continue;
                mapa.set(l.categoria, (mapa.get(l.categoria) || 0) + l.valor);
            }
            return [...mapa.entries()].map(([categoria, total]) => ({ categoria, media: arred(total / n) })).sort((a, b) => b.media - a.media);
        },
    },

    recorrencias: {
        descricao: 'Gastos que se repetem em pelo menos 3 dos últimos 6 meses (assinaturas, contas fixas), com média mensal',
        args: '{}',
        run(ctx) {
            const ultimos = new Set(mesesAte(ctx.hoje, 6));
            const mapa = new Map();
            for (const l of gastos(ctx.lancamentos)) {
                if (!ultimos.has(mesDe(l.dia))) continue;
                const chave = l.descricao.trim().toLowerCase();
                const g = mapa.get(chave) || { descricao: l.descricao.trim(), categoria: l.categoria, meses: new Set(), total: 0 };
                g.meses.add(mesDe(l.dia));
                g.total += l.valor;
                mapa.set(chave, g);
            }
            return [...mapa.values()]
                .filter((g) => g.meses.size >= 3)
                .map((g) => ({ descricao: g.descricao, categoria: g.categoria, meses: g.meses.size, mediaMensal: arred(g.total / g.meses.size) }))
                .sort((a, b) => b.mediaMensal - a.mediaMensal);
        },
    },

    anomalias: {
        descricao: 'Categorias em que o gasto do período passou bastante da média do mesmo trecho nos 3 períodos anteriores',
        args: '{ periodo?: "mes"|"3m" }',
        run(ctx, { periodo } = {}, base) {
            const p = periodo ? resolverPeriodo(periodo, ctx.hoje) : base;
            const porCat = (pp) => {
                const m = new Map();
                for (const l of gastos(noPeriodo(ctx, pp))) m.set(l.categoria, (m.get(l.categoria) || 0) + l.valor);
                return m;
            };
            const atual = porCat(p);
            // o mesmo trecho nos 3 ciclos anteriores
            const janelas = [1, 2, 3].map((k) => porCat(periodoAnterior(p, k)));
            const out = [];
            for (const [categoria, valor] of atual) {
                const media = janelas.reduce((s, j) => s + (j.get(categoria) || 0), 0) / 3;
                if (media >= 30 && valor >= media * 1.4 && valor - media >= 50) {
                    out.push({ categoria, atual: arred(valor), media: arred(media), variacaoPct: arred(((valor - media) / media) * 100) });
                }
            }
            return out.sort((a, b) => b.atual - b.media - (a.atual - a.media));
        },
    },

    projecaoFimMes: {
        descricao: 'Projeção dos gastos até o fim do mês: contas fixas contam uma vez (as que faltam pela média), gastos variáveis seguem o ritmo diário. Comparada à média dos 3 meses anteriores',
        args: '{}',
        run(ctx) {
            const [y, m, d] = ctx.hoje.split('-').map(Number);
            const diasNoMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
            const mes = ctx.hoje.slice(0, 7);
            const doMes = gastos(ctx.lancamentos.filter((l) => mesDe(l.dia) === mes && l.dia <= ctx.hoje));
            const ateHoje = soma(doMes);
            if (d < 3 || ateHoje === 0) return null;

            /*
             * Aluguel, assinaturas e contas fixas caem uma vez por mês, quase sempre
             * no começo. Extrapolar o ritmo diário em cima delas multiplica o aluguel
             * pelo mês inteiro. Então: fixas já pagas contam uma vez, fixas que ainda
             * não vieram entram pela média, e só o variável segue o ritmo.
             */
            const fixas = funcoes.recorrencias.run(ctx);
            const chaveDe = (l) => l.descricao.trim().toLowerCase();
            const fixasChaves = new Set(fixas.map((f) => f.descricao.toLowerCase()));
            const pagasNoMes = new Set(doMes.filter((l) => fixasChaves.has(chaveDe(l))).map(chaveDe));
            const fixasPagas = soma(doMes.filter((l) => fixasChaves.has(chaveDe(l))));
            const fixasFaltando = arred(fixas.filter((f) => !pagasNoMes.has(f.descricao.toLowerCase())).reduce((s2, f) => s2 + f.mediaMensal, 0));
            const variavel = arred(ateHoje - fixasPagas);
            const projecao = arred(fixasPagas + fixasFaltando + (variavel / d) * diasNoMes);

            const anteriores = mesesAte(ctx.hoje, 4).slice(0, 3);
            const mediaAnteriores = arred(anteriores.reduce((s2, mm) => s2 + soma(gastos(ctx.lancamentos.filter((l) => mesDe(l.dia) === mm))), 0) / 3);
            return {
                gastoAteHoje: ateHoje,
                diasPassados: d,
                diasNoMes,
                projecao,
                mediaAnteriores,
                diferenca: arred(projecao - mediaAnteriores),
            };
        },
    },

    comparativoPeriodos: {
        descricao: 'Gastos por categoria no período comparados com o período anterior de mesmo tamanho',
        args: '{ periodo?: "mes"|"3m"|"ano", limite?: number }',
        run(ctx, { periodo, limite = 6 } = {}, base) {
            const p = periodo ? resolverPeriodo(periodo, ctx.hoje) : base;
            const porCat = (pp) => {
                const m = new Map();
                for (const l of gastos(noPeriodo(ctx, pp))) m.set(l.categoria, (m.get(l.categoria) || 0) + l.valor);
                return m;
            };
            const a = porCat(p);
            const b = porCat(p.anterior);
            const cats = new Set([...a.keys(), ...b.keys()]);
            return [...cats]
                .map((categoria) => {
                    const atual = arred(a.get(categoria) || 0);
                    const anterior = arred(b.get(categoria) || 0);
                    return { categoria, atual, anterior, diferenca: arred(atual - anterior), variacaoPct: variacao(atual, anterior) };
                })
                .filter((l) => Math.abs(l.diferenca) >= 1)
                .sort((x, y) => Math.abs(y.diferenca) - Math.abs(x.diferenca))
                .slice(0, limite);
        },
    },

    metas: {
        descricao: 'Metas financeiras com valor guardado, valor alvo, % concluído e data',
        args: '{}',
        run(ctx) {
            return ctx.metas.map((m) => ({
                titulo: m.titulo,
                valorMeta: arred(m.valor_meta),
                valorAtual: arred(m.valor_atual),
                falta: arred(Math.max(m.valor_meta - m.valor_atual, 0)),
                pct: m.valor_meta > 0 ? arred(Math.min((m.valor_atual / m.valor_meta) * 100, 100)) : 0,
                dataObjetivo: m.data_objetivo,
            }));
        },
    },

    orcamentos: {
        descricao: 'Orçamentos do mês atual: limite, quanto já foi gasto na categoria e %',
        args: '{}',
        run(ctx) {
            const [y, m] = ctx.hoje.split('-').map(Number);
            const mes = ctx.hoje.slice(0, 7);
            return ctx.orcamentos
                .filter((o) => Number(o.mes) === m && Number(o.ano) === y)
                .map((o) => {
                    const gasto = soma(gastos(ctx.lancamentos).filter((l) => mesDe(l.dia) === mes && l.categoria === o.categoria));
                    return { categoria: o.categoria, limite: arred(o.limite), gasto, pct: o.limite > 0 ? arred((gasto / o.limite) * 100) : 0 };
                });
        },
    },

    investimentos: {
        descricao: 'Investimentos cadastrados com o saldo atual de cada um',
        args: '{}',
        run(ctx) {
            return ctx.investimentos.map((i) => ({ nome: i.nome, tipo: i.tipo, saldo: arred(Number(i.saldo)) })).filter((i) => i.saldo > 0);
        },
    },
};

// Resumo enviado à IA: só agregados, nunca lançamentos individuais
export function snapshot(ctx, base) {
    const run = (fn, args = {}) => funcoes[fn].run(ctx, args, base);
    return {
        periodo: { inicio: base.inicio, fim: base.fim, dias: base.dias },
        resumo: run('resumoPeriodo'),
        categorias: run('gastosPorCategoria'),
        comparativo: run('comparativoPeriodos'),
        ondeMaisGastou: run('topDescricoes', { limite: 6 }),
        recorrencias: run('recorrencias').slice(0, 6),
        anomalias: run('anomalias'),
        projecaoFimMes: run('projecaoFimMes'),
        serieMensal: run('serieMensal', { meses: 6 }),
        metas: run('metas'),
        orcamentos: run('orcamentos'),
        investimentos: run('investimentos'),
        mediaPorCategoria: run('mediaPorCategoria').slice(0, 8),
        // nomes exatos para os alvos dos blocos de ação
        nomesInvestimentos: ctx.investimentos.map((i) => i.nome),
        categoriasDespesa: ctx.categorias.filter((c) => ['S', 'despesa'].includes(c.tipo)).map((c) => c.nome),
    };
}
