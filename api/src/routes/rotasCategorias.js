import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

router.get('/categorias', async (req, res) => {
    try {
        const comando = `SELECT * FROM categorias ORDER BY id_categoria`;
        const resultado = await BD.query(comando);
        res.status(200).json(resultado.rows);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao listar categorias: ' + error.message });
    }
});

router.post('/categorias', async (req, res) => {
    const { nome, tipo } = req.body;
    if (!nome || !tipo) return res.status(400).json({ message: "Nome e tipo são obrigatórios" });
    try {
        const duplicado = await BD.query(`SELECT id_categoria FROM categorias WHERE LOWER(nome) = LOWER($1)`, [nome]);
        if (duplicado.rowCount > 0) {
            return res.status(400).json({ error: `Já existe uma categoria com o nome "${nome}". Escolha um nome diferente.` });
        }

        const comando = `INSERT INTO categorias (nome, tipo) VALUES ($1, $2) RETURNING *`;
        const resultado = await BD.query(comando, [nome, tipo]);
        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
            return res.status(400).json({ error: `Já existe uma categoria com o nome "${nome}". Escolha um nome diferente.` });
        }
        return res.status(500).json({ error: 'Erro ao cadastrar categoria: ' + error.message });
    }
});

router.put('/categorias/:id_categoria', async (req, res) => {
    const { id_categoria } = req.params;
    const { nome, tipo } = req.body;
    try {
        const verificar = await BD.query(`SELECT id_categoria FROM categorias WHERE id_categoria = $1`, [id_categoria]);
        if (verificar.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada' });

        if (nome) {
            const duplicado = await BD.query(
                `SELECT id_categoria FROM categorias WHERE LOWER(nome) = LOWER($1) AND id_categoria != $2`,
                [nome, id_categoria]
            );
            if (duplicado.rowCount > 0) {
                return res.status(400).json({ error: `Já existe outra categoria com o nome "${nome}". Escolha um nome diferente.` });
            }
        }

        const comando = `UPDATE categorias SET nome = $1, tipo = $2 WHERE id_categoria = $3 RETURNING *`;
        const resultado = await BD.query(comando, [nome, tipo, id_categoria]);
        return res.status(200).json(resultado.rows[0]);
    } catch (error) {
        if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
            return res.status(400).json({ error: `Já existe outra categoria com o nome "${nome}". Escolha um nome diferente.` });
        }
        return res.status(500).json({ error: 'Erro ao atualizar categoria: ' + error.message });
    }
});

router.delete('/categorias/:id_categoria', async (req, res) => {
    const { id_categoria } = req.params;
    try {
        const verificar = await BD.query(`SELECT id_categoria FROM categorias WHERE id_categoria = $1`, [id_categoria]);
        if (verificar.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada' });

        // Desvincula as transações das subcategorias desta categoria (sem deletar)
        await BD.query(`
            UPDATE transacoes SET id_subcategoria = NULL 
            WHERE id_subcategoria IN (
                SELECT id_subcategoria FROM subcategorias WHERE id_categoria = $1
            )
        `, [id_categoria]);

        // Desvincula as subcategorias da categoria (sem deletar as subcategorias)
        await BD.query(`UPDATE subcategorias SET id_categoria = NULL WHERE id_categoria = $1`, [id_categoria]);

        // Agora deleta apenas a categoria
        await BD.query(`DELETE FROM categorias WHERE id_categoria = $1`, [id_categoria]);

        return res.status(200).json({ message: 'Categoria excluída com sucesso. As subcategorias foram desvinculadas mas preservadas.' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir categoria: ' + error.message });
    }
});

export default router;
