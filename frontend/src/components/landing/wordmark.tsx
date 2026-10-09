import { Icon } from '../icons';
import { cn } from '../../lib/utils';

/*
 * Logo preservado (R6): quadrado com o gradiente da marca, seta de tendência
 * e "Finance" + "AI" no accent claro. A seta agora vem da fonte Phosphor
 * (mesmo desenho, sem SVG).
 */
export function Wordmark({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  const box = size === 'lg' ? 'h-10 w-10 rounded-xl' : 'h-8 w-8 rounded-[10px]';
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('gradient-hero flex items-center justify-center text-white shadow-sm', box)}>
        <Icon name="trend-up" size={size === 'lg' ? 20 : 16} />
      </span>
      <span className={cn('font-brand font-bold text-[var(--color-finance-primary-hover)]', size === 'lg' ? 'text-xl' : 'text-lg')}>
        Finance<span className="text-[var(--color-finance-accent)]">AI</span>
      </span>
    </span>
  );
}
