import { BD } from "../../db.js";

/*
 * Categorias por usuário.
 * - id_usuario NULL  = categoria padrão do app (todo mundo vê, ninguém edita)
 * - id_usuario = X   = categoria criada pelo usuário X (só ele vê e edita)
 * As colunas e o índice são criados na primeira chamada, sem migração manual.
 */
let pronto = null;

const ignorar = (e) => console.warn('[CATEGORIAS] migração:', e.message);

export const garantirCategoriasPorUsuario = () =>
    (pronto ??= (async () => {
        await BD.query('ALTER TABLE categorias ADD COLUMN IF NOT EXISTS id_usuario INTEGER');
        await BD.query('ALTER TABLE subcategorias ADD COLUMN IF NOT EXISTS id_usuario INTEGER');

        // Um "unique" só no nome impediria dois usuários de criarem a mesma categoria:
        // troca por único por (usuário, nome)
        const restricoes = await BD.query(`
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = con.conkey[1]
            WHERE rel.relname = 'categorias' AND con.contype = 'u'
              AND array_length(con.conkey, 1) = 1 AND att.attname = 'nome'`);
        for (const { conname } of restricoes.rows) {
            await BD.query(`ALTER TABLE categorias DROP CONSTRAINT "${conname.replace(/"/g, '')}"`).catch(ignorar);
        }
        const indices = await BD.query(`
            SELECT i.relname
            FROM pg_index x
            JOIN pg_class i ON i.oid = x.indexrelid
            JOIN pg_class t ON t.oid = x.indrelid
            JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = x.indkey[0]
            WHERE t.relname = 'categorias' AND x.indisunique AND NOT x.indisprimary
              AND x.indnatts = 1 AND att.attname = 'nome'`);
        for (const { relname } of indices.rows) {
            await BD.query(`DROP INDEX IF EXISTS "${relname.replace(/"/g, '')}"`).catch(ignorar);
        }
        await BD.query('CREATE UNIQUE INDEX IF NOT EXISTS categorias_usuario_nome ON categorias (COALESCE(id_usuario, 0), LOWER(nome))').catch(ignorar);
    })().catch((e) => { pronto = null; throw e; }));

// Filtro SQL: categorias que o usuário enxerga (padrão + as dele). $N = id do usuário
export const visivelPara = (alias, n) => `(${alias}.id_usuario IS NULL OR ${alias}.id_usuario = $${n})`;
