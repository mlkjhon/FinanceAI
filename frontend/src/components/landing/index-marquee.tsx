import { useEffect, useRef, useState } from 'react';
import * as m from 'motion/react-m';
import {
  inView,
  usePageInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';

/*
 * O único marquee da página (taste §5). Em vez de logos de clientes inventados,
 * mostra os indexadores reais que a tela de Investimentos aceita
 * (src/routes/investimentos/index.tsx, INDEXADORES).
 */
const indexadores = [
  'Prefixado', 'CDI', 'Selic', 'IPCA', 'IGP-M', 'INPC', 'TR', 'Poupança',
  'Ibovespa', 'TLP', 'TJLP', 'TBF', 'PTAX', 'IMA-B', 'IRF-M', 'IDA',
];

function Item({ label }: { label: string }) {
  const isAcronym = label === label.toUpperCase();
  return (
    <li className="pr-12 lg:pr-16">
      <span
        className={
          'font-brand text-h3 font-medium text-[var(--color-ink)]' + (isAcronym ? ' acronym' : '')
        }
      >
        {label}
      </span>
    </li>
  );
}

export function IndexMarquee() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const pageVisible = usePageInView();

  // M12: o loop só roda com a seção na tela e a aba visível.
  useEffect(() => {
    if (!wrapRef.current) return;
    return inView(wrapRef.current, () => {
      setVisible(true);
      return () => setVisible(false);
    });
  }, []);

  // M13: skew pela velocidade do scroll.
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const skewX = useSpring(useTransform(velocity, [-2000, 0, 2000], [-6, 0, 6]), {
    stiffness: 300,
    damping: 40,
  });

  return (
    <section aria-labelledby="indexadores-title" className="border-y border-[var(--color-line)] py-10 lg:py-14">
      <h2 id="indexadores-title" className="mx-auto mb-8 max-w-7xl px-4 text-small text-[var(--color-ink-muted)] sm:px-6 lg:px-8">
        Indexadores que você acompanha nos seus investimentos
      </h2>

      {reduce ? (
        <ul className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-3 px-4 sm:px-6 lg:px-8">
          {indexadores.map((i) => (
            <li key={i} className={'font-brand text-h3 font-medium' + (i === i.toUpperCase() ? ' acronym' : '')}>
              {i}
            </li>
          ))}
        </ul>
      ) : (
        <div ref={wrapRef} className="marquee overflow-hidden">
          <m.div style={{ skewX }}>
            <div className={'marquee-track' + (visible && pageVisible ? ' is-running' : '')}>
              <ul className="flex">
                {indexadores.map((i) => (
                  <Item key={i} label={i} />
                ))}
              </ul>
              <ul className="flex" aria-hidden="true">
                {indexadores.map((i) => (
                  <Item key={`dup-${i}`} label={i} />
                ))}
              </ul>
            </div>
          </m.div>
        </div>
      )}
    </section>
  );
}
