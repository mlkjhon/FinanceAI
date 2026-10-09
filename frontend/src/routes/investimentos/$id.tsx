import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { AnimatedCounter, FinanceCard, SkeletonCard } from '../../components/ui';
import { investimentosApi } from '../../lib/api';
import { formatCurrency, formatCompactCurrency, formatDate, descreverTaxa } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { modal, backdrop } from '../../lib/motion-tokens';
import { ArrowLeft, TrendingUp, TrendingDown, PiggyBank, X, History, Trash2, Edit2 } from '../../components/icons';
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
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
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
  const [editForm, setEditForm] = useState({ nome: '', tipo: '', taxa_rendimento: '', indexador: 'PREFIXADO' });

  const { data: inv, isLoading } = useQuery({
    queryKey: ['investimentos', id],
    queryFn: () => investimentosApi.get(id),
  });

  const { data: taxasApi } = useQuery({
    queryKey: ['taxasBrasilAPI'],
    queryFn: async () => {
      try {
        const res = await fetch('https://brasilapi.com.br/api/taxas/v1');
        return res.json();
      } catch (e) {
        return [{ nome: 'cdi', valor: 10.5 }, { nome: 'selic', valor: 10.5 }, { nome: 'ipca', valor: 4.5 }];
      }
    },
    staleTime: 1000 * 60 * 60 * 24 // 24h
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
        taxa_rendimento: String(inv.taxa_rendimento),
        indexador: inv.indexador || 'PREFIXADO'
      });
      setModalEditAberto(true);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvMutation.mutate({
      nome: editForm.nome,
      tipo: editForm.tipo,
      taxa_rendimento: parseFloat(editForm.taxa_rendimento),
      indexador: editForm.indexador
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

  const getTaxaAnual = (invData: any) => {
    let taxa = parseFloat(String(invData.taxa_rendimento));
    const idx = (invData.indexador || 'PREFIXADO').toUpperCase();
    if (idx === 'PREFIXADO') return taxa;
    if (!taxasApi) return 0;

    const getT = (n: string) => taxasApi.find((t:any) => t.nome.toLowerCase() === n.toLowerCase())?.valor || 0;
    
    // Default fallback approximations for frontend display if API fails
    const defaultTaxas: any = { cdi: 10.5, selic: 10.5, ipca: 4.5, igpm: 4.0, inpc: 4.5, tr: 1.5, ibovespa: 10.0 };
    const getVal = (n: string) => getT(n) || defaultTaxas[n] || 0;

    if (idx === 'CDI') return (taxa / 100) * getVal('cdi');
    if (idx === 'SELIC') return (taxa / 100) * getVal('selic');
    if (idx === 'IPCA') return getVal('ipca') + taxa;
    if (idx === 'IGPM') return getVal('igpm') + taxa;
    if (idx === 'INPC') return getVal('inpc') + taxa;
    if (idx === 'IBOVESPA') return (taxa / 100) * getVal('ibovespa');
    if (idx === 'TR') return getVal('tr') + taxa;
    if (['TLP', 'TJLP', 'TBF'].includes(idx)) return 6.0 + taxa;
    if (['PTAX', 'IMA-B', 'IRF-M', 'IDA'].includes(idx)) return 5.0 + taxa;
    if (idx === 'POUPANCA' || idx === 'POUPANÇA') {
        const selic = getVal('selic');
        const rendimentoBase = selic > 8.5 ? 6.17 : (selic * 0.70);
        return (taxa / 100) * (rendimentoBase + getVal('tr'));
    }
    return taxa;
  };

  const rendimentoPrevisto = inv ? (parseFloat(String(inv.saldo_atual)) * (getTaxaAnual(inv) / 100)) / 365 : 0;

  return (
    <div className="min-h-[100dvh] app-surface font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="stagger max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
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
              <h1 className="text-2xl font-bold text-gray-900">
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
                title="Editar investimento"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este investimento e todo o seu histórico? Isso não pode ser desfeito.')) {
                    deleteInvMutation.mutate();
                  }
                }}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-loss-soft text-loss transition-colors border border-gray-100"
                title="Excluir investimento"
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
            <section className="h-full rounded-[var(--radius-card)] bg-[var(--color-accent)] text-white p-6 sm:p-7 flex flex-col justify-between gap-8 on-dark" aria-label="Saldo">
              <div>
                <p className="text-sm text-white/75">Saldo atual</p>
                {isLoading ? (
                  <span className="media-frame block h-11 w-56 mt-3 rounded-lg opacity-30" data-loading="" />
                ) : (
                  <AnimatedCounter value={parseFloat(String(inv?.saldo_atual || 0))} isCurrency className="mt-2 block text-4xl sm:text-5xl text-white" />
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => openModal('aporte')} className="pressable inline-flex items-center gap-2 rounded-full bg-white text-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold">
                  <TrendingUp size={16} /> Aportar
                </button>
                <button onClick={() => openModal('resgate')} className="pressable inline-flex items-center gap-2 rounded-full border border-white/40 text-white px-5 py-2.5 text-sm font-semibold">
                  <TrendingDown size={16} /> Resgatar
                </button>
              </div>
            </section>
          </div>

          <div>
            <FinanceCard className="h-full">
              <h3 className="font-semibold text-gray-900 mb-4">Informações</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Taxa</p>
                  <p data-num className="font-semibold text-gain text-lg">{inv ? descreverTaxa(inv) : '--'}</p>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Rende amanhã (estimativa)</p>
                  <p className="font-medium text-gain">+{formatCurrency(rendimentoPrevisto)}</p>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Criado em</p>
                  <p className="font-medium text-gray-900">{inv ? formatDate(inv.data_criacao) : '--/--/----'}</p>
                </div>
              </div>
            </FinanceCard>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <FinanceCard className="mb-6">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Evolução do patrimônio</h2>
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
            <h2 className="font-semibold text-gray-900">Histórico de movimentações</h2>
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
              {historicoInvertido.map((t, i) => (
                <div key={t.id_transacao_inv} style={{ '--i': Math.min(i, 8) } as React.CSSProperties} className={i < 12 ? 'rise py-4 flex items-center justify-between' : 'py-4 flex items-center justify-between'}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center 
                      ${t.tipo === 'aporte' ? 'bg-gain-soft text-gain' 
                        : t.tipo === 'resgate' ? 'bg-loss-soft text-loss' 
                        : 'bg-gain-soft text-gain'}`}
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
                      <p className={`font-bold text-sm ${t.tipo === 'resgate' ? 'text-loss' : (t.tipo === 'rendimento' ? 'text-gain' : 'text-gray-900')}`}>
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
                      className="text-gray-300 hover:text-loss transition-colors p-1"
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
              {...backdrop}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalAberto(false)}
            />
            <motion.div 
              {...modal}
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
                  <div className="p-3 bg-gain-soft text-gain text-xs rounded-xl mb-4">
                    O valor do aporte será debitado do seu saldo principal no dashboard.
                  </div>
                )}
                {tipoTransacao === 'resgate' && (
                  <div className="p-3 bg-loss-soft text-red-700 text-xs rounded-xl mb-4">
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
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
                      tipoTransacao === 'resgate' ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--color-accent)] hover:opacity-90'
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

      {/* Modal Editar investimento */}
      <AnimatePresence>
        {modalEditAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              {...backdrop}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalEditAberto(false)}
            />
            <motion.div 
              {...modal}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Editar investimento</h2>
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo (Ações, Renda Fixa, etc)</label>
                  <input
                    type="text"
                    required
                    value={editForm.tipo}
                    onChange={e => setEditForm({...editForm, tipo: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Indexador</label>
                  <select
                    value={editForm.indexador}
                    onChange={e => setEditForm({...editForm, indexador: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  >
                    {[
                      'PREFIXADO', 'CDI', 'SELIC', 'IPCA', 'IGPM', 'INPC', 
                      'TR', 'POUPANCA', 'IBOVESPA', 'TLP', 'TJLP', 'TBF', 
                      'PTAX', 'IMA-B', 'IRF-M', 'IDA'
                    ].map(idx => (
                      <option key={idx} value={idx}>{idx}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {editForm.indexador === 'PREFIXADO' ? 'Taxa de Rendimento (% ao ano)' : `Porcentagem do ${editForm.indexador} (%)`}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editForm.taxa_rendimento}
                    onChange={e => setEditForm({...editForm, taxa_rendimento: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
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
                    className="flex-1 text-white font-medium rounded-xl transition-colors disabled:opacity-50 py-3 bg-[var(--color-accent)] hover:opacity-90"
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
