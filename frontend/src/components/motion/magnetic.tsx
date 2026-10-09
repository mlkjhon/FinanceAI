import { useRef, type ReactNode } from 'react';
import * as m from 'motion/react-m';
import { frame, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { physics } from '../../lib/motion-tokens';
import { useFinePointer } from './use-fine-pointer';

const LIMIT = 8;

/*
 * M11: CTA magnético, usado uma única vez na página.
 * Desloca 25% da distância ao centro, limitado a ±8px, com spring física.
 * Desligado em toque e com reduced motion.
 */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const enabled = fine && !reduce;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, physics.pointer);
  const y = useSpring(rawY, physics.pointer);

  const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));

  return (
    <m.div
      ref={ref}
      className={className}
      style={enabled ? { x, y } : undefined}
      onPointerMove={(e) => {
        if (!enabled || !ref.current) return;
        const { clientX, clientY } = e;
        frame.read(() => {
          const r = ref.current!.getBoundingClientRect();
          const dx = clientX - (r.left + r.width / 2);
          const dy = clientY - (r.top + r.height / 2);
          frame.update(() => {
            rawX.set(clamp(dx * 0.25));
            rawY.set(clamp(dy * 0.25));
          });
        });
      }}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
