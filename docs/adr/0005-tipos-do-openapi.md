# ADR-0005: Tipos da API gerados do OpenAPI, sem Zod

> **Quando ler este arquivo:** antes de adicionar validação de resposta no frontend.

- **Status:** aceito
- **Data:** 2026-09-04

## Contexto

Backend e frontend vivem no mesmo repositório, sobem juntos e são mantidos pelo mesmo time. O
backend já publica um OpenAPI completo via springdoc. Escrever tipos à mão no front cria uma
segunda fonte de verdade que diverge silenciosamente.

## Decisão

`npm run gerar-tipos` roda `openapi-typescript` contra o OpenAPI do backend e regrava
`src/api/tipos-gerados.ts`, que é versionado. Sem Zod e sem validação manual de resposta.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Zod validando cada resposta | Duplica o contrato em runtime e em tipo. Faz sentido contra API de terceiro, não contra o backend do mesmo repositório e do mesmo deploy. |
| Tipos escritos à mão | Divergem do backend sem que o build perceba. |
| Cliente completo gerado (openapi-generator) | Traz uma camada de abstração e uma dependência pesada; queremos só os tipos e o `fetch`. |

## Consequências

- Mudança de contrato no backend exige rodar `gerar-tipos`; o diff do arquivo gerado aparece no PR
  e serve de aviso de breaking change.
- Se o backend mentir sobre o próprio contrato, o front confia na mentira. Isso é responsabilidade
  do teste de Controller (`@WebMvcTest`), que verifica o JSON de verdade.
- Entrada vinda de formulário continua validada — pelo Bean Validation no backend.

## Quando revisitar

Se o frontend passar a consumir uma API que não é nossa, ou se backend e frontend deixarem de ser
versionados juntos.
