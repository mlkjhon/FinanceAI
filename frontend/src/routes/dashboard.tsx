import { Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Plus, ArrowRight } from 'lucide-react';
import { dashboardApi, transactionsApi } from '../lib/api';
import { StatCard, FinanceCard, SkeletonCard } from '../components/ui';
import { Navbar } from '../components/Navbar';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const token = localStorage.getItem('finance_token');
    if (!token) throw redirect({ to: '/auth' });
  },
  component: DashboardPage,
});

function TransactionRow({ t }: { t: { descricao: string; valor: number; tipo: string; data: string; categoria_nome?: string } }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
          {t.tipo === 'receita'
            ? <TrendingUp size={16} className="text-green-500" />
            : <TrendingDown size={16} className="text-red-400" />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{t.descricao}</p>
          <p className="text-xs text-gray-400">{t.categoria_nome || 'Sem categoria'} · {formatDate(t.data)}</p>
        </div>
      </div>
      <span className={`font-semibold text-sm ${t.tipo === 'receita' ? 'text-green-500' : 'text-red-400'}`}>
        {t.tipo === 'despesa' ? '-' : '+'}{formatCurrency(t.valor)}
      </span>
    </div>
  );
}

// Gráfico de rosca (donut) para gastos por categoria
function DonutChart({ data }: { data: { categoria: string; valor: number; cor?: string }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  // Se não há dados ou total zero, exibe mensagem amigável
  if (!data.length || total === 0) {
    return <p className="text-sm text-gray-400 text-center pt-8">Sem dados disponíveis</p>;
  }

  let offset = 0;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const colors = [
    '#10B981', '#34D399', '#6EE7B7', '#059669', '#047857',
  ];

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0 -rotate-90">
        {data.slice(0, 5).map((d, i) => {
          const pct = d.valor / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const el = (
            <motion.circle
              key={d.categoria}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={d.cor || colors[i % colors.length]}
              strokeWidth="28"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              initial={{ strokeDasharray: '0 377' }}
              animate={{ strokeDasharray: `${dash} ${gap}` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="space-y-2">
        {data.slice(0, 5).map((d, i) => (
          <div key={d.categoria} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.cor || colors[i % colors.length] }} />
            <span className="text-gray-600 truncate max-w-[100px]">{d.categoria}</span>
            <span className="font-medium text-gray-900 ml-auto">{((d.valor / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gráfico de linha para evolução do saldo
function LineChart({ data }: { data: { mes: string; saldo: number }[] }) {
  if (!data.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;

  // Se houver apenas 1 mês, cria um mês fictício anterior igual para desenhar uma linha
  const chartData = data.length === 1 ? [{ mes: '...', saldo: data[0].saldo }, ...data] : data;

  const max = Math.max(...chartData.map((d) => d.saldo), 0);
  const min = Math.min(...chartData.map((d) => d.saldo), 0);
  const range = max - min || 1;
  const w = 400, h = 100;

  const points = chartData.map((d, i) => ({
    x: (i / (chartData.length - 1)) * w,
    y: h - ((d.saldo - min) / range) * h,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill="url(#areaGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r="4"
          fill="#10B981"
          stroke="white" strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 + i * 0.05 }}
        />
      ))}
    </svg>
  );
}

// NOVO: Gráfico de barras para comparar Entradas vs Saídas por mês
function BarChart({ data }: { data: { mes: string; entradas?: number; saidas?: number }[] }) {
  if (!data.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;

  const maxVal = Math.max(...data.map(d => Math.max(d.entradas || 0, d.saidas || 0)), 1);

  return (
    <div className="flex items-end gap-2 h-32 pt-2">
      {data.map((d, i) => {
        const entradas = d.entradas || 0;
        const saidas = d.saidas || 0;
        const altEntradas = (entradas / maxVal) * 100;
        const altSaidas = (saidas / maxVal) * 100;
        // Pega apenas o mês (MM) do formato MM/YYYY
        const mesCurto = d.mes?.split('/')?.[0] ?? d.mes;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 h-24">
              {/* Barra verde = Entradas */}
              <motion.div
                className="flex-1 rounded-t-md bg-green-400"
                style={{ height: `${altEntradas}%` }}
                initial={{ height: 0 }}
                animate={{ height: `${altEntradas}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                title={`Entradas: ${formatCurrency(entradas)}`}
              />
              {/* Barra vermelha = Saídas */}
              <motion.div
                className="flex-1 rounded-t-md bg-red-300"
                style={{ height: `${altSaidas}%` }}
                initial={{ height: 0 }}
                animate={{ height: `${altSaidas}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 + 0.05 }}
                title={`Saídas: ${formatCurrency(saidas)}`}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{mesCurto}</span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardContent() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    retry: false,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', { limit: '5' }],
    queryFn: () => transactionsApi.list({ limit: '5' }),
    retry: false,
  });

  const statCards = [
    { title: 'Saldo Total', value: summary?.saldo_total ?? 0, icon: <DollarSign size={20} />, color: 'primary' as const, delay: 0 },
    { title: 'Receitas do mês', value: summary?.receitas_mes ?? 0, icon: <TrendingUp size={20} />, color: 'success' as const, delay: 0.1 },
    { title: 'Despesas do mês', value: summary?.despesas_mes ?? 0, icon: <TrendingDown size={20} />, color: 'error' as const, delay: 0.2 },
    { title: 'Economia do mês', value: summary?.economia_mes ?? 0, icon: <PiggyBank size={20} />, color: 'secondary' as const, delay: 0.3 },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Cabeçalho */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral das suas finanças</p>
        </div>
        <Link
          to="/transactions"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-hero text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow shadow-[var(--color-finance-primary)]/30"
        >
          <Plus size={16} />
          Nova transação
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)
          : statCards.map((c) => <StatCard key={c.title} {...c} />)
        }
      </div>

      {/* Linha 1: Gráfico de linha do saldo + Gráfico de rosca */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Evolução do saldo */}
        <div className="lg:col-span-2">
          <FinanceCard className="h-full">
            <h2 className="font-semibold text-gray-900 mb-4">Evolução do Saldo</h2>
            <div className="h-40">
              {summaryLoading
                ? <SkeletonCard lines={1} className="h-full border-0 shadow-none" />
                : <LineChart data={summary?.evolucao_saldo || []} />
              }
            </div>
            {summary?.evolucao_saldo && summary.evolucao_saldo.length > 0 && (
              <div className="flex justify-between mt-3">
                {summary.evolucao_saldo.map((d) => (
                  <span key={d.mes} className="text-xs text-gray-400">{d.mes}</span>
                ))}
              </div>
            )}
          </FinanceCard>
        </div>

        {/* Gastos por categoria */}
        <FinanceCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Gastos por Categoria</h2>
            <Link to="/budgets" className="flex items-center gap-1 text-sm text-[var(--color-finance-primary)] hover:underline">
              Ver orçamentos <ArrowRight size={14} />
            </Link>
          </div>
          {summaryLoading
            ? <SkeletonCard lines={3} className="border-0 shadow-none" />
            : <DonutChart data={summary?.gastos_por_categoria || []} />
          }
        </FinanceCard>
      </div>

      {/* Linha 2: Gráfico de barras entradas vs saídas */}
      <FinanceCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Entradas vs Saídas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Comparativo dos últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> Saídas</span>
            </div>
          </div>
        </div>
        {summaryLoading
          ? <SkeletonCard lines={2} className="border-0 shadow-none" />
          : <BarChart data={summary?.evolucao_saldo || []} />
        }
      </FinanceCard>

      {/* Últimas transações */}
      <FinanceCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Últimas Transações</h2>
          <Link to="/transactions" className="flex items-center gap-1 text-sm text-[var(--color-finance-primary)] hover:underline">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        {txLoading
          ? <SkeletonCard lines={4} className="border-0 shadow-none" />
          : txData?.data.length
            ? txData.data.map((t) => <TransactionRow key={t.id} t={t} />)
            : <p className="text-sm text-gray-400 text-center py-6">Nenhuma transação encontrada</p>
        }
      </FinanceCard>

      {/* Link para insights da IA */}
      <FinanceCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Dicas Personalizadas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sua IA financeira tem novos conselhos para você</p>
          </div>
          <Link to="/insights" className="flex items-center gap-1 text-sm text-[var(--color-finance-primary)] hover:underline">
            Ver dicas <ArrowRight size={14} />
          </Link>
        </div>
      </FinanceCard>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}
