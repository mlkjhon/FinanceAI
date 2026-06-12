import { BD as pool } from './db.js';

async function createOpenFinanceTables() {
  try {
    // Criando a tabela de conexões bancárias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conexoes_bancarias (
          id SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          instituicao VARCHAR(100),
          item_id VARCHAR(255),
          token_acesso VARCHAR(500),
          status VARCHAR(50) DEFAULT 'ACTIVE',
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Criando a tabela de contas/cartões pertencentes a cada conexão
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contas_cartoes (
          id SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          id_conexao INTEGER REFERENCES conexoes_bancarias(id) ON DELETE CASCADE,
          nome VARCHAR(100),
          tipo VARCHAR(50),
          ultimos_digitos VARCHAR(10),
          limite DECIMAL(15,2),
          saldo DECIMAL(15,2),
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas de open finance criadas com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao criar tabelas: ", err.message);
    process.exit(1);
  }
}

createOpenFinanceTables();
