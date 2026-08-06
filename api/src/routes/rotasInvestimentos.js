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
        // Obter investimento
        const invQuery = await BD.query(`SELECT * FROM investimentos WHERE id_investimento = $1 AND id_usuario = $2`, [id, id_usuario]);
        if (invQuery.rowCount === 0) {
            return res.status(404).json({ message: 'Investimento não encontrado' });
        }
        const investimento = invQuery.rows[0];

        // Obter transacoes do investimento
        const transQuery = await BD.query(`SELECT * FROM transacoes_investimentos WHERE id_investimento = $1 ORDER BY data_registro ASC`, [id]);
        
        let saldoAcumulado = 0;
        const historico = transQuery.rows.map(t => {
            if (t.tipo === 'resgate') saldoAcumulado -= parseFloat(t.valor);
            else saldoAcumulado += parseFloat(t.valor);
            return {
                ...t,
                saldoAposTransacao: saldoAcumulado
            };
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
    // tipo: 'aporte', 'resgate'
    try {
        if (!tipo || !valor) return res.status(400).json({ message: 'Tipo e valor são obrigatórios' });
        if (!['aporte', 'resgate'].includes(tipo)) return res.status(400).json({ message: 'Tipo inválido. Use aporte ou resgate.' });
        if (parseFloat(valor) <= 0) return res.status(400).json({ message: 'Valor deve ser maior que zero' });

        // Verificar se investimento pertence ao usuario
        const invQuery = await BD.query(`SELECT * FROM investimentos WHERE id_investimento = $1 AND id_usuario = $2`, [id, id_usuario]);
        if (invQuery.rowCount === 0) return res.status(404).json({ message: 'Investimento não encontrado' });
        const investimento = invQuery.rows[0];

        await BD.query('BEGIN'); // Iniciar transaçao SQL

        // 1. Inserir na transacoes_investimentos
        if (data_registro) {
            await BD.query(
                `INSERT INTO transacoes_investimentos (id_investimento, tipo, valor, data_registro) VALUES ($1, $2, $3, $4)`,
                [id, tipo, valor, data_registro]
            );
        } else {
            await BD.query(
                `INSERT INTO transacoes_investimentos (id_investimento, tipo, valor) VALUES ($1, $2, $3)`,
                [id, tipo, valor]
            );
        }

        // 2. Registrar na conta principal (aporte = despesa, resgate = receita)
        const tipoPrincipal = tipo === 'aporte' ? 'despesa' : 'receita';
        const descPrincipal = `${tipo === 'aporte' ? 'Aporte' : 'Resgate'} em ${investimento.nome}`;
        
        // Buscar subcategoria de investimentos (sem criar, sem travar)
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


// Editar investimento (ex: mudar taxa)
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

export default router;
