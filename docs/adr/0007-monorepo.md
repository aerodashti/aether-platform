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

- **A raiz tem `package.json`, `package-lock.json` e `node_modules/`, e isso é proposital.** Eles
  existem só para o `lefthook` e o `commitlint`, que são ferramentas de **git**, não de frontend:
  validam commits que tocam `backend/`, `docs/` e `infra/`, e `lefthook install` escreve em
  `.git/hooks`, na raiz. Movê-los para `frontend/` colocaria as regras de commit do backend dentro
  do projeto de frontend. Fugir do npm exigiria instalar o Lefthook por fora (`brew`) e trocar o
  commitlint por um equivalente exótico — mais atrito no setup do que os 72 MB ignorados pelo git
  que o `node_modules/` da raiz ocupa. O `npm install` da raiz é o passo 1 do README exatamente
  porque é ele que instala os hooks.
- Um PR pode mudar contrato e consumo ao mesmo tempo, e o CI valida os dois.
- Os pipelines de CI são separados e disparados por path: mexer no front não roda o build do back.
- Deploys continuam independentes; o monorepo não os acopla.
- A raiz precisa de disciplina para não virar depósito de script solto.

## Quando revisitar

Se surgir um terceiro artefato de deploy independente, ou se os ciclos de release se descolarem.
