import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { ease, spring } from '../../lib/motion-tokens';
import { Icon } from '../icons';
import { SplitReveal } from '../motion/split-reveal';
import { cn } from '../../lib/utils';

/*
 * Simulador de juros compostos. A taxa é ilustrativa e está rotulada como tal
 * (taste §4.9: número de exemplo explícito, nunca promessa de rendimento).
 */
const RATE = 0.1; // 10% ao ano, exemplo
const YEARS = 5;
const MAX = 1_000_000;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type Freq = 'mensal' | 'anual';
const freqs: { id: Freq; label: string }[] = [
  { id: 'mensal', label: 'Por mês' },
  { id: 'anual', label: 'Por ano' },
];

function futureValue(deposit: number, freq: Freq) {
  if (freq === 'anual') {
    return deposit * ((Math.pow(1 + RATE, YEARS) - 1) / RATE);
  }
  const i = Math.pow(1 + RATE, 1 / 12) - 1;
  const n = YEARS * 12;
  return deposit * ((Math.pow(1 + i, n) - 1) / i);
}

function parseRaw(raw: string) {
  // pt-BR: ponto separa milhar, vírgula separa centavos
  const n = Number.parseFloat(raw.replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/* M25: tooltip com origem no gatilho; a partir do segundo, abre instantâneo (data-instant). */
function Hint({ label, children, onDark = false }: { label: string; children: ReactNode; onDark?: boolean }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label={label}
        className={cn(
          'pressable inline-flex h-7 w-7 items-center justify-center rounded-full',
          onDark ? 'text-white/90 hover:text-white' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]',
        )}
      >
        <Icon name="info" size={18} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className="z-[var(--z-tooltip)]">
          <Tooltip.Popup className="tip max-w-[18rem] rounded-[var(--radius-input)] bg-[var(--color-ink)] px-3 py-2 text-small text-white shadow-lg">
            {children}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* M24: valor que rola na direção da mudança. */
const roll = {
  enter: (d: number) => ({ transform: `translateY(${d * 60}%)`, opacity: 0 }),
  center: { transform: 'translateY(0%)', opacity: 1 },
  exit: (d: number) => ({ transform: `translateY(${d * -60}%)`, opacity: 0 }),
};

export function Simulator() {
  const inputId = useId();
  const [raw, setRaw] = useState('300');
  const [freq, setFreq] = useState<Freq>('mensal');
  const [dir, setDir] = useState(1);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  const typed = parseRaw(raw);
  const capped = typed > MAX;
  const deposit = Math.min(MAX, typed);
  const total = useMemo(() => futureValue(deposit, freq), [deposit, freq]);
  const invested = deposit * (freq === 'anual' ? YEARS : YEARS * 12);
  const gain = Math.max(0, total - invested);

  const choose = (next: Freq) => {
    if (next === freq) return;
    setDir(futureValue(deposit, next) >= total ? 1 : -1);
    setFreq(next);
  };

  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + freqs.length) % freqs.length;
    choose(freqs[next].id);
    radios.current[next]?.focus();
  };

  return (
    <section id="simulador" aria-labelledby="simulador-title" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SplitReveal
          as="h2"
          id="simulador-title"
          text="Quanto rende guardar um pouco todo mês?"
          onScroll
          short
          className="max-w-3xl font-brand text-h2 text-[var(--color-ink)]"
        />

        <Tooltip.Provider delay={400}>
          <div className="mt-12 grid gap-6 lg:grid-cols-[5fr_7fr]">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-6 lg:p-8">
              <label htmlFor={inputId} className="block text-small font-medium text-[var(--color-ink)]">
                Quanto você guarda
              </label>
              <div className="relative mt-2">
                <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]">
                  R$
                </span>
                <input
                  id={inputId}
                  name="valor"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  maxLength={12}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="field w-full rounded-[var(--radius-input)] border border-[var(--color-line)] bg-[var(--color-bg)] py-3 pl-11 pr-4 text-base text-[var(--color-ink)]"
                  aria-describedby={capped ? `${inputId}-max` : undefined}
                  data-num
                />
              </div>
              {capped && (
                <p id={`${inputId}-max`} className="mt-2 text-small text-[var(--color-ink-soft)]">
                  A simulação usa no máximo {brl.format(MAX)}.
                </p>
              )}

              <p id={`${inputId}-freq`} className="mt-6 text-small font-medium text-[var(--color-ink)]">
                Com que frequência
              </p>
              <LayoutGroup id="freq">
                <div
                  role="radiogroup"
                  aria-labelledby={`${inputId}-freq`}
                  className="mt-2 inline-grid grid-cols-2 rounded-full bg-[var(--color-surface)] p-1"
                >
                  {freqs.map((f, i) => {
                    const on = f.id === freq;
                    return (
                      <button
                        key={f.id}
                        ref={(el) => {
                          radios.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => choose(f.id)}
                        onKeyDown={(e) => onRadioKey(e, i)}
                        className={cn(
                          'relative rounded-full px-5 py-2 text-small font-semibold transition-colors duration-200',
                          on ? 'text-white' : 'text-[var(--color-ink-soft)]',
                        )}
                      >
                        {on && (
                          <m.span
                            layoutId="freq-pill"
                            aria-hidden="true"
                            className="absolute inset-0 bg-[var(--color-accent)]"
                            style={{ borderRadius: 9999 }}
                            transition={spring.snappy}
                          />
                        )}
                        <span className="relative">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>

              <p className="mt-6 flex items-center gap-1 text-small text-[var(--color-ink-muted)]">
                Taxa de exemplo: 10% ao ano, por {YEARS} anos
                <Hint label="Sobre a taxa de exemplo">
                  Taxa ilustrativa, só para comparar cenários. Não é recomendação nem promessa de rendimento.
                </Hint>
              </p>
            </div>

            <div
              className="on-dark flex flex-col justify-between rounded-[var(--radius-card)] bg-[var(--color-accent)] p-6 text-white lg:p-8"
            >
              <p className="flex items-center gap-1 text-body text-white/90">
                Em {YEARS} anos, com juros compostos, você teria
                <Hint label="O que são juros compostos" onDark>
                  O rendimento de cada mês passa a render também nos meses seguintes.
                </Hint>
              </p>

              <p className="sr-only" aria-live="polite">
                {brl.format(total)}
              </p>
              <div aria-hidden="true" className="relative mt-4 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                  <m.p
                    key={freq}
                    custom={dir}
                    variants={roll}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: ease.out }}
                    className="price font-brand text-display text-white [overflow-wrap:anywhere]"
                  >
                    {brl.format(total)}
                  </m.p>
                </AnimatePresence>
              </div>

              <dl className="mt-10 grid gap-6 border-t border-white/25 pt-6 sm:grid-cols-2">
                <div>
                  <dt className="text-small text-white/90">Você guardou</dt>
                  <dd className="price mt-1 font-brand text-h3 text-white">{brl.format(invested)}</dd>
                </div>
                <div>
                  <dt className="text-small text-white/90">Rendimento</dt>
                  <dd className="price mt-1 font-brand text-h3 text-white">{brl.format(gain)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Tooltip.Provider>
      </div>
    </section>
  );
}
