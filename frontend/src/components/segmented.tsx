import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';
import { spring } from '../lib/motion-tokens';

/*
 * Indicador desliza entre as opções. Frequência: dezenas por dia, então é rápido
 * (spring.snappy, ~250ms, sem bounce) e some com reduced motion.
 */
export function Segmented<T extends string>({ id, value, options, onChange, label }: {
  id: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div role="group" aria-label={label} className="inline-flex self-start max-w-full overflow-x-auto [scrollbar-width:none] rounded-full bg-[var(--color-ink)]/[0.05] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150',
              active ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]'
            )}
          >
            {active && (
              <motion.span
                layoutId={reduce ? undefined : id}
                transition={spring.snappy}
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
