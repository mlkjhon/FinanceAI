import express, { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

// Listar todos os investimentos do usuario com o saldo calculado
router.get('/investimentos', autenticar, async (req, res) => {
    try {
        const id_usuario = req.usuario.id;
        const comando = `
            SELECT i.*, 
                   COALESCE(
                       (SELECT SUM(CASE WHEN tipo IN ('aporte', 'rendimento') THEN valor ELSE -valor END)
                        FROM transacoes_investimentos ti 
                        WHERE ti.id_investimento = i.id_investimento), 0
                   ) as saldo_atual
            FROM investimentos i
            WHERE i.id_usuario = $1
            ORDER BY i.data_criacao DESC
        `;
        const investimentos = await BD.query(comando, [id_usuario]);
        res.status(200).json(investimentos.rows);
    } catch (error) {
        console.error('❌ ERRO AO LISTAR INVESTIMENTOS ❌', error.message);
        return res.status(500).json({ error: 'Erro ao listar investimentos: ' + error.message });
    }
});

// Detalhes de um investimento e seu histórico de transacoes
router.get('/investimentos/:id', autenticar, async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.usuario.id;
    try {
        const invQuery = await BD.query(`SELECT * FROM investimentos WHERE id_investimento = $1 AND id_usuario = $2`, [id, id_usuario]);
        if (invQuery.rowCount === 0) return res.status(404).json({ message: 'Investimento não encontrado' });
        const investimento = invQuery.rows[0];

        const transQuery = await BD.query(`SELECT * FROM transacoes_investimentos WHERE id_investimento = $1 ORDER BY data_registro ASC`, [id]);
        
        let saldoAcumulado = 0;
        const historico = transQuery.rows.map(t => {
            if (t.tipo === 'resgate') saldoAcumulado -= parseFloat(t.valor);
            else saldoAcumulado += parseFloat(t.valor);
            return { ...t, saldoAposTransacao: saldoAcumulado };
        });

        investimento.saldo_atual = saldoAcumulado;
        investimento.historico = historico;

        res.status(200).json(investimento);
    } catch (error) {
        console.error('❌ ERRO AO OBTER INVESTIMENTO ❌', error.message);
        return res.status(500).json({ error: 'Erro ao obter investimento: ' + error.message });
    }
});

