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
      dom_id: '#swagger-ui'})
  </script>
</body></html>`);
});

const porta = 3000;
app.listen(porta, () => {
    console.log(`-> http://localhost:${porta} <-`);
});
