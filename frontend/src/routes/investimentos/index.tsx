import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { FinanceCard, SkeletonCard } from '../../components/ui';
import { investimentosApi, Investment } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, TrendingUp, PiggyBank, ArrowRight, X } from 'lucide-react';

export const Route = createFileRoute('/investimentos/')({
  component: InvestimentosPage,
});

const TIPOS_INVESTIMENTO = [
  'CDB', 'CDI', 'LCI / LCA', 'Tesouro Direto', 'Ações', 'Fundos Imobiliários (FIIs)', 
  'Criptomoedas', 'Previdência Privada', 'Fundos de Investimento', 'Poupança', 
  'BDRs', 'ETFs', 'Outro'
];

const INDEXADORES = ['PREFIXADO', 'CDI', 'SELIC', 'IPCA', 'IGPM', 'INPC', 'TR', 'POUPANCA', 'IBOVESPA'];

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Investimentos</h1>
            <p className="text-gray-500 text-sm mt-0.5">Acompanhe e gerencie sua carteira de investimentos.</p>
          </div>
          <button 
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 bg-[var(--color-finance-primary)] text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-[var(--color-finance-primary)]/20 hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Novo Investimento</span>
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <FinanceCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Patrimônio Total</p>
              <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvestido)}</h2>
            </div>
          </FinanceCard>
          <FinanceCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Rendimento Automático</p>
              <h2 className="text-lg font-semibold text-gray-900">Ativado diariamente</h2>
            </div>
          </FinanceCard>
        </div>

        {/* Lista de Investimentos */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sua Carteira</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : investimentos?.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <PiggyBank size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum investimento ainda</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Comece a montar sua carteira de investimentos adicionando seu primeiro ativo.
            </p>
            <button 
              onClick={() => setModalAberto(true)}
              className="text-[var(--color-finance-primary)] font-medium hover:opacity-80 inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Criar Investimento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investimentos?.map((inv, i) => (
              <Link 
                key={inv.id_investimento} 
                to="/investimentos/$id" 
                params={{ id: String(inv.id_investimento) }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{inv.nome}</h3>
                      <p className="text-xs text-gray-400 font-medium">{inv.tipo}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Saldo Atual</p>
                      <p className="font-bold text-gray-900">{formatCurrency(parseFloat(String(inv.saldo_atual)))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Rendimento</p>
                      <p className="text-sm font-semibold text-green-600">+{parseFloat(String(inv.taxa_rendimento))}% a.a.</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {/* Modal Novo Investimento */}
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
                <h2 className="text-lg font-bold text-gray-900">Novo Investimento</h2>
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Investimento</label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-finance-primary)]/20 focus:border-[var(--color-finance-primary)] transition-all"
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
                    className="flex-1 bg-[var(--color-finance-primary)] hover:opacity-90 text-white font-medium rounded-xl transition-all disabled:opacity-50 py-3"
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
