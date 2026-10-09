import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { cn } from '../lib/utils';

/*
 * Rosca e anel de progresso em CSS (conic-gradient + máscara radial), sem SVG.
 * hole = raio interno / raio externo.
 */
interface Segment {
  value: number;
  color: string;
}

function ringMask(hole: number) {
  const inner = `${(hole * 100).toFixed(2)}%`;
  const edge = `${(hole * 100 + 0.8).toFixed(2)}%`;
  return `radial-gradient(closest-side, transparent ${inner}, #000 ${edge})`;
}

export function DonutRing({
  segments,
  track = 'color-mix(in oklab, #10B981 10%, transparent)',
  hole = 0.62,
  className,
  label,
}: {
  segments: Segment[];
  track?: string;
  hole?: number;
  className?: string;
  label: string;
}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  // soma acumulada até o fim de cada segmento
  const fins = segments.reduce<number[]>((arr, s) => [...arr, (arr.at(-1) ?? 0) + s.value], []);
  const stops = segments.map((s, i) => {
    const from = ((i > 0 ? fins[i - 1] : 0) / total) * 100;
    const to = (fins[i] / total) * 100;
    return `${s.color} ${from.toFixed(3)}% ${to.toFixed(3)}%`;
  });
  const covered = ((fins.at(-1) ?? 0) / total) * 100;
  const gradient = `conic-gradient(${[...stops, `${track} ${covered.toFixed(3)}% 100%`].join(', ')})`;
  const mask = ringMask(hole);

  return (
    <motion.div
      role="img"
      aria-label={label}
      className={cn('shrink-0 rounded-full', className)}
      style={{ background: gradient, WebkitMask: mask, mask }}
      initial={{ opacity: 0, transform: 'scale(0.96)' }}
      animate={{ opacity: 1, transform: 'scale(1)' }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    />
  );
}

/*
 * Anel de progresso que enche. Frequência: ao abrir a tela e depois de um
 * depósito. Propósito: indicação de estado (mostra o quanto avançou), por isso
 * parte do valor anterior, não do zero. 900ms ease-out; reduced motion pula direto.
 */
export function ProgressRing({ pct, className, children }: { pct: number; className?: string; children?: React.ReactNode }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? clamped : 0);
  const background = useTransform(mv, (p) => `conic-gradient(#047857 0% ${p}%, var(--color-line) ${p}% 100%)`);
  const mask = ringMask(0.82);

  useEffect(() => {
    if (reduce) { mv.set(clamped); return; }
    const c = animate(mv, clamped, { duration: 0.9, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [clamped, reduce, mv]);

  return (
    <div className={cn('relative', className)}>
      <motion.div
        role="img"
        aria-label={`${clamped.toFixed(0)}% concluído`}
        className="h-full w-full rounded-full"
        style={{ background, WebkitMask: mask, mask }}
      />
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
