# ADR-0003: Código em português

> **Quando ler este arquivo:** ao nomear qualquer coisa, ou ao estranhar `situacaoRegular` no código.

- **Status:** aceito
- **Data:** 2026-09-04

## Contexto

O domínio do Aether é a regulação aeronáutica **brasileira**. Os termos não têm tradução estável:
CVA, RETA, RAB, RBAC, CHT. Traduzir gera um vocabulário paralelo — `airworthinessCertificate` para
CVA — que ninguém do negócio reconhece e que obriga tradução mental em todo code review.

## Decisão

Identificadores, campos de API, tabelas e colunas em português **sem acento e sem cedilha**.
Sufixos de framework, palavras reservadas e padrões universais permanecem em inglês.
Documentação, comentários, commits e mensagens ao usuário em português com acentuação normal.

O detalhe operacional está em `docs/convencoes.md`; o vocabulário, em `docs/glossario.md`.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Tudo em inglês | Obriga traduzir termos regulatórios que não têm equivalente; a tradução vira fonte de bug de interpretação. |
| Domínio em português, resto em inglês | A fronteira fica ambígua em cada arquivo; discussão recorrente sem ganho. |
| Português com acentos nos identificadores | Java e TypeScript aceitam, mas quebra ferramenta, URL, nome de coluna e busca. |

## Consequências

- Precisamos de um glossário mantido: sem ele o português fragmenta mais rápido que o inglês
  (`expiracao` vs `vencimento` vs `validade`).
- Nomes mistos aparecem e são normais: `AeronaveController`, `vencimentoCva`.
- Contratação de quem não fala português fica mais difícil. Aceitamos: o produto é brasileiro.

## Quando revisitar

Se o produto for internacionalizado a ponto de o domínio deixar de ser a regulação brasileira.
