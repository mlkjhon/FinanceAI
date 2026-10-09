import type React from 'react';
import type { TooltipProps } from '../../lib/chart';
import { useEffect, useMemo, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCompactCurrency, cn } from '../../lib/utils';
import type { BlocoDe } from '../../lib/insights/types';
import { fmt } from '../../lib/insights/format';
import { useTema, type Tema } from '../../lib/theme';

/*
 * Paleta categórica validada (dataviz/validate_palette, modo claro: todas as
 * checagens bloqueantes passam). Slot 1 é o verde da marca. Amarelo e rosa
 * ficam abaixo de 3:1 com o fundo, por isso todo gráfico de categoria leva
 * rótulos visíveis (legenda com valores). Máximo de 6 + "Outros".
 */
// Claro (fundo #fcfcfb) e escuro (fundo #0f1613): os dois validados separadamente
const CATEGORICA = {
  light: ['#047857', '#2a78d6', '#eb6834', '#4a3aa7', '#eda100', '#e87ba4'],
  dark: ['#059669', '#3987e5', '#d95926', '#9085e9', '#c98500', '#d55181'],
};
const OUTROS = '#9ca3af';

// Pares (atual x anterior, gasto x limite) usam os slots 1 e 2: verde x cinza reprovou no teste de daltonismo
const corSerie = (i: number, tema: Tema) => CATEGORICA[tema][i % CATEGORICA[tema].length];

function TooltipBox({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-line)] rounded-[10px] px-3 py-2.5 shadow-md min-w-[150px]">
      <p className="text-xs text-[var(--color-ink-muted)] mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm py-0.5">
          <span className="w-2 h-2 rounded-[3px]" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--color-ink-soft)]">{p.name}</span>
          <span className="font-semibold text-[var(--color-ink)] ml-auto pl-3" data-num>{fmt(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

function Legenda({ series }: { series: { chave: string; rotulo: string }[] }) {
  const tema = useTema();
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-soft)] mt-3">
      {series.map((s, i) => (
        <span key={s.chave} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: corSerie(i, tema) }} />
          {s.rotulo}
        </span>
      ))}
    </div>
  );
}

const eixo = { fontSize: 11, fill: '#6b7280' };

