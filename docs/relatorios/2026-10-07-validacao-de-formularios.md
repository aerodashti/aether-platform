# Validação de formulários — 07 de outubro de 2026

Branch `fix/validacao-de-formularios`, a partir de `main` em `aa0acbd`: 107 commits, com a base
comum, a correção de cada grupo e a integração. As regras de formulário estão no ADR-0022; as
decisões técnicas novas, nos ADRs 0023 a 0025.

## 1. Método

1. **Auditoria em 14 grupos.** Cada grupo cobriu uma área: design system e tratamento de erros
   (DSY), acesso (AUT), nova aeronave (NAV), ficha técnica, contadores e configuração financeira
   (FIC), tripulante (TRI), contrato de participação e saída (CON), proprietários (PRO), custos
   (CUS), diário de voos (VOO), trocas de KM (TRO), aportes e rendimentos (APO), manutenção (MAN),
   documentos e filtros (DOC), configurações e usuários (CFG). A auditoria leu o código, sondou a
   API e registrou cada achado com evidência.
2. **Verificação adversarial.** Um segundo agente tentou derrubar cada achado. Os que não se
   sustentaram foram descartados, e os que ele encontrou no caminho entraram como `-V`.
3. **Correção por grupo**, num branch próprio, com as decisões de produto D1 a D24 (seção 6)
   aplicadas por padrão. Achado que dependia de decisão fora dessa lista não mudou a regra: só a
   informação na tela, e a pergunta foi para a seção 7.
4. **Revisão independente** de cada correção, com ajustes quando ela reprovou.
5. **Integração.** Os 13 branches foram mesclados, e as regras escritas em paralelo viraram uma só:
   `@SenhaNova` e `senhaNova()`, `FormatoDeEmail` e `FormatoDeTelefone` em `comum/validacao`, o
   `FusoDoNegocio` em `comum/config`, o `Formulario` comum em todos os painéis e as migrations
   V20 (CNPJ alfanumérico) e V21 (conclusão da manutenção).

## 2. Números

Contados de `auditar-*.json`, `verificar-*.json`, `confirmados-*.json` e `finais.json`. A situação
é a de depois da integração (veja as notas abaixo da tabela).

| Grupo | Auditoria | Achados na verificação | Descartados | Confirmados | Alta | Corrigidos | Parciais | Decisão pendente | Não corrigidos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DSY | 25 | 5 | 0 | 30 | 3 | 25 | 4 | 0 | 1 |
| AUT | 17 | 2 | 0 | 19 | 3 | 17 | 2 | 0 | 0 |
| NAV | 28 | 3 | 0 | 31 | 5 | 30 | 1 | 0 | 0 |
| FIC | 25 | 4 | 1 | 28 | 6 | 25 | 1 | 2 | 0 |
| TRI | 21 | 2 | 0 | 23 | 3 | 22 | 0 | 1 | 0 |
| CON | 23 | 2 | 0 | 25 | 0 | 24 | 1 | 0 | 0 |
| PRO | 25 | 3 | 0 | 28 | 1 | 25 | 1 | 2 | 0 |
| CUS | 23 | 3 | 1 | 25 | 3 | 22 | 1 | 2 | 0 |
| VOO | 27 | 6 | 0 | 33 | 5 | 31 | 0 | 2 | 0 |
| TRO | 25 | 4 | 0 | 29 | 7 | 26 | 2 | 1 | 0 |
| APO | 22 | 3 | 1 | 24 | 5 | 23 | 0 | 1 | 0 |
| MAN | 30 | 4 | 2 | 32 | 5 | 31 | 1 | 0 | 0 |
| DOC | 21 | 3 | 1 | 23 | 2 | 22 | 1 | 0 | 0 |
| CFG | 30 | 5 | 2 | 33 | 4 | 31 | 2 | 0 | 0 |
| **Total** | **342** | **49** | **8** | **383** | **52** | **354** | **17** | **11** | **1** |

