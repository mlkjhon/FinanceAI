import express from 'express';
import { BD } from '../../db.js';
import {autenticar} from '../middlewares/autenticar.js';

const router = express.Router();

const POLP_API_KEY = "wNeUIto7y7e5GsXfkqY9OLBsv3rOJyl0c7td42nA7xTtJdojwJEEbg5MEVrkdhdn";
const POLP_BASE_URL = "https://api.polp.com.br";

router.post('/link-token', autenticar, async (req, res) => {
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


router.post('/pluggy/connect-token', autenticar, async (req, res) => {
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

router.post('/conexoes', autenticar, async (req, res) => {
    const { id_usuario, public_token, instituicao, substituirTransacoes } = req.body;

    if (!id_usuario || !public_token) {
        return res.status(400).json({ error: 'id_usuario e public_token são obrigatórios' });
    }

    try {
        const clientId = 'f8e57dd0-2c03-41b5-b2d8-6b63f2672751';
        const clientSecret = '54aac48c-1d05-4594-9ab9-eed8810c2e72';

        // 1. Autenticar para pegar apiKey
        console.log('🔑 Autenticando na Pluggy...');
        const authRes = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret })
        });
        if (!authRes.ok) {
            const errTxt = await authRes.text();
            console.error('❌ Auth falhou:', errTxt);
            throw new Error('Falha ao autenticar na Pluggy');
        }
        const { apiKey } = await authRes.json();
        console.log('✅ Autenticado na Pluggy com sucesso');

        // 1.5 Aguardar a sincronização do Item na Pluggy concluir
        console.log(`⏳ Aguardando sincronização do item ${public_token}...`);
        let syncCompleto = false;
        let tentativas = 0;
        while (!syncCompleto && tentativas < 20) { // Espera até 40 segundos (20 * 2s)
            const itemRes = await fetch(`https://api.pluggy.ai/items/${public_token}`, {
                headers: { 'X-API-KEY': apiKey }
            });
            if (itemRes.ok) {
                const itemData = await itemRes.json();
                const status = itemData.executionStatus;
                console.log(`   Status da sincronização: ${status}`);
                
                if (status === 'SUCCESS' || status === 'PARTIAL_SUCCESS') {
                    syncCompleto = true;
                } else if (status === 'LOGIN_ERROR' || status === 'OUTDATED' || status === 'WAITING_USER_INPUT') {
                    console.error(`❌ Erro ou necessidade de ação na sincronização do item: ${status}`);
                    break;
                }
            }
            if (!syncCompleto) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                tentativas++;
            }
        }

        // 2. Buscar contas reais da Pluggy ANTES de modificar qualquer coisa local
        console.log(`🏦 Buscando contas com itemId=${public_token}`);
        const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${public_token}`, {
            headers: { 'X-API-KEY': apiKey }
        });
        const accountsData = await accountsRes.json();
        const accounts = accountsData.results || [];
        console.log(`📊 Pluggy retornou ${accounts.length} conta(s):`, accounts.map(a => a.name));

        // 3. Para cada conta, buscar as transações da Pluggy PRIMEIRO (antes de apagar local)
        const dadosPluggy = [];
        for (const acc of accounts) {
            console.log(`💳 Buscando transações da conta ${acc.name} (id=${acc.id})`);
            const txRes = await fetch(`https://api.pluggy.ai/transactions?accountId=${acc.id}&pageSize=200`, {
                headers: { 'X-API-KEY': apiKey }
            });
            const txData = await txRes.json();
            let transacoes = txData.results || [];
            
            if (transacoes.length === 0 && (instituicao === 'Pluggy Bank' || instituicao?.toLowerCase().includes('pluggy'))) {
                console.log(`   ⚙️ Gerando transações realistas para demonstração (Pluggy Sandbox - Conta: ${acc.type})`);
                const hoje = new Date();
                const gerarData = (diasAtras) => {
                    const d = new Date(hoje);
                    d.setDate(d.getDate() - diasAtras);
                    d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
                    return d.toISOString();
                };

                if (acc.type === 'CREDIT') {
                    transacoes = [
                        { description: 'Uber *Trip', amount: -28.90, date: gerarData(0), category: 'Transporte', status: 'POSTED' },
                        { description: 'iFood *Restaurante', amount: -85.50, date: gerarData(1), category: 'Alimentação', status: 'POSTED' },
                        { description: 'Netflix.com', amount: -55.90, date: gerarData(5), category: 'Entretenimento', status: 'POSTED' },
                        { description: 'Mercado Livre', amount: -129.90, date: gerarData(7), category: 'Compras', status: 'POSTED' },
                        { description: 'Amazon Prime', amount: -14.90, date: gerarData(10), category: 'Assinaturas', status: 'POSTED' },
                        { description: 'Posto Shell', amount: -150.00, date: gerarData(12), category: 'Transporte', status: 'POSTED' },
                        { description: 'Spotify Premium', amount: -21.90, date: gerarData(15), category: 'Assinaturas', status: 'POSTED' },
                        { description: 'Restaurante Coco Bambu', amount: -350.00, date: gerarData(18), category: 'Lazer', status: 'POSTED' },
                        { description: 'Droga Raia', amount: -45.30, date: gerarData(22), category: 'Saúde', status: 'POSTED' },
                        { description: 'Uber *Trip', amount: -35.00, date: gerarData(25), category: 'Transporte', status: 'POSTED' }
                    ];
                } else {
                    // Transações típicas de Conta Corrente
                    transacoes = [
                        { description: 'Pix Recebido - João Silva', amount: 350.00, date: gerarData(1), category: 'Transferências', status: 'POSTED' },
                        { description: 'Pagamento Fatura Cartão', amount: -1250.00, date: gerarData(2), category: 'Cartão de Crédito', status: 'POSTED' },
                        { description: 'Pix Enviado - Maria Oliveira', amount: -120.00, date: gerarData(3), category: 'Transferências', status: 'POSTED' },
                        { description: 'Salário Mensal', amount: 15450.00, date: gerarData(5), category: 'Salário', status: 'POSTED' },
                        { description: 'Conta de Energia (Enel)', amount: -245.80, date: gerarData(8), category: 'Contas', status: 'POSTED' },
                        { description: 'Condomínio', amount: -850.00, date: gerarData(10), category: 'Moradia', status: 'POSTED' },
                        { description: 'Supermercado Carrefour', amount: -540.20, date: gerarData(12), category: 'Mercado', status: 'POSTED' },
                        { description: 'Rendimento CDI', amount: 85.40, date: gerarData(15), category: 'Investimentos', status: 'POSTED' },
                        { description: 'Conta de Água', amount: -95.50, date: gerarData(18), category: 'Contas', status: 'POSTED' },
                        { description: 'Pix Recebido - Cashback', amount: 25.00, date: gerarData(20), category: 'Outros', status: 'POSTED' }
                    ];
                }
            }

            console.log(`   → ${transacoes.length} transação(ões) para ${acc.name}`);
            dadosPluggy.push({ acc, transacoes });
        }

        // 4. Buscar subcategorias para mapeamento
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

        // 5. Agora SIM apagamos os dados locais (se o usuário confirmou)
        if (substituirTransacoes) {
            console.log('🗑️ Apagando dados manuais antigos do usuário...');
            await BD.query(`DELETE FROM transacoes WHERE id_usuario = $1 AND id_conta IS NULL`, [id_usuario]);
            await BD.query(`DELETE FROM contas_cartoes WHERE id_usuario = $1 AND id_conexao IS NULL`, [id_usuario]);
            await BD.query(`DELETE FROM conexoes_bancarias WHERE id_usuario = $1 AND instituicao = $2 AND item_id != $3`, [id_usuario, instituicao || 'Banco', public_token]);
            console.log('✅ Dados manuais apagados');
        }

        // 6. Criar a conexão no banco local
        const access_token = 'pluggy-access-' + Date.now();
        const novaConexao = await BD.query(
            `INSERT INTO conexoes_bancarias (id_usuario, instituicao, item_id, token_acesso) VALUES ($1, $2, $3, $4) RETURNING *`,
            [id_usuario, instituicao || 'Banco', public_token, access_token]
        );
        const id_conexao = novaConexao.rows[0].id;
        console.log(`✅ Conexão criada no banco com id=${id_conexao}`);

        // 7. Inserir contas e transações da Pluggy
        const contasSalvas = [];
        let totalTransacoes = 0;

        for (const { acc, transacoes } of dadosPluggy) {
            const tipoConta = acc.type === 'CREDIT' ? 'CREDITO' : 'CONTA_CORRENTE';
            const saldo = acc.balance || 0;
            const limite = acc.creditData?.creditLimit || null;
            const ultimos_digitos = acc.number ? acc.number.slice(-4) : '0000';

            const salvaConta = await BD.query(
                `INSERT INTO contas_cartoes (id_usuario, id_conexao, nome, tipo, ultimos_digitos, limite, saldo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [id_usuario, id_conexao, acc.name || 'Conta Bancária', tipoConta, ultimos_digitos, limite, saldo]
            );
            contasSalvas.push(salvaConta.rows[0]);
            const id_conta = salvaConta.rows[0].id;

            console.log(`💾 Inserindo ${transacoes.length} transações da conta ${acc.name}...`);
            if (transacoes.length > 0) {
                const valores = [];
                const placeholders = [];
                let i = 1;
                
                for (const tx of transacoes) {
                    const descricao = tx.description || 'Transação Open Finance';
                    const valor = Math.abs(tx.amount || 0);
                    const tipo = tx.amount < 0 ? 'S' : 'E';
                    const data_registro = tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];
                    const id_subcategoria = mapearCategoria(tx.category);

                    valores.push(id_usuario, id_conta, descricao, valor, tipo, id_subcategoria, data_registro);
                    placeholders.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
                }

                await BD.query(
                    `INSERT INTO transacoes (id_usuario, id_conta, descricao, valor, tipo, id_subcategoria, data_registro) VALUES ${placeholders.join(', ')}`,
                    valores
                );
                totalTransacoes += transacoes.length;
            }
        }

        console.log(`✅ Sincronização concluída! ${contasSalvas.length} conta(s), ${totalTransacoes} transação(ões) inseridas.`);
        res.status(201).json({ conexao: novaConexao.rows[0], contas: contasSalvas, totalTransacoes });

    } catch (error) {
        console.error('❌ ERRO AO SALVAR CONEXAO BANCARIA ❌', error);
        res.status(500).json({ error: 'Erro ao salvar conexão: ' + error.message });
    }
});

router.post('/conexoes/manual', autenticar, async (req, res) => {
    const { id_usuario, nome } = req.body;
    try {
        const item_id = 'manual_' + Date.now();
        const access_token = 'none';
        
        const novaConexao = await BD.query(
            `INSERT INTO conexoes_bancarias (id_usuario, instituicao, item_id, token_acesso) VALUES ($1, $2, $3, $4) RETURNING *`,
            [id_usuario, nome || 'Meu Espaço de Teste', item_id, access_token]
        );
        
        await BD.query(
            `INSERT INTO contas_cartoes (id_usuario, id_conexao, nome, tipo, ultimos_digitos, limite, saldo) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id_usuario, novaConexao.rows[0].id, 'Carteira / Caixa', 'CONTA_CORRENTE', '0000', null, 0]
        );

        res.status(201).json({ message: 'Espaço manual criado com sucesso', conexao: novaConexao.rows[0] });
    } catch (error) {
        console.error('Erro ao criar espaço manual:', error);
        res.status(500).json({ error: 'Erro interno ao criar espaço manual.' });
    }
});

router.delete('/conexoes/:id', autenticar, async (req, res) => {
    const { id } = req.params;
    try {
        await BD.query(`DELETE FROM conexoes_bancarias WHERE id = $1`, [id]);
        res.status(200).json({ message: 'Conexão deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar conexão.' });
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

router.get('/ping', autenticar, async (req, res) => {
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
