import * as m from 'motion/react-m';
import { stagger } from 'motion/react';
import { ease, duration as dur, stagger as st } from '../../lib/motion-tokens';

/*
 * M01 / M14: clipped word reveal. Cada palavra sobe de translateY(110%) para 0
 * dentro de uma máscara overflow-hidden. Como a palavra nunca começa com
 * opacity 0, a headline do hero continua contando para o LCP.
 * Leitores de tela recebem a frase inteira via aria-label no pai.
 */
const container = (delay: number) => ({
  hidden: {},
  show: { transition: { delayChildren: stagger(st.words, { startDelay: delay }) } },
});

const makeWord = (seconds: number) => ({
  hidden: { transform: 'translateY(110%)' },
  show: { transform: 'translateY(0%)', transition: { duration: seconds, ease: ease.out } },
});

type Tag = 'h1' | 'h2' | 'p';

export function SplitReveal({
  text,
  as = 'h1',
  delay = 0,
  onScroll = false,
  short = false,
  className = '',
  id,
}: {
  text: string;
  as?: Tag;
  delay?: number;
  onScroll?: boolean;
  short?: boolean;
  className?: string;
  id?: string;
}) {
  const Comp = m[as];
  const words = text.split(' ');
  const word = makeWord(short ? dur.revealShort : dur.reveal);

  return (
    <Comp
      id={id}
      aria-label={text}
      className={className}
      data-reveal
      variants={container(delay)}
      initial="hidden"
      {...(onScroll
        ? { whileInView: 'show', viewport: { once: true, amount: 0.6 } }
        : { animate: 'show' })}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} aria-hidden="true">
          <span className="inline-block max-w-full overflow-hidden pb-[0.15em] -mb-[0.15em] align-top">
            <m.span className="inline-block max-w-full [overflow-wrap:anywhere]" variants={word}>
              {w}
            </m.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Comp>
  );
}
