# Design system

> **Quando ler este arquivo:** antes de criar qualquer componente visual, mudar um token ou
> implementar uma tela vinda do Claude Design (`/tela-do-design`).

## Origem dos valores

Os tokens vêm do handoff do Claude Design (`lib/ds-tokens-teste.css` do bundle "Aether — projeto
final"), traduzidos para os nomes em português deste repositório. O mapeamento nome a nome está na
seção "Mapeamento com o handoff bundle".

A identidade que esses valores carregam — e que nenhuma mudança de token pode desfazer sem uma
conversa antes:

- **Cantos retos.** `--raio-s`, `--raio-m` e `--raio-g` são todos `0`. Não é descuido: é o que
  separa o produto da aparência de template. `--raio-redondo` existe só para avatar, dot de situação
  e spinner. Formato pill é proibido.
- **Alta densidade.** A escala tipográfica vai de 11px a 26px, e o corpo da interface é 14px.
  Alturas de controle 40 e 48. Sem respiros decorativos.
- **Contraste fino.** Superfícies chapadas, divisores de 1px, sombra discreta. Nada de gradiente
  chamativo, sombra grande ou glassmorphism.
- **Azul petróleo.** Um acento só, em sete papéis (veja a tabela). Nenhum hex fora de `tokens.json`.
- **Nunca `#000000` nem `#FFFFFF` absolutos.** O branco é `#fdfeff` e o preto é `#161c26`.

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
| Tipografia | `--fonte-`, `--tamanho-`, `--altura-`, `--peso-`, `--rastreio-` | `--tamanho-gg`, `--altura-gg` |
| Espaçamento | `--espaco-` | `--espaco-4` (escala de 1 a 10) |
| Raio | `--raio-` | `--raio-m`, `--raio-redondo` |
| Elevação | `--elevacao-` | `--elevacao-1` |
| Movimento | `--duracao-`, `--curva-` | `--duracao-rapida`, `--curva-padrao` |

### A escala tipográfica anda em par

Cada degrau de `--tamanho-` tem o `--altura-` de mesmo sufixo, e os dois andam juntos: `--tamanho-g`
com `--altura-g`. Misturar degraus é o que produz linha apertada em texto corrido e frouxa em título.

| Degrau | Tamanho | Altura | Onde |
| --- | --- | --- | --- |
| `xs` | 11px | 1.45 | Rodapé, assinatura da marca, metadado |
| `s` | 12px | 1.40 | Rótulo de campo, cabeçalho de tabela, texto de apoio |
| `m` | 13px | 1.45 | Corpo de tabela e listas densas, botão |
| `g` | 14px | 1.50 | Texto de interface — o padrão do `body` |
| `gg` | 18px | 1.30 | Título de seção e de card |
| `ggg` | 26px | 1.12 | Título de tela e valor de KPI |

O peso `--peso-maximo` (700) existe **só** no degrau `ggg`.

### Espaçamento

A escala é `2, 4, 8, 12, 16, 20, 24, 32, 40, 48` px, em `--espaco-1` a `--espaco-10`. Não há valores
fora dela.

### Tema claro e escuro

Uma categoria de `tokens.json` que declare as chaves `claro` e `escuro` é tematizada; o gerador
escreve o tema claro em `:root`, o escuro em `:root[data-theme='escuro']` e repete o escuro dentro
de `@media (prefers-color-scheme: dark)` para quem não escolheu nada.

**Duas categorias são tematizadas: cores e elevação.** A elevação entrou porque no claro a camada
vem da sombra e no escuro vem de um contorno de luz de 1px — sombra preta sobre superfície escura
não separa nada. Não é o mesmo valor em duas cores: são dois mecanismos diferentes.

Trocar o tema é escrever `data-theme` no elemento raiz. Nenhum componente precisa saber disso.
`global.css` acompanha o mesmo seletor com `color-scheme`, para que controle nativo, barra de
rolagem e autofill do navegador nasçam na cor certa — os tokens sozinhos não alcançam esses
elementos.

### Lacunas conhecidas

- Não há tokens de **grade/layout** (largura de coluna, breakpoints). A tela de entrada usa dois
  valores de largura (`560px` do painel, `424px` do formulário) e dois breakpoints (640px, 1024px),
  cada um em um lugar só — valor usado uma vez é valor, não token. Entram quando a segunda tela
  repetir algum deles. Vale notar que breakpoint não poderia ser custom property de qualquer forma:
  `@media` não lê `var()`.
- Não há tokens de **ícone**. Os três glifos da tela de entrada são SVG inline na feature, herdando
  `currentColor`. Viram primitivo quando a segunda tela precisar dos mesmos.
- A regra do Stylelint cobre as propriedades listadas em `.stylelintrc.json`. O atalho `border` não
  está na lista, então `border: 1px solid var(--cor-borda)` passa: **a cor sempre em token**, por
  convenção, não por lint. `light`, `dark` e `0.01ms` estão na lista de exceções — são,
  respectivamente, os valores de `color-scheme` e o "desligar" do bloco de movimento reduzido.

## Primitivos

Não crie primitivo por antecipação. Elemento HTML interativo cru (`<button>`, `<input>`, `<a>`,
`<select>`, `<textarea>`) só existe dentro de `design-system/` — é assim que foco, estados e
acessibilidade ficam em um lugar só.

| Primitivo | Arquivo | Variantes | Observações |
| --- | --- | --- | --- |
| `Texto` | `primitivos/Texto.tsx` | `titulo`, `subtitulo`, `corpo`, `legenda` × tom `padrao`, `suave`, `positivo`, `atencao`, `critico` | `como` troca só o elemento renderizado, sem mudar a aparência |
| `Botao` | `primitivos/Botao.tsx` | `primario`, `secundario`, `contorno` × tamanho `medio` (40px), `grande` (48px) | `carregando` desabilita e marca `aria-busy`. `contorno` traz a micro-interação de preenchimento |
| `CampoDeTexto` | `primitivos/CampoDeTexto.tsx` | tipo `texto`, `email`, `senha`; alinhamento `esquerda`, `centro`; `espacado` | Rótulo ligado por `useId`; `aria-invalid` e `aria-describedby` cobrindo apoio e erro juntos |
| `BotaoDeLink` | `primitivos/BotaoDeLink.tsx` | alinhamento `esquerda`, `centro` | É `button`, não `a`: a ação não navega. Traz o reset do cromo nativo |

### A variante `contorno` do `Botao`

É a única animação de identidade do produto — o resto da interface não se move. Em repouso, contorno
azul sobre superfície; no hover ou foco, o fundo se preenche, o rótulo desliza para fora e entra o
par rótulo+seta. As duas camadas carregam a mesma palavra, e a que sai de cena é a que conta para o
nome acessível; a que entra é `aria-hidden`.

Sob `prefers-reduced-motion`, a troca de rótulo continua acontecendo — só deixa de deslizar.

## Mapeamento com o handoff bundle

Nome do bundle → nome aqui. Onde dois tokens do bundle tinham o mesmo valor **nos dois temas**, eles
foram unificados; onde divergiam no escuro, foram mantidos separados.

### Cores

| Token do bundle | Token aqui | Papel |
| --- | --- | --- |
| `--cor-fundo` | `--cor-fundo` | Fundo da aplicação |
| `--cor-superficie` | `--cor-superficie` | Card, painel, campo |
| `--cor-superficie-2` | `--cor-superficie-sutil` | Faixa recuada, painel da arte |
| `--cor-borda` | `--cor-borda` | Divisor padrão |
| `--cor-borda-forte` | `--cor-borda-forte` | Borda de campo |
| `--cor-borda-suave` | `--cor-borda-suave` | Divisor entre linhas, fundo de recado |
| `--cor-texto` | `--cor-texto` | Texto principal |
| `--cor-texto-sec` **e** `--cor-texto-ter` | `--cor-texto-suave` | Unificados: no bundle atual `--cor-texto-ter` já é alias de `--cor-texto-sec` nos dois temas |
| `--cor-acao` | `--cor-acento` | Acento: traço, anel de foco, gráfico |
| `--cor-acao-escura` | `--cor-acento-escuro` | Título de destaque, hover de link |
| `--cor-acao-clara` | `--cor-acento-claro` | Pontos do globo |
| `--cor-acao-texto` | `--cor-acento-texto` | Link — clareia no escuro, por isso não é o mesmo que `escuro` |
| `--cor-acao-fill` | `--cor-acento-solido` | Fundo de botão primário |
| `--cor-acao-fill-hover` | `--cor-acento-solido-hover` | Idem, no hover |
| `--cor-acao-wash-2` | `--cor-acento-vestigio` | Anéis decorativos, borda de recado |
| `--cor-inverso` | `--cor-acento-contraste` | Texto sobre preenchimento escuro |
| `--cor-estado-positivo` | `--cor-positivo` | Situação favorável |
| `--cor-atencao-texto` | `--cor-atencao` | Âmbar **de texto** — o `--cor-atencao` do bundle é só fundo e traço, e não tem contraste para texto |
| `--cor-negativo` | `--cor-critico` | Erro, borda de campo inválido |

Não foram trazidos, porque nenhuma tela os consome ainda: os `-tint`, `-forte` e `-clara` dos
estados, as superfícies 3 e 4, `--cor-overlay`, `--cor-hover`, `--cor-linha-hover`,
`--cor-neutro-medio`, os tokens `--z-*`, a armadura de trilhas (`--arm-*`, `--cols-*`) e
`--shadow-fixa-*`. Entram com as telas de grade.

### Tipografia, espaço, raio, movimento

| Do bundle | Aqui |
| --- | --- |
| `--font-body` e `--font-heading` (ambos Inter) | `--fonte-base` — unificados, o bundle usa a mesma família nos dois |
| `--font-mono` (JetBrains Mono) | `--fonte-mono` |
| `--fs-micro` / `caption` / `dados` / `corpo` / `titulo` / `kpi` | `--tamanho-xs` / `s` / `m` / `g` / `gg` / `ggg` |
| `--lh-*` correspondentes | `--altura-xs` … `--altura-ggg` |
| `--fw-corpo` / `medio` / `enfase` / `forte` | `--peso-normal` / `medio` / `forte` / `maximo` |
| `--ls-titulo` e os `letter-spacing` inline da tela | `--rastreio-titulo`, `-legenda`, `-marca`, `-etiqueta`, `-codigo` |
| Escala `{2…48}` | `--espaco-1` … `--espaco-10` |
| `--raio`, `--raio-sm`, `--raio-lg`, `--raio-xl` (todos 0) | `--raio-s`, `--raio-m`, `--raio-g` |
| `--shadow-sm` / `md` / `lg` | `--elevacao-1` / `2` / `3` |
| `--dur-rapido` / `medio` / `lento` | `--duracao-rapida` / `normal` / `lenta` |

## Componentes do bundle: o que está implementado

| Componente do bundle | Situação |
| --- | --- |
| Tela de entrada (split-screen, 4 passos) | **Implementada** — `features/autenticacao` |
| Botão `.ihb` (contorno que preenche) | **Implementado** — `Botao` variante `contorno` |
| Campo de formulário com rótulo e erro | **Implementado** — `CampoDeTexto` |
| `.link-acao` | **Implementado** — `BotaoDeLink` |
| Globo pontilhado (`dotted-globe.js`) | **Implementado** — `features/autenticacao/componentes/GloboPontilhado.tsx`, portado para React com `d3-geo`. Virou asset da feature, e não primitivo: é ilustração de uma tela só |
| Toast de feedback | **Parcial** — a tela de entrada tem uma faixa `role="status"` própria. Não virou primitivo porque só existe aqui; vira quando a segunda tela precisar |

### Ainda não implementados

Barra lateral de navegação, cabeçalho de aplicação, busca global, menu de perfil, badge de situação,
chip de alerta, tabela densa com colunas fixas e linha de totais, seletor de densidade, modal,
drawer de detalhe, popover de calendário, skeleton de carregamento, gráficos de barra e sparkline.
Todos pertencem à área logada.

**Fora de escopo por decisão de produto:** a infraestrutura de i18n (`i18n-en.js`, `i18n-es.js` do
bundle). O produto é entregue em português; inglês e espanhol não estão nesta fase.
