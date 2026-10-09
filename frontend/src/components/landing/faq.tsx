import { useId, useState } from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { ease } from '../../lib/motion-tokens';
import { SplitReveal } from '../motion/split-reveal';

/* Respostas tiradas do que o app faz hoje (rotas, OpenFinanceWidget, tela de Investimentos). */
const faqs = [
  {
    q: 'O FinanceAI é pago?',
    a: 'Não. A conta é gratuita e não pede cartão de crédito.',
  },
  {
    q: 'Preciso conectar meu banco?',
    a: 'Não é obrigatório. Você pode conectar pelo Open Finance, via Pluggy, ou cadastrar contas e lançamentos à mão.',
  },
  {
    q: 'De onde vêm as sugestões da IA?',
    a: 'Dos seus próprios lançamentos. A IA analisa os gastos por categoria e compara com seus orçamentos e metas.',
  },
  {
    q: 'Quais investimentos posso acompanhar?',
    a: 'CDB, LCI e LCA, Tesouro Direto, ações, FIIs, criptomoedas, previdência, fundos, poupança, BDRs e ETFs, com indexadores como CDI, Selic e IPCA.',
  },
  {
    q: 'Meus dados ficam protegidos?',
    a: 'O acesso exige login com token JWT, e a comunicação com o servidor é criptografada.',
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <li className="rounded-[var(--radius-card)] bg-[var(--color-surface)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-6 rounded-[var(--radius-card)] px-6 py-5 text-left font-brand text-lg font-medium text-[var(--color-ink)]"
        >
          {q}
          <span className="plus-x text-[var(--color-accent)]" aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="panel"
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-button`}
            className="overflow-hidden [contain:layout]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { height: { duration: 0.3, ease: ease.out }, opacity: { duration: 0.2 } }
            }
          >
            <p className="measure px-6 pb-6 text-body text-[var(--color-ink-soft)]">{a}</p>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Faq() {
  return (
    <section id="duvidas" aria-labelledby="duvidas-title" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[4fr_8fr]">
        <SplitReveal
          as="h2"
          id="duvidas-title"
          text="Perguntas frequentes"
          onScroll
          short
          className="font-brand text-h2 text-[var(--color-ink)] lg:sticky lg:top-28 lg:self-start"
        />
        <ul className="space-y-3">
          {faqs.map((f) => (
            <Item key={f.q} {...f} />
          ))}
        </ul>
      </div>
    </section>
  );
}
