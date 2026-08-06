import { BD } from './db.js';

async function fix() {
    try {
        const updateS = await BD.query(`UPDATE transacoes SET tipo = 'S' WHERE tipo = 'despesa'`);
        const updateE = await BD.query(`UPDATE transacoes SET tipo = 'E' WHERE tipo = 'receita'`);
        console.log('Fixed despesa to S:', updateS.rowCount);
        console.log('Fixed receita to E:', updateE.rowCount);
        process.exit(0);
    } catch (e) {
        console.error('Error fixing db:', e);
        process.exit(1);
    }
}

fix();
