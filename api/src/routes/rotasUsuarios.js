import express, { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

// Um usuário só pode ler/alterar/excluir a própria conta
const ehOProprio = (req, res) => {
    if (Number(req.params.id_usuario) !== Number(req.usuario.id)) {
        res.status(403).json({ error: 'Você só pode alterar a sua própria conta.' });
        return false;
    }
    return true;
};

// Lista apenas o próprio usuário (antes devolvia todos os usuários do sistema)
router.get('/usuarios', autenticar, async (req, res) => {
    try {
        const query = `SELECT id_usuario, nome, email FROM usuarios WHERE id_usuario = $1`;

        //Cria uma variável para receber o retorno do SQL
        const usuarios = await BD.query(query, [req.usuario.id]);

        res.status(200).json(usuarios.rows);
    }
    catch (error) {
        console.error(' ❌ ERRO AO LISTAR USUÁRIOS ❌ ', error.message);
        res.status(500).json({ error: '❌ ERRO AO LISTAR USUÁRIOS ❌' })
    }
});

router.post('/usuarios', async (req, res) => {

    const { nome, email, senha} = req.body;

    try {
        const saltRounds = 10;
        //gerando a rash da senha
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        const comando = `INSERT INTO usuarios(nome, email, senha) VALUES($1, $2, $3)`;
        const valores = [nome, email, senhaCriptografada, ];

        await BD.query(comando, valores);
        console.log(comando, valores);

        return res.status(201).json('Usuário cadastrado');
    } catch (error) {
        if (error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }
        console.error('Erro ao cadastrado usuarios', error.message);
        return res.status(500).json({ error: 'Erro ao cadastrar usuarios' });
    }
});

router.put('/usuarios/:id_usuario', autenticar, async (req, res) => {

    const { id_usuario } = req.params;
    const { nome, email, senha} = req.body
    if (!ehOProprio(req, res)) return;

    try {

        const verificarUsuario = await BD.query(`SELECT * FROM usuarios WHERE id_usuario = $1`, [id_usuario]);
        if (verificarUsuario.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' })
        }

        // Monta a query dinamicamente apenas com os campos fornecidos:
        let campos = [];
        let valores = [];
        let count = 1;

        if (nome !== undefined) {
             campos.push(`nome = $${count++}`);
             valores.push(nome);
        }
        if (email !== undefined) {
             campos.push(`email = $${count++}`);
             valores.push(email);
        }
        if (senha !== undefined) {
             const saltRounds = 10;
             const senhaCriptografada = await bcrypt.hash(senha, saltRounds);
             campos.push(`senha = $${count++}`);
             valores.push(senhaCriptografada);
        }

        if (campos.length === 0) {
              return res.status(400).json({ message: 'Nenhum campo editável foi enviado' });
        }

        valores.push(id_usuario);
        const comando = `UPDATE usuarios SET ${campos.join(", ")} WHERE id_usuario = $${count}`;
        await BD.query(comando, valores);

        return res.status(200).json('Usuário atualizado com sucesso')
    }
    catch (error) {
        if (error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
            return res.status(400).json({ error: 'Email já está em uso por outro usuário' });
        }
        console.error('Erro ao atualizar usuário');
        return res.status(500).json({ error: 'Erro ao atualizar usuarios' });
    }
});

router.delete('/usuarios/:id_usuario', autenticar, async (req, res) => {

    const { id_usuario } = req.params;
    if (!ehOProprio(req, res)) return;

    try {
        const comando = `DELETE FROM usuarios WHERE id_usuario = $1`;
        const resultado = await BD.query(comando, [id_usuario]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        return res.status(200).json({ message: 'Usuário desativado com sucesso' });

    } catch (error) {
        console.error('Erro ao desativar Usuário', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor' + error.message });
    }
});

router.post('/login', async (req, res) => {

    const {email, senha} = req.body;
    if (!email || !senha) {
        // CORREÇÃO: O original tinha res.return(400) que causava crash. Corrigido para res.status(400)
        return res.status(400).json({ message: 'Email e senha são obrigatórios' }); 
    }
    try {
        const comando = `SELECT id_usuario, nome, email, senha FROM usuarios WHERE email =$1`;
        const resultado = await BD.query(comando, [email]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ message: 'Email não encontrado' });
        };

        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

        if (!senhaCorreta ) {   
            return res.status(401).json({ message: 'Senha inválida' });
        }

        // Criando token com fallback caso JWT_SECRET não esteja configurado no painel da Vercel
        const secret = process.env.JWT_SECRET || 'chave_hksdjfh_default';
        const token = jwt.sign({ id: usuario.id_usuario, email: usuario.email }, secret, { expiresIn: '8h' });

        return res.status(200).json({
            message: 'Login realizado com sucesso',
            token: token,
            usuario: {
                id: usuario.id_usuario,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar Usuário', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor' + error.message });
    }
});

/*
 * Configurações da conta (perfil). Sempre do usuário do token, nunca por id na URL.
 */
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function conferirSenha(id_usuario, senha) {
    const r = await BD.query('SELECT senha FROM usuarios WHERE id_usuario = $1', [id_usuario]);
    if (!r.rows.length || !senha) return false;
    return bcrypt.compare(String(senha), r.rows[0].senha);
}

router.get('/perfil', autenticar, async (req, res) => {
    try {
        const r = await BD.query('SELECT id_usuario AS id, nome, email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Conta não encontrada.' });
        return res.status(200).json(r.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Não foi possível carregar a conta.' });
    }
});

router.put('/perfil', autenticar, async (req, res) => {
    const nome = String(req.body?.nome ?? '').trim().slice(0, 80);
    const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 254);
    if (nome.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
    if (!emailValido(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
    try {
        const r = await BD.query(
            'UPDATE usuarios SET nome = $1, email = $2 WHERE id_usuario = $3 RETURNING id_usuario AS id, nome, email',
            [nome, email, req.usuario.id]
        );
        return res.status(200).json(r.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Esse e-mail já está em uso por outra conta.' });
        return res.status(500).json({ error: 'Não foi possível salvar os dados.' });
    }
});

router.put('/perfil/senha', autenticar, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body || {};
    if (!novaSenha || String(novaSenha).length < 6) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 6 caracteres.' });
    try {
        if (!(await conferirSenha(req.usuario.id, senhaAtual))) return res.status(400).json({ error: 'A senha atual está incorreta.' });
        const hash = await bcrypt.hash(String(novaSenha), 10);
        await BD.query('UPDATE usuarios SET senha = $1 WHERE id_usuario = $2', [hash, req.usuario.id]);
        return res.status(200).json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Não foi possível trocar a senha.' });
    }
});

/*
 * DELETE /perfil  { senha }
 * Apaga a conta e todos os dados dela, numa transação só.
 * Tabelas que ainda não existem no banco são puladas (savepoint por comando).
 */
router.delete('/perfil', autenticar, async (req, res) => {
    const id = req.usuario.id;
    const cliente = await BD.connect();
    try {
        if (!(await conferirSenha(id, req.body?.senha))) return res.status(400).json({ error: 'Senha incorreta.' });

        const comandos = [
            'DELETE FROM transacoes_investimentos WHERE id_investimento IN (SELECT id_investimento FROM investimentos WHERE id_usuario = $1)',
            'DELETE FROM investimentos WHERE id_usuario = $1',
            'DELETE FROM metas_movimentos WHERE id_usuario = $1',
            'DELETE FROM metas_financeiras WHERE id_usuario = $1',
            'DELETE FROM orcamentos WHERE id_usuario = $1',
            'DELETE FROM transacoes WHERE id_usuario = $1',
            'DELETE FROM contas_cartoes WHERE id_usuario = $1',
            'DELETE FROM conexoes_bancarias WHERE id_usuario = $1',
            'DELETE FROM insights_analises WHERE id_usuario = $1',
            'DELETE FROM insights_fixados WHERE id_usuario = $1',
            'DELETE FROM subcategorias WHERE id_usuario = $1',
            'DELETE FROM categorias WHERE id_usuario = $1',
        ];
        await cliente.query('BEGIN');
        for (const sql of comandos) {
            await cliente.query('SAVEPOINT passo');
            try {
                await cliente.query(sql, [id]);
            } catch (e) {
                // 42P01 = tabela não existe, 42703 = coluna não existe: nada para apagar ali
                if (e.code !== '42P01' && e.code !== '42703') throw e;
                await cliente.query('ROLLBACK TO SAVEPOINT passo');
            }
        }
        await cliente.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
        await cliente.query('COMMIT');
        return res.status(200).json({ ok: true });
    } catch (error) {
        await cliente.query('ROLLBACK').catch(() => {});
        console.error('Erro ao excluir conta:', error.message);
        return res.status(500).json({ error: 'Não foi possível excluir a conta.' });
    } finally {
        cliente.release();
    }
});

export default router;