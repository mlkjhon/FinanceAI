import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig, domMax } from 'motion/react';
import { spring } from '../../lib/motion-tokens';

/*
 * Provider da landing. LazyMotion strict obriga o uso de <m.*> (bundle menor)
 * e MotionConfig reducedMotion="user" desliga transform/layout para quem
 * pede menos movimento, mantendo opacity e cor.
 * Motion values ligados a style (parallax, magnético, tilt) não são cobertos
 * por essa flag: cada componente usa useReducedMotion() para esses casos.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={spring.ui}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
