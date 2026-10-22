import { cn } from '../lib/utils';

/*
 * Avatar da conta: a foto de perfil, ou as iniciais sobre o gradiente da marca
 * quando não há foto. Usado no menu da conta, no perfil e no menu do celular.
 */
const iniciais = (nome?: string) =>
  (nome || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

const TAMANHOS = {
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-sm',
  lg: 'size-14 text-xl',
  xl: 'size-24 text-3xl',
} as const;

export function Avatar({ nome, foto, tamanho = 'sm', className }: { nome?: string; foto?: string | null; tamanho?: keyof typeof TAMANHOS; className?: string }) {
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        aria-hidden
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-[var(--color-line)]', TAMANHOS[tamanho], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn('gradient-hero grid shrink-0 place-items-center rounded-full font-brand font-bold text-white', TAMANHOS[tamanho], className)}
    >
      {iniciais(nome)}
    </span>
  );
}
