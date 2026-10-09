# Setup - FinanceAI API

## Configuração de Variáveis de Ambiente

### 1. Criar arquivo `.env`

Copie o arquivo `.env.example` e renomeie para `.env`:

```bash
cp .env.example .env
```

### 2. Obter a chave da OpenAI

A IA dos Insights usa a OpenAI.

1. Acesse: https://platform.openai.com/api-keys
2. Clique em "Create new secret key"
3. Copie a chave gerada (começa com `sk-`)

### 3. Adicionar a chave ao `.env`

```env
OPENAI_API_KEY=sua_chave_aqui
# opcionais
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING=low
```

Em produção (Vercel), as mesmas variáveis ficam em Settings → Environment Variables do projeto da API.

### 4. Iniciar o servidor

```bash
npm install
npm start
```

Para conferir se a IA responde: `GET /test-ia`.

## Segurança

**Importante**: nunca compartilhe nem faça commit do arquivo `.env` com suas chaves.
O arquivo `.env` está no `.gitignore` e não é versionado.

## Troubleshooting

Se o `/test-ia` mostrar erro de autenticação:
- Verifique se a chave foi copiada corretamente (sem espaços)
- Certifique-se de que a chave está no `.env` (não no `.env.example`)
- Reinicie o servidor (ou faça um novo deploy na Vercel) depois de mudar a chave
