# Teste de ponta a ponta — outubro de 2026

Branch `fix/teste-ponta-a-ponta`, a partir de `main` em `bc1b175` (depois do PR #19). Ambiente
local (`./scripts/ambiente.sh up`) com os seeds do projeto; nenhum dado pessoal real. Referência
visual: "Projeto final Aether.dc.html" do Claude Design.

## 1. Resumo executivo

Percorri as 16 telas da área logada e a tela de entrada no navegador embutido, pelo caminho que o
usuário faria (menu, sino, links internos), conferindo também URL direta e recarregamento. Exercitei
cada ação com caminho feliz, dados inválidos e limites, cancelamento e reflexo entre telas
(antecedência → central → sino; trecho → contadores → manutenção → fechamento; aviso → tela dona).
A validação de entrada foi sondada também direto na API. O design foi comparado tela a tela com o
HTML do protótipo, com estilos computados nos pontos de dúvida, em 1440px e em 375px.

**Resultado:** 13 bugs corrigidos (3 no backend, 10 no front) e 11 grupos de divergência de design
corrigidos, em 20 commits. `./gradlew check testeIntegracao` e `npm run verificar` passam (188
testes no front).

**Avaliação geral:** o sistema funciona de ponta a ponta para o que se propõe hoje — cadastro da
frota, contratos, diário, lançamentos, aportes, fechamento, trocas, manutenção, documentos e
avisos conversam entre si e o rateio fecha. Os bugs mais graves eram de **integridade financeira**
(custo e voo atribuíveis a quem não é dono da aeronave, que o fechamento cobraria) e de **cadastro**
(CPF/CNPJ sem dígito verificador). O que falta para o produto ficar completo está na seção 5: a
porta de entrada (Visão geral), o registro de execução de manutenção — sem ele um parâmetro
estourado não se renova — e as telas analíticas.

## 2. Matriz de cobertura

Status: **ok** (funciona e segue o design ou uma adaptação documentada) · **corrigido** (bug ou
divergência corrigida neste teste) · **faltante** (seção 5) · **pendente** (seção 6).

| Tela | Funcionalidade | Status |
| --- | --- | --- |
| Entrada | Entrar, senha errada, voltar à tela pedida | ok |
| Entrada | Sair | corrigido (B12) |
| Casca | Navegação, título por rota, "←", "+ Registrar" com `?registrar=1` | ok |
| Casca | Sino: contagem, lista, "Abrir central" | ok |
| Casca | Sino atualizado após escrita | corrigido (B11) |
| Casca | Visual (barra, marca, alturas) e celular | corrigido (D1, D11) |
| Casca | Menu de perfil, recolher navegação, rodapé com a empresa | faltante |
| Saúde (`/`) | Situação da plataforma | ok — mas deveria ser a Visão geral (faltante) |
| Central de avisos | Indicadores, abas, marcar lido/não lido, marcar todos, abrir | ok |
| Central de avisos | Alinhamento da linha lida | corrigido (B5) |
| Central de avisos | Indicadores e largura | corrigido (D4) |
| Central de avisos | Notificar responsáveis | faltante |
| Aeronaves | Lista, situação, próximo vencimento, saldo, custo, proprietários | ok |
| Aeronaves | Cartão inteiro clicável | corrigido (B3) |
| Nova aeronave | Cadastro, conversor NM→km, motores, vínculos, soma 100%, cadastro rápido de proprietário | ok |
| Nova aeronave | Erro duplicado, seções, obrigatórios, motivo do botão desabilitado | corrigido (B2, D7) |
| Nova aeronave | Seção de documentos, saldo por proprietário | faltante |
| Detalhe da aeronave | Cabeçalho, contrato (alterar/histórico), tripulação, ficha, financeiro, atalhos | ok |
| Detalhe da aeronave | Prazo do CMA/CHT cortado | corrigido (B4) |
| Detalhe da aeronave | Saldo do fundo em destaque | corrigido (D6) |
| Detalhe da aeronave | Remover tripulante, licença do tripulante | faltante |
| Documentos | Enviar vários, tipo recusado com mensagem, baixar, remover com confirmação | ok |
| Documentos | Botão e colunas | corrigido (D6) |
| Diário de voos | Filtros na URL, grade, totais, registrar, corrigir, excluir | ok |
| Diário de voos | Coluna Rel. Voo sobreposta à data | corrigido (B1) |
| Diário de voos | Erro de validação no campo errado e genérico | corrigido (B2) |
| Diário de voos | Atribuição a quem não é dono | corrigido (B8) |
| Diário de voos | Trecho alimenta célula, ciclos e km | ok |
| Diário de voos | Horas de motor e APU pelo diário | faltante |
| Diário de voos | Cartões de % de uso, filtro por voo | pendente (D) |
| Trocas de KM | Filtro e saldo de horas, abas, concluir, reabrir, editar, mesma pessoa recusada | ok |
| Trocas de KM | Coluna da aeronave cortada | corrigido (D10) |
| Lançamentos | Filtros, escopo, abas, grade, totais, USD com câmbio, CSV | ok |
| Lançamentos | Atribuição a quem não é dono | corrigido (B8) |
| Aportes | Mensal/Período, abas, indicadores, painel, data futura e não participante recusados | ok |
| Fechamento | Mensal, período, extrato, regras, saldo acumulado | ok |
| Fechamento | Baixar extratos, ciclo de fatura | faltante |
| Fechamento | Chips de regra no modo Período | pendente (precisa do campo na API) |
| Manutenção | Contadores, indicadores, agenda, histórico, parâmetros, CRUD | ok |
| Manutenção | Nome do parâmetro invadindo a coluna | corrigido (B9) |
| Manutenção | Executar parâmetro, última execução, responsável | faltante |
| Calendário | Mês, trechos, manutenções, navegação de mês | ok |
| Calendário | Clique no trecho sem recorte, aeronave fora da URL, "hoje" em UTC | corrigido (B6, B7) |
| Proprietários | Busca, filtro, cartões, saldo, cadastrar, editar, desativar/reativar | ok |
| Proprietários | CPF/CNPJ inválido aceito | corrigido (B10) |
| Proprietários | Texto de cadastro na edição | corrigido (D10) |
| Usuários | Busca, filtros, paginação, convite, reenviar, desativar/reativar | ok |
| Usuários | Selo, botão, colunas | corrigido (D5) |
| Usuários | Abrir/editar dados do usuário | faltante |
| Configurações | Empresa, aparência, antecedência, troca de senha com código | ok |
| Configurações | Antecedência refletida no sino | corrigido (B11) |
| Visão geral · Análises · Projeções | — | faltante |

Estados de tela: carregando (esqueleto) e vazio foram vistos em todas as grades; erro de servidor foi
provocado nos formulários (400 com campos) e na sessão (401). O erro de rede das listagens não foi
provocado no navegador (seção 6).

## 3. Bugs corrigidos

| # | Sintoma | Causa raiz | Correção | Commit |
| --- | --- | --- | --- | --- |
| B1 | No Diário, "RV-2026-043 · 1" passava por cima da data | Rel. Voo + nº do trecho numa coluna de 80px, com reticências num `span` inline, onde não valem | Coluna de lockup (160px) e o identificador em bloco | `dd7cc56` |
| B2 | Recusa do servidor no trecho aparecia como "Verifique os campos informados", presa ao campo Rel. Voo, fora da vista; o mesmo nos outros 8 painéis; na Nova aeronave, o erro aparecia duas vezes | O cliente da API descartava o mapa `campos` do 400 e cada painel pendurava o erro no primeiro campo | `ErroDeApi` carrega `campos` e a mensagem passa a ser a do campo; o erro vai para um alerta junto dos botões | `67b0915` |
| B3 | O cartão da frota reagia ao mouse, mas só a matrícula e a seta abriam o detalhe | Só os links navegavam | O link da seta se estende sobre o cartão (continua sendo link de verdade) | `b6cc291` |
| B4 | Na tripulação, "vence em 186 di…" e "vencida há 38 di…" cortados | Coluna estreita com reticências no prazo | O prazo quebra a linha; colunas rebalanceadas | `f91d40c` |
| B5 | Marcar um aviso como lido desalinhava as colunas daquela linha | Coluna de ações em `auto` numa grade por linha | Largura fixa | `fdc711a` |
| B6 | No Calendário, clicar no trecho abria o Diário sem aeronave nem mês; `?aeronave=` era ignorado | Recorte em `useState` e `navigate('/voos')` sem parâmetros | Recorte na URL (`useRecorteDaUrl`) e o clique leva `?aeronave=&competencia=` | `70c549d` |
| B7 | O dia de hoje no Calendário vinha de `toISOString` (UTC): depois das 21h em Brasília, destacava amanhã | Data em UTC | `hoje()` no fuso local | `70c549d` |
| B8 | Custo e trecho podiam ser atribuídos a um proprietário que nunca participou da aeronave; o fechamento lhe cobraria o custo ou o voo | Só se verificava se o proprietário estava ativo | Mesma regra dos aportes e trocas, por portas `ParticipantesDoCusto` e `ParticipantesDoVoo`; no front, a atribuição só oferece os donos da aeronave | `a0f7e2e` |
| B9 | Em Manutenção, "Trem de pouso — overhaul 3.000 ciclos" passava por cima de "Ciclos" | Reticências em `span` inline | Texto em bloco; o mesmo em Diário e Usuários, onde ainda não transbordava | `f91d40c` |
| B10 | CPF `123.456.789-00` era aceito como documento do titular | Só o comprimento era validado | Dígitos verificadores (módulo 11) e recusa da sequência repetida, na entidade | `1cba33e` |
| B11 | Mudar a antecedência (ou lançar, concluir) não atualizava o sino por até um minuto | Cache de avisos sem invalidação | Toda escrita bem-sucedida invalida os avisos, no cliente do Query | `e9678c2` |
| B12 | "Sair" deixava a tela aberta, sem nome e sem itens de administrador, com 401 em toda consulta | `queryClient.clear()` não avisava a guarda da rota | Navega para `/entrar` antes de esvaziar o cache | `52dbd90` |
| B13 | Avisos de teste de build no backend (variável sem uso, stream aberto, `LocalDate.now()` sem fuso) | Testes dos PRs anteriores | Ajuste nos testes | `6e4fdc7` |

Todos com teste que falhava antes (exceto os de layout puro — B1, B3, B4, B5, B9 —, que o jsdom não
mede; esses foram conferidos no navegador, com uma varredura que procura texto vazando da célula
em todas as grades).

## 4. Divergências de design corrigidas

| # | Tela | Elemento | Antes → depois | Commit |
| --- | --- | --- | --- | --- |
| D1 | Casca | Barra lateral, marca, itens, "+ Registrar", sino | `#f2f2f3`, marca 26px/700, itens de 32px, botões de 40px → `#f4f4f6`, 18px/600, 36px, 36px | `baea5eb` |
| D2 | Todas | Sombra do cartão | alfa 0,04 (quase invisível) → 0,14, e o hover do protótipo | `baea5eb` |
| D3 | Diário, Trocas, Aportes, Fechamento, Documentos, Usuários | Cabeçalho e linhas das grades | 11px, peso forte, fundo recuado, 2px de respiro → versalete 12px, peso médio, `--cor-fundo`, 8px | `0198d21` |
| D4 | Aportes, Fechamento, Manutenção, Central | Indicadores | rótulo comum e valor de 18px → rótulo em versalete; 14px em aportes e fechamento; 26px/700 na central, com vencidos em vermelho e próximos em âmbar | `27221b2` |
| D5 | Usuários | Botão e selo | "Convidar usuário" médio, "ADMIN" em texto cinza → "+ Convidar usuário" grande, selo preenchido | `f3f3435` |
| D6 | Documentos e Detalhe | Botão de envio, colunas, saldo | Botão secundário → preenchido no petróleo; data e tamanho de 96px → 160 e 120px; saldo de 14px → 18px | `fd726b5` |
| D7 | Nova aeronave | Seções e obrigatórios | Número em quadrado, título de 18px, 2 colunas até 880px, sem sombra → círculo de 22px, 14px, colunas de 190px até 1.280px, com sombra; asterisco nos obrigatórios e o motivo do botão desabilitado | `8e543cf` |
| D8 | Todas | Campo de texto e seleção | Campo de 45px ao lado de seleção de 40px; seleção em peso 600 → 40px e peso normal | `b50580f` |
| D9 | Lançamentos e Configurações | Textos | "Valor · R$" e totais à esquerda → "Valor" e totais à direita; "✓" no código enviado | `f3f3435` |
| D10 | Trocas, Diário, Proprietários | Detalhes | Coluna da aeronave de 80px (modelo cortado) → 132px; "TOTAIS" e os pousos noutra coluna → "TOTAIS · N pousos"; texto de cadastro no painel de edição → só no cadastro | `9c5a671` |
| D11 | Casca e Aeronaves, em 375px | Celular | Título reduzido a "A…"; cartão com todos os números → título em linha própria; cartão sem custo e proprietários, como no protótipo | `2101db4` |

Mantidas de propósito, por estarem registradas em `docs/design-system.md` ou por regra do
glossário: matrícula em mono, "Situação" no lugar de "Status", ações de linha com texto em vez de
glifo, painéis modais no lugar dos formulários embutidos, tema "Do sistema", "Tripulante" e
"código". O rótulo do "+ Registrar" segue em `--cor-acento-texto` e não no `#5980a6` do protótipo:
o tom do protótipo dá cerca de 4,2:1 sobre branco, abaixo do AA para 13px.

## 5. Funcionalidades faltantes

Itens que exigem entidade, endpoint ou tela nova. Ficaram fora das correções deste teste e estão
aqui para priorização. Prioridade: **bloqueante** (o fluxo principal não fecha sem isto),
**importante** (o fluxo fecha, mas o público espera) e **desejável**. Tamanho: P (até 2 dias),
M (até uma semana), G (mais que isso).

### 5.1 Visão geral — bloqueante · M

A rota `/` ainda mostra a tela técnica de **Saúde** do bootstrap. Para um proprietário de alto
padrão, a porta de entrada precisa ser a gestão patrimonial da frota. A tela está no design.

| Bloco do design | Dados | Já existe no backend? |
| --- | --- | --- |
| Quatro indicadores no topo (saldo dos fundos, custo do mês, horas do mês, avisos ativos — rótulos inferidos) | `/fechamentos/saldos`, `/voos?competencia`, `/avisos`, `/aeronaves` | Sim, por composição |
| "Frota gerenciada": cartão por aeronave com situação, saldo, custo do mês, horas · KM, R$/hora e chips de alerta | idem, somado por aeronave | Sim, por composição |
| Barra de **cobertura** do fundo (quantos meses o saldo paga) | saldo ÷ custo médio mensal | **Não** — falta definir a regra e o termo no glossário |
| "Comparativo da frota": barras horizontais de fixo/variável, horas e R$/hora por aeronave, com média | fechamento de cada aeronave | Parcial — pede um agregado novo (`GET /fechamentos/frota?competencia`) para não fazer N chamadas |

Dependências: agregado de frota no backend; definição de "cobertura" (glossário e talvez ADR);
barra horizontal em CSS; trocar a rota índice e a navegação.

### 5.2 Análises — importante · G (núcleo M)

Responde "quem usa e quem paga", o conflito clássico da copropriedade. Os números essenciais já
estão no Fechamento, por isso não bloqueia a operação.

| Bloco | Já existe? |
| --- | --- |
| Operacional: horas por proprietário, uso × participação, padrão por dia da semana | Sim para um mês; **para período, `/voos` não aceita intervalo** |
| Custos: composição e custo por categoria | Sim (`/custos`, `/fechamentos/mensal`) |
| Custos: combustível em **litros** e preço do litro | **Não** — o lançamento de custo não tem litros |
| Financeiro: aportes × custo rateado × saldo por proprietário | Sim (`/fechamentos/mensal`) |
| Consolidado: séries mês a mês, correlação horas × combustível, mapa de calor | Parcial — pede intervalo em `/voos` e `/custos` ou um agregado (`/analises/uso?aeronave&de&ate`) |

Dependências: intervalo de competências em `/voos` e `/custos` (ou agregado); campo de litros no
custo de abastecimento; gráficos (barras empilhadas, rosca, linha, dispersão, mapa de calor) — o
design usa d3, dependência nova que pede ADR; seletor de período com calendário. Sugestão de
corte: Financeiro, Operacional de um mês e Custos sem litros primeiro.

### 5.3 Projeções — importante · M (G com orçamento e exportação)

"Quanto vou precisar aportar no ano" é a pergunta que o proprietário mais faz ao gestor.

| Bloco | Já existe? |
| --- | --- |
| Histórico realizado | Sim (`/fechamentos/periodo`) |
| Projeção por método e cenário, premissas (reajuste, horas, combustível), tabela mês a mês, por categoria | **Não** — cálculo novo; métodos e cenários precisam de definição de produto |
| Rateio projetado e aporte sugerido por proprietário | Participação e saldo sim; com base por uso falta a regra de uso projetado |
| "Aprovar como orçamento" | **Não** — entidade nova (orçamento por aeronave e ano), só faz sentido com orçado × realizado |
| Exportar Excel / PDF | **Não** — não há exportação no backend |

Dependências: endpoint de projeção com a regra no backend; custos por intervalo; gráfico de linha.

### 5.4 Outras funcionalidades do design ausentes

| Funcionalidade | Onde aparece | Por que importa | Dependências | Prioridade | Tamanho |
| --- | --- | --- | --- | --- | --- |
| **Registro de execução de manutenção** ("Executar", última execução, responsável, recorrência que avança o limite) | Manutenção, design | Sem isso o parâmetro por hora/ciclo/data não se renova: depois de cumprir a pesagem ou o overhaul, o aviso continua "estourado" para sempre. RBAC 43/91 exigem o registro da execução | Backend (campos e endpoint), front | **Bloqueante** | M |
| **Baixar extratos** (Excel/PDF) com seleção de linhas | Fechamento, design | O extrato é o documento que o proprietário e o contador pedem todo mês | Backend de exportação, front | Importante | M |
| **Notificar responsáveis** por e-mail | Central de avisos, design | CVA, RETA, CMA ou CHT vencendo sem ninguém avisado é risco regulatório | Porta de envio (já existe para código de recuperação), regra de destinatário | Importante | M |
| **Situação da aeronave considera manutenção e tripulação** | Implícito no fluxo | Hoje a frota diz "Saudável" para uma aeronave com limite de manutenção estourado e manutenção atrasada (só CVA e RETA contam). Ver pendência de produto P1 | Regra de domínio | Importante (decisão de produto) | P |
| **Horas de motor e APU pelo diário** | Implícito no fluxo (o trecho alimenta célula, ciclos e km) | TBO de motor e inspeções por hora de motor (RBAC 43/91) dependem dessas horas; hoje só a correção manual as move, e o parâmetro de manutenção por motor fica parado | Regra no backend (quais motores operaram), talvez campo no trecho | Importante | P–M |
| **Cobertura do fundo e fatura** no cartão financeiro | Detalhe da aeronave, design | Diz ao proprietário quando vai precisar aportar | Regra de cobertura | Importante | P |
| **Ciclo de fatura** pelo dia de fechamento | Fechamento, Nova aeronave | `diaDeFechamento` é gravado, mas a competência é sempre o mês civil | Regra de competência | Desejável | M |
| Avisos "Saldo abaixo da margem" e "Aporte pendente" | Central de avisos | Antecipar o fundo descoberto | Política de margem, cobrança | Desejável | M |
| **Remover tripulante** | Detalhe da aeronave | Hoje só se desativa; não há `DELETE` | Backend, front | Desejável | P |
| Licença e habilitações do tripulante na linha | Detalhe da aeronave | Contexto regulatório do piloto | Campo no `TripulanteResponse` | Desejável | P |
| Saldo no fundo por proprietário no cadastro e seção de documentos no cadastro | Nova aeronave | Hoje o saldo de abertura é distribuído pela participação; os documentos se anexam depois | Contrato, orquestração | Desejável | P |
| Documentos e notas fiscais por manutenção | Manutenção | Rastreabilidade da execução | Documentos com dono "manutenção" | Desejável | P–M |
| Menu de perfil (avatar, Configurações, Sair da conta), recolher a navegação, rodapé com a empresa | Casca | Acabamento | Front | Desejável | P |
| Painel do usuário (abrir e editar dados) | Usuários | Hoje só convidar, reenviar, desativar e reativar | Endpoint de edição | Desejável | P |
| Chip da aplicação financeira ao lado dos rendimentos | Aportes | Mostrar onde o fundo está aplicado | Campo de aplicação por aeronave | Desejável | P |
| Pré-visualização de documento | Documentos | Conveniência; hoje sempre baixa, por segurança (ADR-0020) | Front + cabeçalhos | Desejável | P |
| Seletor de idioma | Casca | Fora de escopo por decisão de produto | — | — | G |
| Busca global | Lista "ainda não implementados" | Conveniência | Front + backend | Desejável | M |
| Gráficos, sparkline, popover de calendário, gaveta de detalhe | Primitivos | Pré-requisito de Visão geral, Análises e Projeções | Design system (e ADR se entrar d3) | Bloqueante para 5.1–5.3 | M |

## 6. Pendências

### Decisões de produto (registradas, não implementadas)

- **P1 — Situação da aeronave.** A frota mostra **Saudável** para a PS-MEP enquanto a Central tem,
  para ela, um limite de manutenção estourado (pesagem regulamentar), uma manutenção programada
  atrasada e o CHT de uma tripulante vencido. Hoje "poder voar" olha só CVA e RETA (glossário).
  Pergunta: parâmetro estourado e manutenção atrasada devem tirar a aeronave de "Saudável"? A
  regulação diz que inspeção obrigatória vencida impede o voo.
- **P2 — Trecho com data futura.** É aceito e já soma ciclos, km e horas aos contadores. Se o
  trecho pode ser planejado (há horários previstos), os contadores deveriam esperar o realizado?
- **P3 — Pouso antes da partida.** É lido como virada de meia-noite: 10:45 → 10:00 vira 23,3 h,
  sem aviso. Vale confirmar acima de, por exemplo, 12 horas?
- **P4 — Desativar proprietário com participação vigente.** É imediato, sem confirmação, e o
  proprietário continua no contrato (pagando o fixo), mas deixa de poder receber custo ou voo.
  Pedir confirmação? Bloquear enquanto houver contrato vigente?
- **P5 — Clicar num aviso do sino** abre a tela, mas não o marca como lido.

### Divergências de design não corrigidas

- **"Concluir" verde** (Manutenção e Trocas): o `--cor-positivo` do tema escuro é um verde claro
  sobre o qual o texto branco não tem contraste. Precisa de um token de positivo sólido nos dois
  temas — decisão de token.
- **Chips de regra do rateio no modo Período** do Fechamento: a resposta do período não traz base do
  rateio nem modelo de aporte; precisa do campo na API.
- **Controles segmentados** (Mensal/Período, Pendentes/Realizadas, abas de categoria em chips),
  **cartões de % de uso** no Diário, **filtro por voo** em Lançamentos e Diário, **etiqueta tingida**
  da atribuição, **legenda e células em bloco** do Calendário: pedem primitivo novo ou redesenho
  da tela; ficaram para uma rodada de design dedicada.
- Botões de 36px (`btn-md`) do protótipo: o `Botao` tem 32, 40 e 48px.
- Fundo da área de conteúdo: o protótipo usa `#f2f2f3`; `docs/design-system.md` fixa `#fafafb` como
  identidade. Mantido até alguém decidir qual vale.
- O HTML do Claude Design vem truncado em 256 KiB: a coluna direita do Detalhe da aeronave e o
  script do protótipo (rótulos de abas, indicadores e menus) não puderam ser comparados.

### O que não consegui testar

- **Envio de e-mail** (convite, código de recuperação e de troca de senha): o envio é por porta e,
  no ambiente local, não sai da máquina; testei só até a confirmação na tela.
- **Download do documento**: confirmado pelo teste de integração (anexo, `nosniff`, conteúdo
  íntegro), não pelo navegador.
- **Falha de rede nas listagens** (estado de erro com "Tentar de novo"): coberto pelos testes de
  componente, não provocado no navegador.
- **Tema escuro**: visto só de passagem; a mudança de sombra é do tema claro.
- **Perfis diferentes de administrador** (gestor, piloto, proprietário): cobertos pelos testes de
  componente; no navegador entrei só como administrador do seed.

