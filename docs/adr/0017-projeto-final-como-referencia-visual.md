# ADR-0017: "Projeto final Aether" é a referência visual, não a página "Teste"

> **Quando ler este arquivo:** antes de abrir o Claude Design para implementar ou conferir uma
> tela, e antes de mudar qualquer token de identidade (raio, paleta, alturas de controle).

- **Status:** aceito
- **Data:** 2026-09-14

## Contexto

O projeto "Aether — projeto final" do Claude Design tem duas páginas de produto:
`Projeto final Aether.dc.html` e `Teste.dc.html`. As duas desenham o mesmo conjunto de telas
(a "Teste" derivou da "final" e tem ~90% da estrutura em comum), mas com identidades diferentes:

- **Projeto final** — neutros quentes, cartões brancos sobre fundo `#fafafb`, barra lateral
  `#f4f4f6`, ação azul-aço `#5980a6` com hover `#2c455d`, raio 4px, controles 32/36/40. Os
  estilos estão inline no HTML; o `lib/ds-tokens-final.css` que a página importa só é usado de
  fato pelo tema escuro.
- **Teste** — neutros frios com viés azul, azul petróleo `#2e5e86`, cantos retos (raio 0),
  controles 32/40/48 e a "armadura de trilhas" como assinatura. Tokens em `lib/ds-tokens-teste.css`.

Até 2026-09-14 o produto seguiu a "Teste" por uma leitura errada do `CLAUDE.md` do projeto de
design (que a chamava de "único arquivo de trabalho" — das *fases de experimento*, não do produto).
O usuário corrigiu: a referência é o **Projeto final**. Além da pele, o Projeto final tem telas que
a "Teste" não desenha — Proprietários, Configurações, Documentos e o detalhe da aeronave —, e
Aeronaves e Proprietários lá são grades de **cartões**, não tabelas.

## Decisão

- `Projeto final Aether.dc.html` é a única referência para `/tela-do-design`. A "Teste" não é
  consultada nem para detalhe de comportamento.
- A migração acontece em duas fases. **Fase 1 — pele:** `tokens.json` recebe a paleta clara, o
  raio 4px, as alturas 32/36/40 e as sombras do Projeto final; os primitivos e a casca se alinham
  (botão secundário com rótulo na cor de ação, item de navegação sem barra lateral, título da tela
  no cabeçalho, avatar de iniciais). Nenhuma tela muda de estrutura nesta fase. **Fase 2 —
  telas:** cada tela cujo layout difere é reimplementada a partir do Projeto final, uma por PR,
  começando por Proprietários e Aeronaves.
- O tema escuro continua existindo e vem de `lib/ds-tokens-final.css`, porque é o único lugar em
  que o protótipo o define. Não é uma tradução do tema claro.
- A "armadura de trilhas" (`--armadura-*`) permanece nos tokens enquanto as grades existentes a
  consumirem; ela é herança da "Teste" e sai quando a última grade virar cartão, não antes.

## Consequências

- Documentação e comentários que justificavam "canto reto como identidade" ficaram falsos e
  foram reescritos; os que sobraram em telas ainda não migradas caem com a Fase 2 de cada tela.
- O memory do Claude Code que apontava a "Teste" como válida foi corrigido na mesma data.
- Toda tela nova nasce direto do Projeto final; nada mais é desenhado "no padrão da Teste".
