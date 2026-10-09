import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AnimatedCounter } from '../ui';
import { ProgressRing } from '../ConicChart';
import { Icon } from '../icons';
import { cn } from '../../lib/utils';
import { ease } from '../../lib/motion-tokens';
import type { Bloco, BlocoDe } from '../../lib/insights/types';
import { ChartView } from './charts';
import { StreamText } from './primitives';
import { fmt, diaCurto } from '../../lib/insights/format';

// ---------- KPI ----------

// Para gastos, subir é ruim; para entradas e poupança, subir é bom
const SOBE_E_RUIM = ['saidas', 'gasto', 'total', 'projecao'];

function Kpi({ b }: { b: BlocoDe<'kpi'> }) {
  const { valor, formato, variacaoPct, campo } = b.data;
  const ruim = variacaoPct != null && (SOBE_E_RUIM.includes(campo || '') ? variacaoPct > 0 : variacaoPct < 0);
  return (
    <div>
      {formato === 'moeda' ? (
        <AnimatedCounter value={valor} isCurrency className="block text-3xl text-[var(--color-ink)]" />
      ) : (
        <span className="block font-brand font-bold tracking-tight text-3xl text-[var(--color-ink)]" data-num>
          <AnimatedCounter value={valor} className="text-inherit" />
          {formato === 'pct' ? '%' : ''}
        </span>
      )}
      {variacaoPct != null && (
        <p className={cn('mt-2 text-xs font-medium', ruim ? 'text-loss' : 'text-gain')} data-num>
          {variacaoPct > 0 ? '+' : ''}{formato === 'pct' ? `${variacaoPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : fmt(variacaoPct, 'pct')} <span className="font-normal text-[var(--color-ink-muted)]">vs. período anterior</span>
        </p>
      )}
    </div>
  );
}

// ---------- Tabela ordenável ----------

function Tabela({ b }: { b: BlocoDe<'table'> }) {
  const { colunas, linhas, destaque = [] } = b.data;
  const [ordem, setOrdem] = useState<{ chave: string; desc: boolean } | null>(null);
  const reduce = useReducedMotion();
  const destacadas = new Set(destaque.map((i) => linhas[i]));
  const ordenadas = useMemo(() => {
    if (!ordem) return linhas;
    return [...linhas].sort((a, c) => {
      const x = a[ordem.chave];
      const y = c[ordem.chave];
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR');
      return ordem.desc ? -r : r;
    });
  }, [linhas, ordem]);

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)]">
            {colunas.map((c, i) => {
              const ativa = ordem?.chave === c.chave;
              return (
                <th key={c.chave} className={cn('px-5 py-2 font-medium text-xs text-[var(--color-ink-muted)]', i === 0 ? 'text-left' : 'text-right')} aria-sort={ativa ? (ordem!.desc ? 'descending' : 'ascending') : 'none'}>
                  <button
                    type="button"
                    onClick={() => setOrdem((o) => (o?.chave === c.chave ? { chave: c.chave, desc: !o.desc } : { chave: c.chave, desc: c.formato !== 'texto' }))}
                    className={cn('inline-flex items-center gap-1 hover:text-[var(--color-ink)]', ativa && 'text-[var(--color-ink)]')}
                  >
                    {c.rotulo}
                    <span className="w-2 text-[10px]" aria-hidden>{ativa ? (ordem!.desc ? '↓' : '↑') : ''}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l, i) => (
            <motion.tr
              key={String(l[colunas[0].chave]) + i}
              layout={reduce ? false : 'position'}
              transition={{ duration: 0.22, ease: ease.out }}
              className={cn('border-b border-[var(--color-line)] last:border-0', destacadas.has(l) && 'bg-gain-soft')}
            >
              {colunas.map((c, j) => {
                const v = l[c.chave];
                return (
                  <td key={c.chave} className={cn('px-5 py-2.5', j === 0 ? 'text-left text-[var(--color-ink)] max-w-[14rem] truncate' : 'text-right text-[var(--color-ink-soft)]', destacadas.has(l) && 'font-semibold')} data-num={j > 0 || undefined}>
                    {v == null ? '—' : typeof v === 'number' ? fmt(v, c.formato) : String(v)}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Dica e desafio ----------

const NIVEL = {
  info: { rotulo: 'Dica', icone: 'lightbulb', cls: 'bg-[var(--color-ink)]/[0.05] text-[var(--color-ink-soft)]' },
  atencao: { rotulo: 'Atenção', icone: 'warning-circle', cls: 'bg-amber-500/10 text-amber-800' },
  oportunidade: { rotulo: 'Oportunidade', icone: 'sparkle', cls: 'bg-gain-soft text-gain' },
} as const;

function Dica({ b }: { b: BlocoDe<'tip'> | BlocoDe<'challenge'> }) {
  const n = NIVEL[b.data.nivel];
  const desafio = b.type === 'challenge';
  const [aceito, setAceito] = useState(false);
  return (
    <div className="flex flex-col gap-4 h-full">
      <span className={cn('self-start inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', desafio ? 'bg-[var(--color-ink)] text-white' : n.cls)}>
        <Icon name={desafio ? 'target' : n.icone} size={12} />
        {desafio ? `Desafio de ${b.data.duracaoDias} dias` : n.rotulo}
      </span>
      <StreamText text={b.data.texto} className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]" />
      {b.data.economia != null && (
        <div className="mt-auto pt-3 border-t border-[var(--color-line)] flex items-end justify-between gap-3">
          <div>
            <p className="metric-label">Economia estimada</p>
            <AnimatedCounter value={b.data.economia} isCurrency className="block text-xl text-gain" />
          </div>
          {desafio && (
            <button
              type="button"
              onClick={() => setAceito((a) => !a)}
              aria-pressed={aceito}
              className={cn('rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-150', aceito ? 'bg-gain-soft text-gain' : 'bg-[var(--color-ink)] text-white')}
            >
              {aceito ? <span className="pop-in inline-flex items-center gap-1" style={{ animationDelay: '0ms' }}><Icon name="check" size={12} /> Aceito</span> : 'Aceitar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Story: "seu período em 30 segundos" ----------

const DURACAO_SLIDE = 6000;

function Story({ b }: { b: BlocoDe<'story'> }) {
  const reduce = useReducedMotion();
  const { slides, kpis } = b.data;
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Avança sozinho; pausa com o mouse em cima ou foco dentro
  useEffect(() => {
    if (pausado || slides.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), DURACAO_SLIDE);
    return () => clearTimeout(t);
  }, [i, pausado, slides.length]);

  return (
    <div
      className="grid lg:grid-cols-[1fr_auto] gap-8 items-end"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div>
        {/* Barras de progresso dos slides (estilo stories) */}
        {slides.length > 1 && (
          <div className="flex gap-1.5 mb-6" role="tablist" aria-label="Partes do resumo">
            {slides.map((_, k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={`Parte ${k + 1}`}
                onClick={() => setI(k)}
                className="story-bar flex-1 h-1 rounded-full bg-white/25 overflow-hidden"
              >
                <span
                  key={k === i ? `on-${i}` : `off-${k}`}
                  className={cn('block h-full w-full bg-[#fff] rounded-full origin-left', k < i ? 'scale-x-100' : k === i ? (reduce ? 'scale-x-100' : 'story-fill') : 'scale-x-0')}
                  style={k === i && !reduce ? { animationDuration: `${DURACAO_SLIDE}ms`, animationPlayState: pausado ? 'paused' : 'running' } : undefined}
                />
              </button>
            ))}
          </div>
        )}
        <div className="min-h-[7.5rem] sm:min-h-[6.5rem] grid">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={i}
              initial={{ opacity: 0, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.25, ease: ease.out } }}
              exit={{ opacity: 0, filter: 'blur(2px)', transition: { duration: 0.15 } }}
              className="[grid-area:1/1] font-brand text-2xl sm:text-[1.875rem] leading-snug tracking-tight text-white max-w-[34ch] text-balance"
            >
              <StreamText text={slides[i]} />
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      {kpis.length > 0 && (
        <dl className="grid grid-cols-3 lg:grid-cols-1 gap-x-6 gap-y-4 lg:min-w-48 lg:border-l lg:border-white/20 lg:pl-8">
          {kpis.map((k) => (
            <div key={k.rotulo}>
              <dt className="text-xs text-white/70">{k.rotulo}</dt>
              <dd>
                {k.formato === 'moeda' ? (
                  <AnimatedCounter value={k.valor} isCurrency className="block text-lg sm:text-xl text-white" />
                ) : (
                  <span className="block font-brand font-bold text-lg sm:text-xl text-white" data-num>{fmt(k.valor, k.formato)}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// ---------- Anomalia ----------

function Anomalia({ b }: { b: BlocoDe<'anomaly'> }) {
  const { categoria, atual, media, variacaoPct, texto } = b.data;
  const max = Math.max(atual, media) || 1;
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-ink-soft)]">
        <span className="font-semibold text-[var(--color-ink)]">{categoria}</span> está{' '}
        <span className="font-semibold text-loss" data-num>{fmt(variacaoPct, 'pct')}</span> acima do normal.
      </p>
      <div className="space-y-2.5">
        {[
          { rotulo: 'Agora', valor: atual, cls: 'bg-[var(--color-finance-error)]/75' },
          { rotulo: 'Média', valor: media, cls: 'bg-[var(--color-ink)]/20' },
        ].map((r, i) => (
          <div key={r.rotulo} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-xs">
            <span className="text-[var(--color-ink-muted)]">{r.rotulo}</span>
            <span className="h-2 rounded-full bg-[var(--color-line)]/50 overflow-hidden">
              <span className={cn('bar-x block h-full rounded-full', r.cls)} style={{ width: `${(r.valor / max) * 100}%`, '--i': i } as React.CSSProperties} />
            </span>
            <span className="font-medium text-[var(--color-ink)] w-24 text-right" data-num>{fmt(r.valor)}</span>
          </div>
        ))}
      </div>
      {texto && <StreamText text={texto} className="block text-sm text-[var(--color-ink-muted)]" />}
    </div>
  );
}

// ---------- Projeção ----------

function Projecao({ b }: { b: BlocoDe<'forecast'> }) {
  const { gastoAteHoje, projecao, mediaAnteriores, diferenca, diasPassados, diasNoMes, texto } = b.data;
  const max = Math.max(projecao, mediaAnteriores) * 1.08 || 1;
  const acima = diferenca > 0;
  return (
    <div className="space-y-4">
      <div>
        <p className="metric-label">No ritmo atual, o mês fecha em</p>
        <AnimatedCounter value={projecao} isCurrency className="block text-2xl text-[var(--color-ink)]" />
        <p className={cn('text-xs mt-1 font-medium', acima ? 'text-loss' : 'text-gain')} data-num>
          {acima ? '+' : '-'}{fmt(Math.abs(diferenca))} {acima ? 'acima' : 'abaixo'} da sua média
        </p>
      </div>
      {/* Trilho: gasto até hoje (sólido), projeção (claro) e a média (marca) */}
      <div className="relative h-3 rounded-full bg-[var(--color-line)]/50 overflow-visible">
        <span className="bar-x absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]/25" style={{ width: `${(projecao / max) * 100}%` }} />
        <span className="bar-x absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]" style={{ width: `${(gastoAteHoje / max) * 100}%`, '--i': 1 } as React.CSSProperties} />
        <span className="absolute -top-1 -bottom-1 w-0.5 rounded bg-[var(--color-ink)]" style={{ left: `${(mediaAnteriores / max) * 100}%` }} aria-hidden />
      </div>
      <div className="flex justify-between text-xs text-[var(--color-ink-muted)]" data-num>
        <span>{fmt(gastoAteHoje)} em {diasPassados} de {diasNoMes} dias</span>
        <span>média {fmt(mediaAnteriores)}</span>
      </div>
      {texto && <StreamText text={texto} className="block text-sm text-[var(--color-ink-muted)]" />}
    </div>
  );
}

// ---------- Meta ----------

function Meta({ b }: { b: BlocoDe<'goal'> }) {
  const d = b.data;
  if (d.sugestao) {
    return (
      <div className="space-y-3">
        <StreamText text={d.texto} className="block text-[15px] leading-relaxed text-[var(--color-ink-soft)]" />
        <div>
          <p className="metric-label">Valor sugerido</p>
          <AnimatedCounter value={d.valorSugerido} isCurrency className="block text-xl text-gain" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-5">
      <ProgressRing pct={d.pct} className="w-24 h-24 shrink-0">
        <span className="font-brand font-bold text-base text-[var(--color-ink)]"><AnimatedCounter value={d.pct} className="text-inherit" />%</span>
      </ProgressRing>
      <div className="min-w-0 space-y-1">
        {d.titulo !== b.title && <p className="font-semibold text-[var(--color-ink)] truncate">{d.titulo}</p>}
        <p className="text-sm text-[var(--color-ink-soft)]" data-num>{fmt(d.valorAtual)} de {fmt(d.valorMeta)}</p>
        <p className="text-xs text-[var(--color-ink-muted)]" data-num>Faltam {fmt(d.falta)}{d.dataObjetivo ? ` até ${diaCurto(d.dataObjetivo)}` : ''}</p>
        {d.texto && <StreamText text={d.texto} className="block text-xs text-[var(--color-ink-muted)] pt-1" />}
      </div>
    </div>
  );
}

// ---------- Comparativo ----------

function Comparativo({ b }: { b: BlocoDe<'comparison'> }) {
  const { linhas, periodoA, periodoB, texto } = b.data;
  const max = Math.max(...linhas.map((l) => Math.abs(l.diferenca)), 1);
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--color-ink-muted)]" data-num>
        {diaCurto(periodoA.inicio)} a {diaCurto(periodoA.fim)} contra {diaCurto(periodoB.inicio)} a {diaCurto(periodoB.fim)}
      </p>
      <ul className="space-y-2.5">
        {linhas.map((l, i) => {
          const subiu = l.diferenca > 0;
          const largura = `${(Math.abs(l.diferenca) / max) * 50}%`;
          return (
            <li key={l.categoria} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate text-[var(--color-ink-soft)]">{l.categoria}</span>
              {/* Barra divergente: gastar mais vai para a direita (vermelho), menos para a esquerda (verde) */}
              <span className="relative h-2" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--color-ink)]/25" />
                <span
                  className={cn('bar-x absolute inset-y-0 rounded-full', subiu ? 'left-1/2 bg-[var(--color-finance-error)]/70' : 'right-1/2 bg-[var(--color-accent)]')}
                  style={{ width: largura, transformOrigin: subiu ? 'left' : 'right', '--i': i } as React.CSSProperties}
                />
              </span>
              <span className={cn('w-24 text-right text-xs font-semibold', subiu ? 'text-loss' : 'text-gain')} data-num>
                {subiu ? '+' : '-'}{fmt(Math.abs(l.diferenca))}
              </span>
            </li>
          );
        })}
      </ul>
      {texto && <StreamText text={texto} className="block text-sm text-[var(--color-ink-muted)]" />}
    </div>
  );
}

// ---------- Registro tipo -> componente ----------

export function BlocoConteudo({ bloco }: { bloco: Bloco }) {
  switch (bloco.type) {
    case 'kpi': return <Kpi b={bloco} />;
    case 'chart': return <ChartView data={bloco.data} />;
    case 'table': return <Tabela b={bloco} />;
    case 'tip':
    case 'challenge': return <Dica b={bloco} />;
    case 'story': return <Story b={bloco} />;
    case 'anomaly': return <Anomalia b={bloco} />;
    case 'forecast': return <Projecao b={bloco} />;
    case 'goal': return <Meta b={bloco} />;
    case 'comparison': return <Comparativo b={bloco} />;
  }
}
