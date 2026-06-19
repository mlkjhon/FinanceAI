import React, { Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Calendar, PiggyBank, X, Check } from 'lucide-react';
import { goalsApi } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/utils';

export const Route = createFileRoute('/goals')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: GoalsPage,
});

// Componente do progresso circular (anel verde)
function CircularProgress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Círculo de fundo (cinza claro) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        {/* Círculo de progresso (verde) */}
        <motion.circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="#10B981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          initial={{ strokeDasharray: '0 251' }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {/* Percentual no centro */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-sm text-green-600">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// Modal para adicionar dinheiro a uma meta
function ModalDeposito({
  meta,
  onClose,
  onConfirm,
  isLoading,
}: {
  meta: { id: string; nome: string; valor_meta: number; valor_atual: number };
  onClose: () => void;
  onConfirm: (valor: number) => void;
  isLoading: boolean;
}) {
  const [valor, setValor] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(valor);
    if (!isNaN(num) && num > 0) onConfirm(num);
  };

  return (
    // Fundo escurecido ao redor do modal
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5"
      >
        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <PiggyBank size={16} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Adicionar à meta</h3>
              <p className="text-xs text-gray-400">{meta.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Progresso atual da meta */}
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Progresso atual</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(meta.valor_atual)} <span className="text-gray-400 font-normal text-xs">de</span> {formatCurrency(meta.valor_meta)}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Valor a depositar (R$)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 150,00"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
            <p className="text-xs text-gray-400">⚠️ Esse valor será descontado automaticamente do seu saldo total.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !valor || parseFloat(valor) <= 0}
              className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <><Check size={15} /> Confirmar</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function GoalsContent() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ nome: '', valor_meta: '', valor_atual: '', data_alvo: '', descricao: '' });

  // Estado para controlar qual meta está com o modal de depósito aberto
  const [metaDeposito, setMetaDeposito] = React.useState<null | {
    id: string; nome: string; valor_meta: number; valor_atual: number;
  }>(null);

  const { data: goals, isLoading } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list });

  // Mutation para criar nova meta
  const createMut = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setForm({ nome: '', valor_meta: '', valor_atual: '', data_alvo: '', descricao: '' });
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
      setMetaDeposito(null);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      nome: form.nome,
      valor_meta: Number(form.valor_meta),
      valor_atual: Number(form.valor_atual) || 0,
      data_alvo: form.data_alvo || undefined,
      descricao: form.descricao || undefined,
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Metas Financeiras</h1>
          <p className="text-sm text-gray-500">Defina e acompanhe seus objetivos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow"
        >
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {/* Formulário de criação de meta */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="finance-card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Criar nova meta</h3>
          <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3">
            {[
              { label: 'Nome da meta', key: 'nome', placeholder: 'Ex: Viagem para o Japão', type: 'text' },
              { label: 'Valor da meta (R$)', key: 'valor_meta', placeholder: '10000', type: 'number' },
              { label: 'Valor inicial (R$)', key: 'valor_atual', placeholder: '0', type: 'number' },
              { label: 'Data alvo', key: 'data_alvo', placeholder: '', type: 'date' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                placeholder="Adicione detalhes sobre sua meta"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">Cancelar</button>
              <button type="submit" disabled={createMut.isPending || !form.nome || !form.valor_meta} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors">
                Criar meta
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Lista de metas */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : goals?.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="finance-card p-5 space-y-4"
            >
              {/* Título e ícone */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{g.nome}</p>
                  {g.descricao && <p className="text-xs text-gray-400 mt-0.5">{g.descricao}</p>}
                </div>
                <Target size={18} className="text-green-500 shrink-0" />
              </div>

              {/* Progresso circular */}
              <CircularProgress value={g.valor_atual} max={g.valor_meta} />

              {/* Valores */}
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(g.valor_atual)} <span className="text-gray-400 font-normal text-xs">de</span> {formatCurrency(g.valor_meta)}
                </p>
                <p className="text-xs text-green-500">
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

              {/* Botões de ação */}
              <div className="flex gap-2 pt-1">
                {/* Botão: adicionar dinheiro à meta */}
                <button
                  onClick={() => setMetaDeposito({ id: g.id, nome: g.nome, valor_meta: g.valor_atual, valor_atual: g.valor_atual })}
                  className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 text-xs font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                >
                  <PiggyBank size={13} /> Depositar
                </button>
                {/* Botão: remover meta */}
                <button
                  onClick={() => deleteMut.mutate(g.id)}
                  className="flex-1 py-2 rounded-xl bg-red-50 text-red-400 text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="finance-card p-16 text-center">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma meta criada ainda</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-green-500 text-sm font-medium hover:underline">
            Criar primeira meta
          </button>
        </div>
      )}

      {/* Modal de depósito (aparece por cima quando clicar em depositar) */}
      <AnimatePresence>
        {metaDeposito && (
          <ModalDeposito
            meta={metaDeposito}
            onClose={() => setMetaDeposito(null)}
            onConfirm={(valor) => depositoMut.mutate({ id: metaDeposito.id, valor })}
            isLoading={depositoMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GoalsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <GoalsContent />
        </Suspense>
      </div>
    </div>
  );
}
