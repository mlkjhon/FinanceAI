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

        // Saldo TOTAL (todos os tempos) para o card principal
        const selecaoSaldoTotal = `
        SELECT
            COALESCE(SUM(CASE WHEN t.tipo = 'E' THEN t.valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.tipo = 'S' THEN t.valor ELSE 0 END), 0) AS saldo_total
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

        const selecaoEvolucaoMensal = `
        SELECT
           TO_CHAR(t.data_registro, 'MM/YYYY') AS mes,
           COALESCE(SUM(CASE WHEN ${ENTRADA} THEN t.valor ELSE 0 END), 0) AS entradas,
           COALESCE(SUM(CASE WHEN ${SAIDA} THEN t.valor ELSE 0 END), 0) AS saidas,
           ${GUARDADO} AS guardado,
           -- saldo do mês: tudo o que mexeu na conta (inclusive transferências)
           COALESCE(SUM(CASE WHEN t.tipo = 'E' THEN t.valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.tipo = 'S' THEN t.valor ELSE 0 END), 0) AS saldo
        FROM transacoes t
        WHERE DATE_TRUNC('month', t.data_registro) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months' AND t.id_usuario = $1 ${filtroConexao}
        GROUP BY mes
        ORDER BY mes
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
