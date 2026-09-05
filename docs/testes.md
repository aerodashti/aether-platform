# Testes

> **Quando ler este arquivo:** antes de escrever um teste, e quando precisar decidir se algo deve
> ser teste ou documentação. A regra geral: **se pode ser um teste, é um teste.**

## Backend

| Camada | Ferramenta | O que testar |
| --- | --- | --- |
| Entidade | JUnit 5 + AssertJ, sem Spring | As regras de negócio: `estaOperante()`, `podeVoar()`. Rápido e sem mock. |
| Service | JUnit 5 + Mockito | Orquestração: o que acontece quando o repositório devolve vazio, quando a regra recusa, quando lança exceção de domínio. |
| Controller | `@WebMvcTest` + MockMvc | Contrato HTTP: status, formato do JSON, validação de entrada, Problem Details no erro. |
| Repositório / SQL | Testcontainers, `@Tag("integracao")` | Só quando há query própria ou migration a validar. Não teste o Spring Data. |
| Arquitetura | ArchUnit | `ArquiteturaTest` — seis regras, descritas abaixo. |

### Como rodar

```bash
cd backend
./gradlew check testeIntegracao   # a verificação completa — é o que o pre-push roda
./gradlew check                   # Spotless, Checkstyle, Error Prone, testes unitários, JaCoCo
./gradlew testeIntegracao         # testes @Tag("integracao") — sobe Testcontainers, exige Docker
./gradlew test --tests '*SaudeServiceTest'
```

`check` **não** exige Docker: quem depende de contêiner está fora dele, na tarefa
`testeIntegracao`. A separação existe para o `check` ser rápido no dia a dia e para o CI poder
tratar as duas etapas em separado — **não** é permissão para pular os testes de integração. O hook
de `pre-push` roda os dois, então o push exige Docker de pé.

### Testcontainers e a versão da API do Docker

`testeIntegracao` define `-Dapi.version=1.41`. O docker-java embutido no Testcontainers fala a API
1.32 por padrão, e o Docker Engine 25 e seguintes recusam qualquer versão abaixo da 1.40 com um
HTTP 400 que aparece como "Could not find a valid Docker environment" — mensagem que sugere Docker
desligado quando o problema é outro. Se um dia o Docker exigir um piso mais alto, esse é o número
a mexer, em `backend/build.gradle.kts`.

### As seis regras de ArchUnit

1. **Sem ciclo entre pacotes de feature** — feature não conhece feature.
2. **`*Controller` não acessa `*Repository`** — a orquestração passa pelo Service.
3. **`@Entity` não aparece em assinatura pública de `*Controller`** — DTO na borda.
4. **Ninguém usa `System.out`, `System.err` ou `printStackTrace`** — logs passam pelo SLF4J.
5. **`io.opentelemetry` só em `comum/observabilidade`** — o negócio fala com o `ContextoDaRequisicao`.
6. **Nenhum `Logger.info` ou `Logger.debug` fora de `comum`** — no negócio, isso vira
   `contexto.registrar` e `contexto.decisao` (veja `docs/observabilidade.md`).

Cada regra foi verificada violando-a de propósito e observando o build falhar. Se você precisar
relaxar uma delas, o caminho é um ADR, não um `@ArchIgnore`.

## Frontend

| Camada | O que testar |
| --- | --- |
| Primitivo do design system | Renderiza as variantes, aplica os tokens, mantém a semântica (papel, foco, `aria-*`). |
| Hook de feature | Estados do TanStack Query: carregando, sucesso, erro. |
| Componente de feature | O que a pessoa vê: texto na tela, estado de carregamento, mensagem de erro. Consulta por papel e texto acessível, nunca por classe CSS. |

Não há Playwright nem MSW nesta fase (`docs/adr/`). Chamadas de rede em teste são substituídas por
um `fetch` falso local ao teste.

```bash
cd frontend
npm run testar            # Vitest uma vez
npm run testar -- --watch # modo interativo
npm run verificar         # formato, lint, stylelint, tipos, build e testes
```

## O que não testar

- Getter, setter e mapeamento gerado pelo MapStruct.
- Configuração do framework (que `@RestController` responde HTTP).
- Detalhe de implementação: se o teste quebra quando você renomeia uma variável privada, ele testa
  a coisa errada.
