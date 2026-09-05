# ADR-0010: Mascaramento de log por lista de campos sensíveis

> **Quando ler este arquivo:** antes de adicionar um campo a `campos-sensiveis.yml`, ou ao ver um
> valor em claro no log e se perguntar se deveria estar lá.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

A linha canônica inclui corpos de request e de response. Isso é o que a torna útil para investigar,
e é exatamente o que exige cuidado: o Aether lida com dados de proprietários de aeronaves — pessoas
identificáveis e de alta exposição.

Há duas formas de tratar isso, e elas erram em direções opostas. A allowlist erra escondendo demais:
todo campo novo sai como `***` até alguém liberá-lo, então a linha canônica de uma feature recém-
escrita não explica nada, justo quando ela é mais necessária. A denylist erra expondo: um campo
sensível que ninguém lembrou de listar vaza.

O que decide entre as duas é a natureza do domínio. Aqui, a esmagadora maioria dos campos é
regulatória e operacional — matrícula, vencimento, situação, aeródromo, horas de voo — e não é
sensível. Dado pessoal é a exceção, e é uma exceção **enumerável**: documento e identificação de
pessoa física.

## Decisão

Lista de campos sensíveis, com estratégia de máscara por campo, em
`backend/src/main/resources/observabilidade/campos-sensiveis.yml` — a única fonte da política.
Campo que não está lá aparece em claro. Hoje há um único campo: `cpf`, mascarado preservando os
cinco últimos dígitos (`***.***.789-01`), o suficiente para conferir um caso com o suporte sem
identificar ninguém.

Estratégia desconhecida mascara o campo inteiro: errar o nome da estratégia esconde demais, nunca
de menos.

Continuam valendo, e são independentes desta decisão: truncar texto acima de 500 caracteres,
resumir lista acima de 5 itens, parar a recursão na profundidade 6 e nunca ler multipart ou binário.
Essas regras são sobre **tamanho**, não sobre sigilo.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Allowlist (tudo mascarado por padrão) | Foi a primeira versão desta decisão. O custo apareceu na prática: cada feature nova nasce com a linha canônica cega, e o desenvolvedor precisa liberar campo a campo para conseguir investigar. Num domínio em que quase nada é sensível, o atrito é permanente e o ganho é pequeno. |
| Anotação no DTO (`@Sensivel`) | Espalha a política por dezenas de arquivos e impede responder "o que este sistema esconde?" de uma vez. E não cobre corpo bruto sem DTO. |
| Mascarar o campo inteiro, sempre | `***` não deixa conferir nada com o suporte. Preservar o fim do documento resolve o caso real sem identificar a pessoa. |
| Não logar corpo nenhum | Seguro e inútil: metade das investigações começa por "o que exatamente o cliente mandou?". |

## Consequências

- **Este é o risco aceito:** um campo pessoal novo vaza até alguém percebê-lo. A mitigação é de
  processo, não de código — o `/revisar` pergunta explicitamente se o request ou a response trazem
  dado pessoal que precisa entrar na lista, e o code review é o momento de responder.
- A linha canônica de uma feature nova já nasce útil, sem configuração.
- Um arquivo único para auditar: dá para responder "o que este sistema esconde?" lendo uma lista
  curta.
- A comparação é por nome exato de campo: `cpf` não cobre `cpfDoProprietario`. Ao nomear um campo
  novo com dado pessoal, use o nome canônico do glossário — é o que faz a lista funcionar.

## Quando revisitar

Se um vazamento acontecer, ou se o domínio passar a ter muitos campos pessoais — no dia em que a
lista de sensíveis ficar maior que a de não sensíveis, a allowlist volta a ser a escolha certa.
