import { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";
import { gerarJSON, gerarJSONStream } from "../services/gemini.js";
import { carregarContexto, snapshot, resolverPeriodo } from "../services/insightsData.js";
import { resolverBloco } from "../services/insightsBlocos.js";
import { promptAnalise, promptComando } from "../services/insightsPrompts.js";

const router = Router();

const ROTULOS = { mes: 'mês atual', '3m': 'últimos 3 meses', ano: 'ano atual' };
const rotuloPeriodo = (p) => (typeof p === 'object' && p?.inicio ? `de ${p.inicio} a ${p.fim}` : ROTULOS[p] || 'mês atual');
const normalizarPeriodo = (p) => (p && typeof p === 'object' && p.inicio ? { inicio: String(p.inicio), fim: String(p.fim || p.inicio) } : ['mes', '3m', 'ano'].includes(p) ? p : 'mes');

/*
 * POST /insights/analise
 * Corpo: { periodo, fixados?: [{ id, pedido }] }
 * Resposta em streaming (NDJSON, um evento por linha):
 *   { evento: 'estado', estado: 'analisando' | 'gerando' }
 *   { evento: 'bloco', bloco }        (um por bloco, já com números reais)
 *   { evento: 'vazio' }               (usuário sem lançamentos no período)
 *   { evento: 'erro', mensagem }
 *   { evento: 'fim', total }
 */
router.post('/insights/analise', autenticar, async (req, res) => {
    const periodo = normalizarPeriodo(req.body?.periodo);
    const fixados = Array.isArray(req.body?.fixados) ? req.body.fixados.slice(0, 20) : [];

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const enviar = (obj) => res.write(JSON.stringify(obj) + '\n');

    try {
        enviar({ evento: 'estado', estado: 'analisando' });
        const ctx = await carregarContexto(req.usuario.id);
        const base = resolverPeriodo(periodo, ctx.hoje);

        // Fixados primeiro, recalculados no período escolhido
        let total = 0;
        for (const f of fixados) {
            const bloco = f?.pedido ? resolverBloco(ctx, f.pedido, periodo, { id: f.id }) : null;
            if (bloco) {
                enviar({ evento: 'bloco', bloco: { ...bloco, fixado: true } });
                total++;
            }
        }

        const snap = snapshot(ctx, base);
        if (snap.resumo.lancamentos === 0) {
            enviar({ evento: 'vazio' });
            enviar({ evento: 'fim', total });
            return res.end();
        }

        /*
         * Streaming do Gemini: cada bloco é resolvido e enviado assim que a IA
         * termina de escrevê-lo (a IA já escreve na ordem de relevância).
         * Se o streaming falhar antes do primeiro bloco, cai na chamada normal.
         */
        const prompt = promptAnalise(snap, rotuloPeriodo(periodo));
        let recebidos = 0;
        const aoPedido = (pedido) => {
            if (recebidos === 0) enviar({ evento: 'estado', estado: 'gerando' });
            recebidos++;
            if (recebidos > 14) return;
            const bloco = resolverBloco(ctx, pedido, periodo);
            if (bloco) {
                enviar({ evento: 'bloco', bloco });
                total++;
            }
        };
        try {
            await gerarJSONStream(prompt, 'blocos', aoPedido, { temperatura: 0.4, timeoutMs: 50000 });
        } catch (e) {
            if (recebidos > 0) throw e;
            console.warn('[INSIGHTS] streaming falhou, usando chamada normal:', e.message);
            const resposta = await gerarJSON(prompt, { temperatura: 0.4, timeoutMs: 45000 });
            (Array.isArray(resposta?.blocos) ? resposta.blocos : []).forEach(aoPedido);
        }
        enviar({ evento: 'fim', total });
        res.end();
    } catch (error) {
        console.error('❌ [INSIGHTS] análise:', error.message);
        enviar({ evento: 'erro', mensagem: error.message || 'Falha ao gerar a análise' });
        res.end();
    }
});

/*
 * POST /insights/comando
 * Corpo: { comando, periodo, blocos: [{ id, type, title, pedido }] }
 * Resposta: { operacoes: [...], resposta, descartados }
 */
router.post('/insights/comando', autenticar, async (req, res) => {
    const comando = String(req.body?.comando || '').trim().slice(0, 500);
    if (!comando) return res.status(400).json({ error: 'Escreva o que você quer na página.' });
    const periodo = normalizarPeriodo(req.body?.periodo);
    const blocos = Array.isArray(req.body?.blocos) ? req.body.blocos.slice(0, 30) : [];
    const ids = new Set(blocos.map((b) => b.id));

    try {
        const ctx = await carregarContexto(req.usuario.id);
        const snap = snapshot(ctx, resolverPeriodo(periodo, ctx.hoje));
        const resumoBlocos = blocos.map((b) => ({ id: b.id, type: b.type, title: b.title, fonte: b.pedido?.fonte, item: b.pedido?.item }));

        const resposta = await gerarJSON(promptComando(comando, resumoBlocos, snap, rotuloPeriodo(periodo)), { temperatura: 0.3, timeoutMs: 40000 });
        const operacoes = [];
        let descartados = 0;

        for (const op of Array.isArray(resposta?.operacoes) ? resposta.operacoes : []) {
            if (op?.op === 'create') {
                const bloco = resolverBloco(ctx, op.bloco, periodo);
                bloco ? operacoes.push({ op: 'create', bloco }) : descartados++;
            } else if (op?.op === 'update' && ids.has(op.id)) {
                const bloco = resolverBloco(ctx, op.bloco, periodo, { id: op.id });
                bloco ? operacoes.push({ op: 'update', id: op.id, bloco }) : descartados++;
            } else if (op?.op === 'remove' && Array.isArray(op.ids)) {
                const validos = op.ids.filter((id) => ids.has(id));
                if (validos.length) operacoes.push({ op: 'remove', ids: validos });
            } else if (op?.op === 'reorder' && Array.isArray(op.ids)) {
                const validos = op.ids.filter((id) => ids.has(id));
                if (validos.length) operacoes.push({ op: 'reorder', ids: validos });
            }
        }

        let texto = typeof resposta?.resposta === 'string' ? resposta.resposta.slice(0, 240) : '';
        if (!operacoes.length && !texto) texto = 'Não encontrei dados para atender esse pedido.';
        if (descartados && !operacoes.length) texto = 'Não há dados suficientes para montar o que você pediu.';
        res.status(200).json({ operacoes, resposta: texto, descartados });
    } catch (error) {
        console.error('❌ [INSIGHTS] comando:', error.message);
        res.status(error.status && error.status < 600 ? 502 : 500).json({ error: 'A IA não conseguiu executar o comando: ' + error.message });
    }
});

/*
 * Blocos fixados: guardados por usuário. A tabela é criada na primeira chamada,
 * para não exigir migração manual no banco.
 */
let tabelaPronta = null;
const garantirTabela = () =>
    (tabelaPronta ??= BD.query(`CREATE TABLE IF NOT EXISTS insights_fixados (
        id_usuario INTEGER PRIMARY KEY,
        blocos JSONB NOT NULL DEFAULT '[]'::jsonb,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`).catch((e) => { tabelaPronta = null; throw e; }));

router.get('/insights/fixados', autenticar, async (req, res) => {
    try {
        await garantirTabela();
        const r = await BD.query('SELECT blocos FROM insights_fixados WHERE id_usuario = $1', [req.usuario.id]);
        res.status(200).json({ blocos: r.rows[0]?.blocos ?? [] });
    } catch (error) {
        console.error('❌ [INSIGHTS] fixados (ler):', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os blocos fixados.' });
    }
});

router.put('/insights/fixados', autenticar, async (req, res) => {
    // Guarda só o necessário para recalcular: o pedido e a apresentação do bloco
    const blocos = (Array.isArray(req.body?.blocos) ? req.body.blocos : []).slice(0, 20).map((b) => ({
        id: String(b.id), type: b.type, title: b.title, size: b.size, priority: b.priority,
        reasoning: b.reasoning, createdAt: b.createdAt, pedido: b.pedido, data: b.data, fixado: true,
    }));
    if (JSON.stringify(blocos).length > 200000) return res.status(413).json({ error: 'Blocos grandes demais.' });
    try {
        await garantirTabela();
        await BD.query(
            `INSERT INTO insights_fixados (id_usuario, blocos, atualizado_em) VALUES ($1, $2::jsonb, now())
             ON CONFLICT (id_usuario) DO UPDATE SET blocos = EXCLUDED.blocos, atualizado_em = now()`,
            [req.usuario.id, JSON.stringify(blocos)]
        );
        res.status(200).json({ ok: true, total: blocos.length });
    } catch (error) {
        console.error('❌ [INSIGHTS] fixados (salvar):', error.message);
        res.status(500).json({ error: 'Não foi possível salvar os blocos fixados.' });
    }
});

export default router;