Encontrados: 391 (342 da auditoria e 49 da verificação). Confirmados: 383, ou seja, 391 menos os 8
descartados. Corrigidos: 354 de 383 (92%). Dos 52 de severidade alta, 50 foram corrigidos; MAN-15
ficou parcial, e VOO-02 virou decisão pendente.

Notas sobre a contagem:

- **DSY não tem relato final em `finais.json`.** A base comum é a correção dele. A situação de cada
  achado DSY foi conferida no código: 25 corrigidos, 4 parciais (DSY-19, 20, 22 e 25) e 1 não
  corrigido (DSY-11).
- **Doze achados mudaram de situação em relação ao relato do grupo.** Onze passaram a corrigido:
  - AUT-03 e CFG-02: a `@SenhaNova` passou a valer também na troca de senha.
  - MAN-V01: o relógio da aplicação passou ao fuso do negócio.
  - NAV-V01: o 403 neutro veio do grupo AUT.
  - PRO-08: Azul e Celeste foram separados no tema escuro pela base.
  - PRO-11, 13, 14, 15 e V02: corrigidos pelo grupo CON (CON-02, 03, 06, 07, 09, 20 e 21).
  - APO-17: corrigido pelo grupo DOC (DOC-15 e DOC-16).

  Um saiu de corrigido: **VOO-02**, porque o 409 de trecho repetido foi retirado no ajuste (D7) e
  virou decisão pendente.
- O AUT registrou "D24" como item na lista de achados. Ele é uma decisão aplicada, não um achado,
  e ficou fora da contagem.

## 3. A base comum criada

| Peça | Onde | O que resolve |
| --- | --- | --- |
| `MolduraDeCampo` | `design-system/primitivos` | Rótulo, asterisco, apoio, erro e `aria-*` iguais em `CampoDeTexto`, `Selecao`, `AreaDeTexto`, `GrupoDeOpcoes` e `SeletorDeCor`; os grupos de rádio ganharam legenda visível e teclado |
| `useValidacao` e `ResumoDoFormulario` | `compartilhado/formulario` | Nada vermelho antes da primeira tentativa. Na tentativa, o foco vai ao primeiro campo inválido e o resumo diz o que falta. O erro do servidor cai no campo de mesmo nome |
| Regras puras | `compartilhado/formulario/regras.ts` | `obrigatorio`, `tamanhoMaximo`, `numero`, `dataEntre`, `email` (domínio com ponto), `senhaNova`, `telefone` e `competencia`, cada uma espelhando o request |
| `lerNumero` | `compartilhado/formatacao/numero.ts` | Um só leitor de número no formato brasileiro, no lugar de várias cópias que gravavam "1.850" como 1,85 ou apagavam o valor |
| `Formulario` | `compartilhado/formulario` | O `<form>` dos painéis: Enter envia, sem a validação nativa |
| `Botao` com `aria-disabled` | `design-system/primitivos` | Desabilitado e carregando seguem no Tab, e o foco não cai no `<body>` durante o envio |
| `PainelModal` | `design-system/primitivos` | Devolve o foco a quem o abriu, e `podeFechar={false}` segura o Esc durante o envio |
| Tratador de erros com `campos` | `comum/erro` | `ExcecaoDeDominio` nomeia o campo. Corpo ilegível, casas decimais num campo inteiro e violação de integridade deixam de ser 500, e as recusas do Spring mantêm o próprio status |
| `FormatoDeEmail`, `FormatoDeTelefone` | `comum/validacao` | A mesma regra de e-mail e de telefone em todo request |
| `FusoDoNegocio` | `comum/config` | O "hoje" do servidor é o de Brasília, e não o de UTC, que vira o dia às 21h (ADR-0023) |

## 4. Principais bugs corrigidos (severidade alta)

