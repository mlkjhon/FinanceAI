import { BD } from '../../db.js';

/*
 * Taxas de mercado usadas no rendimento diário e na tela de investimentos.
 * - BrasilAPI (/taxas/v1): CDI, Selic e IPCA 12 meses.
 * - Banco Central, API SGS: IGP-M e INPC (12 meses compostos), TR e poupança
 *   (% ao mês, anualizadas) e TJLP (% ao ano).
 * Indexadores sem fonte pública simples ficam com valor de referência e são
 * marcados como "estimativa" para a tela não fingir que é dado oficial.
 */
const ESTIMATIVAS = {
    cdi: 10.5, selic: 10.5, ipca: 4.5, igpm: 4.0, inpc: 4.5, tr: 1.5, poupanca: 6.17, tjlp: 6.5,
    ibovespa: 10.0, tlp: 6.0, tbf: 10.0, ptax: 5.0, imab: 5.0, irfm: 5.0, ida: 5.0,
};

const SGS = {
    igpm: { serie: 189, tipo: 'mensal12' },
    inpc: { serie: 188, tipo: 'mensal12' },
    tr: { serie: 226, tipo: 'aoMes' },
    poupanca: { serie: 195, tipo: 'aoMes' },
    tjlp: { serie: 256, tipo: 'aoAno' },
};

const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;

