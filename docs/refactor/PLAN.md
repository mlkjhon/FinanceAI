# Plano (fase 2)

## Design read

Lendo como: landing de produto de finanças pessoais para pessoas físicas no Brasil que querem organizar o dinheiro sem planilha, com linguagem calma e confiável de fintech, puxando para grotesk de contraste + Tailwind v4 + motion coreografado com contenção.

## Dials

| Dial | Valor | Motivo |
|---|---|---|
| `DESIGN_VARIANCE` | 6 | atual 4 + 2 |
| `MOTION_INTENSITY` | 8 | exigido para o catálogo de 31 motions; reduced motion obrigatório |
| `VISUAL_DENSITY` | 4 | igual ao atual |

## Skills por fase

| Skill | Fase |
|---|---|
| `redesign-existing-projects` | 1 |
| `find-animation-opportunities`, `improve-animations` | 1 |
| `design-taste-frontend` | 2, 3, 5 |
| `emil-design-eng`, `animate`, `apple-design` | 3, 4 |
| `animation-vocabulary` | 3 (nomes no inventário) |
| `pick-ui-library` | 3 (Base UI para tooltip) |
| `mobile-native` | 4, 5 |
| `review-animations`, `break-ui` | 5 |
| `full-output-enforcement` | todas |
| `/motion` (Motion AI Kit / MCP) | **não instalado** nesta sessão; a API foi conferida direto no pacote `motion@14.0.0` e no CHANGELOG oficial |

## Mapa de layout

| # | Seção | Família | Colapso < 768px |
|---|---|---|---|
| 1 | Hero | split assimétrico 7fr / 5fr | texto, CTAs empilhados, imagem 4:5 abaixo |
| 2 | Indexadores | marquee | igual, faixa única |
| 3 | Manifesto | tipografia sticky | sticky mantido, 200vh |
| 4 | Recursos | bento 12 colunas | 1 coluna |
| 5 | Como funciona | narrativa sticky 5fr / 7fr | lista empilhada com imagens |
| 6 | Open Finance | mídia full-bleed + texto/estatísticas | empilhado |
| 7 | Módulos | pan horizontal | scroll-snap nativo |
| 8 | Simulador | ferramenta interativa 5fr / 7fr | empilhado |
| 9 | Depoimentos | carrossel de citação única | igual, controles quebram linha |
| 10 | Dúvidas | lista + accordion | 1 coluna |
| 11 | CTA final | bloco com cortina circular + formulário | input e botão empilhados |
| 12 | Footer | revelado por baixo + wordmark | empilhado |

Nove famílias diferentes; no máximo duas seções seguidas em split imagem + texto (5 e 6).

```
1 Hero                         4 Recursos (bento)              5 Como funciona (sticky)
+---------------+--------+     +-----------+-------+           +----------+--------------+
| Headline      |        |     |  IA       | Dash  |           | > passo 1|              |
| subtexto      | imagem |     |  (accent) +-------+           |   passo 2|   mídia      |
| [CTA] [demo]  |  4:5   |     |           | Metas |           |   passo 3|  (crossfade) |
+---------------+--------+     +----+------+-------+           +----------+--------------+
                               |Seg.|Orçam.| Tempo real|
2 Marquee                      +----+------+-----------+       7 Módulos (pan)
 CDI  Selic  IPCA  IGP-M ...>                                  [card][card][card][card]->
                               6 Open Finance
3 Manifesto (sticky)           +-------------------------+     8 Simulador
 "Você não precisa de mais     |  imagem (clip-path)     |     +---------+-------------+
  uma planilha..." palavra a   +------------+------------+     | valor   | R$ 22.968   |
  palavra                      | título     | 16 / 13 / 6|     | mês|ano | guardou/rend|
                               +------------+------------+     +---------+-------------+
9 Depoimento     10 Dúvidas          11 CTA final              12 Footer
 "citação..."    +------+------+     (   bloco verde abre   )   logo  links
 AP Ana  < >     |título| [+]  |     ( em círculo + e-mail  )   F I N A N C E A I
                 |      | [+]  |
```

## Sistema tipográfico

Sistema A (Cabinet Grotesk + Switzer). Detalhes e justificativa em TYPOGRAPHY.md.

## Shape lock

Botões e pills: `rounded-full`. Cards, mídia e blocos: 16px (`--radius-card`). Inputs e tooltip: 10px (`--radius-input`). Quadrado do logo: 10px (md) / 12px (lg), herdado da marca.

## Autocrítica

"Eu produziria este mesmo plano para qualquer landing parecida?"

- **Marquee de logos:** sim, seria genérico, e exigiria logos de clientes que não existem. Mudou para os 16 indexadores reais que o app aceita.
- **Contadores:** o padrão seria "+10 mil usuários". Não há dado real. Mudou para contagens tiradas do código (16 indexadores, 13 tipos de investimento, 6 módulos).
- **Seção de preços (M24):** o produto é gratuito; inventar planos seria fabricar. O toggle virou o simulador de juros com taxa de exemplo rotulada.
- **Formulário de lead (M27):** não há backend de leads. O formulário leva ao cadastro real com o e-mail preenchido.
- **Galeria (M18):** em vez de "cases", mostra os seis módulos reais do app.
