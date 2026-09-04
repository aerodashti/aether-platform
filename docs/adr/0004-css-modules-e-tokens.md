# ADR-0004: CSS Modules com tokens em custom properties

> **Quando ler este arquivo:** antes de propor Tailwind, CSS-in-JS, Storybook ou uma biblioteca de
> componentes.

- **Status:** aceito
- **Data:** 2026-09-04

## Contexto

O Aether atende um público de alto padrão e a identidade visual vem do Claude Design, que entrega
handoff bundles com tokens explícitos. O valor está em a interface parecer exatamente com o design,
não em montar telas rápido a partir de componentes genéricos.

## Decisão

CSS Modules com todos os valores vindo de custom properties geradas de
`design-system/tokens/tokens.json`. Nenhuma cor, fonte ou espaçamento literal fora de `tokens/` —
o Stylelint falha o build. Sem Tailwind, sem biblioteca de componentes, sem Storybook.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Tailwind | Classes utilitárias competem com o token como fonte de verdade e tornam difícil provar que nada escapou do design system. |
| MUI / Chakra / shadcn | Trazem uma identidade visual que teríamos que sobrescrever; o custo de fugir do padrão da biblioteca é maior que o de escrever o primitivo. |
| CSS-in-JS | Custo de runtime e mais uma dependência para resolver o que CSS Modules já resolve. |
| Storybook | Mais uma aplicação para manter. Enquanto os primitivos couberem em uma tela, o teste do Vitest e a própria aplicação bastam. |

## Consequências

- Cada primitivo é escrito à mão, com seus estados e acessibilidade. É trabalho consciente.
- Tema claro/escuro sai de graça: troca o valor da custom property em `[data-theme]`.
- Para provar visualmente um componente isolado não há ferramenta pronta; se isso doer, reabrimos
  a decisão sobre Storybook.

## Quando revisitar

Quando houver mais de uma dezena de primitivos e a falta de uma vitrine visual começar a custar
tempo de revisão.
