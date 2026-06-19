import {Pool} from 'pg';

const BD = new Pool ({
    connectionString: "postgresql://postgres.okfbdtdhqcqlzbhgqejs:BancodeDados@aws-1-us-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false},
    connectionTimeoutMillis: 5000 
});

// const BD = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'bd_finan_control_3b',
//     port: 5432,
//     password: 'postgres'
// });

const testarConexao = async () => {
    try{
        const cliente = await BD.connect();
        console.log(' ✅ CONEXÃO REALIZADA COM SUCESSO ✅ ');
        cliente.release();
    }
    catch(error){
        console.error(' ❌ ERRO AO CONECTAR AO BANCO DE DADOS ❌ ', error.message);
        
    }
};

export {BD, testarConexao}