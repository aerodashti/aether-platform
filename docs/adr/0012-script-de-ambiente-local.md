# ADR-0012: Um script único para o ambiente local

> **Quando ler este arquivo:** antes de propor Makefile, Tilt, docker-compose para tudo, ou mais um
> script solto.

- **Status:** aceito
- **Data:** 2026-09-05

## Contexto

Subir o Aether para desenvolver exigia quatro passos manuais em três diretórios: copiar o `.env`,
subir o Compose, `./gradlew bootRun` num terminal e `npm run dev` em outro — mais lembrar que o JDK
vem do SDKMAN e nem sempre está no `PATH`. Pior: durante o desenvolvimento é comum precisar do banco
**vazio** (migration nova, coluna alterada, seed diferente), e isso significava lembrar do
`down -v`, que é fácil de confundir com o `down` normal e destrói dados sem avisar.

## Decisão

Um único `scripts/ambiente.sh`, com subcomandos: `up`, `down`, `reset`, `status` e `logs`. Todos
idempotentes — rodar duas vezes tem o mesmo efeito de rodar uma. `reset` é o único que apaga
volumes, e diz isso antes de fazer.

Backend e frontend continuam rodando **na máquina**, não em contêiner; o Compose cuida só do que é
infraestrutura (banco e, sob profile, o coletor de observabilidade).

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Makefile | Faz o mesmo, mas obriga a lidar com tabs, `.PHONY` e a semântica de alvos que ninguém quer aqui — não há compilação incremental para o Make gerenciar. Um script bash é mais direto para quem for editar. |
| Backend e frontend também no Compose | Perde-se hot reload, debug pelo IDE e a saída de log no terminal — que, com a linha canônica, é justamente onde se desenvolve. O Compose passaria a ser o caminho crítico do dia a dia. |
| Tilt / Skaffold | Resolvem orquestração de muitos serviços em Kubernetes. Aqui são dois processos e um banco. |
| Vários scripts (`subir.sh`, `parar.sh`, `resetar.sh`) | Três arquivos que compartilham as mesmas constantes e as mesmas checagens. Um arquivo com subcomandos evita a duplicação e dá um `--help` só. |
| Deixar como está, documentado no README | Foi o ponto de partida. O passo que sempre falha é o `reset`, porque exige lembrar de uma flag destrutiva na hora errada. |

## Consequências

- `./scripts/ambiente.sh up` é o comando que uma pessoa nova roda no primeiro dia, e o que qualquer
  um roda todo dia. Ele instala dependências que faltarem e cria o `infra/.env`.
- O script resolve o JDK do SDKMAN sozinho, porque `/usr/bin/java` existe no macOS mesmo sem JDK e
  `command -v java` não prova nada.
- O controle dos processos é **por porta**, não por PID: mais simples e mais idempotente, com o
  custo de que `down` libera as portas 8080 e 5173 mesmo que quem as ocupe não seja o Aether — o
  script avisa antes de subir quando encontra um ocupante estranho.
- Logs de backend e frontend vão para `.aether/`, ignorado pelo git.
- É mais um arquivo para manter em sincronia com o README. A mitigação é o README apontar para o
  script em vez de repetir os passos.

## Quando revisitar

Se aparecer um terceiro processo de aplicação, ou se o time passar a desenvolver dentro de
contêiner — aí o Compose cobre tudo e o script perde a razão de existir.
