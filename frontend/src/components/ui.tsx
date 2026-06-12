import React from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn, formatCurrency } from '../lib/utils';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// StatCard – cards de resumo do dashboard
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  isCurrency?: boolean;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'error';
  delay?: number;
}

export function StatCard({ title, value, icon, trend, isCurrency = true, color = 'primary', delay = 0 }: StatCardProps) {
  const colorMap = {
    primary: 'var(--color-finance-primary)',
    secondary: 'var(--color-finance-secondary)',
    accent: 'var(--color-finance-accent)',
    success: 'var(--color-finance-success)',
    error: 'var(--color-finance-error)',
  };
  const c = colorMap[color];

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3, boxShadow: `0 12px 32px -4px ${c}33` }}
      className="finance-card p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${c}18`, color: c }}
        >
          {icon}
        </div>
      </div>
      <AnimatedCounter value={value} isCurrency={isCurrency} color={c} />
      {trend !== undefined && (
        <p className={cn('text-xs mt-1', trend >= 0 ? 'text-[var(--color-finance-success)]' : 'text-[var(--color-finance-error)]')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% este mês
        </p>
      )}
    </motion.div>
  );
}

// AnimatedCounter
interface AnimatedCounterProps {
  value: number;
  isCurrency?: boolean;
  color?: string;
  className?: string;
}

export function AnimatedCounter({ value, isCurrency = false, color, className }: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 800, stiffness: 80, damping: 20 });
  const [display, setDisplay] = React.useState('0');

  React.useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  React.useEffect(() => {
    return springValue.on('change', (v) => {
      setDisplay(isCurrency ? formatCurrency(v) : v.toFixed(0));
    });
  }, [springValue, isCurrency]);

  return (
    <span
      ref={ref}
      className={cn('text-2xl font-brand font-bold tabular-nums', className)}
      style={color ? { color } : {}}
    >
      {display}
    </span>
  );
}

// FinanceCard – card genérico com glassmorphism
interface FinanceCardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export function FinanceCard({ children, className, glass, gradient, onClick }: FinanceCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'finance-card p-5',
        glass && 'glass',
        gradient && 'gradient-hero text-white',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// SkeletonCard – shimmer dourado
interface SkeletonProps {
  lines?: number;
  className?: string;
}

export function SkeletonCard({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn('finance-card p-5 space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-3 rounded-full bg-gradient-to-r from-[var(--color-finance-secondary)]/10 via-[var(--color-finance-secondary)]/40 to-[var(--color-finance-secondary)]/10 bg-[length:200%_100%]"
          style={{ width: `${100 - i * 20}%` }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ProgressBar
interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  colorOverride?: string;
}

export function ProgressBar({ value, max, label, showValue = true, colorOverride }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const isWarning = pct >= 75 && pct < 90;
  const isDanger = pct >= 90;
  const color = colorOverride || (isDanger ? 'var(--color-finance-error)' : isWarning ? 'var(--color-finance-secondary)' : 'var(--color-finance-primary)');

  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-gray-600 dark:text-gray-400">{label}</span>}
          {showValue && (
            <span className="font-medium tabular-nums" style={{ color }}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Badge
interface BadgeProps {
  label: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const vars = {
    success: 'bg-[var(--color-finance-success)]/10 text-[var(--color-finance-success)]',
    error: 'bg-[var(--color-finance-error)]/10 text-[var(--color-finance-error)]',
    warning: 'bg-[var(--color-finance-secondary)]/20 text-[oklch(0.55_0.08_85)]',
    info: 'bg-[var(--color-finance-accent)]/10 text-[var(--color-finance-accent)]',
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', vars[variant])}>
      {label}
    </span>
  );
}
