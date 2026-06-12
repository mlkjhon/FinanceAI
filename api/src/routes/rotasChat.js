import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

router.get('/chat/historico', async (req, res) => {
    const id_usuario = req.query.id_usuario || req.body.id_usuario;

    if (!id_usuario) {
        return res.status(400).json({ error: 'É necessário informar o id_usuario' });
    }

    try {
        const comando = `SELECT id_chat, id_usuario, mensagem, resposta FROM chat WHERE id_usuario = $1 ORDER BY id_chat ASC`;
        const chat = await BD.query(comando, [id_usuario]);
        res.status(200).json(chat.rows);
    } catch (error) {
        console.error('❌ ERRO AO LISTAR CHAT ❌', error.message);
        res.status(500).json({ error: '❌ ERRO AO LISTAR CHAT ❌' });
    }
});

router.post('/chat', async (req, res) => {
    const { id_usuario, mensagem } = req.body;

    if (!id_usuario || !mensagem) {
        return res.status(400).json({ error: 'id_usuario e mensagem são obrigatórios' });
    }

    try {
        const API_KEY = "AQ.Ab8RN6Jq-tR42cvtNKzx_5cRtN1hJXb_BWNKCLg1UNJk5LLCtw";
        const url_gemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        
        const resumoQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) AS entradas,
                COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0) AS saidas,
                (COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0)) AS saldo
            FROM transacoes WHERE id_usuario = $1
        `;
        const metasQuery = `SELECT titulo, valor_meta, valor_atual FROM metas_financeiras WHERE id_usuario = $1`;
        const orcamentosQuery = `
            SELECT c.nome as categoria, o.valor_limite 
            FROM orcamentos o JOIN categorias c ON o.id_categoria = c.id_categoria 
            WHERE o.id_usuario = $1
        `;

        const [resResumo, resMetas, resOrc] = await Promise.all([
            BD.query(resumoQuery, [id_usuario]),
            BD.query(metasQuery, [id_usuario]),
            BD.query(orcamentosQuery, [id_usuario])
        ]);

        const resumo = resResumo.rows[0];
        const metasStr = resMetas.rows.map(m => `- Meta "${m.titulo}": R$ ${m.valor_atual} de R$ ${m.valor_meta}`).join('\n') || 'Nenhuma meta definida.';
        const orcStr = resOrc.rows.map(o => `- ${o.categoria}: Limite R$ ${o.valor_limite}`).join('\n') || 'Nenhum orçamento definido.';

        // Instrução do sistema: define o tom e estilo da IA
        const systemPrompt = `Você é o assistente financeiro do FinanceAI, um amigo próximo e empático especializado em finanças pessoais. 
Aqui estão os SEUS dados financeiros (do usuário) para você analisar e usar em suas respostas:
- Saldo atual: R$ ${resumo.saldo}
- Entradas totais: R$ ${resumo.entradas}
- Saídas totais: R$ ${resumo.saidas}

Metas:
${metasStr}

Orçamentos (limites de gastos):
${orcStr}

Regras obrigatórias:
- Responda perguntas sobre a vida financeira do usuário usando os dados acima. Seja específico e analítico quando prestativo.
- SE o usuário pedir explicitamente para VOCÊ registrar/anotar um ganho (receita) ou um gasto (despesa), responda o texto normalmente encorajando-o E adicione NO FINAL da sua resposta OBRIGATORIAMENTE um bloco JSON oculto neste exato formato: {"acao": "transacao", "descricao": "nome curto", "valor": 100.00, "tipo": "X"} onde X é "E" para receita/ganho ou "S" para despesa/gasto.
- NUNCA use markdown como #, ##, **, *, _, listas com traço ou asterisco
- Escreva em parágrafo corrido e natural, como uma conversa informal
- Seja caloroso, humano e encorajador, não robótico
- Se o usuário estiver passando por dificuldade financeira, reconheça isso com empatia antes de dar dicas
- Respostas diretas, no máximo 3 parágrafos curtos
- Fale português brasileiro informal`;

        const response = await fetch(url_gemini, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUsuário diz: ${mensagem}` }] }]
            })
        });

        const data = await response.json();
        
        let resposta_ia = "Não consegui formular uma resposta.";
        if (data.error) {
            resposta_ia = `O Gemini IA recusou a resposta (Erro 404): Verifique se a sua Chave de API foi digitada corretamente. => ${data.error.message}`;
        } else if (data && data.candidates && data.candidates.length > 0) {
            resposta_ia = data.candidates[0].content.parts[0].text;
            
            // Interceptar ações da IA (ex: {"acao": "transacao", "descricao": "...", "valor": 100, "tipo": "E"})
            const matchIndex = resposta_ia.indexOf('{"acao"');
            if (matchIndex !== -1) {
                try {
                    const jsonStr = resposta_ia.substring(matchIndex);
                    const action = JSON.parse(jsonStr.trim());
                    
                    if (action.acao === 'transacao') {
                        await BD.query(
                            `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria) VALUES ($1, $2, $3, $4, NULL)`,
                            [id_usuario, action.descricao, action.valor, action.tipo]
                        );
                    }
                    resposta_ia = resposta_ia.substring(0, matchIndex).trim();
                } catch (e) {
                    console.error('Erro ao processar JSON da IA:', e.message);
                }
            }
        }

        const comando = `INSERT INTO chat (id_usuario, mensagem, resposta) VALUES ($1, $2, $3) RETURNING *`;
        const valores = [id_usuario, mensagem, resposta_ia];
        
        const inserido = await BD.query(comando, valores);

        return res.status(200).json(inserido.rows[0]);

    } catch (error) {
        console.error('Erro na IA Gemini / Cadastro Chat', error.message);
        return res.status(500).json({ error: 'Erro ao gerar resposta da IA: ' + error.message });
    }
});

router.delete('/chat', async (req, res) => {
    const id_usuario = req.query.id_usuario || req.body.id_usuario;
    
    if (!id_usuario) {
        return res.status(400).json({ error: 'Para limpar o histórico informe o id_usuario' });
    }

    try {
        const comando = `DELETE FROM chat WHERE id_usuario = $1`;
        await BD.query(comando, [id_usuario]);
        return res.status(200).json({ message: 'Histórico do chat apagado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar Chat', error.message);
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

router.delete('/chat/:id_mensagem', async (req, res) => {
    const { id_mensagem } = req.params;

    try {
        const comando = `DELETE FROM chat WHERE id_chat = $1`;
        await BD.query(comando, [id_mensagem]);
        return res.status(200).json({ message: 'Mensagem deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar mensagem do Chat', error.message);
        return res.status(500).json({ error: 'Erro no Servidor' });
    }
});

export default router;
