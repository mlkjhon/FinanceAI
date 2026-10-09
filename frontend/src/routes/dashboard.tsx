import React, { Suspense } from 'react';
import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, ArrowRight, ArrowUpRight } from '../components/icons';
import { dashboardApi } from '../lib/api';
import { AnimatedCounter, FinanceCard, SkeletonCard } from '../components/ui';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { DonutRing } from '../components/ConicChart';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const token = localStorage.getItem('finance_token') || sessionStorage.getItem('finance_token');
    if (!token) throw redirect({ to: '/auth' });
  },
  component: DashboardPage,
});

// Tons do verde da marca, do mais escuro ao mais claro (gastos por categoria)
const categoryColors = ['#047857', '#059669', '#10B981', '#34D399', '#A7F3D0'];

function TransactionRow({ t, index }: { t: { descricao: string; valor: number; tipo: string; data: string; categoria_nome?: string }; index: number }) {
  const isIncome = t.tipo === 'receita';
  return (
    <li className="rise flex items-baseline justify-between gap-4 py-3.5" style={{ '--i': index + 4 } as React.CSSProperties}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)] truncate">{t.descricao}</p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
          {t.categoria_nome || 'Sem categoria'} · {formatDate(t.data)}
        </p>
      </div>
      <span data-num className={`shrink-0 text-sm font-semibold ${isIncome ? 'text-gain' : 'text-[var(--color-ink)]'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(t.valor)}
      </span>
    </li>
  );
}

function CategoryBreakdown({ data }: { data: { categoria: string; valor: number; cor?: string }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  if (!data.length || total === 0) {
    return (
      <EmptyState
        text="Nenhum gasto neste mês ainda."
        action={<Link to="/transactions" className="link-line text-sm font-medium text-[var(--color-accent)]">Registrar um gasto</Link>}
      />
    );
  }

  const top = data.slice(0, 5);
  return (
    <div className="w-full flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
      <DonutRing
        className="w-32 h-32 shrink-0"
        hole={0.68}
        track="transparent"
        segments={top.map((d, i) => ({ value: d.valor, color: d.cor || categoryColors[i % categoryColors.length] }))}
        label={'Gastos por categoria: ' + top.map((d) => d.categoria + ' ' + ((d.valor / total) * 100).toFixed(0) + '%').join(', ')}
      />
      <ul className="w-full space-y-2.5">
        {top.map((d, i) => (
          <li key={d.categoria} className="flex items-center gap-2.5 text-sm">
            <span className="w-2 h-2 rounded-[3px] shrink-0" style={{ backgroundColor: d.cor || categoryColors[i % categoryColors.length] }} />
            <span className="text-[var(--color-ink-soft)] truncate">{d.categoria}</span>
            <span data-num className="font-medium text-[var(--color-ink)] ml-auto">{((d.valor / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-line)] rounded-[10px] px-3 py-2 shadow-md">
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p data-num className="text-sm font-semibold text-[var(--color-ink)]">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function BalanceChart({ data }: { data: { mes: string; saldo: number }[] }) {
  if (!data || !data.length) return <EmptyState text="O gráfico aparece depois do primeiro mês com movimentações." />;

  // Com um mês só, repete o ponto para desenhar uma linha
  const chartData = data.length === 1 ? [{ mes: '', saldo: data[0].saldo }, ...data] : data;


  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#047857" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#047857" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eef2ef" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={8} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#047857', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke="#047857"
          strokeWidth={2}
          fill="url(#saldoFill)"
          animationDuration={700}
          animationEasing="ease-out"
          activeDot={{ r: 4, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Entradas vs saídas: barras crescem da base com scaleY (CSS), em cascata
function FlowBars({ data }: { data: { mes: string; entradas?: number; saidas?: number }[] }) {
  if (!data.length) return <EmptyState text="Sem movimentações nos últimos meses." />;

  const maxVal = Math.max(...data.map((d) => Math.max(d.entradas || 0, d.saidas || 0)), 1);

  return (
    <div className="flex items-end gap-3 sm:gap-6 h-40">
      {data.map((d, i) => {
        const entradas = d.entradas || 0;
        const saidas = d.saidas || 0;
        const mesCurto = d.mes?.split('/')?.[0] ?? d.mes;
        return (
          <div key={d.mes ?? i} className="flex-1 flex flex-col items-center gap-2 h-full">
            <div className="w-full max-w-16 flex items-end gap-1 flex-1">
              <div
                className="bar-grow flex-1 rounded-t-[4px] bg-[var(--color-accent)]"
                style={{ height: `${Math.max((entradas / maxVal) * 100, 1)}%`, '--i': i * 2 } as React.CSSProperties}
                title={`Entradas: ${formatCurrency(entradas)}`}
              />
              <div
                className="bar-grow flex-1 rounded-t-[4px] bg-[var(--color-ink)]/15"
                style={{ height: `${Math.max((saidas / maxVal) * 100, 1)}%`, '--i': i * 2 + 1 } as React.CSSProperties}
                title={`Saídas: ${formatCurrency(saidas)}`}
              />
            </div>
            <span data-num className="text-xs text-[var(--color-ink-muted)]">{mesCurto}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="h-full min-h-28 flex flex-col items-start justify-center gap-2">
      <p className="text-sm text-[var(--color-ink-muted)] max-w-[32ch]">{text}</p>
      {action}
    </div>
  );
}

function SectionHeader({ title, to, linkLabel = 'Ver detalhes' }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-5">
      <h2 className="font-semibold text-base text-[var(--color-ink)]">{title}</h2>
      {to && (
        <Link to={to} className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)]">
          <span className="link-line">{linkLabel}</span>
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', 'all'],
    queryFn: () => dashboardApi.summary('all'),
    retry: false,
  });

  const firstName = user?.nome?.split(' ')[0];
  const receitas = summary?.receitas_mes ?? 0;
  const despesas = summary?.despesas_mes ?? 0;
  const economia = summary?.economia_mes ?? 0;
  const taxaEconomia = receitas > 0 ? (economia / receitas) * 100 : 0;

  return (
    <div className="space-y-6 pb-16">
      <header className="rise flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ '--i': 0 } as React.CSSProperties}>
        <div>
          {firstName && <p className="text-sm text-[var(--color-ink-muted)]">Olá, {firstName}</p>}
          <h1 className="font-bold text-3xl tracking-tight text-[var(--color-ink)] mt-1">Visão geral</h1>
        </div>
        <Link to="/transactions" className="btn-primary self-start sm:self-auto px-5 py-2.5 text-sm">
          <Plus size={16} />
          Nova transação
        </Link>
      </header>

      {/* Linha 1: saldo em destaque (5) + evolução (7) */}
      <div className="grid lg:grid-cols-12 gap-6">
        <section
          className="rise lg:col-span-5 rounded-[var(--radius-card)] bg-[var(--color-accent)] text-white p-6 sm:p-7 flex flex-col justify-between gap-8 on-dark"
          style={{ '--i': 1 } as React.CSSProperties}
          aria-label="Resumo do mês"
        >
          <div>
            <p className="text-sm text-white/75">Saldo total</p>
            {isLoading ? (
              <span className="media-frame block h-10 w-48 mt-3 rounded-lg opacity-30" data-loading="" />
            ) : (
              <AnimatedCounter value={summary?.saldo_total ?? 0} isCurrency className="mt-2 block text-4xl sm:text-5xl text-white" />
            )}
          </div>

          <dl className="grid grid-cols-3 divide-x divide-white/20 border-t border-white/20 pt-5">
            <div className="pr-3">
              <dt className="text-xs text-white/70">Entrou</dt>
              <dd data-num className="mt-1 text-sm sm:text-base font-semibold">{formatCurrency(receitas)}</dd>
            </div>
            <div className="px-3">
              <dt className="text-xs text-white/70">Saiu</dt>
              <dd data-num className="mt-1 text-sm sm:text-base font-semibold">{formatCurrency(despesas)}</dd>
            </div>
            <div className="pl-3">
              <dt className="text-xs text-white/70">Guardou</dt>
              <dd data-num className="mt-1 text-sm sm:text-base font-semibold">
                {receitas > 0 ? `${taxaEconomia.toFixed(0)}%` : formatCurrency(economia)}
              </dd>
            </div>
          </dl>
        </section>

        <FinanceCard className="lg:col-span-7 flex flex-col" index={2}>
          <SectionHeader title="Evolução do saldo" to="/evolucao-saldo" />
          <div className="h-52 lg:h-auto lg:flex-1 lg:min-h-52">
            {isLoading ? <SkeletonCard lines={1} className="h-full border-0" /> : <BalanceChart data={summary?.evolucao_saldo || []} />}
          </div>
        </FinanceCard>
      </div>

      {/* Linha 2: últimas transações (7) + categorias (5) */}
      <div className="grid lg:grid-cols-12 gap-6">
        <FinanceCard className="lg:col-span-7" index={3}>
          <SectionHeader title="Últimas transações" to="/transactions" linkLabel="Ver todas" />
          {isLoading ? (
            <SkeletonCard lines={4} className="border-0 p-0" />
          ) : summary?.ultimas_transacoes?.length ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {summary.ultimas_transacoes.map((t, i) => <TransactionRow key={i} t={t} index={i} />)}
            </ul>
          ) : (
            <EmptyState
              text="Você ainda não registrou nenhuma transação."
              action={<Link to="/transactions" className="link-line text-sm font-medium text-[var(--color-accent)]">Registrar a primeira</Link>}
            />
          )}
        </FinanceCard>

        <FinanceCard className="lg:col-span-5 flex flex-col" index={4}>
          <SectionHeader title="Para onde foi o dinheiro" to="/categorias" />
          <div className="flex-1 flex items-center">{isLoading ? <SkeletonCard lines={3} className="border-0 p-0 w-full" /> : <CategoryBreakdown data={summary?.gastos_por_categoria || []} />}</div>
        </FinanceCard>
      </div>

      {/* Linha 3: entradas vs saídas */}
      <FinanceCard index={5}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 mb-6">
          <div>
            <h2 className="font-semibold text-base text-[var(--color-ink)]">Entradas e saídas</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">Últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-5 text-xs text-[var(--color-ink-soft)]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--color-accent)]" /> Entradas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--color-ink)]/15" /> Saídas</span>
            <Link to="/entradas-saidas" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)]">
              <span className="link-line">Ver detalhes</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        {isLoading ? <SkeletonCard lines={2} className="border-0 p-0" /> : <FlowBars data={summary?.evolucao_saldo || []} />}
      </FinanceCard>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  );
}
