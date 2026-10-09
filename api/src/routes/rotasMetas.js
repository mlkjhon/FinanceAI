import express, { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

/*
 * Histórico das metas: cada criação e depósito vira um movimento com data e hora.
 * A tabela (e a coluna criado_em da meta) são criadas na primeira chamada,
 * para não exigir migração manual no banco.
 */
let historicoPronto = null;
const garantirHistorico = () =>
    (historicoPronto ??= (async () => {
        await BD.query(`CREATE TABLE IF NOT EXISTS metas_movimentos (
            id SERIAL PRIMARY KEY,
            id_meta INTEGER NOT NULL,
            id_usuario INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            valor NUMERIC(14,2) NOT NULL DEFAULT 0,
            saldo_apos NUMERIC(14,2),
            id_transacao INTEGER,
            origem TEXT,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
        await BD.query('CREATE INDEX IF NOT EXISTS metas_movimentos_meta ON metas_movimentos (id_meta, id_usuario)');
        // Metas antigas ficam com criado_em vazio (a data real é desconhecida); as novas ganham a hora exata
        await BD.query('ALTER TABLE metas_financeiras ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ');
        await BD.query('ALTER TABLE metas_financeiras ALTER COLUMN criado_em SET DEFAULT now()');
    })().catch((e) => { historicoPronto = null; throw e; }));

const semHistorico = (e) => console.warn('[METAS] histórico indisponível:', e.message);
const origemValida = (o) => (['insights', 'manual'].includes(o) ? o : 'manual');

router.get('/metas', autenticar, async (req, res) => {
    const id_usuario = req.usuario.id;

    try {
        await garantirHistorico().catch(semHistorico);
        const comando = `
            SELECT *
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

router.post('/metas', autenticar, async (req, res) => {
    const id_usuario = req.usuario.id;
    const { titulo, descricao, valor_meta, valor_atual, data_objetivo } = req.body;

    if (!titulo || !valor_meta) {
        return res.status(400).json({ error: 'Os campos titulo e valor_meta são obrigatórios.' });
    }

    try {
        await garantirHistorico().catch(semHistorico);
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
        const meta = resultado.rows[0];

        await BD.query(
            `INSERT INTO metas_movimentos (id_meta, id_usuario, tipo, valor, saldo_apos, origem) VALUES ($1, $2, 'criacao', $3, $3, $4)`,
            [meta.id_meta, id_usuario, Number(valor_atual) || 0, origemValida(req.body.origem)]
        ).catch(semHistorico);

        return res.status(201).json(meta);
    } catch (error) {
        console.error('Erro ao criar meta:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao criar meta.' });
    }
});

/*
 * GET /metas/:id_meta
 * A meta e o histórico (mais novo primeiro). Depósitos feitos antes do histórico
 * existir são recuperados das transações "Investido na meta: <título>" (só com o dia).
 */
router.get('/metas/:id_meta', autenticar, async (req, res) => {
    const { id_meta } = req.params;
    const id_usuario = req.usuario.id;
    if (!/^\d+$/.test(String(id_meta))) return res.status(400).json({ error: 'Meta inválida.' });

    try {
        await garantirHistorico().catch(semHistorico);
        const r = await BD.query('SELECT * FROM metas_financeiras WHERE id_meta = $1 AND id_usuario = $2', [id_meta, id_usuario]);
        if (!r.rows.length) return res.status(404).json({ error: 'Meta não encontrada.' });
        const meta = r.rows[0];

        let movimentos = [];
        try {
            const m = await BD.query(
                `SELECT id, tipo, valor::float AS valor, saldo_apos::float AS saldo_apos, id_transacao, origem, criado_em
                 FROM metas_movimentos WHERE id_meta = $1 AND id_usuario = $2`,
                [id_meta, id_usuario]
            );
            movimentos = m.rows.map((x) => ({ ...x, id: 'm' + x.id, hora: true }));
        } catch (e) {
            semHistorico(e);
        }

        // Depósitos antigos: só existem como transação (sem hora)
        const ligadas = movimentos.map((x) => x.id_transacao).filter(Boolean);
        const antigas = await BD.query(
            `SELECT id_transacao, valor::float AS valor, to_char(data_registro, 'YYYY-MM-DD') AS dia
             FROM transacoes
             WHERE id_usuario = $1 AND descricao = $2 AND NOT (id_transacao = ANY($3::int[]))`,
            [id_usuario, `Investido na meta: ${meta.titulo}`, ligadas]
        );
        const legado = antigas.rows.map((t) => ({
            id: 't' + t.id_transacao,
            tipo: 'deposito',
            valor: t.valor,
            saldo_apos: null,
            id_transacao: t.id_transacao,
            origem: null,
            criado_em: t.dia,
            hora: false,
        }));

        const quando = (x) => new Date(x.hora ? x.criado_em : `${x.criado_em}T12:00:00`).getTime();
        const historico = [...movimentos, ...legado].sort((a, b) => quando(b) - quando(a));

        return res.status(200).json({
            id_meta: meta.id_meta,
            titulo: meta.titulo,
            descricao: meta.descricao,
            valor_meta: Number(meta.valor_meta),
            valor_atual: Number(meta.valor_atual) || 0,
            data_objetivo: meta.data_objetivo,
            criado_em: meta.criado_em ?? meta.data_criacao ?? meta.created_at ?? null,
            historico,
        });
    } catch (error) {
        console.error('Erro ao detalhar meta:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao buscar a meta.' });
    }
});


router.delete('/metas/:id_meta', autenticar, async (req, res) => {
    const { id_meta } = req.params;
    const id_usuario = req.usuario.id;

    try {
        const comando = `DELETE FROM metas_financeiras WHERE id_meta = $1 AND id_usuario = $2`;
        await BD.query(comando, [id_meta, id_usuario]);
        await BD.query('DELETE FROM metas_movimentos WHERE id_meta = $1 AND id_usuario = $2', [id_meta, id_usuario]).catch(() => {});
        return res.status(200).json({ message: 'Meta deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar meta:', error.message);
        return res.status(500).json({ error: 'Erro no servidor ao deletar meta.' });
    }
});


router.patch('/metas/:id_meta/adicionar', autenticar, async (req, res) => {
    const { id_meta } = req.params;
    const id_usuario = req.usuario.id;
    const { valor } = req.body;

    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
        return res.status(400).json({ error: 'Informe um valor positivo e válido.' });
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

        const transacao = await BD.query(
            `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria, data_registro)
             VALUES ($1, $2, $3, 'S', NULL, CURRENT_DATE) RETURNING id_transacao`,
            [id_usuario, `Investido na meta: ${meta.titulo}`, valorNumero]
        );

        // Registra o depósito com a hora exata (ligado à transação, para não duplicar no histórico)
        try {
            await garantirHistorico();
            await BD.query(
                `INSERT INTO metas_movimentos (id_meta, id_usuario, tipo, valor, saldo_apos, id_transacao, origem)
                 VALUES ($1, $2, 'deposito', $3, $4, $5, $6)`,
                [id_meta, id_usuario, valorNumero, updateMeta.rows[0].valor_atual, transacao.rows[0]?.id_transacao ?? null, origemValida(req.body.origem)]
            );
        } catch (e) {
            semHistorico(e);
        }

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
