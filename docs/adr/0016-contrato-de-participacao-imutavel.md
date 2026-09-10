# ADR-0016: Contrato de participação imutável, com arquivamento

> **Quando ler este arquivo:** ao mexer em participações de proprietários, ao construir o rateio,
> ou ao propor "editar" um percentual existente.

- **Status:** aceito
- **Data:** 2026-09-10

## Contexto

A participação de cada proprietário numa aeronave muda ao longo do tempo — sócio entra, sócio sai,
percentuais se redistribuem. O rateio de uma competência passada, porém, precisa responder para
sempre com a foto **daquela época**: reabrir o fechamento de janeiro com os percentuais de julho
produziria números diferentes dos que foram cobrados.

A alternativa óbvia — uma tabela `participacao (aeronave, proprietario, percentual)` editável —
perde essa foto no primeiro UPDATE. Recuperá-la depois viraria trigger de auditoria ou tabela de
histórico paralela, as duas mantidas à mão.

## Decisão

Participação vive dentro de um **contrato de participação**, e contrato não se edita — se arquiva:

- `contrato_de_participacao` tem `inicio_da_vigencia` e `fim_da_vigencia`; o vigente é o de fim
  nulo, e um índice parcial único garante **no máximo um vigente por aeronave** no banco, não só
  no service.
- "Alterar participações" cria um contrato novo por inteiro e encerra o vigente no mesmo instante.
  O histórico é a própria tabela — sem trigger, sem cópia.
- A soma dos percentuais precisa fechar em 100,00 exatos (duas casas). 99,99 não é contrato.
- Um contrato idêntico ao vigente não arquiva nada: histórico que não conta história é ruído.
- `criado_por` grava o **nome** de quem salvou, não uma FK para o usuário: o histórico mostra
  "alterado por" para sempre, mesmo que a pessoa mude de nome ou saia da conta.

O percentual do contrato é **% de propriedade**. O % do rateio é derivado por competência (por uso
ou por propriedade, conforme a configuração da aeronave) e nunca é gravado aqui.

## Consequências

- O rateio de qualquer competência consulta o contrato vigente **naquela data** — a pergunta que
  esta estrutura existe para responder.
- Excluir proprietário com participação ativa é impossível por construção: primeiro sai do
  contrato (rebalanceamento cria um contrato novo), depois desativa. A tela de Proprietários
  ganha esse fluxo quando o rebalanceamento for construído.
- O flush do encerramento precisa preceder o INSERT do contrato novo (o Hibernate ordena inserts
  antes de updates e o índice parcial veria dois vigentes) — o service faz isso e o teste de
  integração o cobre.
