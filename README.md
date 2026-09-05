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

## Setup em 5 minutos

```bash
# 1. Hooks de git (roda lint no commit e testes no push)
npm install

# 2. Banco de dados local
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d

# 3. Backend — http://localhost:8080, OpenAPI em /swagger-ui.html
cd backend
./gradlew bootRun

# 4. Frontend — http://localhost:5173 (em outro terminal)
cd frontend
npm install
npm run dev
```

Um request produz uma linha de log com tudo o que aconteceu nele. Para ver traces e logs em uma
interface, suba o coletor local — é opcional e fica fora do `up` do dia a dia:

```bash
docker compose -f infra/docker-compose.yml --profile observabilidade up -d
```

O passo a passo completo está em `docs/observabilidade.md`.

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
