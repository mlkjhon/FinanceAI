import type { ReactNode } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { cn } from '../lib/utils';

/*
 * Confirmação no visual do app (substitui o confirm() do navegador, que mostra
 * um aviso do sistema). AlertDialog: o foco vai para "Cancelar", Esc fecha,
 * e clicar fora NÃO confirma nada.
 * Motion: entra do centro com scale 0.96 -> 1 + fade em 200ms ease-out
 * (modal não tem gatilho de origem, então fica centralizado), sai em 150ms.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  children,
  confirmar,
  onConfirm,
  pendente,
  perigo = true,
  erro,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  children?: ReactNode;
  confirmar: string;
  onConfirm: () => void;
  pendente?: boolean;
  perigo?: boolean;
  erro?: string | false;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => !pendente && onOpenChange(v)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="sheet-backdrop" />
        <AlertDialog.Popup className="dialog-pop fixed left-1/2 top-1/2 z-[var(--z-drawer)] w-[min(26rem,calc(100vw-2rem))] rounded-[20px] border border-[var(--color-line)] bg-white p-6 shadow-2xl outline-none">
          <AlertDialog.Title className="font-brand text-lg font-bold text-[var(--color-ink)]">{titulo}</AlertDialog.Title>
          {children && (
            <AlertDialog.Description render={<div />} className="mt-2 space-y-2 text-sm text-[var(--color-ink-soft)]">
              {children}
            </AlertDialog.Description>
          )}
          {erro && <p role="alert" className="mt-3 text-sm text-loss">{erro}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Close
              disabled={pendente}
              className="pressable rounded-full border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] disabled:opacity-50"
            >
              Cancelar
            </AlertDialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pendente}
              className={cn(
                'pressable inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60',
                perigo ? 'bg-[var(--color-finance-error)] hover:brightness-95' : 'bg-[var(--color-accent)] hover:brightness-95'
              )}
            >
              {pendente && <span className="spinner" aria-hidden />}
              {confirmar}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