- **Número brasileiro gravado mil vezes menor, ou apagado.** "12.500" virava R$ 12,50, e "1.234,5"
  virava `NaN`, que o JSON manda como `null` e que apagava o valor salvo. Achados: DSY-12, NAV-02,
  NAV-03, FIC-01, FIC-02, FIC-03, FIC-04, TRI-01, CUS-01, VOO-01, TRO-01, TRO-02, APO-01, APO-05,
  MAN-01 e MAN-02. No MAN-02, o parâmetro nascia estourado e impedia o voo.
- **Valor fora da coluna virava 500 ou era arredondado em silêncio.** Achados: DSY-01, DSY-V01,
  NAV-06, TRI-02, CUS-02, CUS-03, VOO-05, TRO-03, TRO-04, TRO-05, APO-03, MAN-04 e MAN-05.
- **Acesso.**
  - AUT-01: o convidado não tinha tela para criar a senha e ficava pendente para sempre.
  - AUT-02 e CFG-V01: o desativado se reativava sozinho pelo convite ou pelo código.
  - AUT-03 e CFG-02: senha acima de 72 bytes dava 500 e revelava quem tinha conta.
  - CFG-03: a senha atual, na troca, não tinha limite de tentativas.
- **Dado perdido sem aviso.**
  - FIC-05: limpar um contador o zerava.
  - FIC-06: salvar a ficha regravava os contadores e apagava um voo lançado no meio.
  - VOO-V01: lançamentos simultâneos perdiam contadores.
  - CFG-01: salvar a antecedência apagava a edição da empresa.
  - TRI-V01: uma data incompleta apagava a validade gravada.
  - TRO-V01: "Reabrir", sem confirmação, apagava a data da devolução.
  - APO-02: o rendimento ia para a aeronave do filtro anterior.
- **Regra errada.**
  - NAV-04: o cadastro não tinha ciclos e mandava zero.
  - NAV-05: a soma liberava contrato inválido, e a aeronave ficava sem contrato.
  - VOO-03: trecho atribuído a um proprietário que ficou inativo não se corrigia.
  - PRO-01: o CNPJ alfanumérico era recusado.
  - TRO-08: o "hoje" do servidor era o de UTC.
  - APO-V01: competência com ano de 5 dígitos deixava o aporte inalcançável.
  - DOC-01: 11 arquivos ou mais davam 500.
  - DOC-17: competência sem limite prendia a thread do fechamento.

## 5. O que ficou parcial ou não corrigido, e por quê

| Achado | O que falta | Por quê |
| --- | --- | --- |
| DSY-11 | Contraste de 3:1 na borda dos campos e no marcador, e seleção que não dependa só de cor | Pede token novo e uma decisão de desenho |
| DSY-19 | O `maxLength` do `CampoDeTexto` ainda corta o texto colado sem avisar em alguns painéis | Só a `AreaDeTexto` ganhou contagem, e só a ficha e o financeiro trocaram o corte pela regra |
| DSY-20 | "Data incompleta" aparece, mas não segura o envio | O `useValidacao` não lê `badInput`; o tripulante contorna à mão (ADR-0022, lacunas) |
| DSY-22 | O foco do campo é um contorno de 1px, diferente dos outros primitivos | Ficou fora da base |
| DSY-25 | O Esc fora do envio descarta o painel sem confirmar | O `PainelModal` ganhou só o `podeFechar`; o cadastro de aeronave confirma por conta própria |
| AUT-04 | Com SMTP real, o tempo do envio do código ainda distingue quem tem conta | O envio é síncrono; torná-lo assíncrono é decisão técnica pendente (item 18) |
| AUT-16 | Não há aviso de tentativas restantes antes do bloqueio | Decisão de produto (item 15) |
| NAV-28 | Sair pelo menu com o cadastro pela metade não avisa | Exige data router (item 19) |
| FIC-25 | O saldo tem rótulos diferentes no cadastro e na edição | De propósito: "atual" seria falso na edição; o glossário registra os dois |
| CON-07 | Os sócios atuais não podem ser retirados no painel de saída | Decisão de produto (item 26) |
| PRO-20 | A amostra escolhida no `SeletorDeCor` não tem marca além da cor | Fica no design system, fora do grupo |
| CUS-12 | O Rel. Voo do custo não é conferido contra os voos | Decisão de produto (item 25); o valor já é normalizado (D19) |
| TRO-07 | A data da troca não é conferida contra o período de participação | Decisão de produto (item 2) |
| TRO-20 | O parágrafo do painel de troca não está ligado ao diálogo | O `PainelModal` não tem `descritoPor` |
| MAN-15 | O servidor ainda permite excluir uma manutenção concluída | Decisão de produto (item 28); a tela já confirma e sugere reabrir |
| DOC-21 | Trocas não tem filtro por aeronave na tela | Decisão de produto (item 34); o resto do recorte já está na URL |
| CFG-06 | Dentro do intervalo de 1 minuto, o servidor ignora o pedido e responde 202; outra aba pode dizer "enviado" | Decisão (item 16) |
| CFG-19 | O Jackson ainda converte a string "45" em número | A coerção de texto para número não foi desligada; só a de decimal para inteiro foi |

