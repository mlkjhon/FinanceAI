import React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from './icons';
import { AnimatedCounter } from './ui';
import { cn, formatCurrency } from '../lib/utils';

/*
 * Peças compartilhadas pelas telas de detalhe do dashboard
 * (evolução do saldo, categorias, entradas e saídas).
 */

// "10/2026" -> "out 2026" (ou "outubro" com long)
export function nomeMes(mmYYYY: string, estilo: 'short' | 'long' = 'short') {
  const [m, y] = (mmYYYY || '').split('/');
  if (!m || !y) return mmYYYY;
  const d = new Date(Number(y), Number(m) - 1, 15);
  const mes = d.toLocaleDateString('pt-BR', { month: estilo }).replace('.', '');
  return estilo === 'long' ? mes : `${mes} ${y}`;
}

export function DetailHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="space-y-4">
      <Link
        to="/dashboard"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-150"
      >
        <span className="arrow-back"><ArrowLeft size={16} /></span>
        Visão geral
      </Link>
      <h1 className="font-brand text-3xl font-bold tracking-tight text-[var(--color-ink)]">{title}</h1>
      {children}
    </header>
  );
}

// Frase-resposta da tela: o número importante dentro de uma frase, não num card
export function Headline({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-brand text-2xl sm:text-[2rem] leading-tight tracking-tight text-[var(--color-ink-soft)] max-w-[30ch] text-balance">
      {children}
    </p>
  );
}

export function Strong({ children, tone = 'ink' }: { children: React.ReactNode; tone?: 'ink' | 'gain' | 'loss' }) {
  return (
    <strong className={cn('font-bold', tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : 'text-[var(--color-ink)]')} data-num>
      {children}
    </strong>
  );
}

// Faixa de métricas com divisórias finas (sem cards nem ícones)
export function MetricStrip({ items }: {
  items: { label: string; value: number; currency?: boolean; suffix?: string; tone?: 'ink' | 'gain' | 'loss'; signed?: boolean }[];
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-y-4 border-y border-[var(--color-line)] py-4", items.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
      {items.map((it, i) => (
        <div key={it.label} className={cn("pr-4 sm:px-4 sm:first:pl-0 sm:border-l sm:first:border-l-0 border-[var(--color-line)]", i % 2 === 1 && "max-sm:pl-4 max-sm:border-l")}>
          <dt className="metric-label truncate" title={it.label}>{it.label}</dt>
          <dd className={cn('mt-1 font-brand font-bold tracking-tight text-lg sm:text-2xl', it.tone === 'gain' ? 'text-gain' : it.tone === 'loss' ? 'text-loss' : 'text-[var(--color-ink)]')} data-num>
            {it.signed && it.value > 0 ? '+' : it.signed && it.value < 0 ? '-' : ''}
            {it.currency
              ? <AnimatedCounter value={it.signed ? Math.abs(it.value) : it.value} isCurrency className="text-inherit" />
              : <>{it.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{it.suffix}</>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Tooltip dos gráficos recharts
export function ChartTooltip({ active, payload, label, names }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-line)] rounded-[10px] px-3 py-2.5 shadow-md min-w-[160px]">
      <p className="text-xs text-[var(--color-ink-muted)] mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm py-0.5">
          <span className="w-2 h-2 rounded-[3px]" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--color-ink-soft)]">{names?.[p.dataKey] ?? p.name}</span>
          <span className="font-semibold text-[var(--color-ink)] ml-auto pl-3" data-num>{formatCurrency(Math.abs(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyDetail({ text }: { text: string }) {
  return (
    <div className="finance-card px-6 py-10 flex flex-col items-start gap-3 max-w-xl">
      <p className="font-semibold text-[var(--color-ink)]">{text}</p>
      <Link to="/transactions" className="link-line text-sm font-medium text-[var(--color-accent)]">Registrar transações</Link>
    </div>
  );
}

export const detailSkeleton = (
  <div className="space-y-6" role="status" aria-label="Carregando">
    <span className="media-frame block h-8 w-2/3 rounded-lg" data-loading="" />
    <span className="media-frame block h-16 w-full rounded-lg" data-loading="" />
    <span className="media-frame block h-64 w-full rounded-[var(--radius-card)]" data-loading="" />
  </div>
);
