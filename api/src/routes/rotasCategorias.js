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
        const comando = `INSERT INTO categorias (nome, tipo) VALUES ($1, $2) RETURNING *`;
        const resultado = await BD.query(comando, [nome, tipo]);
        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao cadastrar categoria: ' + error.message });
    }
});

router.put('/categorias/:id_categoria', async (req, res) => {
    const { id_categoria } = req.params;
    const { nome, tipo } = req.body;
    try {
        const comando = `UPDATE categorias SET nome = $1, tipo = $2 WHERE id_categoria = $3 RETURNING *`;
        const resultado = await BD.query(comando, [nome, tipo, id_categoria]);
        if (resultado.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada' });
        return res.status(200).json(resultado.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar categoria: ' + error.message });
    }
});

router.delete('/categorias/:id_categoria', async (req, res) => {
    const { id_categoria } = req.params;
    try {
        const comando = `DELETE FROM categorias WHERE id_categoria = $1`;
        const resultado = await BD.query(comando, [id_categoria]);
        if (resultado.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada' });
        return res.status(200).json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir categoria. Ela pode estar em uso: ' + error.message });
    }
});

export default router;
