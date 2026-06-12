import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();


router.get('/orcamentos', async (req, res) => {
    const { id_usuario } = req.query;

    if (!id_usuario) {
        return res.status(400).json({ error: 'O id_usuario é obrigatório para listar os orçamentos.' });
    }

    try {
       
        const comando = `
            SELECT 
                o.id_orcamento, 
                o.id_categoria, 
                c.nome as categoria_nome, 
                o.mes, 
                o.ano, 
                o.valor_limite,
                COALESCE((
                    SELECT SUM(t.valor) 
                    FROM transacoes t
                    JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
                    WHERE t.tipo = 'S' 
                      AND t.id_usuario = o.id_usuario
                      AND s.id_categoria = o.id_categoria
                      AND t.descricao NOT ILIKE 'Investido na meta:%'
                      AND EXTRACT(MONTH FROM t.data_registro) = o.mes
                      AND EXTRACT(YEAR FROM t.data_registro) = o.ano
                ), 0) AS valor_gasto
            FROM orcamentos o
            JOIN categorias c ON o.id_categoria = c.id_categoria
            WHERE o.id_usuario = $1
            ORDER BY o.ano DESC, o.mes DESC
        `;
        
        const resultado = await BD.query(comando, [id_usuario]);
        return res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar orçamentos:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao buscar orçamentos.' });
    }
});


router.post('/orcamentos', async (req, res) => {
    const { id_usuario, id_categoria, mes, ano, valor_limite } = req.body;

    if (!id_usuario || !id_categoria || !mes || !ano || !valor_limite) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios para criar um orçamento.' });
    }

    try {
        const comando = `
            INSERT INTO orcamentos (id_usuario, id_categoria, mes, ano, valor_limite) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `;
        const valores = [id_usuario, id_categoria, mes, ano, valor_limite];

        const resultado = await BD.query(comando, valores);
        
        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao criar orçamento:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao criar orçamento.' });
    }
});


router.delete('/orcamentos/:id_orcamento', async (req, res) => {
    const { id_orcamento } = req.params;

    try {
        const comando = `DELETE FROM orcamentos WHERE id_orcamento = $1`;
        await BD.query(comando, [id_orcamento]);
        return res.status(200).json({ message: 'Orçamento deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar orçamento:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao deletar orçamento.' });
    }
});

export default router;