// Criar novo investimento
router.post('/investimentos', autenticar, async (req, res) => {
    const id_usuario = req.usuario.id;
    const { nome, tipo, taxa_rendimento } = req.body;
    try {
        const comando = `INSERT INTO investimentos (id_usuario, nome, tipo, taxa_rendimento) VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await BD.query(comando, [id_usuario, nome, tipo, taxa_rendimento]);
        res.status(201).json({ message: 'Investimento criado com sucesso', investimento: result.rows[0] });
    } catch (error) {
        console.error('❌ ERRO AO CRIAR INVESTIMENTO ❌', error.message);
        return res.status(500).json({ error: 'Erro ao criar investimento: ' + error.message });
    }
});

// Adicionar transação (aporte ou resgate)
router.post('/investimentos/:id/transacao', autenticar, async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.usuario.id;
    const { tipo, valor, data_registro } = req.body;
    try {
        if (!tipo || !valor) return res.status(400).json({ message: 'Tipo e valor são obrigatórios' });
        if (!['aporte', 'resgate'].includes(tipo)) return res.status(400).json({ message: 'Tipo inválido. Use aporte ou resgate.' });
        if (parseFloat(valor) <= 0) return res.status(400).json({ message: 'Valor deve ser maior que zero' });

        const invQuery = await BD.query(`SELECT * FROM investimentos WHERE id_investimento = $1 AND id_usuario = $2`, [id, id_usuario]);
        if (invQuery.rowCount === 0) return res.status(404).json({ message: 'Investimento não encontrado' });
        const investimento = invQuery.rows[0];

        await BD.query('BEGIN');

        // 1. Inserir na transacoes_investimentos e obter o id gerado
        let transInv;
        if (data_registro) {
            transInv = await BD.query(
                `INSERT INTO transacoes_investimentos (id_investimento, tipo, valor, data_registro) VALUES ($1, $2, $3, $4) RETURNING id_transacao_inv`,
                [id, tipo, valor, data_registro]
            );
        } else {
            transInv = await BD.query(
                `INSERT INTO transacoes_investimentos (id_investimento, tipo, valor) VALUES ($1, $2, $3) RETURNING id_transacao_inv`,
                [id, tipo, valor]
            );
        }
        const id_transacao_inv = transInv.rows[0].id_transacao_inv;

        // 2. Registrar na conta principal como despesa (aporte) ou receita (resgate)
        const tipoPrincipal = tipo === 'aporte' ? 'despesa' : 'receita';
        // Usar prefixo [INV:id_transacao_inv] na descricao para poder encontrar e deletar depois
        const descPrincipal = `[INV:${id_transacao_inv}] ${tipo === 'aporte' ? 'Aporte' : 'Resgate'} em ${investimento.nome}`;

        const subCatQuery = await BD.query(
            `SELECT s.id_subcategoria FROM subcategorias s
             JOIN categorias c ON s.id_categoria = c.id_categoria
             WHERE LOWER(c.nome) = 'investimentos' LIMIT 1`
        );
        const id_subcategoria = subCatQuery.rowCount > 0 ? subCatQuery.rows[0].id_subcategoria : null;

        if (data_registro) {
            await BD.query(
                `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria, data_registro) VALUES ($1, $2, $3, $4, $5, $6)`,
                [id_usuario, descPrincipal, valor, tipoPrincipal, id_subcategoria, data_registro]
            );
        } else {
            await BD.query(
                `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria) VALUES ($1, $2, $3, $4, $5)`,
                [id_usuario, descPrincipal, valor, tipoPrincipal, id_subcategoria]
            );
        }

        await BD.query('COMMIT');
        res.status(201).json({ message: 'Transação registrada com sucesso' });
    } catch (error) {
        await BD.query('ROLLBACK');
        console.error('❌ ERRO AO ADICIONAR TRANSACAO NO INVESTIMENTO ❌', error.message);
        return res.status(500).json({ error: 'Erro ao registrar transação: ' + error.message });
    }
});

// Deletar uma transação do investimento (e a respectiva transação da conta principal, se houver)
router.delete('/investimentos/:id/transacao/:transacaoId', autenticar, async (req, res) => {
    const { id, transacaoId } = req.params;
    const id_usuario = req.usuario.id;
    try {
        // Verificar se o investimento pertence ao usuário
        const invQuery = await BD.query(`SELECT id_investimento FROM investimentos WHERE id_investimento = $1 AND id_usuario = $2`, [id, id_usuario]);
        if (invQuery.rowCount === 0) return res.status(403).json({ message: 'Não autorizado' });

        // Buscar a transação do investimento
        const transQuery = await BD.query(`SELECT * FROM transacoes_investimentos WHERE id_transacao_inv = $1 AND id_investimento = $2`, [transacaoId, id]);
        if (transQuery.rowCount === 0) return res.status(404).json({ message: 'Transação não encontrada' });

        await BD.query('BEGIN');

        // Deletar da transacoes_investimentos
        await BD.query(`DELETE FROM transacoes_investimentos WHERE id_transacao_inv = $1`, [transacaoId]);

        // Tentar deletar a transação vinculada na conta principal (marcada com [INV:id])
        await BD.query(
            `DELETE FROM transacoes WHERE id_usuario = $1 AND descricao LIKE $2`,
            [id_usuario, `[INV:${transacaoId}]%`]
        );

        await BD.query('COMMIT');
        res.status(200).json({ message: 'Transação excluída com sucesso' });
    } catch (error) {
        await BD.query('ROLLBACK');
        console.error('❌ ERRO AO DELETAR TRANSACAO ❌', error.message);
        return res.status(500).json({ error: 'Erro ao excluir transação: ' + error.message });
    }
});

// Editar investimento (nome, tipo, taxa)
router.put('/investimentos/:id', autenticar, async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.usuario.id;
    const { nome, tipo, taxa_rendimento } = req.body;
    try {
        const result = await BD.query(
            `UPDATE investimentos SET nome=$1, tipo=$2, taxa_rendimento=$3 WHERE id_investimento=$4 AND id_usuario=$5 RETURNING *`,
            [nome, tipo, taxa_rendimento, id, id_usuario]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Investimento não encontrado' });
        res.status(200).json({ message: 'Investimento atualizado com sucesso', investimento: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar investimento: ' + error.message });
    }
});

// Deletar investimento (e todas as suas transações)
router.delete('/investimentos/:id', autenticar, async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.usuario.id;
    try {
        const invQuery = await BD.query(`SELECT id_investimento FROM investimentos WHERE id_investimento = $1 AND id_usuario = $2`, [id, id_usuario]);
        if (invQuery.rowCount === 0) return res.status(404).json({ message: 'Investimento não encontrado' });

        await BD.query('BEGIN');

        // Deletar todas as transações vinculadas na conta principal que tenham o prefixo [INV:
        await BD.query(
            `DELETE FROM transacoes WHERE id_usuario = $1 AND descricao ~ '\\[INV:\\d+\\]'`,
            [id_usuario]
        );
        // Deletar transações do investimento
        await BD.query(`DELETE FROM transacoes_investimentos WHERE id_investimento = $1`, [id]);
        // Deletar o investimento
        await BD.query(`DELETE FROM investimentos WHERE id_investimento = $1`, [id]);

        await BD.query('COMMIT');
        res.status(200).json({ message: 'Investimento excluído com sucesso' });
    } catch (error) {
        await BD.query('ROLLBACK');
        console.error('❌ ERRO AO DELETAR INVESTIMENTO ❌', error.message);
        return res.status(500).json({ error: 'Erro ao excluir investimento: ' + error.message });
    }
});

export default router;
