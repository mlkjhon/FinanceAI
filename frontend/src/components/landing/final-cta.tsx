import { useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import * as m from 'motion/react-m';
import { AnimatePresence, useAnimate, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { duration, ease } from '../../lib/motion-tokens';
import { Icon } from '../icons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'loading' | 'done';

/*
 * M27: formulário de entrada. Valida só no envio (nunca por tecla), treme no erro,
 * troca o botão entre rótulo, spinner CSS e "Pronto", e leva para /auth
 * com o e-mail já preenchido na aba de cadastro.
 */
function StartForm() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const id = useId();
  const [scope, animateShake] = useAnimate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError(value ? 'Confira o e-mail: falta algo no endereço.' : 'Digite seu e-mail para continuar.');
      if (!reduce && scope.current) {
        animateShake(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.32, ease: ease.out });
      }
      return;
    }
    setError('');
    setStatus('loading');
    // A navegação é instantânea; 200ms + 200ms só tornam os estados legíveis, sem latência perceptível.
    window.setTimeout(() => {
      setStatus('done');
      window.setTimeout(() => {
        navigate({ to: '/auth', search: { tab: 'register', email: value } });
      }, 200);
    }, 200);
  };

  const label = status === 'idle' ? 'Começar gratuitamente' : status === 'loading' ? 'Enviando' : 'Pronto';

  return (
    <form noValidate onSubmit={onSubmit} className="mx-auto mt-10 w-full max-w-xl text-left">
      <label htmlFor={`${id}-email`} className="block text-small font-medium text-white">
        Seu e-mail
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <div ref={scope} className="flex-1">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="field w-full rounded-[var(--radius-input)] border border-transparent bg-white px-4 py-3.5 text-base text-[var(--color-ink)]"
          />
        </div>
        <m.button
          layout
          type="submit"
          aria-label={label}
          aria-busy={status === 'loading'}
          className="pressable flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white px-7 font-semibold text-[var(--color-accent)]"
          style={{ borderRadius: 9999 }}
          transition={{ layout: { duration: duration.toggle, ease: ease.out } }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={status}
              className="flex items-center gap-2 whitespace-nowrap"
              initial={{ opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              exit={{ opacity: 0, transform: 'translateY(-6px)', transition: { duration: 0.12, ease: ease.out } }}
              transition={{ duration: 0.18, ease: ease.out }}
            >
              {status === 'loading' && <span className="spinner" aria-hidden="true" />}
              {status === 'done' && <Icon name="check" size={18} />}
              {status === 'loading' ? null : label}
            </m.span>
          </AnimatePresence>
        </m.button>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            id={`${id}-error`}
            role="alert"
            className="mt-3 flex items-center gap-2 text-small font-medium text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Icon name="warning-circle" size={18} />
            {error}
          </m.p>
        )}
      </AnimatePresence>
    </form>
  );
}

/* M29: cortina circular que abre a partir da base, o clímax antes da conversão. */
export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] });
  const clipPath = useTransform(scrollYProgress, [0, 1], ['circle(0% at 50% 100%)', 'circle(150% at 50% 100%)']);

  return (
    <section ref={ref} aria-labelledby="cta-title" className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
      <m.div
        data-reveal
        style={reduce ? undefined : { clipPath }}
        className="on-dark mx-auto max-w-7xl overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-accent)] px-6 py-20 text-center text-white sm:px-12 lg:py-28"
      >
        <h2 id="cta-title" className="mx-auto max-w-3xl font-brand text-h2 text-white">
          Organize suas finanças a partir de hoje
        </h2>
        <p className="mt-4 text-lead text-white/90">Grátis para sempre. Sem cartão de crédito.</p>
        <StartForm />
      </m.div>
    </section>
  );
}
