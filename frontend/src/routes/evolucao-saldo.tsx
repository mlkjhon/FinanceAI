import React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardApi } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { formatCurrency, formatCompactCurrency, cn } from '../lib/utils';
import { DetailHeader, Headline, Strong, MetricStrip, ChartTooltip, EmptyDetail, DetailSkeleton } from '../components/detail';
import { nomeMes } from '../lib/datas';

export const Route = createFileRoute('/evolucao-saldo')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: EvolucaoSaldoPage,
});

// "MM/YYYY" -> número ordenável (a API ordena como texto, o que quebra na virada do ano)
const chave = (mes: string) => {
  const [m, y] = mes.split('/');
  return Number(y) * 100 + Number(m);
};

function EvolucaoContent() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', 'all'],
    queryFn: () => dashboardApi.summary('all'),
  });

  if (isLoading) return <DetailSkeleton />;

  const meses = [...(summary?.evolucao_saldo ?? [])].sort((a, b) => chave(a.mes) - chave(b.mes));
  if (!meses.length) return <EmptyDetail text="Ainda não há meses com movimentações para mostrar a evolução." />;

  /*
   * A API manda o resultado de cada mês (entradas - saídas). O saldo no fim de
   * cada mês é reconstruído de trás para frente a partir do saldo de hoje.
   */
  const saldoHoje = summary?.saldo_total ?? 0;
  const resultados = meses.map((m) => (m.entradas ?? 0) - (m.saidas ?? 0));
  const fimDoMes: number[] = [];
  let acc = saldoHoje;
  for (let i = meses.length - 1; i >= 0; i--) {
    fimDoMes[i] = acc;
    acc -= resultados[i];
  }
  const saldoInicial = acc;
  const variacao = saldoHoje - saldoInicial;

  const melhor = resultados.indexOf(Math.max(...resultados));
  const media = resultados.reduce((s, r) => s + r, 0) / resultados.length;
  const positivos = resultados.filter((r) => r > 0).length;
  const maxAbs = Math.max(...resultados.map(Math.abs), 1);

  const chartData = [
    { mes: 'Início', saldo: saldoInicial },
    ...meses.map((m, i) => ({ mes: nomeMes(m.mes).split(' ')[0], saldo: fimDoMes[i] })),
  ];

  return (
    <div className="stagger space-y-8">
      <DetailHeader title="Evolução do saldo">
        <Headline>
          Seu saldo {variacao >= 0 ? 'cresceu' : 'caiu'}{' '}
          <Strong tone={variacao >= 0 ? 'gain' : 'loss'}>{formatCurrency(Math.abs(variacao))}</Strong>{' '}
          desde o início de {nomeMes(meses[0].mes, 'long')}.
        </Headline>
      </DetailHeader>

      <MetricStrip
        items={[
          { label: 'Saldo hoje', value: saldoHoje, currency: true },
          { label: `Melhor mês (${nomeMes(meses[melhor].mes).split(' ')[0]})`, value: resultados[melhor], currency: true, signed: true, tone: resultados[melhor] >= 0 ? 'gain' : 'loss' },
          { label: 'Média por mês', value: media, currency: true, signed: true, tone: media >= 0 ? 'gain' : 'loss' },
          { label: 'Meses no positivo', value: positivos, suffix: ` de ${meses.length}` },
        ]}
      />

      <section className="finance-card p-5 sm:p-6" aria-label="Gráfico do saldo">
        <h2 className="font-semibold text-base text-[var(--color-ink)]">Saldo no fim de cada mês</h2>
        <div className="h-72 mt-5 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047857" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef2ef" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => formatCompactCurrency(v)} width={64} />
              <Tooltip content={<ChartTooltip names={{ saldo: 'Saldo' }} />} cursor={{ stroke: '#047857', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#047857"
                strokeWidth={2}
                fill="url(#evoFill)"
                animationDuration={800}
                animationEasing="ease-out"
                activeDot={{ r: 4, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-label="Mês a mês">
        <h2 className="font-semibold text-base text-[var(--color-ink)] mb-3">Mês a mês</h2>
        <ol className="finance-card divide-y divide-[var(--color-line)]">
          {[...meses].reverse().map((m, ri) => {
            const i = meses.length - 1 - ri;
            const r = resultados[i];
            return (
              <li key={m.mes} className="grid grid-cols-[1fr_auto] sm:grid-cols-[12rem_1fr_auto] items-center gap-x-6 gap-y-2 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)] first-letter:uppercase">{nomeMes(m.mes, 'long')}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]" data-num>{m.mes.split('/')[1]}</p>
                </div>
                <div className="order-3 col-span-2 sm:order-none sm:col-span-1 h-1.5 rounded-full bg-[var(--color-line)]/60 overflow-hidden">
                  <div
                    className={cn('bar-x h-full rounded-full', r >= 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-finance-error)]/60')}
                    style={{ width: `${Math.max((Math.abs(r) / maxAbs) * 100, 2)}%`, '--i': ri } as React.CSSProperties}
                  />
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-semibold', r >= 0 ? 'text-gain' : 'text-loss')} data-num>
                    {r >= 0 ? '+' : '-'}{formatCurrency(Math.abs(r))}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]" data-num>saldo {formatCurrency(fimDoMes[i])}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function EvolucaoSaldoPage() {
  return (
    <div className="min-h-[100dvh] app-surface pb-20">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <EvolucaoContent />
      </main>
    </div>
  );
}
