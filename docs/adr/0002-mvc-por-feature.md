# ADR-0002: MVC por feature em vez de arquitetura hexagonal

> **Quando ler este arquivo:** antes de propor portas, adaptadores ou uma camada de domínio isolada.

- **Status:** aceito
- **Data:** 2026-09-04

## Contexto

O backend é um CRUD regulatório com regras de negócio concentradas no estado das entidades
(um vencimento venceu? a aeronave pode voar?). Não há múltiplos adaptadores de entrada nem troca
prevista de mecanismo de persistência. O time é pequeno e o repositório será mantido em boa parte
por sessões de IA, que se beneficiam de uma estrutura previsível e rasa.

## Decisão

Spring MVC organizado **por feature**: um pacote por feature com Controller → Service → Repository
e sua entidade JPA. A entidade é o modelo, e regras que dependem só do seu estado moram nela.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Hexagonal / Clean Architecture | Multiplicaria por três a quantidade de arquivos e introduziria mapeamento entre modelo de domínio e entidade JPA para desacoplar de algo que não vamos trocar. |
| Camadas horizontais (`controllers/`, `services/`) | Espalha uma feature por vários diretórios; toda mudança vira um passeio pelo repositório. |
| Modelo anêmico com regra no Service | É o caminho conhecido para o "service gordo". Explicitamente recusado em `docs/arquitetura.md`. |

## Consequências

- Uma feature é uma pasta: fácil de achar, fácil de remover.
- A entidade JPA aparece na camada de serviço; a fronteira que protegemos é a **borda HTTP**
  (DTO obrigatório), garantida por ArchUnit.
- Se um dia precisarmos de um segundo adaptador de entrada, a migração terá custo. Aceitamos.

## Quando revisitar

Se surgir um segundo canal de entrada relevante (mensageria, GraphQL) ou se um Service passar a
concentrar regra que não pertence a nenhuma entidade.
