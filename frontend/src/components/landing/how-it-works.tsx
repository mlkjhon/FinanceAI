import { useRef, useState } from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence, LayoutGroup, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ease, spring } from '../../lib/motion-tokens';
import { SmartImage } from '../motion/smart-image';
import { SplitReveal } from '../motion/split-reveal';
import { cn } from '../../lib/utils';

const steps = [
  {
    title: 'Crie sua conta',
    desc: 'Cadastro rápido em segundos, sem burocracia.',
    img: '/images/step-conta.webp',
    alt: 'Pessoa digitando no notebook em uma mesa de madeira',
  },
  {
    title: 'Adicione suas transações',
    desc: 'Importe ou registre seus gastos e receitas por categoria.',
    img: '/images/step-transacoes.webp',
    alt: 'Mão anotando gastos em um caderno ao lado do notebook',
  },
  {
    title: 'Deixe a IA trabalhar',
    desc: 'Receba insights, previsões e dicas personalizadas baseadas no seu perfil financeiro.',
    img: '/images/step-ia.webp',
    alt: 'Notebook aberto ao lado de um caderno com anotações',
  },
];

/* M17: crossfade com ponte de blur, para não parecer dois objetos sobrepostos. */
function StepMedia({ index }: { index: number }) {
  const s = steps[index];
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]">
      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={s.img}
          className="absolute inset-0"
          initial={{ opacity: 0, filter: 'blur(6px)', transform: 'scale(1.03)' }}
          animate={{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease: ease.out }}
        >
          <SmartImage ratio="4 / 3" src={s.img} width={960} height={720} loading="lazy" decoding="async" alt={s.alt} />
        </m.div>
      </AnimatePresence>
    </div>
  );
}

/* M16: narrativa sticky. Só no desktop; no mobile vira lista empilhada. */
function StickyNarrative() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const n = steps.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(n - 1, Math.floor(p * n));
    if (next !== active) setActive(next);
  });

  return (
    <div ref={ref} className="relative hidden lg:block" style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 grid h-[100dvh] grid-cols-[5fr_7fr] items-center gap-16">
        <LayoutGroup>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li
                key={s.title}
                aria-current={i === active ? 'step' : undefined}
                className={cn(
                  'relative py-5 pl-8 transition-opacity duration-300 ease-[var(--ease-out)]',
                  i === active ? 'opacity-100' : 'opacity-40',
                )}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-[var(--color-line)]" />
                {i === active && (
                  <m.span
                    layoutId="step-indicator"
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-[var(--color-accent)]"
                    transition={spring.snappy}
                  />
                )}
                <h3 className="font-brand text-h3 text-[var(--color-ink)]">{s.title}</h3>
                <p className="mt-2 max-w-[40ch] text-body text-[var(--color-ink-soft)]">{s.desc}</p>
              </li>
            ))}
          </ol>
        </LayoutGroup>
        <StepMedia index={active} />
      </div>
    </div>
  );
}

function StackedSteps() {
  return (
    <ol className="space-y-12 lg:hidden">
      {steps.map((s) => (
        <li key={s.title}>
          <SmartImage
            ratio="4 / 3"
            frameClassName="rounded-[var(--radius-card)]"
            src={s.img}
            width={960}
            height={720}
            loading="lazy"
            decoding="async"
            alt={s.alt}
          />
          <h3 className="mt-6 font-brand text-h3 text-[var(--color-ink)]">{s.title}</h3>
          <p className="mt-2 text-body text-[var(--color-ink-soft)]">{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}

export function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-24 px-4 pt-24 sm:px-6 lg:px-8 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <SplitReveal
          as="h2"
          id="como-funciona-title"
          text="Como funciona"
          onScroll
          short
          className="font-brand text-h2 text-[var(--color-ink)]"
        />
        <div className="mt-12 pb-24 lg:mt-0 lg:pb-0">
          {reduce ? (
            <ol className="hidden gap-10 lg:grid lg:grid-cols-3 lg:pt-12 lg:pb-32">
              {steps.map((s) => (
                <li key={s.title}>
                  <SmartImage ratio="4 / 3" frameClassName="rounded-[var(--radius-card)]" src={s.img} width={960} height={720} loading="lazy" alt={s.alt} />
                  <h3 className="mt-6 font-brand text-h3">{s.title}</h3>
                  <p className="mt-2 text-body text-[var(--color-ink-soft)]">{s.desc}</p>
                </li>
              ))}
            </ol>
          ) : (
            <StickyNarrative />
          )}
          <StackedSteps />
        </div>
      </div>
    </section>
  );
}
