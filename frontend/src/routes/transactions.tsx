import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import { AnimatePresence, motion } from 'motion/react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { txSchema, type TxForm } from '../lib/schemas/transaction';
import { Plus, Search, X, Loader2 } from '../components/icons';
import { transactionsApi, categoriesApi, subcategoriasApi, type Transaction, type CreateTransaction } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { AnimatedCounter } from '../components/ui';
import { formatCurrency, cn } from '../lib/utils';
import { Segmented } from '../components/segmented';
import { AmountField } from '../components/sheet';
import { deNumero, paraNumero } from '../lib/dinheiro';
import { HoldToDelete } from '../components/hold-to-delete';

export const Route = createFileRoute('/transactions')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: TransactionsPage,
});

const PAGE_SIZE = 30;
type Filtro = 'todas' | 'receita' | 'despesa';

// ---------- Datas ----------

// 'YYYY-MM-DD' da transação, sem passar por Date (evita trocar de dia por fuso)
const diaDe = (tx: Transaction) => (tx.data || tx.created_at || '').slice(0, 10);

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const rotuloDoDia = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Sem data';
  const hoje = hojeISO();
  if (iso === hoje) return 'Hoje';
  if (iso === somarDias(hoje, -1)) return 'Ontem';
  const d = new Date(`${iso}T12:00:00`);
  const mesmoAno = iso.slice(0, 4) === hoje.slice(0, 4);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: mesmoAno ? undefined : 'numeric' })
    .replace(/\./g, '')
    .replace(/^(\w)/, (c) => c.toUpperCase());
};

const sinal = (tx: Transaction) => (tx.tipo === 'receita' ? tx.valor : -tx.valor);

// ---------- Painel de criar / editar ----------

const fieldCls =
  'field w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white text-sm text-[var(--color-ink)]';

