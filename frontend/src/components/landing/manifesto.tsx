import { useRef } from 'react';
import * as m from 'motion/react-m';
import { useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';

/*
 * M15: scroll word reveal. O momento em que o tipo é o protagonista da página.
 * Texto real, com a frase inteira no aria-label e cada palavra aria-hidden.
 * Espaços não separáveis evitam viúvas depois de palavras de uma letra.
 */
const TEXT =
  'Você não precisa de mais uma planilha. Precisa saber para onde vai o seu dinheiro, todo mês, sem esforço.';

function Word({ word, index, total, progress }: { word: string; index: number; total: number; progress: MotionValue<number> }) {
  const start = (index / (total - 1)) * 0.8;
  const opacity = useTransform(progress, [start, start + 0.2], [0.15, 1]);
  return (
    <m.span aria-hidden="true" style={{ opacity }}>
      {word}{' '}
    </m.span>
  );
}

export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const words = TEXT.split(' ');

  if (reduce) {
    return (
      <section ref={ref} aria-label="Manifesto" className="px-4 py-28 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-5xl font-brand text-display text-[var(--color-ink)]">{TEXT}</p>
      </section>
    );
  }

  return (
    <section ref={ref} aria-label="Manifesto" className="relative h-[200vh] px-4 sm:px-6 lg:h-[240vh] lg:px-8">
      <div className="sticky top-0 flex h-[100dvh] items-center">
        <p aria-label={TEXT} className="mx-auto max-w-5xl font-brand text-display text-[var(--color-ink)]">
          {words.map((w, i) => (
            <Word key={`${w}-${i}`} word={w} index={i} total={words.length} progress={scrollYProgress} />
          ))}
        </p>
      </div>
    </section>
  );
}
