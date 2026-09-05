# ADR-0009: Uma linha canônica por request

> **Quando ler este arquivo:** antes de escrever `log.info` em código de negócio, ou ao estranhar
> uma linha de log com trinta campos.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

O modo tradicional de logar — várias linhas por request, cada uma narrando um passo — tem um custo
que só aparece durante um incidente: para entender um request você precisa achar todas as linhas
dele, na ordem certa, no meio das linhas de outros requests concorrentes. Some a isso o fato de que
a linha que faltava é sempre a que ninguém escreveu, porque ninguém previu aquele caminho.

## Decisão

Toda requisição HTTP produz **exatamente uma** linha de log INFO, emitida quando ela termina, com
identificação, duração, status, corpos tratados e todas as variáveis que determinaram o caminho de
execução. `INFO` e `DEBUG` manuais deixam de existir no código de negócio; o que se quereria logar
vira campo, por `contexto.registrar` e `contexto.decisao`. Os mesmos campos vão para o span.

A regra que sustenta o modelo: **toda variável que determina um ramo é registrada antes do desvio**.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Log por evento, com níveis (o modelo anterior, ADR-0006) | Investigar exige juntar linhas, e o volume de `INFO` cresce sem que a capacidade de explicar um request cresça junto. |
| Só tracing, sem log estruturado | Depende de ter um backend de traces de pé para qualquer diagnóstico, inclusive em dev. A linha canônica é legível com `tail`. |
| Linha canônica só em erro | O request que "funcionou" mas devolveu o resultado errado é justamente o caso difícil. |

## Consequências

- Uma linha por request é grande. É o preço: ela é autossuficiente.
- A regra das decisões força extrair condições para variáveis nomeadas — o código fica mais legível
  como efeito colateral.
- Fica fácil medir: `duracao_ms` e `http.status` estão em toda linha, sem instrumentação extra.
- Um `if` que alguém esquecer de registrar é uma lacuna invisível. Por isso a checagem entrou no
  `/revisar` — não há como um linter provar "toda condição foi registrada".
- Exceção de domínio (4xx) não gera segunda linha; falha inesperada (5xx) gera um `ERROR` com stack
  trace. Um `ERROR` por 404 tornaria o nível inútil para alarme.

## Quando revisitar

Se a linha canônica passar a ser truncada pela plataforma de logs, ou se o custo por byte ingerido
mudar a conta.
