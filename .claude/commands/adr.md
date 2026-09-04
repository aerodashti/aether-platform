---
description: Cria um novo ADR numerado a partir do template
argument-hint: <título da decisão>
---

Crie um ADR para: **$ARGUMENTS**

## Passos

1. Liste `docs/adr/` e descubra o próximo número livre (quatro dígitos, sequencial).
2. Copie `docs/adr/0000-template.md` para `docs/adr/<NNNN>-<titulo-em-kebab-case-sem-acento>.md`.
3. Preencha:
   - **Status:** `aceito` se a decisão já foi tomada, `proposto` se ainda está em discussão.
   - **Data:** a data de hoje, em `AAAA-MM-DD`.
   - **Contexto:** o que forçou a decisão. Restrições reais — prazo, time, custo, ambiente.
     Não é lugar para justificar; é lugar para descrever a situação.
   - **Decisão:** uma frase afirmativa no presente. "Usamos X." Não "vamos avaliar X".
   - **Alternativas consideradas:** pelo menos duas, cada uma com o motivo concreto da recusa.
     Se você não consegue listar alternativa nenhuma, provavelmente não é uma decisão — é um
     detalhe de implementação e não precisa de ADR.
   - **Consequências:** o que fica mais fácil **e** o que fica mais difícil. Inclua o custo que
     estamos aceitando pagar. Um ADR sem custo listado está incompleto.
   - **Quando revisitar:** o sinal concreto e observável que indicaria que a decisão caducou.
4. Se este ADR substitui outro, marque o antigo como `substituído por ADR-<NNNN>` e diga por quê.
5. Se a decisão muda alguma regra do dia a dia, atualize também `CLAUDE.md` ou o arquivo relevante
   em `docs/` — o ADR explica o porquê, mas a regra tem que estar onde a pessoa vai procurar.

Escreva em português com acentuação normal. Seja curto: um ADR bom cabe em uma tela.
