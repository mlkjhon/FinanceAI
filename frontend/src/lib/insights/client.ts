import { API_BASE, ApiError, getToken, removeUserData } from '../api';
import { Bloco, Operacao, type Periodo } from './types';

export type EventoAnalise =
  | { evento: 'estado'; estado: 'analisando' | 'gerando' }
  | { evento: 'bloco'; bloco: Bloco }
  | { evento: 'vazio' }
  | { evento: 'erro'; mensagem: string }
  | { evento: 'fim'; total: number };

const headers = () => {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function falhou(res: Response): Promise<never> {
  if (res.status === 401) {
    removeUserData();
    window.location.href = '/auth';
  }
  const data = await res.json().catch(() => ({}));
  throw new ApiError(res.status, data.error || data.message || `Erro ${res.status}`);
}

/*
 * Análise em streaming: o servidor manda uma linha JSON por evento. Cada bloco
 * é entregue assim que chega. Funciona também se algum proxy segurar a resposta
 * inteira (aí os blocos chegam juntos, e a página faz a cascata do mesmo jeito).
 */
export async function analisar(
  periodo: Periodo,
  fixados: Bloco[],
  aoReceber: (e: EventoAnalise) => void,
  signal?: AbortSignal
) {
  const res = await fetch(`${API_BASE}/insights/analise`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ periodo, fixados: fixados.map((b) => ({ id: b.id, pedido: b.pedido })) }),
    signal,
  });
  if (!res.ok || !res.body) await falhou(res);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let resto = '';
  const processar = (linha: string) => {
    if (!linha.trim()) return;
    let e: { evento?: string; bloco?: unknown };
    try {
      e = JSON.parse(linha);
    } catch {
      return;
    }
    if (e.evento === 'bloco') {
      const ok = Bloco.safeParse(e.bloco);
      if (ok.success) aoReceber({ evento: 'bloco', bloco: ok.data });
      else console.warn('[insights] bloco ignorado', ok.error.issues);
    } else {
      aoReceber(e as EventoAnalise);
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    resto += decoder.decode(value, { stream: true });
    const linhas = resto.split('\n');
    resto = linhas.pop() ?? '';
    linhas.forEach(processar);
  }
  processar(resto);
}

export async function executarComando(comando: string, periodo: Periodo, blocos: Bloco[]) {
  const res = await fetch(`${API_BASE}/insights/comando`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      comando,
      periodo,
      blocos: blocos.map((b) => ({ id: b.id, type: b.type, title: b.title, pedido: b.pedido })),
    }),
  });
  if (!res.ok) await falhou(res);
  const data = await res.json();
  const operacoes = (Array.isArray(data.operacoes) ? data.operacoes : [])
    .flatMap((o: unknown) => {
      const r = Operacao.safeParse(o);
      return r.success ? [r.data] : [];
    });
  return { operacoes, resposta: String(data.resposta || '') };
}

// Blocos fixados ficam no navegador (não há tabela para isso no banco)
const CHAVE_FIXADOS = 'financeai:insights:fixados';
export function lerFixados(): Bloco[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_FIXADOS) || '[]');
    return (Array.isArray(bruto) ? bruto : []).map((b) => Bloco.safeParse(b)).filter((r) => r.success).map((r) => r.data!);
  } catch {
    return [];
  }
}
export function salvarFixados(blocos: Bloco[]) {
  try {
    localStorage.setItem(CHAVE_FIXADOS, JSON.stringify(blocos.filter((b) => b.fixado)));
  } catch {
    /* sem storage: os fixados valem só nesta sessão */
  }
}

// Fixados no servidor (banco). O localStorage acima fica como cópia local.
export async function buscarFixadosServidor(): Promise<Bloco[] | null> {
  try {
    const res = await fetch(`${API_BASE}/insights/fixados`, { headers: headers() });
    if (!res.ok) return null;
    const data = await res.json();
    return (Array.isArray(data.blocos) ? data.blocos : []).flatMap((b: unknown) => {
      const r = Bloco.safeParse(b);
      return r.success ? [r.data] : [];
    });
  } catch {
    return null;
  }
}

export async function salvarFixadosServidor(blocos: Bloco[]) {
  try {
    await fetch(`${API_BASE}/insights/fixados`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ blocos: blocos.filter((b) => b.fixado) }),
    });
  } catch {
    /* sem rede: fica só a cópia local até a próxima mudança */
  }
}

/*
 * Análise salva no servidor: abrir a página não gasta IA. Os blocos voltam
 * recalculados com os dados de hoje (os números ficam atuais, o texto da IA é
 * o da última geração).
 */
export async function lerAnaliseSalva(periodo: Periodo, fixados: Bloco[]) {
  const res = await fetch(`${API_BASE}/insights/salva/ler`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ periodo, fixados: fixados.map((b) => ({ id: b.id, pedido: b.pedido })) }),
  });
  if (!res.ok) await falhou(res);
  const data = await res.json();
  const blocos: Bloco[] = (Array.isArray(data.blocos) ? data.blocos : []).flatMap((b: unknown) => {
    const r = Bloco.safeParse(b);
    return r.success ? [r.data] : [];
  });
  return { existe: !!data.existe, geradoEm: (data.geradoEm as string | null) ?? null, blocos };
}

export async function salvarAnaliseAtual(periodo: Periodo, blocos: Bloco[]) {
  try {
    await fetch(`${API_BASE}/insights/salva`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ periodo, blocos: blocos.filter((b) => !b.fixado).map((b) => ({ id: b.id, pedido: b.pedido })) }),
    });
  } catch {
    /* sem rede: a página continua; salva na próxima mudança */
  }
}
