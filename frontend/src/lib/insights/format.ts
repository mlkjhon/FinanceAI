import { formatCurrency } from '../utils';

export function fmt(valor: number, formato: 'moeda' | 'pct' | 'numero' | 'texto' = 'moeda') {
  if (formato === 'pct') return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(valor) < 10 ? 1 : 0 })}%`;
  if (formato === 'numero') return Math.round(valor).toLocaleString('pt-BR');
  if (formato === 'texto') return String(valor);
  return formatCurrency(valor);
}

// "2026-10-01" -> "1 out"
export function diaCurto(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ');
}
