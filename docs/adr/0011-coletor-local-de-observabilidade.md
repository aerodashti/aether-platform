# ADR-0011: OpenObserve como coletor local

> **Quando ler este arquivo:** antes de trocar o serviço de observabilidade do Docker Compose.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

O modelo de observabilidade só se sustenta se um desenvolvedor conseguir ver o resultado sem
depender de ambiente compartilhado. Precisamos de **traces e logs** — os dois, porque a linha
canônica e o span carregam a mesma informação e o valor está em poder cruzar as duas formas — em um
serviço opcional, que não pese no dia a dia de quem só quer subir o banco.

## Decisão

`openobserve/openobserve` como serviço do Docker Compose sob o profile `observabilidade`. Um
contêiner, sem dependências, recebendo OTLP/HTTP de traces e de logs e servindo a interface em
`http://localhost:5080`. Não sobe com `docker compose up`; só com `--profile observabilidade`.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| `grafana/otel-lgtm` | É o "tudo em um" mais conhecido e aceita OTLP sem autenticação, mas são ~1,5 GB e quatro processos (Grafana, Tempo, Loki, Prometheus) para um uso local. |
| Jaeger v2 | Bem mais leve e sem autenticação, mas **só traces**. Perderíamos metade do que queremos cruzar. |
| SigNoz | Traces e logs, mas exige ClickHouse e vários contêineres. |
| OpenTelemetry Collector com exporter `debug` | O mais leve de todos, mas só imprime no console — sem interface, não substitui o `tail` que já temos. |
| Nada, só o console | Foi o ponto de partida. Funciona para uma request; não funciona para entender uma cadeia frontend → backend → banco. |

## Consequências

- 525 MB de imagem, contra ~1,5 GB da alternativa mais óbvia.
- A ingestão exige `Authorization: Basic`, então o comando documentado em `docs/observabilidade.md`
  tem uma variável a mais que o `grafana/otel-lgtm` teria. As credenciais são de desenvolvimento e
  estão no Compose.
- É ferramenta **local**. A escolha de destino em produção continua aberta: o backend fala OTLP e
  não sabe quem está do outro lado (ADR-0008).
- O profile mantém o `docker compose up` do dia a dia com um contêiner só.

## Quando revisitar

Ao escolher o destino de produção — pode fazer sentido usar localmente o mesmo produto — ou se a
autenticação na ingestão virar atrito recorrente.
