/*
 * Tokens de motion: fonte única de verdade para todo o projeto.
 * Espelhados em CSS (styles.css, :root) como --ease-* e --dur-*.
 * Curvas: Emil Kowalski (emil-design-eng §3). Springs: apple-design §4.
 */

export const ease = {
  out: [0.23, 1, 0.32, 1], // entradas e respostas de UI
  inOut: [0.77, 0, 0.175, 1], // algo que já está na tela se movendo
  drawer: [0.32, 0.72, 0, 1], // gavetas e sheets estilo iOS
} as const;

export const duration = {
  press: 0.16,
  tooltip: 0.125,
  hover: 0.2,
  toggle: 0.22,
  exitFast: 0.18,
  modal: 0.3,
  revealShort: 0.55,
  reveal: 0.8,
} as const;

// Springs por duração: fáceis de raciocinar, NÃO herdam velocidade.
export const spring = {
  ui: { type: 'spring', bounce: 0, visualDuration: 0.4 }, // Apple: damping 1.0, response 0.4
  snappy: { type: 'spring', bounce: 0, visualDuration: 0.25 },
  sheet: { type: 'spring', bounce: 0.15, visualDuration: 0.3 }, // Apple: drawer 0.8 / 0.3
} as const;

// Springs físicas: HERDAM velocidade. Use em gestos e motion values.
export const physics = {
  momentum: { type: 'spring', stiffness: 260, damping: 28 },
  pointer: { stiffness: 150, damping: 15, mass: 0.1 },
  tilt: { stiffness: 200, damping: 20 },
  indicator: { stiffness: 100, damping: 30, restDelta: 0.001 },
} as const;

export const stagger = { chars: 0.03, words: 0.04, items: 0.06 } as const;

// Projeção de momentum (apple-design §6): onde o gesto vai parar.
export function project(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

export const finePointerQuery = '(hover: hover) and (pointer: fine)';
