import express, { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

//Criando o endpoint para listar todos os usuários
router.get('/usuarios', autenticar, async (req, res) => {
    try {
        const query = `SELECT id_usuario, nome, email FROM usuarios ORDER BY id_usuario`;

        //Cria uma variável para receber o retorno do SQL
        const usuarios = await BD.query(query);

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

export default router;