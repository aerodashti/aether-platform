# ADR-0021: Horários do trecho como instante em UTC

> **Quando ler este arquivo:** ao questionar ou revisitar esta decisão.

- **Status:** aceito
- **Data:** 2026-10-07

## Contexto

O trecho guardava partida e pouso como hora local solta (`TIME`) ao lado da data. Pouso antes da
partida era lido como virada de meia-noite: 10:45 → 10:00 virava um voo de 23,3 horas, sem nenhum
aviso, e um erro de digitação somava horas de célula falsas. A decisão de produto de 2026-10-07 é
guardar os horários sempre em UTC e mostrar no horário local.

A troca do tipo da coluna esbarra nos dados de desenvolvimento: o seed `V905` grava em `TIME` e,
num banco novo, roda **depois** de qualquer migration (`V900+`). Converter a coluna na própria
migration quebraria esse seed; reescrever o seed mudaria o checksum dele e obrigaria todo banco
local a ser apagado.

## Decisão

Partida e pouso, previstos e realizados, são `TIMESTAMPTZ` (`Instant` no domínio,
`OffsetDateTime` em UTC na API); a tela monta o instante com a data do trecho e a hora local, e
pouso na mesma hora ou antes da partida vai para o dia seguinte, dito na tela ("+1 dia"). O
servidor recusa pouso que não venha depois da partida.

A migração é em dois passos: a `V19` cria colunas novas e copia os dados lidos como horário de
Brasília; quem apaga as antigas e renomeia as novas é a própria `V19` em produção e o seed `V911`
em desenvolvimento. O placeholder do Flyway `dadosDeDesenvolvimento` (`sim` no perfil padrão,
`nao` em produção) decide.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| `TIME` com a regra da meia-noite e um alerta acima de N horas | Continua ambíguo e o limite N seria arbitrário; o produto decidiu por instantes |
| Converter a coluna no lugar e reescrever o `V905` | Muda o checksum do seed: todo banco local precisaria de `reset` |
| Manter as colunas antigas para sempre ao lado das novas | Esquema com colunas mortas em produção |

## Consequências

- A duração é a diferença entre dois instantes, sem regra de meia-noite; o fuso de quem lança não
  muda o voo.
- Migration que dependa de "existe seed ou não" tem um mecanismo: o placeholder
  `dadosDeDesenvolvimento`. Usá-lo é exceção — o caso normal continua sendo migration igual nos
  dois ambientes.
- A conversão dos dados existentes supõe que todo horário antigo foi digitado no horário de
  Brasília. Para uma operação fora desse fuso, os trechos antigos ficariam deslocados.

## Quando revisitar

Quando o seed `V905` for reescrito (num reset combinado do ambiente de desenvolvimento), o passo do
`V911` e o placeholder deixam de ser necessários.
