import { Router } from "express"
import { BD } from "../../db.js"

const router = Router();

router.get('/dashboard', async (req, res) => {
    const { id_usuario } = req.query;

    if (!id_usuario) {
        return res.status(400).json({ error: 'O id_usuario é obrigatório para o Dashboard.' });
    }

    try{
        const selecaoMaioresGastos = `
        SELECT descricao, valor, TO_CHAR(data_registro, 'DD/MM/YYYY') AS data_registro
        FROM transacoes
        WHERE tipo = 'S' AND id_usuario = $1
        ORDER BY valor DESC
        LIMIT 5
        `;

        const selecaoResumoMes = `
        SELECT 
            COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) AS entradas,
            COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0) AS saidas,
            COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0) AS saldo
        FROM transacoes
        WHERE DATE_TRUNC('month', data_registro) = DATE_TRUNC('month', CURRENT_DATE) AND id_usuario = $1
        `;
        
        const selecaoEvolucaoMensal = `
        SELECT 
           TO_CHAR(data_registro, 'MM/YYYY') AS mes,
           COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) AS entradas,
           COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0) AS saidas,
           COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0) AS saldo
        FROM transacoes
        WHERE DATE_TRUNC('month', data_registro) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months' AND id_usuario = $1
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
        WHERE t.id_usuario = $1
        ORDER BY t.data_registro DESC
        LIMIT 5
        `;

        
        const selecaoCategorias = `
        SELECT 
            COALESCE(c.nome, 'Sem categoria') as nome, 
            COALESCE(SUM(t.valor), 0) as total
        FROM transacoes t
        LEFT JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
        LEFT JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE t.tipo = 'S' AND t.id_usuario = $1 AND t.descricao NOT ILIKE 'Investido na meta:%'
        GROUP BY c.nome
        ORDER BY total DESC
        LIMIT 6
        `;

        const resMaioresGastos = await BD.query(selecaoMaioresGastos, [id_usuario]);
        const resResumoMes = await BD.query(selecaoResumoMes, [id_usuario]);
        const resEvolucaoMensal = await BD.query(selecaoEvolucaoMensal, [id_usuario]);
        const resUltimasTransacoes = await BD.query(selecaoUltimasTransacoes, [id_usuario]);
        
        let resumoCategorias = [];
        try {
            const resCategorias = await BD.query(selecaoCategorias, [id_usuario]);
            resumoCategorias = resCategorias.rows;
        } catch (_) {
            resumoCategorias = [];
        }

        const dadosDashboard = {
            resumoCategorias,
            maioresGastos: resMaioresGastos.rows,
            resumoMes: resResumoMes.rows[0] || {entradas:0, saidas:0, saldo:0},
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
