import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { AnimatedCounter, SkeletonCard } from '../../components/ui';
import { investimentosApi } from '../../lib/api';
import { formatCurrency, descreverTaxa } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { modal, backdrop } from '../../lib/motion-tokens';
import { Plus, ArrowRight, X } from '../../components/icons';
import { TaxaPreview } from '../../components/investimentos/taxa-preview';
import { INDEXADORES, SUGESTAO_POR_TIPO, exemploTaxa, nomeIndexador, rotuloTaxa } from '../../lib/investimentos';


export const Route = createFileRoute('/investimentos/')({
  component: InvestimentosPage,
});

const TIPOS_INVESTIMENTO = [
  'CDB', 'CDI', 'LCI / LCA', 'Tesouro Direto', 'Ações', 'Fundos Imobiliários (FIIs)', 
  'Criptomoedas', 'Previdência Privada', 'Fundos de Investimento', 'Poupança', 
  'BDRs', 'ETFs', 'Outro'
];


function InvestimentosPage() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState(TIPOS_INVESTIMENTO[0]);
  const [taxa, setTaxa] = useState(SUGESTAO_POR_TIPO[TIPOS_INVESTIMENTO[0]]?.taxa ?? '');
  const [indexador, setIndexador] = useState<string>(SUGESTAO_POR_TIPO[TIPOS_INVESTIMENTO[0]]?.indexador ?? 'PREFIXADO');
  // Enquanto o usuário não mexe em indexador/taxa, o tipo escolhido sugere os dois
  const [ajustouTaxa, setAjustouTaxa] = useState(false);

  const escolherTipo = (t: string) => {
    setTipo(t);
    const sug = SUGESTAO_POR_TIPO[t];
    if (sug && !ajustouTaxa) {
      setIndexador(sug.indexador);
      setTaxa(sug.taxa);
    }
  };

  const { data: investimentos, isLoading } = useQuery({
    queryKey: ['investimentos'],
    queryFn: () => investimentosApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: investimentosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos'] });
      setModalAberto(false);
      setNome('');
      setTipo(TIPOS_INVESTIMENTO[0]);
      setIndexador(SUGESTAO_POR_TIPO[TIPOS_INVESTIMENTO[0]]?.indexador ?? 'PREFIXADO');
      setTaxa(SUGESTAO_POR_TIPO[TIPOS_INVESTIMENTO[0]]?.taxa ?? '');
      setAjustouTaxa(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    createMutation.mutate({
      nome,
      tipo,
      taxa_rendimento: parseFloat(String(taxa || '0').replace(',', '.')),
      indexador
    });
  };

  const totalInvestido = investimentos?.reduce((acc, inv) => acc + parseFloat(String(inv.saldo_atual)), 0) || 0;

  return (
    <div className="min-h-[100dvh] app-surface font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="stagger max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">Investimentos</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">O rendimento entra no saldo todo dia, sozinho.</p>
          </div>
          <button onClick={() => setModalAberto(true)} className="btn-primary self-start sm:self-auto px-5 py-2.5 text-sm">
            <Plus size={16} />
            Novo investimento
          </button>
        </header>

        <section className="rounded-[var(--radius-card)] bg-[var(--color-accent)] text-white p-6 sm:p-7 mb-10 flex flex-wrap items-end justify-between gap-6 on-dark" aria-label="Patrimônio">
          <div>
            <p className="text-sm text-white/75">Patrimônio investido</p>
            {isLoading ? (
              <span className="media-frame block h-10 w-48 mt-3 rounded-lg opacity-30" data-loading="" />
            ) : (
              <AnimatedCounter value={totalInvestido} isCurrency className="mt-2 block text-4xl sm:text-5xl text-white" />
            )}
          </div>
          {!!investimentos?.length && (
            <p data-num className="text-sm text-white/80">
              {investimentos.length} {investimentos.length === 1 ? "investimento" : "investimentos"}
            </p>
          )}
        </section>

        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-4">Sua carteira</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : investimentos?.length === 0 ? (
          <div className="finance-card px-6 py-12 flex flex-col items-start gap-3 max-w-xl">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Nenhum investimento ainda</h3>
            <p className="text-sm text-[var(--color-ink-muted)] max-w-[44ch]">
              Cadastre um CDB, Tesouro ou poupança e o saldo passa a render automaticamente a cada dia.
            </p>
            <button onClick={() => setModalAberto(true)} className="btn-primary px-5 py-2.5 text-sm mt-2">
              <Plus size={16} />
              Cadastrar o primeiro
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investimentos?.map((inv, i) => (
              <li key={inv.id_investimento} className="rise" style={{ "--i": i + 3 } as React.CSSProperties}>
                <Link
                  to="/investimentos/$id"
                  params={{ id: String(inv.id_investimento) }}
                  className="finance-card pressable group h-full p-5 flex flex-col gap-6"
                  data-clickable=""
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--color-ink)] text-lg leading-tight truncate">{inv.nome}</h3>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">{inv.tipo}</p>
                    </div>
                    <span className="arrow-nudge text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)]">
                      <ArrowRight size={18} />
                    </span>
                  </div>

                  <div className="mt-auto flex justify-between items-end gap-3">
                    <div>
                      <p className="text-xs text-[var(--color-ink-muted)]">Saldo</p>
                      <p data-num className="font-semibold text-[var(--color-ink)] text-lg">{formatCurrency(parseFloat(String(inv.saldo_atual)))}</p>
                    </div>
                    <p data-num className="text-sm font-medium text-gain text-right">{descreverTaxa(inv)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>

      {/* Modal Novo investimento */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center p-4">
            <motion.div {...backdrop} className="absolute inset-0 bg-[var(--color-ink)]/30" onClick={() => setModalAberto(false)} />
            <motion.div
              {...modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="novo-inv-titulo"
              className="relative bg-white rounded-[20px] shadow-xl w-full max-w-md max-h-[92dvh] overflow-y-auto"
            >
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <h2 id="novo-inv-titulo" className="font-brand text-lg font-bold text-[var(--color-ink)]">Novo investimento</h2>
                <button onClick={() => setModalAberto(false)} aria-label="Fechar" className="p-2 -mr-2 rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="inv-nome" className="text-sm font-medium text-[var(--color-ink-soft)]">Nome</label>
                  <input
                    id="inv-nome"
                    type="text"
                    required
                    autoFocus
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: CDB Nubank, Tesouro Selic 2029"
                    className="field w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="inv-tipo" className="text-sm font-medium text-[var(--color-ink-soft)]">Tipo</label>
                    <select id="inv-tipo" value={tipo} onChange={(e) => escolherTipo(e.target.value)} className="field w-full px-3 py-3 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white text-sm">
                      {TIPOS_INVESTIMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="inv-idx" className="text-sm font-medium text-[var(--color-ink-soft)]">Indexador</label>
                    <select
                      id="inv-idx"
                      value={indexador}
                      onChange={(e) => { setIndexador(e.target.value); setAjustouTaxa(true); }}
                      className="field w-full px-3 py-3 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white text-sm"
                    >
                      {INDEXADORES.map((idx) => <option key={idx} value={idx}>{nomeIndexador(idx)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="inv-taxa" className="text-sm font-medium text-[var(--color-ink-soft)]">{rotuloTaxa(indexador)}</label>
                  <div className="relative">
                    <input
                      id="inv-taxa"
                      type="text"
                      inputMode="decimal"
                      required
                      value={taxa}
                      onChange={(e) => { setTaxa(e.target.value.replace(/[^0-9.,]/g, '')); setAjustouTaxa(true); }}
                      placeholder={exemploTaxa(indexador)}
                      className="field w-full px-4 py-3 pr-10 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white text-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]">%</span>
                  </div>
                </div>

                <TaxaPreview indexador={indexador} taxa={taxa} />
                <p className="text-xs text-[var(--color-ink-muted)]">O rendimento entra no saldo todo dia, calculado com essa taxa.</p>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setModalAberto(false)} className="flex-1 px-4 py-3 rounded-full border border-[var(--color-line)] text-sm font-medium text-[var(--color-ink-soft)]">
                    Cancelar
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 py-3 text-sm disabled:opacity-50">
                    {createMutation.isPending ? 'Salvando' : 'Adicionar'}
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
