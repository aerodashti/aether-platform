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
pouso antes da partida vai para o dia seguinte, dito na tela ("+1 dia"). Pouso **na mesma hora**
da partida é recusado: é erro de digitação, não voo de 24 h. O servidor recusa pouso que não venha
depois da partida.

### As regras do par (correção dos formulários, 2026-10-07)

Partida e pouso de um mesmo par, previsto ou realizado, são um `ParDeHorarios`, e as regras valem
para os dois pares, na entidade e na tela:

- **Teto de 24 h.** Um par dura no máximo 24 h (`ParDeHorarios.possuiDuracaoPlausivel`, recusa em
  `campos.pousoPrevisto` ou `campos.pousoRealizado`). É a decisão de produto que substituiu o
  "alerta acima de N horas" descartado abaixo: o limite deixou de ser arbitrário porque é o
  próprio dia.
- **Completo ou vazio.** O par realizado vem inteiro ou não vem; a recusa aponta o campo que falta.
- **Perto da data.** A partida fica a no máximo 1 dia da data do trecho.
- **A partida realizada é assimétrica.** Ela cai no dia do trecho, salvo dois casos: vira o dia
  seguinte quando ficaria mais de 12 h antes da prevista (previsto 23:30, saiu 00:20), e recua para
  a véspera só até 3 h antes de uma prevista de madrugada (previsto 00:10, saiu 23:50). Prevista
  10:00 e realizada 23:00 é atraso no mesmo dia, não partida 11 h antes. Quando a data sai da data
  do trecho, o campo diz qual é.
- **Na correção, o horário intocado volta como foi gravado.** A partida intocada ancora o pouso
  alterado; o pouso intocado só fica no gravado se a partida também ficou. Sem isso, quem corrige
  noutro fuso deslocaria um dia o que não mexeu.
- **O painel diz o fuso.** "Horários no fuso deste dispositivo — America/Sao_Paulo": o fuso
  continua o do navegador, mas deixa de ser implícito.

A migração é em dois passos: a `V19` cria colunas novas e copia os dados lidos como horário de
Brasília; quem apaga as antigas e renomeia as novas é a própria `V19` em produção e o seed `V911`
em desenvolvimento. O placeholder do Flyway `dadosDeDesenvolvimento` (`sim` no perfil padrão,
`nao` em produção) decide.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| `TIME` com a regra da meia-noite e um alerta acima de N horas | Continua ambíguo e o limite N seria arbitrário; o produto decidiu por instantes, e depois pelo teto de 24 h na entidade |
| Pouso na mesma hora da partida como voo de 24 h | Num helicóptero, gravaria 24 h de célula e um ciclo por um erro de digitação; a única pista era o "+1 dia" |
| Partida realizada sempre no dia mais perto da prevista | Um atraso de mais de 12 h virava partida na véspera, e o pouso ia junto |
| Converter a coluna no lugar e reescrever o `V905` | Muda o checksum do seed: todo banco local precisaria de `reset` |
| Manter as colunas antigas para sempre ao lado das novas | Esquema com colunas mortas em produção |

## Consequências

- A duração é a diferença entre dois instantes, sem regra de meia-noite; o fuso de quem lança não
  muda o voo.
- Migration que dependa de "existe seed ou não" tem um mecanismo: o placeholder
  `dadosDeDesenvolvimento`. Usá-lo é exceção — o caso normal continua sendo migration igual nos
  dois ambientes.
- Um trecho de mais de 24 h não se registra. Para a frota do Aether (jatos executivos e
  helicópteros) não existe perna assim; se existir, é o teto que muda, na entidade e na tela.
- A janela de datas do trecho usa o "hoje" do servidor, no fuso do negócio (ADR-0023); o fuso
  dos horários continua o do dispositivo.
- A conversão dos dados existentes supõe que todo horário antigo foi digitado no horário de
  Brasília. Para uma operação fora desse fuso, os trechos antigos ficariam deslocados.

## Quando revisitar

Quando o seed `V905` for reescrito (num reset combinado do ambiente de desenvolvimento), o passo do
`V911` e o placeholder deixam de ser necessários.
