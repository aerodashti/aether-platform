# Design system

> **Quando ler este arquivo:** antes de criar qualquer componente visual, mudar um token ou
> implementar uma tela vinda do Claude Design (`/tela-do-design`).

## Origem dos valores

Os tokens vêm da página **"Projeto final Aether.dc.html"** do projeto "Aether — projeto final" do
Claude Design. Essa página carrega os estilos inline (é dela que saem cores, raio e alturas do tema
claro); o `lib/ds-tokens-final.css` que ela importa só é usado para o tema escuro, que o protótipo
não desenha de outra forma. A página `Teste.dc.html` do mesmo projeto foi um experimento e **não é
referência** — até 2026-09-14 o produto a seguia por engano, e a migração para o Projeto final
está registrada em `docs/adr/0017-projeto-final-como-referencia-visual.md`. O mapeamento nome a
nome está na seção "Mapeamento com o handoff bundle".

A identidade que esses valores carregam — e que nenhuma mudança de token pode desfazer sem uma
conversa antes:

- **Raio 4px.** `--raio-m` e `--raio-g` são `4px`, `--raio-s` é `3px`: controles, cartões, badges
  e popovers têm o mesmo canto discreto. `--raio-redondo` existe só para avatar, dot de situação,
  contador e spinner. Formato pill continua proibido.
- **Neutros quentes, cartões brancos.** O fundo da página é `#fafafb`, os cartões são `#ffffff`
  com borda `#e0e0e3`, a barra lateral é `#f4f4f6`. O texto é `#1d1f20` e o secundário `#5d5d60`.
- **Alta densidade.** A escala tipográfica vai de 11px a 26px, e o corpo da interface é 14px; os
  campos e as tabelas ficam em 13px. Alturas de controle 32, 36 e 40 — o degrau de 32 é a
  densidade compacta da grade. Sem respiros decorativos.
- **Contraste fino.** Superfícies chapadas, divisores de 1px, sombra discreta nos cartões e uma
  sombra maior só no popover. Nada de gradiente chamativo ou glassmorphism.
- **Azul-aço.** Um acento só, `#5980a6`, com hover petróleo `#2c455d` e a variante de texto
  `#416180` para rótulos de ação (botão secundário e fantasma). Nenhum hex fora de `tokens.json`.
- **Nunca `#000000` nem `#FFFFFF` no texto.** O preto é `#1d1f20`; o branco existe só como
  superfície de cartão.

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
| Controle | `--controle-altura-` | `--controle-altura-p` (32px), `-toque` (44px) |
| Armadura | `--armadura-` | `--armadura-estado`, `--armadura-gap` |
| Camada | `--camada-` | `--camada-sticky` |

### A armadura de trilhas é a assinatura

Uma largura por **tipo de dado**, no produto inteiro: coluna do mesmo tipo tem a mesma largura em
toda tela. É o que faz duas grades diferentes lerem como o mesmo instrumento, e vem do DD-P15 do
handoff. Só entram aqui as trilhas que alguma tela já consome — a régua completa tem mais.

| Token | Valor | Tipo de dado |
| --- | --- | --- |
| `--armadura-gap` | 8px | Respiro entre trilhas. Mudar isto desalinha todas as grades |
| `--armadura-id` | 80px | Identificador em monoespaçada: matrícula, rel. de voo, nota fiscal |
| `--armadura-rotulo` | `minmax(120px, 1.5fr)` | Nome, modelo, descrição, atribuição |
| `--armadura-lockup` | 160px | Lockup de duas partes em nowrap: grandeza + qualificador (DD-P16) |
| `--armadura-rotulo-longo` | `minmax(248px, 2fr)` | Texto livre longo: nome + e-mail, descrição |
| `--armadura-estado` | 112px | Etiqueta categórica: papel, situação, status |
| `--armadura-data` | 96px | `dd/mm/aa` e competência |
| `--armadura-numero` | 96px | Numérico curto alinhado à direita: horas, km, quantidade, % |
| `--armadura-acao-texto` | 160px | Duas ações rotuladas na mesma linha |

### Alturas de controle

`32 / 40 / 48` é a densidade de ponteiro fino. Em `(hover: none)` ou abaixo de 700px o piso vira
`--controle-altura-toque` (44px), que é o alvo mínimo de toque — a trilha de ação não reflui porque
já foi dimensionada a partir desse número.

