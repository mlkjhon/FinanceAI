import { useSyncExternalStore } from 'react';

/*
 * Tema do app: a preferência ("sistema", "claro" ou "escuro") fica no navegador;
 * o tema efetivo vai para <html data-theme="light|dark">. O index.html aplica
 * isso antes da primeira pintura (sem piscar branco). A landing é sempre clara.
 */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';
export type Tema = 'light' | 'dark';

const CHAVE = 'financeai:tema';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === 'claro' || v === 'escuro' ? v : 'sistema';
  } catch {
    return 'sistema';
  }
}

const resolver = (p: PreferenciaTema): Tema => (p === 'escuro' ? 'dark' : p === 'claro' ? 'light' : media().matches ? 'dark' : 'light');

let forcarClaro = false;

export function aplicarTema() {
  const tema = forcarClaro ? 'light' : resolver(lerPreferencia());
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.colorScheme = tema;
}

export function salvarPreferencia(p: PreferenciaTema) {
  try {
    localStorage.setItem(CHAVE, p);
  } catch {
    /* sem storage: vale só até recarregar */
  }
  aplicarTema();
  window.dispatchEvent(new Event('financeai:tema'));
}

// A landing foi desenhada clara (fotos, fundos); nela o tema escuro não se aplica
export function forcarTemaClaro(ativo: boolean) {
  forcarClaro = ativo;
  aplicarTema();
}

// Segue o sistema quando a preferência é "sistema"
if (typeof window !== 'undefined') {
  media().addEventListener('change', () => {
    if (lerPreferencia() === 'sistema') aplicarTema();
  });
}

function assinar(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('financeai:tema', cb);
  return () => {
    obs.disconnect();
    window.removeEventListener('financeai:tema', cb);
  };
}

// Tema efetivo atual (para o que não dá para fazer só com CSS, como cores de gráfico)
export function useTema(): Tema {
  return useSyncExternalStore(assinar, () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'), () => 'light');
}

export function usePreferenciaTema(): PreferenciaTema {
  return useSyncExternalStore(assinar, lerPreferencia, () => 'sistema');
}
