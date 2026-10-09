export const API_BASE = import.meta.env.VITE_API_URL || 'https://api-lyart-kappa.vercel.app';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Formato cru que a API devolve (números do Postgres às vezes vêm como texto)
type Num = number | string;
interface TransacaoApi {
  id_transacao: number;
  descricao: string;
  valor: Num;
  tipo: string;
  id_categoria?: number | null;
  id_subcategoria?: number | null;
  categoria_nome?: string | null;
  data_registro?: string;
  data_pagamento?: string;
  created_at?: string;
}
interface CategoriaApi { id_categoria: number; nome: string; tipo: string; propria?: boolean }
interface SubcategoriaApi { id_subcategoria: number; id_categoria: number; nome: string }
interface OrcamentoApi { id_orcamento: number; id_categoria: number; categoria_nome: string; valor_limite: Num; valor_gasto?: Num | null; mes: number; ano: number }
interface MetaApi { id_meta: number; titulo: string; valor_meta: Num; valor_atual?: Num | null; data_objetivo?: string; descricao?: string }
interface DashboardApi {
  saldoTotal?: Num;
  resumoMes?: { entradas?: Num; saidas?: Num };
  evolucaoMensal?: { mes: string; saldo: Num; entradas?: Num; saidas?: Num }[];
  resumoCategorias?: { nome: string; total: Num }[];
  ultimasTransacoes?: { descricao: string; valor: Num; tipo: string; categoria_nome?: string; data_registro: string }[];
}
type RespostaSimples = Record<string, unknown>;

export function getUserData(): User | null {
  const data = localStorage.getItem('finance_user') || sessionStorage.getItem('finance_user');
  return data ? JSON.parse(data) : null;
}

export function setUserData(user: User, token?: string, remember: boolean = false) {
  removeUserData();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('finance_user', JSON.stringify(user));
  if (token) {
    storage.setItem('finance_token', token);
  } else {
    storage.setItem('finance_token', user.id); // pseudo-token compatibility
  }
}

export function removeUserData() {
  localStorage.removeItem('finance_user');
  localStorage.removeItem('finance_token');
  sessionStorage.removeItem('finance_user');
  sessionStorage.removeItem('finance_token');
}

export function getToken(): string | null {
  return localStorage.getItem('finance_token') || sessionStorage.getItem('finance_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && path !== '/login') {
    removeUserData();
    window.location.href = '/auth';
    throw new ApiError(401, 'Não autorizado');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new ApiError(res.status, data.message || data.error || 'Erro no servidor');
  }

  if (res.status === 204 || res.status === 201) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text as unknown as T; }
  }
  
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ message: string; token: string; usuario: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha: password }),
    }),
  register: (data: RegisterData) =>
    request<string>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Transactions
export const transactionsApi = {
  list: async (params?: TransactionFilters) => {
    const data = await request<TransacaoApi[]>('/transacoes');
    let filtered = data.map(d => ({
      id: String(d.id_transacao),
      descricao: d.descricao,
      valor: typeof d.valor === 'string' ? parseFloat(d.valor) : d.valor,
      tipo: d.tipo === 'E' ? 'receita' : 'despesa',
      id_categoria: d.id_categoria ? String(d.id_categoria) : undefined,
      id_subcategoria: d.id_subcategoria ? String(d.id_subcategoria) : undefined,
      categoria_nome: d.categoria_nome,
      data: d.data_registro || d.data_pagamento || d.created_at,
      created_at: d.data_registro || d.created_at
    }));

    if (params?.busca) {
      const lowerBusca = params.busca.toLowerCase();
      filtered = filtered.filter(t => t.descricao.toLowerCase().includes(lowerBusca));
    }
    if (params?.tipo) {
      filtered = filtered.filter(t => t.tipo === params.tipo);
    }

    const page = parseInt(params?.page || '1', 10);
    const limit = parseInt(params?.limit || '10', 10);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      data: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1
    } as PaginatedResponse<Transaction>;
  },
  create: async (data: CreateTransaction) => {
    const user = getUserData();
    return request<RespostaSimples>('/transacoes', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: user?.id,
        descricao: data.descricao,
        valor: data.valor,
        tipo: data.tipo === 'receita' ? 'E' : 'S',
        id_categoria: data.id_categoria ?? undefined,
        id_subcategoria: data.id_subcategoria ?? undefined,
        data_registro: data.data,
        data_pagamento: data.data,
        data: data.data,
      })
    });
  },
  update: async (id: string, data: Partial<CreateTransaction>) => {
    return request<RespostaSimples>(`/transacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        descricao: data.descricao,
        valor: data.valor,
        tipo: data.tipo === 'receita' ? 'E' : 'S',
        id_categoria: data.id_categoria ?? undefined,
        id_subcategoria: data.id_subcategoria ?? null,
        data_registro: data.data,
        data_pagamento: data.data,
        data: data.data,
      })
    });
  },
  delete: (id: string) =>
    request<void>(`/transacoes/${id}`, { method: 'DELETE' }),
};

// Categories
export const categoriesApi = {
  list: async () => {
    const res = await request<CategoriaApi[]>('/categorias');
    return res.map(c => ({
      id: String(c.id_categoria),
      nome: c.nome,
      tipo: (c.tipo === 'E' || c.tipo === 'receita' ? 'receita' : 'despesa') as Category['tipo'],
      // false = categoria padrão do app (não dá para editar nem excluir)
      propria: !!c.propria,
    }));
  },
  // Categoria só do usuário; já vem com a subcategoria "Geral" para usar nas transações
  create: (data: CreateCategory) =>
    request<CategoriaApi & { id_subcategoria: number }>('/categorias', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CreateCategory) =>
    request<CategoriaApi>(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/categorias/${id}`, { method: 'DELETE' }),
};

