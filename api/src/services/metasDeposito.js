/*
 * Depósito em meta = uma transação de saída "Investido na meta: <título>"
 * + o valor somado em metas_financeiras.valor_atual (+ um movimento no histórico).
 * Apagar o depósito precisa desfazer as três coisas juntas.
 */
export const PREFIXO_META = 'Investido na meta: ';
export const ehDepositoMeta = (descricao = '') => String(descricao).startsWith(PREFIXO_META);

// Qual meta recebeu essa transação: pelo histórico (ligação exata) ou, nas antigas, pelo título
async function metaDaTransacao(cliente, id_usuario, transacao) {
    try {
        const mov = await cliente.query('SAVEPOINT busca_mov').then(() =>
            cliente.query('SELECT id_meta FROM metas_movimentos WHERE id_transacao = $1 AND id_usuario = $2 LIMIT 1', [transacao.id_transacao, id_usuario])
        );
        await cliente.query('RELEASE SAVEPOINT busca_mov');
        if (mov.rows.length) return mov.rows[0].id_meta;
    } catch (e) {
        // tabela de histórico ainda não existe: segue pelo título
        await cliente.query('ROLLBACK TO SAVEPOINT busca_mov').catch(() => {});
    }
    const titulo = String(transacao.descricao).slice(PREFIXO_META.length);
    const r = await cliente.query(
        'SELECT id_meta FROM metas_financeiras WHERE id_usuario = $1 AND titulo = $2 ORDER BY id_meta DESC LIMIT 1',
        [id_usuario, titulo]
    );
    return r.rows[0]?.id_meta ?? null;
}

/*
 * Estorna o depósito: tira o valor da meta (sem ficar negativo) e apaga o
 * movimento do histórico. Deve rodar dentro de uma transação do banco (BEGIN),
 * junto com o DELETE da transação. Devolve a meta atualizada (ou null).
 */
export async function estornarDepositoMeta(cliente, id_usuario, transacao) {
    if (!ehDepositoMeta(transacao.descricao)) return null;
    const id_meta = await metaDaTransacao(cliente, id_usuario, transacao);
    if (!id_meta) return null;

    const meta = await cliente.query(
        'UPDATE metas_financeiras SET valor_atual = GREATEST(valor_atual - $1, 0) WHERE id_meta = $2 AND id_usuario = $3 RETURNING *',
        [Number(transacao.valor) || 0, id_meta, id_usuario]
    );
    try {
        await cliente.query('SAVEPOINT apaga_mov');
        await cliente.query('DELETE FROM metas_movimentos WHERE id_transacao = $1 AND id_usuario = $2', [transacao.id_transacao, id_usuario]);
        await cliente.query('RELEASE SAVEPOINT apaga_mov');
    } catch {
        await cliente.query('ROLLBACK TO SAVEPOINT apaga_mov').catch(() => {});
    }
    return meta.rows[0] ?? null;
}
