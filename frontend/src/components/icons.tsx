import type { CSSProperties } from 'react';
import { cn } from '../lib/utils';

/*
 * Ícones via fonte Phosphor (regular), sem SVG no DOM.
 * A @font-face fica em styles.css e carrega só o woff2.
 * Os nomes exportados espelham os da biblioteca de ícones anterior
 * para manter as telas do app intactas.
 */
const glyphs = {
  'warning-circle': 0xe4e2,
  'arrow-left': 0xe058,
  'arrow-right': 0xe06c,
  'arrow-up-right': 0xe092,
  'arrows-clockwise': 0xe094,
  bank: 0xe0b4,
  brain: 0xe74e,
  buildings: 0xe102,
  calendar: 0xe108,
  'calendar-blank': 0xe10a,
  'caret-down': 0xe136,
  'caret-left': 0xe138,
  'caret-right': 0xe13a,
  'chart-bar': 0xe150,
  'chart-line-up': 0xe156,
  check: 0xe182,
  'clock-counter-clockwise': 0xe1a0,
  coins: 0xe78e,
  copy: 0xe1ca,
  'credit-card': 0xe1d2,
  'currency-dollar': 0xe550,
  desktop: 0xe560,
  'dots-three': 0xe1fe,
  'envelope-simple': 0xe218,
  eye: 0xe220,
  'eye-slash': 0xe224,
  flask: 0xe79e,
  'gear-six': 0xe272,
  info: 0xe2ce,
  lightbulb: 0xe2dc,
  lightning: 0xe2de,
  list: 0xe2f0,
  'magnifying-glass': 0xe30c,
  moon: 0xe330,
  'paper-plane-tilt': 0xe398,
  'pencil-simple': 0xe3b4,
  'piggy-bank': 0xea04,
  plus: 0xe3d4,
  'push-pin': 0xe3e2,
  'push-pin-slash': 0xe3e4,
  question: 0xe3e8,
  'arrow-counter-clockwise': 0xe038,
  'plugs-connected': 0xeb5a,
  scales: 0xe750,
  shield: 0xe40a,
  'shield-check': 0xe40c,
  'sign-out': 0xe42a,
  sparkle: 0xe6a2,
  'spinner-gap': 0xe66c,
  star: 0xe46a,
  sun: 0xe472,
  target: 0xe47c,
  trash: 0xe4a6,
  'trend-down': 0xe4ac,
  'trend-up': 0xe4ae,
  user: 0xe4c2,
  'user-circle': 0xe4c4,
  wallet: 0xe68a,
  x: 0xe4f6,
} as const;

export type IconName = keyof typeof glyphs;

export interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, className, style }: IconProps & { name: IconName }) {
  return (
    <i aria-hidden="true" className={cn('ph-icon', className)} style={{ fontSize: size, ...style }}>
      {String.fromCodePoint(glyphs[name])}
    </i>
  );
}

const make = (name: IconName) => {
  const Glyph = (props: IconProps) => <Icon name={name} {...props} />;
  Glyph.displayName = `Icon(${name})`;
  return Glyph;
};

export const AlertCircle = make('warning-circle');
export const ArrowLeft = make('arrow-left');
export const ArrowRight = make('arrow-right');
export const ArrowUpRight = make('arrow-up-right');
export const BarChart2 = make('chart-bar');
export const BarChart3 = make('chart-bar');
export const Brain = make('brain');
export const Building2 = make('buildings');
export const Calendar = make('calendar-blank');
export const CalendarDays = make('calendar');
export const Check = make('check');
export const ChevronLeft = make('caret-left');
export const ChevronRight = make('caret-right');
export const Copy = make('copy');
export const CreditCard = make('credit-card');
export const DollarSign = make('currency-dollar');
export const Edit2 = make('pencil-simple');
export const Eye = make('eye');
export const EyeOff = make('eye-slash');
export const FlaskConical = make('flask');
export const History = make('clock-counter-clockwise');
export const Lightbulb = make('lightbulb');
export const Loader2 = make('spinner-gap');
export const LogOut = make('sign-out');
export const Mail = make('envelope-simple');
export const Menu = make('list');
export const MoreHorizontal = make('dots-three');
export const PiggyBank = make('piggy-bank');
export const Plus = make('plus');
export const RefreshCw = make('arrows-clockwise');
export const Scale = make('scales');
export const Search = make('magnifying-glass');
export const Send = make('paper-plane-tilt');
export const Shield = make('shield');
export const ShieldCheck = make('shield-check');
export const Sparkles = make('sparkle');
export const Star = make('star');
export const Target = make('target');
export const Trash2 = make('trash');
export const TrendingDown = make('trend-down');
export const TrendingUp = make('trend-up');
export const User = make('user');
export const Wallet = make('wallet');
export const X = make('x');
export const Zap = make('lightning');