// Configurações da conta (sempre do usuário logado)
export const perfilApi = {
  get: () => request<User>('/perfil'),
  update: (data: { nome: string; email: string }) =>
    request<User>('/perfil', { method: 'PUT', body: JSON.stringify(data) }),
  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    request<{ ok: boolean }>('/perfil/senha', { method: 'PUT', body: JSON.stringify({ senhaAtual, novaSenha }) }),
  excluirConta: (senha: string) =>
    request<{ ok: boolean }>('/perfil', { method: 'DELETE', body: JSON.stringify({ senha }) }),
};

// Atualiza o usuário guardado sem mexer no token nem em onde ele está (local/sessão)
export function atualizarUsuarioLocal(user: User) {
  const storage = localStorage.getItem('finance_user') ? localStorage : sessionStorage;
  storage.setItem('finance_user', JSON.stringify(user));
}

// Subcategories
export const subcategoriasApi = {
  list: async (id_categoria?: string) => {
    const qs = id_categoria ? `?id_categoria=${id_categoria}` : '';
    const res = await request<SubcategoriaApi[]>(`/subcategorias${qs}`);
    return res.map(s => ({
      id: String(s.id_subcategoria),
      id_categoria: String(s.id_categoria),
      nome: s.nome,
    })) as Subcategory[];
  },
};

// Budgets (Integração com a rota de orçamentos)
export const budgetsApi = {
  list: async () => {
    const user = getUserData();
    const data = await request<OrcamentoApi[]>(`/orcamentos?id_usuario=${user?.id}`);
    return data.map(d => ({
      id: String(d.id_orcamento),
      categoria_id: String(d.id_categoria),
      categoria_nome: d.categoria_nome,
      valor_limite: typeof d.valor_limite === 'string' ? parseFloat(d.valor_limite) : d.valor_limite,
      valor_gasto: typeof d.valor_gasto === 'string' ? parseFloat(d.valor_gasto) : (d.valor_gasto || 0),
      mes: d.mes,
      ano: d.ano
    }));
  },
  create: async (data: CreateBudget) => {
    const user = getUserData();
    return request<RespostaSimples>('/orcamentos', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: user?.id,
        id_categoria: data.categoria_id,
        mes: data.mes,
        ano: data.ano,
        valor_limite: data.valor_limite
      })
    });
  },
  update: async () => ({}) as Budget,
  delete: async (id: string) => request<void>(`/orcamentos/${id}`, { method: 'DELETE' }),
};

