# ADR-0014: Envio do código de recuperação por porta, com fallback de log

> **Quando ler este arquivo:** ao configurar e-mail em qualquer ambiente, ou ao trocar de provedor.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

O fluxo de "esqueci minha senha" depende de um código de seis dígitos chegar por e-mail. Isso cria
dois problemas de naturezas diferentes.

O primeiro é de **desenvolvimento**: exigir um servidor SMTP para rodar o projeto localmente
quebraria a promessa do `./scripts/ambiente.sh up` — um comando e o produto está de pé. Ninguém vai
configurar credenciais de e-mail para conferir o alinhamento de um campo.

O segundo é de **teste**: o serviço de recuperação precisa ser testável sem rede, e o teste de
integração precisa saber qual código foi sorteado para poder usá-lo no passo seguinte.

## Decisão

**O envio é uma porta — a interface `EnviadorDeCodigoDeRecuperacao` — com duas implementações
escolhidas por configuração.**

`EnviadorPorEmail` usa o `JavaMailSender` do Spring e entra quando `spring.mail.host` está
definido. `EnviadorParaLog` entra quando não está, e escreve o código no log em **WARN**, com uma
mensagem que diz textualmente que aquilo é um recurso de desenvolvimento.

O nível é WARN, e não INFO, por dois motivos que apontam para o mesmo lugar: no código de negócio
INFO não existe (`docs/observabilidade.md` — a linha canônica é a única linha de sucesso), e
imprimir um código de acesso é exatamente o tipo de coisa que alguém precisa **notar** caso escape
para produção.

O código em si nunca aparece na linha canônica: `codigo`, `senha`, `novaSenha` e `email` estão em
`campos-sensiveis.yml` e saem como `***`, pela política do ADR-0010.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Chamar o `JavaMailSender` direto do serviço | Amarra a regra ao transporte. O teste do serviço passaria a exigir servidor de e-mail ou mock de framework, e trocar SMTP por um provedor de API mexeria na regra de negócio. |
| Cliente HTTP de um provedor (Resend, SendGrid, SES) | Dependência nova e credencial obrigatória para uma feature que ainda manda uma mensagem só. O SMTP do Spring já está no ecossistema e qualquer um desses provedores fala SMTP. Quando o volume justificar API, é uma implementação nova da mesma porta. |
| Servidor SMTP falso no Docker Compose (MailHog, Mailpit) | Resolve o dev, mas às custas de mais um contêiner obrigatório e de uma interface a mais para abrir. O log já está aberto na frente de quem desenvolve. |
| Devolver o código na resposta HTTP em dev | Um `if (desenvolvimento)` num caminho de credencial é exatamente o tipo de código que sobrevive até produção. |

## Consequências

- `./scripts/ambiente.sh up` entrega o fluxo completo de recuperação funcionando, sem credencial.
- O teste do serviço usa um mock da porta; o de integração captura o código pelo mesmo mock e o usa
  no passo seguinte, exercitando o fluxo inteiro de ponta a ponta.
- Produção exige apenas `spring.mail.*` e `aether.autenticacao.remetente` no ambiente. Nenhuma
  mudança de código.
- **O custo aceito:** em um ambiente compartilhado sem SMTP configurado, quem lê o log vê códigos de
  recuperação. A mitigação é a própria mensagem de WARN dizer isso em voz alta, e o `application-prod.yml`
  não ser onde essa configuração falta.
- A mensagem é texto puro. Quando o produto quiser e-mail com identidade visual, isso é uma troca
  dentro de `EnviadorPorEmail`, sem tocar em regra.

## Quando revisitar

Quando houver um segundo e-mail transacional. Duas mensagens ainda cabem aqui; a partir da terceira,
o assunto deixa de ser "o código de recuperação" e passa a ser "os e-mails do Aether" — aí vale um
pacote próprio, com template e uma porta mais geral do que esta.