### A escala tipográfica anda em par

Cada degrau de `--tamanho-` tem o `--altura-` de mesmo sufixo, e os dois andam juntos: `--tamanho-g`
com `--altura-g`. Misturar degraus é o que produz linha apertada em texto corrido e frouxa em título.

| Degrau | Tamanho | Altura | Onde |
| --- | --- | --- | --- |
| `xs` | 11px | 1.45 | Rodapé, assinatura da marca, metadado |
| `s` | 12px | 1.40 | Rótulo de campo, cabeçalho de tabela, texto de apoio |
| `m` | 13px | 1.45 | Corpo de tabela e listas densas, botão, título de cartão de seção (forte) |
| `g` | 14px | 1.50 | Texto de interface — o padrão do `body` |
| `gg` | 18px | 1.30 | Título de tela secundário e identificador no cabeçalho de entidade |
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

### A tela de Aeronaves é uma lista de cartões, com dois números dos três

É a lista do Projeto final: um cartão por aeronave com matrícula e modelo, a etiqueta de situação
(dot e rótulo sobre o vestígio da mesma cor), os números à direita e a seta que abre o detalhe. O
protótipo mostra Saldo do fundo · Custo da competência · Proprietários; só o último está aqui,
contado dos vínculos vigentes (`GET /participacoes/vigentes`) — os outros dois pertencem a aportes
e a lançamentos, e **coluna vazia não existe**. Enquanto os vínculos não chegam o cartão omite o
número; nunca inventa um zero.

Duas diferenças deliberadas em relação ao protótipo, as duas por regra do próprio brief:

- **"Situação", não "Status".** O glossário proíbe o anglicismo.
- **Existe um bloco de Próximo vencimento**, que o protótipo não tem. O brief é explícito:
  *"Estado sem consequência é proibido: ATENÇÃO sozinho não informa. Forma correta: Seguro RETA ·
  vence em 12 dias."* O prazo em palavras só aparece em `ATENCAO` e `VENCIDO` — numa aeronave
  saudável, "em 241 dias" é número sem pergunta.

O seletor **"Estado"** do protótipo não foi implementado: o próprio `AETHER_PATTERNS.md` o registra
como *"andaime de protótipo em Aeronaves e Custos"*, uma dívida declarada para demonstrar os cinco
estados de tela.

### Ação de linha: visível, não escondida

