# Review de animações (`review-animations`)

Escopo: `frontend/src/components/landing/*`, `frontend/src/components/motion/*`, `frontend/src/styles.css`, `__root.tsx`, `Navbar.tsx`, `SplashScreen.tsx`, `ConicChart.tsx`.

## Parte 1: achados

| Before | After | Why |
| --- | --- | --- |
| `testimonials.tsx` setas do teclado chamavam `animate(x, ...)` | `goTo(i, 0, true)` faz `x.set` direto | Ação de teclado não anima (padrão 2: frequência) |
| `final-cta.tsx` espera artificial de 450ms + 350ms antes de navegar | 200ms + 200ms | Latência artificial no caminho de entrada é regressão (apple-design §1); o mínimo mantém os estados legíveis |
| `feature-bento.tsx` `getBoundingClientRect()` direto no `pointermove` | `frame.read` para medir, `frame.update` para escrever | Leitura e escrita misturadas forçam reflow (tier F) |
| `Navbar.tsx` nav entrando com `y: -60` no load | nav estática | Navegação não anima no load |
| `Navbar.tsx` drawer com `x` e spring sem saída própria | `transform` string, `--ease-drawer` 400ms, saída 200ms | Aceleração por hardware; saída mais rápida que a entrada (padrão 9) |
| `SplashScreen.tsx` `scale: 0` nos pontos | barras com `scaleY(0.2 → 1)` | Nada surge do zero (padrão 5) |
| `SplashScreen.tsx` contador via `requestAnimationFrame` + `setState` | `useMotionValue` + `animate` | Sem re-render por frame |
| `__root.tsx` app inteiro em `opacity 0 → 1` | landing sem fade; app com `.route-fade` CSS | Esconder o conteúdo atrasa o LCP |
| `styles.css` `.finance-card` com `transition-all duration-300` | `box-shadow` e `border-color` em 200ms | `all` anima propriedades fora da GPU (padrão 7) |
| 15 ocorrências de `transition-all` nas telas do app | lista explícita de propriedades | idem |

## Parte 2: veredito por tier

1. **Regressões de sensação:** nenhuma restante. Nenhum `ease-in` em UI; nenhum `scale(0)`; ações de teclado sem animação (carrossel). Exceção consciente: as setas no grupo de rádio do simulador movem a pill (`layoutId`, `spring.snappy` ~250ms). É indicação de estado de baixa frequência numa landing; se incomodar, basta desligar `layoutId` em navegação por teclado.
2. **Simplificações perdidas:** parágrafos de corpo não animam; motion ambiente limitado a M12, M13 e M31.
3. **Performance:** entradas usam string `transform` + `opacity`. Atalhos `x`/`y`/`scale` só em motion values ligados a scroll ou ponteiro (M04, M11, M13, M18, M19, M21, M23, M30). Blur animado no máximo 6px (M17) e 4px (M02). Marquee com track duplicado uma vez, pausado fora da tela e com a aba oculta. Medições com `frame.read`. Tier D só no accordion (M26), pequeno e com `contain: layout`. Tier C no spotlight (M21), limitado à célula.
4. **Interrupção e timing:** gestos e magnético usam springs físicas (herdam velocidade); o carrossel faz handoff de velocidade e projeção de momentum. Hover, press, underline e rolling label são transições CSS (interrompíveis). Saídas mais curtas que entradas (pill da nav 150ms, botão do formulário 120ms, drawer 200ms).
5. **Origem e coesão:** tooltip usa `var(--transform-origin)` do Base UI e `[data-instant]` a partir do segundo; o crossfade dos passos usa ponte de blur.
6. **Acessibilidade:** `MotionConfig reducedMotion="user"`; motion values ligados a `style` usam `useReducedMotion()` com valores estáticos (M04, M11, M13, M15, M18, M19, M21, M29, M30); marquee vira lista; manifesto vira texto; passos viram grade; galeria vira scroll-snap; accordion instantâneo; shake desligado. Hover gateado por `(hover: hover) and (pointer: fine)` no CSS e `matchMedia` no JS. Verificado em tela: esta máquina roda com animações desligadas no Windows e o Chrome herdou `prefers-reduced-motion: reduce`, o que permitiu ver toda a versão reduzida.

**Decisão: Approve**, com a ressalva de que hover, magnético, tilt e drag com dedo precisam de checagem humana em câmera lenta e em aparelho real (não reproduzem em headless).
