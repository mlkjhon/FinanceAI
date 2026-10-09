import React, { useMemo, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { transactionsApi, type Transaction } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { Segmented } from '../components/segmented';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { DetailHeader, Headline, Strong, MetricStrip, EmptyDetail, detailSkeleton } from '../components/detail';

export const Route = createFileRoute('/categorias')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: CategoriasPage,
});

type Periodo = 'mes' | 'tudo';

interface Grupo {
  nome: string;
  total: number;
  itens: Transaction[];
}

const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/*
 * Linha de categoria: abre os últimos lançamentos. Frequência: ocasional.
 * Propósito: indicação de estado (o que abriu e de onde). Altura + opacidade
 * em 200ms, que é a exceção aceita para acordeões; instantâneo com reduced motion.
 */
function CategoriaRow({ g, index, total, aberto, onToggle }: { g: Grupo; index: number; total: number; aberto: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  const pct = total > 0 ? (g.total / total) * 100 : 0;
  const id = `cat-${index}`;
  const recentes = [...g.itens].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 5);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        aria-controls={id}
        className="ledger-row w-full px-5 py-4 text-left"
      >
        <span className="flex items-baseline justify-between gap-4">
          <span className="min-w-0 flex items-baseline gap-2.5">
            <span className="text-sm font-medium text-[var(--color-ink)] truncate">{g.nome}</span>
            <span className="hidden sm:inline text-xs text-[var(--color-ink-muted)] shrink-0" data-num>
              {g.itens.length === 1 ? '1 lançamento' : `${g.itens.length} lançamentos`}
            </span>
          </span>
          <span className="flex items-baseline gap-3 shrink-0">
            <span className="text-sm font-semibold text-[var(--color-ink)]" data-num>{formatCurrency(g.total)}</span>
            <span className="w-11 text-right text-xs text-[var(--color-ink-muted)]" data-num>{pct.toLocaleString('pt-BR', { maximumFractionDigits: pct < 10 ? 1 : 0 })}%</span>
            <span className="plus-x text-[var(--color-ink-muted)]" aria-hidden />
          </span>
        </span>
        <span className="mt-3 block h-1.5 rounded-full bg-[var(--color-line)]/60 overflow-hidden">
          <span
            className={cn('bar-x block h-full rounded-full', index === 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-accent)]/45')}
            style={{ width: `${Math.max(pct, 1.5)}%`, '--i': index } as React.CSSProperties}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            id={id}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <ul className="px-5 pb-4 space-y-2.5">
              {recentes.map((t) => (
                <li key={t.id} className="flex items-baseline justify-between gap-4 text-sm pl-3 border-l-2 border-[var(--color-line)]">
                  <span className="min-w-0 truncate text-[var(--color-ink-soft)]">{t.descricao}</span>
                  <span className="shrink-0 flex items-baseline gap-3">
                    <span className="text-xs text-[var(--color-ink-muted)]" data-num>{formatDate(t.data)}</span>
                    <span className="font-medium text-[var(--color-ink)]" data-num>{formatCurrency(t.valor)}</span>
                  </span>
                </li>
              ))}
              {g.itens.length > recentes.length && (
                <li className="text-xs text-[var(--color-ink-muted)] pl-3" data-num>
                  e mais {g.itens.length - recentes.length}
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function CategoriasContent() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [aberta, setAberta] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => transactionsApi.list({ limit: '100000' }),
  });

  const { grupos, total, maior } = useMemo(() => {
    const mes = mesAtual();
    const gastos = (data?.data ?? []).filter(
      (t) => t.tipo === 'despesa' && (periodo === 'tudo' || (t.data || '').slice(0, 7) === mes)
    );
    const map = new Map<string, Grupo>();
    for (const t of gastos) {
      const nome = t.categoria_nome || 'Sem categoria';
      const g = map.get(nome) ?? { nome, total: 0, itens: [] };
      g.total += t.valor;
      g.itens.push(t);
      map.set(nome, g);
    }
    const grupos = [...map.values()].sort((a, b) => b.total - a.total);
    const total = grupos.reduce((s, g) => s + g.total, 0);
    const maior = gastos.reduce<Transaction | null>((m, t) => (!m || t.valor > m.valor ? t : m), null);
    return { grupos, total, maior };
  }, [data, periodo]);

  if (isLoading) return detailSkeleton;

  const top = grupos[0];
  const pctTop = top && total > 0 ? Math.round((top.total / total) * 100) : 0;
  const quando = periodo === 'mes' ? 'neste mês' : 'desde o começo';

  return (
    <div className="stagger space-y-8">
      <DetailHeader title="Para onde foi o dinheiro">
        {top ? (
          <Headline>
            <Strong>{top.nome}</Strong> levou <Strong>{pctTop}%</Strong> do que você gastou {quando}.
          </Headline>
        ) : null}
      </DetailHeader>

      <Segmented
        id="cat-periodo"
        label="Período"
        value={periodo}
        onChange={(v) => { setPeriodo(v); setAberta(null); }}
        options={[{ value: 'mes', label: 'Este mês' }, { value: 'tudo', label: 'Tudo' }]}
      />

      {!grupos.length ? (
        <EmptyDetail text={periodo === 'mes' ? 'Nenhum gasto registrado neste mês.' : 'Nenhum gasto registrado ainda.'} />
      ) : (
        <div key={periodo} className="list-swap space-y-8">
          <MetricStrip
            items={[
              { label: 'Total gasto', value: total, currency: true },
              { label: 'Categorias', value: grupos.length },
              { label: maior ? `Maior gasto: ${maior.descricao}` : 'Maior gasto', value: maior?.valor ?? 0, currency: true },
            ]}
          />
          <ol className="finance-card overflow-hidden divide-y divide-[var(--color-line)]">
            {grupos.map((g, i) => (
              <CategoriaRow
                key={g.nome}
                g={g}
                index={i}
                total={total}
                aberto={aberta === g.nome}
                onToggle={() => setAberta((a) => (a === g.nome ? null : g.nome))}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function CategoriasPage() {
  return (
    <div className="min-h-[100dvh] app-surface pb-20">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <CategoriasContent />
      </main>
    </div>
  );
}
