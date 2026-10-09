import { useRef, type ReactNode } from 'react';
import * as m from 'motion/react-m';
import {
  frame,
  stagger,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { duration, ease, physics, stagger as st } from '../../lib/motion-tokens';
import { Icon, type IconName } from '../icons';
import { SmartImage } from '../motion/smart-image';
import { SplitReveal } from '../motion/split-reveal';
import { useFinePointer } from '../motion/use-fine-pointer';
import { cn } from '../../lib/utils';

/* M20: o grid entra como um sistema, em cascata. */
const grid = {
  hidden: {},
  show: { transition: { delayChildren: stagger(st.items) } },
};
const cell = {
  hidden: { opacity: 0, transform: 'translateY(16px) scale(0.98)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px) scale(1)',
    transition: { duration: duration.revealShort, ease: ease.out },
  },
};

type Tone = 'accent' | 'image' | 'tint' | 'plain';

/* M21: tilt + spotlight, só com mouse e sem reduced motion. */
function TiltCell({ tone, children }: { tone: Tone; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const enabled = fine && !reduce;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [5, -5]), physics.tilt);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-5, 5]), physics.tilt);
  const glowTone = tone === 'accent' ? 'var(--color-finance-accent) 28%' : 'var(--color-accent) 16%';
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, color-mix(in oklab, ${glowTone}, transparent), transparent 70%)`;

  return (
    <m.div
      ref={ref}
      className={cn(
        'relative h-full overflow-hidden rounded-[var(--radius-card)] border',
        tone === 'accent' && 'on-dark border-transparent bg-[var(--color-accent)] text-white',
        tone === 'tint' && 'border-transparent bg-[color-mix(in_oklab,var(--color-finance-accent)_14%,var(--color-bg))]',
        tone === 'plain' && 'border-[var(--color-line)] bg-[var(--color-bg)]',
        tone === 'image' && 'border-[var(--color-line)] bg-[var(--color-bg)]',
      )}
      style={enabled ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      onPointerMove={(e) => {
        if (!enabled || !ref.current) return;
        const { clientX, clientY } = e;
        // Leitura e escrita em fases separadas do frame: sem reflow forçado.
        frame.read(() => {
          const r = ref.current!.getBoundingClientRect();
          frame.update(() => {
            px.set((clientX - r.left) / r.width - 0.5);
            py.set((clientY - r.top) / r.height - 0.5);
            mx.set(clientX - r.left);
            my.set(clientY - r.top);
          });
        });
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
        mx.set(-400);
        my.set(-400);
      }}
    >
      {enabled && (
        <m.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
      )}
      <div className="relative flex h-full flex-col">{children}</div>
    </m.div>
  );
}

function Copy({ icon, title, text, dark }: { icon: IconName; title: string; text: string; dark?: boolean }) {
  return (
    <div className="p-6 lg:p-8">
      <Icon name={icon} size={24} className={dark ? 'text-[var(--color-finance-accent)]' : 'text-[var(--color-accent)]'} />
      <h3 className={cn('mt-4 font-brand text-h3', dark ? 'text-white' : 'text-[var(--color-ink)]')}>{title}</h3>
      <p className={cn('mt-2 max-w-[42ch] text-body', dark ? 'text-white/90' : 'text-[var(--color-ink-soft)]')}>{text}</p>
    </div>
  );
}

export function FeatureBento() {
  return (
    <section id="recursos" aria-labelledby="recursos-title" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SplitReveal
          as="h2"
          id="recursos-title"
          text="Seis ferramentas que trabalham juntas"
          onScroll
          short
          className="max-w-3xl font-brand text-h2 text-[var(--color-ink)]"
        />
        <p className="measure mt-4 text-lead text-[var(--color-ink-soft)]">
          Cada lançamento alimenta o painel, os orçamentos e as metas ao mesmo tempo.
        </p>

        <m.ul
          variants={grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5 [perspective:900px]"
        >
          <m.li variants={cell} data-reveal className="md:col-span-2 lg:col-span-7 lg:row-span-2">
            <TiltCell tone="accent">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,color-mix(in_oklab,var(--color-finance-accent)_45%,transparent),transparent_55%)]"
              />
              <div className="relative mt-auto">
                <Copy
                  dark
                  icon="brain"
                  title="IA financeira"
                  text="A inteligência artificial analisa seus gastos e gera sugestões personalizadas para você economizar mais."
                />
              </div>
            </TiltCell>
          </m.li>

          <m.li variants={cell} data-reveal className="lg:col-span-5">
            <TiltCell tone="image">
              <SmartImage
                ratio="16 / 9"
                src="/images/bento-dashboard.webp"
                width={900}
                height={700}
                loading="lazy"
                decoding="async"
                alt="Notebook aberto sobre uma mesa clara"
              />
              <Copy icon="chart-bar" title="Dashboard completo" text="Saldo, entradas e saídas do mês em gráficos que você entende de relance." />
            </TiltCell>
          </m.li>

          <m.li variants={cell} data-reveal className="lg:col-span-5">
            <TiltCell tone="tint">
              <Copy icon="target" title="Metas personalizadas" text="Defina quanto quer juntar e até quando. O progresso aparece a cada depósito." />
            </TiltCell>
          </m.li>

          <m.li variants={cell} data-reveal className="lg:col-span-3">
            <TiltCell tone="plain">
              <Copy icon="shield-check" title="Acesso protegido" text="Login com token JWT e conexão criptografada com o servidor." />
            </TiltCell>
          </m.li>

          <m.li variants={cell} data-reveal className="lg:col-span-4">
            <TiltCell tone="tint">
              <Copy icon="wallet" title="Controle de orçamento" text="Limites por categoria, com aviso antes de você passar do valor." />
            </TiltCell>
          </m.li>

          <m.li variants={cell} data-reveal className="md:col-span-2 lg:col-span-5">
            <TiltCell tone="image">
              <div className="grid h-full sm:grid-cols-2 lg:grid-cols-1">
                <SmartImage
                  ratio="16 / 9"
                  src="/images/bento-tempo-real.webp"
                  width={900}
                  height={700}
                  loading="lazy"
                  decoding="async"
                  alt="Mão no mouse ao lado de um teclado"
                />
                <Copy icon="lightning" title="Transações na hora" text="Registre e categorize receitas e despesas em poucos toques." />
              </div>
            </TiltCell>
          </m.li>
        </m.ul>
      </div>
    </section>
  );
}
