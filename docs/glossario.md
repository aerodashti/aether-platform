# Glossário

> **Quando ler este arquivo:** antes de nomear qualquer classe, campo, tabela, rota ou texto de
> interface. Este arquivo define a **forma canônica** de cada termo. Termo que não está aqui e
> aparece no código precisa ser adicionado aqui na mesma sessão.

## Como usar

- A coluna **Identificador** é o que vai no código, sem acento e sem cedilha.
- A coluna **Texto na interface** é o que a pessoa lê, com acentuação normal.
- A coluna **Nunca use** lista sinônimos que já foram tentados e estão proibidos, para o vocabulário
  não se fragmentar.

## Domínio

| Termo | Identificador | Texto na interface | Nunca use | Significado |
| --- | --- | --- | --- | --- |
| Aeronave | `aeronave` | Aeronave | `aviao`, `jato`, `aircraft` | Jato ou helicóptero sob gestão do proprietário. Cobre os dois tipos. |
| Proprietário | `proprietario` | Proprietário | `dono`, `owner`, `cliente` | Pessoa física ou jurídica titular da aeronave no RAB. |
| Contrato de participação | `contratoDeParticipacao` | Contrato de participação | `sociedade`, `cotas`, `shares` | A foto de quem é dono de quanto de uma aeronave, de um instante até o próximo contrato. Não se edita — se arquiva: alterar cria um novo e encerra o vigente (ADR-0016). |
| Participação | `participacao` | Participação | `cota`, `fatia`, `share` | A fração de um proprietário num contrato: **% de propriedade**, duas casas, soma do contrato fechando em 100. Distinta do % do rateio, que é derivado por competência. |
| Vínculo vigente | `vinculoVigente` | Vínculo | `link`, `ownership` | Um proprietário numa aeronave pelo contrato **em vigor**: matrícula, modelo, percentual e o `contratoId` do contrato de onde vem. É a linha do cartão de proprietário; sai de `GET /participacoes/vigentes`. A saída de proprietário devolve esse id como `contratoVigenteId`. |
| Contrato desatualizado | `ContratoDesatualizadoException` | Contrato desatualizado | `conflito`, `versaoAntiga` | A recusa (409) de um pedido montado sobre um contrato que já não é o vigente. O pedido diz de qual contrato partiu (`contratoVigenteId`, nulo quando não havia vigente); se outro entrou em vigor, ou se as aeronaves de quem sai mudaram, nada é arquivado e a tela recomeça do contrato atual (ADR-0025). |
| Ficha técnica | `fichaTecnica` | Ficha técnica | `specs`, `dadosTecnicos` | Identificação e totais da aeronave no detalhe: fabricante, nº de série, hangar, contadores e seguro. |
| Contadores da aeronave | `contadores` | — | `totalizadores`, `medidores` | Totais acumulados: horas de célula, ciclos (pousos), km voados, horas por motor e APU. No cadastro se declaram célula, ciclos, km e as horas de cada motor que a aeronave tem, em sequência a partir do motor 1 (0 se novo); o motor 3 sem o 2 é recusado. Depois, célula, ciclos e km são alimentados pelo diário (só o **trecho realizado**). A correção manual é de administrador, substitui o que os voos somaram e é recusada com 409 se os totais mudaram desde a leitura (**Totais lidos**). Motor 2 e APU nulos significam "não tem", não zero. |
| Totais lidos | `lidos` | — | `anteriores`, `versao` | Os contadores que a tela mostrava ao abrir a correção (`ContadoresRequest.lidos`). Se diferem dos atuais — um voo lançado no meio —, a correção é recusada com 409 "Contadores desatualizados". Ignorados no cadastro (ADR-0025). |
| Base do rateio | `baseDoRateio` | Base do rateio | `criterio`, `metodo` | Como o custo se divide: `POR_USO` (horas/km voados) ou `POR_PROPRIEDADE` (% do contrato). |
| Aporte | `aporte` | Aporte | `contribuicao`, `deposito` | Entrada de dinheiro do proprietário no fundo da aeronave, registrada **só depois de recebida** e só por quem participa ou participou da aeronave. A data do crédito vai de 01/01/2000 até hoje, no fuso do negócio. O modelo de cobrança é `FIXO` ou `PROPORCIONAL_AO_USO`, com periodicidade em meses (1, 2, 3, 4, 6 ou 12). No `FIXO`, o valor de cada aporte (`valorDoAporte`) é o cobrado por período e precisa ser maior que zero; no `PROPORCIONAL_AO_USO` ele não existe: a tela o esconde e o servidor descarta o que vier. |
| Fundo | `fundo` | Fundo da aeronave | `caixa`, `conta`, `reserva` | O dinheiro de uma aeronave: parte do saldo de abertura, entra por aportes e rendimentos, sai pelos custos. O saldo por proprietário é do fechamento, porque depende do rateio. |
| Saldo de abertura | `saldoDeAbertura` | Saldo atual do fundo (R$), no cadastro · Saldo do fundo no cadastro (R$), na edição | `saldoInicial`, `saldoAnterior` (é outra coisa) | O dinheiro que o fundo já tinha quando a aeronave chegou ao Aether. Pode ser negativo, quando os proprietários devem — as duas telas dizem isso. Na edição, "atual" seria falso depois do primeiro mês. É o ponto de partida do fechamento, distribuído pela participação do primeiro contrato. |
| Fechamento | `fechamento` | Fechamento | `apuracao` (como tela), `closing` | O rateio de uma competência: quanto de cada custo coube a cada proprietário e o saldo dele no fundo. Calculado a cada leitura, nunca gravado (ADR-0019). |
| Rateio | `rateio` | Rateio | `divisao`, `split`, `alocacao` | A divisão de um custo entre os proprietários. Atribuído → inteiro para ele; fixo → pelo % do contrato vigente na data; variável → pelas horas do voo vinculado, senão pelas horas do mês (base por uso), senão pelo %. Rendimento → pelo % vigente na data do crédito; saldo de abertura → pelo % do primeiro contrato. |
| Cobertura do fundo | `coberturaEmMeses` | Cobertura | `runway`, `folego`, `autonomia` | Quantos meses o saldo do fundo paga sem aporte novo: saldo ÷ média do custo das três competências anteriores (a corrente está aberta e subestimaria). Sem custo nesse período é indefinida (—); saldo zero ou negativo é cobertura zero, "fundo descoberto". Na Visão geral: abaixo de 1 mês crítico, até 3 atenção, 6 meses enchem a barra. |
| Saldo acumulado | `saldoAcumulado` | Saldo acum. | `saldo` (sozinho, quando ambíguo), `balance` | A conta de um proprietário no fundo de uma aeronave: saldo anterior + aportes + rendimentos − o que lhe coube pagar. Positivo é crédito; negativo, valor a aportar. A soma das contas é o saldo do fundo. |
| % no rateio | `percentualNoRateio` | % no rateio | `percentualDeCusto` | A fatia dos custos de uma competência que coube a um proprietário. Distinto do **% de propriedade**: com base por uso, quem voou mais paga mais. Sem custo no mês, não existe (—). |
| Troca de KM | `trocaDeKm` | Troca de KM | `permuta`, `emprestimo`, `swap` | Horas que um proprietário cede a outro na mesma aeronave, a devolver. **É controle entre eles, não lançamento**: o rateio do fechamento não muda — o custo continua com quem voou (decisão de produto, 2026-10-06). `PENDENTE` até a devolução; `CONCLUIDA` quando ela é registrada, com a **Data da devolução**. Reabrir descarta essa data e pede confirmação. A data da troca vai de 01/01/2000 até hoje, e as horas até 1.000 por troca. O R$/hora é o valor combinado para acerto em dinheiro, se houver. |
| Cedente | `cedenteId` | Cedeu | `doador`, `origem` | Quem cedeu as horas na troca: tem a receber de volta. |
| Recebedor | `recebedorId` | Recebeu | `beneficiario`, `destino` | Quem recebeu as horas na troca: tem a devolver. |
| Horas a devolver | `horasADevolver` | Saldo de horas a devolver | `saldoDeTroca`, `debitoDeHoras` | A soma das trocas pendentes de um proprietário: + o que ele recebeu, − o que cedeu. Zero é "quite". |
| Data da devolução | `concluidaEm` (na troca) | Data da devolução | `dataDeConclusao`, `devolvidaEm` | Dia em que as horas voltaram para quem cedeu, informado ao concluir a troca: padrão hoje, nunca antes da data da troca nem no futuro. Nula enquanto a troca está pendente. Na correção de uma concluída, a data da troca não pode passar dela. |
| Rendimento | `rendimento` | Rendimento | `juros`, `receita`, `yield` | O que a aplicação do saldo do fundo rendeu num crédito. Não tem proprietário: é rateado pela participação vigente na data do crédito. Sem contrato vigente nessa data, entra no fundo sem rateio (decisão pendente). O valor é o creditado pelo banco; saldo aplicado e taxa são só o extrato, opcionais, com a taxa até 10% ao mês e 4 casas. |
| Competência | `competencia` | Competência | `mesDeReferencia`, `periodo` (para um mês só) | O mês a que um registro se refere, `AAAA-MM`, de 01/2000 até a competência corrente + 12 meses (**Janela de competências**). No aporte, é independente da data do crédito — o de setembro cai em outubro, e a tela propõe o mês anterior ao do crédito; no rendimento e no custo, é o mês da data. |
| Janela de competências | `JanelaDeCompetencias` | — | `faixaDeMeses`, `periodoValido` | As competências que o produto aceita: de 01/2000 até a corrente + 12 meses. Vale na competência do aporte e nos filtros de aportes, rendimentos e fechamento, que recusam o que sai dela com 400 no parâmetro. |
| Dia de fechamento | `diaDeFechamento` | Dia de fechamento da fatura | `dataDeCorte` | Dia do mês em que a fatura da aeronave fecha, de 1 a 28 — fevereiro decide o teto. |
| Peso máximo de decolagem | `pesoMaxDecolagemKg` | Peso máx. de decolagem (kg) | `MTOW` (como identificador), `pesoDecolagem` | O MTOW do certificado, em kg inteiros, até 600.000. Nulo é "não informado" — peso zero não existe. Mesma regra para o `pesoMaxPousoKg` (MLW), que nunca passa do MTOW. |
| Milha náutica | `milhaNautica` | Milha náutica (NM) | `milha` (sozinho), `mile` | Unidade do conversor do cadastro: 1 NM = 1,852 km, por definição. O produto grava sempre km. |
| CANAC | `canac` | CANAC | `codigoAnac` (por extenso), `licenca` | Código ANAC do tripulante: 6 dígitos, gravado só com dígitos. Máscara com ponto, hífen ou espaço é aceita e descartada; letras são recusadas, não viram nulo. Em branco é "não informado". Sigla oficial: não se traduz. |
| CMA | `validadeCma` | CMA | `atestadoMedico`, `medical` | Certificado Médico Aeronáutico. O que se guarda é a validade, aceita de 01/01/2000 até hoje + 5 anos; a já vencida é aceita e entra como vencida. Nula significa "não informada", não vencida. |
| CHT | `validadeCht` | CHT | `habilitacao` (sozinho), `rating` | Certificado de Habilitação Técnica. Mesmas regras do CMA para a validade e para a validade nula. |
| Função do tripulante | `funcaoDoTripulante` | Função | `cargo`, `role`, `checkPilot` | O papel do tripulante numa aeronave: `COMANDANTE`, `COPILOTO`, `INSTRUTOR`, `EXAMINADOR` (o "check pilot" do jargão vira Examinador). Uma função por vínculo. |
| Lançamento de custo | `custo` | Lançamento | `despesa`, `gasto`, `expense` | Uma despesa de uma aeronave, classificada em tipo e categoria, atribuída a um proprietário ou rateada entre todos. O valor gravado é sempre BRL, até 999.999.999.999,99. A data vai de 01/01/2000 até hoje + 31 dias (conta já emitida). A correção mantém a atribuição a um proprietário que ficou inativo; só exige proprietário ativo quando a atribuição muda. |
| Tipo de custo | `tipoDeCusto` | Tipo | `natureza` | `FIXO` acontece com ou sem voo; `VARIAVEL` nasce de voar. É consequência da categoria, nunca escolha independente. |
| Categoria de custo | `categoriaDeCusto` | Categoria | `classe`, `rubrica`, texto livre | Lista fechada do produto (hangaragem, abastecimento…), cada uma amarrada ao seu tipo. Cresce por migration — categoria livre destruiria a análise de composição. |
| Câmbio | `cambio` | Câmbio do dia (R$ por US$ 1) | `cotacao`, `taxa`, `fx` | A cotação usada num lançamento em moeda estrangeira, gravada no ato: maior que 0 e até 100 reais por dólar, com até 4 casas. O BRL derivado nunca muda depois. |
| Cor de identificação | `corDeIdentificacao` | Cor de identificação | `cor` (sozinho), `avatar`, `badge` | Cor com que o proprietário aparece na interface: no ponto ao lado do nome e nos trechos do calendário. Paleta fechada (`PETROLEO`, `AZUL`, `CELESTE`, `VERDE`, `AMBAR`, `CINZA`); cada valor mapeia para um token do design system. |
| Situação do proprietário | `situacaoDoProprietario` | Situação | `status`, `ativo` (como campo) | Se o proprietário participa da operação hoje: `ATIVO` ou `INATIVO`. Desativar preserva o histórico; excluir de verdade não existe neste domínio. |
| Saída de proprietário | `saida` | Desativar proprietário (com redistribuição) | `exclusao`, `remocao`, `transferencia` | Desativar quem está num contrato vigente: um contrato novo por aeronave, sem ele, com o percentual liberado distribuído entre os demais ou para quem entra — e só então a desativação, tudo de uma vez. Sem participação vigente, desativar é direto (decisão de produto, 2026-10-07). |
| CPF/CNPJ | `cpfCnpj` | CPF / CNPJ | `documento` (genérico), `cpf` ou `cnpj` (isolados, quando o campo aceita os dois) | Documento do proprietário, gravado sem pontuação e em maiúsculas: 11 dígitos para CPF; 14 caracteres para CNPJ, que desde julho de 2026 pode ser alfanumérico (IN RFB 2.229/2024: letras só nos 12 primeiros, verificadores numéricos, cada caractere vale o código ASCII − 48 no módulo 11). Os verificadores são conferidos e a sequência repetida é recusada; texto que não é documento é recusado, e só o campo em branco é ausência. Opcional no cadastro, e hoje nenhum contrato o exige (decisão pendente). Só administrador e gestor o recebem em `GET /proprietarios`; os demais papéis recebem nulo, como e-mail e telefone. |
| Operador | `operador` | Operador | `operator` | Quem opera a aeronave, nem sempre o mesmo que o proprietário. |
| Vencimento | `vencimento` | Vencimento | `expiracao`, `validade`, `expiration`, `dueDate` | Data em que um documento, certificado ou inspeção deixa de valer. **Termo central do produto.** |
| Inspeção | `inspecao` | Inspeção | `revisao`, `check` | Evento previsto no **programa de manutenção** da aeronave (inspeção de 100 h, anual). Uma inspeção agendada vira uma **Manutenção** na tela; o termo aqui é o do programa, não o do evento. |
| Manutenção | `manutencao` | Manutenção | `servico`, `intervencao`, `MRO` | Um evento de manutenção de uma aeronave: `PROGRAMADA` (aparece no calendário de voos) ou `CONCLUIDA` (histórico permanente). A programada vai de hoje − 1 ano a hoje + 10 anos; data passada é aceita e nasce atrasada. A concluída tem a **Conclusão da manutenção** e não se corrige (409): o caminho é reabrir, que descarta a data. Reabrir existe para o engano, não para reescrever a história. |
| Conclusão da manutenção | `concluidaEm` (na manutenção) | Data da conclusão · coluna Conclusão | `dataDeExecucao`, `realizadaEm` | O dia em que a manutenção foi feita, informado ao concluir: padrão hoje, nunca no futuro, nunca mais de um ano antes da data programada nem antes de 2000. Nula enquanto programada. O histórico mostra essa data, e "programada para …" quando ela difere. |
| Parâmetro de controle | `parametroDeControle` | Parâmetro | `limite`, `alerta`, `checkItem` | Um limite monitorado por horas de célula, ciclos ou data ("overhaul a 3.000 ciclos"). O que se grava é o limite e a faixa de aviso; quanto falta é derivado dos contadores, nunca gravado. O nome é único por aeronave, sem diferença de maiúsculas (409 em `campos.nome`); o limite em ciclos é inteiro; a data limite vai de 01/01/2000 a hoje + 10 anos. Situações: `REGULAR`, `ATENCAO`, `ESTOURADO`. |
| Faixa de aviso | `aviso` | Faixa de aviso (h/ciclos/dias antes do limite) | `threshold`, `margem` | Quantas horas, ciclos ou dias antes do limite o parâmetro vira atenção. Menor que o limite em horas e ciclos; inteira em ciclos e dias. |
| Licença de tripulante | `licencaDeTripulante` | Licença de tripulante | `licencaPiloto`, `cht`, `license` | Habilitação ANAC do tripulante, com seus próprios vencimentos. |
| Tripulante | `tripulante` | Tripulante | `piloto`, `crew` | Piloto ou comissário associado à operação. As horas totais de voo vão até 60.000 h, com 1 casa decimal. |
| Voo | `voo` | Voo | `flight` | O conjunto de trechos com o mesmo relatório de voo — todas as pernas voadas enquanto a aeronave esteve com o proprietário. A perna individual é o **Trecho**. |
| Trecho | `trecho` | Trecho | `perna`, `leg`, `etapa` | Uma perna voada ou a voar: origem → destino (iguais num voo local), com data, km e horários. Só o **trecho realizado** conta um pouso e alimenta os contadores da aeronave; planejado ou realizado, ele entra no % de uso do rateio. A distância ("Distância (km)") vai até 9.999.999,9 km, e cada par de horários dura no máximo 24 h (ADR-0021). |
| Trecho realizado | `estaRealizado` | — ("Horários realizados" no painel) | `concluido`, `voado` | Trecho com o par de horários realizados completo — o par vem completo ou vazio. **Só ele soma nos contadores da aeronave** (horas, ciclos, km) e nos "TOTAIS REALIZADOS" do diário — o planejado não gastou nada (decisão de produto, 2026-10-07). No rateio, o trecho ainda sem realizado pesa pelo previsto. A data vai de 01/01/2000 até hoje, e nenhum horário realizado fica depois de agora + 15 min. Os horários são instantes em UTC, mostrados no fuso de quem olha (ADR-0021). |
| Trecho planejado | — (o trecho sem `estaRealizado`) | — ("Horários previstos" no painel) | `futuro`, `agendado` | Trecho sem o par realizado. Não soma nos contadores. A data vai de hoje − 1 ano a hoje + 10 anos; data passada é aceita, com o aviso de que, sem os horários realizados, o trecho não soma. Na correção, a janela só é conferida quando a data muda. |
| Par de horários | `ParDeHorarios` | — | `intervalo`, `janela` | Partida e pouso de um mesmo par, previsto ou realizado. As regras de coerência valem para os dois: completo ou vazio, pouso depois da partida (na mesma hora é recusado), no máximo 24 h, partida a até 1 dia da data do trecho (ADR-0021). |
| Relatório de voo | `relatorioDeVoo` | Rel. Voo | `numeroDoVoo`, `flightReport` | Identificador que agrupa os trechos de um voo (`RV-2026-041`). Livre — cada operador numera do seu jeito —, mas gravado sem espaços nas pontas e em maiúsculas, no trecho, no custo e na troca, para as duas pontas do vínculo se acharem. **Sempre em monoespaçada na interface**, como a matrícula. O mesmo nº de trecho no mesmo Rel. Voo é aceito duas vezes (decisão pendente). |
| Atribuição | `proprietarioId` (no trecho) | Atribuição | `dono do voo`, `usuario` | Quem usou a aeronave no trecho. Nula é voo de manutenção, que o rateio divide entre todos os proprietários. |
| Base | `base` | Base | `hangar`, `home base` | Aeródromo onde a aeronave fica normalmente, em código ICAO de quatro letras (`SBSP`). |
| Matrícula | `matricula` | Matrícula | `prefixo`, `registration`, `tailNumber` | Identidade da aeronave no RAB (`PS-MEP`). Sempre em maiúsculas e **sempre em monoespaçada na interface**. |
| Situação regular | `situacaoRegular` | Situação | **`status`** | Conformidade regulatória agora: `REGULAR` ("Saudável"), `ATENCAO` ("Atenção"), `VENCIDO` ("Vencido"). Derivada dos vencimentos de CVA e RETA **e das pendências operacionais** — o elo mais fraco —, nunca gravada (decisão de produto, 2026-10-07). O protótipo escreve "Status" no cabeçalho da coluna; aqui é **Situação**. |
| Documento da aeronave | `documentoDaAeronave` | — | `doc`, `certificado` (genérico) | Documento com vencimento próprio: hoje `CVA` e `RETA`. São os dois que decidem se a aeronave voa. O vencimento é aceito de 01/01/2000 até hoje + 13 meses no CVA (12 de validade + 1 de tolerância) e até hoje + 5 anos na apólice; já vencido é aceito, e a aeronave entra como Vencido. |
| Documento | `documento` | Documento | `anexo`, `arquivo` (como entidade), `doc` | Arquivo anexado a uma aeronave — contrato, apólice, CVA digitalizado, laudo. O banco guarda nome, tipo, tamanho e quem enviou; o conteúdo fica no armazenamento, sob uma chave UUID (ADR-0020). Até 10 por envio; nome sem parte-base é recusado. **Não confundir com Documento da aeronave** (linha acima), o tipo regulatório com vencimento. Remover apaga de verdade. |
| Assinatura do conteúdo | `AssinaturaDoConteudo` | — | `magicNumber`, `cabecalho` | Os bytes iniciais que confirmam o formato de um documento enviado: a extensão diz o tipo, a assinatura confere que o conteúdo é mesmo dele. |
| Aviso | `aviso` | Aviso | `alerta` (como entidade), `notificacao`, `alert` | Algo na frota que pede ação: CVA ou RETA vencido ou na antecedência, parâmetro de manutenção perto do limite ou estourado, manutenção programada atrasada, CMA ou CHT de tripulante ativo, fundo com saldo negativo. **Derivado a cada leitura, nunca gravado**; some quando a causa some. A chave inclui o prazo, então renovar gera aviso novo. |
| Gravidade do aviso | `gravidadeDoAviso` | Vencido · Próximo | `severidade`, `nivel`, `prioridade` | `VENCIDO` já passou do prazo ou do limite; `PROXIMO` está na janela de aviso. |
| Aviso lido | `avisoLido` | Lido | `visto`, `arquivado` | A marca de que um usuário leu um aviso. É de cada um: o que um lê, o outro não. É a única coisa da Central que se grava. |
| Pendência operacional | `pendenciaOperacional` | — (a frase dela aparece ao lado da situação) | `alerta`, `problema`, `issue` | O que, além dos documentos, pesa na situação da aeronave. Manutenção: parâmetro estourado ou manutenção programada atrasada deixa **Vencido** e impede o voo; parâmetro na faixa de aviso deixa em **Atenção**. Tripulação: CMA ou CHT vencido de tripulante ativo deixa em **Atenção**, sem impedir o voo — quem não voa é o tripulante. Derivada a cada leitura, pelas mesmas regras da Central de avisos. |
| Próximo vencimento | `proximoVencimento` | Próximo vencimento | `validade`, `dueDate` | O documento que vence primeiro. Conformidade é elo mais fraco, não média. |
| Janela de atenção | `diasDeAtencao` | — | `threshold`, `alerta` | A partir de quantos dias para o vencimento a aeronave entra em atenção. Política por inquilino, não norma da ANAC. |
| Poder voar | `podeVoar` | — | `ativa`, `disponivel` | Nenhum documento vencido e nenhuma pendência operacional impeditiva. É a pergunta que a conformidade responde. |
| Empresa | `empresa` | Empresa | `conta`, `tenant`, `inquilino`, `organizacao` | A empresa dona desta instalação. **Sempre uma linha**, garantida por CHECK. Não é inquilino: isolar dados por empresa é outra decisão, ainda não tomada. |
| CNPJ | `cnpj` | CNPJ | `documento`, `cgc` | Só dígitos no banco; a máscara é da interface. **Imutável**: é o documento do contrato, e trocá-lo é trocar de empresa. |
| Antecedência do aviso | `diasDeAviso` | Alertas de vencimento | `threshold`, `alerta`, `prazo` | Com quantos dias antes de um vencimento a aeronave entra em atenção. Governa a coluna Situação da tela de Aeronaves. |
| Preferência de tema | `preferenciaDeTema` | Aparência | `darkMode`, `skin` | `claro`, `escuro` ou `sistema`. Vive no navegador, não na conta: é preferência de quem olha a tela. |

