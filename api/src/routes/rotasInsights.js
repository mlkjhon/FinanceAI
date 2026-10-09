import { Router } from "express";
import { BD } from "../../db.js";
import { autenticar } from "../middlewares/autenticar.js";
import { gerarTexto } from "../services/gemini.js";

const router = Router();


router.get('/insights', autenticar, async (req, res) => {
    const id_usuario = req.usuario.id;

    try {
        // Busca um resumo dos gastos do usuário por categoria
        const queryGastos = `
            SELECT COALESCE(c.nome, 'Sem categoria') AS categoria, COALESCE(SUM(t.valor), 0) AS total
            FROM transacoes t
            LEFT JOIN subcategorias s ON t.id_subcategoria = s.id_subcategoria
            LEFT JOIN categorias c ON s.id_categoria = c.id_categoria
            WHERE t.tipo = 'S' AND t.id_usuario = $1
              AND DATE_TRUNC('month', t.data_registro) = DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY COALESCE(c.nome, 'Sem categoria')
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

        try {
            const textoResposta = await gerarTexto(promptInsights);
            const textoLimpo = textoResposta.replace(/```json|```/g, '').trim();
            const inicio = textoLimpo.indexOf('[');
            const fim = textoLimpo.lastIndexOf(']');
            const dicas = JSON.parse(textoLimpo.slice(inicio, fim + 1));
            const dicasComId = dicas.map((d, i) => ({ ...d, id: String(i + 1) }));
            return res.status(200).json(dicasComId);
        } catch (error) {
            console.error('Erro ao gerar insights:', error.message);
            return res.status(502).json({ error: 'Não foi possível gerar as dicas: ' + error.message });
        }
    } catch (dbError) {
        console.error('Erro no banco de dados:', dbError.message);
        return res.status(500).json({ error: 'Erro ao processar dados: ' + dbError.message });
    }
});

export default router;
