import express, { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";
import { garantirCategoriasPorUsuario, visivelPara } from "../services/categoriasUsuario.js";

const router = Router();

// Mesma regra das categorias: o usuário vê as padrão e as dele, e só mexe nas dele
router.get('/subcategorias', autenticar, async (req, res) => {
    const { id_categoria } = req.query;
    try {
        await garantirCategoriasPorUsuario();
        const valores = [req.usuario.id];
        let comando = `SELECT s.* FROM subcategorias s WHERE ${visivelPara('s', 1)}`;
        if (id_categoria) {
            comando += ` AND s.id_categoria = $2`;
            valores.push(id_categoria);
        }
        comando += ` ORDER BY s.id_subcategoria`;
        const resultado = await BD.query(comando, valores);
        res.status(200).json(resultado.rows);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao listar subcategorias: ' + error.message });
    }
});

router.post('/subcategorias', autenticar, async (req, res) => {
    const { id_categoria, nome } = req.body;
    if (!id_categoria || !nome) return res.status(400).json({ message: "id_categoria e nome são obrigatórios" });
    try {
        await garantirCategoriasPorUsuario();
        const cat = await BD.query(`SELECT id_categoria FROM categorias c WHERE c.id_categoria = $1 AND ${visivelPara('c', 2)}`, [id_categoria, req.usuario.id]);
        if (cat.rowCount === 0) return res.status(404).json({ error: 'Categoria não encontrada.' });
        const comando = `INSERT INTO subcategorias (id_categoria, nome, id_usuario) VALUES ($1, $2, $3) RETURNING *`;
        const resultado = await BD.query(comando, [id_categoria, String(nome).trim().slice(0, 60), req.usuario.id]);
        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao cadastrar subcategoria: ' + error.message });
    }
});

router.put('/subcategorias/:id_subcategoria', autenticar, async (req, res) => {
    const { id_subcategoria } = req.params;
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ message: 'O campo nome é obrigatório para atualizar a subcategoria' });
    try {
        await garantirCategoriasPorUsuario();
        const comando = `UPDATE subcategorias SET nome = $1 WHERE id_subcategoria = $2 AND id_usuario = $3 RETURNING *`;
        const resultado = await BD.query(comando, [nome, id_subcategoria, req.usuario.id]);
        if (resultado.rowCount === 0) return res.status(404).json({ message: 'Subcategoria não encontrada' });
        return res.status(200).json(resultado.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar subcategoria: ' + error.message });
    }
});

router.delete('/subcategorias/:id_subcategoria', autenticar, async (req, res) => {
    const { id_subcategoria } = req.params;
    try {
        await garantirCategoriasPorUsuario();
        const dona = await BD.query(`SELECT 1 FROM subcategorias WHERE id_subcategoria = $1 AND id_usuario = $2`, [id_subcategoria, req.usuario.id]);
        if (dona.rowCount === 0) return res.status(404).json({ message: 'Subcategoria não encontrada' });
        await BD.query(`UPDATE transacoes SET id_subcategoria = NULL WHERE id_subcategoria = $1 AND id_usuario = $2`, [id_subcategoria, req.usuario.id]);
        await BD.query(`DELETE FROM subcategorias WHERE id_subcategoria = $1 AND id_usuario = $2`, [id_subcategoria, req.usuario.id]);
        return res.status(200).json({ message: 'Subcategoria excluída com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir subcategoria: ' + error.message });
    }
});

export default router;