export function ChartView({ data }: { data: BlocoDe<'chart'>['data'] }) {
  const reduce = useReducedMotion();
  const tema = useTema();
  if (data.subtipo === 'donut') return <Donut data={data} />;
  // Rótulos longos (estabelecimentos) não cabem no eixo X: barras deitadas
  const rotulosLongos = data.pontos.some((p) => String(p.rotulo).length > 10);
  if ((data.subtipo === 'bar' || data.subtipo === 'stacked') && rotulosLongos) return <BarrasDeitadas data={data} />;

  const anim = { isAnimationActive: !reduce, animationDuration: 700, animationEasing: 'ease-out' as const };
  const comum = (
    <>
      <CartesianGrid vertical={false} stroke="#eef2ef" />
      <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={eixo} dy={6} interval="preserveStartEnd" />
      <YAxis axisLine={false} tickLine={false} tick={eixo} tickFormatter={(v) => formatCompactCurrency(v)} width={56} />
      <Tooltip content={<TooltipBox />} cursor={data.subtipo === 'bar' || data.subtipo === 'stacked' ? { fill: '#f3f6f4' } : { stroke: '#047857', strokeWidth: 1 }} />
    </>
  );

  return (
    <div>
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          {data.subtipo === 'line' ? (
            <LineChart data={data.pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {comum}
              {data.series.map((s, i) => (
                <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.rotulo} stroke={corSerie(i, tema)} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: corSerie(i, tema) }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} {...anim} />
              ))}
            </LineChart>
          ) : data.subtipo === 'area' ? (
            <AreaChart data={data.pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {comum}
              {data.series.map((s, i) => (
                <Area key={s.chave} type="monotone" dataKey={s.chave} name={s.rotulo} stroke={corSerie(i, tema)} strokeWidth={2} fill={corSerie(i, tema)} fillOpacity={0.12} {...anim} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data.pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
              {comum}
              {data.series.map((s, i) => (
                <Bar
                  key={s.chave}
                  dataKey={s.chave}
                  name={s.rotulo}
                  stackId={data.subtipo === 'stacked' ? 'a' : undefined}
                  fill={corSerie(i, tema)}
                  radius={data.subtipo === 'stacked' && i < data.series.length - 1 ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  maxBarSize={44}
                  {...anim}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <Legenda series={data.series} />
    </div>
  );
}

/*
 * Donut que preenche: o ângulo visível vai de 0 a 360° em 900ms ease-out.
 * Hover/foco num item da legenda destaca o segmento (os outros recuam).
 */
function Donut({ data }: { data: BlocoDe<'chart'>['data'] }) {
  const reduce = useReducedMotion();
  const tema = useTema();
  const chave = data.series[0].chave;
  const itens = useMemo(() => {
    const todos = data.pontos.map((p) => ({ rotulo: String(p.rotulo), valor: Number(p[chave]) || 0 })).filter((p) => p.valor > 0);
    if (todos.length <= 6) return todos.map((t, i) => ({ ...t, cor: CATEGORICA[tema][i] }));
    const resto = todos.slice(5).reduce((s, t) => s + t.valor, 0);
    return [...todos.slice(0, 5).map((t, i) => ({ ...t, cor: CATEGORICA[tema][i] })), { rotulo: 'Outros', valor: resto, cor: OUTROS }];
  }, [data, chave, tema]);
  const total = itens.reduce((s, t) => s + t.valor, 0) || 1;
  const [ativo, setAtivo] = useState<number | null>(null);

  const [v, setV] = useState(reduce ? 100 : 0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, 100, { duration: 0.9, ease: [0.23, 1, 0.32, 1], onUpdate: setV });
    return () => c.stop();
  }, [reduce]);

  const fins = itens.reduce<number[]>((arr, t) => [...arr, (arr.at(-1) ?? 0) + t.valor], []);
  const background = (() => {
    const paradas = itens.map((t, i) => {
      const de = ((i > 0 ? fins[i - 1] : 0) / total) * v;
      const ate = (fins[i] / total) * v;
      const cor = ativo === null || ativo === i ? t.cor : `${t.cor}55`;
      // 0.4% de folga entre fatias = o "espaço de 2px" da skill
      return `${cor} ${de.toFixed(2)}% ${Math.max(de, ate - 0.4).toFixed(2)}%, var(--color-bg) ${Math.max(de, ate - 0.4).toFixed(2)}% ${ate.toFixed(2)}%`;
    });
    return `conic-gradient(${paradas.join(', ')}, var(--color-line) ${v}% 100%)`;
  })();
  const mascara = 'radial-gradient(closest-side, transparent 64%, #000 64.8%)';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        role="img"
        aria-label={itens.map((t) => `${t.rotulo} ${fmt((t.valor / total) * 100, 'pct')}`).join(', ')}
        className="w-36 h-36 shrink-0 rounded-full"
        style={{ background, WebkitMask: mascara, mask: mascara }}
      />
      <ul className="w-full space-y-1">
        {itens.map((t, i) => (
          <li
            key={t.rotulo}
            tabIndex={0}
            onMouseEnter={() => setAtivo(i)}
            onMouseLeave={() => setAtivo(null)}
            onFocus={() => setAtivo(i)}
            onBlur={() => setAtivo(null)}
            className={cn('flex items-center gap-2.5 text-sm rounded-md px-2 py-1 -mx-2 transition-opacity duration-150 outline-none focus-visible:bg-[var(--color-surface)]', ativo !== null && ativo !== i && 'opacity-45')}
          >
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: t.cor }} />
            <span className="text-[var(--color-ink-soft)] truncate">{t.rotulo}</span>
            <span className="ml-auto text-xs text-[var(--color-ink-muted)]" data-num>{fmt((t.valor / total) * 100, 'pct')}</span>
            <span className="w-24 text-right font-medium text-[var(--color-ink)]" data-num>{fmt(t.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/*
 * Barras horizontais para rótulos longos: o nome fica legível à esquerda, a barra
 * cresce da base (scaleX) em cascata e o valor fica escrito na ponta.
 */
function BarrasDeitadas({ data }: { data: BlocoDe<'chart'>['data'] }) {
  const tema = useTema();
  const max = Math.max(...data.pontos.flatMap((p) => data.series.map((s) => Number(p[s.chave]) || 0)), 1);
  return (
    <div>
      <ul className="space-y-2.5">
        {data.pontos.map((p, i) => (
          <li key={String(p.rotulo) + i} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm">
            <span className="truncate text-[var(--color-ink-soft)]" title={String(p.rotulo)}>{String(p.rotulo)}</span>
            <span className="space-y-1">
              {data.series.map((s, j) => {
                const v = Number(p[s.chave]) || 0;
                return (
                  <span key={s.chave} className="flex items-center gap-2">
                    <span className="flex-1 h-2.5 rounded-r-[4px] overflow-hidden">
                      <span
                        className="bar-x block h-full rounded-r-[4px]"
                        style={{ width: `${Math.max((v / max) * 100, 0.8)}%`, backgroundColor: corSerie(j, tema), ['--i' as string]: i } as React.CSSProperties}
                      />
                    </span>
                    <span className="w-24 shrink-0 text-right text-xs font-medium text-[var(--color-ink)]" data-num>{fmt(v)}</span>
                  </span>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
      <Legenda series={data.series} />
    </div>
  );
}
