# ADR-0024: Senha até 72 bytes, recusas de acesso em tempo constante e sessões encerradas

> **Quando ler este arquivo:** ao mexer em qualquer fluxo que cria, confere ou troca senha, ou ao
> questionar por que a recusa de quem não tem conta gasta um BCrypt.

- **Status:** aceito
- **Data:** 2026-10-07

## Contexto

A auditoria de formulários de 2026-10-07 achou três problemas nos fluxos de acesso (AUT-03,
AUT-04, CFG-02, CFG-03):

- **O limite da senha contava caracteres, e o BCrypt conta bytes.** O BCrypt 6.5 lança exceção
  acima de 72 bytes, e o `@Size(max = 72)` deixava passar 40 letras "ç" (80 bytes). O resultado
  era 500 na redefinição, no convite e na troca de senha. No login, o 500 aparecia só para
  e-mail desconhecido, que codificava a senha digitada para gastar tempo, e assim entregava quem
  tinha conta.
- **O tempo de resposta entregava a conta.** Conta inativa ou pendente era recusada antes de
  qualquer hash (cerca de 3 ms), contra cerca de 250 ms de quem conferia uma senha.
- **A senha atual na troca não tinha limite de tentativas** e respondia com precisão: quem
  encontrasse a estação destravada podia descobri-la. E trocar ou redefinir a senha deixava
  abertas as outras sessões, inclusive a de um invasor.

Os grupos de acesso e de configurações escreveram em paralelo regras parecidas, que a integração
juntou numa só.

## Decisão

1. **Toda senha escolhida passa pela `@SenhaNova`**: de 8 caracteres a 72 bytes em UTF-8, com a
   mensagem dizendo o limite. Vale em `RedefinirSenhaRequest`, `ConcluirConviteRequest` e
   `TrocarSenhaRequest`. O login limita a senha a 72 caracteres antes de procurar o e-mail. A
   tela repete a regra em `senhaNova()` (`compartilhado/formulario/regras.ts`), medindo bytes com
   `TextEncoder`.
2. **Toda recusa de entrada que não confere senha, e todo pedido de código que não gera código,
   gasta uma conferência BCrypt** contra um hash de referência calculado na partida
   (`CofreDeSegredos.gastarTempoDeConferencia`). O segredo conferido é fixo, nunca o digitado.
3. **A senha atual, na troca, conta tentativas na mesma contagem da entrada.** Errar ali também
   bloqueia a conta, e a conta bloqueada não troca a senha. O bloqueio diz quanto falta ("Tente de
   novo em 15 minutos."), lido da política (`Usuario.minutosAteODesbloqueio`). As contagens
   sobrevivem à recusa (`noRollbackFor`).
4. **A senha nova não repete a atual** (400 em `campos.novaSenha`, `SenhaRepetidaException`, na
   redefinição e na troca).
5. **Redefinir a senha encerra todas as sessões do usuário; trocá-la encerra as outras** e poupa
   a de quem trocou (`SessaoDeAcesso.possuiToken`).

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Pré-hash da senha (SHA-256 antes do BCrypt) para aceitar qualquer tamanho | Muda o formato de todos os hashes gravados e pede migração na próxima entrada de cada um; 72 bytes bastam para uma senha |
| `@Size` em caracteres com teto menor (36) | Recusaria senhas longas de ASCII sem motivo, e ainda dependeria de quantos bytes cada caractere tem |
| Atraso fixo (`sleep`) nas recusas | Não acompanha o custo real do BCrypt, que muda com o hardware e com o fator de custo |
| Contagem de tentativas própria da troca de senha | Duas contagens permitiriam o dobro de palpites antes do bloqueio |
| Encerrar também a sessão de quem trocou a senha | Obriga a entrar de novo logo depois de uma ação que só quem está dentro faz; o risco é a sessão dos outros |

## Consequências

- A partida da aplicação ganha um BCrypt (cerca de 250 ms) para calcular o hash de referência.
- O tempo das recusas fica igual dentro do servidor, mas **o envio do código por SMTP continua
  síncrono** dentro do request: com SMTP real, o 202 de quem tem conta ainda demora mais. Enviar
  depois do commit e de forma assíncrona é decisão pendente, que pede ADR próprio.
- Um limite de senha muda em dois lugares, `ValidadorDeSenhaNova` e `senhaNova()`.
- Quem erra a senha atual na troca pode trancar a própria conta por 15 minutos. Aceito: é o mesmo
  custo da tela de entrada.

## Quando revisitar

Quando o algoritmo de senha mudar (Argon2, por exemplo, que não tem o teto de 72 bytes), ou quando
o envio de e-mail sair do request.
