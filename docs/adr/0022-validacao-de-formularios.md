# ADR-0022: Validação de formulários em três camadas, com o servidor por último

> **Quando ler este arquivo:** ao criar ou mudar um formulário, ou ao questionar por que o botão de
> salvar não fica desabilitado.

- **Status:** aceito
- **Data:** 2026-10-07

## Contexto

A auditoria de formulários de 2026-10-07 achou o mesmo padrão em quase todos os painéis:

- um `podeSalvar` só desabilitava o botão, sem dizer o que faltava;
- o `campos` do 400 nunca chegava ao campo, e o erro do servidor aparecia numa frase solta junto
  dos botões;
- cada tela tinha o próprio leitor de número (`'1.850,00'` virava `NaN`, que vai como `null` no
  JSON, e o servidor respondia "Informe o valor." a quem tinha digitado um valor);
- só o `CampoDeTexto` sabia mostrar erro ou obrigatório;
- no servidor, faltavam `@Digits`, e um número grande demais virava 500. Uma data ou uma opção
  inválida voltava como "corpo ilegível", sem dizer o campo.

## Decisão

Cada camada tem uma responsabilidade.

1. **Regras puras, por formulário.** Uma função `validar<Formulario>(rascunho)` devolve
   `Erros<Campo>`, montada com as regras pequenas de `compartilhado/formulario/regras.ts`:
   `obrigatorio`, `tamanhoMaximo`, `numero({ maiorQue, maximo, casas })`, `dataEntre`, `email`,
   `senhaNova`, `telefone` e `competencia`. Ela é testada sem renderizar nada, e os limites
   espelham o request do backend. As regras que existem nas duas pontas têm um par no servidor,
   em `comum/validacao` (`FormatoDeEmail`, `FormatoDeTelefone`) ou na feature (`@SenhaNova`):
   `email()` e `FormatoDeEmail` exigem domínio com ponto e sufixo de duas letras ou mais, porque
   "fulano@empresa" não recebe e-mail.
2. **A política de exibição.** `useValidacao` decide quando e onde mostrar:
   - nada aparece antes da primeira tentativa;
   - ao tentar salvar, aparecem todos os erros, o foco vai ao primeiro campo inválido e o resumo
     diz quantos e quais;
   - daí em diante, os erros acompanham a digitação;
   - o erro do servidor cai no campo de mesmo nome e some quando o campo muda.
   
   O botão de salvar **não** fica desabilitado por validação: desabilitado, ele não diz o que
   falta, e com `disabled` nativo sai até do Tab. `Botao` usa `aria-disabled` também no
   `carregando`, para o foco não cair no `<body>`.
3. **O servidor tem a última palavra.**
   - O Bean Validation do request repete os limites, com `@Digits` igual à coluna.
   - `ExcecaoDeDominio` pode nomear o campo da recusa, e o tratador o devolve em `campos`.
   - O corpo que não converte vira `campos` com o caminho do Jackson.
   - Os casos abaixo deixam de ser 500:
     - as recusas do Spring MVC (405, 415, 404) mantêm o próprio status;
     - a violação de integridade vira 409 se é duplicidade e 400 se não é, com um WARN, porque é
       uma validação que faltou.

Para os campos, `MolduraDeCampo` é a única régua de rótulo, asterisco, apoio, erro e
`aria-*`, usada por `CampoDeTexto`, `Selecao`, `AreaDeTexto`, `GrupoDeOpcoes` e `SeletorDeCor`.
Os grupos de rádio ganharam legenda visível e o teclado do `radiogroup` (`useGrupoDeRadio`).

