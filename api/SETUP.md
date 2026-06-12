# Setup - FinanceAI API

## Configuração de Variáveis de Ambiente

### 1. Criar arquivo `.env`

Copie o arquivo `.env.example` e renomeie para `.env`:

```bash
cp .env.example .env
```

### 2. Obter sua Chave de API do Google Gemini

1. Acesse: https://makersuite.google.com/app/apikey
2. Clique em "Create API Key"
3. Selecione um projeto ou crie um novo
4. Copie a chave gerada

### 3. Adicionar a chave ao `.env`

Abra o arquivo `.env` e substitua `your_gemini_api_key_here` pela sua chave:

```env
GEMINI_API_KEY=sua_chave_aqui
```

### 4. Iniciar o servidor

```bash
npm install
npm start
```

## Segurança

⚠️ **IMPORTANTE**: Nunca compartilhe ou faça commit do arquivo `.env` com suas chaves!
O arquivo `.env` está no `.gitignore` e não será versionado.

## Troubleshooting

Se receber erro "Invalid authentication credentials":
- Verifique se a chave foi copiada corretamente (sem espaços)
- Certifique-se de que a chave foi adicionada ao arquivo `.env` (não no `.env.example`)
- Reinicie o servidor após adicionar a chave
