# Observabilidade

> **Quando ler este arquivo:** antes de instrumentar qualquer código, antes de adicionar um campo à
> allowlist, e sempre que precisar investigar o que aconteceu em um request.

## O modelo mental: uma linha por request

Um request produz **uma** linha de log INFO, escrita quando ele termina, com tudo o que é preciso
para entender aquele request — identificação, duração, status, corpos tratados e todas as variáveis
que determinaram o caminho de execução. É o padrão *canonical log line*.

A consequência prática: **não se investiga um problema juntando linhas**. Você acha a linha do
request e ela já responde. Por isso `INFO` e `DEBUG` manuais não existem no código de negócio — o
que você quereria logar vira um campo da linha canônica.

Os mesmos campos viram atributos de um span do OpenTelemetry. Log e trace são intercambiáveis:
qualquer vendor compatível com OTel recebe a informação completa, e o `trace_id` liga os dois.

## A API: `ContextoDaRequisicao`

É a única API de observabilidade que o código de negócio usa. Nenhuma classe fora de
`comum/observabilidade` importa `io.opentelemetry` — há regra de ArchUnit para isso.

```java
contexto.registrar("cliente.id", clienteId);        // dado relevante do fluxo
contexto.decisao("cliente.ativo", clienteAtivo);    // variável que determina um ramo
contexto.decisao("pedido.status", status);          // enums, switch
contexto.registrarErro(excecao);                    // chamado pelo advice, não por você
```

- `registrar` grava o atributo no span corrente e acumula para a linha canônica.
- `decisao` faz o mesmo com o prefixo `decisao.`.
- Valores tipados: boolean, número, string, enum, lista de escalares. Objeto complexo passa pelo
  `SanitizadorDeLog` antes de virar campo.

### A regra das decisões

> **Toda variável que determina um ramo de execução é registrada com `contexto.decisao` antes do
> desvio.**

`if`, `else`, `switch`, condição de loop, early return, ternário que muda o resultado. Registre
**antes**, nunca depois — o objetivo é que a linha explique o caminho mesmo quando ele foi o
inesperado. Na prática isso quase sempre significa extrair a condição para uma variável nomeada:

```java
// certo
boolean possuiIndisponivel = registros.stream().anyMatch(RegistroDeSaude::estaIndisponivel);
contexto.decisao("saude.possui_indisponivel", possuiIndisponivel);
if (possuiIndisponivel) {
  return SituacaoDeSaude.INDISPONIVEL;
}

// errado: a linha canônica não vai saber por que o retorno foi INDISPONIVEL
if (registros.stream().anyMatch(RegistroDeSaude::estaIndisponivel)) {
  return SituacaoDeSaude.INDISPONIVEL;
}
```

O efeito colateral é bom: a condição ganha nome.

## Sanitização: allowlist, não denylist

Tudo é mascarado por padrão. Um campo só aparece em claro se o nome dele estiver em
`backend/src/main/resources/observabilidade/campos-permitidos.yml`. Esse arquivo é a **única**
fonte da política.

| Regra | Comportamento |
| --- | --- |
| Campo fora da allowlist | vira `***`, em qualquer profundidade |
| String acima de 500 caracteres | truncada, com sufixo `…[truncado, 2310 chars]` |
| Lista com até 5 itens | aparece inteira |
| Lista com mais de 5 itens | `{itens: [os 5 primeiros], _total: N}` |
| Objeto aninhado | mesma regra, recursivamente, até profundidade 6 |
| Multipart ou binário | **nunca é lido**: registra só `content_type` e `tamanho_bytes` |

### Como adicionar um campo à allowlist

1. Pergunte se ele é necessário para investigar um request. Se não for, não adicione.
2. Pergunte se ele é dado pessoal, documento, credencial ou conteúdo escrito pelo usuário. Se for,
   **não adicione** — registre um identificador em vez do valor.
3. Acrescente o nome exato do campo, como aparece no JSON, na seção certa do arquivo.
4. Rode `./gradlew test --tests '*SanitizadorDeLogTest'`.

A comparação é exata e sensível a maiúsculas: `situacaoGeral` não libera `situacaogeral`.

## Erros

O `TratadorGlobalDeErros` chama `contexto.registrarErro(e)`, que grava `span.recordException`, marca
o span com status `ERROR` e registra `erro.classe`. A linha canônica sai normalmente, com
`erro=true` e o `http.status` real.

**Falha inesperada (5xx)** gera, além da canônica, uma linha `ERROR` com stack trace e o
`requestId` — são exatamente duas linhas. **Exceção de domínio (4xx)** não gera segunda linha: a
canônica já tem `erro=true` e `erro.classe`, e um `ERROR` com stack trace por 404 tornaria o nível
`ERROR` inútil para alarme.

## O que sai no console de dev

Um request com sucesso:

```
21:29:18.002 INFO  [0bac00f4-b103-405b-bdf8-4b8217e66f86 3052a33a71ef1b4a76eeeb6cbde0f153] b.c.a.a.c.o.FiltroDeLinhaCanonica - requisicao {http.metodo=GET, http.rota=/saude, http.status=200, duracao_ms=73, response.body={situacaoGeral=OPERANTE, versao=0.1.0, componentes=[{componente=api, situacao=OPERANTE, verificadoEm=2026-09-05T00:29:17.937814Z, saudavel=true}, {componente=banco, situacao=OPERANTE, verificadoEm=2026-09-05T00:29:17.937814Z, saudavel=true}]}, saude.componentes_monitorados=2, decisao.saude.sem_componentes=false, decisao.saude.possui_indisponivel=false, decisao.saude.todos_saudaveis=true, saude.situacao_geral=OPERANTE, erro=false}
```

