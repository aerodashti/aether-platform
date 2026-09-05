# Frontend — regras específicas

> Leia primeiro o `CLAUDE.md` da raiz. Aqui está só o que é do frontend.

## Estrutura

```
src/
├── main.tsx            # ponto de entrada: tokens.css, global.css, provedores e rotas
├── app/                # Provedores, LayoutRaiz, rotas
├── api/                # cliente.ts (fetch + erro) e tipos-gerados.ts (do OpenAPI)
├── design-system/      # tokens/ e primitivos/
├── features/<nome>/    # api/ (hooks do Query) e componentes/
└── compartilhado/      # log/ — só entra o que duas features já usam
```

`features/saude/` e `PaginaSaude` são a referência: leia antes de criar a sua tela.

## Como adicionar uma tela

1. Confirme os nomes em `docs/glossario.md`.
2. `src/features/<nome>/api/use<Nome>.ts` — hook do TanStack Query chamando `buscar` de
   `@/api/cliente`, com o tipo vindo de `@/api/tipos-gerados`.
3. `src/features/<nome>/componentes/Pagina<Nome>.tsx` + `.module.css`, tratando os três estados:
   carregando, erro e conteúdo.
4. Registre a rota em `src/app/rotas.tsx`.
5. Teste com Vitest + Testing Library, consultando por papel e texto acessível.

Ou rode `/nova-feature <nome>`; para uma tela vinda do Claude Design, `/tela-do-design`.

## O que é específico daqui

- **Hooks começam com `use`.** É prefixo reservado do React e a regra `react-hooks/rules-of-hooks`
  falha o lint sem ele. O resto do nome é português: `useSaude`, `useVencimento`. É a mesma lógica
  dos sufixos de framework no backend.
- **Tipos de API não se escrevem.** Rode `npm run gerar-tipos` com o backend no ar. Os campos vêm
  opcionais porque o springdoc não marca `required`: trate com `?.` e `??`, não com `!`.
- **Estilo.** CSS Modules, sempre `var(--token)`. Para criar ou mudar um token, edite
  `design-system/tokens/tokens.json` e rode `npm run gerar-tokens` — `tokens.css` e `tokens.ts`
  são gerados e nunca editados à mão.
- **Observabilidade.** Só `@/compartilhado/observabilidade/observabilidade`. Envolva a ação do
  usuário em `contexto.interacao(nome, fn)` e use `contexto.registrar` / `contexto.decisao` dentro
  dela — sai uma linha por interação, como no backend. `console.*` em qualquer outro arquivo falha
  o lint. Sem `VITE_OTEL_ENDPOINT` o SDK não é registrado e tudo é no-op.
- **Rede.** O Vite faz proxy de `/api` para `http://localhost:8080`; não há variável de ambiente
  nem CORS. Toda chamada passa por `buscar`, que já loga o erro com o `X-Request-Id` da resposta.
- **Primitivo novo** só quando a tela em mãos precisa. Não crie por antecipação.

## Limites que falham o lint

- `design-system` não importa de `features`, `app` ou `api`.
- `features/A` não importa de `features/B`.
- `compartilhado` não importa de `features`.
- `<button>`, `<input>`, `<a>`, `<select>`, `<textarea>` crus só dentro de `design-system/`.
- Cor, fonte, espaçamento, raio, sombra ou duração literal fora de `tokens/` (Stylelint).

## Comandos

```bash
npm run verificar        # formato, lint, stylelint, tipos, build e testes
npm run dev              # http://localhost:5173
npm run testar           # Vitest
npm run formatar         # Prettier
npm run gerar-tokens     # tokens.json -> tokens.css e tokens.ts
npm run gerar-tipos      # OpenAPI do backend -> src/api/tipos-gerados.ts
```
