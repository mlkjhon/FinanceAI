import { BD } from './db.js';

async function run() {
    try {
        await BD.query('ALTER TABLE subcategorias ALTER COLUMN id_categoria DROP NOT NULL');
        console.log('Table altered successfully!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}
run();
