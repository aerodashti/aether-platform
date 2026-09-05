# Backend — regras específicas

> Leia primeiro o `CLAUDE.md` da raiz. Aqui está só o que é do backend.

## Estrutura

```
src/main/java/br/com/aerodash/aether/
├── AetherApplication.java
├── comum/            # config, erros e logs — nada de domínio
└── <feature>/        # Controller, Service, Repository, entidade, DTOs, Mapper
```

`saude/` é a feature de referência: leia-a antes de criar a sua.

## Como adicionar uma feature

1. Confirme o nome em `docs/glossario.md`.
2. Crie `br.com.aerodash.aether.<feature>` e, dentro dele, na ordem:
   - a **entidade** (`@Entity`, `@Table(name = "<singular>")`), com as regras que dependem só do
     próprio estado — como `RegistroDeSaude.estaSaudavel(agora)`;
   - a **migration** em `src/main/resources/db/migration/V<n>__cria_<tabela>.sql`;
   - o **repository** (`extends JpaRepository`);
   - os **records** de request/response, com `@Schema` do springdoc;
   - o **mapper** MapStruct (`componentModel = "spring"`);
   - o **service**, com injeção por construtor e campos `final`;
   - o **controller**, anotado com `@Tag` e `@Operation`.
3. Testes: entidade (sem Spring), service (Mockito), controller (`@WebMvcTest`) e, se houver
   migration ou query própria, um `@Tag("integracao")` com Testcontainers.

Ou rode `/nova-feature <nome>`.

## O que é específico daqui

- **Tempo.** Nunca chame `Instant.now()` direto. Injete o `Clock` (bean `relogio` em
  `ConfiguracaoComum`) e use `Instant.now(relogio)` — é o que torna a regra de frescor testável.
- **Erros.** Exceção nova herda de `ExcecaoDeDominio` e declara seu `HttpStatus`. Não escreva
  `@ExceptionHandler` fora de `TratadorGlobalDeErros`.
- **Logs.** `LoggerFactory.getLogger(<Classe>.class)` e argumentos estruturados
  (`kv("aeronaveId", id)`), nunca concatenação. Dado pessoal só via `MascaradorDeLog`.
- **Schema.** O Hibernate roda com `ddl-auto: validate`. Mudança de coluna é migration nova; nunca
  edite uma migration já aplicada.
- **Transação.** `@Transactional(readOnly = true)` em leitura. Escrita muda a entidade carregada e
  deixa o dirty checking gravar — não chame `save` para entidade já gerenciada.

## Limites que falham o build

- Checkstyle: 300 linhas por classe, 40 por método, identificadores só em ASCII.
- Spotless (`google-java-format`): rode `./gradlew spotlessApply` antes de commitar.
- ArchUnit (`ArquiteturaTest`): sem ciclo entre features, Controller não fala com Repository,
  entidade não aparece na assinatura pública de Controller, ninguém usa `System.out`/`System.err`/
  `printStackTrace`.

## Comandos

```bash
./gradlew check testeIntegracao       # verificação completa — é o que o pre-push roda
./gradlew check                       # Spotless, Checkstyle, Error Prone, testes, JaCoCo
./gradlew spotlessApply               # corrige a formatação
./gradlew testeIntegracao             # testes @Tag("integracao") — exige Docker
./gradlew test --tests '*SaudeServiceTest'
./gradlew bootRun                     # http://localhost:8080/swagger-ui.html
```

`check` não sobe contêiner. Se um teste precisa de Docker, ele tem que estar com
`@Tag("integracao")` — caso contrário ele quebra o `check` de quem está sem Docker no meio de
outra tarefa. A tag organiza; ela não dispensa ninguém de rodar o teste: o `pre-push` roda os dois.
