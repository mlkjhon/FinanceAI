import cron from 'node-cron';
import { processarRendimentosPendentes } from '../services/rendimentos.js';

// Usado apenas quando a API roda localmente. Na Vercel (serverless) os rendimentos
// sao creditados sob demanda, quando os investimentos sao consultados.
export const startCronJobs = () => {
    // '5 0 * * *' = todo dia as 00:05 (horario de Brasilia)
    cron.schedule('5 0 * * *', async () => {
        console.log('⏰ [CRON] Iniciando processamento de rendimentos diários...');
        try {
            const total = await processarRendimentosPendentes();
            console.log(`⏰ [CRON] Rendimentos processados com sucesso. Total: ${total} rendimentos creditados.`);
        } catch (error) {
            console.error('❌ [CRON] Erro ao processar rendimentos:', error.message);
        }
    }, { timezone: 'America/Sao_Paulo' });
};
