# Aether

Aplicativo de gestão para proprietários de aeronaves particulares (jatos e helicópteros) no Brasil,
com foco na camada regulatória brasileira (ANAC/RAB, CVA, RETA, RBAC 91/43/145, DECEA).

Este repositório é um monorepo: `backend/` (Spring Boot) e `frontend/` (React + Vite).

## Pré-requisitos

| Ferramenta | Versão | Como verificar |
| --- | --- | --- |
| JDK | 21 | `java -version` |
| Node.js | 22 ou superior | `node -v` |
| Docker | com Compose v2 | `docker compose version` |

O Gradle não precisa ser instalado: use o wrapper (`./gradlew`).

## Setup

Um comando sobe tudo — banco, backend e frontend:

```bash
./scripts/ambiente.sh up
```

Ele é idempotente: rodar de novo não duplica nada, só reporta o que já estava no ar. Na primeira
vez também instala as dependências e cria o `infra/.env`.

| Comando | O que faz |
| --- | --- |
| `./scripts/ambiente.sh up` | Sobe banco, backend (`:8080`) e frontend (`:5173`) |
| `./scripts/ambiente.sh status` | Mostra o que está no ar |
| `./scripts/ambiente.sh logs [backend\|frontend\|banco]` | Acompanha os logs |
| `./scripts/ambiente.sh down` | Para tudo, **preservando** os dados |
| `./scripts/ambiente.sh reset` | Apaga os volumes e sobe do zero — use ao mexer em migration |
| `up` ou `reset` com `--observabilidade` | Inclui o coletor de traces e logs em `:5080` |

`reset` é o que você quer quando mudou uma migration, uma coluna ou o seed: o banco volta vazio e o
Flyway roda de novo do começo.

### Fazendo na mão

Se preferir controlar cada parte, é isto que o script faz:

```bash
npm install                                          # hooks de git
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d     # PostgreSQL
cd backend  && ./gradlew bootRun                     # http://localhost:8080
cd frontend && npm ci && npm run dev                 # http://localhost:5173
```

Um request produz uma linha de log com tudo o que aconteceu nele; o passo a passo de como ver
traces e logs em uma interface está em `docs/observabilidade.md`.

## Entrando na aplicação

A tela de entrada fica em <http://localhost:5173/entrar>. O `db/seed` cria quatro usuários de
desenvolvimento, e a senha de todos os ativos é **`aether-dev-2026`**:

| E-mail | Situação | Serve para |
| --- | --- | --- |
| `leonardo@administraair.com.br` | ATIVO | Entrar e recuperar a senha |
| `patricia@administraair.com.br` | ATIVO | Um segundo ativo, para testar sem sujar o primeiro |
| `camila@administraair.com.br` | PENDENTE | Convidada, ainda sem senha: não entra e não recebe código |
| `diego.furtado@administraair.com.br` | INATIVO | Acesso revogado: recusado como credencial inválida |

Essa senha é pública de propósito e só existe na sua máquina: o perfil `prod` não carrega o
`db/seed`.

Sem `spring.mail.host` configurado, o código de seis dígitos da recuperação **não é enviado por
e-mail — ele sai no log do backend**, em WARN. É o bastante para percorrer o fluxo inteiro sem
servidor de e-mail (`docs/adr/0014-envio-de-codigo-por-porta.md`).

Cinco senhas erradas suspendem a conta por quinze minutos. Para destravar durante o desenvolvimento:

```bash
docker compose -f infra/docker-compose.yml exec postgres \
  psql -U aether -d aether -c "UPDATE usuario SET tentativas = 0, bloqueado_ate = NULL;"
```

## Verificando o projeto

Com o Docker rodando (passo 2 acima), a verificação completa é:

```bash
cd backend  && ./gradlew check testeIntegracao   # tudo do backend
cd frontend && npm run verificar                 # tudo do frontend
```

É exatamente o que o hook de `pre-push` roda. Separando as duas metades do backend:

```bash
cd backend && ./gradlew check             # Spotless, Checkstyle, Error Prone, testes, JaCoCo
cd backend && ./gradlew testeIntegracao   # Testcontainers + PostgreSQL (exige Docker)
```

`./gradlew check` **não** exige Docker: os testes que sobem contêiner estão marcados com a tag
JUnit `integracao` e ficam fora dele. A separação serve para o `check` ser rápido no dia a dia e
para o CI poder tratar as duas etapas em separado — **não** para pular os testes de integração.
Antes de dar push, rode os dois (é o que o Lefthook faz por você).

## Tipos da API no frontend

O frontend não escreve tipos de API à mão. Com o backend no ar:

```bash
cd frontend && npm run gerar-tipos
```

Isso lê o OpenAPI de `http://localhost:8080/v3/api-docs` e regrava `src/api/tipos-gerados.ts`.

## Onde ler mais

- `CLAUDE.md` — regras que qualquer sessão do Claude Code deve seguir
- `docs/arquitetura.md` — camadas e como adicionar uma feature
- `docs/convencoes.md` — nomenclatura, idioma, commits
- `docs/design-system.md` — tokens e primitivos
- `docs/testes.md` — o que testar em cada camada
- `docs/observabilidade.md` — a linha canônica por request, traces e sanitização
- `docs/glossario.md` — vocabulário de domínio
- `docs/adr/` — por que cada decisão técnica foi tomada
