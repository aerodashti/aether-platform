# ADR-0025: Concorrência nos contadores e no contrato sem `@Version`

> **Quando ler este arquivo:** ao escrever num total que outra tela também escreve (contadores da
> aeronave, contrato de participação), ou ao pensar em `@Version` para resolver um conflito.

- **Status:** aceito
- **Data:** 2026-10-07

## Contexto

A auditoria de formulários de 2026-10-07 achou três escritas que perdiam dados quando duas pessoas
agiam ao mesmo tempo:

- **Diário de voos (VOO-V01).** Lançar, corrigir ou excluir um trecho lê a aeronave, soma os
  contadores em memória e regrava a linha. Dois lançamentos simultâneos na mesma aeronave perdiam
  um dos voos.
- **Correção dos contadores (FIC-06).** Salvar a ficha, mesmo só para trocar o hangar, regravava
  os contadores lidos quando o painel abriu. Um voo lançado nesse meio-tempo sumia.
- **Contrato de participação (CON-13).** O pedido não dizia sobre qual contrato vigente foi montado,
  e o serviço arquivava o que estivesse vigente no momento. Dois gestores alterando a mesma
  aeronave, ou uma saída de proprietário montada antes de uma alteração, gravavam um contrato sobre
  uma base que ninguém viu.

A aeronave não tem `@Version`, e o contrato é imutável (ADR-0016).

## Decisão

Cada escrita usa a conferência que cabe no que ela sabe:

1. **Diário: trava pessimista na aeronave.** Toda escrita do diário carrega a aeronave com
   `PESSIMISTIC_WRITE` (`AeronaveRepository.findTravadaById`). Correção e exclusão travam também o
   trecho (`TrechoRepository.findTravadoById`). Lançamentos na mesma aeronave passam um de cada vez.
2. **Correção dos contadores: conferência otimista pelos totais lidos.** O `ContadoresRequest` leva
   `lidos`, os contadores que a tela mostrava ao abrir o painel. Se diferem dos atuais, a correção
   é recusada com 409 "Contadores desatualizados", e a tela pede para reabrir a edição. O front só
   envia os contadores quando alguém mexeu neles.
3. **Contrato: conferência pelo id do vigente.** `POST /aeronaves/{id}/contratos` aceita
   `contratoVigenteId`, nulo quando não havia vigente. `POST /proprietarios/{id}/saida` exige o
   `contratoVigenteId` de cada aeronave. Se outro contrato entrou em vigor, ou se as aeronaves de
   quem sai mudaram, a resposta é 409 "Contrato desatualizado" e nada é arquivado. A tela distingue
   esse 409 pelo `title` do Problem Details (`ErroDeApi.titulo`) e recomeça do contrato atual
   (`compartilhado/participacoes/conflito.ts`).

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| `@Version` na aeronave | Cada voo lançado mudaria a versão: a ficha e a configuração financeira acusariam conflito sem ter conflito, e lançamentos simultâneos de voo virariam `OptimisticLockException` |
| Soma atômica em SQL nos contadores (`UPDATE … SET horas = horas + ?`) | Duplicaria no banco o piso zero de `ContadoresDaAeronave.acumular`, que hoje mora na entidade |
| `@Version` com nova tentativa no diário | Mais código para um caso de poucos lançamentos simultâneos; a trava resolve sem repetir nada |
| `atualizadoEm` da aeronave como marca da correção | Pediria um campo novo no response e entraria em conflito com o PUT da ficha, encadeado logo antes |
| `@Version` no contrato | O contrato não muda depois de gravado (ADR-0016): o conflito é sobre qual contrato está vigente, e o id do vigente já diz isso |

## Consequências

- Lançamentos de voo na mesma aeronave são serializados. Em aeronaves diferentes, nada muda.
- A correção manual confere os totais lidos, mas não toma a trava do diário: um voo gravado entre
  a leitura e a escrita da própria correção ainda pode se perder. A janela passou de "o tempo do
  painel aberto" para "o tempo de uma transação".
- Dois `POST` simultâneos de contrato na mesma aeronave caem no 409 genérico de unicidade do
  vigente, não no "Contrato desatualizado".
- Quem recebe um 409 de contrato perde o que digitou: a tela recomeça do contrato atual, porque
  reaplicar percentuais sobre outra base daria um contrato que ninguém conferiu.

## Quando revisitar

Quando o volume de lançamentos simultâneos na mesma aeronave tornar a trava visível na latência,
ou quando a aeronave ganhar uma escrita frequente que não seja do diário.
