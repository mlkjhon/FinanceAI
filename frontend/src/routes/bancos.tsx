import React, { useState } from 'react';
import { formatCurrency as formatarMoeda } from '../lib/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { modal } from '../lib/motion-tokens';
import { Plus, CreditCard, Building2, Wallet, ShieldCheck, Trash2, X } from '../components/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { OpenFinanceWidget } from '../components/OpenFinanceWidget';
import { ConfirmDialog } from '../components/confirm-dialog';

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
  // Resultado da sincronização, mostrado na página (no lugar do alert do navegador)
  const [aviso, setAviso] = useState<null | { tipo: 'ok' | 'erro'; titulo: string; texto?: string }>(null);
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
        setAviso({ tipo: 'erro', titulo: 'Não deu para sincronizar', texto: result.error });
      } else {
        const totalTx = result.totalTransacoes ?? 0;
        const totalContas = result.contas?.length ?? 0;
        setAviso({
          tipo: 'ok',
          titulo: 'Sincronização concluída',
          texto: `${totalContas} ${totalContas === 1 ? 'conta importada' : 'contas importadas'} e ${totalTx} ${totalTx === 1 ? 'transação importada' : 'transações importadas'}.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['openfinance', user?.id] });
      setPendingConnection(null);
    } catch (error) {
      console.error('Erro ao salvar a conexão no banco de dados:', error);
      setAviso({ tipo: 'erro', titulo: 'Erro de conexão', texto: 'Confira a internet e tente de novo.' });
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

        {aviso && (
          <div
            role={aviso.tipo === 'erro' ? 'alert' : 'status'}
            className={`pop-in flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 ${
              aviso.tipo === 'ok' ? 'border-[var(--color-accent)]/25 bg-gain-soft' : 'border-[var(--color-finance-error)]/25 bg-loss-soft'
            }`}
          >
            <div>
              <p className={`text-sm font-semibold ${aviso.tipo === 'ok' ? 'text-gain' : 'text-loss'}`}>{aviso.titulo}</p>
              {aviso.texto && <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{aviso.texto}</p>}
            </div>
            <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" className="pressable -mr-1 rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
              <X size={16} />
            </button>
          </div>
        )}

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

      </AnimatePresence>

      {/* Remover banco: mesma confirmação do resto do app */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        titulo={`Remover ${deleteConfirm?.nome ?? 'banco'}?`}
        confirmar="Remover banco"
        pendente={isDeleting}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            setIsDeleting(true);
            const API_URL = import.meta.env.VITE_API_URL || 'https://api-lyart-kappa.vercel.app';
            await fetch(`${API_URL}/conexoes/${deleteConfirm.id}`, { method: 'DELETE' });
            queryClient.invalidateQueries({ queryKey: ['openfinance', user?.id] });
            setDeleteConfirm(null);
          } catch (e) {
            console.error('Erro ao remover', e);
            setAviso({ tipo: 'erro', titulo: 'Não deu para remover o banco', texto: 'Tente de novo.' });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>Todas as contas e transações vinculadas a este banco serão apagadas.</p>
        <p>Isso não pode ser desfeito.</p>
      </ConfirmDialog>
    </div>
  );
}
