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
| Operador | `operador` | Operador | `operator` | Quem opera a aeronave, nem sempre o mesmo que o proprietário. |
| Vencimento | `vencimento` | Vencimento | `expiracao`, `validade`, `expiration`, `dueDate` | Data em que um documento, certificado ou inspeção deixa de valer. **Termo central do produto.** |
| Situação regular | `situacaoRegular` | Situação regular | `status`, `compliance` | Estado de conformidade de um item regulatório em determinado momento. |
| Inspeção | `inspecao` | Inspeção | `manutencao`, `revisao`, `check` | Evento de manutenção programada previsto no programa da aeronave. |
| Licença de tripulante | `licencaDeTripulante` | Licença de tripulante | `licencaPiloto`, `cht`, `license` | Habilitação ANAC do tripulante, com seus próprios vencimentos. |
| Tripulante | `tripulante` | Tripulante | `piloto`, `crew` | Piloto ou comissário associado à operação. |
| Voo | `voo` | Voo | `flight` | Trecho operado, base do controle de horas e ciclos. |
| Base | `base` | Base | `hangar`, `home base` | Aeródromo onde a aeronave fica normalmente. |

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
As demais telas do bundle (visão geral, frota, lançamentos, rateio, manutenção, voos, aportes,
fechamento, usuários) ainda não: cada uma traz vocabulário próprio — competência, rateio, aporte,
saldo, trecho — que entra aqui quando a tela for implementada, não antes.