function TransactionSheet({ tx, onClose, onSaved }: { tx?: Transaction; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitted }, control, getValues, setValue } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: tx
      ? {
          descricao: tx.descricao,
          valor: tx.valor,
          tipo: tx.tipo,
          id_categoria: tx.id_categoria || '',
          id_subcategoria: tx.id_subcategoria || '',
          data: diaDe(tx),
        }
      : { tipo: 'despesa', data: hojeISO(), valor: 0 },
  });

  // Texto do campo de valor (com pontos de milhar); o número vai para o formulário
  const [valorTexto, setValorTexto] = useState(() => deNumero(tx?.valor));
  useEffect(() => {
    register('valor');
  }, [register]);

  // useWatch (e não watch) para o React Compiler conseguir memorizar o componente
  const tipo = useWatch({ control, name: 'tipo' });
  const id_categoria = useWatch({ control, name: 'id_categoria' });

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: subcats } = useQuery({
    queryKey: ['subcategorias', id_categoria],
    queryFn: () => subcategoriasApi.list(id_categoria),
    enabled: !!id_categoria,
  });

  // Seleciona a primeira subcategoria quando a categoria muda (mantém a da edição)
  useEffect(() => {
    if (!subcats?.length) return;
    if (tx?.id_subcategoria && subcats.some((s) => s.id === tx.id_subcategoria) && getValues('id_subcategoria')) return;
    setValue('id_subcategoria', subcats[0].id);
  }, [subcats, tx?.id_subcategoria, getValues, setValue]);

  const filteredCats = cats?.filter((c) => c.tipo === tipo) ?? [];

  const handleTipoChange = (t: 'receita' | 'despesa') => {
    setValue('tipo', t);
    setValue('id_categoria', '');
    setValue('id_subcategoria', '');
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };
  const createMut = useMutation({ mutationFn: transactionsApi.create, onSuccess: () => { invalidate(); onSaved(); } });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransaction> }) => transactionsApi.update(id, data),
    onSuccess: () => { invalidate(); onSaved(); },
  });
  const deleteMut = useMutation({ mutationFn: transactionsApi.delete, onSuccess: () => { invalidate(); onClose(); } });
  const saveError = createMut.error || updateMut.error || deleteMut.error;

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 h-full">
      <header className="flex items-center justify-between px-6 pt-5 pb-2">
        <Dialog.Title className="font-brand font-bold text-lg text-[var(--color-ink)]">
          {tx ? 'Editar transação' : 'Nova transação'}
        </Dialog.Title>
        <Dialog.Close className="pressable p-2 -mr-2 rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]" aria-label="Fechar">
          <X size={18} />
        </Dialog.Close>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
        <Segmented
          id="tx-sheet-tipo"
          label="Tipo da transação"
          value={tipo}
          onChange={handleTipoChange}
          options={[{ value: 'despesa', label: 'Saída' }, { value: 'receita', label: 'Entrada' }]}
        />

        <AmountField
          id="tx-valor"
          label="Valor"
          value={valorTexto}
          onChange={(t) => {
            setValorTexto(t);
            // o formulário guarda o número; a tela mostra com pontos de milhar
            setValue('valor', (paraNumero(t) ?? 0) as TxForm['valor'], { shouldValidate: isSubmitted });
          }}
          prefixo={tipo === 'receita' ? '+R$' : '-R$'}
          prefixoClasse={tipo === 'receita' ? 'text-gain' : undefined}
          erro={errors.valor?.message}
          autoFocus={!tx}
        />

        <div className="space-y-2">
          <label htmlFor="tx-desc" className="text-sm font-medium text-[var(--color-ink-soft)]">Descrição</label>
          <input id="tx-desc" {...register('descricao')} placeholder="Ex.: mercado da semana" aria-invalid={!!errors.descricao} className={fieldCls} />
          {errors.descricao && <p className="text-xs text-loss">{errors.descricao.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="tx-data" className="text-sm font-medium text-[var(--color-ink-soft)]">Data</label>
          <input id="tx-data" {...register('data')} type="date" className={fieldCls} />
        </div>

        {filteredCats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="tx-cat" className="text-sm font-medium text-[var(--color-ink-soft)]">Categoria</label>
              <select
                id="tx-cat"
                {...register('id_categoria')}
                onChange={(e) => { setValue('id_categoria', e.target.value); setValue('id_subcategoria', ''); }}
                className={fieldCls}
              >
                <option value="">Sem categoria</option>
                {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="tx-sub" className="text-sm font-medium text-[var(--color-ink-soft)]">Subcategoria</label>
              <select id="tx-sub" {...register('id_subcategoria')} disabled={!id_categoria} className={cn(fieldCls, 'disabled:opacity-50')}>
                <option value="">Nenhuma</option>
                {subcats?.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>
        )}

        {saveError && (
          <p role="alert" className="text-sm text-loss">
            Não deu para salvar agora. Confira a conexão e tente de novo.
          </p>
        )}
      </div>

      <footer className="px-6 py-5 border-t border-[var(--color-line)] space-y-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 text-sm">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {tx ? 'Salvar alterações' : 'Registrar'}
        </button>
        {tx && <HoldToDelete pending={deleteMut.isPending} onConfirm={() => deleteMut.mutate(tx.id)} />}
      </footer>
    </form>
  );
}

// ---------- Livro-caixa ----------

/*
 * Saída de uma linha excluída: some e a lista fecha o espaço (200ms ease-out).
 * Frequência: ocasional. Propósito: evitar que as linhas de baixo "pulem".
 * Entrada só para linhas trazidas por "Mostrar mais" (revealIndex definido).
 */
function LedgerRow({ tx, isNew, onOpen, revealIndex }: { tx: Transaction; isNew: boolean; onOpen: () => void; revealIndex?: number }) {
  const income = tx.tipo === 'receita';
  const inicial = (tx.categoria_nome || tx.descricao || '?').trim().charAt(0).toUpperCase();
  return (
    <motion.li
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
      className={cn("overflow-hidden", revealIndex !== undefined && "rise")}
      style={revealIndex !== undefined ? ({ "--i": revealIndex } as React.CSSProperties) : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn('ledger-row w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 text-left', isNew && 'row-new')}
      >
        <span
          aria-hidden
          className={cn(
            'w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center text-sm font-semibold font-brand',
            income ? 'bg-gain-soft text-gain' : 'bg-[var(--color-ink)]/[0.05] text-[var(--color-ink-soft)]'
          )}
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-[var(--color-ink)] truncate" title={tx.descricao}>{tx.descricao}</span>
          <span className="block text-xs mt-0.5 truncate text-[var(--color-ink-muted)]">
            {tx.categoria_nome || 'Sem categoria'}
          </span>
        </span>
        <span data-num className={cn('shrink-0 text-sm font-semibold', income ? 'text-gain' : 'text-[var(--color-ink)]')}>
          {income ? '+' : '-'}{formatCurrency(tx.valor)}
        </span>
      </button>
    </motion.li>
  );
}

function LedgerSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Carregando transações">
      {[3, 2].map((n, g) => (
        <div key={g}>
          <span className="media-frame block h-3 w-24 rounded-full mb-3" data-loading="" />
          <div className="finance-card divide-y divide-[var(--color-line)]">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <span className="media-frame block w-9 h-9 rounded-[10px]" data-loading="" />
                <span className="flex-1 space-y-2">
                  <span className="media-frame block h-3 w-1/2 rounded-full" data-loading="" />
                  <span className="media-frame block h-2.5 w-1/4 rounded-full" data-loading="" />
                </span>
                <span className="media-frame block h-3 w-20 rounded-full" data-loading="" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthSummary({ all }: { all: Transaction[] }) {
  const mes = hojeISO().slice(0, 7);
  const doMes = all.filter((t) => diaDe(t).startsWith(mes));
  const entrou = doMes.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const saiu = doMes.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  const resultado = entrou - saiu;
  const nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="border-y border-[var(--color-line)] py-4">
    <p className="text-xs text-[var(--color-ink-muted)] mb-3 first-letter:uppercase">{nomeMes} até agora</p>
    <dl className="grid grid-cols-3 divide-x divide-[var(--color-line)]">
      <div className="pr-4">
        <dt className="metric-label">Entrou</dt>
        <dd><AnimatedCounter value={entrou} isCurrency className="mt-1 block text-lg sm:text-2xl text-gain" /></dd>
      </div>
      <div className="px-4">
        <dt className="metric-label">Saiu</dt>
        <dd><AnimatedCounter value={saiu} isCurrency className="mt-1 block text-lg sm:text-2xl text-[var(--color-ink)]" /></dd>
      </div>
      <div className="pl-4">
        <dt className="metric-label">Resultado</dt>
        <dd className={cn('mt-1 font-brand font-bold tracking-tight text-lg sm:text-2xl', resultado < 0 ? 'text-loss' : 'text-[var(--color-ink)]')} data-num>
          {resultado < 0 ? '-' : resultado > 0 ? '+' : ''}{formatCurrency(Math.abs(resultado))}
        </dd>
      </div>
    </dl>
    </div>
  );
}

function TransactionsContent() {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [revealFrom, setRevealFrom] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string> | null>(null);
  const expectNew = useRef(false);

  // A API já devolve tudo; filtro, busca e agrupamento são feitos aqui
  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => transactionsApi.list({ limit: '100000' }),
  });
  const all = useMemo(() => data?.data ?? [], [data]);

  // Destaca a linha que apareceu depois de salvar uma transação nova
  useEffect(() => {
    if (!data) return;
    const ids = new Set(all.map((t) => t.id));
    if (knownIds.current && expectNew.current) {
      const fresh = all.filter((t) => !knownIds.current!.has(t.id)).map((t) => t.id);
      if (fresh.length) {
        setNewIds(new Set(fresh));
        expectNew.current = false;
        const t = setTimeout(() => setNewIds(new Set()), 1700);
        knownIds.current = ids;
        return () => clearTimeout(t);
      }
    }
    knownIds.current = ids;
  }, [data, all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((t) => filtro === 'todas' || t.tipo === filtro)
      .filter((t) => !q || t.descricao.toLowerCase().includes(q) || (t.categoria_nome || '').toLowerCase().includes(q))
      .sort((a, b) => diaDe(b).localeCompare(diaDe(a)) || Number(b.id) - Number(a.id));
  }, [all, filtro, search]);

  const groups = useMemo(() => {
    const out: { dia: string; items: (Transaction & { _idx: number })[]; total: number }[] = [];
    for (const [idx, raw] of filtered.slice(0, visible).entries()) {
      const tx = { ...raw, _idx: idx };
      const dia = diaDe(tx);
      const last = out[out.length - 1];
      if (last && last.dia === dia) { last.items.push(tx); last.total += sinal(tx); }
      else out.push({ dia, items: [tx], total: sinal(tx) });
    }
    return out;
  }, [filtered, visible]);

  const openNew = () => { setEditTx(undefined); setSheetOpen(true); };
  const openEdit = (tx: Transaction) => { setEditTx(tx); setSheetOpen(true); };

  const count = filtered.length;

  return (
    <div className="pb-16">
      <div className="stagger space-y-6">
        <header className="flex items-end justify-between gap-4">
          <h1 className="font-brand text-3xl font-bold tracking-tight text-[var(--color-ink)]">Transações</h1>
          <button onClick={openNew} className="btn-primary px-5 py-2.5 text-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Nova transação</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4 border-y border-[var(--color-line)] py-4">
            {[0, 1, 2].map((i) => <span key={i} className="media-frame block h-10 rounded-lg" data-loading="" />)}
          </div>
        ) : (
          <MonthSummary all={all} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <Segmented
            id="tx-filter"
            label="Filtrar por tipo"
            value={filtro}
            onChange={(v) => { setFiltro(v); setVisible(PAGE_SIZE); setRevealFrom(null); }}
            options={[{ value: 'todas', label: 'Todas' }, { value: 'receita', label: 'Entradas' }, { value: 'despesa', label: 'Saídas' }]}
          />
          <div className="relative sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); setRevealFrom(null); }}
              placeholder="Buscar por descrição ou categoria"
              aria-label="Buscar transações"
              className="field w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--color-line)] bg-white text-sm"
            />
          </div>
        </div>

        <section aria-live="polite">
          {isLoading ? (
            <LedgerSkeleton />
          ) : isError ? (
            <div className="finance-card px-6 py-10 max-w-xl">
              <p className="font-semibold text-[var(--color-ink)]">Não foi possível carregar suas transações.</p>
              <p className="text-sm text-[var(--color-ink-muted)] mt-1">Verifique a conexão e recarregue a página.</p>
            </div>
          ) : all.length === 0 ? (
            <div className="finance-card px-6 py-12 flex flex-col items-start gap-3 max-w-xl">
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">Seu livro-caixa está vazio</h2>
              <p className="text-sm text-[var(--color-ink-muted)] max-w-[44ch]">
                Registre o que entra e o que sai. Os gráficos do painel e as dicas da IA começam a funcionar a partir daí.
              </p>
              <button onClick={openNew} className="btn-primary px-5 py-2.5 text-sm mt-2">
                <Plus size={16} /> Registrar a primeira
              </button>
            </div>
          ) : count === 0 ? (
            <div className="py-10">
              <p className="text-[var(--color-ink)] font-medium">
                Nada encontrado{search ? <> para <q>{search}</q></> : ''}.
              </p>
              <button
                onClick={() => { setSearch(''); setFiltro('todas'); }}
                className="link-line mt-2 text-sm font-medium text-[var(--color-accent)]"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--color-ink-muted)] mb-4" data-num>
                {count === 1 ? '1 transação' : `${count.toLocaleString('pt-BR')} transações`}
              </p>
              {/*
                Troca de filtro: crossfade de 180ms com ponte de blur. Dezenas por dia,
                então é curta. A busca não anima (digitar é ação de teclado).
              */}
              <div key={filtro} className="list-swap space-y-7">
                {groups.map((g) => (
                  <section key={g.dia} aria-label={rotuloDoDia(g.dia)}>
                    <div className="sticky top-16 z-[1] -mx-1 px-1 py-2 flex items-baseline justify-between app-surface">
                      <h2 className="text-sm font-semibold text-[var(--color-ink)]">{rotuloDoDia(g.dia)}</h2>
                      <span data-num className={cn('text-xs font-medium', g.total >= 0 ? 'text-gain' : 'text-[var(--color-ink-muted)]')}>
                        {g.total >= 0 ? '+' : '-'}{formatCurrency(Math.abs(g.total))}
                      </span>
                    </div>
                    <ul className="finance-card overflow-hidden divide-y divide-[var(--color-line)]">
                      <AnimatePresence initial={false}>
                        {g.items.map((tx) => (
                          <LedgerRow
                            key={tx.id}
                            tx={tx}
                            isNew={newIds.has(tx.id)}
                            onOpen={() => openEdit(tx)}
                            revealIndex={revealFrom !== null && tx._idx >= revealFrom ? Math.min(tx._idx - revealFrom, 8) : undefined}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </section>
                ))}
              </div>
              {visible < count && (
                <button
                  onClick={() => { setRevealFrom(visible); setVisible((v) => v + PAGE_SIZE); }}
                  className="pressable mt-8 mx-auto block rounded-full border border-[var(--color-line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-ink-soft)]"
                >
                  Mostrar mais {Math.min(PAGE_SIZE, count - visible)}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="sheet-backdrop" />
          <Dialog.Popup className="sheet">
            <TransactionSheet
              key={editTx?.id ?? 'new'}
              tx={editTx}
              onClose={() => setSheetOpen(false)}
              onSaved={() => { if (!editTx) expectNew.current = true; setSheetOpen(false); }}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function TransactionsPage() {
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Suspense fallback={<LedgerSkeleton />}>
          <TransactionsContent />
        </Suspense>
      </main>
    </div>
  );
}
