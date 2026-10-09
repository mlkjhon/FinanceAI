import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import * as m from 'motion/react-m';
import { useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Wordmark } from './wordmark';

/*
 * M30: footer revelado por baixo. O <main> (z 1, fundo opaco) rola por cima
 * do footer sticky (z 0), e o wordmark tipográfico sobe enquanto aparece.
 * Links "#" mortos do footer antigo foram removidos (não havia páginas de
 * privacidade e termos para onde apontar).
 */
export function SiteFooter() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], ['30%', '0%']);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.3, 1]);

  return (
    <footer
      ref={ref}
      className="sticky bottom-0 z-[var(--z-footer)] overflow-hidden bg-[var(--color-surface)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-small text-[var(--color-ink-soft)]">
              <li><a href="#recursos" className="link-line">Recursos</a></li>
              <li><a href="#como-funciona" className="link-line">Como funciona</a></li>
              <li><a href="#simulador" className="link-line">Simulador</a></li>
              <li><a href="#duvidas" className="link-line">Dúvidas</a></li>
              <li><Link to="/auth" className="link-line">Entrar</Link></li>
            </ul>
          </nav>
        </div>

        <m.p
          aria-hidden="true"
          style={reduce ? undefined : { y, opacity }}
          className="mt-12 select-none font-brand text-[clamp(4rem,1rem+15vw,15rem)] font-extrabold leading-[0.8] tracking-[-0.05em] text-[color-mix(in_oklab,var(--color-accent)_14%,var(--color-surface))]"
        >
          FinanceAI
        </m.p>

        <p className="mt-6 text-small text-[var(--color-ink-muted)]">© 2026 FinanceAI. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