## Termos regulatórios

Siglas oficiais permanecem em maiúsculas e **não são traduzidas**. Em identificador composto,
viram parte do nome em camelCase: `vencimentoCva`, `apoliceReta`.

| Sigla | Identificador | Texto na interface | Significado |
| --- | --- | --- | --- |
| ANAC | `anac` | ANAC | Agência Nacional de Aviação Civil. |
| RAB | `rab` | RAB | Registro Aeronáutico Brasileiro: matrícula e propriedade da aeronave. |
| CVA | `cva` | CVA | Certificado de Verificação de Aeronavegabilidade. Tem vencimento. |
| RETA | `reta` | RETA | Seguro obrigatório de Responsabilidade do Explorador ou Transportador Aéreo. Tem vencimento. |
| CA | `certificadoDeAeronavegabilidade` | Certificado de Aeronavegabilidade | Certificado emitido pela ANAC. Não abreviar no código: `ca` é ambíguo. |
| RBAC 91 | `rbac91` | RBAC 91 | Regra de operação de aeronaves civis (aviação geral). |
| RBAC 43 | `rbac43` | RBAC 43 | Regra de manutenção. |
| RBAC 145 | `rbac145` | RBAC 145 | Regra de organização de manutenção homologada. |
| DECEA | `decea` | DECEA | Departamento de Controle do Espaço Aéreo: plano de voo e espaço aéreo. |