## 6. Decisões de produto aplicadas por padrão (para o dono do produto confirmar)

| # | Regra aplicada |
| --- | --- |
| D1 | Datas de fatos já ocorridos (custo, aporte, rendimento, troca, horário realizado, conclusão), de 01/01/2000 até hoje. O custo vai até hoje + 31 dias, e o horário realizado até agora + 15 min |
| D2 | Datas planejadas (trecho, manutenção), de hoje − 1 ano até hoje + 10 anos. Data passada é aceita, com aviso de que já nasce atrasada |
| D3 | Validades regulatórias, de 01/01/2000 até hoje + 5 anos; o CVA vai até hoje + 13 meses. Vencida é aceita, com aviso |
| D4 | Competência de 01/2000 até a corrente + 12 meses. No aporte, a tela propõe o mês anterior ao do crédito |
| D5 | Um formato de telefone nas duas pontas, e o campo do tipo telefone |
| D6 | Tetos de plausibilidade: R$ no limite da coluna; câmbio até 100 com 4 casas; troca até 1.000 h; tripulante até 60.000 h; peso até 600.000 kg; taxa até 10% ao mês; trecho até 24 h; km até 9.999.999,9 |
| D7 | Duplicidades (NF, troca, homônimo, CANAC e, depois do ajuste, trecho) não bloqueiam nem avisam. Exceção: nome de parâmetro repetido na aeronave é 409 |
| D8 | Ação destrutiva confirma nomeando o item, com o botão em carregando |
| D9 | Concluir manutenção e concluir troca pedem a data efetiva (migration V21 na manutenção) |
| D10 | Aporte FIXO exige valor maior que zero; no proporcional, o campo some e o servidor o ignora |
| D11 | Rendimento sem contrato, participação na data, CPF no contrato e versionamento financeiro: regra mantida, só os textos que mentiam foram corrigidos |
| D12 | A correção mantém a atribuição a quem ficou inativo |
| D13 | `GET /proprietarios`: documento, e-mail e telefone só para administrador e gestor |
| D14 | Redefinir ou trocar a senha encerra as outras sessões; a nova não repete a atual; o bloqueio diz a duração |
| D15 | Até 10 arquivos por envio; nome sem parte-base é recusado |
| D16 | Filtro por aeronave ou proprietário inexistente é 404 |
| D17 | Os horários do trecho ficam no fuso do navegador, e o painel diz qual é |
| D18 | Par realizado completo ou vazio; partida a até 1 dia da data; voo local permitido; ICAO de 4 letras |
| D19 | Rel. Voo em maiúsculas e sem espaços nas pontas, no trecho, no custo e na troca |
| D20 | A faixa de aviso do parâmetro é menor que o limite |
| D21 | CANAC de 6 dígitos; texto sem dígito é recusado |
| D22 | "Ciclos (pousos)" obrigatório no cadastro; as horas de cada motor também |
| D23 | Sem contrato vigente, os painéis avisam que o lançamento não será rateado; a saída sem sucessor diz o que fazer |
| D24 | 403 neutro: "Seu perfil não tem permissão para esta ação." |

