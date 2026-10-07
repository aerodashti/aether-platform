# ADR-0023: O relógio da aplicação no fuso do negócio

> **Quando ler este arquivo:** ao comparar uma data com "hoje" no servidor, ao injetar ou fixar o
> `Clock` num teste, ou ao questionar por que o servidor não usa UTC para as datas.

- **Status:** aceito
- **Data:** 2026-10-07

## Contexto

O `Clock` da aplicação (`ConfiguracaoComum.relogio`) era `Clock.systemUTC()`, e as regras de data
comparavam com `LocalDate.now(relogio)`, que é o dia de UTC. Das 21h à meia-noite em Brasília, o
servidor já estava no dia seguinte. A auditoria de formulários de 2026-10-07 achou o efeito em
vários lugares:

- uma troca com a data de amanhã, futura para quem a lança, passava como "não futura", e concluir
  a troca gravava a devolução com a data de amanhã (TRO-08);
- uma manutenção programada para hoje virava "atrasada" três horas antes do fim do dia
  (MAN-V01);
- o limite do trecho planejado ficava um dia depois do da tela, que calcula no navegador.

Cada grupo corrigiu o seu com uma constante `America/Sao_Paulo` própria (aporte, rendimento, voo,
troca). Custo, tripulante, aeronave, manutenção, aviso e fechamento continuavam em UTC.

## Decisão

O relógio da aplicação está no fuso do negócio: `Clock.system(FusoDoNegocio.ZONA)`, com
`FusoDoNegocio` em `comum/config` e `ZONA = America/Sao_Paulo`. Todo `LocalDate.now(relogio)` é o
dia de Brasília, o mesmo que a tela calcula. `FusoDoNegocio.hoje(relogio)` e
`FusoDoNegocio.dataDe(instante)` são a forma explícita, para quem converte um `Instant`.

Os instantes não mudam: `Instant`, `TIMESTAMPTZ` e a API em UTC continuam como estão
(ADR-0021). O fuso só decide qual é o dia civil.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Manter UTC e uma constante de fuso por feature | Já eram quatro cópias, e as outras seis features continuavam erradas; a próxima regra de data nasceria em UTC por padrão |
| O fuso do navegador enviado pelo cliente em cada request | O dia de uma regra de negócio dependeria de quem chama; dois usuários veriam o mesmo lançamento aceito e recusado |
| Aceitar "hoje + 1 dia" nas regras de data futura | Esconde o erro em vez de corrigi-lo, e deixa passar uma data de amanhã durante 21 horas por dia |
| Só `FusoDoNegocio.hoje(relogio)`, com o `Clock` em UTC | Funciona, mas todo `LocalDate.now(relogio)` esquecido volta a ser o bug; com o relógio no fuso, o caminho óbvio é o certo |

## Consequências

- "Hoje" é o mesmo dia na tela e no servidor para quem está no fuso de Brasília, que é o público.
- Um teste que fixa o relógio em UTC, como a maioria dos atuais, não roda no fuso de produção.
  Para testar a virada das 21h, o relógio do teste precisa estar em `FusoDoNegocio.ZONA`
  (`Clock.fixed(…, FusoDoNegocio.ZONA)`).
- O fuso é fixo. Em Fernando de Noronha (UTC−2), entre 0h e 1h, o dia local ainda é "futuro"
  para o servidor; no Acre e no Amazonas o servidor vira o dia uma ou duas horas antes. Aceito: a
  operação do Aether é de Brasília.
- Os horários do trecho continuam no fuso do dispositivo, ditos no painel (ADR-0021). O fuso do
  negócio vale para as **datas civis** — o dia do custo, do crédito, da troca, da manutenção —, não
  para os horários de voo.

## Quando revisitar

Quando o Aether atender uma empresa cuja operação não seja no fuso de Brasília. Aí o fuso passa a
ser configuração da empresa, lida por `FusoDoNegocio`, e não constante.