A ação destrutiva de uma linha de grade fica **sempre visível**, e perde peso contra a ação neutra
por **cor**, não por ocultação. Esconder um controle focável com `opacity: 0` até o hover é falha de
foco visível (WCAG 2.4.7 e 2.4.11): quem navega por teclado chega a um botão que não se vê. O
handoff chegou à mesma conclusão e a registrou no próprio CSS, em `.acao-destrutiva`.

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
| `Texto` | `primitivos/Texto.tsx` | `titulo`, `subtitulo`, `corpo`, `apoio`, `legenda` × tom `padrao`, `suave`, `positivo`, `atencao`, `critico` | `como` troca só o elemento renderizado. **`legenda` é RÓTULO** — micro-caps com rastreio; usá-la em frase transforma a frase em placa. Para frase pequena existe `apoio` |
| `Botao` | `primitivos/Botao.tsx` | `primario`, `secundario`, `contorno`, `fantasma` × tamanho `pequeno` (32px), `medio` (40px), `grande` (48px) | `carregando` desabilita e marca `aria-busy`. `contorno` traz a micro-interação de preenchimento. `fantasma` é a ação de linha da grade; `tom="critico"` pinta o rótulo de vermelho **só** no hover e no foco |
| `CampoDeTexto` | `primitivos/CampoDeTexto.tsx` | tipo `texto`, `email`, `senha`, `data`, `hora`, `mes`; alinhamento `esquerda`, `centro`; `espacado` | Rótulo ligado por `useId`; `aria-invalid` e `aria-describedby` cobrindo apoio e erro juntos |
| `BotaoDeLink` | `primitivos/BotaoDeLink.tsx` | alinhamento `esquerda`, `centro` | É `button`, não `a`: a ação não navega. Traz o reset do cromo nativo |
| `Selecao` | `primitivos/Selecao.tsx` | `rotuloOculto` | `select` nativo com o cromo do produto. Nativo de propósito: teclado, busca por digitação e a roda do celular vêm de graça |
| `LinkDeNavegacao` | `primitivos/LinkDeNavegacao.tsx` | `exata` | `NavLink`, não botão que troca estado: cada tela tem endereço. O estado ativo sai do `aria-current` que o próprio NavLink escreve |
| `GrupoDeOpcoes` | `primitivos/GrupoDeOpcoes.tsx` | `marcador`, `larguraIgual` | Escolha única com todas as opções à vista. É `radiogroup` de verdade (`role="radio"` + `aria-checked`), não fileira de botões que parecem escolhidos. Passando de cinco opções, use `Selecao` |
| `PainelModal` | `primitivos/PainelModal.tsx` | — | `<dialog>` nativo aberto por `showModal()`: armadilha de foco, Esc e inércia do fundo vêm do navegador. Nasceu em `usuarios/PainelDeConvite` e foi promovido quando Proprietários precisou do segundo modal |
| `Esqueleto` | `primitivos/Esqueleto.tsx` | — | Barra de carregamento de célula, com o brilho do `.skel` do handoff e `prefers-reduced-motion` respeitado. Sempre `aria-hidden`: quem anuncia a espera é o `role="status"` da grade |
| `SeletorDeCor` | `primitivos/SeletorDeCor.tsx` | — | Paleta fechada da cor de identificação (6 cores, todas de tokens existentes — nenhum hex novo). `radiogroup` com amostras nomeadas; exporta `PontoDeCor` para o ponto nas grades, círculo permitido pela mesma licença do dot de situação |
| `LinkDeTexto` | `primitivos/LinkDeTexto.tsx` | `mono` | Link de conteúdo (a matrícula que abre a aeronave). É `Link` do router de verdade — nova aba, copiar endereço e histórico vêm de graça. Distinto do `LinkDeNavegacao` (barra lateral) e do `BotaoDeLink` (ação sem navegação) |
| `AreaDeTexto` | `primitivos/AreaDeTexto.tsx` | — | O irmão de várias linhas do `CampoDeTexto`: mesmo rótulo, mesmo cromo, mesma régua de foco. Nasceu com as observações do trecho |

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
| `--cor-superficie-3` | `--cor-superficie-recuada` | Barra lateral, faixa recuada |
| `--cor-hover` | `--cor-hover` | Hover de controle |
| `--cor-linha-hover` | `--cor-linha-hover` | Hover de linha de grade. **Opaco de propósito**: translúcido vaza sob coluna congelada |
| `--cor-overlay` | `--cor-overlay` | Scrim atrás do modal |
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
estados, a superfície 4, `--cor-neutro-medio`, as réguas compostas `--cols-*`, o restante da
armadura (`--arm-id`, `--arm-num`, `--arm-valor`, `--arm-lockup`, `--arm-serie`, `--arm-selecao`) e
`--shadow-fixa-*`, que só existe onde há coluna congelada. Entram com as telas financeiras.