## 7. Decisões pendentes

Cada item traz a pergunta e, depois do travessão, o comportamento de hoje. As perguntas que a
integração já respondeu ficaram de fora: o e-mail com domínio completo, o lugar do
`FormatoDeEmail`, o fuso do servidor, a mensagem do envio acima de 50 partes e o 403 neutro na nova
aeronave.

### Atribuição e participação por data

1. **A atribuição do custo e do trecho exige participação no contrato vigente na data?** (CUS-14,
   VOO-16) — O servidor aceita quem participou de qualquer contrato da aeronave. A tela oferece só
   os donos de hoje, e o apoio diz isso.
2. **A data da troca precisa cair no período em que cedente e recebedor participaram?** (TRO-07)
   — Só vale a janela de 01/01/2000 até hoje.
3. **O painel de aporte deve listar só aeronaves com contrato vigente e oferecer quem já saiu?**
   (APO-14) — Oferece os donos do vigente (mais o atual, na correção). O servidor aceita quem
   participa ou participou.
4. **Rendimento em aeronave sem contrato na data do crédito: recusar ou contar como não rateado no
   fechamento?** (APO-13) — Entra no saldo do fundo sem cair na conta de ninguém, e o painel avisa.
5. **O CPF/CNPJ passa a ser obrigatório para entrar num contrato?** (PRO-07) — Nenhum contrato o
   exige, e o glossário foi corrigido para dizer isso.
6. **A regra da partida a até 1 dia da data vale também para a partida prevista?** (D18) — Vale
   para os dois pares.
7. **A janela de data só é conferida na correção quando a data muda?** (D2) — Sim, no trecho e na
   manutenção. Sem isso, um planejado com mais de um ano não teria nem as observações corrigidas.

### Duplicidades

8. **Trecho repetido (mesma aeronave, Rel. Voo e nº): bloquear, avisar ou aceitar?** (VOO-02) —
   É aceito. Cada cópia conta mais um pouso e soma de novo horas e km nos contadores e no rateio.
9. **Custo duplicado (mesma NF, ou mesma data, categoria e valor): avisar com confirmação?**
   (CUS-20) — Não há aviso, e o fechamento cobra em dobro.
10. **Troca duplicada: avisar, ou criar um UNIQUE por aeronave e Rel. Voo? E deve existir excluir
    troca?** (TRO-25) — É aceita, e uma troca só se corrige, nunca se remove.
11. **CANAC ou e-mail repetido na mesma aeronave: avisar? A mesma pessoa pode ter dois vínculos? E
    deve existir remover o vínculo criado por engano?** (TRI-13) — É aceito, e o vínculo só se
    inativa.
12. **Proprietário com o mesmo nome de outro: avisar?** (PRO-25) — Não há aviso.
13. **O mesmo arquivo enviado duas vezes: avisar, sufixar "(2)" ou recusar?** (DOC-11) — Cria dois
    documentos.

### Convite e acesso

14. **Ao concluir o convite: abrir a sessão, devolver o e-mail para o login, ou criar um GET do
    convite que cumprimente a pessoa?** (AUT-01) — A tela volta ao login com o e-mail vazio e o
    aviso de entrar com o e-mail do convite.
15. **Avisar das tentativas antes do bloqueio?** (AUT-16) — Não avisa; só depois do bloqueio diz
    o tempo. "Restam N tentativas" revelaria quem tem conta, então a alternativa é um texto fixo.
16. **Pedido de código dentro do intervalo de 1 minuto: 202 silencioso ou 429 com `Retry-After`?**
    (CFG-06) — Responde 202. A tela conta 60 s, mas outra aba pode dizer "enviado" sem ter enviado.
17. **O bloqueio na troca de senha encerra também a sessão corrente?** (CFG-03) — Só bloqueia por
    15 minutos.

