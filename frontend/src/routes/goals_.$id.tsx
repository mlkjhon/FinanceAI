import React from 'react';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Navbar } from '../components/Navbar';
import { ArrowLeft, PiggyBank, Sparkles, Target } from '../components/icons';
import { Headline, Strong, MetricStrip, ChartTooltip, DetailSkeleton } from '../components/detail';
import { Sheet, AmountField } from '../components/sheet';
import { HoldToDelete } from '../components/hold-to-delete';
import { goalsApi, type MetaDetalhe, type MovimentoMeta } from '../lib/api';
import { deNumero, paraNumero } from '../lib/dinheiro';
import { useTema } from '../lib/theme';
import { cn, formatCurrency, formatCompactCurrency } from '../lib/utils';

export const Route = createFileRoute('/goals_/$id')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: MetaDetalhePage,
});

const DIA_MS = 86_400_000;

// Datas do banco chegam como ISO completo (timestamp) ou só "AAAA-MM-DD" (dia sem hora)
function paraData(valor: string | null | undefined, comHora = true) {
  if (!valor) return null;
  const s = String(valor);
  const d = comHora && s.length > 10 ? new Date(s) : new Date(`${s.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const dataLonga = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const dataCurta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function distancia(dias: number) {
  if (dias < 45) return plural(dias, 'dia', 'dias');
  const meses = Math.round(dias / 30.4);
  if (meses < 24) return plural(meses, 'mês', 'meses');
  return plural(Math.round(meses / 12), 'ano', 'anos');
}

/*
 * Tudo o que a tela mostra sai do histórico: o valor inicial é o que sobra do
 * guardado depois de tirar os depósitos, e a curva soma depósito a depósito.
 */
function calcular(meta: MetaDetalhe) {
  const agora = new Date();
  const asc = [...meta.historico]
    .map((m) => ({ ...m, data: paraData(m.criado_em, m.hora) }))
    .filter((m): m is MovimentoMeta & { data: Date } => !!m.data)
    .sort((a, b) => a.data.getTime() - b.data.getTime());
  const depositos = asc.filter((m) => m.tipo === 'deposito');
  const totalDepositado = depositos.reduce((s, m) => s + m.valor, 0);
  const inicial = Math.max(meta.valor_atual - totalDepositado, 0);

  const criadaEm = paraData(meta.criado_em) ?? asc.find((m) => m.tipo === 'criacao')?.data ?? null;
  const inicio = criadaEm ?? asc[0]?.data ?? null;
  const prazo = paraData(meta.data_objetivo, false);
  const falta = Math.max(meta.valor_meta - meta.valor_atual, 0);
  const pct = meta.valor_meta > 0 ? Math.min((meta.valor_atual / meta.valor_meta) * 100, 100) : 0;
  const concluida = meta.valor_atual >= meta.valor_meta && meta.valor_meta > 0;

  // Curva do guardado: ponto inicial + um ponto por depósito
  let acumulado = inicial;
  const serie: { rotulo: string; guardado: number }[] = [];
  if (inicio) serie.push({ rotulo: dataCurta(inicio), guardado: inicial });
  for (const m of depositos) {
    acumulado += m.valor;
    serie.push({ rotulo: dataCurta(m.data), guardado: Math.round(acumulado * 100) / 100 });
  }

  // Ritmo: quanto entrou por mês desde o começo, e quanto precisa entrar até o prazo
  const diasDesdeInicio = inicio ? Math.max((agora.getTime() - inicio.getTime()) / DIA_MS, 1) : null;
  const porMes = diasDesdeInicio && totalDepositado > 0 ? totalDepositado / Math.max(diasDesdeInicio / 30.4, 1) : null;
  const diasAtePrazo = prazo ? Math.ceil((prazo.getTime() - agora.getTime()) / DIA_MS) : null;
  const precisaPorMes = diasAtePrazo && diasAtePrazo > 0 && falta > 0 ? falta / Math.max(diasAtePrazo / 30.4, 1) : null;
  const mesesNoRitmo = porMes && falta > 0 ? falta / porMes : null;
  // Onde deveria estar hoje, se o dinheiro entrasse em ritmo constante do início ao prazo
  const esperadoPct = inicio && prazo && prazo > inicio
    ? Math.min(Math.max((agora.getTime() - inicio.getTime()) / (prazo.getTime() - inicio.getTime()), 0), 1) * 100
    : null;

  return {
    asc, depositos, totalDepositado, inicial, criadaEm, prazo, falta, pct, concluida, serie,
    porMes, diasAtePrazo, precisaPorMes, mesesNoRitmo, esperadoPct,
    ultimo: depositos[depositos.length - 1] ?? null,
    maior: depositos.reduce<(typeof depositos)[number] | null>((m, d) => (!m || d.valor > m.valor ? d : m), null),
  };
}

function MetaConteudo({ id }: { id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tema = useTema();
  const cor = tema === 'dark' ? '#059669' : '#047857';

  const { data: meta, isLoading, isError } = useQuery({ queryKey: ['goals', id], queryFn: () => goalsApi.get(id) });

  const [depositoAberto, setDepositoAberto] = React.useState(false);
  const [valorDeposito, setValorDeposito] = React.useState('');
  const valorDep = paraNumero(valorDeposito);
  const faltaAgora = meta ? Math.max(meta.valor_meta - meta.valor_atual, 0) : 0;
  const depositoPassa = !!valorDep && valorDep > faltaAgora + 0.001;

  const depositoMut = useMutation({
    mutationFn: (valor: number) => goalsApi.adicionarDinheiro(id, valor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setDepositoAberto(false);
    },
  });
  // Apagar um depósito do histórico devolve o dinheiro para o saldo
  const removerDep = useMutation({
    mutationFn: (idTransacao: number) => goalsApi.removerDeposito(id, idTransacao),
    onSuccess: () => {
      ['goals', 'dashboard-summary', 'transactions'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => goalsApi.delete(id),
    onSuccess: () => {
      // os depósitos da meta são desfeitos: o dinheiro volta para o saldo
      ['goals', 'dashboard-summary', 'transactions'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate({ to: '/goals' });
    },
  });

  if (isLoading) return <DetailSkeleton />;
  if (isError || !meta) {
    return (
      <div className="finance-card px-6 py-10 max-w-xl space-y-3">
        <p className="font-semibold text-[var(--color-ink)]">Não encontramos essa meta.</p>
        <Link to="/goals" className="link-line text-sm font-medium text-[var(--color-accent)]">Voltar para Metas</Link>
      </div>
    );
  }

  const c = calcular(meta);
  const atrasada = !c.concluida && c.diasAtePrazo != null && c.diasAtePrazo < 0;
  const status = c.concluida ? 'Concluída' : atrasada ? 'Prazo vencido' : 'Em andamento';

  // Histórico agrupado por mês (mais novo primeiro)
  const grupos = new Map<string, typeof c.asc>();
  for (const m of [...c.asc].reverse()) {
    const chave = m.data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    grupos.set(chave, [...(grupos.get(chave) ?? []), m]);
  }

  const abrirDeposito = () => {
    setValorDeposito('');
    setDepositoAberto(true);
  };

  return (
    <div className="stagger space-y-8 pb-16">
      <header className="space-y-4">
        <Link
          to="/goals"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-150"
        >
          <span className="arrow-back"><ArrowLeft size={16} /></span>
          Metas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <span
              className={cn(
                'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
                c.concluida ? 'bg-gain-soft text-gain' : atrasada ? 'bg-loss-soft text-loss' : 'bg-[var(--color-surface)] text-[var(--color-ink-soft)]'
              )}
            >
              {status}
            </span>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-[var(--color-ink)] break-words">{meta.titulo}</h1>
            {meta.descricao && <p className="text-sm text-[var(--color-ink-muted)]">{meta.descricao}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!c.concluida && (
              <button onClick={abrirDeposito} className="btn-primary px-5 py-2.5 text-sm">
                <PiggyBank size={16} /> Depositar
              </button>
            )}
            <HoldToDelete compact label="Segure para remover (o dinheiro volta pro saldo)" pending={deleteMut.isPending} onConfirm={() => deleteMut.mutate()} />
          </div>
        </div>
      </header>

      {/* A resposta da tela numa frase */}
      <Headline>
        {c.concluida ? (
          <>Meta batida: você juntou <Strong tone="gain">{formatCurrency(meta.valor_atual)}</Strong> de {formatCurrency(meta.valor_meta)}.</>
        ) : (
          <>Você já guardou <Strong>{formatCurrency(meta.valor_atual)}</Strong> de {formatCurrency(meta.valor_meta)}. Faltam <Strong tone="gain">{formatCurrency(c.falta)}</Strong>.</>
        )}
      </Headline>

      {/* Progresso, com a marca de onde deveria estar hoje (ritmo constante até o prazo) */}
      <section aria-label="Progresso" className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-[var(--color-ink)]" data-num>{c.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
          {c.esperadoPct != null && !c.concluida && (
            <span className="text-xs text-[var(--color-ink-muted)]" data-num>
              {c.pct >= c.esperadoPct ? 'Adiantada' : 'Atrás'} do ritmo: o esperado hoje era {Math.round(c.esperadoPct)}%
            </span>
          )}
        </div>
        <div className="relative h-3 rounded-full bg-[var(--color-line)]/60">
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="bar-x h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(c.pct, c.pct > 0 ? 1.5 : 0)}%` }} />
          </div>
          {c.esperadoPct != null && !c.concluida && (
            <span
              className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-[var(--color-ink)]"
              style={{ left: `${c.esperadoPct}%` }}
              title={`Esperado hoje: ${Math.round(c.esperadoPct)}%`}
              aria-hidden
            />
          )}
        </div>
      </section>

      <MetricStrip
        items={[
          { label: 'Guardado', value: meta.valor_atual, currency: true },
          { label: 'Falta', value: c.falta, currency: true, tone: c.falta > 0 ? 'ink' : 'gain' },
          { label: 'Depósitos', value: c.depositos.length },
          { label: 'Média por depósito', value: c.depositos.length ? c.totalDepositado / c.depositos.length : 0, currency: true },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Evolução do guardado */}
        <section aria-label="Evolução" className="space-y-3 min-w-0">
          <h2 className="font-semibold text-base text-[var(--color-ink)]">Evolução do guardado</h2>
          {c.serie.length > 1 ? (
            <div className="finance-card p-4 sm:p-5">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={c.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="metaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={cor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={tema === 'dark' ? '#27302b' : '#eef2ef'} />
                    <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={8} minTickGap={16} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      width={64}
                      domain={[0, (max: number) => Math.max(max, meta.valor_meta)]}
                    />
                    <Tooltip content={<ChartTooltip names={{ guardado: 'Guardado' }} />} cursor={{ stroke: cor, strokeWidth: 1 }} />
                    <Area
                      type="stepAfter"
                      dataKey="guardado"
                      stroke={cor}
                      strokeWidth={2}
                      fill="url(#metaFill)"
                      animationDuration={800}
                      animationEasing="ease-out"
                      dot={{ r: 4, fill: cor, stroke: tema === 'dark' ? '#0f1412' : '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: cor, stroke: tema === 'dark' ? '#0f1412' : '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]" data-num>
                A linha de cima do gráfico vai até o valor da meta ({formatCurrency(meta.valor_meta)}).
              </p>
            </div>
          ) : (
            <p className="finance-card px-5 py-6 text-sm text-[var(--color-ink-muted)]">
              O gráfico aparece a partir do primeiro depósito.
            </p>
          )}
        </section>

        {/* Datas e ritmo */}
        <section aria-label="Informações" className="space-y-3">
          <h2 className="font-semibold text-base text-[var(--color-ink)]">Informações</h2>
          <dl className="finance-card divide-y divide-[var(--color-line)] text-sm">
            <Info rotulo="Criada em">
              {c.criadaEm ? (
                <>{dataLonga(c.criadaEm)}<span className="block text-xs text-[var(--color-ink-muted)]">às {hora(c.criadaEm)}</span></>
              ) : (
                <span className="text-[var(--color-ink-muted)]">Não registrada (meta anterior ao histórico)</span>
              )}
            </Info>
            <Info rotulo="Prazo">
              {c.prazo ? (
                <>
                  {dataLonga(c.prazo)}
                  <span className={cn('block text-xs', atrasada ? 'text-loss' : 'text-[var(--color-ink-muted)]')}>
                    {c.concluida ? 'Meta já concluída' : c.diasAtePrazo! < 0 ? `Venceu há ${distancia(-c.diasAtePrazo!)}` : c.diasAtePrazo === 0 ? 'Vence hoje' : `Faltam ${distancia(c.diasAtePrazo!)}`}
                  </span>
                </>
              ) : (
                <span className="text-[var(--color-ink-muted)]">Sem prazo</span>
              )}
            </Info>
            <Info rotulo="Último depósito">
              {c.ultimo ? (
                <>
                  {formatCurrency(c.ultimo.valor)}
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    {dataLonga(c.ultimo.data)}{c.ultimo.hora ? ` às ${hora(c.ultimo.data)}` : ''}
                  </span>
                </>
              ) : (
                <span className="text-[var(--color-ink-muted)]">Nenhum ainda</span>
              )}
            </Info>
            {c.maior && c.depositos.length > 1 && (
              <Info rotulo="Maior depósito">
                {formatCurrency(c.maior.valor)}
                <span className="block text-xs text-[var(--color-ink-muted)]">{dataLonga(c.maior.data)}</span>
              </Info>
            )}
            {c.inicial > 0 && <Info rotulo="Valor inicial">{formatCurrency(c.inicial)}</Info>}
            {!c.concluida && c.precisaPorMes != null && (
              <Info rotulo="Para bater no prazo">
                {formatCurrency(c.precisaPorMes)} por mês
              </Info>
            )}
            {!c.concluida && c.porMes != null && (
              <Info rotulo="Seu ritmo">
                {formatCurrency(c.porMes)} por mês
                {c.mesesNoRitmo != null && (
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Nesse ritmo, conclui em {distancia(Math.max(Math.round(c.mesesNoRitmo * 30.4), 1))}
                  </span>
                )}
              </Info>
            )}
          </dl>
        </section>
      </div>

      {/* Histórico */}
      <section aria-label="Histórico" className="space-y-3">
        <div>
          <h2 className="font-semibold text-base text-[var(--color-ink)]">Histórico</h2>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Apagar um depósito tira o valor da meta e devolve para o seu saldo.</p>
        </div>
        {removerDep.isError && <p role="alert" className="text-sm text-loss">{(removerDep.error as Error)?.message || 'Não deu para apagar o depósito.'}</p>}
        {c.asc.length ? (
          <div className="space-y-6">
            {[...grupos.entries()].map(([mes, itens], gi) => (
              <div key={mes} className="rise space-y-2" style={{ '--i': gi } as React.CSSProperties}>
                <h3 className="metric-label first-letter:uppercase">{mes}</h3>
                <ol className="finance-card divide-y divide-[var(--color-line)]">
                  {itens.map((m) => (
                    <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-full',
                          m.tipo === 'criacao' ? 'bg-[var(--color-surface)] text-[var(--color-ink-soft)]' : 'bg-gain-soft text-gain'
                        )}
                        aria-hidden
                      >
                        {m.tipo === 'criacao' ? <Target size={16} /> : <PiggyBank size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-ink)] flex flex-wrap items-center gap-x-2 gap-y-1">
                          {m.tipo === 'criacao' ? 'Meta criada' : 'Depósito'}
                          {m.origem === 'insights' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)]">
                              <Sparkles size={11} /> pelos Insights
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)]" data-num>
                          {m.data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).replace('.', '')}
                          {m.hora ? ` às ${hora(m.data)}` : ' · sem hora registrada'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {m.tipo === 'deposito' ? (
                          <p className="text-sm font-semibold text-gain" data-num>+{formatCurrency(m.valor)}</p>
                        ) : (
                          <p className="text-sm font-semibold text-[var(--color-ink)]" data-num>{m.valor > 0 ? formatCurrency(m.valor) : 'R$ 0,00'}</p>
                        )}
                        {m.saldo_apos != null && (
                          <p className="text-xs text-[var(--color-ink-muted)]" data-num>
                            {m.tipo === 'criacao' ? 'já guardado' : `total ${formatCurrency(m.saldo_apos)}`}
                          </p>
                        )}
                      </div>
                      {m.tipo === 'deposito' && m.id_transacao != null && (
                        <HoldToDelete
                          compact
                          label="Segure para apagar"
                          pending={removerDep.isPending && removerDep.variables === m.id_transacao}
                          onConfirm={() => removerDep.mutate(m.id_transacao!)}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="finance-card px-5 py-6 text-sm text-[var(--color-ink-muted)]">
            Ainda não há movimentos registrados nesta meta.
          </p>
        )}
      </section>

      <Sheet
        open={depositoAberto}
        onOpenChange={setDepositoAberto}
        title={'Depositar em ' + meta.titulo}
        onSubmit={() => valorDep && !depositoPassa && depositoMut.mutate(valorDep)}
        footer={
          <button type="submit" disabled={depositoMut.isPending || !valorDep || depositoPassa} className="btn-primary w-full py-3.5 text-sm disabled:opacity-60">
            {depositoMut.isPending ? <span className="spinner" aria-hidden /> : <PiggyBank size={16} />}
            {valorDep ? 'Depositar ' + formatCurrency(valorDep) : 'Depositar'}
          </button>
        }
      >
        <div className="rounded-xl bg-[var(--color-surface)] p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="text-[var(--color-ink-muted)]">Guardado</p>
            <p className="font-semibold text-[var(--color-ink)]" data-num>
              {formatCurrency(meta.valor_atual)} de {formatCurrency(meta.valor_meta)}
            </p>
          </div>
          {c.falta > 0 && (
            <button
              type="button"
              onClick={() => setValorDeposito(deNumero(c.falta))}
              className="shrink-0 rounded-full bg-gain-soft px-3 py-1.5 text-xs font-semibold text-gain"
            >
              Completar a meta ({formatCurrency(c.falta)})
            </button>
          )}
        </div>
        <AmountField
          id="dep-detalhe"
          label="Valor do depósito"
          value={valorDeposito}
          onChange={setValorDeposito}
          erro={depositoPassa ? `Passa do valor da meta. O máximo é ${formatCurrency(c.falta)}.` : undefined}
          autoFocus
        />
        <p className="text-xs text-[var(--color-ink-muted)]">O valor sai do seu saldo e entra na meta.</p>
        {depositoMut.isError && <p role="alert" className="text-sm text-loss">{(depositoMut.error as Error)?.message || 'Não deu para depositar. Tente de novo.'}</p>}
      </Sheet>
    </div>
  );
}

function Info({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <dt className="text-[var(--color-ink-muted)] shrink-0">{rotulo}</dt>
      <dd className="text-right font-medium text-[var(--color-ink)]" data-num>{children}</dd>
    </div>
  );
}

function MetaDetalhePage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MetaConteudo id={id} />
      </div>
    </div>
  );
}
