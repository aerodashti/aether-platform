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
| Arquitetura | ArchUnit | `ArquiteturaTest` — quatro regras, descritas abaixo. |

### Como rodar

```bash
cd backend
./gradlew check              # Spotless, Checkstyle, Error Prone, testes unitários, JaCoCo
./gradlew testeIntegracao    # testes marcados com @Tag("integracao") — exige Docker rodando
./gradlew test --tests '*SaudeServiceTest'
```

`check` **não** exige Docker: quem depende de contêiner está fora dele, na tarefa
`testeIntegracao`. Isso mantém o CI e a máquina de quem não tem Docker sempre verdes.

### As quatro regras de ArchUnit

1. **Sem ciclo entre pacotes de feature** — feature não conhece feature.
2. **`*Controller` não acessa `*Repository`** — a orquestração passa pelo Service.
3. **`@Entity` não aparece em assinatura pública de `*Controller`** — DTO na borda.
4. **Ninguém usa `System.out`, `System.err` ou `printStackTrace`** — logs passam pelo SLF4J.

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
