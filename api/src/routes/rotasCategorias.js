import express, { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";
import { garantirCategoriasPorUsuario, visivelPara } from "../services/categoriasUsuario.js";

const router = Router();

/*
 * Cada usuário vê as categorias padrão do app e as que ele mesmo criou.
 * Só as próprias podem ser editadas ou excluídas (as padrão valem para todos).
 */
const tipoValido = (tipo) => (['E', 'receita'].includes(tipo) ? 'E' : ['S', 'despesa'].includes(tipo) ? 'S' : null);

router.get('/categorias', autenticar, async (req, res) => {
    try {
        await garantirCategoriasPorUsuario();
        const comando = `
            SELECT c.*, (c.id_usuario IS NOT NULL) AS propria
            FROM categorias c
            WHERE ${visivelPara('c', 1)}
            ORDER BY (c.id_usuario IS NULL) DESC, c.nome`;
        const resultado = await BD.query(comando, [req.usuario.id]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao listar categorias: ' + error.message });
    }
});

router.post('/categorias', autenticar, async (req, res) => {
    const id_usuario = req.usuario.id;
    const nome = String(req.body?.nome || '').trim().slice(0, 60);
    const tipo = tipoValido(req.body?.tipo);
    if (!nome || !tipo) return res.status(400).json({ error: 'Informe o nome e se é receita ou despesa.' });
    try {
        await garantirCategoriasPorUsuario();
        const duplicado = await BD.query(
            `SELECT id_categoria FROM categorias c WHERE LOWER(c.nome) = LOWER($1) AND ${visivelPara('c', 2)}`,
            [nome, id_usuario]
        );
        if (duplicado.rowCount > 0) {
            return res.status(400).json({ error: `Você já tem uma categoria chamada "${nome}".` });
        }

        const resultado = await BD.query(
            `INSERT INTO categorias (nome, tipo, id_usuario) VALUES ($1, $2, $3) RETURNING *`,
            [nome, tipo, id_usuario]
        );
        const categoria = resultado.rows[0];
        // As transações apontam para subcategoria: toda categoria nova já nasce com "Geral"
        const sub = await BD.query(
            `INSERT INTO subcategorias (id_categoria, nome, id_usuario) VALUES ($1, 'Geral', $2) RETURNING id_subcategoria`,
            [categoria.id_categoria, id_usuario]
        );
        return res.status(201).json({ ...categoria, propria: true, id_subcategoria: sub.rows[0].id_subcategoria });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: `Você já tem uma categoria chamada "${nome}".` });
        }
        return res.status(500).json({ error: 'Erro ao cadastrar categoria: ' + error.message });
    }
});

// Garante que a categoria existe e é do usuário (as padrão não podem ser mexidas)
async function categoriaDoUsuario(id_categoria, id_usuario, res) {
    if (!/^\d+$/.test(String(id_categoria))) {
        res.status(400).json({ error: 'Categoria inválida.' });
        return false;
    }
    const r = await BD.query(`SELECT id_usuario FROM categorias WHERE id_categoria = $1`, [id_categoria]);
    if (r.rowCount === 0 || (r.rows[0].id_usuario != null && Number(r.rows[0].id_usuario) !== Number(id_usuario))) {
        res.status(404).json({ error: 'Categoria não encontrada.' });
        return false;
    }
    if (r.rows[0].id_usuario == null) {
        res.status(403).json({ error: 'As categorias padrão do app não podem ser alteradas.' });
        return false;
    }
    return true;
}

router.put('/categorias/:id_categoria', autenticar, async (req, res) => {
    const { id_categoria } = req.params;
    const id_usuario = req.usuario.id;
    const nome = String(req.body?.nome || '').trim().slice(0, 60);
    const tipo = tipoValido(req.body?.tipo);
    if (!nome || !tipo) return res.status(400).json({ error: 'Informe o nome e se é receita ou despesa.' });
    try {
        await garantirCategoriasPorUsuario();
        if (!(await categoriaDoUsuario(id_categoria, id_usuario, res))) return;

        const duplicado = await BD.query(
            `SELECT id_categoria FROM categorias c WHERE LOWER(c.nome) = LOWER($1) AND c.id_categoria != $2 AND ${visivelPara('c', 3)}`,
            [nome, id_categoria, id_usuario]
        );
        if (duplicado.rowCount > 0) {
            return res.status(400).json({ error: `Você já tem outra categoria chamada "${nome}".` });
        }

        const resultado = await BD.query(
            `UPDATE categorias SET nome = $1, tipo = $2 WHERE id_categoria = $3 AND id_usuario = $4 RETURNING *`,
            [nome, tipo, id_categoria, id_usuario]
        );
        return res.status(200).json({ ...resultado.rows[0], propria: true });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: `Você já tem outra categoria chamada "${nome}".` });
        }
        return res.status(500).json({ error: 'Erro ao atualizar categoria: ' + error.message });
    }
});

router.delete('/categorias/:id_categoria', autenticar, async (req, res) => {
    const { id_categoria } = req.params;
    const id_usuario = req.usuario.id;
    const cliente = await BD.connect();
    try {
        await garantirCategoriasPorUsuario();
        if (!(await categoriaDoUsuario(id_categoria, id_usuario, res))) return;

        await cliente.query('BEGIN');
        // As transações continuam existindo, só ficam "sem categoria"
        await cliente.query(
            `UPDATE transacoes SET id_subcategoria = NULL
             WHERE id_usuario = $2 AND id_subcategoria IN (SELECT id_subcategoria FROM subcategorias WHERE id_categoria = $1)`,
            [id_categoria, id_usuario]
        );
        await cliente.query(`DELETE FROM orcamentos WHERE id_categoria = $1 AND id_usuario = $2`, [id_categoria, id_usuario]);
        await cliente.query(`DELETE FROM subcategorias WHERE id_categoria = $1`, [id_categoria]);
        await cliente.query(`DELETE FROM categorias WHERE id_categoria = $1 AND id_usuario = $2`, [id_categoria, id_usuario]);
        await cliente.query('COMMIT');

        return res.status(200).json({ message: 'Categoria excluída. As transações dela ficaram sem categoria.' });
    } catch (error) {
        await cliente.query('ROLLBACK').catch(() => {});
        return res.status(500).json({ error: 'Erro ao excluir categoria: ' + error.message });
    } finally {
        cliente.release();
    }
});

export default router;
