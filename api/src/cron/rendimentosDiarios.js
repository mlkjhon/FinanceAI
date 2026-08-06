import cron from 'node-cron';
import { BD } from '../../db.js';

export const startCronJobs = () => {
    // Roda todo dia à meia noite (00:00)
    // Para fins de teste (se o usuario quiser que renda todo minuto, basta alterar a string cron)
    // '0 0 * * *' = meia noite
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [CRON] Iniciando processamento de rendimentos diários...');
        try {
            // Obter todos os investimentos que possuem taxa_rendimento > 0
            const investimentosQuery = await BD.query(`SELECT id_investimento, taxa_rendimento, 
                COALESCE(
                   (SELECT SUM(CASE WHEN tipo IN ('aporte', 'rendimento') THEN valor ELSE -valor END)
                    FROM transacoes_investimentos ti 
                    WHERE ti.id_investimento = i.id_investimento), 0
               ) as saldo_atual
            FROM investimentos i WHERE taxa_rendimento > 0`);
            
            const investimentos = investimentosQuery.rows;

            if (investimentos.length === 0) {
                console.log('⏰ [CRON] Nenhum investimento com taxa positiva encontrado.');
                return;
            }

            let processados = 0;
            for (const inv of investimentos) {
                if (inv.saldo_atual > 0) {
                    // Taxa anual informada. Converter para taxa diária simples.
                    // Para compostos seria Math.pow(1 + taxa/100, 1/365) - 1
                    const taxaDiaria = parseFloat(inv.taxa_rendimento) / 365;
                    // Rendimento = (Saldo Atual * Taxa Diaria) / 100
                    const valorRendimento = (parseFloat(inv.saldo_atual) * taxaDiaria) / 100;
                    
                    if (valorRendimento > 0) {
                        await BD.query(
                            `INSERT INTO transacoes_investimentos (id_investimento, tipo, valor) VALUES ($1, 'rendimento', $2)`,
                            [inv.id_investimento, valorRendimento.toFixed(4)]
                        );
                        processados++;
                    }
                }
            }
            
            console.log(`⏰ [CRON] Rendimentos processados com sucesso. Total: ${processados} investimentos receberam rendimento.`);
        } catch (error) {
            console.error('❌ [CRON] Erro ao processar rendimentos:', error.message);
        }
    });
};
