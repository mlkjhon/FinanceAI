// Chamada única à IA (OpenAI), usada pelos Insights e pelo /test-ia.
// O modelo e o esforço de raciocínio ficam em variáveis de ambiente para dar
// para trocar sem mexer no código.
export const MODELO_IA = process.env.OPENAI_MODEL || 'gpt-5.5';
// "low" mantém a página rápida; "medium" pensa mais e demora mais
const ESFORCO = process.env.OPENAI_REASONING || 'low';
const URL_OPENAI = 'https://api.openai.com/v1/chat/completions';

export class IAError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

function corpo(prompt, opcoes, stream) {
    return JSON.stringify({
        model: MODELO_IA,
        messages: [{ role: 'user', content: prompt }],
        reasoning_effort: ESFORCO,
        ...(opcoes.json ? { response_format: { type: 'json_object' } } : {}),
        ...(stream ? { stream: true } : {}),
    });
}

function cabecalhos() {
    const chave = process.env.OPENAI_API_KEY;
    if (!chave) throw new IAError('OPENAI_API_KEY não configurada no servidor', 500);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` };
}

async function falha(response) {
    const data = await response.json().catch(() => ({}));
    const msg = data.error?.message || `OpenAI respondeu HTTP ${response.status}`;
    console.error(`❌ [IA] ${MODELO_IA}: ${msg}`);
    throw new IAError(msg, response.status || 502);
}

// opcoes.json: pede uma resposta em JSON puro
export const gerarTexto = async (prompt, opcoes = {}) => {
    const response = await fetch(URL_OPENAI, {
        method: 'POST',
        headers: cabecalhos(),
        body: corpo(prompt, opcoes, false),
        signal: AbortSignal.timeout(opcoes.timeoutMs || 25000),
    });
    if (!response.ok) await falha(response);
    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content || '';
    if (!texto) throw new IAError('A IA não devolveu texto (resposta vazia ou recusada)', 502);
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
        throw new IAError('A IA devolveu um JSON inválido', 502);
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
                        console.warn('[IA] objeto do stream inválido:', e.message);
                    }
                    inicioObj = -1;
                }
            }
        }
    };
}

/*
 * Streaming (SSE) da OpenAI: chama aoObjeto para cada item de "chave" assim
 * que ele termina de ser gerado. Devolve quantos objetos saíram.
 */
export const gerarJSONStream = async (prompt, chave, aoObjeto, opcoes = {}) => {
    const response = await fetch(URL_OPENAI, {
        method: 'POST',
        headers: cabecalhos(),
        body: corpo(prompt, { ...opcoes, json: true }, true),
        signal: AbortSignal.timeout(opcoes.timeoutMs || 45000),
    });
    if (!response.ok || !response.body) await falha(response);

    let total = 0;
    const ler = criarLeitorDeArray(chave, (obj) => { total++; aoObjeto(obj); });
    const decoder = new TextDecoder();
    let resto = '';
    for await (const bytes of response.body) {
        resto += decoder.decode(bytes, { stream: true });
        const linhas = resto.split(/\r?\n/);
        resto = linhas.pop() ?? '';
        for (const linha of linhas) {
            if (!linha.startsWith('data:')) continue;
            const dado = linha.slice(5).trim();
            if (dado === '[DONE]') return total;
            try {
                const pedaco = JSON.parse(dado).choices?.[0]?.delta?.content;
                if (pedaco) ler(pedaco);
            } catch {
                /* linha parcial ou keep-alive */
            }
        }
    }
    return total;
};
