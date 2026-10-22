import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { TooltipProps } from '../../lib/chart';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { AnimatedCounter, FinanceCard, SkeletonCard } from '../../components/ui';
import { investimentosApi, type CreateInvestment } from '../../lib/api';
import { deNumero, paraNumero } from '../../lib/dinheiro';
import { TaxaPreview } from '../../components/investimentos/taxa-preview';
import { INDEXADORES, nomeIndexador, rotuloTaxa } from '../../lib/investimentos';
import { formatCurrency, formatCompactCurrency, formatDate, descreverTaxa, tamanhoValorDestaque } from '../../lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown, PiggyBank, History, Trash2, Edit2 } from '../../components/icons';
import { Sheet, AmountField, Campo } from '../../components/sheet';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { campoClasse } from '../../lib/classes';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export const Route = createFileRoute('/investimentos/$id')({
  component: InvestimentoDetailsPage,
});

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 min-w-[150px]">
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
        <span className="text-gray-600">Saldo</span>
        <span className="font-bold text-gray-900 ml-auto">{formatCurrency(Number(payload[0].value) || 0)}</span>
      </div>
    </div>
  );
}

function InvestimentoDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'aporte' | 'resgate'>('aporte');
  const [valor, setValor] = useState('');

  // Confirmações (no visual do app, não o aviso do navegador)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [movParaApagar, setMovParaApagar] = useState<null | { id: string | number; tipo: string; valor: number }>(null);

  // Edit State
  const [modalEditAberto, setModalEditAberto] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', tipo: '', taxa_rendimento: '', indexador: 'PREFIXADO' });

  const { data: inv, isLoading } = useQuery({
    queryKey: ['investimentos', id],
    queryFn: () => investimentosApi.get(id),
  });

  // Taxa atual e rendimento previsto vêm do servidor, com a mesma conta do crédito diário
  const saldoAtual = parseFloat(String(inv?.saldo_atual ?? 0)) || 0;
  const { data: simulacao } = useQuery({
    queryKey: ['simular-investimento', inv?.indexador, Number(inv?.taxa_rendimento), saldoAtual],
    queryFn: () => investimentosApi.simular(inv?.indexador || 'PREFIXADO', Number(inv?.taxa_rendimento) || 0, saldoAtual || 1000),
    enabled: !!inv,
    staleTime: 5 * 60 * 1000,
  });

  const transacaoMutation = useMutation({
    mutationFn: (data: { tipo: 'aporte' | 'resgate'; valor: number }) =>
      investimentosApi.addTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }); // Aporte/Resgate mexe na conta principal
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setModalAberto(false);
      setValor('');
    }
  });

  const deleteTransacaoMutation = useMutation({
    mutationFn: (transacaoId: string | number) => investimentosApi.deleteTransaction(id, transacaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setMovParaApagar(null);
    }
  });

  const deleteInvMutation = useMutation({
    mutationFn: () => investimentosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate({ to: '/investimentos' });
    }
  });

  const updateInvMutation = useMutation({
    mutationFn: (data: CreateInvestment) => investimentosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investimentos', id] });
      setModalEditAberto(false);
    }
  });

  const valorNumero = paraNumero(valor);
  // resgate não pode passar do que tem no investimento
  const resgatePassa = tipoTransacao === 'resgate' && !!valorNumero && valorNumero > saldoAtual + 0.001;
  const confirmarTransacao = () => {
    const numero = valorNumero;
    if (!numero || numero <= 0 || resgatePassa) return;
    transacaoMutation.mutate({
      tipo: tipoTransacao,
      valor: numero
    });
  };

  const openModal = (tipo: 'aporte' | 'resgate') => {
    setTipoTransacao(tipo);
    setValor('');
    setModalAberto(true);
  };

  const openEditModal = () => {
    if (inv) {
      setEditForm({
        nome: inv.nome,
        tipo: inv.tipo,
        taxa_rendimento: String(inv.taxa_rendimento),
        indexador: inv.indexador || 'PREFIXADO'
      });
      setModalEditAberto(true);
    }
  };

  const salvarEdicao = () => {
    if (!editForm.nome.trim() || !(parseFloat(String(editForm.taxa_rendimento).replace(',', '.')) > 0)) return;
    updateInvMutation.mutate({
      nome: editForm.nome.trim(),
      tipo: editForm.tipo,
      taxa_rendimento: parseFloat(String(editForm.taxa_rendimento).replace(',', '.')),
      indexador: editForm.indexador
    });
  };

  // Preparar dados do gráfico
  const chartData = inv?.historico?.map(t => ({
    data: formatDate(t.data_registro),
    saldo: t.saldoAposTransacao
  })) || [];

  if (chartData.length === 1) {
    chartData.unshift({ data: '', saldo: 0 }); // Linha visual pra começar do 0
  }

  const historicoInvertido = [...(inv?.historico || [])].reverse();
  // Dois históricos: o que VOCÊ moveu (aporte/resgate) e o que o investimento rendeu sozinho
  const movimentacoes = historicoInvertido.filter((t) => t.tipo !== 'rendimento');
  const rendimentosPorDia = (() => {
    const porDia = new Map<string, { dia: string; valor: number }>();
    for (const t of historicoInvertido) {
      if (t.tipo !== 'rendimento') continue;
      const dia = String(t.data_registro).slice(0, 10);
      const atual = porDia.get(dia) ?? { dia, valor: 0 };
      atual.valor += parseFloat(String(t.valor)) || 0;
      porDia.set(dia, atual);
    }
    return [...porDia.values()];
  })();
  const totalRendido = rendimentosPorDia.reduce((s, d) => s + d.valor, 0);
  const mediaPorDia = rendimentosPorDia.length ? totalRendido / rendimentosPorDia.length : 0;
  const [verTodosRend, setVerTodosRend] = useState(false);
  const rendVisiveis = verTodosRend ? rendimentosPorDia : rendimentosPorDia.slice(0, 10);

  const rendimentoPrevisto = saldoAtual > 0 && simulacao ? simulacao.exemplo.porDia : 0;

  return (
    <div className="min-h-[100dvh] app-surface font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="stagger max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/investimentos"
              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isLoading ? 'Carregando...' : inv?.nome}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{inv?.tipo}</p>
            </div>
          </div>
          {!isLoading && inv && (
            <div className="flex gap-2">
              <button
                onClick={openEditModal}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600 transition-colors border border-gray-100"
                title="Editar investimento"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => { deleteInvMutation.reset(); setConfirmarExclusao(true); }}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-loss-soft text-loss transition-colors border border-gray-100"
                title="Excluir investimento"
                disabled={deleteInvMutation.isPending}
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Saldo e Ações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <section className="h-full rounded-[var(--radius-card)] bg-[var(--color-accent)] text-white p-6 sm:p-7 flex flex-col justify-between gap-8 on-dark" aria-label="Saldo">
              <div>
                <p className="text-sm text-white/75">Saldo atual</p>
                {isLoading ? (
                  <span className="media-frame block h-11 w-56 mt-3 rounded-lg opacity-30" data-loading="" />
                ) : (
                  <AnimatedCounter value={parseFloat(String(inv?.saldo_atual || 0))} isCurrency className={`mt-2 block ${tamanhoValorDestaque(parseFloat(String(inv?.saldo_atual || 0)))} text-white`} />
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => openModal('aporte')} className="pressable inline-flex items-center gap-2 rounded-full bg-[#fff] text-[#047857] px-5 py-2.5 text-sm font-semibold">
                  <TrendingUp size={16} /> Aportar
                </button>
                <button onClick={() => openModal('resgate')} className="pressable inline-flex items-center gap-2 rounded-full border border-white/40 text-white px-5 py-2.5 text-sm font-semibold">
                  <TrendingDown size={16} /> Resgatar
                </button>
              </div>
            </section>
          </div>

          <div>
            <FinanceCard className="h-full">
              <h3 className="font-semibold text-gray-900 mb-4">Informações</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Taxa</p>
                  <p data-num className="font-semibold text-gain text-lg">{inv ? descreverTaxa(inv) : '--'}</p>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Rende amanhã (estimativa)</p>
                  <p className="font-medium text-gain">+{formatCurrency(rendimentoPrevisto)}</p>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Criado em</p>
                  <p className="font-medium text-gray-900">{inv ? formatDate(inv.data_criacao) : '--/--/----'}</p>
                </div>
              </div>
            </FinanceCard>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <FinanceCard className="mb-6">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Evolução do patrimônio</h2>
            <p className="text-xs text-gray-400">Crescimento do seu dinheiro neste investimento ao longo do tempo.</p>
          </div>
          {isLoading ? (
             <SkeletonCard lines={1} className="border-0 shadow-none h-[260px]" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldoInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-finance-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-finance-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={60}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-finance-primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-finance-primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldoInv)"
                  activeDot={{ r: 6, fill: 'var(--color-finance-primary)', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Nenhuma transação registrada ainda.</p>
          )}
        </FinanceCard>

        {/* Históricos: o que você moveu e o que o investimento rendeu sozinho */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <FinanceCard>
            <div className="flex items-center gap-2 mb-1">
              <History size={18} className="text-[var(--color-ink-muted)]" />
              <h2 className="font-semibold text-[var(--color-ink)]">Histórico de movimentações</h2>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-4">Aportes e resgates que você fez.</p>

            {isLoading ? (
              <div className="space-y-4">
                <SkeletonCard lines={1} className="border-0 shadow-none" />
                <SkeletonCard lines={1} className="border-0 shadow-none" />
              </div>
            ) : movimentacoes.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)] text-center py-6">Nenhum aporte ou resgate ainda.</p>
            ) : (
              <div className="divide-y divide-[var(--color-line)]">
                {movimentacoes.map((t, i) => (
                  <div key={t.id_transacao_inv} style={{ '--i': Math.min(i, 8) } as React.CSSProperties} className={(i < 12 ? 'rise ' : '') + 'py-3.5 flex items-center justify-between gap-3'}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${t.tipo === 'resgate' ? 'bg-loss-soft text-loss' : 'bg-gain-soft text-gain'}`}>
                        {t.tipo === 'resgate' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-ink)] capitalize">{t.tipo}</p>
                        <p className="text-xs text-[var(--color-ink-muted)]" data-num>{formatDate(t.data_registro)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${t.tipo === 'resgate' ? 'text-loss' : 'text-[var(--color-ink)]'}`} data-num>
                          {t.tipo === 'resgate' ? '-' : '+'}{formatCurrency(parseFloat(String(t.valor)))}
                        </p>
                        {t.saldoAposTransacao !== undefined && (
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5" data-num>Saldo {formatCurrency(t.saldoAposTransacao)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { deleteTransacaoMutation.reset(); setMovParaApagar({ id: t.id_transacao_inv, tipo: t.tipo, valor: parseFloat(String(t.valor)) }); }}
                        aria-label={`Excluir ${t.tipo} de ${formatCurrency(parseFloat(String(t.valor)))}`}
                        title="Excluir movimentação"
                        className="pressable p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-loss hover:bg-loss-soft transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FinanceCard>

          <FinanceCard>
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank size={18} className="text-gain" />
              <h2 className="font-semibold text-[var(--color-ink)]">Histórico de rendimento</h2>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-4">Quanto o investimento rendeu sozinho, dia a dia.</p>

            {isLoading ? (
              <div className="space-y-4">
                <SkeletonCard lines={1} className="border-0 shadow-none" />
                <SkeletonCard lines={1} className="border-0 shadow-none" />
              </div>
            ) : rendimentosPorDia.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)] text-center py-6">
                Ainda não rendeu nada. O rendimento entra todo dia útil, sozinho.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 rounded-xl bg-gain-soft px-4 py-3 mb-4">
                  <div className="min-w-0">
                    <dt className="text-xs text-[var(--color-ink-muted)]">Total rendido</dt>
                    <dd className="font-brand font-bold text-lg text-gain [overflow-wrap:anywhere]" data-num>+{formatCurrency(totalRendido)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-[var(--color-ink-muted)]">Média por dia</dt>
                    <dd className="font-brand font-bold text-lg text-[var(--color-ink)] [overflow-wrap:anywhere]" data-num>+{formatCurrency(mediaPorDia)}</dd>
                  </div>
                </dl>
                <ol className="divide-y divide-[var(--color-line)]">
                  {rendVisiveis.map((d, i) => (
                    <li key={d.dia} style={{ '--i': Math.min(i, 8) } as React.CSSProperties} className={(i < 12 ? 'rise ' : '') + 'py-2.5 flex items-center justify-between gap-3'}>
                      <span className="text-sm text-[var(--color-ink-soft)]" data-num>
                        {new Date(`${d.dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).replace('.', '')}
                      </span>
                      <span className="text-sm font-semibold text-gain" data-num>+{formatCurrency(d.valor)}</span>
                    </li>
                  ))}
                </ol>
                {rendimentosPorDia.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setVerTodosRend((v) => !v)}
                    aria-expanded={verTodosRend}
                    className="pressable mt-3 w-full rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)]"
                  >
                    {verTodosRend ? 'Mostrar menos' : `Mostrar todos os ${rendimentosPorDia.length} dias`}
                  </button>
                )}
              </>
            )}
          </FinanceCard>
        </div>

      </div>

      {/* Aporte / resgate: mesmo painel lateral da nova transação */}
      <Sheet
        open={modalAberto}
        onOpenChange={setModalAberto}
        title={tipoTransacao === 'aporte' ? `Aportar em ${inv?.nome ?? ''}` : `Resgatar de ${inv?.nome ?? ''}`}
        onSubmit={confirmarTransacao}
        footer={
          <button
            type="submit"
            disabled={transacaoMutation.isPending || !valorNumero || resgatePassa}
            className="btn-primary w-full py-3.5 text-sm disabled:opacity-60"
          >
            {transacaoMutation.isPending ? <span className="spinner" aria-hidden /> : tipoTransacao === 'aporte' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {valorNumero ? `${tipoTransacao === 'aporte' ? 'Aportar' : 'Resgatar'} ${formatCurrency(valorNumero)}` : tipoTransacao === 'aporte' ? 'Aportar' : 'Resgatar'}
          </button>
        }
      >
        <div className="rounded-xl bg-[var(--color-surface)] p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="text-[var(--color-ink-muted)]">Saldo no investimento</p>
            <p className="font-semibold text-[var(--color-ink)]" data-num>{formatCurrency(saldoAtual)}</p>
          </div>
          {tipoTransacao === 'resgate' && saldoAtual > 0 && (
            <button
              type="button"
              onClick={() => setValor(deNumero(saldoAtual))}
              className="shrink-0 rounded-full bg-gain-soft px-3 py-1.5 text-xs font-semibold text-gain"
            >
              Resgatar tudo
            </button>
          )}
        </div>
        <AmountField
          id="inv-valor"
          label={tipoTransacao === 'aporte' ? 'Valor do aporte' : 'Valor do resgate'}
          value={valor}
          onChange={setValor}
          erro={resgatePassa ? `Passa do saldo do investimento (${formatCurrency(saldoAtual)}).` : undefined}
          autoFocus
        />
        <p className="text-xs text-[var(--color-ink-muted)]">
          {tipoTransacao === 'aporte' ? 'O valor sai do seu saldo e entra no investimento.' : 'O valor sai do investimento e volta para o seu saldo.'}
        </p>
        {transacaoMutation.isError && <p role="alert" className="text-sm text-loss">{(transacaoMutation.error as Error)?.message || 'Não deu para salvar. Tente de novo.'}</p>}
      </Sheet>

      {/* Editar investimento: mesmo painel */}
      <Sheet
        open={modalEditAberto}
        onOpenChange={setModalEditAberto}
        title="Editar investimento"
        onSubmit={salvarEdicao}
        footer={
          <button type="submit" disabled={updateInvMutation.isPending} className="btn-primary w-full py-3.5 text-sm disabled:opacity-60">
            {updateInvMutation.isPending && <span className="spinner" aria-hidden />}
            Salvar alterações
          </button>
        }
      >
        <Campo id="edit-nome" label="Nome">
          <input id="edit-nome" type="text" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className={campoClasse} />
        </Campo>
        <Campo id="edit-tipo" label="Tipo">
          <input id="edit-tipo" type="text" value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })} placeholder="Ex.: CDB, Tesouro Direto" className={campoClasse} />
        </Campo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo id="edit-idx" label="Indexador">
            <select id="edit-idx" value={editForm.indexador} onChange={(e) => setEditForm({ ...editForm, indexador: e.target.value })} className={campoClasse}>
              {INDEXADORES.map((idx) => <option key={idx} value={idx}>{nomeIndexador(idx)}</option>)}
            </select>
          </Campo>
          <Campo id="edit-taxa" label={rotuloTaxa(editForm.indexador)}>
            <div className="relative">
              <input
                id="edit-taxa"
                type="text"
                inputMode="decimal"
                value={editForm.taxa_rendimento}
                onChange={(e) => setEditForm({ ...editForm, taxa_rendimento: e.target.value.replace(/[^0-9.,]/g, '') })}
                className={campoClasse + ' pr-10'}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]">%</span>
            </div>
          </Campo>
        </div>
        <TaxaPreview indexador={editForm.indexador} taxa={editForm.taxa_rendimento} valor={saldoAtual > 0 ? saldoAtual : 1000} />
        {updateInvMutation.isError && <p role="alert" className="text-sm text-loss">{(updateInvMutation.error as Error)?.message || 'Não deu para salvar. Tente de novo.'}</p>}
      </Sheet>

      {/* Excluir investimento */}
      <ConfirmDialog
        open={confirmarExclusao}
        onOpenChange={setConfirmarExclusao}
        titulo={`Excluir ${inv?.nome ?? 'investimento'}?`}
        confirmar="Excluir e devolver ao saldo"
        onConfirm={() => deleteInvMutation.mutate()}
        pendente={deleteInvMutation.isPending}
        erro={deleteInvMutation.isError && ((deleteInvMutation.error as Error)?.message || 'Não deu para excluir. Tente de novo.')}
      >
        {saldoAtual > 0 ? (
          <p>
            <strong className="text-[var(--color-ink)]" data-num>{formatCurrency(saldoAtual)}</strong> (com os rendimentos) volta para o seu saldo,
            como uma entrada “Resgate de {inv?.nome}” em Transações.
          </p>
        ) : (
          <p>O investimento está sem saldo, então nada volta para a conta.</p>
        )}
        <p>Isso não pode ser desfeito.</p>
      </ConfirmDialog>

      {/* Excluir uma movimentação */}
      <ConfirmDialog
        open={!!movParaApagar}
        onOpenChange={(v) => !v && setMovParaApagar(null)}
        titulo={movParaApagar ? `Excluir ${movParaApagar.tipo} de ${formatCurrency(movParaApagar.valor)}?` : 'Excluir movimentação?'}
        confirmar="Excluir"
        onConfirm={() => movParaApagar && deleteTransacaoMutation.mutate(movParaApagar.id)}
        pendente={deleteTransacaoMutation.isPending}
        erro={deleteTransacaoMutation.isError && ((deleteTransacaoMutation.error as Error)?.message || 'Não deu para excluir. Tente de novo.')}
      >
        {movParaApagar?.tipo === 'aporte' && <p>O valor sai do investimento e volta para o seu saldo.</p>}
        {movParaApagar?.tipo === 'resgate' && <p>O valor volta para o investimento e sai do seu saldo.</p>}
        {movParaApagar?.tipo === 'rendimento' && <p>O rendimento sai do saldo do investimento.</p>}
      </ConfirmDialog>
    </div>
  );
}
