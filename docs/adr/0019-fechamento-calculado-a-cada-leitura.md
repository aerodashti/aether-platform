# ADR-0019: O fechamento é calculado a cada leitura, não gravado

> **Quando ler este arquivo:** antes de mexer no rateio, de pensar em "fechar o mês" com trava, ou
> de criar outra tela que mostre saldo de proprietário.

- **Status:** aceito
- **Data:** 2026-10-05

## Contexto

O Fechamento do Projeto final mostra, por competência, quanto de cada custo coube a cada
proprietário e o saldo dele no fundo; a frota, o detalhe e os cartões de proprietário mostram o
saldo de hoje. Os dados de origem vivem em cinco features — custos, voos, aportes (com
rendimentos), contratos de participação e a configuração financeira da aeronave — e todos podem
ser corrigidos depois: um lançamento esquecido, um trecho com a hora errada, um contrato
redistribuído. O volume é pequeno: uma aeronave tem dezenas de lançamentos por mês.

## Decisão

O fechamento é uma leitura: `fechamento/CalculadoraDoFechamento` apura cada competência desde o
primeiro movimento da aeronave a cada pedido, a partir dos repositórios das features donas, e nada
dele é gravado.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Gravar o fechamento de cada mês (tabela de saldos por proprietário e competência) | Toda correção em custo, voo, aporte ou contrato precisaria invalidar e regravar os meses seguintes — e esquecer um caminho deixa saldo errado em silêncio. Não há, hoje, ato de "fechar o mês" que justifique congelar |
| Uma porta por feature lida (como `ParticipantesDaAeronave`) | Seriam cinco interfaces que só repetem o repositório. O fechamento não muda regra de ninguém; ele lê. Nenhuma feature importa o fechamento, então não há ciclo |
| Calcular no navegador | O rateio é regra de negócio e o extrato do proprietário precisa sair igual em qualquer tela; o servidor é a fonte |

## Consequências

- Corrigir um lançamento antigo corrige os saldos de todos os meses seguintes, sem migração.
- A calculadora é pura (entram os movimentos, sai a apuração) e é testada sem banco; a integração
  confere as invariantes — linhas somam o total, contas somam o fundo.
- Custo: cada leitura refaz a história da aeronave. `/fechamentos/saldos` faz isso para a frota
  inteira. Aceitável enquanto a frota é de dezenas e a história de poucos anos.
- Custo: não existe "mês fechado" — um mês já cobrado pode mudar se alguém corrigir o passado. Hoje
  isso é desejado; quando o produto cobrar o proprietário a partir do fechamento, não será.
- `fechamento` importa repositórios de `aeronave`, `custo`, `voo`, `aporte` e `participacao`.
  Nenhuma delas pode passar a importar `fechamento`.

## Quando revisitar

Quando o fechamento passar a gerar cobrança ou extrato enviado ao proprietário (aí o mês precisa
ser congelado e a correção vira lançamento de ajuste no mês corrente), ou quando `/fechamentos/saldos`
passar de centenas de milissegundos na linha canônica.
