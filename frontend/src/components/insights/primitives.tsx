import { useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';
import type { EstadoIA } from '../../lib/insights/types';

/*
 * Texto da IA aparecendo palavra a palavra. O texto inteiro já ocupa o espaço
 * desde o início (cada palavra só muda de opacidade), então o layout não treme.
 * 28ms por palavra; com reduced motion aparece de uma vez.
 */
export function StreamText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const palavras = text.split(/(\s+)/);
  return (
    <span className={className} aria-label={text}>
      {palavras.map((p, i) =>
        /^\s+$/.test(p) ? (
          p
        ) : (
          <span
            key={`${i}-${p}`}
            aria-hidden
            className={reduce ? undefined : 'word-in'}
            style={reduce ? undefined : { animationDelay: `${delay + (i / 2) * 28}ms` }}
          >
            {p}
          </span>
        )
      )}
    </span>
  );
}

const ROTULO_ESTADO: Record<EstadoIA, string> = {
  ocioso: 'Pronta',
  analisando: 'Lendo seus números',
  gerando: 'Montando a página',
  executando: 'Aplicando seu pedido',
};

/*
 * Indicador da IA: um ponto que "respira" e o rótulo com um brilho passando
 * pelo texto enquanto trabalha. Nada de spinner. Parado, fica estático.
 */
export function AiStatus({ estado }: { estado: EstadoIA }) {
  const ativo = estado !== 'ocioso';
  return (
    <span className="inline-flex items-center gap-2 text-sm" role="status" aria-live="polite">
      <span className={cn('ai-dot', ativo && 'is-active')} aria-hidden />
      <span className={cn(ativo ? 'ai-shimmer font-medium' : 'text-[var(--color-ink-muted)]')}>{ROTULO_ESTADO[estado]}</span>
    </span>
  );
}

