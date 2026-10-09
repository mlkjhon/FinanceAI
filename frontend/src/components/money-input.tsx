import { useLayoutEffect, useRef, type InputHTMLAttributes } from 'react';
import { formatarDigitacao } from '../lib/dinheiro';

/*
 * Campo de dinheiro com separador de milhar enquanto se digita.
 * O cursor fica no mesmo dígito depois que os pontos entram ou saem
 * (conta quantos dígitos/vírgula havia antes dele e reposiciona).
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onValueChange: (texto: string) => void;
};

const contaSignificativos = (s: string) => s.replace(/[^0-9,]/g, '').length;

export function MoneyInput({ value, onValueChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || cursor.current == null || document.activeElement !== el) return;
    // posição onde o mesmo número de dígitos/vírgula fica para trás
    let vistos = 0;
    let pos = 0;
    while (pos < value.length && vistos < cursor.current) {
      if (/[0-9,]/.test(value[pos])) vistos++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    cursor.current = null;
  }, [value]);

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onPaste={(e) => {
        // "1500.75" colado (ponto decimal, padrão americano) vira "1500,75"
        const colado = e.clipboardData.getData('text').trim();
        if (/^\d+\.\d{1,2}$/.test(colado)) {
          e.preventDefault();
          const el = e.currentTarget;
          const ini = el.selectionStart ?? el.value.length;
          const fim = el.selectionEnd ?? el.value.length;
          const novo = el.value.slice(0, ini) + colado.replace('.', ',') + el.value.slice(fim);
          cursor.current = contaSignificativos(novo.slice(0, ini + colado.length));
          onValueChange(formatarDigitacao(novo));
        }
      }}
      onChange={(e) => {
        let bruto = e.target.value;
        // Ponto DIGITADO (teclado numérico com ".") é decimal: vira vírgula
        const digitado = (e.nativeEvent as InputEvent).data;
        const pos = e.target.selectionStart ?? bruto.length;
        if (digitado === '.' && !bruto.includes(',')) bruto = bruto.slice(0, pos - 1) + ',' + bruto.slice(pos);
        const antes = bruto.slice(0, pos);
        cursor.current = contaSignificativos(antes);
        onValueChange(formatarDigitacao(bruto));
      }}
    />
  );
}
