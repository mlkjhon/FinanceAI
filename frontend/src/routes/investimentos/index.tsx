import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { AnimatedCounter, SkeletonCard } from '../../components/ui';
import { investimentosApi, Investment } from '../../lib/api';
import { formatCurrency, descreverTaxa } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowRight, X } from '../../components/icons';


export const Route = createFileRoute('/investimentos/')({
  component: InvestimentosPage,
});

const TIPOS_INVESTIMENTO = [
  'CDB', 'CDI', 'LCI / LCA', 'Tesouro Direto', 'Ações', 'Fundos Imobiliários (FIIs)', 
  'Criptomoedas', 'Previdência Privada', 'Fundos de Investimento', 'Poupança', 
  'BDRs', 'ETFs', 'Outro'
];

const INDEXADORES = [
  'PREFIXADO', 'CDI', 'SELIC', 'IPCA', 'IGPM', 'INPC', 
  'TR', 'POUPANCA', 'IBOVESPA', 'TLP', 'TJLP', 'TBF', 
  'PTAX', 'IMA-B', 'IRF-M', 'IDA'
];

function InvestimentosPage() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState(TIPOS_INVESTIMENTO[0]);
  const [taxa, setTaxa] = useState('');
  const [indexador, setIndexador] = useState(INDEXADORES[0]);

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
      setTaxa('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    createMutation.mutate({
      nome,
      tipo,
      taxa_rendimento: parseFloat(taxa || '0'),
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalAberto(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Novo investimento</h2>
                <button onClick={() => setModalAberto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da Corretora / Ativo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Nubank CDB, Tesouro Selic..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Investimento</label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  >
                    {TIPOS_INVESTIMENTO.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Indexador</label>
                  <select
                    value={indexador}
                    onChange={e => setIndexador(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  >
                    {INDEXADORES.map(idx => (
                      <option key={idx} value={idx}>{idx}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {indexador === 'PREFIXADO' ? 'Taxa Anual (%)' : `Porcentagem do ${indexador} (%)`}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={taxa}
                      onChange={e => setTaxa(e.target.value)}
                      placeholder={indexador === 'PREFIXADO' ? "Ex: 10.5" : "Ex: 120"}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Essa taxa será calculada e aplicada proporcionalmente sobre o saldo todo dia à meia-noite.</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 bg-[var(--color-accent)] hover:opacity-90 text-white font-medium rounded-xl transition-[color,background-color,border-color,box-shadow,opacity] disabled:opacity-50 py-3"
                  >
                    {createMutation.isPending ? 'Salvando...' : 'Adicionar'}
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
