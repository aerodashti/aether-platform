# Aether — regras para o Claude Code

Aether é um aplicativo para proprietários de aeronaves particulares (jatos e helicópteros) no Brasil.
O diferencial é cobrir a camada regulatória brasileira (ANAC/RAB, CVA, RETA, RBAC 91/43/145, DECEA).
Público de alto padrão: a referência visual é gestão patrimonial, não ferramenta operacional de aviação.

## Mapa do repositório

| Diretório | O que vive aqui |
| --- | --- |
| `docs/` | Arquitetura, convenções, design system, observabilidade, testes e glossário |
| `docs/adr/` | Decisões técnicas registradas (ADR) |
| `.claude/commands/` | Comandos do projeto: `/nova-feature`, `/tela-do-design`, `/revisar`, `/adr` |
| `infra/` | Docker Compose do ambiente local |
| `scripts/` | `ambiente.sh` — sobe, derruba e recria o ambiente de desenvolvimento |
| `backend/` | Spring Boot 3, Java 21, Gradle Kotlin DSL, PostgreSQL |
| `backend/src/main/java/br/com/aerodash/aether/comum/` | Config, erros e observabilidade — nada de domínio |
| `backend/src/main/java/br/com/aerodash/aether/<feature>/` | Uma feature por pacote: Controller, Service, Repository, entidade, DTO, Mapper |
| `frontend/` | React 19, TypeScript strict, Vite |
| `frontend/src/app/` | Rotas, providers e layout raiz |
| `frontend/src/design-system/` | `tokens/` (fonte única de estilo) e `primitivos/` |
| `frontend/src/features/<nome>/` | `api/`, `componentes/`, `hooks/` de uma tela |
| `frontend/src/compartilhado/` | Só entra o que duas features já usam |
| `frontend/src/api/` | Cliente HTTP base e tipos gerados do OpenAPI |

## Comandos essenciais

```bash
./scripts/ambiente.sh up                           # sobe banco, backend e frontend (idempotente)
./scripts/ambiente.sh reset                        # o mesmo, apagando os volumes do banco antes
./scripts/ambiente.sh status                       # o que está no ar
docker compose -f infra/docker-compose.yml up -d   # só o PostgreSQL
cd backend && ./gradlew check testeIntegracao      # verificação completa do backend
cd backend && ./gradlew check                      # sem Docker: lint, build e testes unitários
cd backend && ./gradlew testeIntegracao            # só os testes com Testcontainers
cd backend && ./gradlew bootRun                    # sobe a API em http://localhost:8080
cd frontend && npm run verificar                   # lint + tipos + build + testes do front
cd frontend && npm run gerar-tipos                 # regenera src/api/tipos-gerados.ts (backend no ar)
cd frontend && npm run dev                         # sobe o front em http://localhost:5173
./scripts/ambiente.sh up --observabilidade         # tudo + coletor de traces e logs em :5080
```

## Regras invioláveis

1. **Idioma.** Código, identificadores, campos de API, tabelas e colunas em português sem acento nem
   cedilha (`situacaoRegular`). Sufixos de framework em inglês (`AeronaveController`, `AeronaveDTO`).
   Booleanos com verbo: `estaAtivo()`, `possuiVencimento()`, `podeVoar()` — nunca `isAtivo()`.
   Classes no singular; tabelas no singular (`aeronave`). Documentação, comentários, commits e
   mensagens de erro para o usuário em português com acentuação normal.
2. **Glossário.** Antes de nomear qualquer coisa, consulte `docs/glossario.md`. Termo novo entra lá
   na mesma sessão em que aparece no código.
3. **MVC por feature.** Cada feature é um pacote com Controller → Service → Repository e sua
   entidade. Não existem pacotes horizontais (`controllers/`, `services/`).
4. **Regra na entidade.** Regra que depende só do estado da entidade mora na entidade
   (`aeronave.podeVoar()`). O Service orquestra, valida entrada e coordena repositórios.
5. **DTO na borda.** Entidade JPA nunca é parâmetro nem retorno de método de `*Controller`.
   Um `record` por request/response, mapeado por MapStruct.
6. **ArchUnit.** As seis regras de `ArquiteturaTest` são parte do build; não as relaxe.
7. **Boundaries.** No front, `design-system` não importa de `features`/`app`/`api`;
   `features/A` não importa de `features/B`; `compartilhado` não importa de `features`;
   `<button>`, `<input>` e `<a>` crus só dentro de `design-system`.
8. **Tokens.** Nenhuma cor, fonte ou espaçamento literal fora de `design-system/tokens/`.
   `tokens.json` é a fonte; `tokens.css` e `tokens.ts` são gerados por `npm run gerar-tokens`.
9. **Observabilidade.** Toda variável que determina um ramo de execução é registrada com
   `contexto.decisao` **antes** do desvio. `INFO` e `DEBUG` manuais **não existem** no código de
   negócio: um request produz uma única linha canônica, montada pelo filtro. `ERROR` e `WARN`
   continuam permitidos para o que exige ação humana. Nada de `System.out`, `System.err`,
   `printStackTrace` ou `console.*`. Campo com dado pessoal só vai para o log mascarado, via
   `observabilidade/campos-sensiveis.yml`.

## Antes de criar algo novo, leia

- `docs/arquitetura.md` — camadas, fluxo de request, como adicionar uma feature
- `docs/convencoes.md` — nomenclatura, idioma, commits, branches
- `docs/glossario.md` — forma canônica de cada termo de domínio
- `docs/observabilidade.md` — a linha canônica, a API do contexto e a regra das decisões

## Ao terminar

1. Rodar `cd backend && ./gradlew check` e `cd frontend && npm run verificar`.
2. Atualizar a documentação afetada em `docs/`; não criar documentação nova sem necessidade.
3. Registrar um ADR (`/adr`) se houve decisão técnica.
4. Atualizar `docs/glossario.md` se surgiu termo de domínio novo.

## Não fazer

- Não criar entidade, endpoint ou tela sem que a feature tenha sido pedida.
- Não adicionar dependência sem justificar no PR.
- Não criar primitivo de design system "por antecipação" — só o que a tela em mãos precisa.
- Não introduzir gerenciador de estado global, Tailwind, biblioteca de componentes, Zod ou MSW.
- Não mover regra de negócio da entidade para o Service.
- Não escrever documentação para algo que pode ser um teste.
