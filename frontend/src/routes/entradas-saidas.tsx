import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { Navbar } from '../components/Navbar';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown, Scale, CalendarDays } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line,
  ReferenceLine,
} from 'recharts';

export const Route = createFileRoute('/entradas-saidas')({
  component: EntradasSaidasPage,
});

/* ─── Tooltip customizado ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 min-w-[160px]">
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm mt-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600 capitalize">{p.name}</span>
          <span className="font-bold text-gray-900 ml-auto">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Gráfico de barras agrupadas ─────────────────────────────── */
function BarChartGrouped({ data }: { data: { mes: string; entradas?: number; saidas?: number }[] }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={8} />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Legend iconType="circle" iconSize={8}
          formatter={(value) => <span className="text-xs text-gray-500 capitalize">{value}</span>}
        />
        <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
        <Bar dataKey="saidas" name="Saídas" fill="#F87171" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Gráfico de linha – resultado líquido ────────────────────── */
function ResultadoLineChart({ data }: { data: { mes: string; resultado: number }[] }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={8} />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
          width={56}
        />
        <Tooltip
          content={({ active, payload, label }: any) => {
            if (!active || !payload?.length) return null;
            const val = payload[0].value;
            return (
              <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 min-w-[150px]">
                <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${val >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-gray-600">Resultado</span>
                  <span className={`font-bold ml-auto ${val >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {val >= 0 ? '+' : ''}{formatCurrency(val)}
                  </span>
                </div>
              </div>
            );
          }}
          cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
        <Line
          type="monotone"
          dataKey="resultado"
          stroke="#6366F1"
          strokeWidth={3}
          dot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 7, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── Card de mês ─────────────────────────────────────────────── */
function MesCard({
  item, i,
}: {
  item: { mes: string; entradas: number; saidas: number; resultado: number };
  i: number;
}) {
  const positivo = item.resultado >= 0;
  const taxaEconomia = item.entradas > 0 ? (item.resultado / item.entradas) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.07 }}
      className="p-5 rounded-2xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${positivo ? 'bg-green-50' : 'bg-red-50'}`}>
            <CalendarDays size={16} className={positivo ? 'text-green-500' : 'text-red-400'} />
          </div>
          <span className="font-bold text-gray-800">{item.mes}</span>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${positivo ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {positivo ? '+' : ''}{formatCurrency(item.resultado)}
        </span>
      </div>

      {/* Entradas */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500 flex items-center gap-1">
            <TrendingUp size={11} className="text-green-500" /> Entradas
          </span>
          <span className="font-semibold text-green-600">+{formatCurrency(item.entradas)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-green-400"
            initial={{ width: 0 }}
            animate={{ width: `100%` }}
            transition={{ duration: 0.6, delay: i * 0.07 + 0.1 }}
          />
        </div>
      </div>

      {/* Saídas */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500 flex items-center gap-1">
            <TrendingDown size={11} className="text-red-400" /> Saídas
          </span>
          <span className="font-semibold text-red-500">-{formatCurrency(item.saidas)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-red-400"
            initial={{ width: 0 }}
            animate={{ width: item.entradas > 0 ? `${Math.min((item.saidas / item.entradas) * 100, 100)}%` : '0%' }}
            transition={{ duration: 0.6, delay: i * 0.07 + 0.2 }}
          />
        </div>
      </div>

      {/* Taxa de economia */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-400">Taxa de economia</span>
        <span className={`font-bold ${taxaEconomia >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {taxaEconomia.toFixed(1)}%
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
function EntradasSaidasPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary(),
  });

  const evolucao: { mes: string; saldo: number; entradas?: number; saidas?: number }[] =
    summary?.evolucao_saldo || [];

  const meses = evolucao.map((e) => ({
    mes: e.mes,
    entradas: e.entradas ?? 0,
    saidas: e.saidas ?? 0,
    resultado: (e.entradas ?? 0) - (e.saidas ?? 0),
  }));

  const totalEntradas = meses.reduce((acc, m) => acc + m.entradas, 0);
  const totalSaidas = meses.reduce((acc, m) => acc + m.saidas, 0);
  const totalResultado = totalEntradas - totalSaidas;
  const melhorMes = [...meses].sort((a, b) => b.resultado - a.resultado)[0];
  const taxaMediaEconomia = totalEntradas > 0 ? (totalResultado / totalEntradas) * 100 : 0;

  const statItems = [
    {
      label: 'Total Entradas',
      value: `+${formatCurrency(totalEntradas)}`,
      icon: <TrendingUp size={18} />,
      color: '#10B981',
      bg: '#10B98115',
    },
    {
      label: 'Total Saídas',
      value: `-${formatCurrency(totalSaidas)}`,
      icon: <TrendingDown size={18} />,
      color: '#F87171',
      bg: '#F8717115',
    },
    {
      label: 'Resultado Líquido',
      value: (totalResultado >= 0 ? '+' : '') + formatCurrency(totalResultado),
      icon: <Scale size={18} />,
      color: totalResultado >= 0 ? '#6366F1' : '#F87171',
      bg: totalResultado >= 0 ? '#6366F115' : '#F8717115',
    },
    {
      label: 'Melhor Mês',
      value: melhorMes?.mes ?? '-',
      icon: <CalendarDays size={18} />,
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entradas vs Saídas</h1>
            <p className="text-gray-500 text-sm mt-0.5">Análise comparativa de receitas e despesas por mês.</p>
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

        {/* Taxa de economia geral */}
        {!isLoading && meses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="finance-card p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-semibold text-gray-700">Taxa Média de Economia</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Percentual médio de receita que se converte em saldo positivo no período
              </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:w-48 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${taxaMediaEconomia >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(taxaMediaEconomia), 100)}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
                />
              </div>
              <span className={`text-xl font-bold whitespace-nowrap ${taxaMediaEconomia >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {taxaMediaEconomia.toFixed(1)}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <FinanceCard>
            <h2 className="font-semibold text-gray-900 mb-1">Entradas vs Saídas</h2>
            <p className="text-xs text-gray-400 mb-4">Comparativo mensal de receitas e despesas</p>
            {isLoading
              ? <SkeletonCard lines={1} className="border-0 shadow-none h-[280px]" />
              : <BarChartGrouped data={meses} />
            }
          </FinanceCard>

          <FinanceCard>
            <h2 className="font-semibold text-gray-900 mb-1">Resultado Líquido</h2>
            <p className="text-xs text-gray-400 mb-4">Entradas menos saídas a cada mês</p>
            {isLoading
              ? <SkeletonCard lines={1} className="border-0 shadow-none h-[240px]" />
              : <ResultadoLineChart data={meses} />
            }
          </FinanceCard>
        </div>

        {/* Detalhamento por mês */}
        <FinanceCard>
          <h2 className="font-semibold text-gray-900 mb-1">Detalhamento por Mês</h2>
          <p className="text-xs text-gray-400 mb-5">Entradas, saídas, resultado e taxa de economia mensal</p>
          {isLoading ? (
            <SkeletonCard lines={4} className="border-0 shadow-none" />
          ) : meses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Nenhum dado registrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {meses.map((item, i) => (
                <MesCard key={item.mes} item={item} i={i} />
              ))}
            </div>
          )}
        </FinanceCard>

      </div>
    </div>
  );
}
