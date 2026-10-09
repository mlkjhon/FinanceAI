import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "Ocultar valores" (configurações): os valores em dinheiro viram bolinhas
const valoresOcultos = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-ocultar-valores');
const OCULTO = 'R$ ••••';

export function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL') {
  if (valoresOcultos()) return OCULTO;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

// Aportes/resgates de investimento levam um marcador interno ("[INV:12] Aporte em CDB"); na tela ele some
export function descricaoVisivel(descricao: string) {
  return String(descricao || '').replace(/^[INV(:d+)?]s*/, '');
}

export function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const texto = String(dateStr);
  // A API as vezes ja devolve a data formatada (TO_CHAR 'DD/MM/YYYY')
  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) return texto.slice(0, 10);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
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
  if (valoresOcultos()) return withPrefix ? 'R$ ••' : '••';
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


// "110% do CDI", "IPCA + 6,2% a.a.", "12% a.a." conforme o indexador
export function descreverTaxa(inv: { taxa_rendimento: number | string; indexador?: string }) {
  const taxa = parseFloat(String(inv.taxa_rendimento)).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const idx = (inv.indexador || "PREFIXADO").toUpperCase();
  if (idx === "PREFIXADO") return `${taxa}% a.a.`;
  if (idx === "POUPANCA" || idx === "POUPANÇA") return `${taxa}% da poupança`;
  if (["CDI", "SELIC", "IBOVESPA"].includes(idx)) return `${taxa}% do ${idx}`;
  return `${idx} + ${taxa}% a.a.`;
}
