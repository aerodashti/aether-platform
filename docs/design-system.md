# Design system

> **Quando ler este arquivo:** antes de criar qualquer componente visual, mudar um token ou
> implementar uma tela vinda do Claude Design (`/tela-do-design`).

## ⚠️ Estado atual dos tokens

**Os valores em `frontend/src/design-system/tokens/tokens.json` são provisórios.** O handoff bundle
do Claude Design (tela "Posso voar hoje") não pôde ser lido na sessão de bootstrap: o MCP do Claude
Design exigia autorização interativa que a sessão não tinha, e a URL do projeto respondeu 403.

A **estrutura** está pronta e é a definitiva. O que falta é substituir os **valores**. Quem tiver
acesso ao bundle deve, em uma única passada:

1. abrir `Teste.dc.html` e `lib/ds-tokens-teste.css` do bundle;
2. para cada custom property do bundle, achar o token correspondente em `tokens.json` e trocar o
   valor, **mantendo o nome em português**;
3. registrar aqui, na tabela "Mapeamento", o nome original do bundle ao lado do nosso;
4. rodar `npm run gerar-tokens` e `npm run verificar`.

Enquanto isso não acontece, a paleta atual é uma aproximação deliberada da referência de gestão
patrimonial descrita para o produto: neutros quentes, um acento em dourado dessaturado e tipografia
com serifada nos títulos.

## Fonte única

```
design-system/tokens/tokens.json   ← a fonte. É o único arquivo que se edita à mão.
        │  npm run gerar-tokens
        ├──▶ tokens.css   custom properties, com tema claro e escuro
        └──▶ tokens.ts    o mesmo, tipado, para quando o valor precisa vir do TypeScript
```

`tokens.css` e `tokens.ts` são gerados. Editá-los à mão é perder o trabalho no próximo
`gerar-tokens` — e o Prettier os ignora justamente por isso.

## Categorias

| Categoria | Prefixo no CSS | Exemplo |
| --- | --- | --- |
| Cores | `--cor-` | `--cor-acento`, `--cor-texto-suave`, `--cor-critico` |
| Tipografia | `--fonte-`, `--tamanho-`, `--peso-`, `--altura-` | `--fonte-titulo`, `--tamanho-gg` |
| Espaçamento | `--espaco-` | `--espaco-4` (escala de 1 a 8) |
| Raio | `--raio-` | `--raio-m`, `--raio-redondo` |
| Elevação | `--elevacao-` | `--elevacao-1` |
| Movimento | `--duracao-`, `--curva-` | `--duracao-rapida`, `--curva-padrao` |

### Tema claro e escuro

Só a categoria **cores** tem variante de tema. O gerador escreve o tema claro em `:root`, o escuro
em `:root[data-theme='escuro']` e repete o escuro dentro de `@media (prefers-color-scheme: dark)`
para quem não escolheu nada. Trocar o tema é escrever `data-theme` no elemento raiz — nenhum
componente precisa saber disso.

### Lacunas conhecidas

- **`TODO`** — todos os valores atuais vieram de aproximação, não do bundle (veja o topo).
- Não há tokens de **grade/layout** (largura de coluna, breakpoints). Não foram criados por
  antecipação: entram quando a primeira tela precisar.
- Não há tokens de **ícone**. O bundle usa `dotted-globe.js`, um gráfico gerado por script — quando
  a tela for implementada, decida ali se isso vira um primitivo ou um asset da feature.
- A regra do Stylelint cobre as propriedades listadas em `.stylelintrc.json`. O atalho `border`
  não está na lista, então `border: 1px solid var(--cor-borda)` passa: **a cor sempre em token**,
  por convenção, não por lint.

## Primitivos

Existem dois, ambos usados pela `PaginaSaude`. Não crie primitivo por antecipação.

| Primitivo | Arquivo | Variantes | Observações |
| --- | --- | --- | --- |
| `Texto` | `primitivos/Texto.tsx` | `titulo`, `subtitulo`, `corpo`, `legenda` × tom `padrao`, `suave`, `positivo`, `atencao`, `critico` | `como` troca só o elemento renderizado, sem mudar a aparência |
| `Botao` | `primitivos/Botao.tsx` | `primario`, `secundario` | `carregando` desabilita e marca `aria-busy` |

Elemento HTML interativo cru (`<button>`, `<input>`, `<a>`, `<select>`, `<textarea>`) só existe
dentro de `design-system/` — é assim que foco, estados e acessibilidade ficam em um lugar só.

## Mapeamento com o handoff bundle

| Componente do bundle | Primitivo no código | Situação |
| --- | --- | --- |
| — | `Texto` | Criado no bootstrap, ainda **não** conferido contra o bundle |
| — | `Botao` | Criado no bootstrap, ainda **não** conferido contra o bundle |

### Componentes do bundle ainda não implementados

Não foi possível inventariar os componentes de `Teste.dc.html`: o bundle não pôde ser lido.
**A primeira execução de `/tela-do-design` precisa começar por este inventário** — listar cada
componente do bundle nesta seção antes de escrever código, e só então decidir, um a um, se ele vira
primitivo, se usa um primitivo existente ou se é composição própria da feature.

Sabe-se apenas, pelo manifesto do handoff, que o bundle traz também `dotted-globe.js` (gráfico) e
`i18n-en.js` / `i18n-es.js` (traduções). O produto é entregue em português; inglês e espanhol
**não** estão no escopo e não devem gerar infraestrutura de i18n nesta fase.
