import { useState, useEffect, Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Trash2, Edit2, X, Loader2, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { transactionsApi, categoriesApi, subcategoriasApi, type Transaction, type CreateTransaction } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { SkeletonCard, Badge } from '../components/ui';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export const Route = createFileRoute('/transactions')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: TransactionsPage,
});

const txSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  tipo: z.enum(['receita', 'despesa']),
  id_categoria: z.string().optional(),
  id_subcategoria: z.string().optional(),
  data: z.string().optional(),
});

type TxForm = z.infer<typeof txSchema>;

function TransactionModal({ tx, onClose }: { tx?: Transaction; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: tx ? {
      descricao: tx.descricao,
      valor: tx.valor,
      tipo: tx.tipo,
      id_categoria: tx.id_categoria || '',
      id_subcategoria: tx.id_subcategoria || '',
      data: tx.data?.split('T')[0],
    } : { tipo: 'despesa' },
  });

  const tipo = watch('tipo');
  const id_categoria = watch('id_categoria');

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: subcats } = useQuery({
    queryKey: ['subcategorias', id_categoria],
    queryFn: () => subcategoriasApi.list(id_categoria),
    enabled: !!id_categoria,
  } as any);

  // Auto-seleciona a subcategoria padrão quando a categoria é escolhida
  useEffect(() => {
    const list = subcats as Array<{ id: string }> | undefined;
    if (list && list.length > 0) {
      setValue('id_subcategoria', list[0].id);
    }
  }, [subcats]);

  const filteredCats = cats?.filter((c) => c.tipo === tipo) ?? [];

  // Quando o tipo muda, limpa a categoria e subcategoria
  const handleTipoChange = (t: 'receita' | 'despesa') => {
    setValue('tipo', t);
    setValue('id_categoria', '');
    setValue('id_subcategoria', '');
  };

  // Quando a categoria muda, limpa a subcategoria (o useEffect acima vai auto-selecionar)
  const handleCatChange = (catId: string) => {
    setValue('id_categoria', catId);
    setValue('id_subcategoria', '');
  };

  const createMut = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard-summary'] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransaction> }) => transactionsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard-summary'] }); onClose(); },
  });

  const onSubmit = async (data: TxForm) => {
    const payload: CreateTransaction = {
      descricao: data.descricao,
      valor: data.valor,
      tipo: data.tipo,
      id_categoria: data.id_categoria || undefined,
      id_subcategoria: data.id_subcategoria || undefined,
      data: data.data || undefined,
    };
    if (tx) await updateMut.mutateAsync({ id: tx.id, data: payload });
    else await createMut.mutateAsync(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[var(--color-finance-card-dark)] rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-brand font-bold text-lg text-gray-900 dark:text-white">
            {tx ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo toggle */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            {(['despesa', 'receita'] as const).map((t) => (
              <label key={t} className="flex-1">
                <input type="radio" value={t} {...register('tipo')} className="sr-only"
                  onChange={() => handleTipoChange(t)} />
                <span className={cn(
                  'block text-center py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all',
                  tipo === t
                    ? t === 'receita' ? 'bg-[var(--color-finance-success)] text-white' : 'bg-[var(--color-finance-error)] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                )}>
                  {t === 'receita' ? '+ Receita' : '- Despesa'}
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <input {...register('descricao')} placeholder="Ex: Almoço no restaurante" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm outline-none focus:border-[var(--color-finance-primary)] focus:ring-2 focus:ring-[var(--color-finance-primary)]/20" />
            {errors.descricao && <p className="text-xs text-[var(--color-finance-error)]">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
              <input {...register('valor')} type="number" step="0.01" placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm outline-none focus:border-[var(--color-finance-primary)] focus:ring-2 focus:ring-[var(--color-finance-primary)]/20" />
              {errors.valor && <p className="text-xs text-[var(--color-finance-error)]">{errors.valor.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
              <input {...register('data')} type="date" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm outline-none focus:border-[var(--color-finance-primary)] focus:ring-2 focus:ring-[var(--color-finance-primary)]/20" />
            </div>
          </div>

          {/* Categoria - auto-seleciona subcategoria ao escolher */}
          {filteredCats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                <select {...register('id_categoria')} onChange={(e) => handleCatChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm outline-none focus:border-[var(--color-finance-primary)]">
                  <option value="">Selecione uma categoria</option>
                  {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subcategoria</label>
                  <select {...register('id_subcategoria')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm outline-none focus:border-[var(--color-finance-primary)]">
                    <option value="">Selecione...</option>
                    {(subcats ?? []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
             
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {tx ? 'Salvar alterações' : 'Registrar transação'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function TransactionsContent() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page: String(page), busca: search, tipo }],
    queryFn: () => transactionsApi.list({ page: String(page), limit: '10', busca: search || undefined, tipo: tipo || undefined }),
  });

  const deleteMut = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-2xl font-bold text-gray-900 dark:text-white">Transações</h1>
          <p className="text-sm text-gray-500">Gerencie suas receitas e despesas</p>
        </div>
        <button
          onClick={() => { setEditTx(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-hero text-white text-sm font-semibold hover:opacity-90 shadow shadow-[var(--color-finance-primary)]/30"
        >
          <Plus size={16} /> Nova transação
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar transações..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-finance-card-dark)] text-sm outline-none focus:border-[var(--color-finance-primary)]"
          />
        </div>
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-finance-card-dark)] text-sm outline-none focus:border-[var(--color-finance-primary)]"
        >
          <option value="">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
      </div>

      {/* Table */}
      <div className="finance-card overflow-hidden">
        {isLoading ? (
          <SkeletonCard lines={5} className="border-0 shadow-none" />
        ) : data?.data.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-black/10">
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Categoria</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{tx.descricao}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          label={tx.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          variant={tx.tipo === 'receita' ? 'success' : 'error'}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{tx.categoria_nome || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(tx.data)}</td>
                      <td className={`px-5 py-3.5 text-right font-brand font-semibold text-sm ${tx.tipo === 'receita' ? 'text-[var(--color-finance-success)]' : 'text-[var(--color-finance-error)]'}`}>
                        {tx.tipo === 'despesa' ? '-' : '+'}{formatCurrency(tx.valor)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setEditTx(tx); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-[var(--color-finance-primary)]/10 text-gray-400 hover:text-[var(--color-finance-primary)] transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteId(tx.id)} className="p-1.5 rounded-lg hover:bg-[var(--color-finance-error)]/10 text-gray-400 hover:text-[var(--color-finance-error)] transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 dark:border-gray-800">
                <p className="text-xs text-gray-500">
                  {((page - 1) * 10) + 1}–{Math.min(page * 10, data.total)} de {data.total}
                </p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40">
                    <ChevronLeft size={16} />
                  </button>
                  <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma transação encontrada</p>
            <button onClick={() => setShowModal(true)} className="mt-4 text-[var(--color-finance-primary)] text-sm font-medium hover:underline">
              Adicionar primeira transação
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[var(--color-finance-card-dark)] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-finance-error)]/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-[var(--color-finance-error)]" />
              </div>
              <h3 className="font-brand font-bold text-lg text-gray-900 dark:text-white mb-2">Excluir transação?</h3>
              <p className="text-sm text-gray-500 mb-6">Essa ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMut.mutate(deleteId)}
                  disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-finance-error)] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {deleteMut.isPending && <Loader2 size={14} className="animate-spin" />}
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <TransactionModal tx={editTx} onClose={() => { setShowModal(false); setEditTx(undefined); }} />}
      </AnimatePresence>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={5} />}>
          <TransactionsContent />
        </Suspense>
      </div>
    </div>
  );
}
