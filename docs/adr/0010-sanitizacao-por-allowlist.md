# ADR-0010: Sanitização de log por allowlist

> **Quando ler este arquivo:** antes de adicionar um campo a `campos-permitidos.yml`, ou ao ver
> `***` no lugar de um valor que você esperava.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

A linha canônica inclui corpos de request e de response. Isso é o que a torna útil e é exatamente o
que a torna perigosa: o Aether lida com dados de proprietários de aeronaves — pessoas
identificáveis e de alta exposição. Um campo novo em um DTO não pode virar vazamento porque
ninguém lembrou de mascará-lo.

## Decisão

Allowlist: **tudo é mascarado por padrão**. Um campo só aparece em claro se o nome dele estiver em
`backend/src/main/resources/observabilidade/campos-permitidos.yml`, que é a única fonte da política.
Além disso: string acima de 500 caracteres é truncada, lista acima de 5 itens vira
`{itens, _total}`, a recursão para na profundidade 6, e multipart ou binário nunca é lido.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Denylist (mascarar `cpf`, `senha`, `token`…) | Falha por omissão, que é o modo de falha caro. O campo perigoso é sempre o que ainda não está na lista. Foi o modelo anterior (`MascaradorDeLog`, ADR-0006) e foi descartado. |
| Anotação no DTO (`@NaoLogar`) | A política ficaria espalhada por dezenas de arquivos e não daria para auditar de uma vez. E não cobre corpo bruto que não tem DTO. |
| Não logar corpo nenhum | Seguro e inútil: metade das investigações começa por "o que exatamente o cliente mandou?". |

## Consequências

- Adicionar campo à allowlist é um ato deliberado, que aparece no diff e no code review. É atrito
  proposital.
- A primeira vez que alguém investiga uma feature nova, vê `***` e precisa liberar o campo. É o
  custo de o padrão ser seguro.
- Um arquivo único para auditar: dá para responder "o que este sistema loga?" lendo uma lista.
- A comparação é por nome de campo, não por caminho. Liberar `id` libera `id` em qualquer objeto —
  aceitável para escalares, e é por isso que a lista só deve conter nome de escalar ou de coleção
  cujo conteúdo também esteja liberado.

## Quando revisitar

Se surgir necessidade de política por caminho (`aeronave.proprietario.id` liberado mas
`voo.proprietario.id` não), ou se a lista crescer a ponto de ninguém a revisar.
