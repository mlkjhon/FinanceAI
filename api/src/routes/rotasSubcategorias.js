import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

router.get('/subcategorias', async (req, res) => {
    const { id_categoria } = req.query;
    try {
        let comando = `SELECT * FROM subcategorias ORDER BY id_subcategoria`;
        let valores = [];
        if (id_categoria) {
            comando = `SELECT * FROM subcategorias WHERE id_categoria = $1 ORDER BY id_subcategoria`;
            valores = [id_categoria];
        }
        const resultado = await BD.query(comando, valores);
        res.status(200).json(resultado.rows);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao listar subcategorias: ' + error.message });
    }
});

router.post('/subcategorias', async (req, res) => {
    const { id_categoria, nome } = req.body;
    if (!id_categoria || !nome) return res.status(400).json({ message: "id_categoria e nome são obrigatórios" });
    try {
        const comando = `INSERT INTO subcategorias (id_categoria, nome) VALUES ($1, $2) RETURNING *`;
        const resultado = await BD.query(comando, [id_categoria, nome]);
        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao cadastrar subcategoria: ' + error.message });
    }
});

router.put('/subcategorias/:id_subcategoria', async (req, res) => {
    const { id_subcategoria } = req.params;
    const { nome } = req.body; 
    if (!nome) return res.status(400).json({ message: 'O campo nome é obrigatório para atualizar a subcategoria' });
    try {
        const comando = `UPDATE subcategorias SET nome = $1 WHERE id_subcategoria = $2 RETURNING *`;
        const resultado = await BD.query(comando, [nome, id_subcategoria]);
        if (resultado.rowCount === 0) return res.status(404).json({ message: 'Subcategoria não encontrada' });
        return res.status(200).json(resultado.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar subcategoria: ' + error.message });
    }
});

router.delete('/subcategorias/:id_subcategoria', async (req, res) => {
    const { id_subcategoria } = req.params;
    try {
        const comando = `DELETE FROM subcategorias WHERE id_subcategoria = $1`;
        const resultado = await BD.query(comando, [id_subcategoria]);
        if (resultado.rowCount === 0) return res.status(404).json({ message: 'Subcategoria não encontrada' });
        return res.status(200).json({ message: 'Subcategoria excluída com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir subcategoria: ' + error.message });
    }
});0

export default router;
