# Convenções

> **Quando ler este arquivo:** antes de nomear qualquer classe, função, campo, tabela, branch ou
> commit. Para o vocabulário de domínio em si, veja `docs/glossario.md`.

## Idioma

| Onde | Idioma | Exemplo |
| --- | --- | --- |
| Identificadores de código | Português **sem acento e sem cedilha** | `situacaoRegular`, `verificadoEm` |
| Campos de API (JSON) | Português sem acento | `{"situacaoGeral": "OPERANTE"}` |
| Tabelas e colunas | Português sem acento, **singular** | `registro_de_saude`, `verificado_em` |
| Sufixos de framework | Inglês | `AeronaveController`, `AeronaveService`, `AeronaveRepository`, `AeronaveDTO`, `AeronaveMapper` |
| Palavras reservadas e padrões universais | Inglês | `id`, `main`, `test`, `build`, `src` |
| Documentação, comentários, commits, mensagens de erro ao usuário | Português com acentuação normal | "Aeronave não encontrada." |

Casos que já geraram dúvida:

- `id` permanece `id`. Datas de auditoria seguem o português: `criadoEm`, `atualizadoEm` — nunca
  `createdAt`.
- Enum e seus valores em português sem acento: `SituacaoDeSaude.INDISPONIVEL`.
- Nome de classe **sempre no singular**: `Aeronave`, não `Aeronaves`. O repositório é
  `AeronaveRepository` mesmo retornando listas.

## Booleanos

Sempre com verbo, nunca com o prefixo `is`:

```java
boolean estaAtivo()          // não: isAtivo()
boolean possuiVencimento()   // não: hasVencimento()
boolean podeVoar()           // não: canFly()
```

No TypeScript vale o mesmo: `estaCarregando`, `possuiErro`, `podeEnviar`.

## Arquivos

| Tipo | Convenção | Exemplo |
| --- | --- | --- |
| Classe Java | `PascalCase`, singular | `RegistroDeSaude.java` |
| Componente React | `PascalCase` | `PaginaSaude.tsx` |
| Hook React | `usar` + substantivo | `usarSaude.ts` |
| CSS Module | mesmo nome do componente | `PaginaSaude.module.css` |
| Migration Flyway | `V<n>__<descricao_em_portugues>.sql` | `V1__cria_registro_de_saude.sql` |
| Documento em `docs/` | `kebab-case.md` | `design-system.md` |

## Commits

Conventional Commits com o assunto em português, em minúscula, sem ponto final. O tipo permanece
em inglês porque é palavra reservada da convenção.

```
feat: adiciona hub de vencimentos
fix: corrige cálculo de validade do CVA
docs: descreve a estratégia de logs
refactor: move regra de aeronavegabilidade para a entidade
test: cobre o mascaramento de CPF no log
chore: atualiza o wrapper do Gradle
```

Escopo é opcional e usa o nome da feature: `feat(saude): expõe a situação por componente`.
O `commitlint` roda no hook `commit-msg` e recusa o que fugir disso.

## Branches

```
feat/hub-de-vencimentos
fix/validade-do-cva
docs/glossario-inicial
```

Prefixo igual ao tipo do commit, descrição em kebab-case sem acento.

## Pull requests

Título no mesmo formato do commit. O corpo diz **o que muda para quem usa** e **o que precisa ser
validado localmente**. Se houve decisão técnica, o PR aponta para o ADR.

## Dependências

Nenhuma dependência nova entra sem uma linha de justificativa no PR. Se existe forma de resolver
com o que já está no projeto, é essa que vale.
