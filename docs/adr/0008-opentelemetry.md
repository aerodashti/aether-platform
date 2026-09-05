# ADR-0008: OpenTelemetry como padrão de observabilidade

> **Quando ler este arquivo:** antes de adicionar um SDK de APM, um agente ou uma biblioteca de
> métricas.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

O Aether precisa ser investigável em produção sem que a escolha de ferramenta seja irreversível. É
um produto novo, sem contrato com vendor de observabilidade, e trocar de vendor não pode significar
reinstrumentar o código. Ao mesmo tempo, o time é pequeno: instrumentação que exige disciplina
manual em cada endpoint não sobrevive.

## Decisão

OpenTelemetry, via **SDK** e `opentelemetry-spring-boot-starter` — **não** via Java Agent. O
exporter é OTLP, configurado por variável de ambiente (`OTEL_EXPORTER_OTLP_ENDPOINT`); em dev o
padrão é não exportar nada, e `OTEL_TRACES_EXPORTER=logging` despeja os spans no console. Nenhum
vendor é escolhido.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Java Agent do OpenTelemetry | Instrumenta mais coisas de graça, mas a configuração some do repositório: o comportamento passa a depender de uma flag de JVM que ninguém vê no code review. Queremos o oposto — a configuração visível em `application.yml` e em `ConfiguracaoDeObservabilidade`. |
| Micrometer Tracing (padrão do Spring Boot) | Mais uma camada de abstração sobre o OTel, com vocabulário próprio. Como já vamos falar OTLP, a camada só adiciona tradução. |
| SDK de vendor (Datadog, New Relic, Sentry) | Amarra o código ao vendor. Com OTel, trocar de destino é trocar uma variável de ambiente. |
| Nada além de log | O que motivou este ADR foi justamente precisar ligar frontend, backend e banco em um mesmo request. |

## Consequências

- O `traceparent` do browser entra no span do servidor: front e back ficam no mesmo trace.
- O `trace_id` aparece em toda linha de log, via MDC, então log e trace se cruzam.
- Precisamos manter uma versão do core do OTel compatível com a da instrumentação: o BOM do Spring
  Boot fixa uma versão mais antiga, e `build.gradle.kts` sobrescreve `opentelemetry.version`.
- Os módulos de Logback da OTel são publicados como `-alpha`. Usamos deles apenas dois nomes de
  classe de appender; se a API mudar, o impacto é o `logback-spring.xml`.
- Instrumentação automática traz spans que não pedimos (JDBC, por exemplo). É informação útil, mas
  aumenta o volume — e volume de trace custa dinheiro no vendor que vier.

## Quando revisitar

Se o custo de ingestão do vendor escolhido virar problema, ou se o Spring Boot passar a embarcar o
OTel de forma nativa e sem a camada do Micrometer.