## Acesso

| Termo | Identificador | Texto na interface | Nunca use | Significado |
| --- | --- | --- | --- | --- |
| Usuário | `usuario` | Usuário | `user`, `conta`, `login` (como substantivo) | Pessoa com acesso ao Aether. Distinto de **Proprietário**: nem todo usuário é titular de aeronave, e nem todo proprietário tem acesso. |
| Autenticação | `autenticacao` | — | `auth`, `signin` | Provar quem é. A feature que cobre a área não logada inteira. |
| Entrar | `entrar` | Entrar | `login`, `signin`, `acessar` | Ato de abrir sessão. O verbo na interface é "Entrar"; o oposto é "Sair". |
| Sessão de acesso | `sessaoDeAcesso` | — | `token`, `session` | Período em que um usuário está autenticado. Uma linha em `sessao_de_acesso`; o cookie carrega o token dela. |
| Senha | `senha` | Senha | `password`, `pwd` | Segredo escolhido **pelo próprio usuário**. Administrador nunca define senha de ninguém. Toda senha nova (convite, redefinição, troca) tem de 8 caracteres a 72 bytes em UTF-8 (`@SenhaNova`) e não pode repetir a atual; redefinir ou trocar encerra as outras sessões do usuário (ADR-0024). |
| Código de recuperação | `codigoDeRecuperacao` | Código | `otp`, `pin`, `token` | Seis dígitos enviados por e-mail para redefinir a senha, e a segunda prova da troca de senha. Vale uma vez, por dez minutos e até cinco palpites; só o último emitido vale, e um novo só sai depois de um minuto. Espaços nas pontas são ignorados. Morre se o usuário for desativado: o revogado deixa de valer, mas não conta como usado. |
| Situação do usuário | `situacaoDoUsuario` | Situação | `status` | `ATIVO` (entra), `PENDENTE` (convidado, ainda não criou senha), `INATIVO` (acesso revogado). Desativar cancela o convite pendente e o código de recuperação em aberto; reativar quem nunca concluiu o convite devolve a pessoa a `PENDENTE`, sem link válido. |
| Papel do usuário | `papelDoUsuario` | Papel | `role`, `perfil`, `permissao`, `admin` | O que a pessoa **é** no Aether: `ADMINISTRADOR`, `GESTOR`, `PROPRIETARIO`, `PILOTO`. Um papel por pessoa. Distinto de **Situação**, que diz só se ela pode entrar: alguém pode ser administrador e estar inativo. |
| Administrador | `administrador` | Administrador | `admin`, `superusuario`, `root` | Papel que administra usuários — convida, reenvia convite, desativa e reativa. É o único papel com poder hoje; a tela de Usuários é restrita a ele. |
| Gestor | `gestor` | Gestor | `operador` (é termo de domínio, linha 20), `manager` | Papel de quem opera o dia a dia: registra voos, lançamentos e fechamentos. |
| Piloto | `piloto` | Piloto | `tripulante`, `comandante`, `pilot` | Papel da tripulação: registra voo e consulta a própria escala. |
| Proprietário (papel) | `PROPRIETARIO` | Proprietário | — | Papel de quem entra para ver o que é seu. **Não confundir com o termo de domínio `proprietario`** (linha 19): aquele é o titular no RAB, exista ou não acesso; este é um valor de `papelDoUsuario`. Um titular sem acesso não tem papel nenhum, e alguém com este papel não vira titular por causa dele. |
| Convite | `convite` | Convite | `invite`, `cadastro`, `ativacao` | Link de uso único pelo qual a pessoa convidada cria a **própria** senha. Vale 48 horas; reenviar mata o anterior. Só conclui quem continua `PENDENTE`: o desativado com o link na mão não se reativa. Na tela, o link abre o passo "Crie sua senha" de `/entrar?convite=<token>`. Distinto do **Código de recuperação**, que é de seis dígitos e só vale para quem já está `ATIVO`. |
| Último acesso | `ultimoAcesso` | Último acesso | `lastLogin`, `ultimoLogin` | Instante da última entrada bem-sucedida. Vazio para quem nunca entrou. |

