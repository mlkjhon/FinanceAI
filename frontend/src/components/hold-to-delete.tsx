import { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from './icons';
import { cn } from '../lib/utils';

/*
 * Segurar para excluir (receita "Hold to confirm"): 2s linear enchendo, 200ms
 * para voltar ao soltar. Substitui o modal de confirmação em ações destrutivas.
 */
export function HoldToDelete({ onConfirm, pending, label = "Segure para excluir", compact = false }: { onConfirm: () => void; pending: boolean; label?: string; compact?: boolean }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const start = () => {
    if (pending) return;
    setHolding(true);
    timer.current = setTimeout(() => { setHolding(false); onConfirm(); }, 2000);
  };
  const cancel = () => { clearTimeout(timer.current); setHolding(false); };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={cn("hold-btn rounded-full border border-[var(--color-finance-error)]/30 font-semibold text-loss", compact ? "px-3 py-1.5 text-xs" : "w-full py-3 text-sm")}
      data-holding={holding ? '' : undefined}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') cancel(); }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label}
    >
      <span className="hold-fill" aria-hidden />
      <span className="inline-flex items-center gap-2">
        {pending ? <Loader2 size={compact ? 12 : 14} className="animate-spin" /> : <Trash2 size={compact ? 12 : 14} />}
        {pending ? 'Excluindo' : holding ? 'Continue segurando' : label}
      </span>
    </button>
  );
}
