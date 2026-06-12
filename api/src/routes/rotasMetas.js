import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

router.get('/metas', async (req, res) => {
    const { id_usuario } = req.query;

    if (!id_usuario) {
        return res.status(400).json({ error: 'O id_usuario é obrigatório para listar as metas.' });
    }

    try {
        const comando = `
            SELECT id_meta, titulo, descricao, valor_meta, valor_atual, data_objetivo, status 
            FROM metas_financeiras 
            WHERE id_usuario = $1
            ORDER BY data_objetivo ASC
        `;
        
        const resultado = await BD.query(comando, [id_usuario]);
        
        return res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar metas:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao buscar metas.' });
    }
});

router.post('/metas', async (req, res) => {
    const { id_usuario, titulo, descricao, valor_meta, valor_atual, data_objetivo } = req.body;

    if (!id_usuario || !titulo || !valor_meta) {
        return res.status(400).json({ error: 'Os campos id_usuario, titulo e valor_meta são obrigatórios.' });
    }

    try {
        const comando = `
            INSERT INTO metas_financeiras (id_usuario, titulo, descricao, valor_meta, valor_atual, data_objetivo) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `;
        const valores = [
            id_usuario, 
            titulo, 
            descricao || null, 
            valor_meta, 
            valor_atual || 0, 
            data_objetivo || null
        ];

        const resultado = await BD.query(comando, valores);
        
        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao criar meta:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao criar meta.' });
    }
});


router.delete('/metas/:id_meta', async (req, res) => {
    const { id_meta } = req.params;

    try {
        const comando = `DELETE FROM metas_financeiras WHERE id_meta = $1`;
        await BD.query(comando, [id_meta]);
        return res.status(200).json({ message: 'Meta deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar meta:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao deletar meta.' });
    }
});


router.patch('/metas/:id_meta/adicionar', async (req, res) => {
    const { id_meta } = req.params;
    const { valor, id_usuario } = req.body;

    if (!valor || !id_usuario || isNaN(Number(valor)) || Number(valor) <= 0) {
        return res.status(400).json({ error: 'Informe um valor positivo e o id_usuario.' });
    }

    try {
        const buscaMeta = await BD.query(
            'SELECT id_meta, titulo, valor_atual, valor_meta FROM metas_financeiras WHERE id_meta = $1 AND id_usuario = $2',
            [id_meta, id_usuario]
        );

        if (buscaMeta.rows.length === 0) {
            return res.status(404).json({ error: 'Meta não encontrada para este usuário.' });
        }

        const meta = buscaMeta.rows[0];
        const valorNumero = Number(valor);

        const updateMeta = await BD.query(
            'UPDATE metas_financeiras SET valor_atual = valor_atual + $1 WHERE id_meta = $2 RETURNING *',
            [valorNumero, id_meta]
        );

        await BD.query(
            `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria, data_registro)
             VALUES ($1, $2, $3, 'S', NULL, CURRENT_DATE)`,
            [id_usuario, `Investido na meta: ${meta.titulo}`, valorNumero]
        );

        return res.status(200).json({
            mensagem: `R$ ${valorNumero.toFixed(2)} adicionado à meta "${meta.titulo}" com sucesso!`,
            meta: updateMeta.rows[0]
        });
    } catch (error) {
        console.error('Erro ao adicionar dinheiro à meta:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao processar o depósito na meta.' });
    }
});

export default router;
