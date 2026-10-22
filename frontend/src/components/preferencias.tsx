import { Fragment, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { usePreferencia } from '../lib/preferencias';

/*
 * Aplica as preferências das configurações no app inteiro:
 * - "Reduzir animações" também vale para as animações em JS (motion)
 * - trocar "Ocultar valores" ou "Simplificar números" redesenha a tela com o novo formato
 */
export function Preferencias({ children }: { children: ReactNode }) {
  const reduzir = usePreferencia('reduzirAnimacoes');
  const ocultar = usePreferencia('ocultarValores');
  const simplificar = usePreferencia('simplificarNumeros');
  return (
    <MotionConfig reducedMotion={reduzir ? 'always' : 'user'}>
      <Fragment key={`${ocultar ? 'ocultos' : 'visiveis'}-${simplificar ? 'curtos' : 'inteiros'}`}>{children}</Fragment>
    </MotionConfig>
  );
}
