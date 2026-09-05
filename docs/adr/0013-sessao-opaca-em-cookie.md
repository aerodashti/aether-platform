# ADR-0013: Sessão opaca em cookie HttpOnly, sem Spring Security

> **Quando ler este arquivo:** ao mexer em autenticação, ao propor JWT, ou ao adicionar a primeira
> tela que exige autorização — é essa tela que dispara a segunda metade desta decisão.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

A primeira fatia de acesso é a área **não logada**: entrar, sair e recuperar a senha. Não existe
ainda nenhuma tela que exija sessão, e portanto nenhuma regra de autorização a escrever.

Isso muda o cálculo de duas escolhas que normalmente vêm juntas.

A primeira é **onde a sessão vive**. Um JWT assinado não precisa de banco, mas também não sabe ser
revogado: encerrar sessão vira ou uma lista de revogação — que é o banco de volta, com mais passos
— ou uma espera até o token expirar. Num produto de gestão patrimonial, "saí da conta" precisa
significar que o acesso acabou agora, inclusive porque é o que a pessoa faz quando desconfia de algo.

A segunda é **quanto de Spring Security entra**. O starter completo instala uma cadeia de filtros e
tranca todos os endpoints por padrão. Sem nenhuma autorização para configurar, isso significaria
escrever configuração só para desativar o que o starter fez — e conviver com um mecanismo cujo
efeito não é visível no código da feature.

## Decisão

**A sessão é um token opaco sorteado com 256 bits, guardado no banco pelo seu SHA-256 e entregue ao
navegador num cookie `HttpOnly`, `SameSite=Lax`, `Secure` fora de desenvolvimento.**

**Do Spring Security entra apenas `spring-security-crypto`** — a biblioteca do BCrypt, sem
auto-configuração, sem filtro e sem endpoint trancado. Senha e código de recuperação usam BCrypt
com custo 12; o token de sessão usa SHA-256, porque 256 bits de entropia não têm dicionário a
percorrer e o resumo existe só para que ler a tabela não entregue sessões abertas.

O cookie `HttpOnly` é o que tira o token do alcance de qualquer script na página — é a diferença
concreta para um token em `localStorage`, que qualquer XSS lê.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| JWT assinado, sem estado | Encerrar sessão deixa de ser imediato. A lista de revogação que resolve isso é o banco de novo, com mais peças e mais formas de errar. O ganho — não consultar o banco por request — é irrelevante numa consulta por chave primária. |
| `spring-boot-starter-security` completo | Tranca todos os endpoints e instala uma cadeia de filtros para que nada seja autorizado ainda. Configuração escrita para desligar o que a dependência acabou de ligar não é configuração, é ruído. |
| Token no cabeçalho `Authorization`, guardado em `localStorage` | Exige que o front guarde o segredo, e o coloca ao alcance de qualquer script injetado. O cookie `HttpOnly` resolve isso sem nenhum código no front. |
| Sessão do próprio servlet container (`HttpSession`) | Amarra a sessão à memória do processo: dois nós exigem sessão replicada ou sticky session. Uma linha em tabela não tem esse problema. |

## Consequências

- Encerrar sessão é imediato: a linha é marcada como encerrada e o próximo request cai.
- O front não guarda nem manuseia segredo nenhum. `credentials: 'same-origin'` e pronto.
- Cada request autenticado custa uma consulta por chave primária — o preço que aceitamos pagar.
- **Falta a segunda metade.** Não existe filtro de autorização: `GET /autenticacao/sessao` lê o
  cookie no próprio serviço. Isso basta enquanto o único endpoint com sessão é esse. **A primeira
  tela que exigir autorização por papel deve trazer o `spring-boot-starter-security` junto** — aí a
  cadeia de filtros tem o que configurar, e o BCrypt que já está aqui continua servindo.
- Sessões encerradas e expiradas ficam na tabela. Não há expurgo: quando o volume incomodar, é uma
  rotina de limpeza, não uma mudança de arquitetura.

### O risco aceito no bloqueio por tentativas

Cinco senhas erradas suspendem a conta por quinze minutos, e a resposta passa a ser `429` em vez do
`401` genérico. Isso revela que o endereço existe — mas só para quem já errou a senha dele cinco
vezes. A alternativa, silenciar o bloqueio, deixaria a pessoa legítima diante de um erro que não
muda por mais que ela acerte a senha. Escolhemos explicar o que está acontecendo.

## Quando revisitar

Quando a primeira tela autenticada entrar — é o momento de trazer o starter do Spring Security e
mover a leitura do cookie para um filtro. E se um dia a consulta de sessão aparecer num perfil de
carga como gargalo real, medido e não suposto, aí o JWT de vida curta com refresh volta à mesa.
