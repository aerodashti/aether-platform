# ADR-0007: Monorepo com backend e frontend

> **Quando ler este arquivo:** ao propor separar os repositórios ou unificar as ferramentas de build.

- **Status:** aceito
- **Data:** 2026-09-04

## Contexto

Backend e frontend do Aether são desenvolvidos pelo mesmo time, mudam juntos e compartilham um
contrato (o OpenAPI). A maior parte das mudanças de feature toca os dois lados.

## Decisão

Um repositório com `backend/` e `frontend/` independentes: cada um com seu build (Gradle e npm),
seu `CLAUDE.md` e seu pipeline de CI. A raiz guarda apenas documentação, hooks de git e infra.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Dois repositórios | Uma mudança de contrato viraria dois PRs coordenados e o `gerar-tipos` perderia a garantia de estar sincronizado. |
| Monorepo com ferramenta única (Nx, Turborepo, Gradle composite) | Camada de orquestração para dois projetos que já sabem se construir sozinhos. Só se justificaria com muito mais módulos. |

## Consequências

- Um PR pode mudar contrato e consumo ao mesmo tempo, e o CI valida os dois.
- Os pipelines de CI são separados e disparados por path: mexer no front não roda o build do back.
- Deploys continuam independentes; o monorepo não os acopla.
- A raiz precisa de disciplina para não virar depósito de script solto.

## Quando revisitar

Se surgir um terceiro artefato de deploy independente, ou se os ciclos de release se descolarem.