Os `--z-*` viraram `--camada-*` e vieram só nos dois degraus em uso: `sticky` e `menu`.

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
| Tela de Usuários (grade densa, filtros, paginação) | **Implementada** — `features/usuarios` |
| Tela de Aeronaves (lista de cartões da frota) | **Implementada** — `features/aeronaves`, do Projeto final. Ver a nota abaixo sobre os números ausentes |
| Tela de Configurações (4 seções) | **Implementada** — `features/configuracoes`. Seletor de tema em `compartilhado/tema` |
| Barra lateral de navegação e cabeçalho de aplicação | **Parcial** — `app/LayoutDaAplicacao`, no mínimo que as telas em pé exigem. Sem busca global, sem seletor de tema, sem fila de avisos, sem navegação em grupos e sem gaveta com scrim em mobile: abaixo de 700px a navegação vira faixa horizontal rolável |
| Tabela densa | **Implementada sem colunas fixas nem linha de totais** — nenhuma coluna da tela de Usuários é congelada e não há total a somar. A régua já sai da armadura, então a grade das telas financeiras herda o alinhamento |
| Modal | **Implementado** — primitivo `PainelModal`, promovido de `PainelDeConvite` quando Proprietários precisou do segundo modal |
| Tela de Proprietários (cartões, filtros, painel de cadastro) | **Implementada** — `features/proprietarios`, do Projeto final. Ver a nota abaixo sobre o saldo ausente |
| Paleta de cor de identificação | **Implementada** — primitivo `SeletorDeCor`. O protótipo tem 8 amostras apontando para tokens semânticos; aqui são 6, todas de tokens existentes |
| Tela de Detalhe da aeronave | **Implementada** — `features/aeronaves/componentes/PaginaDeDetalheDaAeronave`, do Projeto final, em duas colunas. Ver a nota abaixo sobre o que ficou de fora |
| Tela de Nova aeronave (wizard em seções) | **Parcial** — `features/aeronaves/componentes/PaginaDeNovaAeronave`, com o conversor NM→km. Ver a nota abaixo sobre as seções ausentes |
| Tela de Diário de voos (grade, filtros, painel de trecho) | **Parcial** — `features/voos`. Linha de TOTAIS somada no servidor; sem paginação nem seletor de densidade (o recorte natural — uma competência — é de dezenas de linhas) |
| Tela de Lançamentos de custos (grade, filtros, painel, CSV) | **Parcial** — `features/custos`. Mesmas ausências deliberadas do diário (paginação, densidade, seletor de "Estado" do protótipo); o "Ver últimos dados" do protótipo não existe porque o `placeholderData` do Query já segura o recorte anterior |
| Tela de Manutenção (parâmetros, programadas, histórico) | **Parcial** — `features/manutencao`. A edição de evento usa o mesmo painel do agendamento em vez da edição inline na linha do protótipo (um formulário só, mesma validação); "Anexar NF" entra com a tela de documentos; a recorrência do parâmetro entra quando existir renovação automática |
| Tela de Calendário (mês com trechos e manutenções) | **Parcial** — `features/calendario`, leitura composta sobre os endpoints de voos e manutenção — nenhum endpoint próprio. Clicar num trecho abre o diário (a tela dona da edição), em vez de editar no lugar como no protótipo |
| Avatar de iniciais | **Implementado na feature** — círculo permitido pelo DD-002. Uma tela só o usa |

### Ainda não implementados

Busca global (⌘K), menu de perfil, badge de situação, chip de alerta, colunas congeladas e linha de
totais da grade, seletor de densidade, drawer de detalhe, popover de calendário, gráficos de barra e
sparkline. Todos pertencem a telas da área logada que ainda não existem.

O **esqueleto de carregamento** virou o primitivo `Esqueleto` quando a grade de Proprietários — a
segunda — precisou dele, agora com o gradiente animado do `.skel` do handoff e
`prefers-reduced-motion` respeitado.

### O Detalhe da aeronave é o do Projeto final, com a coluna da direita por inferência

No trecho visível do protótipo o detalhe não tem barra de abas: o cabeçalho de entidade é uma
linha (matrícula, "Fabricante Modelo · Base · Hangar", a etiqueta de situação, um espaçador e um
bloco à direita), e o corpo é uma grade de duas colunas (`minmax(430px, 1.6fr) minmax(280px,
0.95fr)`, uma coluna abaixo de 1024px). À esquerda, o cartão do contrato de participações como
tabela (Proprietário · % de propriedade) que vira formulário na mesma tabela ao "Alterar
participações", com a caixa tracejada de adicionar e a faixa da soma com as mensagens do
protótipo; o histórico de contratos; e a tripulação como tabela com sublinhas (CANAC · contato;
prazo da validade). À direita, ficha técnica e configuração financeira.

**Decisões nossas, além do protótipo:**

- A **matrícula em mono** (o protótipo usa a fonte de título; mono é a convenção da casa para
  identificadores, como na frota).
- A **consequência da situação** ao lado da etiqueta — "RETA vence em 12 dias", em âmbar para
  Atenção e vermelho só para Vencido —, porque "Atenção" sozinho não diz o quê nem quando.
- Os **vencimentos de CVA e RETA** à direita do cabeçalho, no lugar do "Saldo do fundo" do
  protótipo, até aportes existir.
- O **histórico num cartão com faixa de cabeçalho**, como as demais seções (no protótipo é um
  cartão com o título inline).
