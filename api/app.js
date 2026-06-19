import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import rotasUsuarios from "./src/routes/rotasUsuarios.js";
import rotasTransacoes from "./src/routes/rotasTransacoes.js";
import rotasDashboard from "./src/routes/rotasDashboard.js";
import rotasChat from "./src/routes/rotasChat.js";
import rotasCategorias from "./src/routes/rotasCategorias.js";
import rotasSubcategorias from "./src/routes/rotasSubcategorias.js";
import rotasMetas from "./src/routes/rotasMetas.js";
import rotasOrcamentos from "./src/routes/rotasOrcamentos.js";
import rotasInsights from "./src/routes/rotasInsights.js";
import rotasOpenFinance from "./src/routes/rotasOpenFinance.js";

import { BD, testarConexao } from "./db.js";

import swaggerUI from "swagger-ui-express";
import swagger from './config/swagger.js';
import cors from 'cors';

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
    await testarConexao();
    // res.status(200).json('API FUNCIONANDO ✅');
    res.redirect('/swagger')
});

// Rota de teste para verificar Gemini API
app.get('/test-gemini', async (req, res) => {
    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        console.log('[TEST-GEMINI] API_KEY carregada:', API_KEY ? 'SIM' : 'NAO');
        
        if (!API_KEY) {
            return res.status(500).json({ erro: 'GEMINI_API_KEY nao configurada!' });
        }
        
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        console.log('[TEST-GEMINI] Testando API...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ola! Voce funciona?' }] }]
            })
        });
        
        console.log('[TEST-GEMINI] Status:', response.status);
        const data = await response.json();
        
        res.json({
            status: response.status,
            api_key_loaded: !!API_KEY,
            response: data
        });
    } catch (error) {
        console.error('[TEST-GEMINI] Erro:', error.message);
        res.status(500).json({ erro: error.message });
    }
});

app.use(cors());

//Utilizando Rotas
app.use(rotasUsuarios);
app.use(rotasTransacoes);
app.use(rotasDashboard);
app.use(rotasChat);
app.use(rotasCategorias);
app.use(rotasSubcategorias);
app.use(rotasMetas);
app.use(rotasOrcamentos);
app.use(rotasInsights);
app.use(rotasOpenFinance);

app.get('/swagger', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head>
  <title>API Ordens de Serviço</title>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
</head><body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${JSON.stringify(swagger)},
      dom_id: '#swagger-ui',
      persistAuthorization: true
    })
  </script>
</body></html>`);
});

const porta = 3000;
app.listen(porta, () => {
    console.log(`-> http://localhost:${porta} <-`);
});
