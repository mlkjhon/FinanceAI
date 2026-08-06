import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

export function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  return formatDate(dateStr);
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatCompactCurrency(value: number, withPrefix = true) {
  if (value === 0) return withPrefix ? 'R$0' : '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const prefix = withPrefix ? 'R$' : '';

  if (abs < 1000) {
    return `${sign}${prefix}${abs.toFixed(0)}`;
  }

  const units = [
    { threshold: 1e15, symbol: 'Q' },
    { threshold: 1e12, symbol: 'T' },
    { threshold: 1e9,  symbol: 'B' },
    { threshold: 1e6,  symbol: 'M' },
    { threshold: 1e3,  symbol: 'k' },
  ];

  for (const { threshold, symbol } of units) {
    if (abs >= threshold) {
      const val = abs / threshold;
      const formatted = val % 1 === 0 || val >= 100 ? val.toFixed(0) : val.toFixed(1);
      return `${sign}${prefix}${formatted}${symbol}`;
    }
  }

  return `${sign}${prefix}${abs.toFixed(0)}`;
}

