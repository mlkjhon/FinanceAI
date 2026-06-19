import React, { Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Plus, AlertCircle } from 'lucide-react';
import { budgetsApi, categoriesApi } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard, ProgressBar } from '../components/ui';
import { formatCurrency } from '../lib/utils';

export const Route = createFileRoute('/budgets')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: BudgetsPage,
});

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function BudgetsContent() {
  const qc = useQueryClient();
  const now = new Date();
  const [mes, setMes] = React.useState(now.getMonth() + 1);
  const [ano, setAno] = React.useState(now.getFullYear());
  const [showForm, setShowForm] = React.useState(false);
  const [catId, setCatId] = React.useState('');
  const [limite, setLimite] = React.useState('');

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', mes, ano],
    queryFn: budgetsApi.list,
  });

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const createMut = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowForm(false); setCatId(''); setLimite(''); },
  });

  const deleteMut = useMutation({
    mutationFn: budgetsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const filtered = budgets?.filter((b) => b.mes === mes && b.ano === ano) ?? [];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-2xl font-bold text-gray-900 dark:text-white">Orçamentos</h1>
          <p className="text-sm text-gray-500">Controle seus limites de gastos por categoria</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-finance-card-dark)] text-sm">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-finance-card-dark)] text-sm">
            {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white text-sm font-semibold hover:opacity-90"
          >
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="finance-card p-5">
          <h3 className="font-brand font-semibold text-gray-900 dark:text-white mb-4">Criar orçamento</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm">
              <option value="">Selecionar categoria</option>
              {cats?.filter((c) => c.tipo === 'despesa').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input
              type="number" value={limite} onChange={(e) => setLimite(e.target.value)}
              placeholder="Limite (R$)" step="0.01"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm"
            />
            <button
              disabled={!catId || !limite || createMut.isPending}
              onClick={() => createMut.mutate({ categoria_id: catId, valor_limite: Number(limite), mes, ano })}
              className="px-5 py-2.5 rounded-xl gradient-hero text-white text-sm font-semibold disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : filtered.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b, i) => {
            const gasto = b.valor_gasto ?? 0;
            const pct = (gasto / b.valor_limite) * 100;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="finance-card p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-finance-primary)]/10 flex items-center justify-center">
                      <Wallet size={18} className="text-[var(--color-finance-primary)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{b.categoria_nome || 'Categoria'}</p>
                      <p className="text-xs text-gray-400">{MONTHS[b.mes - 1]} {b.ano}</p>
                    </div>
                  </div>
                  {pct >= 90 && <AlertCircle size={18} className="text-[var(--color-finance-error)] shrink-0" />}
                </div>
                <ProgressBar value={gasto} max={b.valor_limite} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Gasto: <strong className="text-gray-900 dark:text-white">{formatCurrency(gasto)}</strong></span>
                  <span>Limite: <strong className="text-gray-900 dark:text-white">{formatCurrency(b.valor_limite)}</strong></span>
                </div>
                <button
                  onClick={() => deleteMut.mutate(b.id)}
                  className="text-xs text-[var(--color-finance-error)] hover:underline"
                >
                  Remover
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="finance-card p-16 text-center">
          <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhum orçamento para {MONTHS[mes - 1]} {ano}</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-[var(--color-finance-primary)] text-sm font-medium hover:underline">
            Criar orçamento
          </button>
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <BudgetsContent />
        </Suspense>
      </div>
    </div>
  );
}
