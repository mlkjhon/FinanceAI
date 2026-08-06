import { BD } from './db.js';

const migration = async () => {
    try {
        await BD.query(`
            CREATE TABLE IF NOT EXISTS investimentos (
                id_investimento SERIAL PRIMARY KEY,
                id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(100) NOT NULL,
                taxa_rendimento NUMERIC(10, 4) DEFAULT 0, -- Porcentagem de rendimento diário
                saldo_atual NUMERIC(15, 2) DEFAULT 0,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabela 'investimentos' criada com sucesso.");

        await BD.query(`
            CREATE TABLE IF NOT EXISTS transacoes_investimentos (
                id_transacao_inv SERIAL PRIMARY KEY,
                id_investimento INT REFERENCES investimentos(id_investimento) ON DELETE CASCADE,
                tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('aporte', 'resgate', 'rendimento')),
                valor NUMERIC(15, 2) NOT NULL,
                data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabela 'transacoes_investimentos' criada com sucesso.");

        process.exit(0);
    } catch (err) {
        console.error("Erro ao rodar migration:", err);
        process.exit(1);
    }
};

migration();
