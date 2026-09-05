# Arquitetura

> **Quando ler este arquivo:** antes de criar qualquer feature, endpoint, tela ou pasta nova, e
> sempre que a dúvida for "onde este código deve morar".

## Visão geral

```
Navegador ──HTTP──▶ frontend (Vite/React)  ──HTTP/JSON──▶ backend (Spring MVC) ──JDBC──▶ PostgreSQL
```

Não há BFF, gateway nem fila. O frontend fala direto com o backend, e os tipos do contrato são
gerados do OpenAPI que o backend publica (veja `docs/adr/0005-tipos-do-openapi.md`).

## Backend — MVC por feature

Cada feature é **um pacote** dentro de `br.com.aerodash.aether`, contendo tudo que ela precisa:

```
saude/
├── SaudeController.java             # borda HTTP, só DTOs
├── SaudeService.java                # orquestra, valida entrada, coordena repositórios
├── SaudeRepository.java             # Spring Data JPA
├── RegistroDeSaude.java             # entidade JPA — o modelo
├── SituacaoDeSaude.java             # enum de domínio
├── SaudeMapper.java                 # MapStruct: entidade → DTO
├── SaudeResponse.java               # record de resposta
└── ComponenteDeSaudeResponse.java   # record de resposta
```

Não existem pacotes horizontais (`controllers/`, `services/`, `repositories/`). O que é transversal
— configuração, tratamento de erros, logs — vive em `comum/`.

### Fluxo de um request

1. `FiltroDeLinhaCanonica` lê ou gera o `X-Request-Id`, abre o span do request e coloca tudo no
   MDC; ao final, emite a linha canônica e devolve o header. Veja `docs/observabilidade.md`.
2. `*Controller` recebe o DTO de request, validado por Bean Validation.
3. `*Service` orquestra: busca no repositório, chama regras da entidade, decide o que fazer.
4. `*Mapper` (MapStruct) converte entidade → DTO de response.
5. Se uma exceção de domínio subir, `TratadorGlobalDeErros` a converte em RFC 9457 Problem Details.

### A entidade é o modelo — defesa contra o "service gordo"

Regra que depende **apenas do estado da entidade** fica **na entidade**:

```java
// RegistroDeSaude.java
public boolean estaOperante() {
  return situacao == SituacaoDeSaude.OPERANTE;
}
```

O Service **não** reimplementa isso. Ele orquestra:

```java
// SaudeService.java
private static SituacaoDeSaude consolidar(List<RegistroDeSaude> registros, Instant agora) {
  if (registros.isEmpty() || registros.stream().anyMatch(RegistroDeSaude::estaIndisponivel)) {
    return SituacaoDeSaude.INDISPONIVEL;
  }
  if (registros.stream().allMatch(registro -> registro.estaSaudavel(agora))) {
    return SituacaoDeSaude.OPERANTE;
  }
  return SituacaoDeSaude.DEGRADADO;
}
```

O sintoma de que a regra está no lugar errado: o Service lê vários campos da entidade para tomar
uma decisão que a própria entidade poderia tomar. Se um `if` olha só para o estado de um objeto,
ele pertence àquele objeto.

### DTO na borda

Entidade JPA **nunca** é parâmetro nem retorno de método de `*Controller`. Um `record` por
request e por response, no mesmo pacote da feature, mapeado por MapStruct. A regra é verificada
pelo ArchUnit e falha o build.

### Erros

- Exceções de domínio herdam de `ExcecaoDeDominio` e vivem no pacote da própria feature quando são
  específicas dela; as genéricas ficam em `comum/erro`.
- Um único `@RestControllerAdvice` (`TratadorGlobalDeErros`) converte tudo em `ProblemDetail`
  (RFC 9457), com `title` e `detail` em português e o `X-Request-Id` na propriedade `requisicao`.

### Convenções obrigatórias de código

- Injeção por construtor, campos `final`. Sem `@Autowired` em campo.
- `Optional` em vez de `null` em retorno.
- `record` para DTOs.
- Comentário só explica **por que**, nunca **o que**.
- Checkstyle falha o build acima de 300 linhas por classe ou 40 por método.

### Como adicionar uma feature no backend

1. `docs/glossario.md`: confirme (ou adicione) o nome canônico do termo de domínio.
2. Crie o pacote `br.com.aerodash.aether.<feature>`.
3. Entidade JPA + migration Flyway em `src/main/resources/db/migration/V<n>__<descricao>.sql`.
4. `*Repository` estendendo `JpaRepository`.
5. `*Service` com injeção por construtor.
6. `record`s de request/response + `*Mapper` MapStruct.
7. `*Controller` anotado com `@Tag` do springdoc.
8. Testes: unitário da entidade, unitário do Service (Mockito), `@WebMvcTest` do Controller e,
   se houver query relevante, um teste `@Tag("integracao")` com Testcontainers.
9. `cd frontend && npm run gerar-tipos` com o backend no ar.

Ou use `/nova-feature <nome>`, que cria esse esqueleto nos dois lados.

## Frontend — feature-first

```
src/
├── app/            # rotas, providers, layout raiz
├── api/            # cliente HTTP base + tipos gerados do OpenAPI
├── design-system/  # tokens/ (fonte única de estilo) e primitivos/
├── features/       # uma pasta por tela: api/, componentes/, hooks/
└── compartilhado/  # só o que duas features já usam
```

- `features/<nome>/api/` guarda os hooks do TanStack Query daquela tela.
- Estado de servidor é do Query; estado de UI é `useState` ou contexto local. Não há store global.
- Lógica fora do JSX: extraia para hook. Componentes pequenos.
- `compartilhado/` começa praticamente vazio. A exceção deliberada é
  `compartilhado/observabilidade`, que é infraestrutura e não pertence a nenhuma feature.

### Fronteiras (falham o lint)

| Regra | Motivo |
| --- | --- |
| `design-system` não importa de `features`, `app` ou `api` | O design system tem que poder ser lido isoladamente |
| `features/A` não importa de `features/B` | Features se comunicam pela URL e pelo servidor, não por import |
| `compartilhado` não importa de `features` | Senão deixa de ser compartilhado |
| `<button>`, `<input>`, `<a>` crus só em `design-system` | Garante estados, acessibilidade e tokens em um lugar só |

### Como adicionar uma tela no frontend

1. `docs/glossario.md` para os nomes.
2. `src/features/<nome>/` com `api/` (hooks do Query) e `componentes/`.
3. Registre a rota em `src/app/rotas.tsx`.
4. Use os primitivos existentes; crie primitivo novo em `design-system/primitivos/` **apenas** se
   a tela precisar de algo que ainda não existe.
5. Estilo em CSS Modules, sempre via `var(--...)` dos tokens.
6. Teste com Vitest + Testing Library.

Ou use `/tela-do-design`, que parte de um handoff bundle do Claude Design.
