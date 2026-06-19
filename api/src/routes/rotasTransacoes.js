import express, { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

// Listar transações
router.get('/transacoes', autenticar, async (req, res) => {
    try {
        const id_usuario = req.usuario.id;
        let comando = `
            SELECT t.*, c.nome as categoria_nome 
            FROM transacoes t 
            LEFT JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria 
            LEFT JOIN categorias c ON s.id_categoria = c.id_categoria 
            WHERE t.id_usuario = $1
        `;
        let valores = [id_usuario];

        comando += ` ORDER BY t.id_transacao DESC`;

        const transacoes = await BD.query(comando, valores);
        res.status(200).json(transacoes.rows);
    } catch (error) {
        console.error(' ❌ ERRO AO LISTAR TRANSAÇÕES ❌ ', error.message);
        return res.status(500).json({ error: '❌ ERRO AO LISTAR TRANSAÇÕES ❌' + error.message });
    }
});

router.get('/transacoes/:id_transacao', autenticar,  async (req, res) => {
    const { id_transacao } = req.params;
    try {
        if (!id_transacao) {
            return res.status(400).json({ message: 'Informe o ID da transação para obter seus detalhes.' });
        }
        const comando = `SELECT * FROM transacoes WHERE id_transacao = $1`;
        const transacoes = await BD.query(comando, [id_transacao]);

        if (transacoes.rowCount === 0) {
            return res.status(404).json({ message: 'Transação não encontrada' });
        }

        res.status(200).json(transacoes.rows[0]);
    } catch (error) {
        console.error(' ❌ ERRO AO LISTAR TRANSAÇÕES ❌ ', error.message);
        return res.status(500).json({ error: '❌ ERRO AO LISTAR TRANSAÇÕES ❌' + error.message });
    }
});

router.post('/transacoes', autenticar, async (req, res) => {
    const id_usuario = req.usuario.id;
    const { descricao, valor, tipo, id_subcategoria, data_registro } = req.body;
    try {
        // Se data_registro não for fornecida, o banco usa o valor default
        let comando = `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria${data_registro ? ', data_registro' : ''}) VALUES ($1, $2, $3, $4, $5${data_registro ? ', $6' : ''})`;
        let valores = [id_usuario, descricao, valor, tipo, id_subcategoria || null];
        if (data_registro) valores.push(data_registro);
        
        await BD.query(comando, valores);
        return res.status(201).json({ message: 'Transação cadastrada com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao cadastrar transação: ' + error.message });
    }
});

router.put('/transacoes/:id_transacao', autenticar, async (req, res) => {
    const { id_transacao } = req.params;
    const { descricao, valor, tipo, id_subcategoria, data_registro } = req.body;
    try {
        const verificar = await BD.query(`SELECT id_transacao FROM transacoes WHERE id_transacao = $1`, [id_transacao]);
        if (verificar.rowCount === 0) return res.status(404).json({ message: 'Transação não encontrada' });

        let comando = `UPDATE transacoes SET descricao=$1, valor=$2, tipo=$3, id_subcategoria=$5`;
        const valores = [descricao, valor, tipo, id_transacao, id_subcategoria || null];
        
        if (data_registro) {
            comando += `, data_registro=$6`;
            valores.push(data_registro);
        }
        comando += ` WHERE id_transacao=$4`;

        await BD.query(comando, valores);
        return res.status(200).json({ message: 'Transação atualizada com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar transação: ' + error.message });
    }
});

router.patch('/transacoes/:id_transacao', autenticar, async (req, res) => {
    const { id_transacao } = req.params;
    const { descricao, valor, tipo, id_subcategoria } = req.body;
    try {
        const verificar = await BD.query(`SELECT * FROM transacoes WHERE id_transacao = $1`, [id_transacao]);
        if (verificar.rowCount === 0) return res.status(404).json({ message: 'Transação não encontrada' });

        const transacaoAtual = verificar.rows[0];

        const novaDescricao = descricao !== undefined ? descricao : transacaoAtual.descricao;
        const novoValor = valor !== undefined ? valor : transacaoAtual.valor;
        const novoTipo = tipo !== undefined ? tipo : transacaoAtual.tipo;
        const novoIdSub = id_subcategoria !== undefined ? (id_subcategoria || null) : transacaoAtual.id_subcategoria;

        const comando = `UPDATE transacoes SET descricao=$1, valor=$2, tipo=$3, id_subcategoria=$5 WHERE id_transacao=$4`;
        const valores = [novaDescricao, novoValor, novoTipo, id_transacao, novoIdSub];
        await BD.query(comando, valores);

        return res.status(200).json({ message: 'Transação atualizada parcialmente com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar transação: ' + error.message });
    }
});

router.delete('/transacoes/:id_transacao', autenticar, async (req, res) => {
    const { id_transacao } = req.params;
    try {
        const verificar = await BD.query(`SELECT id_transacao FROM transacoes WHERE id_transacao = $1`, [id_transacao]);
        if (verificar.rowCount === 0) return res.status(404).json({ message: 'Transação não encontrada' });

        const comando = `DELETE FROM transacoes WHERE id_transacao = $1`;
        await BD.query(comando, [id_transacao]);
        return res.status(200).json({ message: 'Transação excluída com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir transação: ' + error.message });
    }
});

export default router;