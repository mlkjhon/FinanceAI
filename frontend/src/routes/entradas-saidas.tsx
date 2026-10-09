import React, { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { formatCurrency, cn } from '../lib/utils';
import { DetailHeader, Headline, Strong, MetricStrip, EmptyDetail, DetailSkeleton } from '../components/detail';
import { nomeMes } from '../lib/datas';

export const Route = createFileRoute('/entradas-saidas')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: EntradasSaidasPage,
});

interface Mes {
  mes: string;
  entradas: number;
  saidas: number;
  resultado: number;
}

const chave = (mes: string) => {
  const [m, y] = mes.split('/');
  return Number(y) * 100 + Number(m);
};

/*
 * Gráfico divergente: entradas sobem, saídas descem a partir da mesma linha.
 * Interação: passar o mouse, focar ou tocar um mês destaca a coluna e atualiza
 * o painel acima (troca instantânea: é leitura de dados, não decoração).
 * As outras colunas recuam com opacity 150ms. Barras crescem uma vez ao entrar.
 */
function FlowChart({ meses, ativo, onAtivo }: { meses: Mes[]; ativo: number; onAtivo: (i: number) => void }) {
  const max = Math.max(...meses.map((m) => Math.max(m.entradas, m.saidas)), 1);
  const m = meses[ativo];
  const taxa = m.entradas > 0 ? (m.resultado / m.entradas) * 100 : 0;

  return (
    <section className="finance-card p-5 sm:p-6" aria-label="Entradas e saídas por mês">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 min-h-14" aria-live="polite">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)] first-letter:uppercase">{nomeMes(m.mes, 'long')} {m.mes.split('/')[1]}</p>
          <p className={cn('text-xs mt-0.5', m.resultado >= 0 ? 'text-gain' : 'text-loss')} data-num>
            {m.entradas > 0
              ? m.resultado >= 0 ? `Guardou ${taxa.toFixed(0)}% do que entrou` : `Gastou ${formatCurrency(Math.abs(m.resultado))} além do que entrou`
              : 'Sem entradas no mês'}
          </p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Entrou</dt>
            <dd className="text-sm font-semibold text-gain" data-num>{formatCurrency(m.entradas)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Saiu</dt>
            <dd className="text-sm font-semibold text-[var(--color-ink)]" data-num>{formatCurrency(m.saidas)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Resultado</dt>
            <dd className={cn('text-sm font-semibold', m.resultado >= 0 ? 'text-gain' : 'text-loss')} data-num>
              {m.resultado >= 0 ? '+' : '-'}{formatCurrency(Math.abs(m.resultado))}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flow-chart mt-6 flex gap-2 sm:gap-4" data-active="" role="group" aria-label="Escolha um mês">
        {meses.map((mm, i) => (
          <button
            key={mm.mes}
            type="button"
            className="flow-col flex-1 min-w-0 flex flex-col items-center rounded-lg focus-visible:outline-offset-2"
            data-active={i === ativo ? '' : undefined}
            aria-pressed={i === ativo}
            aria-label={`${nomeMes(mm.mes, 'long')}: entrou ${formatCurrency(mm.entradas)}, saiu ${formatCurrency(mm.saidas)}`}
            onMouseEnter={() => onAtivo(i)}
            onFocus={() => onAtivo(i)}
            onClick={() => onAtivo(i)}
          >
            {/* metade de cima: entradas */}
            <span className="w-full max-w-12 h-28 flex items-end">
              <span
                className="bar-grow flow-bar w-full rounded-t-[5px] bg-[var(--color-accent)]"
                style={{ height: `${Math.max((mm.entradas / max) * 100, 1.5)}%`, '--i': i } as React.CSSProperties}
              />
            </span>
            <span className="w-full h-px bg-[var(--color-ink)]/25" />
            {/* metade de baixo: saídas */}
            <span className="w-full max-w-12 h-28 flex items-start">
              <span
                className="bar-grow bar-down flow-bar w-full rounded-b-[5px] bg-[var(--color-ink)]/18"
                style={{ height: `${Math.max((mm.saidas / max) * 100, 1.5)}%`, '--i': i } as React.CSSProperties}
              />
            </span>
            <span className={cn('mt-2 text-xs', i === ativo ? 'text-[var(--color-ink)] font-medium' : 'text-[var(--color-ink-muted)]')}>
              {nomeMes(mm.mes).split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs text-[var(--color-ink-soft)]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--color-accent)]" /> Entradas (para cima)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--color-ink)]/18" /> Saídas (para baixo)</span>
      </div>
    </section>
  );
}

function FluxoContent() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', 'all'],
    queryFn: () => dashboardApi.summary('all'),
  });

  const meses: Mes[] = [...(summary?.evolucao_saldo ?? [])]
    .sort((a, b) => chave(a.mes) - chave(b.mes))
    .map((e) => ({ mes: e.mes, entradas: e.entradas ?? 0, saidas: e.saidas ?? 0, resultado: (e.entradas ?? 0) - (e.saidas ?? 0) }));

  const [ativo, setAtivo] = useState<number | null>(null);

  if (isLoading) return <DetailSkeleton />;
  if (!meses.length) return <EmptyDetail text="Ainda não há meses com movimentações." />;

  const entrou = meses.reduce((s, m) => s + m.entradas, 0);
  const saiu = meses.reduce((s, m) => s + m.saidas, 0);
  const guardou = entrou - saiu;
  const taxa = entrou > 0 ? (guardou / entrou) * 100 : 0;
  const n = meses.length;

  return (
    <div className="stagger space-y-8">
      <DetailHeader title="Entradas e saídas">
        <Headline>
          {guardou >= 0 ? (
            <>Nos últimos {n} {n === 1 ? 'mês' : 'meses'} você guardou <Strong tone="gain">{taxa.toFixed(0)}%</Strong> de tudo que entrou.</>
          ) : (
            <>Nos últimos {n} {n === 1 ? 'mês' : 'meses'} saiu <Strong tone="loss">{formatCurrency(Math.abs(guardou))}</Strong> a mais do que entrou.</>
          )}
        </Headline>
      </DetailHeader>

      <MetricStrip
        items={[
          { label: 'Entrou', value: entrou, currency: true, tone: 'gain' },
          { label: 'Saiu', value: saiu, currency: true },
          { label: 'Sobrou', value: guardou, currency: true, signed: true, tone: guardou >= 0 ? 'gain' : 'loss' },
        ]}
      />

      <FlowChart meses={meses} ativo={ativo ?? meses.length - 1} onAtivo={setAtivo} />

      <section aria-label="Quanto sobrou em cada mês">
        <h2 className="font-semibold text-base text-[var(--color-ink)] mb-3">Quanto sobrou em cada mês</h2>
        <ol className="finance-card divide-y divide-[var(--color-line)]">
          {[...meses].reverse().map((m, ri) => {
            const t = m.entradas > 0 ? (m.resultado / m.entradas) * 100 : 0;
            return (
              <li key={m.mes} className="grid grid-cols-[1fr_auto] sm:grid-cols-[15rem_1fr_auto] items-center gap-x-6 gap-y-2 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)] first-letter:uppercase">{nomeMes(m.mes, 'long')}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]" data-num>
                    {formatCurrency(m.entradas)} entrou · {formatCurrency(m.saidas)} saiu
                  </p>
                </div>
                <div className="order-3 col-span-2 sm:order-none sm:col-span-1 h-1.5 rounded-full bg-[var(--color-line)]/60 overflow-hidden">
                  <div
                    className={cn('bar-x h-full rounded-full', t >= 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-finance-error)]/60')}
                    style={{ width: `${Math.max(Math.min(Math.abs(t), 100), 2)}%`, '--i': ri } as React.CSSProperties}
                  />
                </div>
                <p className={cn('text-sm font-semibold text-right', m.resultado >= 0 ? 'text-gain' : 'text-loss')} data-num>
                  {m.resultado >= 0 ? `${t.toFixed(0)}%` : `-${formatCurrency(Math.abs(m.resultado))}`}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function EntradasSaidasPage() {
  return (
    <div className="min-h-[100dvh] app-surface pb-20">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <FluxoContent />
      </main>
    </div>
  );
}
