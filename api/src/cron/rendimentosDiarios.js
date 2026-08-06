import cron from 'node-cron';
import { BD } from '../../db.js';

export const startCronJobs = () => {
    // Roda todo dia à meia noite (00:00)
    // Para fins de teste (se o usuario quiser que renda todo minuto, basta alterar a string cron)
    // '0 0 * * *' = meia noite
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [CRON] Iniciando processamento de rendimentos diários...');
        try {
            // Buscar taxas atuais da BrasilAPI
            let taxasAtuais = { cdi: 10.5, selic: 10.5, ipca: 4.5 }; // Valores default de fallback
            try {
                const response = await fetch('https://brasilapi.com.br/api/taxas/v1');
                const taxas = await response.json();
                
                const getTaxa = (nome) => {
                    const t = taxas.find(t => t.nome.toLowerCase() === nome.toLowerCase());
                    return t ? t.valor : null;
                };

                const cdiAPI = getTaxa('cdi');
                const selicAPI = getTaxa('selic');
                const ipcaAPI = getTaxa('ipca');
                
                if (cdiAPI) taxasAtuais.cdi = cdiAPI;
                if (selicAPI) taxasAtuais.selic = selicAPI;
                if (ipcaAPI) taxasAtuais.ipca = ipcaAPI;
                console.log(`⏰ [CRON] Taxas base atualizadas: CDI=${taxasAtuais.cdi}%, SELIC=${taxasAtuais.selic}%, IPCA=${taxasAtuais.ipca}%`);
            } catch (err) {
                console.warn('⚠️ [CRON] Erro ao buscar taxas da BrasilAPI, usando fallback.', err.message);
            }

            // Obter todos os investimentos que possuem taxa_rendimento > 0
            const investimentosQuery = await BD.query(`SELECT id_investimento, taxa_rendimento, indexador,
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
                    let taxaAnual = parseFloat(inv.taxa_rendimento); // Ex: 120 (para 120% CDI) ou 10 (para 10% Prefixado)
                    const indexador = (inv.indexador || 'PREFIXADO').toUpperCase();

                    // Calcula a taxa anual efetiva com base no indexador
                    if (indexador === 'CDI') {
                        taxaAnual = (taxaAnual / 100) * taxasAtuais.cdi; // 120% de 10.5 = 12.6
                    } else if (indexador === 'SELIC') {
                        taxaAnual = (taxaAnual / 100) * taxasAtuais.selic;
                    } else if (indexador === 'IPCA') {
                        taxaAnual = taxasAtuais.ipca + taxaAnual; // IPCA + 6% = 4.5 + 6 = 10.5
                    } // PREFIXADO mantem a taxa inserida

                    // Converter taxa anual para diária (simples)
                    const taxaDiaria = taxaAnual / 365;
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
