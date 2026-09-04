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

## Termos de plataforma

| Termo | Identificador | Texto na interface | Significado |
| --- | --- | --- | --- |
| Saúde | `saude` | Saúde | Feature de exemplo do bootstrap: situação operacional da própria plataforma. Não é domínio de aviação. |
| Componente | `componente` | Componente | Parte monitorada pela feature de saúde (banco, API). |
| Situação | `situacao` | Situação | Estado atual de algo: `OPERANTE`, `DEGRADADO`, `INDISPONIVEL`. |
| Requisição | `requisicao` | Requisição | Identificador de correlação de um request (`X-Request-Id`). |

## Pendente do handoff do Claude Design

A tela **"Posso voar hoje"** ainda não teve seus rótulos incorporados: o bundle do Claude Design não
pôde ser lido na sessão de bootstrap. Ao rodar `/tela-do-design` pela primeira vez, cada rótulo do
bundle deve ser conferido contra esta tabela e adicionado se for termo novo — em especial o próprio
nome da tela e os rótulos de situação que ela usa.
