# ADR-0006: Estratégia de logs

> **Quando ler este arquivo:** antes de adicionar log, APM ou uma biblioteca de observabilidade.

- **Status:** substituído por ADR-0008 e ADR-0009
- **Data:** 2026-09-04

## Contexto

O Aether lida com dados de proprietários de aeronaves — pessoas identificáveis e de alta exposição.
Vazar CPF ou documento em log é um risco concreto de LGPD e de imagem. Ao mesmo tempo, um suporte
que atende esse público precisa conseguir explicar rapidamente o que aconteceu em um request
específico.

## Decisão

SLF4J com Logback, JSON em produção e formato legível em desenvolvimento. Um correlation ID por
request (`X-Request-Id`), propagado por MDC e devolvido no header. Quatro níveis com significado
fixo. Nenhum dado pessoal no log: o que precisa aparecer passa por `MascaradorDeLog`, coberto por
teste. No frontend, um `logger` único em `compartilhado/log`, com `console.*` proibido pelo ESLint
fora dele.

O detalhe operacional está em `docs/logs.md`.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Sentry/Datadog já no bootstrap | Não há produção ainda. O wrapper de log existe justamente para que plugar isso depois seja uma mudança de um arquivo. |
| Log estruturado só em produção, texto livre em dev | Duas formas de escrever log; a de dev acabaria em produção. |
| Sem correlation ID | Sem ele, achar o request de um cliente específico vira busca por horário. |

## Consequências

- Todo log de negócio precisa decidir conscientemente o que expor. É atrito proposital.
- `MascaradorDeLog` cresce conforme surgem tipos de dado sensível — cada método com seu teste.
- Já existe o ponto exato onde o Sentry entra, no frontend e no backend.

## Quando revisitar

Já foi. Em 2026-09-05 esta decisão foi substituída: o correlation ID e a proibição de dado pessoal
continuam valendo, mas o modelo deixou de ser "logue eventos com níveis" e passou a ser
"uma linha canônica por request, espelhada em um span do OpenTelemetry". Veja
`0008-opentelemetry.md`, `0009-canonical-log-line.md` e `0010-sanitizacao-por-allowlist.md`.
O `MascaradorDeLog` citado acima não existe mais: a política virou allowlist.
