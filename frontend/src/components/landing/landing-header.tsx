import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import * as m from 'motion/react-m';
import {
  AnimatePresence,
  LayoutGroup,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { spring } from '../../lib/motion-tokens';
import { Wordmark } from './wordmark';

const anchors = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#simulador', label: 'Simulador' },
  { href: '#duvidas', label: 'Dúvidas' },
];

export function LandingHeader() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // M06: esconde ao rolar para baixo depois de 120px, volta ao rolar para cima.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    const next = y > prev && y > 120;
    if (next !== hidden) setHidden(next);
  });

  // M07: o material só aparece quando há conteúdo passando por baixo.
  const materialOpacity = useTransform(scrollY, [0, 64], [0, 1]);

  const isHidden = hidden && !focusWithin;

  return (
    <m.header
      className="fixed inset-x-0 top-0 z-[var(--z-header)] pt-[env(safe-area-inset-top)]"
      initial={false}
      animate={
        reduce
          ? { opacity: isHidden ? 0 : 1 }
          : { transform: isHidden ? 'translateY(-100%)' : 'translateY(0%)' }
      }
      transition={spring.snappy}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={() => setFocusWithin(false)}
    >
      <m.div
        aria-hidden="true"
        className="material absolute inset-0 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-bg)_72%,transparent)] backdrop-blur-[12px] backdrop-saturate-[1.6]"
        style={{ opacity: materialOpacity }}
      />
      <nav
        aria-label="Principal"
        className="relative mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 px-4 sm:px-6 lg:min-h-[72px] lg:px-8"
      >
        <Link to="/" aria-label="FinanceAI, início" className="pressable rounded-lg">
          <Wordmark />
        </Link>

        <LayoutGroup>
          <ul
            className="hidden items-center gap-1 md:flex"
            onMouseLeave={() => setHovered(null)}
            onBlur={() => setHovered(null)}
          >
            {anchors.map((a) => (
              <li key={a.href} className="relative">
                <a
                  href={a.href}
                  className="relative block rounded-full px-4 py-2 text-small font-medium text-[var(--color-ink-soft)]"
                  onMouseEnter={() => setHovered(a.href)}
                  onFocus={() => setHovered(a.href)}
                >
                  {/* M08: pill compartilhada que desliza entre os itens */}
                  <AnimatePresence>
                    {hovered === a.href && (
                      <m.span
                        layoutId="nav-pill"
                        aria-hidden="true"
                        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-finance-accent)_16%,transparent)]"
                        style={{ borderRadius: 9999 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={spring.snappy}
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative">{a.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </LayoutGroup>

        <Link
          to="/auth"
          className="pressable rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] px-5 py-2 text-small font-semibold text-[var(--color-ink)] transition-[border-color,color] duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Entrar
        </Link>
      </nav>
    </m.header>
  );
}
