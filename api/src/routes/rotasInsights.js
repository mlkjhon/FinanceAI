import { Router } from "express";
import { BD } from "../../db.js";

const router = Router();


router.get('/insights', async (req, res) => {
    const { id_usuario } = req.query;

    if (!id_usuario) {
        return res.status(400).json({ error: 'O id_usuario é obrigatório.' });
    }

    try {
        // Busca um resumo dos gastos do usuário por categoria
        const queryGastos = `
            SELECT c.nome AS categoria, COALESCE(SUM(t.valor), 0) AS total
            FROM transacoes t
            INNER JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
            INNER JOIN categorias c ON s.id_categoria = c.id_categoria
            WHERE t.tipo = 'S' AND t.id_usuario = $1
              AND DATE_TRUNC('month', t.data_registro) = DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY c.nome
            ORDER BY total DESC
            LIMIT 5
        `;

        // Busca o saldo resumido do mês
        const queryResumo = `
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'E' THEN valor ELSE 0 END), 0) AS entradas,
                COALESCE(SUM(CASE WHEN tipo = 'S' THEN valor ELSE 0 END), 0) AS saidas
            FROM transacoes
            WHERE id_usuario = $1
              AND DATE_TRUNC('month', data_registro) = DATE_TRUNC('month', CURRENT_DATE)
        `;

        const resGastos = await BD.query(queryGastos, [id_usuario]);
        const resResumo = await BD.query(queryResumo, [id_usuario]);

        const gastos = resGastos.rows;
        const resumo = resResumo.rows[0];

        if (!gastos.length) {
            return res.status(200).json([]);
        }

        const contextFinanceiro = `
Dados financeiros do usuário este mês:
- Entradas: R$ ${parseFloat(resumo.entradas).toFixed(2)}
- Saídas: R$ ${parseFloat(resumo.saidas).toFixed(2)}
- Saldo: R$ ${(parseFloat(resumo.entradas) - parseFloat(resumo.saidas)).toFixed(2)}
- Maiores gastos por categoria: ${gastos.map(g => `${g.categoria}: R$ ${parseFloat(g.total).toFixed(2)}`).join(', ')}
        `.trim();

        const promptInsights = `${contextFinanceiro}

Com base nesses dados, gere EXATAMENTE 3 dicas financeiras personalizadas para esse usuário.
Responda SOMENTE com um JSON válido, sem markdown, sem explicações extras, apenas o array JSON.
Formato exato:
[
  {"tipo": "sugestao", "titulo": "Título curto", "descricao": "Dica em 2-3 frases naturais e empáticas, sem bullet points e sem markdown"},
  {"tipo": "economia", "titulo": "Título curto", "descricao": "Dica em 2-3 frases"},
  {"tipo": "gasto", "titulo": "Título curto", "descricao": "Dica em 2-3 frases"}
]
Tipos permitidos: economia, gasto, sugestao, padrao`;

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'API_KEY não configurada' });
        }

        const url_gemini = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        try {
            const response = await fetch(url_gemini, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptInsights }] }]
                })
            });

            const data = await response.json();

            if (data.error) {
                return res.status(500).json({ error: 'Erro na IA: ' + data.error.message });
            }

            const textoResposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const textoLimpo = textoResposta.replace(/```json|```/g, '').trim();
            const dicas = JSON.parse(textoLimpo);
            const dicasComId = dicas.map((d, i) => ({ ...d, id: String(i + 1) }));
            return res.status(200).json(dicasComId);
        } catch (error) {
            console.error('Erro ao gerar insights:', error.message);
            return res.status(500).json({ error: 'Erro ao gerar dicas personalizadas: ' + error.message });
        }
    } catch (dbError) {
        console.error('Erro no banco de dados:', dbError.message);
        return res.status(500).json({ error: 'Erro ao processar dados: ' + dbError.message });
    }
});

export default router;
