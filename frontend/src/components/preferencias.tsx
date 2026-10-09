import { Fragment, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { usePreferencia } from '../lib/preferencias';

/*
 * Aplica as preferências das configurações no app inteiro:
 * - "Reduzir animações" também vale para as animações em JS (motion)
 * - trocar "Ocultar valores" redesenha a tela com os valores escondidos/visíveis
 */
export function Preferencias({ children }: { children: ReactNode }) {
  const reduzir = usePreferencia('reduzirAnimacoes');
  const ocultar = usePreferencia('ocultarValores');
  return (
    <MotionConfig reducedMotion={reduzir ? 'always' : 'user'}>
      <Fragment key={ocultar ? 'ocultos' : 'visiveis'}>{children}</Fragment>
    </MotionConfig>
  );
}
