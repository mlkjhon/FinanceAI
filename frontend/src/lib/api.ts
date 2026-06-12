const API_BASE = 'https://api-iota-livid-42.vercel.app';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getUserData(): User | null {
  const data = localStorage.getItem('finance_user');
  return data ? JSON.parse(data) : null;
}

export function setUserData(user: User) {
  localStorage.setItem('finance_user', JSON.stringify(user));
  localStorage.setItem('finance_token', user.id); // pseudo-token compatibility
}

export function removeUserData() {
  localStorage.removeItem('finance_user');
  localStorage.removeItem('finance_token');
}

export function getToken(): string | null {
  return localStorage.getItem('finance_token');
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
    try { return JSON.parse(text); } catch { return text as any; }
  }
  
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ message: string; usuario: User }>('/login', {
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
  list: async (_params?: TransactionFilters) => {
    const data = await request<any[]>('/transacoes');
    return {
      data: data.map(d => ({
        id: String(d.id_transacao),
        descricao: d.descricao,
        valor: typeof d.valor === 'string' ? parseFloat(d.valor) : d.valor,
        tipo: d.tipo === 'E' ? 'receita' : 'despesa',
        id_subcategoria: d.id_subcategoria ? String(d.id_subcategoria) : undefined,
        categoria_nome: d.categoria_nome,
        data: d.data_registro,
        created_at: d.data_registro
      })),
      total: data.length,
      page: 1, limit: 100, totalPages: 1
    } as PaginatedResponse<Transaction>;
  },
  create: async (data: CreateTransaction) => {
    const user = getUserData();
    return request<any>('/transacoes', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: user?.id,
        descricao: data.descricao,
        valor: data.valor,
        tipo: data.tipo === 'receita' ? 'E' : 'S',
        id_subcategoria: data.id_subcategoria ?? undefined,
      })
    });
  },
  update: async (id: string, data: Partial<CreateTransaction>) => {
    return request<any>(`/transacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        descricao: data.descricao,
        valor: data.valor,
        tipo: data.tipo === 'receita' ? 'E' : 'S',
        id_subcategoria: data.id_subcategoria ?? null,
      })
    });
  },
  delete: (id: string) =>
    request<void>(`/transacoes/${id}`, { method: 'DELETE' }),
};

// Categories
export const categoriesApi = {
  list: async () => {
    const res = await request<any[]>('/categorias');
    return res.map(c => ({
      id: String(c.id_categoria),
      nome: c.nome,
      tipo: c.tipo === 'E' || c.tipo === 'receita' ? 'receita' : 'despesa',
    }));
  },
  create: (data: CreateCategory) =>
    request<any>('/categorias', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/categorias/${id}`, { method: 'DELETE' }),
};

// Subcategories
export const subcategoriasApi = {
  list: async (id_categoria?: string) => {
    const qs = id_categoria ? `?id_categoria=${id_categoria}` : '';
    const res = await request<any[]>(`/subcategorias${qs}`);
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
    const data = await request<any[]>(`/orcamentos?id_usuario=${user?.id}`);
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
    return request<any>('/orcamentos', {
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
    const data = await request<any[]>(`/metas?id_usuario=${user?.id}`);
    return data.map(d => ({
      id: String(d.id_meta),
      nome: d.titulo,
      valor_meta: typeof d.valor_meta === 'string' ? parseFloat(d.valor_meta) : d.valor_meta,
      valor_atual: typeof d.valor_atual === 'string' ? parseFloat(d.valor_atual) : (d.valor_atual || 0),
      data_alvo: d.data_objetivo,
      descricao: d.descricao,
    }));
  },
  create: async (data: CreateGoal) => {
    const user = getUserData();
    return request<any>('/metas', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: user?.id,
        titulo: data.nome,
        valor_meta: data.valor_meta,
        valor_atual: data.valor_atual,
        data_objetivo: data.data_alvo,
        descricao: data.descricao
      })
    });
  },
  update: async () => ({}) as Goal,
  delete: async (id: string) => request<void>(`/metas/${id}`, { method: 'DELETE' }),
  // Deposita dinheiro na meta E desconta automaticamente do saldo geral
  adicionarDinheiro: async (id: string, valor: number) => {
    const user = getUserData();
    return request<any>(`/metas/${id}/adicionar`, {
      method: 'PATCH',
      body: JSON.stringify({ id_usuario: user?.id, valor }),
    });
  },
};

// Dashboard
export const dashboardApi = {
  summary: async () => {
    const user = getUserData();
    const data = await request<any>(`/dashboard?id_usuario=${user?.id}`);
    const receitas = typeof data.resumoMes?.entradas === 'string' ? parseFloat(data.resumoMes?.entradas) : (data.resumoMes?.entradas || 0);
    const despesas = typeof data.resumoMes?.saidas === 'string' ? parseFloat(data.resumoMes?.saidas) : (data.resumoMes?.saidas || 0);
    return {
      saldo_total: typeof data.resumoMes?.saldo === 'string' ? parseFloat(data.resumoMes?.saldo) : (data.resumoMes?.saldo || 0),
      receitas_mes: receitas,
      despesas_mes: despesas,
      economia_mes: Math.max(receitas - despesas, 0),
      evolucao_saldo: data.evolucaoMensal?.map((e: any) => ({
        mes: e.mes,
        saldo: typeof e.saldo === 'string' ? parseFloat(e.saldo) : e.saldo,
        entradas: typeof e.entradas === 'string' ? parseFloat(e.entradas) : (e.entradas || 0),
        saidas: typeof e.saidas === 'string' ? parseFloat(e.saidas) : (e.saidas || 0),
      })) || [],
      gastos_por_categoria: data.resumoCategorias?.map((c: any) => ({
        categoria: c.nome,
        valor: typeof c.total === 'string' ? parseFloat(c.total) : c.total
      })) || [],
      ultimas_transacoes: data.ultimasTransacoes?.map((d: any) => ({
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

// Insights
export const insightsApi = {
  // Busca dicas personalizadas geradas pela IA com base nos dados do usuário
  list: async () => {
    const user = getUserData();
    const data = await request<any[]>(`/insights?id_usuario=${user?.id}`);
    return data.map(d => ({
      id: String(d.id),
      tipo: d.tipo || 'sugestao',
      titulo: d.titulo,
      descricao: d.descricao,
      valor: d.valor,
      created_at: new Date().toISOString(),
    })) as Insight[];
  },
  // Carrega histórico de chat do banco de dados
  historico: async () => {
    const user = getUserData();
    const data = await request<any[]>(`/chat/historico?id_usuario=${user?.id}`);
    return data;
  },
  chat: async (message: string) => {
    const user = getUserData();
    const res = await request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ id_usuario: user?.id, mensagem: message }),
    });
    return { reply: res.resposta || 'Sem resposta' };
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
  categoria_id?: string;
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
