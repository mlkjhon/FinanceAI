import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from './icons';
import { cn } from '../lib/utils';
import { MoneyInput } from './money-input';

/*
 * Painel lateral (no celular, sheet de baixo) usado em "Nova transação",
 * "Novo orçamento", "Nova meta" e "Depositar". O motion está no CSS (.sheet):
 * entra pela borda em 400ms com a curva de drawer e sai mais rápido (200ms).
 */
export function Sheet({ open, onOpenChange, title, children, footer, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup className="sheet">
          <form
            className="flex flex-col min-h-0 h-full"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit?.();
            }}
          >
            <header className="flex items-center justify-between px-6 pt-5 pb-2">
              <Dialog.Title className="font-brand font-bold text-lg text-[var(--color-ink)]">{title}</Dialog.Title>
              <Dialog.Close className="pressable p-2 -mr-2 rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]" aria-label="Fechar">
                <X size={18} />
              </Dialog.Close>
            </header>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 space-y-6">{children}</div>
            {footer && <footer className="px-6 py-5 border-t border-[var(--color-line)] space-y-3">{footer}</footer>}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// O valor em destaque, com separador de milhar enquanto se digita
export function AmountField({ id, label, value, onChange, prefixo = 'R$', prefixoClasse, erro, autoFocus }: {
  id: string;
  label: string;
  value: string;
  onChange: (texto: string) => void;
  prefixo?: string;
  prefixoClasse?: string;
  erro?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="metric-label">{label}</label>
      <div className="mt-1 flex items-baseline gap-2 border-b border-[var(--color-line)] pb-2 focus-within:border-[var(--color-accent)] transition-colors duration-150">
        <span className={cn('font-brand text-2xl font-bold whitespace-nowrap shrink-0 text-[var(--color-ink-muted)]', prefixoClasse)}>{prefixo}</span>
        <MoneyInput
          id={id}
          value={value}
          onValueChange={onChange}
          placeholder="0,00"
          autoFocus={autoFocus}
          aria-invalid={!!erro}
          className="amount-input"
        />
      </div>
      {erro && <p className="mt-1.5 text-xs text-loss">{erro}</p>}
    </div>
  );
}

export function Campo({ id, label, children, ajuda }: { id: string; label: string; children: ReactNode; ajuda?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-ink-soft)]">{label}</label>
      {children}
      {ajuda && <p className="text-xs text-[var(--color-ink-muted)]">{ajuda}</p>}
    </div>
  );
}
