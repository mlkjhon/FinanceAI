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
            return res.status(200).json({ link_token: 'link-mock-polp-12345' });
        }

        const data = await response.json();
        res.status(200).json({ link_token: data.token || 'link-mock-polp-12345' });
    } catch (error) {
        res.status(200).json({ link_token: 'link-mock-polp-12345' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Rota segura: gera o Connect Token da Pluggy no servidor (nunca no browser)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/pluggy/connect-token', async (req, res) => {
    try {
        const clientId = 'f8e57dd0-2c03-41b5-b2d8-6b63f2672751';
        const clientSecret = '54aac48c-1d05-4594-9ab9-eed8810c2e72';

        // 1. Autenticar com as credenciais Pluggy → obter apiKey
        const authRes = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret })
        });

        if (!authRes.ok) {
            const errBody = await authRes.text();
            console.error('❌ PLUGGY AUTH FALHOU:', errBody);
            return res.status(502).json({ error: 'Falha ao autenticar com a Pluggy' });
        }

        const { apiKey } = await authRes.json();

        // 2. Gerar o Connect Token usando o apiKey
        const ctRes = await fetch('https://api.pluggy.ai/connect_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            }
        });

        if (!ctRes.ok) {
            const errBody = await ctRes.text();
            console.error('❌ PLUGGY CONNECT TOKEN FALHOU:', errBody);
            return res.status(502).json({ error: 'Falha ao gerar Connect Token' });
        }

        const { accessToken } = await ctRes.json();
        console.log('✅ Pluggy Connect Token gerado com sucesso');

        res.status(200).json({ connectToken: accessToken });
    } catch (error) {
        console.error('❌ ERRO AO GERAR PLUGGY CONNECT TOKEN:', error.message);
        res.status(500).json({ error: 'Erro interno ao gerar token' });
    }
});

router.post('/conexoes', async (req, res) => {
    const { id_usuario, public_token, instituicao, substituirTransacoes } = req.body;

    if (!id_usuario || !public_token) {
        return res.status(400).json({ error: 'id_usuario e public_token são obrigatórios' });
    }

    try {
        const clientId = 'f8e57dd0-2c03-41b5-b2d8-6b63f2672751';
        const clientSecret = '54aac48c-1d05-4594-9ab9-eed8810c2e72';

        // 1. Autenticar para pegar apiKey
        const authRes = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret })
        });
        if (!authRes.ok) throw new Error('Falha ao autenticar na Pluggy');
        const { apiKey } = await authRes.json();

        // 2. Criar a conexão no banco local
        const access_token = 'pluggy-access-' + Date.now();
        const novaConexao = await BD.query(
            `INSERT INTO conexoes_bancarias (id_usuario, instituicao, item_id, token_acesso) VALUES ($1, $2, $3, $4) RETURNING *`,
            [id_usuario, instituicao || 'Banco', public_token, access_token]
        );
        const id_conexao = novaConexao.rows[0].id;

        // 3. Buscar contas reais da Pluggy
        const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${public_token}`, {
            headers: { 'X-API-KEY': apiKey }
        });
        const accountsData = await accountsRes.json();
        const accounts = accountsData.results || [];

        // 4. Se o usuário aprovou substituir, limpamos os dados manuais
        if (substituirTransacoes) {
             await BD.query(`DELETE FROM transacoes WHERE id_usuario = $1`, [id_usuario]);
             await BD.query(`DELETE FROM contas_cartoes WHERE id_usuario = $1`, [id_usuario]);
             await BD.query(`DELETE FROM conexoes_bancarias WHERE id_usuario = $1 AND id != $2`, [id_usuario, id_conexao]);
        }

        const contasSalvas = [];
        
        // Buscar subcategorias para mapeamento inteligente com a Pluggy
        const subCatQuery = await BD.query(`SELECT id_subcategoria, nome FROM subcategorias`);
        const subcategorias = subCatQuery.rows;
        
        const mapearCategoria = (pluggyCat) => {
            if (!pluggyCat) return null;
            const normalized = pluggyCat.toLowerCase();
            const found = subcategorias.find(s => 
                normalized.includes(s.nome.toLowerCase()) || 
                s.nome.toLowerCase().includes(normalized)
            );
            return found ? found.id_subcategoria : null;
        };

        for (const acc of accounts) {
            // Salvar conta
            const tipoConta = acc.type === 'CREDIT' ? 'CREDITO' : 'CONTA_CORRENTE';
            const saldo = acc.balance || 0;
            const limite = acc.creditData?.creditLimit || null;
            const ultimos_digitos = acc.number ? acc.number.slice(-4) : '0000';

            const addCardCmd = `INSERT INTO contas_cartoes (id_usuario, id_conexao, nome, tipo, ultimos_digitos, limite, saldo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
            const salvaConta = await BD.query(addCardCmd, [id_usuario, id_conexao, acc.name || 'Conta Bancária', tipoConta, ultimos_digitos, limite, saldo]);
            contasSalvas.push(salvaConta.rows[0]);

            // Se for substituir as transacoes, buscar transacoes desta conta na Pluggy
            if (substituirTransacoes) {
                const txRes = await fetch(`https://api.pluggy.ai/transactions?accountId=${acc.id}`, {
                    headers: { 'X-API-KEY': apiKey }
                });
                const txData = await txRes.json();
                const transacoes = txData.results || [];

                for (const tx of transacoes) {
                    const descricao = tx.description || 'Transação Open Finance';
                    const valor = Math.abs(tx.amount || 0);
                    // Pluggy: Despesas são negativas
                    const tipo = tx.amount < 0 ? 'S' : 'E';
                    const data_registro = tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];
                    const id_subcategoria = mapearCategoria(tx.category);

                    await BD.query(
                        `INSERT INTO transacoes (id_usuario, descricao, valor, tipo, id_subcategoria, data_registro) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [id_usuario, descricao, valor, tipo, id_subcategoria, data_registro]
                    );
                }
            }
        }

        res.status(201).json({ conexao: novaConexao.rows[0], contas: contasSalvas });
    } catch (error) {
        console.error('❌ ERRO AO SALVAR CONEXAO BANCARIA ❌', error);
        res.status(500).json({ error: 'Erro ao salvar conexão' });
    }
});

router.get('/conexoes/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const conexoes = await BD.query(`SELECT * FROM conexoes_bancarias WHERE id_usuario = $1`, [id_usuario]);
        const cartoes  = await BD.query(`SELECT * FROM contas_cartoes WHERE id_usuario = $1`, [id_usuario]);
        res.status(200).json({ conexoes: conexoes.rows, contas: cartoes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contas e cartões.' });
    }
});

router.get('/ping', async (req, res) => {
    try {
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
