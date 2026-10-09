// Chamada única ao Gemini, usada pelo chat, pelos insights e pelo /test-gemini.
// O modelo fica numa variável de ambiente porque o Google aposenta modelos
// para chaves novas (o gemini-2.5-flash parou de funcionar assim).
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export class GeminiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

// opcoes.json: pede ao Gemini uma resposta em JSON puro (sem markdown em volta)
export const gerarTexto = async (prompt, opcoes = {}) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new GeminiError('GEMINI_API_KEY não configurada no servidor', 500);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
            method: 'POST',
            // A chave vai no header, e não na URL, para não aparecer em logs
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    ...(opcoes.json ? { responseMimeType: 'application/json' } : {}),
                    ...(opcoes.temperatura != null ? { temperature: opcoes.temperatura } : {}),
                },
            }),
            signal: AbortSignal.timeout(opcoes.timeoutMs || 25000),
        }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
        const msg = data.error?.message || `Gemini respondeu HTTP ${response.status}`;
        console.error(`❌ [GEMINI] ${GEMINI_MODEL}: ${msg}`);
        throw new GeminiError(msg, response.status || 502);
    }

    const texto = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!texto) throw new GeminiError('O Gemini não devolveu texto (resposta vazia ou bloqueada)', 502);
    return texto;
};

// Gera e já faz o parse do JSON (tolerante a cercas de markdown que escapem)
export const gerarJSON = async (prompt, opcoes = {}) => {
    const texto = await gerarTexto(prompt, { ...opcoes, json: true });
    const limpo = texto.replace(/```json|```/g, '').trim();
    try {
        return JSON.parse(limpo);
    } catch {
        const ini = limpo.search(/[[{]/);
        const fim = Math.max(limpo.lastIndexOf('}'), limpo.lastIndexOf(']'));
        if (ini >= 0 && fim > ini) return JSON.parse(limpo.slice(ini, fim + 1));
        throw new GeminiError('A IA devolveu um JSON inválido', 502);
    }
};
