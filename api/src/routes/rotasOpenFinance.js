import express from 'express';
import { BD } from '../../db.js';

const router = express.Router();

const POLP_API_KEY = "wNeUIto7y7e5GsXfkqY9OLBsv3rOJyl0c7td42nA7xTtJdojwJEEbg5MEVrkdhdn";
const POLP_BASE_URL = "https://api.polp.com.br";

router.post('/link-token', async (req, res) => {
    const { id_usuario } = req.body;
    if (!id_usuario) return res.status(400).json({ error: 'id_usuario é obrigatório' });

    try {
        
        
        const response = await fetch(`${POLP_BASE_URL}/v1/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POLP_API_KEY}`
            },
            body: JSON.stringify({ userId: id_usuario })
        });
        
        if(!response.ok) {
            console.log("A API de Open Finance reportou falha (esperado por falta de body spec), enviando token simulado para teste de frontend");
            return res.status(200).json({ link_token: 'link-mock-polp-12345' });
        }

        const data = await response.json();
        res.status(200).json({ link_token: data.token || 'link-mock-polp-12345' });
    } catch (error) {
        console.error('❌ ERRO NO OPEN FINANCE LINK ❌', error.message);
        res.status(200).json({ link_token: 'link-mock-polp-12345' });
    }
});

router.post('/conexoes', async (req, res) => {
    const { id_usuario, public_token, instituicao } = req.body;

    if (!id_usuario || !public_token) {
        return res.status(400).json({ error: 'id_usuario e public_token são obrigatórios' });
    }

    try {
        const access_token = 'access-token-' + Math.random().toString(36).substring(7);
        const item_id = 'item-' + Math.random().toString(36).substring(7);

        const comando = `
            INSERT INTO conexoes_bancarias (id_usuario, instituicao, item_id, token_acesso) 
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const novaConexao = await BD.query(comando, [id_usuario, instituicao || 'Polp Bank', item_id, access_token]);

        const addCardCmd = `
            INSERT INTO contas_cartoes (id_usuario, id_conexao, nome, tipo, ultimos_digitos, limite, saldo)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const cartao1 = await BD.query(addCardCmd, [id_usuario, novaConexao.rows[0].id, 'Cartão Black', 'CREDITO', '4921', 8500.00, -1250.40]);
        const conta2 = await BD.query(addCardCmd, [id_usuario, novaConexao.rows[0].id, 'Conta Corrente', 'CONTA_CORRENTE', '9123', null, 5000.00]);

        res.status(201).json({ 
            conexao: novaConexao.rows[0], 
            contas: [cartao1.rows[0], conta2.rows[0]] 
        });
    } catch (error) {
        console.error('❌ ERRO AO SALVAR CONEXAO BANCARIA ❌', error.message);
        res.status(500).json({ error: 'Erro ao salvar conexão' });
    }
});

// Sincronizar dados e listar conexões do banco
router.get('/conexoes/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const conexoes = await BD.query(`SELECT * FROM conexoes_bancarias WHERE id_usuario = $1`, [id_usuario]);
        const cartoes = await BD.query(`SELECT * FROM contas_cartoes WHERE id_usuario = $1`, [id_usuario]);
        
        res.status(200).json({ conexoes: conexoes.rows, contas: cartoes.rows });
    } catch (error) {
        console.error('Erro ao buscar dados do open finance', error.message);
        res.status(500).json({ error: 'Erro ao buscar contas e cartões.' });
    }
});

// Ping test route
router.get('/ping', async (req, res) => {
    try {
        console.log("Ping contra a Polp recebido...");
        const response = await fetch(`${POLP_BASE_URL}/v1/ping`, {
            headers: { 'Authorization': `Bearer ${POLP_API_KEY}` }
        });
        const txt = await response.text();
        res.status(response.status).json({ polp_response: txt, status: response.status });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