async function buscarSGS(serie, n) {
    const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/${n}?formato=json`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`SGS ${serie}: HTTP ${r.status}`);
    const dados = await r.json();
    return dados.map((d) => ({ data: d.data, valor: parseFloat(d.valor) })).filter((d) => Number.isFinite(d.valor));
}

async function taxaSGS({ serie, tipo }) {
    if (tipo === 'mensal12') {
        const meses = await buscarSGS(serie, 12);
        if (meses.length < 12) throw new Error(`SGS ${serie}: poucos meses`);
        return { valor: arred((meses.reduce((acc, m) => acc * (1 + m.valor / 100), 1) - 1) * 100), referencia: `12 meses até ${meses.at(-1).data.slice(3)}` };
    }
    // TR e poupança vêm uma linha por dia de aniversário; pega a mais recente
    const linhas = await buscarSGS(serie, 3);
    const ultima = linhas.sort((a, b) => b.data.split('/').reverse().join('').localeCompare(a.data.split('/').reverse().join('')))[0];
    if (!ultima) throw new Error(`SGS ${serie}: vazio`);
    if (tipo === 'aoAno') return { valor: ultima.valor, referencia: ultima.data };
    return { valor: arred((Math.pow(1 + ultima.valor / 100, 12) - 1) * 100), referencia: ultima.data };
}

// Cache de 6 horas: essas taxas mudam no máximo uma vez por dia
let cache = null;
let cacheEm = 0;

export const buscarTaxasDetalhadas = async () => {
    if (cache && Date.now() - cacheEm < 6 * 60 * 60 * 1000) return cache;

    const taxas = Object.fromEntries(Object.entries(ESTIMATIVAS).map(([k, v]) => [k, { valor: v, fonte: 'estimativa', referencia: null }]));

    const brasil = fetch('https://brasilapi.com.br/api/taxas/v1', { signal: AbortSignal.timeout(4000) })
        .then((r) => r.json())
        .then((lista) => {
            for (const nome of ['cdi', 'selic', 'ipca']) {
                const v = lista.find((t) => t.nome.toLowerCase() === nome)?.valor;
                if (v) taxas[nome] = { valor: v, fonte: 'BrasilAPI', referencia: nome === 'ipca' ? '12 meses' : 'ao ano' };
            }
        })
        .catch((err) => console.warn('⚠️ [TAXAS] BrasilAPI indisponível, usando estimativa:', err.message));

    const bcb = Object.entries(SGS).map(([nome, cfg]) =>
        taxaSGS(cfg)
            .then(({ valor, referencia }) => { taxas[nome] = { valor, fonte: 'Banco Central', referencia }; })
            .catch((err) => console.warn(`⚠️ [TAXAS] ${nome} indisponível, usando estimativa:`, err.message))
    );

    await Promise.all([brasil, ...bcb]);
    cache = { taxas, atualizadoEm: new Date().toISOString() };
    cacheEm = Date.now();
    return cache;
};

// Formato antigo (só os números), usado pelo rendimento diário
export const buscarTaxasAtuais = async () => {
    const { taxas } = await buscarTaxasDetalhadas();
    return Object.fromEntries(Object.entries(taxas).map(([k, t]) => [k, t.valor]));
};

/*
 * Como cada indexador vira taxa ao ano. "percentual": o usuário informa % do
 * índice (110% do CDI). "spread": índice + taxa fixa (IPCA + 6%).
 */
export const INDEXADORES = {
    PREFIXADO: { regra: 'prefixado' },
    CDI: { regra: 'percentual', base: 'cdi' },
    SELIC: { regra: 'percentual', base: 'selic' },
    POUPANCA: { regra: 'percentual', base: 'poupanca' },
    IBOVESPA: { regra: 'percentual', base: 'ibovespa' },
    IPCA: { regra: 'spread', base: 'ipca' },
    IGPM: { regra: 'spread', base: 'igpm' },
    INPC: { regra: 'spread', base: 'inpc' },
    TR: { regra: 'spread', base: 'tr' },
    TJLP: { regra: 'spread', base: 'tjlp' },
    TLP: { regra: 'spread', base: 'tlp' },
    TBF: { regra: 'spread', base: 'tbf' },
    PTAX: { regra: 'spread', base: 'ptax' },
    'IMA-B': { regra: 'spread', base: 'imab' },
    'IRF-M': { regra: 'spread', base: 'irfm' },
    IDA: { regra: 'spread', base: 'ida' },
};

const normalizarIndexador = (i) => {
    const up = (i || 'PREFIXADO').toUpperCase();
    return up === 'POUPANÇA' ? 'POUPANCA' : up;
};

// Calcula a taxa anual efetiva (%) de um investimento com base no indexador
export const calcularTaxaAnual = (inv, taxasAtuais) => {
    const taxa = parseFloat(inv.taxa_rendimento) || 0; // Ex: 120 (para 120% CDI) ou 10 (para 10% Prefixado)
    const cfg = INDEXADORES[normalizarIndexador(inv.indexador)] || INDEXADORES.PREFIXADO;
    if (cfg.regra === 'prefixado') return taxa;
    const base = taxasAtuais[cfg.base] ?? ESTIMATIVAS[cfg.base] ?? 0;
    return cfg.regra === 'percentual' ? (taxa / 100) * base : base + taxa;
};

// Simulação para a tela: taxa efetiva, de onde veio a base e quanto rende
export const simularInvestimento = async ({ indexador, taxa, valor = 1000 }) => {
    const { taxas, atualizadoEm } = await buscarTaxasDetalhadas();
    const nome = normalizarIndexador(indexador);
    const cfg = INDEXADORES[nome] || INDEXADORES.PREFIXADO;
    const base = cfg.base ? taxas[cfg.base] : null;
    const numeros = Object.fromEntries(Object.entries(taxas).map(([k, t]) => [k, t.valor]));
    const taxaAnual = calcularTaxaAnual({ taxa_rendimento: taxa, indexador: nome }, numeros);
    // Mesma conta do crédito diário: taxa anual / 365, aplicada ao saldo
    const porDia = (valor * taxaAnual) / 100 / 365;
    return {
        indexador: nome,
        regra: cfg.regra,
        base: base ? { nome: cfg.base, ...base } : null,
        taxaAnual: arred(taxaAnual),
        exemplo: { valor, porDia: arred(porDia, 4), porMes: arred(porDia * 30), porAno: arred(porDia * 365) },
        atualizadoEm,
    };
};

// 'YYYY-MM-DD' + n dias (aritmetica de calendario pura, sem fuso)
const somarDias = (dia, n) => {
    const d = new Date(`${dia}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/**
 * Credita no investimento o rendimento de cada dia que ja terminou e ainda nao foi creditado.
 * Funciona como "catch-up": nao depende de um processo rodando a meia-noite (a API roda na Vercel,
 * que e serverless), entao sempre que o investimento e consultado os dias pendentes sao lancados.
 */
const processarInvestimento = async (inv, taxasAtuais) => {
    const taxaAnual = calcularTaxaAnual(inv, taxasAtuais);
    if (!(taxaAnual > 0)) return 0;
    const taxaDiaria = taxaAnual / 365;

    const cliente = await BD.connect();
    try {
        await cliente.query('BEGIN');
        // Dias sao contados no horario de Brasilia
        await cliente.query(`SET LOCAL TIME ZONE 'America/Sao_Paulo'`);
        // Evita que duas requisicoes simultaneas creditem o mesmo dia duas vezes
        await cliente.query('SELECT pg_advisory_xact_lock(7301, $1)', [inv.id_investimento]);

        const hojeQuery = await cliente.query(`SELECT to_char(now(), 'YYYY-MM-DD') AS hoje`);
        const hoje = hojeQuery.rows[0].hoje;

        // Movimentacao liquida por dia (aportes + rendimentos - resgates)
        const diasQuery = await cliente.query(
            `SELECT to_char(data_registro, 'YYYY-MM-DD') AS dia,
                    SUM(CASE WHEN tipo IN ('aporte', 'rendimento') THEN valor ELSE -valor END) AS movimento,
                    BOOL_OR(tipo = 'rendimento') AS tem_rendimento
             FROM transacoes_investimentos
             WHERE id_investimento = $1
             GROUP BY 1
             ORDER BY 1`,
            [inv.id_investimento]
        );
        const dias = diasQuery.rows;
        if (dias.length === 0) {
            await cliente.query('COMMIT');
            return 0;
        }

        // Comeca no dia seguinte ao ultimo rendimento creditado, ou no dia do primeiro aporte
        const ultimoRendimento = [...dias].reverse().find(d => d.tem_rendimento);
        let dia = ultimoRendimento ? somarDias(ultimoRendimento.dia, 1) : dias[0].dia;

        let saldo = dias
            .filter(d => d.dia < dia)
            .reduce((total, d) => total + parseFloat(d.movimento), 0);
        const movimentoPorDia = new Map(dias.map(d => [d.dia, parseFloat(d.movimento)]));

        const novos = [];
        // So credita dias que ja terminaram (ate ontem)
        while (dia < hoje) {
            saldo += movimentoPorDia.get(dia) || 0;
            if (saldo > 0) {
                const valorRendimento = Number(((saldo * taxaDiaria) / 100).toFixed(4));
                if (valorRendimento > 0) {
                    novos.push([dia, valorRendimento]);
                    saldo += valorRendimento; // juros compostos: o rendimento de hoje rende amanha
                }
            }
            dia = somarDias(dia, 1);
        }

        // Insere em lotes. 20:59:59 de Brasilia = 23:59:59 UTC, entao o dia exibido e o mesmo
        // seja a coluna timestamp ou timestamptz (o front le a data pela string ISO)
        for (let i = 0; i < novos.length; i += 500) {
            const lote = novos.slice(i, i + 500);
            const valores = lote.map((_, j) => `($1, 'rendimento', $${j * 2 + 2}, ($${j * 2 + 3}::date + time '20:59:59'))`);
            const params = [inv.id_investimento, ...lote.flatMap(([d, v]) => [v, d])];
            await cliente.query(
                `INSERT INTO transacoes_investimentos (id_investimento, tipo, valor, data_registro) VALUES ${valores.join(', ')}`,
                params
            );
        }

        await cliente.query('COMMIT');
        return novos.length;
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
};

// Processa os rendimentos pendentes. Sem id_usuario, processa todos os investimentos (usado pelo cron).
export const processarRendimentosPendentes = async ({ id_usuario, id_investimento } = {}) => {
    const filtros = ['taxa_rendimento > 0'];
    const params = [];
    if (id_usuario) { params.push(id_usuario); filtros.push(`id_usuario = $${params.length}`); }
    if (id_investimento) { params.push(id_investimento); filtros.push(`id_investimento = $${params.length}`); }

    const investimentos = await BD.query(
        `SELECT id_investimento, taxa_rendimento, indexador FROM investimentos WHERE ${filtros.join(' AND ')}`,
        params
    );
    if (investimentos.rowCount === 0) return 0;

    const taxasAtuais = await buscarTaxasAtuais();
    let total = 0;
    for (const inv of investimentos.rows) {
        try {
            total += await processarInvestimento(inv, taxasAtuais);
        } catch (error) {
            console.error(`❌ [RENDIMENTOS] Erro no investimento ${inv.id_investimento}:`, error.message);
        }
    }
    return total;
};
