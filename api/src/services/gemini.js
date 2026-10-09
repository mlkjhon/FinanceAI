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

/*
 * Leitor incremental: recebe o JSON da IA aos pedaços e devolve cada objeto do
 * array "chave" assim que ele fecha. Respeita strings (chaves dentro de texto
 * não contam) e escapes.
 */
export function criarLeitorDeArray(chave, aoObjeto) {
    let buffer = '';
    let pos = 0;
    let dentroDoArray = false;
    let inicioObj = -1;
    let prof = 0;
    let emString = false;
    let escape = false;
    return (pedaco) => {
        buffer += pedaco;
        if (!dentroDoArray) {
            const m = buffer.match(new RegExp(`"${chave}"\\s*:\\s*\\[`));
            if (!m) return;
            dentroDoArray = true;
            pos = m.index + m[0].length;
        }
        for (; pos < buffer.length; pos++) {
            const c = buffer[pos];
            if (emString) {
                if (escape) escape = false;
                else if (c === '\\') escape = true;
                else if (c === '"') emString = false;
                continue;
            }
            if (c === '"') emString = true;
            else if (c === '{') {
                if (prof === 0) inicioObj = pos;
                prof++;
            } else if (c === '}') {
                prof--;
                if (prof === 0 && inicioObj >= 0) {
                    try {
                        aoObjeto(JSON.parse(buffer.slice(inicioObj, pos + 1)));
                    } catch (e) {
                        console.warn('[GEMINI] objeto do stream inválido:', e.message);
                    }
                    inicioObj = -1;
                }
            }
        }
    };
}

/*
 * Streaming (SSE) do Gemini: chama aoObjeto para cada item de "chave" assim
 * que ele termina de ser gerado. Devolve quantos objetos saíram.
 */
export const gerarJSONStream = async (prompt, chave, aoObjeto, opcoes = {}) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new GeminiError('GEMINI_API_KEY não configurada no servidor', 500);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    ...(opcoes.temperatura != null ? { temperature: opcoes.temperatura } : {}),
                },
            }),
            signal: AbortSignal.timeout(opcoes.timeoutMs || 45000),
        }
    );
    if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        const msg = data.error?.message || `Gemini respondeu HTTP ${response.status}`;
        console.error(`❌ [GEMINI] stream ${GEMINI_MODEL}: ${msg}`);
        throw new GeminiError(msg, response.status || 502);
    }

    let total = 0;
    const ler = criarLeitorDeArray(chave, (obj) => { total++; aoObjeto(obj); });
    const decoder = new TextDecoder();
    let resto = '';
    for await (const bytes of response.body) {
        resto += decoder.decode(bytes, { stream: true });
        const eventos = resto.split(/\r?\n\r?\n/);
        resto = eventos.pop() ?? '';
        for (const ev of eventos) {
            const linha = ev.split(/\r?\n/).find((l) => l.startsWith('data:'));
            if (!linha) continue;
            try {
                const data = JSON.parse(linha.slice(5).trim());
                const texto = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
                if (texto) ler(texto);
            } catch {
                /* evento parcial ou keep-alive */
            }
        }
    }
    return total;
};
