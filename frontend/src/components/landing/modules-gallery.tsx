import { useEffect, useRef } from 'react';
import * as m from 'motion/react-m';
import { frame, useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { SmartImage } from '../motion/smart-image';
import { SplitReveal } from '../motion/split-reveal';

/*
 * Os seis módulos do app (rotas reais). As fotos são provisórias:
 * devem ser trocadas por capturas de tela reais de cada tela.
 */
const modules = [
  { title: 'Dashboard', text: 'Saldo, entradas e saídas do mês em um só painel.', img: '/images/modulo-dashboard.webp', alt: 'Notebook sobre mesa de madeira com caderno e café' },
  { title: 'Transações', text: 'Busca, filtros e edição de cada lançamento.', img: '/images/modulo-transacoes.webp', alt: 'Mesa de trabalho com monitor, teclado e tablet' },
  { title: 'Orçamentos', text: 'Limite por categoria e alerta perto do teto.', img: '/images/modulo-orcamentos.webp', alt: 'Mesa com papéis, lápis de cor e celular' },
  { title: 'Metas', text: 'Quanto falta, até quando e quanto guardar por mês.', img: '/images/modulo-metas.webp', alt: 'Relógio analógico em preto e branco' },
  { title: 'Investimentos', text: 'Aportes, resgates e rendimento por indexador.', img: '/images/modulo-investimentos.webp', alt: 'Carteira, relógio e celular organizados sobre a mesa' },
  { title: 'Insights IA', text: 'Sugestões da IA com base nos seus próprios gastos.', img: '/images/modulo-insights.webp', alt: 'Notebook em uma escrivaninha junto à janela' },
];

function Card({ mod, eager }: { mod: (typeof modules)[number]; eager?: boolean }) {
  return (
    <article className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[30vw] xl:w-[26rem]">
      <SmartImage
        ratio="9 / 11"
        frameClassName="rounded-[var(--radius-card)]"
        src={mod.img}
        width={900}
        height={1100}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        alt={mod.alt}
      />
      <h3 className="mt-5 font-brand text-h3 text-[var(--color-ink)]">{mod.title}</h3>
      <p className="mt-1 text-body text-[var(--color-ink-soft)]">{mod.text}</p>
    </article>
  );
}

/* M18: pan horizontal com sticky nativo + useScroll (sem GSAP). */
function PinnedPan() {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const distance = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const x = useTransform(() => -scrollYProgress.get() * distance.get());

  useEffect(() => {
    const measure = () =>
      frame.read(() => {
        const track = trackRef.current;
        if (!track) return;
        const d = Math.max(0, track.scrollWidth - window.innerWidth);
        frame.update(() => distance.set(d));
      });
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [distance]);

  return (
    <div ref={ref} className="relative hidden h-[300vh] lg:block">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <m.div ref={trackRef} style={{ x }} className="flex gap-6 pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-8">
          {modules.map((mod) => (
            <Card key={mod.title} mod={mod} />
          ))}
        </m.div>
      </div>
    </div>
  );
}

function SnapRow({ forceVisible = false }: { forceVisible?: boolean }) {
  return (
    <div
      className={
        'flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-6 sm:px-6 [scrollbar-width:thin]' +
        (forceVisible ? '' : ' lg:hidden')
      }
    >
      {modules.map((mod, i) => (
        <Card key={mod.title} mod={mod} eager={i === 0} />
      ))}
    </div>
  );
}

export function ModulesGallery() {
  const reduce = useReducedMotion();
  return (
    <section id="modulos" aria-labelledby="modulos-title" className="scroll-mt-24 pt-24 lg:pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SplitReveal
          as="h2"
          id="modulos-title"
          text="Os módulos do FinanceAI"
          onScroll
          short
          className="font-brand text-h2 text-[var(--color-ink)]"
        />
        <p className="measure mt-4 text-lead text-[var(--color-ink-soft)]">
          Um lançamento feito em Transações já aparece no Dashboard, nos Orçamentos e nas Metas.
        </p>
      </div>
      <div className="mt-12 lg:mt-0">
        {reduce ? (
          <SnapRow forceVisible />
        ) : (
          <>
            <PinnedPan />
            <SnapRow />
          </>
        )}
      </div>
    </section>
  );
}
