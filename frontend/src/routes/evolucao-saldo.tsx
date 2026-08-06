import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { Navbar } from '../components/Navbar';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export const Route = createFileRoute('/evolucao-saldo')({
  component: EvolucaoSaldoPage,
});

/* ─── Tooltip customizado ─────────────────────────────────────── */
function CustomTooltipSaldo({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 min-w-[150px]">
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600 capitalize">{p.name}</span>
          <span className="font-bold text-gray-900 ml-auto">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Gráfico de área – evolução do saldo ─────────────────────── */
function SaldoAreaChart({ data }: { data: { mes: string; saldo: number }[] }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;

  const chartData = data.length === 1 ? [{ mes: '', saldo: data[0].saldo }, ...data] : data;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip content={<CustomTooltipSaldo />} cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="#10B981"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#gradSaldo)"
          activeDot={{ r: 7, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Gráfico de barras – entradas vs saídas ──────────────────── */
function EntradasSaidasChart({ data }: { data: { mes: string; entradas?: number; saidas?: number }[] }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip content={<CustomTooltipSaldo />} cursor={{ fill: '#f9fafb' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-gray-500 capitalize">{value}</span>
          )}
        />
        <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
        <Bar dataKey="saidas" name="Saídas" fill="#F87171" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Linha de resumo por mês ─────────────────────────────────── */
function MesRow({
  item, i, maxSaldo,
}: {
  item: { mes: string; saldo: number; entradas?: number; saidas?: number };
  i: number;
  maxSaldo: number;
}) {
  const colors = ['#10B981', '#34D399', '#6EE7B7', '#059669', '#047857', '#065F46'];
  const cor = colors[i % colors.length];
  const pct = maxSaldo > 0 ? Math.min((item.saldo / maxSaldo) * 100, 100) : 0;
  const entradas = item.entradas ?? 0;
  const saidas = item.saidas ?? 0;
  const resultado = entradas - saidas;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: i * 0.06 }}
      className="p-4 rounded-2xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
    >
      {/* Linha superior */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cor}20` }}>
            <Wallet size={16} style={{ color: cor }} />
          </div>
          <span className="font-semibold text-gray-800 text-sm">{item.mes}</span>
        </div>
        <span className="font-bold text-gray-900 text-sm">{formatCurrency(item.saldo)}</span>
      </div>

      {/* Barra de progresso do saldo */}
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: cor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: i * 0.06 + 0.2, ease: 'easeOut' }}
        />
      </div>

      {/* Entradas / Saídas / Resultado */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-400 mb-0.5">Entradas</p>
          <p className="font-semibold text-green-600">+{formatCurrency(entradas)}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Saídas</p>
          <p className="font-semibold text-red-500">-{formatCurrency(saidas)}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Resultado</p>
          <p className={`font-semibold ${resultado >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
function EvolucaoSaldoPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary(),
  });

  const evolucao: { mes: string; saldo: number; entradas?: number; saidas?: number }[] =
    summary?.evolucao_saldo || [];

  const totalEntradas = evolucao.reduce((acc, e) => acc + (e.entradas ?? 0), 0);
  const totalSaidas = evolucao.reduce((acc, e) => acc + (e.saidas ?? 0), 0);
  const maxSaldo = Math.max(...evolucao.map((e) => e.saldo), 1);
  const melhorMes = evolucao.reduce(
    (best, e) => ((e.entradas ?? 0) - (e.saidas ?? 0) > (best.entradas ?? 0) - (best.saidas ?? 0) ? e : best),
    evolucao[0] ?? { mes: '-', saldo: 0 }
  );

  const statItems = [
    {
      label: 'Total Entradas',
      value: formatCurrency(totalEntradas),
      icon: <TrendingUp size={18} />,
      color: '#10B981',
      bg: '#10B98115',
    },
    {
      label: 'Total Saídas',
      value: formatCurrency(totalSaidas),
      icon: <TrendingDown size={18} />,
      color: '#F87171',
      bg: '#F8717115',
    },
    {
      label: 'Melhor Mês',
      value: melhorMes?.mes ?? '-',
      icon: <BarChart2 size={18} />,
      color: '#6366F1',
      bg: '#6366F115',
    },
    {
      label: 'Saldo Atual',
      value: formatCurrency(summary?.saldo_total ?? 0),
      icon: <Wallet size={18} />,
      color: '#F59E0B',
      bg: '#F59E0B15',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/dashboard"
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evolução do Saldo</h1>
            <p className="text-gray-500 text-sm mt-0.5">Análise completa da evolução financeira ao longo dos meses.</p>
          </div>
        </div>

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statItems.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="finance-card p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-tight">{s.label}</p>
                </div>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <FinanceCard>
            <h2 className="font-semibold text-gray-900 mb-1">Evolução do Saldo</h2>
            <p className="text-xs text-gray-400 mb-4">Patrimônio acumulado mês a mês</p>
            {isLoading
              ? <SkeletonCard lines={1} className="border-0 shadow-none h-[260px]" />
              : <SaldoAreaChart data={evolucao} />
            }
          </FinanceCard>

          <FinanceCard>
            <h2 className="font-semibold text-gray-900 mb-1">Entradas vs Saídas</h2>
            <p className="text-xs text-gray-400 mb-4">Comparativo mensal de fluxo de caixa</p>
            {isLoading
              ? <SkeletonCard lines={1} className="border-0 shadow-none h-[260px]" />
              : <EntradasSaidasChart data={evolucao} />
            }
          </FinanceCard>
        </div>

        {/* Detalhamento por mês */}
        <FinanceCard>
          <h2 className="font-semibold text-gray-900 mb-1">Detalhamento por Mês</h2>
          <p className="text-xs text-gray-400 mb-5">Entradas, saídas e resultado líquido mês a mês</p>
          {isLoading ? (
            <SkeletonCard lines={4} className="border-0 shadow-none" />
          ) : evolucao.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Nenhum dado registrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {evolucao.map((item, i) => (
                <MesRow key={item.mes} item={item} i={i} maxSaldo={maxSaldo} />
              ))}
            </div>
          )}
        </FinanceCard>

      </div>
    </div>
  );
}
