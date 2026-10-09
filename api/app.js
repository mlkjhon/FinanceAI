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
import rotasInvestimentos from "./src/routes/rotasInvestimentos.js";

import { BD, testarConexao } from "./db.js";
import { gerarTexto, GEMINI_MODEL } from "./src/services/gemini.js";

import swaggerUI from "swagger-ui-express";
import swagger from './config/swagger.js';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.use(express.json());

app.get('/', async (req, res) => {
    await testarConexao();
    // res.status(200).json('API FUNCIONANDO ✅');
    res.redirect('/swagger')
});

// Diagnóstico do Gemini: mostra se a chave existe e se o modelo responde
app.get('/test-gemini', async (req, res) => {
    try {
        const texto = await gerarTexto('Responda apenas: ok');
        res.json({ status: 200, api_key_loaded: true, modelo: GEMINI_MODEL, resposta: texto.trim() });
    } catch (error) {
        res.status(error.status || 500).json({
            status: error.status || 500,
            api_key_loaded: !!process.env.GEMINI_API_KEY,
            modelo: GEMINI_MODEL,
            erro: error.message,
        });
    }
});

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
app.use(rotasInvestimentos);

// Start Cron Jobs apenas fora da Vercel (Vercel é serverless, não suporta cron persistente)
app.get('/swagger', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head>
  <title>API Finance AI</title>
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

// Cron Jobs apenas fora da Vercel (serverless nao suporta processos persistentes)
if (!process.env.VERCEL) {
    import('./src/cron/rendimentosDiarios.js').then(({ startCronJobs }) => {
        startCronJobs();
        console.log('⏰ [CRON] Cron jobs iniciados.');
    }).catch(err => console.error('❌ [CRON] Falha ao iniciar cron jobs:', err.message));

    const porta = 3000;
    app.listen(porta, () => {
        console.log(`-> http://localhost:${porta} <-`);
    });
}

export default app;
