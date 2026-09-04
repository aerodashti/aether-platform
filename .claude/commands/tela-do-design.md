---
description: Implementa uma tela a partir de um handoff bundle do Claude Design
argument-hint: <nome da tela> (o bundle deve estar carregado na sessão)
---

Implemente a tela a partir do handoff bundle do Claude Design carregado nesta sessão.
O bundle é **referência visual**, não código a ser copiado: nada dele entra no repositório
diretamente.

## Ordem obrigatória

1. **Leia `docs/design-system.md`.** Ele lista o mapeamento entre componentes do bundle e os
   primitivos que já existem, e os componentes do bundle ainda não implementados.
2. **Leia `docs/glossario.md`.** Todo rótulo do bundle vira nome no código: confira a forma
   canônica antes de nomear. Rótulo que introduz termo novo entra no glossário nesta mesma sessão.
3. **Tokens antes de componentes.** Compare os valores do bundle com
   `frontend/src/design-system/tokens/tokens.json`:
   - valor que já existe: **use o token existente**, nunca crie um sinônimo;
   - valor novo e legítimo: adicione a `tokens.json` e rode `npm run gerar-tokens`;
   - nunca edite `tokens.css` ou `tokens.ts` à mão — são gerados.
4. **Mapeie componente por componente.** Para cada elemento do bundle, decida:
   usa primitivo existente / precisa de primitivo novo / é composição própria da feature.
   Primitivo novo só quando duas telas o usariam ou quando envolve elemento interativo cru.
5. **Implemente** em `frontend/src/features/<nome>/`, com `api/` (hooks do Query) e `componentes/`.
   Registre a rota em `src/app/rotas.tsx`.
6. **Atualize `docs/design-system.md`**: mova da lista de pendentes para a de mapeados o que você
   implementou, e registre os tokens novos.

## Regras que falham o build

- Nenhuma cor, fonte, espaçamento, raio ou sombra literal fora de `tokens/` (Stylelint).
- `<button>`, `<input>`, `<a>` crus só dentro de `design-system/` (ESLint boundaries).
- `features/A` não importa de `features/B`.
- `console.*` fora de `compartilhado/log`.

## Ao terminar

```bash
cd frontend && npm run verificar
```

Relate: quais tokens foram adicionados, quais primitivos foram criados, e o que do bundle
**não** foi implementado e por quê.
