---
description: Revisa as mudanças pendentes contra as regras do projeto
---

Revise as mudanças pendentes (`git diff` do que ainda não foi commitado, mais os commits da branch
atual em relação a `main`). Vá item por item da lista abaixo e responda cada um com **ok** ou com o
arquivo e a linha do problema. Não conserte nada antes de apresentar a lista completa.

## Arquitetura

- [ ] Cada feature nova está em um único pacote (backend) ou uma única pasta (frontend)?
- [ ] Nenhuma regra que depende só do estado da entidade foi parar no Service?
- [ ] Nenhum `*Controller` recebe ou devolve `@Entity`?
- [ ] Nenhum `*Controller` chama `*Repository` direto?
- [ ] Injeção por construtor e campos `final`? `Optional` em vez de `null` em retorno?
- [ ] No frontend: nenhum import cruzado entre features, nada de HTML interativo cru fora do
      design system, lógica em hooks e não no JSX?

## Idioma e nomes

- [ ] Nenhum identificador com acento ou cedilha?
- [ ] Booleanos com verbo (`estaAtivo`, `possuiVencimento`), nunca `isAtivo`?
- [ ] Classes e tabelas no singular? Sufixos de framework em inglês?
- [ ] Todo termo de domínio usado está em `docs/glossario.md`, na forma canônica?
- [ ] Comentários, mensagens de erro e documentação em português com acentuação normal?

## Testes

- [ ] Regra nova de entidade tem teste unitário sem Spring?
- [ ] Caminho de erro do Service está coberto, não só o feliz?
- [ ] Controller novo tem `@WebMvcTest` verificando status e formato do JSON?
- [ ] Teste que precisa de Docker está com `@Tag("integracao")`?
- [ ] No frontend, os testes consultam por papel e texto acessível — não por classe CSS?

## Observabilidade

- [ ] **Toda** variável que decide um ramo (`if`, `else`, `switch`, condição de loop, early return)
      foi registrada com `contexto.decisao` **antes** do desvio?
- [ ] Nenhum `INFO` ou `DEBUG` manual no código de negócio? (o que se quereria logar é campo da
      linha canônica)
- [ ] O request ou a response trazem **campo novo com dado pessoal**, documento ou credencial? Se
      sim, ele foi adicionado a `observabilidade/campos-sensiveis.yml`? (o padrão é aparecer em
      claro — esta pergunta é a única barreira, faça-a em todo PR que mexe em DTO)
- [ ] Nenhum token, senha ou conteúdo escrito pelo usuário em claro?
- [ ] Nenhuma classe fora de `comum/observabilidade` importa `io.opentelemetry`?
- [ ] Nenhum `System.out`, `System.err`, `printStackTrace` ou `console.*` fora da fachada?
- [ ] `ERROR` só onde exige ação humana?

## Estilo

- [ ] Nenhuma cor, fonte, espaçamento, raio ou sombra literal fora de `tokens/`?
- [ ] `tokens.css` e `tokens.ts` foram gerados, não editados à mão?

## Documentação

- [ ] `docs/glossario.md` atualizado se surgiu termo novo?
- [ ] `docs/observabilidade.md` atualizado se a política de campos mudou?
- [ ] `docs/design-system.md` atualizado se surgiu token ou primitivo?
- [ ] Houve decisão técnica sem ADR? (se sim, aponte qual)
- [ ] Alguma documentação nova que deveria ser um teste?

## Fecho

Rode `cd backend && ./gradlew check` e `cd frontend && npm run verificar` e relate o resultado.
