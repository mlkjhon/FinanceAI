import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import * as m from 'motion/react-m';
import { stagger, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ease, stagger as st } from '../../lib/motion-tokens';
import { SplitReveal } from '../motion/split-reveal';
import { Magnetic } from '../motion/magnetic';
import { SmartImage } from '../motion/smart-image';

/*
 * Timeline do carregamento (um único momento, até 1,2s):
 * t=0 header estático | 0,05s headline (M01) | 0,10s mídia (M03) | 0,35s subtexto e CTAs (M02).
 * CTAs são clicáveis desde t=0.
 */
const cascade = {
  hidden: {},
  show: { transition: { delayChildren: stagger(st.items, { startDelay: 0.35 }) } },
};
const rise = {
  hidden: { opacity: 0, transform: 'translateY(12px)', filter: 'blur(4px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: ease.out },
  },
};

const RADIUS = '16px';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // M04: saída do hero ligada ao scroll (mapa múltiplo do useTransform).
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const textY = useTransform(scrollYProgress, [0, 0.6], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pb-20"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16">
        <m.div style={reduce ? undefined : { y: textY, opacity: textOpacity }}>
          <SplitReveal
            id="hero-title"
            text="Controle suas finanças com inteligência"
            delay={0.05}
            className="font-brand text-display text-[var(--color-ink)]"
          />

          <m.div variants={cascade} initial="hidden" animate="show" data-reveal>
            <m.p variants={rise} data-reveal className="measure mt-6 text-lead text-[var(--color-ink-soft)]">
              O FinanceAI lê seus gastos, aponta onde dá para economizar e acompanha cada meta até você chegar lá.
            </m.p>

            <m.div variants={rise} data-reveal className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Magnetic className="w-full sm:w-auto">
                <Link
                  to="/auth"
                  aria-label="Começar gratuitamente"
                  className="cta pressable flex items-center justify-center rounded-full bg-[var(--color-accent)] px-8 py-4 text-base font-semibold text-white shadow-lg"
                >
                  <span className="roll">
                    <span aria-hidden="true">Começar gratuitamente</span>
                    <span aria-hidden="true">Começar gratuitamente</span>
                  </span>
                </Link>
              </Magnetic>
              <a
                href="#modulos"
                className="pressable flex items-center justify-center rounded-full border border-[var(--color-line)] px-8 py-4 text-base font-semibold text-[var(--color-ink)] transition-[border-color,color] duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Ver demonstração
              </a>
            </m.div>
          </m.div>
        </m.div>

        {/* M03: curtain reveal parcial. Começa 88% visível para não atrasar o LCP. */}
        <m.div style={reduce ? undefined : { scale: mediaScale }} className="relative">
          <m.div
            data-reveal
            className="overflow-hidden"
            style={{ borderRadius: RADIUS }}
            initial={{ clipPath: `inset(6% 6% 6% 6% round ${RADIUS})` }}
            animate={{ clipPath: `inset(0% 0% 0% 0% round ${RADIUS})` }}
            transition={{ duration: 1, ease: ease.inOut, delay: 0.1 }}
          >
            <m.div
              initial={{ transform: 'scale(1.12)' }}
              animate={{ transform: 'scale(1)' }}
              transition={{ duration: 1.4, ease: ease.out, delay: 0.1 }}
            >
              <SmartImage
                ratio="4 / 5"
                src="/images/hero-640.webp"
                srcSet="/images/hero-640.webp 640w, /images/hero-1120.webp 1120w"
                sizes="(min-width: 1024px) 40vw, 100vw"
                width={640}
                height={800}
                fetchPriority="high"
                decoding="async"
                alt="Pessoa conferindo o saldo no celular ao lado do notebook"
              />
            </m.div>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
