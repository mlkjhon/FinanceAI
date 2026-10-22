import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from './icons';

/*
 * Tocar na foto de perfil abre ela grande no meio da tela.
 * Sem foto, o avatar continua só um avatar (não há o que ampliar).
 * Motion: a mesma entrada das confirmações (scale 0.96 -> 1 + fade, 200ms).
 */
export function FotoAmpliada({ foto, nome, children }: { foto?: string | null; nome?: string; children: ReactNode }) {
  if (!foto) return <>{children}</>;
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Ver foto de perfil ampliada"
        className="pressable rounded-full outline-none cursor-zoom-in focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 focus-visible:ring-offset-2"
      >
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup className="dialog-pop fixed left-1/2 top-1/2 z-[var(--z-drawer)] w-[min(22rem,calc(100vw-2.5rem))] outline-none">
          <Dialog.Title className="sr-only">Foto de perfil{nome ? ` de ${nome}` : ''}</Dialog.Title>
          <img src={foto} alt={nome ? `Foto de perfil de ${nome}` : 'Foto de perfil'} className="aspect-square w-full rounded-[28px] object-cover shadow-2xl" />
          {nome && <p className="mt-3 text-center text-sm font-medium text-white drop-shadow">{nome}</p>}
          <Dialog.Close
            aria-label="Fechar"
            className="pressable absolute -right-2 -top-2 grid size-9 place-items-center rounded-full bg-white text-[var(--color-ink)] shadow-lg"
          >
            <X size={16} />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
