import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { Navbar } from '../components/Navbar';
import { formatCurrency, formatCompactCurrency } from '../lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown, Scale, CalendarDays } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

export const Route = createFileRoute('/entradas-saidas')({
  component: EntradasSaidasPage,
});

/* ─── Tooltip customizado ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 min-w-[180px]">
      <p className="text-xs text-gray-400 mb-3 font-medium">{label}</p>
      {payload.map((p: any) => {
        const isSaida = p.dataKey === 'saidasNegativas';
        const name = isSaida ? 'Saídas' : p.name;
        const value = isSaida ? Math.abs(p.value) : p.value;
        const prefix = p.dataKey === 'resultado' ? (value >= 0 ? '+' : '') : (isSaida ? '-' : '+');
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-sm mt-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 font-medium">{name}</span>
            <span className={`font-bold ml-auto ${p.dataKey === 'resultado' ? (value >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-900'}`}>
              {prefix}{formatCurrency(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Gráfico Divergente de Fluxo de Caixa ────────────────────── */
function FluxoCaixaChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;
  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickFormatter={(v) => formatCompactCurrency(v)}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Legend 
          iconType="circle" 
          iconSize={8} 
          wrapperStyle={{ paddingBottom: '16px' }}
          verticalAlign="top"
          formatter={(value) => (
            <span className="text-xs text-gray-500 mr-4 font-medium">{value === 'saidasNegativas' ? 'Saídas' : value}</span>
          )}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
        <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={50} />
        <Bar dataKey="saidasNegativas" name="Saídas" fill="#F87171" radius={[0, 0, 4, 4]} stackId="a" maxBarSize={50} />
        <Line 
          type="monotone" 
          dataKey="resultado" 
          name="Resultado Líquido" 
          stroke="#6366F1" 
          strokeWidth={3} 
          dot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} 
          activeDot={{ r: 7, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── Tabela Mensal ─────────────────────────────────────────────── */
function TabelaMensal({ dados }: { dados: any[] }) {
  if (!dados?.length) return <p className="text-sm text-gray-500 text-center py-8">Nenhum dado registrado ainda.</p>;
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-4 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mês</th>
            <th className="pb-4 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Entradas</th>
            <th className="pb-4 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Saídas</th>
            <th className="pb-4 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Economia</th>
            <th className="pb-4 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right pr-2">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {dados.map((item, i) => {
            const positivo = item.resultado >= 0;
            const taxa = item.entradas > 0 ? (item.resultado / item.entradas) * 100 : 0;
            return (
              <motion.tr 
                key={item.mes}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${positivo ? 'bg-green-50 group-hover:bg-green-100' : 'bg-red-50 group-hover:bg-red-100'}`}>
                      <CalendarDays size={15} className={positivo ? 'text-green-500' : 'text-red-400'} />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">{item.mes}</span>
                  </div>
                </td>
                <td className="py-4 text-right text-sm font-semibold text-green-600">
                  +{formatCurrency(item.entradas)}
                </td>
                <td className="py-4 text-right text-sm font-semibold text-red-500">
                  -{formatCurrency(item.saidas)}
                </td>
                <td className="py-4 text-right text-sm">
                   <div className="flex items-center justify-end gap-3">
                     <span className={`font-semibold ${taxa >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                       {taxa >= 0 ? '+' : ''}{taxa.toFixed(1)}%
                     </span>
                     <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex justify-start">
                       <motion.div 
                          className={`h-full rounded-full ${taxa >= 0 ? 'bg-green-400' : 'bg-red-400'}`} 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.abs(taxa), 100)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 + 0.2 }}
                       />
                     </div>
                   </div>
                </td>
                <td className="py-4 text-right pr-2">
                  <span className={`inline-flex justify-center min-w-[90px] text-xs font-semibold px-2.5 py-1.5 rounded-full ${positivo ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {positivo ? '+' : ''}{formatCurrency(item.resultado)}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
    saidasNegativas: -(e.saidas ?? 0),
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Análise de Fluxo</h1>
            <p className="text-gray-500 text-sm mt-0.5">Visão detalhada e comparativa entre receitas e despesas.</p>
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
                {taxaMediaEconomia >= 0 ? '+' : ''}{taxaMediaEconomia.toFixed(1)}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Gráfico Principal */}
        <FinanceCard className="mb-6">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Fluxo de Caixa Mensal</h2>
            <p className="text-xs text-gray-400">Entradas e saídas convergindo para o resultado líquido</p>
          </div>
          {isLoading
            ? <SkeletonCard lines={1} className="border-0 shadow-none h-[340px]" />
            : <FluxoCaixaChart data={meses} />
          }
        </FinanceCard>

        {/* Detalhamento por mês em Tabela */}
        <FinanceCard>
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900 mb-1">Histórico Detalhado</h2>
            <p className="text-xs text-gray-400">Tabela de desempenho financeiro mês a mês</p>
          </div>
          {isLoading ? (
            <SkeletonCard lines={4} className="border-0 shadow-none" />
          ) : (
            <TabelaMensal dados={meses} />
          )}
        </FinanceCard>

      </div>
    </div>
  );
}
