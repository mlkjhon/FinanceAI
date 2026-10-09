import { useSyncExternalStore } from 'react';

/*
 * Preferências do app guardadas no navegador (como o tema):
 * - ocultarValores: borra os números de dinheiro (para usar em público)
 * - reduzirAnimacoes: desliga as animações mesmo que o sistema não peça
 * Cada uma vira um atributo no <html>, e o CSS faz o resto.
 */
export type Preferencia = 'ocultarValores' | 'reduzirAnimacoes';

const CONFIG: Record<Preferencia, { chave: string; atributo: string }> = {
  ocultarValores: { chave: 'financeai:ocultar-valores', atributo: 'data-ocultar-valores' },
  reduzirAnimacoes: { chave: 'financeai:reduzir-animacoes', atributo: 'data-reduzir-animacoes' },
};
const EVENTO = 'financeai:preferencias';

export function lerPreferencia(p: Preferencia): boolean {
  try {
    return localStorage.getItem(CONFIG[p].chave) === '1';
  } catch {
    return false;
  }
}

export function aplicarPreferencias() {
  for (const p of Object.keys(CONFIG) as Preferencia[]) {
    document.documentElement.toggleAttribute(CONFIG[p].atributo, lerPreferencia(p));
  }
}

export function salvarPreferencia(p: Preferencia, ativo: boolean) {
  try {
    if (ativo) localStorage.setItem(CONFIG[p].chave, '1');
    else localStorage.removeItem(CONFIG[p].chave);
  } catch {
    /* sem storage: vale só até recarregar */
  }
  document.documentElement.toggleAttribute(CONFIG[p].atributo, ativo);
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener('storage', cb);
  };
}

export function usePreferencia(p: Preferencia): boolean {
  return useSyncExternalStore(assinar, () => lerPreferencia(p), () => false);
}
