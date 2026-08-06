import { BD } from './db.js';

const migration = async () => {
    try {
        await BD.query(`
            ALTER TABLE investimentos 
            ADD COLUMN IF NOT EXISTS indexador VARCHAR(50) DEFAULT 'PREFIXADO';
        `);
        console.log("Coluna 'indexador' adicionada à tabela 'investimentos' com sucesso.");
        process.exit(0);
    } catch (err) {
        console.error("Erro ao rodar migration:", err);
        process.exit(1);
    }
};

migration();
