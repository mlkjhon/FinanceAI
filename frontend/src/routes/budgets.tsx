import React, { Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, AlertCircle } from '../components/icons';
import { budgetsApi, categoriesApi, transactionsApi } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { AnimatedCounter, SkeletonCard, ProgressBar } from '../components/ui';
import { Sheet, AmountField, Campo } from '../components/sheet';
import { campoClasse } from '../lib/classes';
import { deNumero, paraNumero } from '../lib/dinheiro';
import { HoldToDelete } from '../components/hold-to-delete';
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
  const [tentou, setTentou] = React.useState(false);

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', mes, ano],
    queryFn: budgetsApi.list,
  });

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  // mesma consulta da tela de transações (já fica em cache)
  const { data: txs } = useQuery({ queryKey: ['transactions', 'all'], queryFn: () => transactionsApi.list({ limit: '100000' }), enabled: showForm });

  const createMut = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowForm(false); setCatId(''); setLimite(''); setTentou(false); },
  });

  const deleteMut = useMutation({
    mutationFn: budgetsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const filtered = budgets?.filter((b) => b.mes === mes && b.ano === ano) ?? [];
  // só categorias de despesa que ainda não têm orçamento no mês escolhido
  const jaTem = new Set(filtered.map((b) => b.categoria_id));
  const categoriasLivres = cats?.filter((c) => c.tipo === 'despesa' && !jaTem.has(c.id)) ?? [];
  const valorLimite = paraNumero(limite);
  // média de gasto da categoria nos 3 meses completos antes do mês escolhido (referência para o limite)
  const nomeCat = cats?.find((c) => c.id === catId)?.nome;
  const mediaCategoria = (() => {
    if (!nomeCat || !txs) return null;
    const meses = [1, 2, 3].map((k) => {
      const d = new Date(ano, mes - 1 - k, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const total = txs.data
      .filter((t) => t.tipo === 'despesa' && t.categoria_nome === nomeCat && meses.includes((t.data || '').slice(0, 7)))
      .reduce((soma, t) => soma + t.valor, 0);
    return total > 0 ? Math.round((total / 3) * 100) / 100 : null;
  })();
  const salvar = () => {
    setTentou(true);
    if (!catId || !valorLimite) return;
    createMut.mutate({ categoria_id: catId, valor_limite: valorLimite, mes, ano });
  };

  return (
    <div className="stagger space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-sm text-gray-500">Controle seus limites de gastos por categoria</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm">
            {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      <Sheet
        open={showForm}
        onOpenChange={setShowForm}
        title="Novo orçamento"
        onSubmit={salvar}
        footer={
          <button type="submit" disabled={createMut.isPending} className="btn-primary w-full py-3.5 text-sm disabled:opacity-60">
            {createMut.isPending && <span className="spinner" aria-hidden />}
            Criar orçamento
          </button>
        }
      >
        <p className="text-sm text-[var(--color-ink-muted)]">Para {MONTHS[mes - 1].toLowerCase()} de {ano}</p>
        <AmountField
          id="orc-limite"
          label="Limite para o mês"
          value={limite}
          onChange={setLimite}
          erro={tentou && !valorLimite ? 'Informe um limite maior que zero' : undefined}
          autoFocus
        />
        <Campo id="orc-cat" label="Categoria" ajuda={categoriasLivres.length ? undefined : 'Todas as categorias de despesa já têm orçamento neste mês.'}>
          <select id="orc-cat" value={catId} onChange={(e) => setCatId(e.target.value)} aria-invalid={tentou && !catId} className={campoClasse}>
            <option value="">Escolha a categoria</option>
            {categoriasLivres.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        {tentou && !catId && <p className="-mt-4 text-xs text-loss">Escolha uma categoria</p>}
        {mediaCategoria != null && (
          <div className="rise flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface)] px-4 py-3 text-sm">
            <span className="text-[var(--color-ink-muted)]">
              Você gasta em média <strong className="text-[var(--color-ink)]" data-num>{formatCurrency(mediaCategoria)}</strong> por mês com {nomeCat}
            </span>
            <button type="button" onClick={() => setLimite(deNumero(mediaCategoria))} className="shrink-0 text-sm font-medium text-[var(--color-accent)]">
              Usar
            </button>
          </div>
        )}
        {createMut.isError && <p role="alert" className="text-sm text-loss">Não deu para criar o orçamento. Tente de novo.</p>}
      </Sheet>

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
              <div
                key={b.id}
                style={{ "--i": i } as React.CSSProperties}
                className="rise finance-card p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{b.categoria_nome || 'Categoria'}</p>
                      <p className="text-xs text-gray-400">{MONTHS[b.mes - 1]} {b.ano}</p>
                    </div>
                  </div>
                  {pct >= 90 && <AlertCircle size={18} className="text-[var(--color-finance-error)] shrink-0" />}
                </div>
                <ProgressBar value={gasto} max={b.valor_limite} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Gasto: <AnimatedCounter value={gasto} isCurrency className="text-sm text-[var(--color-ink)]" /></span>
                  <span>Limite: <strong className="text-gray-900">{formatCurrency(b.valor_limite)}</strong></span>
                </div>
                <HoldToDelete compact label="Segure para remover" pending={deleteMut.isPending && deleteMut.variables === b.id} onConfirm={() => deleteMut.mutate(b.id)} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="finance-card p-16 text-center">
          <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhum orçamento para {MONTHS[mes - 1]} {ano}</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-[var(--color-accent)] text-sm font-medium hover:underline">
            Criar orçamento
          </button>
        </div>
      )}
    </div>
  );
}

function BudgetsPage() {
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <BudgetsContent />
        </Suspense>
      </div>
    </div>
  );
}
