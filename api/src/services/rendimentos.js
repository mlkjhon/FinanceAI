import { BD } from '../../db.js';

// Fallbacks caso a BrasilAPI esteja fora do ar
const TAXAS_PADRAO = {
    cdi: 10.5, selic: 10.5, ipca: 4.5, igpm: 4.0, inpc: 4.5, tr: 1.5,
    ibovespa: 10.0, ifix: 8.0, sp500: 10.0, nasdaq: 12.0, dowjones: 9.0,
    bitcoin: 50.0, ethereum: 40.0, dolar: 3.0, euro: 2.0, libor: 5.0,
    sofr: 5.0, euribor: 3.5, tlp: 6.0, tjlp: 6.5, tbf: 10.0
};

// Cache das taxas por 1 hora para nao chamar a BrasilAPI a cada requisicao
let cacheTaxas = null;
let cacheTaxasEm = 0;

export const buscarTaxasAtuais = async () => {
    if (cacheTaxas && Date.now() - cacheTaxasEm < 60 * 60 * 1000) return cacheTaxas;

    const taxas = { ...TAXAS_PADRAO };
    try {
        const response = await fetch('https://brasilapi.com.br/api/taxas/v1', { signal: AbortSignal.timeout(3000) });
        const lista = await response.json();
        const getTaxa = (nome) => lista.find(t => t.nome.toLowerCase() === nome)?.valor;

        for (const nome of ['cdi', 'selic', 'ipca']) {
            const valor = getTaxa(nome);
            if (valor) taxas[nome] = valor;
        }
    } catch (err) {
        console.warn('⚠️ [RENDIMENTOS] Erro ao buscar taxas da BrasilAPI, usando fallback.', err.message);
    }

    cacheTaxas = taxas;
    cacheTaxasEm = Date.now();
    return taxas;
};

// Calcula a taxa anual efetiva (%) de um investimento com base no indexador
export const calcularTaxaAnual = (inv, taxasAtuais) => {
    let taxaAnual = parseFloat(inv.taxa_rendimento); // Ex: 120 (para 120% CDI) ou 10 (para 10% Prefixado)
    const indexador = (inv.indexador || 'PREFIXADO').toUpperCase();

    if (indexador === 'CDI') {
        taxaAnual = (taxaAnual / 100) * taxasAtuais.cdi;
    } else if (indexador === 'SELIC') {
        taxaAnual = (taxaAnual / 100) * taxasAtuais.selic;
    } else if (indexador === 'IPCA') {
        taxaAnual = taxasAtuais.ipca + taxaAnual;
    } else if (indexador === 'IGPM') {
        taxaAnual = taxasAtuais.igpm + taxaAnual;
    } else if (indexador === 'INPC') {
        taxaAnual = taxasAtuais.inpc + taxaAnual;
    } else if (indexador === 'IBOVESPA') {
        taxaAnual = (taxaAnual / 100) * taxasAtuais.ibovespa;
    } else if (indexador === 'TR') {
        taxaAnual = taxasAtuais.tr + taxaAnual;
    } else if (['TLP', 'TJLP', 'TBF'].includes(indexador)) {
        taxaAnual = 6.0 + taxaAnual; // Fallback generico
    } else if (['PTAX', 'IMA-B', 'IRF-M', 'IDA'].includes(indexador)) {
        taxaAnual = 5.0 + taxaAnual; // Fallback generico
    } else if (indexador === 'POUPANCA' || indexador === 'POUPANÇA') {
        // Regra da Poupança: se Selic > 8.5%, rende 6.17% (0.5% a.m.) + TR. Senão, 70% da Selic + TR
        const rendimentoBase = taxasAtuais.selic > 8.5 ? 6.17 : (taxasAtuais.selic * 0.70);
        taxaAnual = (taxaAnual / 100) * (rendimentoBase + taxasAtuais.tr);
    }
    // PREFIXADO mantem a taxa inserida

    return taxaAnual;
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
