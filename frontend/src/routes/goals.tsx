import React, { Suspense } from 'react';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Calendar, PiggyBank, ArrowRight } from '../components/icons';
import { goalsApi, type CreateGoal } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { AnimatedCounter, SkeletonCard } from '../components/ui';
import { Sheet, AmountField, Campo } from '../components/sheet';
import { MoneyInput } from '../components/money-input';
import { campoClasse } from '../lib/classes';
import { deNumero, paraNumero } from '../lib/dinheiro';
import { HoldToDelete } from '../components/hold-to-delete';
import { formatCurrency, formatDate } from '../lib/utils';
import { ProgressRing } from '../components/ConicChart';

export const Route = createFileRoute('/goals')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: GoalsPage,
});

// Componente do progresso circular (anel verde)
function CircularProgress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);

  return (
    <ProgressRing pct={pct} className="w-28 h-28 mx-auto">
      <span className="font-brand font-bold text-lg text-[var(--color-ink)]"><AnimatedCounter value={pct} className="text-inherit" />%</span>
    </ProgressRing>
  );
}

function GoalsContent() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const formVazio = { nome: '', valor_meta: '', valor_atual: '', data_alvo: '', descricao: '' };
  const [form, setForm] = React.useState(formVazio);
  const [tentou, setTentou] = React.useState(false);

  // Painel de depósito: a meta continua guardada enquanto o painel faz a animação de saída
  type MetaResumo = { id: string; nome: string; valor_meta: number; valor_atual: number };
  const [depositoAberto, setDepositoAberto] = React.useState(false);
  const [metaDeposito, setMetaDeposito] = React.useState<MetaResumo | null>(null);
  const [valorDeposito, setValorDeposito] = React.useState('');
  const abrirDeposito = (m: MetaResumo) => {
    setMetaDeposito(m);
    setValorDeposito('');
    setDepositoAberto(true);
  };

  const { data: goals, isLoading } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list });

  // Mutation para criar nova meta
  const createMut = useMutation({
    mutationFn: (d: CreateGoal) => goalsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setForm(formVazio);
      setTentou(false);
    },
  });

  // Mutation para deletar meta
  const deleteMut = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  // Mutation para adicionar dinheiro à meta
  const depositoMut = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: number }) => goalsApi.adicionarDinheiro(id, valor),
    onSuccess: () => {
      // Recarrega as metas E o dashboard (pois o saldo vai mudar)
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setDepositoAberto(false);
    },
  });

  const valorMeta = paraNumero(form.valor_meta);
  const criarMeta = () => {
    setTentou(true);
    if (!form.nome.trim() || !valorMeta) return;
    createMut.mutate({
      nome: form.nome.trim(),
      valor_meta: valorMeta,
      valor_atual: paraNumero(form.valor_atual) ?? 0,
      data_alvo: form.data_alvo || undefined,
      descricao: form.descricao || undefined,
    });
  };

  const valorDep = paraNumero(valorDeposito);
  const faltaDeposito = metaDeposito ? Math.max(metaDeposito.valor_meta - metaDeposito.valor_atual, 0) : 0;
  const depositar = () => {
    if (!metaDeposito || !valorDep) return;
    depositoMut.mutate({ id: metaDeposito.id, valor: valorDep });
  };

  return (
    <div className="stagger space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand font-bold text-3xl tracking-tight text-[var(--color-ink)]">Metas</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {/* Nova meta: mesmo painel da nova transação */}
      <Sheet
        open={showForm}
        onOpenChange={setShowForm}
        title="Nova meta"
        onSubmit={criarMeta}
        footer={
          <button type="submit" disabled={createMut.isPending} className="btn-primary w-full py-3.5 text-sm disabled:opacity-60">
            {createMut.isPending && <span className="spinner" aria-hidden />}
            Criar meta
          </button>
        }
      >
        <AmountField
          id="meta-valor"
          label="Quanto você quer juntar"
          value={form.valor_meta}
          onChange={(t) => setForm((f) => ({ ...f, valor_meta: t }))}
          erro={tentou && !valorMeta ? 'Informe um valor maior que zero' : undefined}
          autoFocus
        />
        <Campo id="meta-nome" label="Nome da meta">
          <input
            id="meta-nome"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Ex.: viagem para o Chile"
            aria-invalid={tentou && !form.nome.trim()}
            className={campoClasse}
          />
        </Campo>
        {tentou && !form.nome.trim() && <p className="-mt-4 text-xs text-loss">Dê um nome para a meta</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo id="meta-atual" label="Já tenho guardado">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">R$</span>
              <MoneyInput
                id="meta-atual"
                value={form.valor_atual}
                onValueChange={(t) => setForm((f) => ({ ...f, valor_atual: t }))}
                placeholder="0,00"
                className={campoClasse + ' pl-10'}
              />
            </div>
          </Campo>
          <Campo id="meta-data" label="Até quando (opcional)">
            <input id="meta-data" type="date" value={form.data_alvo} onChange={(e) => setForm((f) => ({ ...f, data_alvo: e.target.value }))} className={campoClasse} />
          </Campo>
        </div>
        <Campo id="meta-desc" label="Descrição (opcional)">
          <input id="meta-desc" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex.: passagens e hospedagem" className={campoClasse} />
        </Campo>
        {createMut.isError && <p role="alert" className="text-sm text-loss">Não deu para criar a meta. Tente de novo.</p>}
      </Sheet>

      {/* Lista de metas */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : goals?.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((g, i) => (
            <div
              key={g.id}
              style={{ "--i": i } as React.CSSProperties}
              className="rise finance-card p-5 space-y-4"
            >
              {/* Título e ícone */}
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <Link to="/goals/$id" params={{ id: g.id }} className="font-semibold text-gray-900 hover:text-[var(--color-accent)] transition-colors duration-150">
                    {g.nome}
                  </Link>
                  {g.descricao && <p className="text-xs text-gray-400 mt-0.5">{g.descricao}</p>}
                </div>
                {g.valor_atual >= g.valor_meta ? (
                  <span className="pop-in shrink-0 rounded-md bg-gain-soft px-2 py-0.5 text-xs font-semibold text-gain">Concluída</span>
                ) : (
                  <Target size={18} className="text-[var(--color-ink-muted)] shrink-0" />
                )}
              </div>

              {/* Progresso circular */}
              <CircularProgress value={g.valor_atual} max={g.valor_meta} />

              {/* Valores */}
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(g.valor_atual)} <span className="text-gray-400 font-normal text-xs">de</span> {formatCurrency(g.valor_meta)}
                </p>
                <p className="text-xs text-gain">
                  Falta: {formatCurrency(Math.max(g.valor_meta - g.valor_atual, 0))}
                </p>
              </div>

              {/* Data alvo */}
              {g.data_alvo && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 justify-center">
                  <Calendar size={12} />
                  <span>Meta para {formatDate(g.data_alvo)}</span>
                </div>
              )}

              <Link
                to="/goals/$id"
                params={{ id: g.id }}
                className="group flex items-center justify-center gap-1 text-xs font-medium text-[var(--color-accent)]"
              >
                <span className="link-line">Ver detalhes e histórico</span>
                <span className="arrow-nudge"><ArrowRight size={12} /></span>
              </Link>

              {/* Botões de ação */}
              <div className="flex gap-2 pt-1">
                {/* Botão: adicionar dinheiro à meta */}
                <button
                  onClick={() => abrirDeposito({ id: g.id, nome: g.nome, valor_meta: g.valor_meta, valor_atual: g.valor_atual })}
                  className="flex-1 py-2 rounded-full bg-gain-soft text-gain text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <PiggyBank size={13} /> Depositar
                </button>
                {/* Botão: remover meta */}
                <HoldToDelete compact label="Segure para remover" pending={deleteMut.isPending && deleteMut.variables === g.id} onConfirm={() => deleteMut.mutate(g.id)} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="finance-card p-16 text-center">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma meta criada ainda</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-gain text-sm font-medium hover:underline">
            Criar primeira meta
          </button>
        </div>
      )}

      {/* Depositar: mesmo painel, com o progresso da meta */}
      <Sheet
        open={depositoAberto}
        onOpenChange={setDepositoAberto}
        title={metaDeposito ? 'Depositar em ' + metaDeposito.nome : 'Depositar'}
        onSubmit={depositar}
        footer={
          <button type="submit" disabled={depositoMut.isPending || !valorDep} className="btn-primary w-full py-3.5 text-sm disabled:opacity-60">
            {depositoMut.isPending ? <span className="spinner" aria-hidden /> : <PiggyBank size={16} />}
            {valorDep ? 'Depositar ' + formatCurrency(valorDep) : 'Depositar'}
          </button>
        }
      >
        {metaDeposito && (
          <>
            <div className="rounded-xl bg-[var(--color-surface)] p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-[var(--color-ink-muted)]">Guardado</p>
                <p className="font-semibold text-[var(--color-ink)]" data-num>
                  {formatCurrency(metaDeposito.valor_atual)} de {formatCurrency(metaDeposito.valor_meta)}
                </p>
              </div>
              {faltaDeposito > 0 && (
                <button
                  type="button"
                  onClick={() => setValorDeposito(deNumero(faltaDeposito))}
                  className="shrink-0 rounded-full bg-gain-soft px-3 py-1.5 text-xs font-semibold text-gain"
                >
                  Completar a meta ({formatCurrency(faltaDeposito)})
                </button>
              )}
            </div>
            <AmountField id="dep-valor" label="Valor do depósito" value={valorDeposito} onChange={setValorDeposito} autoFocus />
            <p className="text-xs text-[var(--color-ink-muted)]">O valor sai do seu saldo e entra na meta.</p>
            {depositoMut.isError && <p role="alert" className="text-sm text-loss">Não deu para depositar. Tente de novo.</p>}
          </>
        )}
      </Sheet>
    </div>
  );
}

function GoalsPage() {
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <GoalsContent />
        </Suspense>
      </div>
    </div>
  );
}
