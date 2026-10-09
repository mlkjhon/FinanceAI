import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence, animate, frame, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react';
import { ease, physics, project } from '../../lib/motion-tokens';
import { Icon } from '../icons';
import { SplitReveal } from '../motion/split-reveal';

/*
 * Depoimentos preservados do site original. Atribuição com nome e cargo;
 * empresa não informada na fonte, então não foi inventada.
 */
const testimonials = [
  { name: 'Ana Paula M.', initials: 'AP', role: 'Designer UX', text: 'Consegui quitar minhas dívidas em 6 meses usando as recomendações da IA. Incrível!' },
  { name: 'Lucas Oliveira', initials: 'LO', role: 'Engenheiro de Software', text: 'O dashboard é lindo e funcional. Finalmente entendo para onde vai meu dinheiro.' },
  { name: 'Maria Clara S.', initials: 'MC', role: 'Professora', text: 'As metas me mantêm motivada. A barra de progresso me faz querer economizar mais todo mês.' },
];

const caption = {
  enter: (d: number) => ({ opacity: 0, transform: `translateX(${d * 24}px)` }),
  center: { opacity: 1, transform: 'translateX(0px)' },
  exit: (d: number) => ({ opacity: 0, transform: `translateX(${d * -24}px)` }),
};

export function Testimonials() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const n = testimonials.length;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () =>
      frame.read(() => {
        const w = el.clientWidth;
        frame.update(() => setWidth(w));
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ao redimensionar, reposiciona sem animar.
  useEffect(() => {
    x.set(-index * width);
  }, [width]);

  const goTo = (next: number, velocity = 0, instant = false) => {
    const clamped = Math.max(0, Math.min(n - 1, next));
    setDir(clamped >= index ? 1 : -1);
    setIndex(clamped);
    const target = -clamped * width;
    // Ação de teclado não anima (emil-design-eng §1); reduced motion também não.
    if (reduce || instant) {
      x.set(target);
      return;
    }
    // Spring física: herda a velocidade do dedo (apple-design §5).
    animate(x, target, { ...physics.momentum, velocity });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!width) return;
    // apple-design §6: projeta onde o gesto iria parar e escolhe o snap mais próximo.
    const projected = x.get() + project(info.velocity.x);
    goTo(Math.round(-projected / width), info.velocity.x);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1, 0, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1, 0, true);
    }
  };

  const current = testimonials[index];

  return (
    <section aria-labelledby="depoimentos-title" className="bg-[var(--color-surface)] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-4xl">
        <SplitReveal
          as="h2"
          id="depoimentos-title"
          text="O que nossos usuários dizem"
          onScroll
          short
          className="font-brand text-h2 text-[var(--color-ink)]"
        />

        <div
          role="region"
          aria-roledescription="carrossel"
          aria-label="Depoimentos"
          tabIndex={0}
          onKeyDown={onKey}
          className="mt-12 rounded-[var(--radius-card)]"
        >
          <div ref={viewportRef} className="overflow-hidden">
            <m.div
              className="flex cursor-grab touch-pan-y active:cursor-grabbing"
              style={{ x }}
              drag="x"
              dragConstraints={{ left: -(n - 1) * width, right: 0 }}
              dragElastic={0.12}
              dragMomentum={false}
              onDragEnd={onDragEnd}
            >
              {testimonials.map((t, i) => (
                <div
                  key={t.name}
                  className="w-full shrink-0 select-none pr-6"
                  aria-hidden={i !== index}
                  role="group"
                  aria-roledescription="depoimento"
                  aria-label={`${i + 1} de ${n}`}
                >
                  <blockquote className="font-brand text-h3 font-medium md:text-h2 text-[var(--color-ink)]">
                    “{t.text}”
                  </blockquote>
                </div>
              ))}
            </m.div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
            <div className="relative min-h-14 w-full sm:w-auto sm:flex-1">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <m.div
                  key={current.name}
                  custom={dir}
                  variants={caption}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: ease.out }}
                  className="flex items-center gap-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-accent)] font-brand text-small font-bold text-white"
                  >
                    {current.initials}
                  </span>
                  <span>
                    <span className="block font-semibold text-[var(--color-ink)]">{current.name}</span>
                    <span className="block text-small text-[var(--color-ink-muted)]">{current.role}</span>
                  </span>
                </m.div>
              </AnimatePresence>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="mr-2 text-small text-[var(--color-ink-muted)]" data-num aria-live="polite">
                {index + 1} de {n}
              </span>
              <button
                type="button"
                aria-label="Depoimento anterior"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] disabled:opacity-40"
              >
                <Icon name="arrow-left" size={18} />
              </button>
              <button
                type="button"
                aria-label="Próximo depoimento"
                onClick={() => goTo(index + 1)}
                disabled={index === n - 1}
                className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] disabled:opacity-40"
              >
                <Icon name="arrow-right" size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
