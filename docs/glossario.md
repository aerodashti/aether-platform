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
| Ficha técnica | `fichaTecnica` | Ficha técnica | `specs`, `dadosTecnicos` | Identificação e totais da aeronave no detalhe: fabricante, nº de série, hangar, contadores e seguro. |
| Contadores da aeronave | `contadores` | — | `totalizadores`, `medidores` | Totais acumulados: horas de célula, ciclos, km voados, horas por motor e APU. Declarados no cadastro e corrigidos só por administrador até o diário de voos alimentá-los. Motor 2 e APU nulos significam "não tem", não zero. |
| Base do rateio | `baseDoRateio` | Base do rateio | `criterio`, `metodo` | Como o custo se divide: `POR_USO` (horas/km voados) ou `POR_PROPRIEDADE` (% do contrato). |
| Aporte | `aporte` | Aporte | `contribuicao`, `deposito` | Entrada de dinheiro do proprietário no fundo da aeronave. O modelo é `FIXO` ou `PROPORCIONAL_AO_USO`, com periodicidade em meses (1, 2, 3, 4, 6 ou 12). |
| Dia de fechamento | `diaDeFechamento` | Dia de fechamento da fatura | `dataDeCorte` | Dia do mês em que a fatura da aeronave fecha, de 1 a 28 — fevereiro decide o teto. |
| Peso máximo de decolagem | `pesoMaxDecolagemKg` | Peso máx. de decolagem (kg) | `MTOW` (como identificador), `pesoDecolagem` | O MTOW do certificado, em kg inteiros. Nulo é "não informado" — peso zero não existe. Mesma regra para o `pesoMaxPousoKg` (MLW). |
| Milha náutica | `milhaNautica` | Milha náutica (NM) | `milha` (sozinho), `mile` | Unidade do conversor do cadastro: 1 NM = 1,852 km, por definição. O produto grava sempre km. |
| CANAC | `canac` | CANAC | `codigoAnac` (por extenso), `licenca` | Código ANAC do tripulante, gravado só com dígitos. Sigla oficial: não se traduz. |
| CMA | `validadeCma` | CMA | `atestadoMedico`, `medical` | Certificado Médico Aeronáutico. O que se guarda é a validade; nula significa "não informada", não vencida. |
| CHT | `validadeCht` | CHT | `habilitacao` (sozinho), `rating` | Certificado de Habilitação Técnica. Mesma regra do CMA para validade nula. |
| Função do tripulante | `funcaoDoTripulante` | Função | `cargo`, `role`, `checkPilot` | O papel do tripulante numa aeronave: `COMANDANTE`, `COPILOTO`, `INSTRUTOR`, `EXAMINADOR` (o "check pilot" do jargão vira Examinador). Uma função por vínculo. |
| Cor de identificação | `corDeIdentificacao` | Cor de identificação | `cor` (sozinho), `avatar`, `badge` | Cor com que o proprietário aparece na interface: no ponto ao lado do nome e nos trechos do calendário. Paleta fechada (`PETROLEO`, `AZUL`, `CELESTE`, `VERDE`, `AMBAR`, `CINZA`); cada valor mapeia para um token do design system. |
| Situação do proprietário | `situacaoDoProprietario` | Situação | `status`, `ativo` (como campo) | Se o proprietário participa da operação hoje: `ATIVO` ou `INATIVO`. Desativar preserva o histórico; excluir de verdade não existe neste domínio. |
| CPF/CNPJ | `cpfCnpj` | CPF / CNPJ | `documento` (genérico), `cpf` ou `cnpj` (isolados, quando o campo aceita os dois) | Documento do proprietário, gravado só com dígitos: 11 para CPF, 14 para CNPJ. Opcional no cadastro; o contrato de participação é que o exige. |
| Operador | `operador` | Operador | `operator` | Quem opera a aeronave, nem sempre o mesmo que o proprietário. |
| Vencimento | `vencimento` | Vencimento | `expiracao`, `validade`, `expiration`, `dueDate` | Data em que um documento, certificado ou inspeção deixa de valer. **Termo central do produto.** |
| Inspeção | `inspecao` | Inspeção | `manutencao`, `revisao`, `check` | Evento de manutenção programada previsto no programa da aeronave. |
| Licença de tripulante | `licencaDeTripulante` | Licença de tripulante | `licencaPiloto`, `cht`, `license` | Habilitação ANAC do tripulante, com seus próprios vencimentos. |
| Tripulante | `tripulante` | Tripulante | `piloto`, `crew` | Piloto ou comissário associado à operação. |
| Voo | `voo` | Voo | `flight` | Trecho operado, base do controle de horas e ciclos. |
| Base | `base` | Base | `hangar`, `home base` | Aeródromo onde a aeronave fica normalmente, em código ICAO de quatro letras (`SBSP`). |
| Matrícula | `matricula` | Matrícula | `prefixo`, `registration`, `tailNumber` | Identidade da aeronave no RAB (`PS-MEP`). Sempre em maiúsculas e **sempre em monoespaçada na interface**. |
| Situação regular | `situacaoRegular` | Situação | **`status`** | Conformidade regulatória agora: `REGULAR` ("Saudável"), `ATENCAO` ("Atenção"), `VENCIDO` ("Vencido"). Derivada dos vencimentos, nunca gravada. O protótipo escreve "Status" no cabeçalho da coluna; aqui é **Situação**. |
| Documento da aeronave | `documentoDaAeronave` | — | `doc`, `certificado` (genérico) | Documento com vencimento próprio: hoje `CVA` e `RETA`. São os dois que decidem se a aeronave voa. |
| Próximo vencimento | `proximoVencimento` | Próximo vencimento | `validade`, `dueDate` | O documento que vence primeiro. Conformidade é elo mais fraco, não média. |
| Janela de atenção | `diasDeAtencao` | — | `threshold`, `alerta` | A partir de quantos dias para o vencimento a aeronave entra em atenção. Política por inquilino, não norma da ANAC. |
| Poder voar | `podeVoar` | — | `ativa`, `disponivel` | Nenhum documento vencido. É a pergunta que a conformidade responde. |
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
| Senha | `senha` | Senha | `password`, `pwd` | Segredo escolhido **pelo próprio usuário**. Administrador nunca define senha de ninguém. |
| Código de recuperação | `codigoDeRecuperacao` | Código | `otp`, `pin`, `token` | Seis dígitos enviados por e-mail para redefinir a senha. Vale uma vez, por dez minutos. |
| Situação do usuário | `situacaoDoUsuario` | Situação | `status` | `ATIVO` (entra), `PENDENTE` (convidado, ainda não criou senha), `INATIVO` (acesso revogado). |
| Papel do usuário | `papelDoUsuario` | Papel | `role`, `perfil`, `permissao`, `admin` | O que a pessoa **é** no Aether: `ADMINISTRADOR`, `GESTOR`, `PROPRIETARIO`, `PILOTO`. Um papel por pessoa. Distinto de **Situação**, que diz só se ela pode entrar: alguém pode ser administrador e estar inativo. |
| Administrador | `administrador` | Administrador | `admin`, `superusuario`, `root` | Papel que administra usuários — convida, reenvia convite, desativa e reativa. É o único papel com poder hoje; a tela de Usuários é restrita a ele. |
| Gestor | `gestor` | Gestor | `operador` (é termo de domínio, linha 20), `manager` | Papel de quem opera o dia a dia: registra voos, lançamentos e fechamentos. |
| Piloto | `piloto` | Piloto | `tripulante`, `comandante`, `pilot` | Papel da tripulação: registra voo e consulta a própria escala. |
| Proprietário (papel) | `PROPRIETARIO` | Proprietário | — | Papel de quem entra para ver o que é seu. **Não confundir com o termo de domínio `proprietario`** (linha 19): aquele é o titular no RAB, exista ou não acesso; este é um valor de `papelDoUsuario`. Um titular sem acesso não tem papel nenhum, e alguém com este papel não vira titular por causa dele. |
| Convite | `convite` | Convite | `invite`, `cadastro`, `ativacao` | Link de uso único pelo qual a pessoa convidada cria a **própria** senha. Vale 48 horas; reenviar mata o anterior. Distinto do **Código de recuperação**, que é de seis dígitos e só vale para quem já está `ATIVO`. |
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

## Pendente do handoff do Claude Design

O bundle foi lido e a **tela de entrada** teve seus rótulos incorporados na seção "Acesso" acima.
A tela de **Usuários** teve seu vocabulário incorporado na mesma seção, junto com o backend que a
serve. As demais telas do bundle (visão geral, frota, lançamentos, rateio, manutenção, voos, aportes,
fechamento) ainda não: cada uma traz vocabulário próprio — competência, rateio, aporte,
saldo, trecho — que entra aqui quando a tela for implementada, não antes.