### Segurança e decisões técnicas (pedem ADR)

18. **Enviar o código e o convite depois do commit e de forma assíncrona?** (AUT-04) — O envio é
    síncrono: com SMTP real, o 202 de quem tem conta demora mais, e uma falha de envio vira 500.
19. **Migrar o roteador para `createBrowserRouter`, para avisar ao sair pelo menu com o cadastro
    pela metade?** (NAV-28) — Só o Cancelar e o fechamento da aba avisam.

### Configuração financeira e aeronave

20. **A configuração financeira passa a ser versionada por competência, ou continua
    retroativa?** (FIC-17) — É retroativa, e o painel diz "Vale para todos os meses, inclusive os
    já fechados".
21. **O valor do aporte FIXO é o total do fundo por período ou o valor por proprietário?** — Não
    entra em nenhum cálculo; só é exibido.
22. **Guardar a quantidade de motores e mostrar na edição só os que existem? Recusar o motor N
    sem o N−1 também na edição?** (FIC-24) — A edição mostra os quatro campos, com apoio; o
    cadastro já recusa o motor 3 sem o 2.
23. **Limpar com uma migration os textos vazios antigos (fabricante, nº de série, hangar,
    apólice)?** — A normalização vale só para gravações novas.
24. **Alertar quando saldo × taxa se afasta do rendimento creditado? Com que tolerância?**
    (APO-19) — A conta aparece só no apoio.
25. **Conferir o Rel. Voo do custo contra os voos da aeronave, ou oferecê-los numa lista?**
    (CUS-12) — É texto livre, normalizado.

### Contratos e proprietários

26. **No painel de saída, os sócios atuais também podem ser retirados?** (CON-07) — Só sai quem
    foi incluído pelo painel.
27. **Uma aeronave pode ficar sem contrato quando o dono único sai e não há outro proprietário
    ativo?** (CON-21) — Não pode. O painel orienta a cadastrar ou reativar alguém antes.

### Manutenção e trocas

28. **Manutenção concluída pode ser excluída, ou só reaberta?** (MAN-15) — Pode, com uma
    confirmação que sugere reabrir.
29. **Concluir deve pedir também o valor e o responsável efetivos?** (MAN-12) — Pede só a data.
30. **A data limite do parâmetro vai só até hoje + 10 anos?** (MAN-26) — Vai. Inspeções de 12
    anos ficam de fora.
31. **Reabrir a manutenção deve pedir confirmação, como nas trocas?** — Um clique descarta a data
    de conclusão.
32. **Corrigir uma troca já concluída continua permitido?** (TRO-09) — Continua, com a data da
    troca limitada à da devolução.
33. **A data da devolução deve ser editável no painel de correção?** (TRO-V02) — Corrige-se
    reabrindo e concluindo de novo.

### Filtros

34. **Trocas deve ganhar filtro por aeronave na tela?** (DOC-21) — O servidor já aceita
    `?aeronave=`; a tela filtra só por proprietário.

## 8. Limitações

- **O teste foi por código, API e testes automatizados.** Não houve passada visual no navegador
  depois das correções, então o layout dos painéis novos (conclusão, confirmações, passo "Crie sua
  senha") não foi conferido na tela.
- **O download no Safari e no Firefox não foi conferido** (documentos e CSV de custos, no macOS e
  no iOS). O download mudou para `fetch` e `Blob`, com a revogação do endereço adiada.
- **A situação dos achados DSY foi lida do código**, porque o grupo não tem relato final.
- **O relato do VOO depois do ajuste não está em `finais.json`.** A contagem considera o ajuste:
  VOO-02 virou decisão pendente, e o VOO-V03 foi corrigido também no front, onde os totais do
  filtro por voo somam só o realizado.
- **As notas de observabilidade que pediam o registro das chaves de decisão novas não foram
  atendidas**, porque `docs/observabilidade.md` não mantém um catálogo de chaves.
