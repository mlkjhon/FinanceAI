import type { ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Icon, type IconName } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { salvarPreferencia as salvarTema, usePreferenciaTema, type PreferenciaTema } from '../lib/theme';
import { salvarPreferencia, usePreferencia } from '../lib/preferencias';
import { cn } from '../lib/utils';

/*
 * Menu da conta no topo (padrão de Linear, Vercel, GitHub): o avatar abre um
 * painel com quem está logado, atalhos do perfil, as preferências rápidas
 * (tema e ocultar valores) e o Sair no fim, separado.
 * Motion: nasce do gatilho (transform-origin), scale 0.96 -> 1 em 150ms ease-out;
 * a setinha gira junto. Nada anima por teclado além do foco.
 */
const iniciais = (nome?: string) =>
  (nome || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

function Avatar({ nome, tamanho = 'sm' }: { nome?: string; tamanho?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'gradient-hero grid shrink-0 place-items-center rounded-full font-brand font-bold text-white',
        tamanho === 'md' ? 'size-10 text-sm' : 'size-8 text-[11px]'
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

function Item({ icone, children, onClick, perigo, atalho }: { icone: IconName; children: ReactNode; onClick: () => void; perigo?: boolean; atalho?: string }) {
  return (
    <Menu.Item
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none cursor-default select-none transition-colors duration-100',
        perigo
          ? 'text-loss data-[highlighted]:bg-loss-soft'
          : 'text-[var(--color-ink-soft)] data-[highlighted]:bg-[var(--color-surface)] data-[highlighted]:text-[var(--color-ink)]'
      )}
    >
      <Icon name={icone} size={16} />
      <span className="flex-1">{children}</span>
      {atalho && <span className="text-xs text-[var(--color-ink-muted)]">{atalho}</span>}
    </Menu.Item>
  );
}

const Separador = () => <div role="separator" className="my-1 h-px bg-[var(--color-line)]" />;

const TEMAS: { valor: PreferenciaTema; rotulo: string; icone: IconName }[] = [
  { valor: 'sistema', rotulo: 'Sistema', icone: 'desktop' },
  { valor: 'claro', rotulo: 'Claro', icone: 'sun' },
  { valor: 'escuro', rotulo: 'Escuro', icone: 'moon' },
];

export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tema = usePreferenciaTema();
  const ocultar = usePreferencia('ocultarValores');
  const primeiroNome = user?.nome?.trim().split(/\s+/)[0] ?? '';

  const trocarTema = (p: PreferenciaTema) => {
    document.documentElement.classList.add('trocando-tema');
    salvarTema(p);
    setTimeout(() => document.documentElement.classList.remove('trocando-tema'), 300);
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Conta de ${user?.nome ?? 'usuário'}`}
        className={cn(
          'group pressable flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 outline-none transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40',
          pathname === '/profile'
            ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8'
            : 'border-[var(--color-line)] hover:bg-[var(--color-surface)] data-[popup-open]:bg-[var(--color-surface)]'
        )}
      >
        <Avatar nome={user?.nome} />
        <span className="max-w-[9rem] truncate text-sm font-medium text-[var(--color-ink)]">{primeiroNome}</span>
        <Icon
          name="caret-down"
          size={12}
          className="text-[var(--color-ink-muted)] transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-data-[popup-open]:rotate-180"
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-[var(--z-tooltip)]">
          <Menu.Popup className="menu-pop w-72 rounded-2xl border border-[var(--color-line)] bg-white p-1.5 shadow-xl outline-none">
            {/* Quem está logado */}
            <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
              <Avatar nome={user?.nome} tamanho="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{user?.nome}</p>
                <p className="truncate text-xs text-[var(--color-ink-muted)]">{user?.email}</p>
              </div>
            </div>
            <Separador />

            <Item icone="user-circle" onClick={() => navigate({ to: '/profile' })}>Meu perfil</Item>
            <Item icone="gear-six" onClick={() => navigate({ to: '/profile', hash: 'conta' })}>Configurações da conta</Item>
            <Separador />

            {/* Preferências rápidas: mudam na hora, o menu continua aberto */}
            <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
              <span className="text-sm text-[var(--color-ink-soft)]">Tema</span>
              <Menu.RadioGroup value={tema} onValueChange={(v) => trocarTema(v as PreferenciaTema)} className="flex rounded-full bg-[var(--color-surface)] p-0.5">
                {TEMAS.map((t) => (
                  <Menu.RadioItem
                    key={t.valor}
                    value={t.valor}
                    closeOnClick={false}
                    aria-label={t.rotulo}
                    title={t.rotulo}
                    className={cn(
                      'grid size-7 place-items-center rounded-full outline-none cursor-default transition-colors duration-150',
                      'text-[var(--color-ink-muted)] data-[highlighted]:text-[var(--color-ink)]',
                      'data-[checked]:bg-[var(--color-accent)]/15 data-[checked]:text-[var(--color-accent)]',
                      'data-[highlighted]:ring-2 data-[highlighted]:ring-[var(--color-accent)]/30'
                    )}
                  >
                    <Icon name={t.icone} size={14} />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </div>
            <Menu.CheckboxItem
              checked={ocultar}
              onCheckedChange={(v) => salvarPreferencia('ocultarValores', v)}
              closeOnClick={false}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--color-ink-soft)] outline-none cursor-default select-none transition-colors duration-100 data-[highlighted]:bg-[var(--color-surface)] data-[highlighted]:text-[var(--color-ink)]"
            >
              <Icon name={ocultar ? 'eye-slash' : 'eye'} size={16} />
              <span className="flex-1">Ocultar valores</span>
              {/* interruptor visual (o estado real é o aria-checked do item) */}
              <span aria-hidden className={cn('relative h-5 w-9 rounded-full transition-colors duration-200', ocultar ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]')}>
                <span
                  className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 [transition-timing-function:var(--ease-out)]"
                  style={{ transform: ocultar ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </span>
            </Menu.CheckboxItem>
            <Separador />

            <Item icone="sign-out" onClick={logout} perigo>Sair</Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
