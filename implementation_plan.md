# Implementação do Módulo de Investimentos

O objetivo desta implementação é criar um sistema completo de gestão de investimentos dentro do FinanceAI. O usuário poderá criar investimentos, definir taxas de rendimento, e registrar aportes, resgates e rendimentos. O sistema integrará automaticamente os aportes e resgates com o saldo principal da conta corrente do usuário.

## User Review Required

> [!IMPORTANT]
> **Integração com o Saldo Principal:** Quando você fizer um **Aporte** (colocar dinheiro no investimento), o sistema registrará automaticamente uma **Saída (Despesa)** na sua conta principal. Quando fizer um **Resgate** (tirar dinheiro do investimento), registrará uma **Entrada (Receita)**. Isso garantirá que o dinheiro "saia" da sua conta corrente para o investimento e vice-versa. Você concorda com este comportamento?

> [!IMPORTANT]
> **Categorias:** Vou criar/utilizar categorias específicas (ex: "Investimentos" como despesa para aportes e receita para resgates) para que essas movimentações não baguncem seus gráficos de gastos (ex: alimentação, lazer).

## Open Questions

> [!NOTE]
> Você prefere que o rendimento seja adicionado **manualmente** por você todo mês/dia, ou quer um botão "Render Mês Atual" que calcula e aplica a porcentagem (taxa) que você definiu automaticamente sobre o saldo do investimento? (A princípio, implementarei ambas as opções na tela: adicionar valor manual ou calcular via taxa).

## Proposed Changes

---

### Banco de Dados (PostgreSQL)

Criação de novas tabelas para gerenciar os investimentos e seu histórico, vinculados ao usuário.

#### [NEW] `investimentos` (Tabela)
- `id_investimento` (Primary Key)
- `id_usuario` (Foreign Key - usuários)
- `nome` (Nome do investimento, ex: Tesouro Direto, CDB)
- `taxa_rendimento` (Porcentagem, ex: 1.0 para 1% ao mês)
- `data_criacao` (Timestamp)

#### [NEW] `transacoes_investimentos` (Tabela)
- `id_transacao_inv` (Primary Key)
- `id_investimento` (Foreign Key - investimentos)
- `tipo` (Enum/String: 'aporte', 'resgate', 'rendimento')
- `valor` (Valor numérico)
- `data_registro` (Timestamp)

---

### Backend API (Node.js/Express)

Criação das rotas para o gerenciamento de dados de investimentos.

#### [NEW] `api/src/routes/rotasInvestimentos.js`
- `GET /` - Retorna a lista de investimentos do usuário logado, incluindo o saldo atual de cada um (calculado pela soma de aportes + rendimentos - resgates).
- `POST /` - Cria um novo investimento.
- `GET /:id` - Retorna os detalhes de um investimento específico e todo o seu histórico (aportes, resgates, rendimentos).
- `POST /:id/transacao` - Endpoint crucial. Registra uma transação no investimento. 
  - Se for **Aporte**, registra na tabela `transacoes` principal como despesa.
  - Se for **Resgate**, registra na tabela `transacoes` principal como receita.
  - Se for **Rendimento**, afeta apenas o saldo do investimento.

#### [MODIFY] `api/app.js`
- Registrar a nova rota `/api/investimentos`.

---

### Frontend UI (React / TanStack Router)

Criação das telas para o usuário interagir com os investimentos.

#### [NEW] `frontend/src/routes/investimentos/index.tsx`
- **Dashboard de Investimentos:** Lista em formato de Cards ou Tabela todos os investimentos ativos.
- Mostrará o Saldo Total Investido e o Rendimento Total Acumulado.
- Botão "Novo Investimento" com um modal/formulário para cadastro.

#### [NEW] `frontend/src/routes/investimentos/$id.tsx`
- **Detalhes do Investimento:** Tela específica para um investimento (parecida com a evolução de saldo).
- Gráfico mostrando o crescimento do patrimônio neste investimento ao longo do tempo.
- Histórico detalhado (Entrou, Saiu, Rendeu).
- Botões de Ação: "Fazer Aporte", "Resgatar", "Adicionar Rendimento".

#### [MODIFY] `frontend/src/components/Navbar.tsx` (ou Sidebar/Menu)
- Adicionar link de navegação para a página de Investimentos.

## Verification Plan

### Automated/Code Verification
- Executar os scripts de migração do banco de dados (DDL) e validar criação das tabelas no PostgreSQL.
- Reiniciar o backend Node.js para garantir que as rotas compilem sem erro.
- Rodar `npm run build` no frontend para checar tipagem do TypeScript.

### Manual Verification
- Testar a criação de um investimento pela interface.
- Fazer um aporte de R$ 1000 e verificar se o saldo na `Dashboard` principal diminui em R$ 1000.
- Adicionar um rendimento de R$ 10 (1%) e verificar se o saldo do investimento sobe para R$ 1010 sem afetar a conta principal.
- Fazer um resgate de R$ 500 e verificar se a conta principal recebe a entrada de R$ 500.
