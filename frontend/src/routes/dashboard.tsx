import React, { Suspense, useState, useEffect } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Plus, ArrowRight, ArrowUpRight, Building2 } from 'lucide-react';
import { dashboardApi, transactionsApi, getUserData } from '../lib/api';
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

// Gráfico de linha para evolução do saldo com Recharts
function LineChart({ data }: { data: { mes: string; saldo: number }[] }) {
  if (!data || !data.length) return <p className="text-sm text-gray-400 text-center pt-12">Nenhum dado disponível</p>;

  // Se houver apenas 1 mês, cria um mês fictício anterior igual para desenhar uma linha
  const chartData = data.length === 1 ? [{ mes: '', saldo: data[0].saldo }, ...data] : data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 shadow-lg rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-sm font-bold text-gray-900">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="mes"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#9CA3AF' }}
          dy={10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke="#10B981"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorSaldo)"
          activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
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
  const [idConexao, setIdConexao] = useState('all');
  const [conexoes, setConexoes] = useState<any[]>([]);

  useEffect(() => {
    const fetchConexoes = async () => {
      try {
        const user = getUserData();
        if (!user) return;
        const API_URL = import.meta.env.VITE_API_URL || 'https://api-iota-livid-42.vercel.app';
        const res = await fetch(`${API_URL}/conexoes/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setConexoes(data.conexoes || []);
        }
      } catch (err) { }
    };
    fetchConexoes();
  }, []);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', idConexao],
    queryFn: () => dashboardApi.summary(idConexao),
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral das suas finanças</p>
        </div>

        <div className="flex items-center gap-3">
          {conexoes.length > 0 && (
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <select
                  value={idConexao}
                  onChange={(e) => setIdConexao(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-10 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] shadow-sm cursor-pointer transition-all hover:bg-gray-50"
                >
                  {conexoes.map(c => (
                    <option key={c.id} value={c.id}>{c.instituicao}</option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Building2 size={16} />
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    const nomeStr = prompt("Nome da área de testes:", "Área de Teste (Em Branco)");
                    if (!nomeStr) return;
                    const API_URL = import.meta.env.VITE_API_URL || 'https://api-iota-livid-42.vercel.app';
                    const user = getUserData();
                    await fetch(`${API_URL}/conexoes/manual`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id_usuario: user?.id, nome: nomeStr })
                    });
                    window.location.reload();
                  } catch (e) {
                    console.error('Erro ao criar banco manual', e);
                  }
                }}
                className="px-3 py-2.5 text-sm font-medium bg-[var(--color-finance-primary)] text-white rounded-xl hover:bg-[var(--color-finance-primary)]/90 transition-colors shadow-sm flex items-center gap-1"
                title="Criar novo espaço em branco"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Criar
              </button>
            </div>
          )}

          <Link
            to="/transactions"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-hero text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow shadow-[var(--color-finance-primary)]/30"
          >
            <Plus size={16} />
            Nova transação
          </Link>
        </div>
      </div>
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
            <div className="h-48 mt-4">
              {summaryLoading
                ? <SkeletonCard lines={1} className="h-full border-0 shadow-none" />
                : <LineChart data={summary?.evolucao_saldo || []} />
              }
            </div>
          </FinanceCard>
        </div>

        {/* Gastos por categoria */}
        <FinanceCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Gastos por Categoria</h2>
            <a href="/categorias" className="text-sm text-[var(--color-finance-primary)] font-medium hover:underline flex items-center gap-1">
              Ver detalhes <ArrowUpRight size={16} />
            </a>
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
        {summaryLoading
          ? <SkeletonCard lines={4} className="border-0 shadow-none" />
          : summary?.ultimas_transacoes?.length
            ? summary.ultimas_transacoes.map((t) => <TransactionRow key={t.id} t={t} />)
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
