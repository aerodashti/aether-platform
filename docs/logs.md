# Logs

> **Quando ler este arquivo:** antes de escrever qualquer log, e sempre que precisar rastrear um
> request de ponta a ponta.

## Níveis

| Nível | Quando usar | Exemplo |
| --- | --- | --- |
| `ERROR` | Algo quebrou e **exige ação humana** | Falha ao gravar no banco |
| `WARN` | Degradação recuperável | Consulta ao RAB caiu no fallback |
| `INFO` | Evento de negócio ou de ciclo de vida | "aeronave cadastrada", "aplicação iniciada" |
| `DEBUG` | Detalhe técnico de diagnóstico. **Desligado em produção** | Payload normalizado antes do mapeamento |

Não existe `TRACE` no projeto. Se `DEBUG` não basta, o problema é de teste, não de log.

## Backend

SLF4J com Logback. Em desenvolvimento o formato é legível; em produção (`spring.profiles.active=prod`)
é JSON, via `logstash-logback-encoder`, para ingestão direta.

### Correlation ID

`FiltroDeCorrelacao` roda antes de tudo:

1. lê o header `X-Request-Id`, ou gera um UUID se não vier;
2. coloca no MDC sob a chave `requisicao`;
3. devolve o mesmo valor no header da resposta;
4. limpa o MDC no `finally`.

Todo log de um mesmo request carrega esse valor. O frontend loga o `X-Request-Id` que veio na
resposta quando registra um erro de API — é assim que se liga um erro visto na tela ao log do servidor.

### Argumentos estruturados, nunca concatenação

```java
// certo
log.info("Aeronave cadastrada", kv("aeronaveId", aeronave.getId()));

// errado
log.info("Aeronave cadastrada: " + aeronave.getId());
```

Concatenação impede filtrar por campo e monta a string mesmo quando o nível está desligado.

### O que nunca vai para o log

Dados pessoais, documentos, tokens, senhas e corpo completo de request. Quando um identificador
precisa aparecer para diagnóstico, ele passa pelo `MascaradorDeLog`:

```java
MascaradorDeLog.mascararCpf("12345678901")   // "***.***.789-01"
MascaradorDeLog.mascararEmail("ana@x.com")   // "a**@x.com"
MascaradorDeLog.mascararToken(token)         // "***"
```

`MascaradorDeLogTest` prova cada um desses casos. Se você adicionar um tipo de dado sensível,
adicione o método **e** o teste.

### Proibições verificadas pelo build

`System.out`, `System.err` e `printStackTrace` são recusados pela regra de ArchUnit
`nenhumaClasseUsaSaidaPadrao`.

## Frontend

`src/compartilhado/log/logger.ts` expõe os mesmos quatro níveis:

```ts
import { logger } from '@/compartilhado/log/logger';

logger.info('tela de saúde aberta');
logger.erro('falha ao consultar saúde', { requisicao: idDaRequisicao, status: 500 });
```

- `logger.debug` é no-op em produção (`import.meta.env.PROD`).
- Erros de API são logados com o `X-Request-Id` da resposta, extraído pelo cliente HTTP.
- O ESLint proíbe `console.*` fora de `src/compartilhado/log/`. O wrapper é o único ponto que
  chama o console — e é onde o Sentry será plugado quando existir.
