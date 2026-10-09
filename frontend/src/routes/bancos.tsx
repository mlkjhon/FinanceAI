import React, { useState } from 'react';
import { formatCurrency as formatarMoeda } from '../lib/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { modal } from '../lib/motion-tokens';
import { Plus, CreditCard, Building2, Wallet, ShieldCheck, Trash2 } from '../components/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { OpenFinanceWidget } from '../components/OpenFinanceWidget';

export const Route = createFileRoute('/bancos')({
  beforeLoad: () => {
    const token = localStorage.getItem('finance_token') || sessionStorage.getItem('finance_token');
    if (!token) throw redirect({ to: '/auth' });
  },
  component: BancosPage,
});

function formatCurrency(val: number | string | null) {
  if (val === null || val === undefined) return 'N/D';
  return formatarMoeda(Number(val));
}

// Item que o widget da Pluggy devolve ao conectar
interface ConexaoPendente { item?: { id?: string; connector?: { name?: string } } }
interface Conexao { id: string; instituicao: string; data_criacao: string }
interface Conta { id: string; id_conexao: string; nome: string; tipo: string; saldo: number | string; limite?: number | string | null; ultimos_digitos?: string | null }

function BancosPage() {
  const { user } = useAuth();
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<ConexaoPendente | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['openfinance', user?.id],
    queryFn: async () => {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api-lyart-kappa.vercel.app';
      const res = await fetch(`${API_URL}/conexoes/${user?.id}`);
      if (!res.ok) throw new Error('Erro ao buscar dados');
      return res.json() as Promise<{ conexoes: Conexao[]; contas: Conta[] }>;
    },
    enabled: !!user?.id,
  });

  const handleWidgetEvent = async (event: string, eventData?: unknown) => {
    if (event === 'SUCCESS') {
      // Guarda os dados pendentes para o modal de confirmação em vez de salvar direto
      setPendingConnection((eventData ?? {}) as ConexaoPendente);
    }
  };

  const handleConfirmSync = async (substituir: boolean) => {
    if (!substituir) {
      setPendingConnection(null);
      return;
    }

    try {
      setIsSyncing(true);
      const API_URL = import.meta.env.VITE_API_URL || 'https://api-lyart-kappa.vercel.app';
      
      const res = await fetch(`${API_URL}/conexoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: user?.id,
          public_token: pendingConnection?.item?.id || 'pluggy-item-id',
          instituicao: pendingConnection?.item?.connector?.name || 'Pluggy Bank',
          substituirTransacoes: substituir
        })
      });

      const result = await res.json();
      
      if (!res.ok) {
        alert(`❌ Erro ao sincronizar: ${result.error}`);
      } else {
        const totalTx = result.totalTransacoes ?? 0;
        const totalContas = result.contas?.length ?? 0;
        alert(`✅ Sincronização concluída!\n${totalContas} conta(s) importada(s)\n${totalTx} transação(ões) importada(s)`);
      }

      queryClient.invalidateQueries({ queryKey: ['openfinance', user?.id] });
      setPendingConnection(null);
    } catch (error) {
      console.error('Erro ao salvar a conexão no banco de dados:', error);
      alert('❌ Erro de conexão. Tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-[100dvh] app-surface pb-20">
      <Navbar />

      <main className="stagger max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              Bancos e cartões
            </h1>
            <p className="text-gray-500 mt-1">Conecte contas e sincronize suas faturas e saldo em tempo real (Open Finance).</p>
          </div>
          <button
            onClick={() => setIsWidgetOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 whitespace-nowrap"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Conectar nova instituição</span>
            <span className="sm:hidden">Conectar conta</span>
          </button>
        </header>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48" />
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Instituições conectadas</h2>
              
              {data?.conexoes?.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                  <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum banco conectado</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">Seus dados ficarão sincronizados de forma automática conectando sua conta através do Open Finance da Pluggy.</p>
                  <button
                    onClick={() => setIsWidgetOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] font-medium hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                  >
                    Conectar agora
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data?.conexoes?.map((conexao, i) => (
                    <FinanceCard key={conexao.id} index={i} className="relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 flex items-center gap-3">
                        <span className="live-dot" title="Sincronização ativa" />
                        <button
                          onClick={() => setDeleteConfirm({ id: conexao.id, nome: conexao.instituicao })}
                          className="text-gray-400 hover:text-loss transition-colors p-1"
                          title="Remover conexão"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mb-6 mt-2">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Building2 size={24} className="text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{conexao.instituicao}</h3>
                          <p className="text-xs text-gray-500">Adicionado em {new Date(conexao.data_criacao).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {data?.contas?.filter(c => c.id_conexao === conexao.id).map(conta => (
                          <div key={conta.id} className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {conta.tipo === 'CREDITO' ? <CreditCard size={18} className="text-[var(--color-finance-accent)]" /> : <Wallet size={18} className="text-[var(--color-accent)]" />}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{conta.nome}</p>
                                <p className="text-xs text-gray-500">Final {conta.ultimos_digitos}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {conta.tipo === 'CREDITO' ? formatCurrency(Math.abs(Number(conta.saldo))) : formatCurrency(Number(conta.saldo))}
                              </p>
                              {conta.tipo === 'CREDITO' && (
                                <p className="text-[10px] text-gray-400">Limite: {formatCurrency(Number(conta.limite ?? 0))}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FinanceCard>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isWidgetOpen && (
          <OpenFinanceWidget onEvent={handleWidgetEvent} onClose={() => setIsWidgetOpen(false)} />
        )}

        {/* Modal de confirmação de sincronização */}
        {pendingConnection && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              {...modal}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gain-soft flex items-center justify-center">
                  <ShieldCheck size={20} className="text-gain" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Conexão estabelecida</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                Para garantir que seu dashboard reflita exatamente o saldo bancário, precisamos importar
                o histórico oficial do banco. <strong>Deseja apagar os dados manuais antigos e substituí-los pelos dados reais?</strong>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleConfirmSync(true)}
                  disabled={isSyncing}
                  className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSyncing ? (
                    <><span className="spinner" aria-hidden="true" /> Sincronizando (isso pode levar até 1 minuto)...</>
                  ) : 'Sim, apagar e sincronizar com banco'}
                </button>
                <button
                  onClick={() => handleConfirmSync(false)}
                  disabled={isSyncing}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors disabled:opacity-50"
                >
                  Não, cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de confirmação de exclusão de banco */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              {...modal}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header vermelho */}
              <div className="bg-loss-soft px-6 pt-6 pb-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-loss-soft flex items-center justify-center shrink-0">
                  <Trash2 size={22} className="text-[var(--color-finance-error)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Remover Banco</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{deleteConfirm.nome}</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Tem certeza que deseja remover <strong>{deleteConfirm.nome}</strong>?<br />
                  <span className="text-loss font-medium">Esta ação irá apagar todas as contas e transações vinculadas a este banco e não pode ser desfeita.</span>
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      const API_URL = import.meta.env.VITE_API_URL || 'https://api-lyart-kappa.vercel.app';
                      await fetch(`${API_URL}/conexoes/${deleteConfirm.id}`, { method: 'DELETE' });
                      queryClient.invalidateQueries({ queryKey: ['openfinance', user?.id] });
                      setDeleteConfirm(null);
                    } catch (e) {
                      console.error('Erro ao remover', e);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <><span className="spinner" aria-hidden="true" />Removendo...</>
                  ) : 'Sim, remover'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
