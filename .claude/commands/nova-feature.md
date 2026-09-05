---
description: Cria o esqueleto de uma feature no backend e no frontend seguindo o padrão de saude/PaginaSaude
argument-hint: <nome-da-feature em português, singular, sem acento>
---

Crie o esqueleto da feature `$1` nos dois lados do monorepo. **Não implemente regra de negócio** —
o objetivo é o esqueleto compilando, com testes vazios prontos para serem preenchidos.

## Antes de começar

1. Leia `docs/glossario.md`. Se `$1` não estiver lá, **pare e pergunte** qual é a forma canônica do
   termo, ou proponha uma linha nova e siga com ela.
2. Leia `docs/arquitetura.md`, seção "Como adicionar uma feature".
3. Abra `backend/src/main/java/br/com/aerodash/aether/saude/` e
   `frontend/src/features/saude/` — este é o padrão a copiar.

## Backend

Crie `backend/src/main/java/br/com/aerodash/aether/$1/` com, no mínimo:

- entidade JPA no singular, com `@Entity` e `@Table(name = "$1")`, campos em português sem acento,
  e ao menos um método de regra com nome verbal (`estaAtivo()`, `possuiVencimento()`);
- `<Nome>Repository` estendendo `JpaRepository`;
- `<Nome>Service` com injeção por construtor e campos `final`, **já recebendo
  `ContextoDaRequisicao contexto`** — toda variável que decide um ramo passa por
  `contexto.decisao` antes do desvio, e o que for relevante do fluxo por `contexto.registrar`;
- `<Nome>Response` (`record`) e, se houver escrita, `<Nome>Request` (`record`) com Bean Validation;
- `<Nome>Mapper` MapStruct com `componentModel = "spring"`;
- `<Nome>Controller` com `@RestController`, `@RequestMapping("/$1")` e `@Tag` do springdoc —
  **nunca** recebendo ou devolvendo a entidade.

Migration em `backend/src/main/resources/db/migration/V<próximo>__cria_$1.sql`, tabela no singular.

Testes em `backend/src/test/java/br/com/aerodash/aether/$1/`:
`<Nome>Test` (regra da entidade), `<Nome>ServiceTest` (Mockito), `<Nome>ControllerTest`
(`@WebMvcTest`). Podem começar com um caso trivial, mas precisam existir e passar.

## Frontend

Crie `frontend/src/features/$1/` com `api/use<Nome>.ts` (hook do TanStack Query usando
`clienteHttp`) e `componentes/Pagina<Nome>.tsx` + `Pagina<Nome>.module.css`, mais
`Pagina<Nome>.test.tsx`. Registre a rota em `frontend/src/app/rotas.tsx`.

Use apenas primitivos existentes em `design-system/primitivos/`. Se faltar algum, **pare e diga
qual falta** em vez de usar HTML cru — `<button>`, `<input>` e `<a>` fora do design system falham
o lint.

## Ao terminar

```bash
cd backend && ./gradlew check
cd frontend && npm run gerar-tipos   # exige o backend no ar
cd frontend && npm run verificar
```

Atualize `docs/glossario.md` se algum termo novo apareceu. Se algum campo do request ou da
response carrega dado pessoal, documento ou credencial, adicione-o a
`backend/src/main/resources/observabilidade/campos-sensiveis.yml` — sem isso ele vai para o log
em claro. Não escreva documentação nova para a
feature: o código e os testes são a documentação.
