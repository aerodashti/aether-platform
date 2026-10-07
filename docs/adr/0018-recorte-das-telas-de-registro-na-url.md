# ADR-0018: O recorte das telas de registro mora na URL, e `?registrar=1` abre o formulário

> **Quando ler este arquivo:** antes de criar um filtro de aeronave ou competência numa tela, um
> atalho que leve a uma tela já filtrada, ou um item novo no "+ Registrar" da casca.

- **Status:** aceito
- **Data:** 2026-10-05

## Contexto

O Projeto final tem atalhos que atravessam features: o detalhe da aeronave leva aos lançamentos e
aos voos *dela*, e o "+ Registrar" da casca abre o formulário de custo, trecho ou aporte de
qualquer tela. As fronteiras do front proíbem `features/A` de importar `features/B`, e não há
estado global (CLAUDE.md, "Não fazer"). Até aqui o recorte de Lançamentos e Voos era `useState`
— um link não tinha como chegar filtrado.

## Decisão

Aeronave e competência das telas de registro moram na query string (`?aeronave=3&competencia=2026-09`),
lidas por `compartilhado/recorte/useRecorteDaUrl`; `?registrar=1` pede à tela que abra o
formulário de novo registro, e o pedido sai da URL depois de atendido.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| A casca importa os painéis de cada feature e os abre ela mesma | `app` passaria a conhecer formulário de feature; cada registro novo mexeria na casca, e o painel abriria sem o contexto da tela (a grade não refletiria o que acabou de ser salvo) |
| Contexto React ou store compartilhado com "filtro atual" e "abrir painel" | É o estado global que o projeto recusa; e um link colado ou um recarregamento perderiam o recorte |
| `navigate(rota, { state })` do react-router | O estado de histórico não aparece na URL: não se compartilha, não sobrevive a abrir em nova aba |

## Consequências

- Um link reproduz a tela: `/custos?aeronave=3` é a resposta para "os lançamentos da PS-MEP".
- Qualquer tela pode oferecer "registrar" a outra sem import — basta a rota de destino ler o pedido.
- Trocar o filtro reescreve a URL com `replace`, para o "voltar" do navegador não virar desfazer
  de filtro. Custo: o histórico não guarda filtros anteriores.
- A competência padrão (o mês corrente) não vai para a URL, e o vazio ("todo o histórico") vai:
  quem lê a URL precisa saber que ausente e vazio são coisas diferentes.
- O pedido de registro é atendido num efeito. O callback da tela fica numa ref, fora das
  dependências: com ele nas dependências o efeito entrava em laço até o roteador confirmar a URL
  nova (visto e corrigido na tela de Aportes).

### Ampliação de 2026-10-07 (correção dos formulários)

O recorte passou a incluir `?proprietario=` (Trocas) e `?modo=periodo&de=&ate=` (Fechamento e
Aportes), com a mesma regra: **ausente é o padrão, vazio é sem limite**. Mudanças combinadas (trocar
o modo e as datas) vão numa navegação só. A aeronave do link que não está na frota é ignorada, com
aviso na tela.

Os filtros não usam o `useValidacao` (ADR-0022): o erro aparece no campo já na mudança, e a
consulta não sai enquanto o recorte for inválido; a grade mostra o motivo em vez da lista. A ordem
do período e o tipo do recorte moram em `compartilhado/recorte/recorteDeCompetencias.ts`. Quando a
consulta falha, a ação oferecida depende da causa: recusa do recorte (4xx) → "Limpar filtros";
401 ou 403 → nenhuma; 5xx, rede, 408 e 429 → "Tentar de novo" (`leituraDaFalha.ts`).

No servidor, filtro por aeronave ou proprietário inexistente responde 404, e competência fora da
janela (01/2000 até a corrente + 12 meses) responde 400 no parâmetro.

## Quando revisitar

Se uma tela precisar de recorte que não cabe numa query string legível (seleção de dezenas de
itens, por exemplo), ou se o produto ganhar um roteador com loaders, onde o recorte passaria a ser
dado da rota e não de um hook.
