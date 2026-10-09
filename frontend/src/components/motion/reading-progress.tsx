import * as m from 'motion/react-m';
import { useScroll, useSpring } from 'motion/react';
import { physics } from '../../lib/motion-tokens';

/*
 * M05: barra de progresso de leitura. É informação, não decoração,
 * então continua ativa com reduced motion.
 */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, physics.indicator);

  return (
    <m.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[var(--z-progress)] h-[2px] bg-[var(--color-accent)]"
      style={{ scaleX, originX: 0 }}
    />
  );
}