Os números são lidos por um só leitor, `compartilhado/formatacao/numero.ts`:
- a vírgula é decimal;
- o ponto é milhar quando separa grupos de três ("25.000" é vinte e cinco mil);
- nos demais casos, o ponto é decimal ("4.9223");
- notação científica, hexadecimal e texto são recusados.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Biblioteca de formulário (React Hook Form, Formik) e esquema (Zod) | Dependência nova para o que cabe em dois arquivos; Zod está vetado no `CLAUDE.md` |
| Validação só no servidor | Ida e volta para dizer que o campo está vazio; e o servidor não fala a língua da tela ("vírgula para os centavos") |
| Manter o botão desabilitado e listar o que falta ao lado | Continua fora do Tab para quem usa teclado, e o motivo fica longe do campo |
| Erro ao sair de cada campo (`onBlur`) | Acusa o campo que a pessoa só atravessou com o Tab; a tentativa de salvar é o momento em que ela pediu o veredito |

## Consequências

- Formulário novo segue a receita: rascunho em estado, `validar…` pura com teste, `useValidacao`, `Formulario` (Enter envia),
  `erro={validacao.erroDe(...)}` em cada campo, `ResumoDoFormulario` junto dos botões e
  `validacao.enviar(salvar)` no clique.
- O nome do campo no formulário deve ser o do JSON do request. Quando não for, `campoDoServidor`
  traduz.
- Um limite muda em dois lugares, a regra do front e o request do back, e a coluna o confirma.

### Padrões que a adoção trouxe (2026-10-07)

A correção dos formulários aplicou a receita em todos os painéis e deixou estes padrões:

- **A corrida contra a UNIQUE.** O serviço confere a duplicidade, mas dois pedidos simultâneos
  passam pela conferência. Ele salva com `saveAndFlush`, reconhece a restrição pelo nome
  (`ConstraintViolationException.getConstraintName`) e a traduz na mesma exceção de domínio, com o
  campo. O tratador global continua como rede de segurança.
- **Recusa que depende de algoritmo vira constraint da feature.** O dígito verificador do CPF/CNPJ
  é `@CpfCnpjValido` (`ValidadorDeCpfCnpj`): sai no mesmo 400 dos outros campos, e o serviço
  continua conferindo como invariante.
- **Listas dinâmicas usam o nome indexado do JSON** (`participacoes[1].percentual`), e o valor da
  linha leva o id do proprietário, para o erro do servidor achar a linha certa.
- **Número que aceita negativo usa `inputMode="text"`** (o saldo de abertura): o teclado decimal do
  iOS não tem o sinal de menos. É a exceção à regra de teclado decimal para número com casas.
- **Filtros não usam `useValidacao`**: o erro aparece já na mudança e a consulta não sai. A política
  está no ADR-0018.
- **Um limite, dois arquivos.** Cada request tem o seu espelho no front, por exemplo
  `TrocaRequest.java` ↔ `features/trocas/componentes/validacaoDaTroca.ts`, e a migration confirma.

Lacunas conhecidas da base:

- `dataEntre` compara datas como texto e aceita ano de cinco dígitos ("20266-10-07" cai dentro de
  2025–2036). A manutenção contorna com uma regra local (`anoDeQuatroDigitos`).
- O `CampoDeTexto` diz "Data incompleta" (`validity.badInput`), mas o `useValidacao` não sabe
  disso e não segura o envio. O painel de tripulante contorna lendo `badInput` pelas refs; um
  retorno como `aoMudarCompletude` no primitivo resolveria para todos.
- O `CampoDeTexto` não tem modo somente leitura; o passo de nova senha contorna com uma ref.
- O `maxLength` do `CampoDeTexto` corta o texto colado sem avisar. Os painéis da ficha técnica e da
  configuração financeira o trocaram pela regra `tamanhoMaximo`, que diz o limite; os do trecho,
  da manutenção, da troca e do rendimento ainda usam o corte nativo. A `AreaDeTexto` mostra a
  contagem e pode mantê-lo.

## Quando revisitar

Quando houver formulários com dezenas de campos ou com campos repetidos dinâmicos o bastante para o
`useState` por campo pesar. Aí um estado de formulário único, ainda sem biblioteca, é o próximo
passo.
