import { Router } from "express"
import { BD } from "../../db.js"
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

/*
 * Transferências: dinheiro mudando de lugar (aporte/resgate de investimento,
 * depósito/devolução de meta). Mexem no saldo, mas não são renda nem gasto.
 * Entrou/Saiu e "para onde foi o dinheiro" ignoram; "guardado" mostra o líquido.
 */
const TRANSF = `(t.descricao LIKE '[INV%' OR t.descricao LIKE 'Investido na meta:%' OR t.descricao LIKE 'Devolvido da meta:%' OR t.descricao LIKE '%(investimento encerrado)')`;
const ENTRADA = `t.tipo = 'E' AND NOT ${TRANSF}`;
const SAIDA = `t.tipo = 'S' AND NOT ${TRANSF}`;
// o que foi para metas/investimentos menos o que voltou deles
const GUARDADO = `COALESCE(SUM(CASE WHEN ${TRANSF} AND t.tipo = 'S' THEN t.valor WHEN ${TRANSF} AND t.tipo = 'E' THEN -t.valor ELSE 0 END), 0)`;

router.get('/dashboard', autenticar, async (req, res) => {
    const { id_conexao } = req.query;
    const id_usuario = req.usuario.id;

    try{
        let filtroConexao = '';
        let params = [id_usuario];
        if (id_conexao && id_conexao === 'manual') {
            filtroConexao = ` AND t.id_conta IS NULL`;
        } else if (id_conexao && id_conexao !== 'all') {
            filtroConexao = ` AND t.id_conta IN (SELECT id FROM contas_cartoes WHERE id_conexao = $2)`;
            params.push(id_conexao);
        }

        // Saldo do card principal: "agora" ignora lançamentos com data no futuro;
        // o total (com eles) serve para mostrar quanto ainda vai entrar/sair
        const selecaoSaldoTotal = `
        SELECT
            COALESCE(SUM(CASE WHEN t.tipo = 'E' THEN t.valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.tipo = 'S' THEN t.valor ELSE 0 END), 0) AS saldo_total,
            COALESCE(SUM(CASE WHEN t.data_registro > NOW() THEN 0 WHEN t.tipo = 'E' THEN t.valor ELSE -t.valor END), 0) AS saldo_agora
        FROM transacoes t
        WHERE t.id_usuario = $1 ${filtroConexao}
        `;

        const selecaoMaioresGastos = `
        SELECT t.descricao, t.valor, TO_CHAR(t.data_registro, 'DD/MM/YYYY') AS data_registro
        FROM transacoes t
        WHERE ${SAIDA} AND t.id_usuario = $1 ${filtroConexao}
        ORDER BY t.valor DESC
        LIMIT 5
        `;

        const selecaoResumoMes = `
        SELECT
            COALESCE(SUM(CASE WHEN ${ENTRADA} THEN t.valor ELSE 0 END), 0) AS entradas,
            COALESCE(SUM(CASE WHEN ${SAIDA} THEN t.valor ELSE 0 END), 0) AS saidas,
            ${GUARDADO} AS guardado,
            COALESCE(SUM(CASE WHEN t.tipo = 'E' THEN t.valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.tipo = 'S' THEN t.valor ELSE 0 END), 0) AS saldo
        FROM transacoes t
        WHERE DATE_TRUNC('month', t.data_registro) = DATE_TRUNC('month', CURRENT_DATE) AND t.id_usuario = $1 ${filtroConexao}
        `;

        // Últimos 6 meses. "saldo" = resultado do mês; "saldo_fim" = quanto havia
        // na conta no fim do mês (soma de toda a história até ali, sem lançamentos futuros)
        const selecaoEvolucaoMensal = `
        WITH por_mes AS (
            SELECT
               DATE_TRUNC('month', t.data_registro) AS inicio,
               COALESCE(SUM(CASE WHEN ${ENTRADA} THEN t.valor ELSE 0 END), 0) AS entradas,
               COALESCE(SUM(CASE WHEN ${SAIDA} THEN t.valor ELSE 0 END), 0) AS saidas,
               ${GUARDADO} AS guardado,
               -- tudo o que mexeu na conta (inclusive transferências)
               COALESCE(SUM(CASE WHEN t.tipo = 'E' THEN t.valor ELSE -t.valor END), 0) AS saldo
            FROM transacoes t
            WHERE t.id_usuario = $1 AND t.data_registro <= NOW() ${filtroConexao}
            GROUP BY 1
        ), acumulado AS (
            SELECT *, SUM(saldo) OVER (ORDER BY inicio) AS saldo_fim FROM por_mes
        )
        SELECT TO_CHAR(inicio, 'MM/YYYY') AS mes, entradas, saidas, guardado, saldo, saldo_fim
        FROM acumulado
        WHERE inicio >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        ORDER BY inicio
        `;

        const selecaoUltimasTransacoes = `
        SELECT
            t.descricao,
            t.valor,
            t.tipo,
            TO_CHAR(t.data_registro, 'DD/MM/YYYY') AS data_registro,
            c.nome AS categoria_nome
        FROM transacoes t
        LEFT JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
        LEFT JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE t.id_usuario = $1 ${filtroConexao}
        ORDER BY t.data_registro DESC, t.id_transacao DESC
        LIMIT 5
        `;


        const selecaoCategorias = `
        SELECT
            COALESCE(c.nome, 'Sem categoria') as nome,
            COALESCE(SUM(t.valor), 0) as total
        FROM transacoes t
        LEFT JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
        LEFT JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE ${SAIDA} AND t.id_usuario = $1 ${filtroConexao}
        GROUP BY COALESCE(c.nome, 'Sem categoria')
        ORDER BY total DESC
        LIMIT 6
        `;

        const resSaldoTotal = await BD.query(selecaoSaldoTotal, params);
        // Dinheiro que é seu mas está fora do saldo: metas e investimentos
        let guardadoMetas = 0, investido = 0;
        try {
            const resFora = await BD.query(`
                SELECT
                    (SELECT COALESCE(SUM(valor_atual), 0) FROM metas_financeiras WHERE id_usuario = $1)::float AS metas,
                    (SELECT COALESCE(SUM(CASE WHEN ti.tipo IN ('aporte','rendimento') THEN ti.valor ELSE -ti.valor END), 0)
                       FROM transacoes_investimentos ti JOIN investimentos i ON i.id_investimento = ti.id_investimento
                      WHERE i.id_usuario = $1)::float AS investido`, [id_usuario]);
            guardadoMetas = resFora.rows[0]?.metas || 0;
            investido = resFora.rows[0]?.investido || 0;
        } catch (_) { /* sem metas/investimentos ainda: fica 0 */ }
        const resMaioresGastos = await BD.query(selecaoMaioresGastos, params);
        const resResumoMes = await BD.query(selecaoResumoMes, params);
        const resEvolucaoMensal = await BD.query(selecaoEvolucaoMensal, params);
        const resUltimasTransacoes = await BD.query(selecaoUltimasTransacoes, params);

        let resumoCategorias = [];
        try {
            const resCategorias = await BD.query(selecaoCategorias, params);
            resumoCategorias = resCategorias.rows;
        } catch (_) {
            resumoCategorias = [];
        }

        const dadosDashboard = {
            resumoCategorias,
            maioresGastos: resMaioresGastos.rows,
            resumoMes: resResumoMes.rows[0] || {entradas:0, saidas:0, saldo:0},
            saldoTotal: resSaldoTotal.rows[0]?.saldo_total || 0,
            saldoAgora: resSaldoTotal.rows[0]?.saldo_agora || 0,
            guardadoMetas,
            investido,
            evolucaoMensal: resEvolucaoMensal.rows,
            ultimasTransacoes: resUltimasTransacoes.rows
        }
        return res.status(200).json(dadosDashboard);

    } catch (error) {
        console.error('Erro no dashboard:', error.message);
        return res.status(500).json({ error: error.message });
    }
})

export default router;
