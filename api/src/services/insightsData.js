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

// Aporte/resgate de investimento e depósito/devolução de meta: dinheiro mudando de lugar,
// não é consumo (saída) nem renda (entrada)
const ehTransferencia = (descricao = '') =>
    /^\[INV(:\d+)?\]/.test(descricao)
    || /^Investido na meta:/i.test(descricao)
    || /^Devolvido da meta:/i.test(descricao)
    || /\(investimento encerrado\)$/i.test(descricao);

export async function carregarContexto(idUsuario, hoje = new Date()) {
    const desde = new Date(hoje.getFullYear(), hoje.getMonth() - 12, 1);
    const [lanc, metas, orc, inv, cats, analises] = await Promise.all([
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
                              FROM transacoes_investimentos ti WHERE ti.id_investimento = i.id_investimento), 0)::float AS saldo,
                    (SELECT to_char(MAX(ti.data_registro), 'YYYY-MM-DD') FROM transacoes_investimentos ti
                      WHERE ti.id_investimento = i.id_investimento AND ti.tipo = 'aporte') AS ultimo_aporte
             FROM investimentos i WHERE i.id_usuario = $1`,
            [idUsuario]
        ).catch(() => ({ rows: [] })),
        // categorias padrão + as do usuário; os blocos de ação usam para criar orçamento
        garantirCategoriasPorUsuario()
            .then(() => BD.query(`SELECT id_categoria, nome, tipo FROM categorias WHERE id_usuario IS NULL OR id_usuario = $1`, [idUsuario]))
            .catch(() => ({ rows: [] })),
        BD.query('SELECT blocos FROM insights_analises WHERE id_usuario = $1', [idUsuario]).catch(() => ({ rows: [] })),
    ]);
    const feitos = analises.rows
        .flatMap((r) => r.blocos || [])
        .filter((b) => b?.feito?.em && b.foto?.data?.acao)
        .map((b) => ({ acao: b.foto.data.acao, alvo: b.foto.data.titulo, em: b.feito.em.slice(0, 10) }));
    return criarContexto({ lancamentos: lanc.rows, metas: metas.rows, orcamentos: orc.rows, investimentos: inv.rows, categorias: cats.rows, feitos, hoje });
}

// Separado de carregarContexto para poder testar com dados de exemplo
export function criarContexto({ lancamentos, metas = [], orcamentos = [], investimentos = [], categorias = [], feitos = [], hoje = new Date() }) {
    return {
        hoje: iso(hoje),
        lancamentos: lancamentos.map((l) => ({
            ...l,
            valor: Number(l.valor),
            transferencia: ehTransferencia(l.descricao),
        })),
        metas,
        orcamentos,
        investimentos,
        categorias,
        feitos,
    };
}

/*
 * Quais ações valem a pena AGORA. A IA só pode sugerir o que estiver liberado aqui,
 * e o servidor confere de novo ao montar o bloco. A ideia: ação só quando é
 * realmente necessária, nunca repetir o que o usuário acabou de fazer.
 * - folgaMes: o que entrou no mês menos TUDO o que saiu (aportes e depósitos já
 *   feitos contam como saída). Sem folga, nada de aportar/depositar/investir.
 * - aporte ou depósito feito há menos de DIAS_SEM_REPETIR dias: não sugere de novo.
 * - meta nova: sem metas em andamento, qualquer uma; com metas, só a reserva de emergência.
 * - orçamento só para categoria sem orçamento com gasto variável que pesa (>= 10%)
 *   ou que está crescendo; conta fixa (aluguel) não entra.
 * - investimento novo só para quem ainda não tem nenhum e costuma sobrar dinheiro.
 */
export const DIAS_SEM_REPETIR = 25;
const mesmoNome = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function necessidades(ctx) {
    const hoje = ctx.hoje;
    const mesAtual = mesDe(hoje);
    const diasAtras = (dia) => (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${String(dia).slice(0, 10)}T12:00:00Z`)) / MS_DIA;
    const recente = (dia) => dia && diasAtras(dia) <= DIAS_SEM_REPETIR;
    const soma = (lista, tipo) => lista.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
    const doMes = (mes) => ctx.lancamentos.filter((l) => mesDe(l.dia) === mes);

    const folgaMes = arred(soma(doMes(mesAtual), 'E') - soma(doMes(mesAtual), 'S'));
    const fechados = [1, 2, 3].map((k) => mesDe(deslocarMeses(hoje, -k)));
    const sobraMedia = arred(fechados.reduce((t, m) => t + soma(doMes(m), 'E') - soma(doMes(m), 'S'), 0) / 3);

    const feitoRecente = (acao, alvo) => (ctx.feitos || []).some((f) => f.acao === acao && (!alvo || mesmoNome(f.alvo, alvo)) && recente(f.em));

    // Aporte: qualquer aporte recente (pelo app ou pela sugestão) já resolve
    const aporteRecente = ctx.lancamentos.some((l) => /^\[INV:\d+\]\s*Aporte/i.test(l.descricao || '') && recente(l.dia))
        || ctx.investimentos.some((i) => recente(i.ultimo_aporte))
        || feitoRecente('aportar');
    const aportar = folgaMes > 0 && ctx.investimentos.length > 0 && !aporteRecente;

    const metasAbertas = ctx.metas.filter((m) => Number(m.valor_atual) < Number(m.valor_meta));
    const depositoRecente = (titulo) =>
        ctx.lancamentos.some((l) => l.descricao === `Investido na meta: ${titulo}` && recente(l.dia)) || feitoRecente('depositar_meta', titulo);
    const depositarEm = folgaMes > 0 ? metasAbertas.filter((m) => !depositoRecente(m.titulo)).map((m) => m.titulo) : [];

    // Meta nova: quem costuma sobrar dinheiro e não tem meta em andamento pode criar qualquer uma;
    // quem já tem metas, só a reserva de emergência (se ainda não existir)
    const temReserva = ctx.metas.some((m) => /reserva|emerg/i.test(m.titulo));
    const criarMeta = sobraMedia > 0 && !feitoRecente('criar_meta') && (metasAbertas.length === 0 || !temReserva);
    const soReserva = metasAbertas.length > 0;

    // Orçamento: média dos 3 meses fechados x o que já foi gasto neste mês
    const [ano, mes] = hoje.split('-').map(Number);
    const comOrcamento = ctx.orcamentos.filter((o) => Number(o.mes) === mes && Number(o.ano) === ano).map((o) => o.categoria);
    const media = {};
    const atual = {};
    const ultimo = {};
    const antes = {};
    for (const l of ctx.lancamentos) {
        if (l.tipo !== 'S' || l.transferencia) continue;
        const m = mesDe(l.dia);
        if (fechados.includes(m)) media[l.categoria] = (media[l.categoria] || 0) + l.valor / 3;
        if (m === fechados[0]) ultimo[l.categoria] = (ultimo[l.categoria] || 0) + l.valor;
        if (m === fechados[1] || m === fechados[2]) antes[l.categoria] = (antes[l.categoria] || 0) + l.valor / 2;
        if (m === mesAtual) atual[l.categoria] = (atual[l.categoria] || 0) + l.valor;
    }
    // Está crescendo: o mês atual já passou 10% da média, ou o último mês fechado
    // veio 20% acima dos dois anteriores. Conta fixa (aluguel igual todo mês) não entra.
    const crescendo = (c) => (atual[c] || 0) > media[c] * 1.1 || (antes[c] > 0 && (ultimo[c] || 0) > antes[c] * 1.2);
    // Gasto variável (mercado, lazer, delivery...) que pesa: >= 10% dos gastos. Conta fixa
    // (mesmo valor nos 3 meses, como aluguel) não precisa de orçamento.
    const porMes = (c) => fechados.map((m) => ctx.lancamentos.filter((l) => l.tipo === 'S' && !l.transferencia && l.categoria === c && mesDe(l.dia) === m).reduce((s, l) => s + l.valor, 0));
    const fixa = (c) => { const v = porMes(c); return v.every((x) => x > 0) && Math.max(...v) <= Math.min(...v) * 1.1; };
    const pesa = (c) => media[c] >= 0.1 * Object.values(media).reduce((a, b) => a + b, 0);
    const orcamentoPara = Object.keys(media)
        .filter((c) => c !== 'Sem categoria' && media[c] >= 50)
        .filter((c) => ctx.categorias.some((k) => mesmoNome(k.nome, c) && ['S', 'despesa'].includes(k.tipo)))
        .filter((c) => !comOrcamento.some((o) => mesmoNome(o, c)) && !feitoRecente('criar_orcamento', c))
        .filter((c) => crescendo(c) || (!fixa(c) && pesa(c)))
        .sort((a, b) => media[b] - media[a])
        .slice(0, 3);

    const criarInvestimento = ctx.investimentos.length === 0 && sobraMedia > 0 && folgaMes > 0 && !feitoRecente('criar_investimento');

    return { folgaMes, sobraMedia, aportar, depositarEm, criarMeta, soReserva, orcamentoPara, criarInvestimento };
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
                const entradas = soma(lista.filter((l) => l.tipo === 'E' && !l.transferencia));
                const saidas = soma(gastos(lista));
                // líquido: o que foi para metas/investimentos menos o que voltou deles
                const guardado = arred(soma(lista.filter((l) => l.transferencia && l.tipo === 'S')) - soma(lista.filter((l) => l.transferencia && l.tipo === 'E')));
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
                return { mes, entradas: soma(doMes.filter((l) => l.tipo === 'E' && !l.transferencia)), saidas: soma(gastos(doMes)) };
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
        // o que dá para sugerir como ação agora (o resto está bloqueado)
        acoesNecessarias: necessidades(ctx),
        // nomes exatos para os alvos dos blocos de ação
        nomesInvestimentos: ctx.investimentos.map((i) => i.nome),
        categoriasDespesa: ctx.categorias.filter((c) => ['S', 'despesa'].includes(c.tipo)).map((c) => c.nome),
    };
}
