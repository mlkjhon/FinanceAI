import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { investimentosApi } from '../../lib/api';
import { AnimatedCounter } from '../ui';
import { cn, formatCurrency } from '../../lib/utils';
import { nomeIndexador } from '../../lib/investimentos';

function useDebounced<T>(valor: T, ms: number) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/*
 * Prévia ao vivo: busca a taxa do indexador na API (BrasilAPI / Banco Central,
 * pelo servidor) e mostra quanto rende, com a mesma conta do crédito diário.
 * Os números contam até o novo valor quando a taxa muda (estado, não decoração).
 */
export function TaxaPreview({ indexador, taxa, valor = 1000, className }: { indexador: string; taxa: string; valor?: number; className?: string }) {
  const taxaNum = parseFloat(String(taxa).replace(',', '.'));
  const t = useDebounced(Number.isFinite(taxaNum) ? taxaNum : 0, 300);
  const { data, isError, isFetching } = useQuery({
    queryKey: ['simular-investimento', indexador, t, valor],
    queryFn: () => investimentosApi.simular(indexador, t, valor),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  if (isError) {
    return <p className={cn('text-xs text-[var(--color-ink-muted)]', className)}>Não foi possível consultar a taxa atual agora.</p>;
  }

  const base = data?.base;
  return (
    <div className={cn('rounded-xl bg-[var(--color-surface)] p-4 space-y-3 transition-opacity duration-150', isFetching && !data && 'opacity-60', className)} aria-live="polite">
      {base ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--color-ink-muted)]">
            {nomeIndexador(indexador)} hoje{base.referencia ? ` (${base.referencia})` : ''}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink)]" data-num>{base.valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.</span>
            <span className={cn('rounded-md px-1.5 py-0.5 font-medium', base.fonte === 'estimativa' ? 'bg-amber-500/10 text-amber-800' : 'bg-gain-soft text-gain')}>
              {base.fonte}
            </span>
          </span>
        </div>
      ) : null}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--color-ink-muted)]">Rende ao ano</p>
          <p className="font-brand font-bold text-2xl tracking-tight text-gain" data-num>
            {data ? <><AnimatedCounter value={data.taxaAnual} decimais={2} className="text-inherit" />%</> : '—'}
          </p>
        </div>
        {data && (
          <p className="text-right text-xs text-[var(--color-ink-muted)] leading-relaxed" data-num>
            {formatCurrency(valor)} rendem<br />
            <span className="font-semibold text-[var(--color-ink)]">{formatCurrency(data.exemplo.porDia)}</span> por dia ·{' '}
            <span className="font-semibold text-[var(--color-ink)]">{formatCurrency(data.exemplo.porMes)}</span> por mês
          </p>
        )}
      </div>
      {base?.fonte === 'estimativa' && (
        <p className="text-xs text-amber-800">Sem fonte pública para este índice: o rendimento usa um valor de referência.</p>
      )}
    </div>
  );
}
