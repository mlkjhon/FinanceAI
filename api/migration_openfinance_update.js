import { BD as pool } from './db.js';

async function run() {
  try {
    await pool.query(`
      ALTER TABLE transacoes 
      ADD COLUMN IF NOT EXISTS id_conta INTEGER REFERENCES contas_cartoes(id) ON DELETE CASCADE;
    `);
    console.log("Coluna id_conta adicionada com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro na migration:", err.message);
    process.exit(1);
  }
}
run();
