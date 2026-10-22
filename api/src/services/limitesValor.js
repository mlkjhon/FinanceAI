import { BD } from "../../db.js";

/*
 * Valores em dinheiro: o app deixa digitar milhões e bilhões, mas as colunas
 * antigas do banco (NUMERIC com poucos dígitos) estouravam ("numeric field overflow").
 * - Na primeira requisição, as colunas de valor pequenas viram NUMERIC(15,2)
 *   (até R$ 9,9 trilhões), sem migração manual.
 * - VALOR_MAXIMO é o teto aceito pelas rotas (cabe com folga em NUMERIC(15,2)).
 */
export const VALOR_MAXIMO = 999_999_999_999.99; // quase R$ 1 trilhão

const COLUNAS = [
    ['transacoes', 'valor'],
    ['metas_financeiras', 'valor_meta'],
    ['metas_financeiras', 'valor_atual'],
    ['orcamentos', 'valor_limite'],
    ['transacoes_investimentos', 'valor'],
    ['metas_movimentos', 'valor'],
    ['metas_movimentos', 'saldo_apos'],
];

let pronto = null;
export const garantirColunasValor = () =>
    (pronto ??= (async () => {
        const r = await BD.query(
            `SELECT table_name, column_name, numeric_precision
             FROM information_schema.columns
             WHERE table_schema = 'public' AND data_type = 'numeric'
               AND (table_name || '.' || column_name) = ANY($1::text[])`,
            [COLUNAS.map(([t, c]) => `${t}.${c}`)]
        );
        for (const { table_name, column_name, numeric_precision } of r.rows) {
            if (numeric_precision != null && numeric_precision < 15) {
                await BD.query(`ALTER TABLE "${table_name}" ALTER COLUMN "${column_name}" TYPE NUMERIC(15,2)`)
                    .then(() => console.log(`[VALORES] ${table_name}.${column_name} agora é NUMERIC(15,2)`))
                    .catch((e) => console.warn(`[VALORES] não deu para ampliar ${table_name}.${column_name}:`, e.message));
            }
        }
    })().catch((e) => { pronto = null; console.warn('[VALORES] verificação:', e.message); }));

// Middleware: garante as colunas (só pesa na primeira vez) e recusa valor acima do teto
export async function limitarValores(req, res, next) {
    await garantirColunasValor();
    const corpo = req.body || {};
    for (const campo of ['valor', 'valor_meta', 'valor_atual', 'valor_limite']) {
        const v = Number(corpo[campo]);
        if (corpo[campo] != null && Number.isFinite(v) && Math.abs(v) > VALOR_MAXIMO) {
            return res.status(400).json({ error: 'Valor alto demais. O máximo é R$ 999.999.999.999,99.' });
        }
    }
    next();
}

// Erro do Postgres quando o número não cabe na coluna (22003): vira mensagem clara
export const ehEstouroNumerico = (e) => e?.code === '22003';
export const MSG_ESTOURO = 'Valor alto demais para salvar. Tente um valor menor.';
