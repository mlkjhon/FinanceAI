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
    let e: any;
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
      aoReceber(e);
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
    .map((o: unknown) => Operacao.safeParse(o))
    .filter((r: any) => r.success)
    .map((r: any) => r.data as Operacao);
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
