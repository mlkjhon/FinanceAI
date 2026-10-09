import { motion } from 'motion/react';
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
  let acc = 0;
  const stops = segments.map((s) => {
    const from = (acc / total) * 100;
    acc += s.value;
    const to = (acc / total) * 100;
    return `${s.color} ${from.toFixed(3)}% ${to.toFixed(3)}%`;
  });
  const covered = (acc / total) * 100;
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

export function ProgressRing({ pct, className, children }: { pct: number; className?: string; children?: React.ReactNode }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn('relative', className)}>
      <DonutRing
        className="h-full w-full"
        hole={0.82}
        track="#E5E7EB"
        segments={[{ value: clamped, color: '#10B981' }, { value: 100 - clamped, color: '#E5E7EB' }]}
        label={`${clamped.toFixed(0)}% concluído`}
      />
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