Entre colchetes: o `requestId` e o `trace_id`. Depois de `requisicao`, todos os campos.

Um request que falha (`GET /saude/falha-proposital`, que existe só para demonstrar isto):

```
21:29:33.995 ERROR [demo-erro fff0e64062d7a0ab324273a65f24ac47] b.c.a.a.c.e.TratadorGlobalDeErros - Falha inesperada ao processar a requisição (requestId=demo-erro)
java.lang.IllegalStateException: Falha proposital para demonstrar a observabilidade.
	at br.com.aerodash.aether.saude.SaudeDemonstracaoController.falharDeProposito(...)
	...
21:29:34.009 INFO  [demo-erro fff0e64062d7a0ab324273a65f24ac47] b.c.a.a.c.o.FiltroDeLinhaCanonica - requisicao {http.metodo=GET, http.rota=/saude/falha-proposital, http.status=500, duracao_ms=26, response.body={type=about:blank, title=Erro interno, status=500, detail=Não foi possível concluir a operação. Tente novamente em instantes., instance=/saude/falha-proposital, requisicao=demo-erro}, saude.demonstracao=linha canônica com erro, decisao.saude.deve_falhar=true, erro=true, erro.classe=IllegalStateException}
```

Duas linhas, o mesmo `trace_id` nas duas.

### Campos da linha canônica

| Campo | O que é |
| --- | --- |
| `http.metodo` | Verbo HTTP |
| `http.rota` | O **template** da rota (`/saude/componente/{componente}`), não a URL com ids |
| `http.status` | Status real da resposta |
| `duracao_ms` | Tempo do request inteiro, medido pelo filtro |
| `usuario.id` | Quando há usuário autenticado |
| `request.body` / `response.body` | Corpos depois da sanitização; ausentes quando vazios |
| `decisao.*` | Tudo que veio de `contexto.decisao` |
| `erro` | Sempre presente, `true` ou `false` |
| `erro.classe` | Só quando `erro=true` |

Rotas de infraestrutura (`/actuator`, Swagger, `/v3/api-docs`, favicon) não geram linha canônica.

## Como ver localmente

O padrão é console e nada mais: sem exporter, o request produz uma linha e pronto.

Para ver os spans no console, sem subir nada:

```bash
OTEL_TRACES_EXPORTER=logging ./gradlew bootRun
```

Para ver traces e logs em uma interface, com o coletor local:

```bash
docker compose -f infra/docker-compose.yml --profile observabilidade up -d
# Interface em http://localhost:5080 — usuário dev@aerodash.com.br, senha observabilidade

cd backend
export OTEL_TRACES_EXPORTER=otlp OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:5080/api/default"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(printf 'dev@aerodash.com.br:observabilidade' | base64)"
./gradlew bootRun
```

Para o frontend entrar no mesmo trace:

```bash
cd frontend
VITE_OTEL_ENDPOINT="http://localhost:5080/api/default" \
VITE_OTEL_HEADERS="Authorization=Basic $(printf 'dev@aerodash.com.br:observabilidade' | base64)" \
npm run dev
```

A escolha do coletor está em `docs/adr/0011-coletor-local-de-observabilidade.md`.

## Frontend

A fachada em `src/compartilhado/observabilidade/observabilidade.ts` é o espelho do backend:

```ts
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

contexto.interacao('consultar-saude', () => buscar<Saude>('/saude'));
contexto.registrar('http.status', 200);
contexto.decisao('saude.operante', true);
contexto.erro('Falha na requisição à API');
```

- `interacao` delimita uma ação de usuário: abre um span, acumula o que acontecer dentro e emite
  **uma** linha ao terminar. Aceita função síncrona ou que devolva Promise.
- O SDK só é registrado quando `VITE_OTEL_ENDPOINT` está definido; sem ele, tudo é no-op e o
  console mostra apenas a linha da interação em dev.
- Toda chamada de API registra `http.status` e o `requisicao` (o `X-Request-Id` da resposta) — é
  assim que um erro visto na tela liga ao request do servidor.
- O `traceparent` vai em toda chamada ao backend, então o span do servidor nasce dentro do trace
  da interação do browser.
- O ESLint proíbe `console.*` fora da fachada.

## Proibições verificadas pelo build

| Regra | Onde |
| --- | --- |
| `io.opentelemetry.*` só em `comum/observabilidade` | ArchUnit, `opentelemetrySoNaObservabilidade` |
| Nenhum `Logger.info` ou `Logger.debug` fora de `comum` | ArchUnit, `negocioNaoEmiteInfoNemDebug` |
| Nenhum `System.out`, `System.err`, `printStackTrace` | ArchUnit, `nenhumaClasseUsaSaidaPadrao` |
| Nenhum `console.*` fora da fachada | ESLint, `no-console` |

`ERROR` e `WARN` continuam permitidos em qualquer lugar: são para o que exige ação humana, não para
narrar o fluxo. A regra foi implementada em **ArchUnit e não em Checkstyle** porque depende do
*tipo* do receptor da chamada — só o ArchUnit sabe que aquela variável é um `org.slf4j.Logger`;
o Checkstyle enxerga tokens e teria que adivinhar pelo nome da variável.
