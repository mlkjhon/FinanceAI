import React from 'react';
import { motion, animate, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { ease } from '../lib/motion-tokens';

// StatCard: métrica com rótulo e número. Sem chip de ícone colorido e sem "flutuar" no hover.
interface StatCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  trend?: number;
  isCurrency?: boolean;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'error';
  delay?: number;
}

export function StatCard({ title, value, trend, isCurrency = true, color = 'primary', delay = 0 }: StatCardProps) {
  return (
    <div className="finance-card rise p-5" style={{ '--i': Math.round(delay * 10) } as React.CSSProperties}>
      <p className="metric-label">{title}</p>
      <AnimatedCounter
        value={value}
        isCurrency={isCurrency}
        className={cn('mt-2 block text-2xl', color === 'error' ? 'text-loss' : 'text-[var(--color-ink)]')}
      />
      {trend !== undefined && (
        <p className={cn('text-xs mt-1 tabular-nums', trend >= 0 ? 'text-gain' : 'text-loss')}>
          {trend >= 0 ? '+' : '-'}{Math.abs(trend).toFixed(1)}% este mês
        </p>
      )}
    </div>
  );
}

/*
 * AnimatedCounter: o número sobe até o valor quando entra na tela.
 * Frequência: uma vez por carregamento. O texto vem de um motion value,
 * então o React não re-renderiza a cada frame. Reduced motion mostra o valor final.
 */
interface AnimatedCounterProps {
  value: number;
  isCurrency?: boolean;
  color?: string;
  className?: string;
}

export function AnimatedCounter({ value, isCurrency = false, color, className }: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => (isCurrency ? formatCurrency(v) : Math.round(v).toLocaleString('pt-BR')));

  React.useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.9, ease: ease.out });
    return () => controls.stop();
  }, [inView, reduce, value, mv]);

  return (
    <motion.span
      ref={ref}
      data-num
      className={cn('font-brand font-bold tracking-tight', className)}
      style={color ? { color } : undefined}
    >
      {text}
    </motion.span>
  );
}

// FinanceCard: superfície com hairline. Só reage ao hover quando é clicável.
interface FinanceCardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  gradient?: boolean;
  onClick?: () => void;
  index?: number;
}

export function FinanceCard({ children, className, glass, gradient, onClick, index }: FinanceCardProps) {
  return (
    <div
      onClick={onClick}
      data-clickable={onClick ? '' : undefined}
      style={index !== undefined ? ({ '--i': index } as React.CSSProperties) : undefined}
      className={cn(
        'finance-card p-5',
        index !== undefined && 'rise',
        glass && 'glass',
        gradient && 'gradient-hero text-white border-0',
        onClick && 'cursor-pointer pressable',
        className
      )}
    >
      {children}
    </div>
  );
}

// SkeletonCard: linhas com o shimmer CSS da landing (roda fora da main thread)
interface SkeletonProps {
  lines?: number;
  className?: string;
}

export function SkeletonCard({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn('finance-card p-5 space-y-3', className)} role="status" aria-label="Carregando">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          data-loading=""
          className="media-frame block h-3 rounded-full"
          style={{ width: `${100 - i * 20}%` }}
        />
      ))}
    </div>
  );
}

// ProgressBar: preenche com scaleX (GPU), não com width
interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  colorOverride?: string;
}

export function ProgressBar({ value, max, label, showValue = true, colorOverride }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isWarning = pct >= 75 && pct < 90;
  const isDanger = pct >= 90;
  const color = colorOverride || (isDanger ? 'var(--color-finance-error)' : isWarning ? '#B45309' : 'var(--color-accent)');

  // Começa vazia e preenche no primeiro frame, para a transição CSS rodar
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-[var(--color-ink-soft)]">{label}</span>}
          {showValue && (
            <span className="font-medium tabular-nums" style={{ color }}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="fill-grow h-full w-full rounded-full"
          style={{ backgroundColor: color, transform: `scaleX(${shown / 100})` }}
        />
      </div>
    </div>
  );
}

// Badge: rótulo quadrado-arredondado (não pill), cores da paleta
interface BadgeProps {
  label: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const vars = {
    success: 'bg-[var(--color-accent)]/10 text-gain',
    error: 'bg-[var(--color-finance-error)]/10 text-loss',
    warning: 'bg-amber-500/10 text-amber-800',
    info: 'bg-[var(--color-accent)]/10 text-gain',
    default: 'bg-[var(--color-surface)] text-[var(--color-ink-soft)]',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', vars[variant])}>
      {label}
    </span>
  );
}
