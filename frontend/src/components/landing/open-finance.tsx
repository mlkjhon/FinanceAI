import { useRef } from 'react';
import * as m from 'motion/react-m';
import { useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Counter } from '../motion/counter';
import { SmartImage } from '../motion/smart-image';
import { SplitReveal } from '../motion/split-reveal';

/*
 * Números reais, tirados do código do app (taste §4.9: nada inventado):
 * 16 indexadores e 13 tipos de investimento em src/routes/investimentos/index.tsx,
 * 6 módulos na navegação do app (Dashboard, Transações, Orçamentos, Metas, Investimentos, Insights).
 */
const stats = [
  { value: 16, label: 'indexadores para acompanhar seus investimentos' },
  { value: 13, label: 'tipos de investimento, do CDB às criptomoedas' },
  { value: 6, label: 'módulos ligados aos mesmos lançamentos' },
];

export function OpenFinance() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // M19: a imagem-chave abre do centro para as bordas conforme o scroll.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const clipPath = useTransform(scrollYProgress, [0, 1], ['inset(0% 50% 0% 50%)', 'inset(0% 0% 0% 0%)']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <section aria-labelledby="open-finance-title" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div ref={ref} className="overflow-hidden rounded-[var(--radius-card)]">
          <m.div data-reveal style={reduce ? undefined : { clipPath }}>
            <m.div style={reduce ? undefined : { scale }}>
              <SmartImage
                ratio="16 / 9"
                src="/images/open-finance-1600.webp"
                srcSet="/images/open-finance-900.webp 900w, /images/open-finance-1600.webp 1600w"
                sizes="(min-width: 1280px) 1216px, 100vw"
                width={1600}
                height={900}
                loading="lazy"
                decoding="async"
                alt="Duas pessoas à mesa com celular, tablet e caderno"
              />
            </m.div>
          </m.div>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[6fr_6fr] lg:gap-16">
          <div>
            <SplitReveal
              as="h2"
              id="open-finance-title"
              text="Conecte seus bancos pelo Open Finance"
              onScroll
              short
              className="font-brand text-h2 text-[var(--color-ink)]"
            />
            <p className="measure mt-5 text-lead text-[var(--color-ink-soft)]">
              A conexão é feita pela Pluggy e traz suas transações para o FinanceAI. Prefere não conectar? Cadastre contas e lançamentos à mão.
            </p>
          </div>

          <dl className="grid content-start gap-8 sm:grid-cols-3 lg:grid-cols-1 lg:gap-6">
            {stats.map((s) => (
              <div key={s.label} className="border-t border-[var(--color-line)] pt-5 lg:grid lg:grid-cols-[7rem_1fr] lg:items-baseline lg:gap-6">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-brand text-h2 text-[var(--color-accent)]">
                  <Counter value={s.value} />
                </dd>
                <dd className="mt-1 text-body text-[var(--color-ink-soft)] lg:mt-0">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
