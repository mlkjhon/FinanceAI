import { BD } from './db.js';

const cats = await BD.query('SELECT id_categoria, nome FROM categorias');
for (const cat of cats.rows) {
  const existing = await BD.query('SELECT id_subcategoria FROM subcategorias WHERE id_categoria = $1 LIMIT 1', [cat.id_categoria]);
  if (existing.rows.length === 0) {
    await BD.query('INSERT INTO subcategorias (id_categoria, nome) VALUES ($1, $2)', [cat.id_categoria, cat.nome]);
    console.log('Criado subcategoria para:', cat.nome);
  } else {
    console.log('Ja existe para:', cat.nome, '| id_sub:', existing.rows[0].id_subcategoria);
  }
}
process.exit(0);
