import { useEffect, useRef } from 'react';
import * as m from 'motion/react-m';
import { animate, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ease } from '../../lib/motion-tokens';

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/*
 * M22: contador de números reais. O texto é derivado de um motion value,
 * então o React não re-renderiza a cada frame. Com reduced motion o valor
 * final aparece direto.
 */
export function Counter({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => integer.format(Math.round(v)));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.2, ease: ease.out });
    return () => controls.stop();
  }, [inView, reduce, value, mv]);

  return (
    <m.span ref={ref} data-num className={className}>
      {text}
    </m.span>
  );
}