- **Ações de linha com texto** ("Remover", "Editar") em vez dos quadrados de glifo do protótipo:
  ação de linha é visível e nomeada, nunca só um ícone.
- **Etiqueta só na exceção** na tripulação: "Inativo" aparece, "Ativo" não — chip em toda linha
  para dizer o normal seria ruído.
- **"Tripulante"** em todo o cartão, onde o protótipo escreve "piloto": é o termo do glossário
  (piloto é papel de usuário).

**O que ficou de fora, e a feature dona:** "Documentos (n)" (documentos); "Saldo do fundo",
"% no rateio", "Saldo acumulado", a fatura e a cobertura do fundo (aportes e rateio); licença e
habilitações e "Remover piloto" (extensão do tripulante e endpoint de remoção — excluir de verdade
não existe no domínio); os atalhos para Lançamentos e Voos filtrados (as telas ainda não leem
`?aeronave=`); o botão de cor por proprietário (a cor é do cadastro de Proprietários); o
formulário de tripulante embutido no cartão (o painel modal existente cobre todos os campos). A
trilha "← Aeronaves" sai quando a casca ganhar o botão de voltar do protótipo.

**Uma ressalva de fonte:** o `get_file` do Claude Design devolve no máximo 256 KiB, e o detalhe é
a última tela do arquivo — o HTML termina no quinto campo do formulário de tripulante. A coluna da
direita não foi vista, e o cartão do contrato está condicionado a um estado `detIsOwnersTab` que o
arquivo íntegro pode explicar como aba. A coluna da direita segue os cartões que já existiam
(ficha técnica e configuração financeira), com o chrome de cartão do protótipo; se o arquivo
íntegro mostrar outra composição, o ajuste é de uma PR.

A tabela de tripulação deixou de consumir a armadura de trilhas (`--armadura-*`); os tokens ficam
enquanto Usuários, Voos e Lançamentos os usarem (ADR-0017).

### A Nova aeronave tem quatro seções, não cinco

Do protótipo ficaram de fora, cada uma esperando a feature dona: o **saldo atual do fundo** e a
distribuição dele por proprietário (pertencem a aportes) e a seção de **documentos** (pertence à
tela de documentos, que envolve armazenamento de arquivo). Entrou o que o protótipo não tem: o
**vencimento do CVA** — a situação regulatória da frota é derivada dele, e cadastrar sem CVA
criaria uma linha sem a coluna que dá sentido à tela. O contrato inicial de participações é um
segundo POST na rota do contrato: `aeronave` importar `participacao` criaria ciclo entre features,
e aeronave sem contrato é estado válido do domínio.

O "+ Cadastrar proprietário" da seção 4 é o do protótipo: abre o mesmo painel da tela de
Proprietários e já vincula o recém-criado, com o percentual por preencher. O painel e as mutações
de criar e atualizar moram em `compartilhado/proprietarios` porque duas features os abrem; o CRUD
completo (grade, filtros, desativar e reativar) continua sendo a tela de Proprietários. O
protótipo também tem o gatilho dentro do combobox vazio ("Nenhum proprietário encontrado"), que não
existe aqui: a seleção é um `<select>` nativo, sem estado vazio próprio — o botão do cabeçalho
cobre o caso.

### A tela de Proprietários é uma grade de cartões, sem o saldo

É a tela do Projeto final: um cartão por proprietário, com avatar de iniciais, documento e contato
numa linha, as ações à direita e, embaixo, uma linha por aeronave em que ele participa — matrícula,
barra do percentual e o número. Os vínculos vêm de `GET /participacoes/vigentes`, uma chamada só
para a grade inteira (o contrato é quem sabe quem é dono de quanto, por isso a rota é da
participação, não do proprietário), e chegam à parte da lista de proprietários: enquanto não
chegam, o cartão diz "sem vínculo", nunca fica em branco.

O **saldo** que o protótipo mostra ao lado de cada barra não está aqui: pertence a aportes, e
**coluna vazia não existe**. O "Excluir" do protótipo é "Desativar": excluir de verdade não existe
neste domínio (glossário), e o inativo mostra a etiqueta e o "Reativar", como em Usuários.

**Fora de escopo por decisão de produto:** a infraestrutura de i18n (`i18n-en.js`, `i18n-es.js` do
bundle). O produto é entregue em português; inglês e espanhol não estão nesta fase.
