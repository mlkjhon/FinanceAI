/*
 * Valores digitados em reais, no formato brasileiro: ponto separa milhar,
 * vírgula separa centavos. "1234567,8" vira "1.234.567,8" enquanto se digita.
 */

// Mantém só dígitos e a primeira vírgula; no máximo 2 casas depois dela
function limpar(texto: string) {
  const semPontos = texto.replace(/\./g, '');
  let saida = '';
  let temVirgula = false;
  let decimais = 0;
  for (const c of semPontos) {
    if (c >= '0' && c <= '9') {
      if (temVirgula) {
        if (decimais >= 2) continue;
        decimais++;
      }
      saida += c;
    } else if (c === ',' && !temVirgula) {
      temVirgula = true;
      saida += ',';
    }
  }
  return saida;
}

// "1234567,8" -> "1.234.567,8" (zeros à esquerda saem: "0005" vira "5")
export function formatarDigitacao(texto: string) {
  const limpo = limpar(texto);
  if (!limpo) return '';
  const [inteiro, decimal] = limpo.split(',');
  const int = inteiro.replace(/^0+(?=\d)/, '') || (decimal !== undefined ? '0' : '');
  const comPontos = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal !== undefined ? `${comPontos},${decimal}` : comPontos;
}

// "1.234.567,89" -> 1234567.89 (vazio ou inválido -> null)
export function paraNumero(texto: string): number | null {
  const limpo = limpar(texto);
  if (!limpo || limpo === ',') return null;
  const n = parseFloat(limpo.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Número -> texto do campo, sem casas desnecessárias (1500 -> "1.500", 12.5 -> "12,5")
export function deNumero(valor: number | null | undefined) {
  if (valor == null || !Number.isFinite(valor)) return '';
  const [i, d] = String(Math.round(valor * 100) / 100).split('.');
  return formatarDigitacao(d ? `${i},${d}` : i);
}
