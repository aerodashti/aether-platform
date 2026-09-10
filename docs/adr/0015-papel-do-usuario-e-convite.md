# ADR-0015: Papel em coluna do usuário, autorização na cadeia de filtros, convite por link próprio

> **Quando ler este arquivo:** ao propor um segundo papel para alguém, ao escrever autorização em
> anotação de controller, ou ao mexer no convite. É a continuação do ADR-0013.

- **Status:** aceito
- **Data:** 2026-09-09

## Contexto

A tela de **Usuários** é a primeira do Aether restrita por papel: no protótipo do Claude Design ela
se anuncia como "página restrita — visível apenas para administradores". Ela lista nome, e-mail,
papel, situação e último acesso, e oferece convidar, reenviar convite, desativar e reativar.

Nada disso existia no modelo. O `usuario` do V2 tem nome, e-mail, senha, situação e o contador de
tentativas — não tem papel, não tem último acesso, e o único caminho para criar senha é o código de
recuperação de seis dígitos, que por regra só vale para quem já está `ATIVO`.

O ADR-0013 previu este momento com todas as letras: adiou o `spring-boot-starter-security` porque
não havia autorização a configurar, e registrou que "a primeira tela que exigir autorização por
papel deve trazer o starter junto".

## Decisão

**O papel é uma coluna do próprio usuário**, `papel VARCHAR(20) NOT NULL`, com quatro valores:
`ADMINISTRADOR`, `GESTOR`, `PROPRIETARIO`, `PILOTO`. Um papel por pessoa.

**A autorização mora na cadeia de filtros, em um lugar só.** O `spring-boot-starter-security` entra;
`FiltroDeSessao` traduz o cookie em identidade e nunca recusa; `ConfiguracaoDeSeguranca` declara o
que é público e o que exige `ADMINISTRADOR`. Nenhum controller repete a regra em anotação.

**O convite é uma tabela própria**, com token de 256 bits guardado pelo SHA-256, validade de 48
horas e uso único. Ele é o caminho de quem está `PENDENTE`; o código de recuperação continua sendo
o caminho de quem já está `ATIVO`.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Tabela `papel` + `usuario_papel` (N:N) | Resolve acúmulo de papéis, que nada no produto pede. Duas tabelas e um join a mais em toda checagem, para uma flexibilidade sem caso de uso. Quando aparecer, a migração é mecânica: a coluna vira a primeira linha da associação. |
| `@PreAuthorize` no controller | Espalha a regra por tantos lugares quanto houver método, e nenhum deles é onde se pergunta "o que é público neste produto?". A lista única também faz rota nova nascer fechada por omissão, que é o padrão certo. |
| Reaproveitar `codigo_de_recuperacao` para o convite | Exigiria afrouxar `podeRecuperarSenha()`, que hoje recusa quem está `PENDENTE`. Essa recusa não é acidente: sem ela, "esqueci minha senha" vira uma forma de assumir uma conta que nunca foi ativada. Seis dígitos também são pouca entropia para um link que vive dois dias. |
| Papel dentro do token de sessão | O token é opaco e sem estado por decisão do ADR-0013. Guardar papel nele traria o problema que o ADR evitou: revogar deixaria de ser imediato — o papel antigo continuaria valendo até a sessão vencer. |
| Deixar `ADMINISTRADOR` implícito (o primeiro usuário) | Regra invisível, impossível de ler no banco e impossível de transferir. |

## Consequências

- **A tela de Usuários é aplicável, e testável.** O teste de integração prova o que a frase do
  protótipo promete: sem sessão é 401, com sessão de gestor é 403, com sessão de administrador é 200.
- **Rota nova nasce fechada.** É o padrão do starter, e mantivemos. O custo aparece nos testes: todo
  `@WebMvcTest` precisa importar `ConfiguracaoDeSeguranca` — sem isso vale o padrão do Spring Boot,
  não o nosso, e até `/saude` responde 401. Está registrado em `docs/testes.md`.
- **Ninguém altera o próprio acesso.** `AcaoSobreSiMesmoException` recusa desativar-se a si mesmo, e
  é o que impede o último administrador de se trancar do lado de fora da única tela que desfaria o
  engano. Aceitamos o corolário: uma instalação com um administrador só depende de acesso ao banco
  para trocá-lo.
- **Papel e situação são lidos do banco a cada request, não guardados no cookie.** É o que torna
  revogação imediata: desativar alguém corta o acesso no request seguinte, e trocar o papel de
  alguém vale na hora — sem esperar o cookie de 12 horas vencer. O preço é uma consulta por chave
  primária por request, que o ADR-0013 já tinha aceitado pagar. A sessão em si continua vigente
  nesse caso: quem recusa é a situação do usuário, não a linha em `sessao_de_acesso`. Encerrar as
  sessões do desativado seria uma limpeza a mais, não uma mudança de comportamento.
- **O CSRF foi desligado**, e a proteção passa a ser o `SameSite=Lax` do cookie, que impede o
  navegador de mandá-lo num POST vindo de outro site. Nenhum fluxo do produto depende de request
  entre sites; se um dia depender, o CSRF volta antes dele.
- **A coluna `papel` ficou com `DEFAULT 'GESTOR'`.** A intenção era removê-lo — papel é decisão de
  quem convida. O que impede é o seed de desenvolvimento `V900`, que insere sem a coluna e é
  migration já aplicada, que não se edita. O valor nunca é usado pela aplicação, e `GESTOR` é o
  papel de menor alcance: se um dia for usado, erra para baixo.

## Quando revisitar

Quando alguém precisar de dois papéis ao mesmo tempo — aí a coluna vira tabela de associação. E
quando a consulta de sessão aparecer num perfil de carga como gargalo **medido**, e não suposto: aí
vale discutir cache de curta duração, sabendo que ele reintroduz exatamente a janela de revogação
que esta decisão fechou.