// Goals (Integração com a rota de metas)
export const goalsApi = {
  list: async () => {
    const user = getUserData();
    const data = await request<MetaApi[]>(`/metas?id_usuario=${user?.id}`);
    return data.map(d => ({
      id: String(d.id_meta),
      nome: d.titulo,
      valor_meta: typeof d.valor_meta === 'string' ? parseFloat(d.valor_meta) : d.valor_meta,
      valor_atual: typeof d.valor_atual === 'string' ? parseFloat(d.valor_atual) : (d.valor_atual || 0),
      data_alvo: d.data_objetivo,
      descricao: d.descricao,
    }));
  },
  // A meta com o histórico de criação e depósitos (data e hora)
  get: async (id: string): Promise<MetaDetalhe> => {
    const d = await request<MetaDetalhe>(`/metas/${id}`);
    return {
      ...d,
      valor_meta: Number(d.valor_meta) || 0,
      valor_atual: Number(d.valor_atual) || 0,
      historico: (d.historico || []).map((m) => ({ ...m, valor: Number(m.valor) || 0, saldo_apos: m.saldo_apos == null ? null : Number(m.saldo_apos) })),
    };
  },
  create: async (data: CreateGoal, origem: OrigemMeta = 'manual') => {
    const user = getUserData();
    return request<MetaApi>('/metas', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: user?.id,
        titulo: data.nome,
        valor_meta: data.valor_meta,
        valor_atual: data.valor_atual,
        data_objetivo: data.data_alvo,
        descricao: data.descricao,
        origem,
      })
    });
  },
  update: async () => ({}) as Goal,
  delete: async (id: string) => request<void>(`/metas/${id}`, { method: 'DELETE' }),
  // Deposita dinheiro na meta E desconta automaticamente do saldo geral
  adicionarDinheiro: async (id: string, valor: number, origem: OrigemMeta = 'manual') => {
    const user = getUserData();
    return request<RespostaSimples>(`/metas/${id}/adicionar`, {
      method: 'PATCH',
      body: JSON.stringify({ id_usuario: user?.id, valor, origem }),
    });
  },
};

export type OrigemMeta = 'manual' | 'insights';
export interface MovimentoMeta {
  id: string;
  tipo: 'criacao' | 'deposito';
  valor: number;
  saldo_apos: number | null;
  origem: OrigemMeta | null;
  criado_em: string;
  // false = depósito antigo, só com o dia (sem hora registrada)
  hora: boolean;
}
export interface MetaDetalhe {
  id_meta: number;
  titulo: string;
  descricao?: string | null;
  valor_meta: number;
  valor_atual: number;
  data_objetivo?: string | null;
  criado_em: string | null;
  historico: MovimentoMeta[];
}

// Dashboard
export const dashboardApi = {
  summary: async (id_conexao?: string) => {
    const user = getUserData();
    let url = `/dashboard?id_usuario=${user?.id}`;
    if (id_conexao && id_conexao !== 'all') {
      url += `&id_conexao=${id_conexao}`;
    }
    const data = await request<DashboardApi>(url);
    const receitas = typeof data.resumoMes?.entradas === 'string' ? parseFloat(data.resumoMes?.entradas) : (data.resumoMes?.entradas || 0);
    const despesas = typeof data.resumoMes?.saidas === 'string' ? parseFloat(data.resumoMes?.saidas) : (data.resumoMes?.saidas || 0);
    const saldoTotal = typeof data.saldoTotal === 'string' ? parseFloat(data.saldoTotal) : (data.saldoTotal || 0);
    return {
      saldo_total: saldoTotal,
      receitas_mes: receitas,
      despesas_mes: despesas,
      economia_mes: Math.max(receitas - despesas, 0),
      evolucao_saldo: data.evolucaoMensal?.map((e) => ({
        mes: e.mes,
        saldo: typeof e.saldo === 'string' ? parseFloat(e.saldo) : e.saldo,
        entradas: typeof e.entradas === 'string' ? parseFloat(e.entradas) : (e.entradas || 0),
        saidas: typeof e.saidas === 'string' ? parseFloat(e.saidas) : (e.saidas || 0),
      })) || [],
      gastos_por_categoria: data.resumoCategorias?.map((c) => ({
        categoria: c.nome,
        valor: typeof c.total === 'string' ? parseFloat(c.total) : c.total
      })) || [],
      ultimas_transacoes: data.ultimasTransacoes?.map((d) => ({
        id: Math.random().toString(),
        descricao: d.descricao,
        valor: typeof d.valor === 'string' ? parseFloat(d.valor) : d.valor,
        tipo: d.tipo === 'E' ? 'receita' : 'despesa',
        categoria_nome: d.categoria_nome,
        data: d.data_registro
      })) || []
    } as DashboardSummary;
  },
};



