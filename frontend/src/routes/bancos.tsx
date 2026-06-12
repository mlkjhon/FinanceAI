import React, { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, Building2, MoreHorizontal, Wallet, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { OpenFinanceWidget } from '../components/OpenFinanceWidget';

export const Route = createFileRoute('/bancos')({
  beforeLoad: () => {
    const token = localStorage.getItem('finance_token');
    if (!token) throw redirect({ to: '/auth' });
  },
  component: BancosPage,
});

function formatCurrency(val: number | string | null) {
  if (val === null || val === undefined) return 'N/D';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
}

export default function BancosPage() {
  const { user } = useAuth();
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['openfinance', user?.id],
    queryFn: async () => {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api-iota-livid-42.vercel.app';
      const res = await fetch(`${API_URL}/conexoes/${user?.id}`);
      if (!res.ok) throw new Error('Erro ao buscar dados');
      return res.json() as Promise<{ conexoes: any[]; contas: any[] }>;
    },
    enabled: !!user?.id,
  });

  const handleWidgetEvent = (event: string, eventData?: any) => {
    if (event === 'SUCCESS') {
      // Atualiza a tela de conexões com o novo banco adicionado
      queryClient.invalidateQueries({ queryKey: ['openfinance', user?.id] });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-finance-bg-light)] dark:bg-[var(--color-finance-bg-dark)] pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-brand text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="text-[var(--color-finance-primary)]" /> Bancos e Cartões
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Conecte contas e sincronize suas faturas e saldo em tempo real (Open Finance).</p>
          </div>
          <button
            onClick={() => setIsWidgetOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-hero text-white font-semibold shadow-lg shadow-[var(--color-finance-primary)]/20 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap"
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
            {/* Lista de Conexões */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Instituições Conectadas</h2>
              
              {data?.conexoes?.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[var(--color-finance-card-dark)] rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <ShieldCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum banco conectado</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">Seus dados ficarão sincronizados de forma automática conectando sua conta através do Open Finance da Polp.</p>
                  <button
                    onClick={() => setIsWidgetOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-finance-primary)] text-[var(--color-finance-primary)] font-medium hover:bg-[var(--color-finance-primary)] hover:text-white transition-colors"
                  >
                    Conectar agora
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data?.conexoes.map(conexao => (
                    <FinanceCard key={conexao.id} className="relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Sincronização Ativa" />
                      </div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Building2 size={24} className="text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{conexao.instituicao}</h3>
                          <p className="text-xs text-gray-500">Adicionado em {new Date(conexao.data_criacao).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {/* Contas pertencentes a esta conexão */}
                      <div className="space-y-3">
                        {data?.contas.filter(c => c.id_conexao === conexao.id).map(conta => (
                          <div key={conta.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {conta.tipo === 'CREDITO' ? <CreditCard size={18} className="text-[var(--color-finance-accent)]" /> : <Wallet size={18} className="text-[var(--color-finance-primary)]" />}
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{conta.nome}</p>
                                <p className="text-xs text-gray-500">Final {conta.ultimos_digitos}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {conta.tipo === 'CREDITO' ? formatCurrency(Math.abs(conta.saldo)) : formatCurrency(conta.saldo)}
                              </p>
                              {conta.tipo === 'CREDITO' && (
                                <p className="text-[10px] text-gray-400">Limite: {formatCurrency(conta.limite)}</p>
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
      </AnimatePresence>
    </div>
  );
}
