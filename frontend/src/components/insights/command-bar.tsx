import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '../icons';
import { cn } from '../../lib/utils';
import { ease } from '../../lib/motion-tokens';
import type { Bloco, EstadoIA } from '../../lib/insights/types';
import { sortearSugestoes } from '../../lib/insights/sugestoes';
import { AiStatus, StreamText } from './primitives';

/*
 * Barra de comando da IA (fixa embaixo). O pedido vira operações na página,
 * não uma conversa. A resposta aparece numa linha acima da barra, palavra a
 * palavra, e some sozinha. Enviar com Enter não anima nada (é ação de teclado).
 */
export function CommandBar({ estado, resposta, erro, onEnviar, blocos }: {
  blocos: Bloco[];
  estado: EstadoIA;
  resposta: { texto: string; id: number } | null;
  erro: string | null;
  onEnviar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [foco, setFoco] = useState(false);
  // Novo sorteio sempre que as sugestões reaparecem (nunca repetem até esgotar)
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const sortear = () => setSugestoes(sortearSugestoes(blocos));
  const input = useRef<HTMLInputElement>(null);
  const ocupado = estado !== 'ocioso';

  const enviar = (t = texto) => {
    const v = t.trim();
    if (!v || ocupado) return;
    onEnviar(v);
    setTexto('');
  };

  const aviso = erro ? { texto: erro, id: -1 } : resposta;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[var(--z-header)] pointer-events-none pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
      <div className="mx-auto max-w-2xl pointer-events-auto">
        <AnimatePresence mode="wait">
          {foco && !texto && !ocupado && sugestoes.length ? (
            <motion.div
              key={`sugestoes-${sugestoes.join()}`}
              initial={{ opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.2, ease: ease.out } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
            >
              {sugestoes.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, transform: 'translateY(4px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.2, delay: i * 0.04, ease: ease.out } }}
                  type="button"
                  // onMouseDown para não perder o foco do campo antes do clique
                  onMouseDown={(e) => { e.preventDefault(); enviar(s); }}
                  className="shrink-0 rounded-full border border-[var(--color-line)] bg-white/95 px-3 py-1.5 text-xs text-[var(--color-ink-soft)] shadow-sm hover:text-[var(--color-ink)]"
                >
                  {s}
                </motion.button>
              ))}
            </motion.div>
          ) : aviso ? (
            <motion.p
              key={`aviso-${aviso.id}`}
              role={erro ? 'alert' : 'status'}
              initial={{ opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.2, ease: ease.out } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className={cn('mb-2 mx-auto w-fit max-w-full rounded-2xl px-4 py-2 text-sm shadow-sm', erro ? 'bg-[var(--color-finance-error)]/10 text-loss' : 'bg-[var(--color-ink)] text-white')}
            >
              {erro ? aviso.texto : <StreamText text={aviso.texto} />}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <form
          onSubmit={(e) => { e.preventDefault(); enviar(); }}
          className={cn('command-bar flex items-center gap-2 rounded-full border bg-white p-1.5 pl-4 shadow-xl', ocupado ? 'border-[var(--color-accent)]/40 is-busy' : 'border-[var(--color-line)]')}
        >
          <Icon name="sparkle" size={18} className={cn('shrink-0', ocupado ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)]')} />
          {ocupado ? (
            <span className="flex-1 py-2"><AiStatus estado={estado} /></span>
          ) : (
            <input
              ref={input}
              value={texto}
              onChange={(e) => {
                // apagou tudo: a barra "resetou", então vem um conjunto novo
                if (texto && !e.target.value) sortear();
                setTexto(e.target.value);
              }}
              onFocus={() => {
                if (!texto) sortear();
                setFoco(true);
              }}
              onBlur={() => setFoco(false)}
              placeholder="Peça algo para a página: “compare mercado com o mês passado”"
              aria-label="Comando para a IA"
              className="flex-1 min-w-0 bg-transparent py-2 text-[16px] sm:text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
            />
          )}
          <button
            type="submit"
            disabled={ocupado || !texto.trim()}
            aria-label="Enviar comando"
            className="btn-primary w-10 h-10 shrink-0 disabled:opacity-40"
          >
            <Icon name="paper-plane-tilt" size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