// Types
export interface User {
  id: string;
  nome: string;
  email: string;
}

export interface RegisterData {
  nome: string;
  email: string;
  senha: string;
}

export interface Transaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  id_categoria?: string;
  id_subcategoria?: string;
  categoria_nome?: string;
  data: string;
  created_at: string;
}

export interface Subcategory {
  id: string;
  id_categoria: string;
  nome: string;
}

export interface CreateTransaction {
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  id_categoria?: string;
  id_subcategoria?: string;
  data?: string;
}

export interface TransactionFilters {
  page?: string;
  limit?: string;
  tipo?: string;
  categoria_id?: string;
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
}

export interface Category {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  propria?: boolean;
  cor?: string;
  icone?: string;
}

export interface CreateCategory {
  nome: string;
  tipo: 'receita' | 'despesa';
  cor?: string;
  icone?: string;
}

export interface Budget {
  id: string;
  categoria_id: string;
  categoria_nome?: string;
  valor_limite: number;
  valor_gasto?: number;
  mes: number;
  ano: number;
}

export interface CreateBudget {
  categoria_id: string;
  valor_limite: number;
  mes: number;
  ano: number;
}

export interface Goal {
  id: string;
  nome: string;
  valor_meta: number;
  valor_atual: number;
  data_alvo?: string;
  descricao?: string;
  icone?: string;
}

export interface CreateGoal {
  nome: string;
  valor_meta: number;
  valor_atual?: number;
  data_alvo?: string;
  descricao?: string;
}

export interface DashboardSummary {
  saldo_total: number;
  receitas_mes: number;
  despesas_mes: number;
  economia_mes: number;
  evolucao_saldo?: { mes: string; saldo: number; entradas?: number; saidas?: number }[];
  gastos_por_categoria?: { categoria: string; valor: number; cor?: string }[];
  ultimas_transacoes?: Transaction[];
}

export interface Insight {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  valor?: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Investimentos
export interface SimulacaoInvestimento {
  indexador: string;
  regra: 'prefixado' | 'percentual' | 'spread';
  base: { nome: string; valor: number; fonte: string; referencia: string | null } | null;
  taxaAnual: number;
  exemplo: { valor: number; porDia: number; porMes: number; porAno: number };
  atualizadoEm: string;
}

export interface Investment {
  id_investimento: number;
  id_usuario: number;
  nome: string;
  tipo: string;
  taxa_rendimento: number | string;
  indexador?: string;
  saldo_atual: number | string;
  data_criacao: string;
  historico?: InvestmentTransaction[];
}

export interface InvestmentTransaction {
  id_transacao_inv: number;
  id_investimento: number;
  tipo: 'aporte' | 'resgate' | 'rendimento';
  valor: number | string;
  data_registro: string;
  saldoAposTransacao?: number;
}

export interface CreateInvestment {
  nome: string;
  tipo: string;
  taxa_rendimento: number;
  indexador: string;
}

export interface CreateInvestmentTransaction {
  tipo: 'aporte' | 'resgate' | 'rendimento';
  valor: number;
  data_registro?: string;
}

export const investimentosApi = {
  list: () => request<Investment[]>('/investimentos'),
  // Taxa atual do indexador (BrasilAPI / Banco Central) e quanto rende, com a conta do crédito diário
  simular: (indexador: string, taxa: number, valor = 1000) =>
    request<SimulacaoInvestimento>(`/investimentos/simular?indexador=${encodeURIComponent(indexador)}&taxa=${taxa}&valor=${valor}`),
  get: (id: string | number) => request<Investment>(`/investimentos/${id}`),
  create: (data: CreateInvestment) =>
    request<{ message: string; investimento: Investment }>('/investimentos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addTransaction: (id: string | number, data: CreateInvestmentTransaction) =>
    request<{ message: string }>(`/investimentos/${id}/transacao`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string | number, data: CreateInvestment) =>
    request<{ message: string; investimento: Investment }>(`/investimentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string | number) =>
    request<{ message: string }>(`/investimentos/${id}`, {
      method: 'DELETE',
    }),
  deleteTransaction: (id: string | number, transacaoId: string | number) =>
    request<{ message: string }>(`/investimentos/${id}/transacao/${transacaoId}`, {
      method: 'DELETE',
    }),
};

