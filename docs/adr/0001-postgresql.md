# ADR-0001: PostgreSQL como banco de dados

> **Quando ler este arquivo:** ao considerar outro banco ou ao modelar dados.

- **Status:** aceito
- **Data:** 2026-09-04

## Contexto

O domínio do Aether é relacional e fortemente normativo: aeronave, proprietário, documento,
vencimento, inspeção, tripulante. As consultas centrais são temporais ("o que vence nos próximos
30 dias") e exigem integridade referencial. O time é pequeno e não tem operação de banco dedicada.

## Decisão

PostgreSQL 16, com Spring Data JPA e migrations versionadas por Flyway.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| MongoDB | O domínio é relacional; perderíamos integridade referencial e transações naturais em troca de flexibilidade que não precisamos. |
| MySQL | Equivalente para o caso, mas Postgres tem tipos de data/intervalo, `jsonb` e extensões que já sabemos que vamos querer. |
| SQLite | Não suporta o modelo multiusuário que o produto exige. |

## Consequências

- Migrations viram parte do código e do code review; nada de `ddl-auto: update`.
- Testes de repositório precisam de contêiner (Testcontainers), o que exige Docker na máquina.
  Por isso esses testes estão em `./gradlew testeIntegracao` e não no `check`.
- Ganhamos `jsonb` para guardar payload regulatório bruto sem criar tabela para cada formato.

## Quando revisitar

Se aparecer volume de série temporal (posições de voo em alta frequência) que não caiba em Postgres.
