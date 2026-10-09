import { forwardRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Menu } from '@base-ui/react/menu';
import { Icon } from '../icons';
import { Collapse } from '../collapse';
import { cn } from '../../lib/utils';
import { ease } from '../../lib/motion-tokens';
import type { Bloco } from '../../lib/insights/types';
import { BlocoConteudo } from './blocks';

const SPAN: Record<Bloco['size'], string> = {
  sm: 'col-span-12 sm:col-span-6 lg:col-span-4',
  md: 'col-span-12 lg:col-span-6',
  lg: 'col-span-12 lg:col-span-8',
  full: 'col-span-12',
};

export interface AcoesBloco {
  onRefazer: (b: Bloco) => void;
  onFixar: (b: Bloco) => void;
  onRemover: (b: Bloco) => void;
}

/*
 * Moldura de um bloco.
 * - Entrada: opacity + translateY(12px) + scale(0.98), 350ms ease-out (nunca de scale 0).
 * - Saída: 180ms, mais rápida que a entrada; os vizinhos se reorganizam pelo layout.
 * - Alteração: o conteúdo antigo sai e o novo entra com ponte de blur (crossfade),
 *   enquanto o container anima a altura via layout.
 * - Reordenar: layout animation, sem pulos.
 * Com reduced motion vira só fade.
 */
export const BlocoFrame = forwardRef<HTMLElement, { bloco: Bloco; ocupado: boolean; novo: boolean } & AcoesBloco>(function BlocoFrame(
  { bloco, ocupado, novo, onRefazer, onFixar, onRemover },
  ref
) {
  const reduce = useReducedMotion();
  const [porque, setPorque] = useState(false);
  const hero = bloco.type === 'story';

  return (
    <motion.article
      ref={ref}
      layout={reduce ? false : 'position'}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px) scale(0.98)' }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px) scale(1)' }}
      exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, transform: 'scale(0.96)', transition: { duration: 0.18, ease: ease.out } }}
      transition={{ duration: 0.35, ease: ease.out, layout: { duration: 0.3, ease: ease.out } }}
      aria-busy={ocupado}
      className={cn(
        SPAN[bloco.size],
        'relative rounded-[var(--radius-card)] p-5',
        hero ? 'bg-[var(--color-accent)] text-white on-dark p-6 sm:p-8' : 'finance-card',
        novo && 'block-flash',
        ocupado && 'opacity-60'
      )}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <h2 className={cn('font-semibold text-base leading-snug', hero ? 'text-white/85 text-sm font-medium' : 'text-[var(--color-ink)]')}>
          {bloco.fixado && <Icon name="push-pin" size={13} className={cn('mr-1.5 -mt-0.5 align-middle', hero ? 'text-white/70' : 'text-[var(--color-accent)]')} />}
          {bloco.title}
        </h2>
        <Menu.Root>
          <Menu.Trigger
            aria-label={`Ações de ${bloco.title}`}
            className={cn('shrink-0 -mr-1.5 -mt-1 p-1.5 rounded-full transition-colors duration-150', hero ? 'text-white/70 hover:bg-white/10' : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]')}
          >
            <Icon name="dots-three" size={18} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="z-[var(--z-tooltip)]">
              <Menu.Popup className="menu-pop min-w-48 rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-lg outline-none">
                <MenuItem icon="arrows-clockwise" onClick={() => onRefazer(bloco)}>Refazer</MenuItem>
                <MenuItem icon="question" onClick={() => setPorque((p) => !p)}>{porque ? 'Esconder o porquê' : 'Por que isso?'}</MenuItem>
                <MenuItem icon={bloco.fixado ? 'push-pin-slash' : 'push-pin'} onClick={() => onFixar(bloco)}>{bloco.fixado ? 'Desafixar' : 'Fixar'}</MenuItem>
                <MenuItem icon="trash" onClick={() => onRemover(bloco)} danger>Remover</MenuItem>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </header>

      <Collapse open={porque} className={cn('mb-4 rounded-lg px-3 py-2.5 text-sm', hero ? 'bg-white/10 text-white/90' : 'bg-[var(--color-surface)] text-[var(--color-ink-soft)]')}>
        <span className="font-medium">Por que este bloco: </span>
        {bloco.reasoning || 'A IA considerou este dado relevante para o período.'}
      </Collapse>

      <div className="grid">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={bloco.createdAt}
            className="[grid-area:1/1]"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.3, ease: ease.out } }}
            exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.15, ease: ease.out } }}
          >
            <BlocoConteudo bloco={bloco} />
          </motion.div>
        </AnimatePresence>
      </div>

      {(bloco.inclui?.length || bloco.nota) && (
        <footer className={cn('mt-4 pt-3 border-t text-xs space-y-1', hero ? 'border-white/20 text-white/75' : 'border-[var(--color-line)] text-[var(--color-ink-muted)]')}>
          {bloco.inclui?.length ? <p>Considerando: {bloco.inclui.join(', ')}</p> : null}
          {bloco.nota ? <p>{bloco.nota}</p> : null}
        </footer>
      )}
    </motion.article>
  );
});

function MenuItem({ icon, children, onClick, danger }: { icon: Parameters<typeof Icon>[0]['name']; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <Menu.Item
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none cursor-default select-none data-[highlighted]:bg-[var(--color-surface)]',
        danger ? 'text-loss' : 'text-[var(--color-ink-soft)]'
      )}
    >
      <Icon name={icon} size={15} />
      {children}
    </Menu.Item>
  );
}

// Esqueleto no formato do bloco que está chegando
export function BlocoSkeleton({ size = 'md', alto = false }: { size?: Bloco['size']; alto?: boolean }) {
  return (
    <div className={cn(SPAN[size], 'finance-card p-5 space-y-4')} role="status" aria-label="Gerando bloco">
      <span className="media-frame block h-3 w-1/3 rounded-full" data-loading="" />
      <span className={cn('media-frame block w-full rounded-lg', alto ? 'h-40' : 'h-16')} data-loading="" />
      <span className="media-frame block h-2.5 w-2/3 rounded-full" data-loading="" />
    </div>
  );
}