## Termos de plataforma

| Termo | Identificador | Texto na interface | Significado |
| --- | --- | --- | --- |
| Saúde | `saude` | Saúde | Feature de exemplo do bootstrap: situação operacional da própria plataforma. Não é domínio de aviação. |
| Componente | `componente` | Componente | Parte monitorada pela feature de saúde (banco, API). |
| Situação | `situacao` | Situação | Estado atual de algo: `OPERANTE`, `DEGRADADO`, `INDISPONIVEL`. |
| Registro de saúde | `registroDeSaude` | — | Linha da tabela `registro_de_saude`: a situação conhecida de um componente. |
| Verificação | `verificacao` | Verificação | Ato de conferir a situação de um componente e gravar o resultado. |
| Requisição | `requisicao` | Requisição | Identificador de correlação de um request (`X-Request-Id`). |
| Linha canônica | `linhaCanonica` | — | A única linha de log INFO de um request, com todos os campos. |
| Decisão | `decisao` | — | Variável que determina um ramo de execução, registrada antes do desvio. |
| Contexto da requisição | `contexto` | — | Fachada de observabilidade usada pelo código de negócio. |
| Fuso do negócio | `FusoDoNegocio` | — | Fuso das datas civis do servidor: `America/Sao_Paulo`. O relógio da aplicação está nele, e todo "hoje" do servidor é o de Brasília (ADR-0023). |

## Pendente do handoff do Claude Design

O bundle foi lido e a **tela de entrada** teve seus rótulos incorporados na seção "Acesso" acima.
A tela de **Usuários** teve seu vocabulário incorporado na mesma seção, junto com o backend que a
serve. As demais telas do bundle (visão geral, frota, lançamentos, rateio, manutenção, voos, aportes,
fechamento) ainda não: cada uma traz vocabulário próprio — rateio, saldo — que entra aqui quando
a tela for implementada, não antes. Aportes trouxe fundo, rendimento e competência; o Fechamento
trouxe rateio, saldo de abertura, saldo acumulado e % no rateio.
