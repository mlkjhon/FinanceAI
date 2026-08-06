import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { FinanceCard, SkeletonCard } from '../../components/ui';
import { investimentosApi } from '../../lib/api';
import { formatCurrency, formatCompactCurrency, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, PiggyBank, X, History, Trash2, Edit2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export const Route = createFileRoute('/investimentos/$id')({
  component: InvestimentoDetailsPage,
});

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 min-w-[150px]">
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-finance-primary)]" />
        <span className="text-gray-600">Saldo</span>
        <span className="font-bold text-gray-900 ml-auto">{formatCurrency(payload[0].value)}</span>
      </div>
    </div>
  );
}

function InvestimentoDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'aporte' | 'resgate'>('aporte');
  const [valor, setValor] = useState('');

  // Edit State
  const [modalEditAberto, setModalEditAberto] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', tipo: '', taxa_rendimento: '' });

  const { data: inv, isLoading } = useQuery({
    queryKey: ['investimentos', id],
    queryFn: () => investimentosApi.get(id),
  });

  const transacaoMutation = useMutation({
    mutationFn: (data: { tipo: 'aporte' | 'resgate'; valor: number }) =>
      investimentosApi.addTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }); // Aporte/Resgate mexe na conta principal
      setModalAberto(false);
      setValor('');
    }
  });

  const deleteTransacaoMutation = useMutation({
    mutationFn: (transacaoId: string | number) => investimentosApi.deleteTransaction(id, transacaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  });

  const deleteInvMutation = useMutation({
    mutationFn: () => investimentosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate({ to: '/investimentos' });
    }
  });

  const updateInvMutation = useMutation({
    mutationFn: (data: any) => investimentosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos', id] });
      setModalEditAberto(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0) return;
    transacaoMutation.mutate({
      tipo: tipoTransacao,
      valor: parseFloat(valor)
    });
  };

  const openModal = (tipo: 'aporte' | 'resgate') => {
    setTipoTransacao(tipo);
    setValor('');
    setModalAberto(true);
  };

  const openEditModal = () => {
    if (inv) {
      setEditForm({
        nome: inv.nome,
        tipo: inv.tipo,
        taxa_rendimento: String(inv.taxa_rendimento)
      });
      setModalEditAberto(true);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvMutation.mutate({
      nome: editForm.nome,
      tipo: editForm.tipo,
      taxa_rendimento: parseFloat(editForm.taxa_rendimento)
    });
  };

  // Preparar dados do gráfico
  const chartData = inv?.historico?.map(t => ({
    data: formatDate(t.data_registro),
    saldo: t.saldoAposTransacao
  })) || [];

  if (chartData.length === 1) {
    chartData.unshift({ data: '', saldo: 0 }); // Linha visual pra começar do 0
  }

  const historicoInvertido = [...(inv?.historico || [])].reverse();

  const rendimentoPrevisto = inv ? (parseFloat(String(inv.saldo_atual)) * (parseFloat(String(inv.taxa_rendimento)) / 100)) / 365 : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/investimentos"
              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? 'Carregando...' : inv?.nome}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{inv?.tipo}</p>
            </div>
          </div>
          {!isLoading && inv && (
            <div className="flex gap-2">
              <button
                onClick={openEditModal}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600 transition-colors border border-gray-100"
                title="Editar Investimento"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este investimento e todo o seu histórico? Isso não pode ser desfeito.')) {
                    deleteInvMutation.mutate();
                  }
                }}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-red-50 text-red-500 transition-colors border border-gray-100"
                title="Excluir Investimento"
                disabled={deleteInvMutation.isPending}
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Saldo e Ações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <FinanceCard className="h-full flex flex-col justify-center gradient-hero border-0 shadow-lg shadow-[var(--color-finance-primary)]/20">
              <p className="text-white/80 text-sm font-medium mb-1">Saldo Atual</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                {isLoading ? 'R$ --,--' : formatCurrency(parseFloat(String(inv?.saldo_atual || 0)))}
              </h2>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => openModal('aporte')}
                  className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 backdrop-blur-sm"
                >
                  <TrendingUp size={18} /> Aporte
                </button>
                <button 
                  onClick={() => openModal('resgate')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 backdrop-blur-sm"
                >
                  <TrendingDown size={18} /> Resgatar
                </button>
              </div>
            </FinanceCard>
          </div>

          <div>
            <FinanceCard className="h-full">
              <h3 className="font-semibold text-gray-900 mb-4">Informações</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Taxa de Rendimento Automática</p>
                  <p className="font-bold text-green-600 text-lg">+{inv?.taxa_rendimento}% <span className="text-sm font-medium text-gray-500">ao ano</span></p>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Rendimento Previsto (Amanhã)</p>
                  <p className="font-medium text-green-600">+{formatCurrency(rendimentoPrevisto)}</p>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Data de Criação</p>
                  <p className="font-medium text-gray-900">{inv ? formatDate(inv.data_criacao) : '--/--/----'}</p>
                </div>
              </div>
            </FinanceCard>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <FinanceCard className="mb-6">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Evolução do Patrimônio</h2>
            <p className="text-xs text-gray-400">Crescimento do seu dinheiro neste investimento ao longo do tempo.</p>
          </div>
          {isLoading ? (
             <SkeletonCard lines={1} className="border-0 shadow-none h-[260px]" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldoInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-finance-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-finance-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={60}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-finance-primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-finance-primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldoInv)"
                  activeDot={{ r: 6, fill: 'var(--color-finance-primary)', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Nenhuma transação registrada ainda.</p>
          )}
        </FinanceCard>

        {/* Histórico */}
        <FinanceCard>
          <div className="flex items-center gap-2 mb-6">
            <History size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Histórico de Movimentações</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard lines={1} className="border-0 shadow-none" />
              <SkeletonCard lines={1} className="border-0 shadow-none" />
            </div>
          ) : historicoInvertido.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum histórico disponível.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {historicoInvertido.map(t => (
                <div key={t.id_transacao_inv} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center 
                      ${t.tipo === 'aporte' ? 'bg-emerald-50 text-emerald-500' 
                        : t.tipo === 'resgate' ? 'bg-red-50 text-red-500' 
                        : 'bg-green-50 text-green-500'}`}
                    >
                      {t.tipo === 'aporte' ? <TrendingUp size={18} /> 
                       : t.tipo === 'resgate' ? <TrendingDown size={18} /> 
                       : <PiggyBank size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{t.tipo}</p>
                      <p className="text-xs text-gray-400">{formatDate(t.data_registro)}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center justify-end gap-4">
                    <div>
                      <p className={`font-bold text-sm ${t.tipo === 'resgate' ? 'text-red-500' : (t.tipo === 'rendimento' ? 'text-green-500' : 'text-gray-900')}`}>
                        {t.tipo === 'resgate' ? '-' : '+'}{formatCurrency(parseFloat(String(t.valor)))}
                      </p>
                      {t.saldoAposTransacao !== undefined && (
                        <p className="text-xs text-gray-400 mt-0.5">Saldo: {formatCurrency(t.saldoAposTransacao)}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm('Excluir esta transação?')) {
                          deleteTransacaoMutation.mutate(t.id_transacao_inv);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Excluir Transação"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FinanceCard>

      </div>

      {/* Modal Transação */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalAberto(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 capitalize">{tipoTransacao}</h2>
                <button onClick={() => setModalAberto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {tipoTransacao === 'aporte' && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl mb-4">
                    O valor do aporte será debitado do seu saldo principal no dashboard.
                  </div>
                )}
                {tipoTransacao === 'resgate' && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl mb-4">
                    O valor do resgate será creditado no seu saldo principal no dashboard.
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    placeholder="Ex: 500.00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={transacaoMutation.isPending}
                    className={`flex-1 text-white font-medium rounded-xl transition-colors disabled:opacity-50 py-3 ${
                      tipoTransacao === 'resgate' ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--color-finance-primary)] hover:opacity-90'
                    }`}
                  >
                    {transacaoMutation.isPending ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Investimento */}
      <AnimatePresence>
        {modalEditAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalEditAberto(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Editar Investimento</h2>
                <button onClick={() => setModalEditAberto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Investimento</label>
                  <input
                    type="text"
                    required
                    value={editForm.nome}
                    onChange={e => setEditForm({...editForm, nome: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo (Ações, Renda Fixa, etc)</label>
                  <input
                    type="text"
                    required
                    value={editForm.tipo}
                    onChange={e => setEditForm({...editForm, tipo: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Taxa de Rendimento (% ao ano)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.taxa_rendimento}
                    onChange={e => setEditForm({...editForm, taxa_rendimento: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalEditAberto(false)}
                    className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateInvMutation.isPending}
                    className="flex-1 text-white font-medium rounded-xl transition-colors disabled:opacity-50 py-3 bg-[var(--color-finance-primary)] hover:opacity-90"
                  >
                    {updateInvMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
