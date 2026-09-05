#!/usr/bin/env bash
#
# Sobe, derruba e recria o ambiente de desenvolvimento do Aether.
#
#   ./scripts/ambiente.sh up       banco + backend + frontend, sem duplicar o que já está no ar
#   ./scripts/ambiente.sh reset    o mesmo, mas apagando os volumes do banco antes
#   ./scripts/ambiente.sh down     para tudo, preservando os dados
#   ./scripts/ambiente.sh status   o que está no ar
#   ./scripts/ambiente.sh logs     acompanha os logs
#
# Todo comando é idempotente: rodar duas vezes tem o mesmo efeito de rodar uma.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRABALHO="$RAIZ/.aether"
COMPOSE="$RAIZ/infra/docker-compose.yml"
PORTA_BANCO=5432
PORTA_BACKEND=8080
PORTA_FRONTEND=5173
PORTA_OBSERVABILIDADE=5080
ESPERA_MAXIMA=120

COM_OBSERVABILIDADE=false

# ----------------------------------------------------------------------------- saída
azul()   { printf '\033[0;34m%s\033[0m\n' "$*"; }
verde()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
ambar()  { printf '\033[0;33m%s\033[0m\n' "$*"; }
falhar() { printf '\033[0;31m%s\033[0m\n' "$*" >&2; exit 1; }

uso() {
  cat <<'AJUDA'
Sobe, derruba e recria o ambiente de desenvolvimento do Aether.

  ./scripts/ambiente.sh up       banco + backend + frontend, sem duplicar o que já está no ar
  ./scripts/ambiente.sh reset    o mesmo, mas apagando os volumes do banco antes
  ./scripts/ambiente.sh down     para tudo, preservando os dados
  ./scripts/ambiente.sh status   o que está no ar
  ./scripts/ambiente.sh logs     acompanha os logs

Todo comando é idempotente: rodar duas vezes tem o mesmo efeito de rodar uma.

Opções:
  --observabilidade   inclui o coletor de traces e logs (profile do Compose) e faz o
                      backend exportar para ele. Vale para `up` e para `reset`.

Argumentos de `logs`: backend | frontend | banco   (sem argumento, mostra os dois primeiros)
AJUDA
}

# ----------------------------------------------------------------------------- pré-requisitos
exigir() {
  command -v "$1" >/dev/null 2>&1 || falhar "Faltando: $1. $2"
}

preparar_java() {
  # No macOS /usr/bin/java existe mesmo sem JDK nenhum instalado, então `command -v java`
  # não prova nada: só rodar `java -version` prova que há uma JVM de verdade.
  if java -version >/dev/null 2>&1; then
    return 0
  fi
  # O JDK costuma vir do SDKMAN, que só entra no PATH em shell interativo.
  if [ -x "$HOME/.sdkman/candidates/java/current/bin/java" ]; then
    export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
  if ! java -version >/dev/null 2>&1; then
    falhar "Não encontrei um JDK. Instale o 21 — por exemplo: sdk install java 21-tem"
  fi
}

conferir_prerequisitos() {
  exigir docker "Instale o Docker Desktop."
  exigir node "Instale o Node 22 ou superior."
  docker info >/dev/null 2>&1 || falhar "O daemon do Docker não está rodando. Abra o Docker Desktop."
  preparar_java
}

# ----------------------------------------------------------------------------- utilidades
# Sempre sai com 0: sem isto, `pipefail` faria a atribuição do resultado derrubar o script
# quando a porta está livre, que é justamente o caso normal.
dono_da_porta() {
  lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null | head -1 || true
}

responde() { curl -sf -o /dev/null --max-time 2 "$1" 2>/dev/null; }

aguardar() {
  local url="$1" nome="$2" i=0
  while [ "$i" -lt "$ESPERA_MAXIMA" ]; do
    if responde "$url"; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  ambar "  $nome não respondeu em ${ESPERA_MAXIMA}s. Veja: ./scripts/ambiente.sh logs"
  return 1
}

argumentos_do_compose() {
  if [ "$COM_OBSERVABILIDADE" = true ]; then
    printf -- '-f\n%s\n--profile\nobservabilidade\n' "$COMPOSE"
  else
    printf -- '-f\n%s\n' "$COMPOSE"
  fi
}

compose() {
  local args=()
  while IFS= read -r linha; do args+=("$linha"); done < <(argumentos_do_compose)
  docker compose "${args[@]}" "$@"
}

# Para parar e limpar, o profile precisa entrar sempre: senão o contêiner de
# observabilidade sobrevive a um `down` feito sem a flag.
compose_todos() {
  docker compose -f "$COMPOSE" --profile observabilidade "$@"
}

# ----------------------------------------------------------------------------- passos
preparar_arquivos() {
  mkdir -p "$TRABALHO"
  if [ ! -f "$RAIZ/infra/.env" ]; then
    cp "$RAIZ/infra/.env.example" "$RAIZ/infra/.env"
    azul "  infra/.env criado a partir do exemplo"
  fi
  if [ ! -d "$RAIZ/node_modules" ]; then
    azul "  instalando dependências da raiz (hooks de git)"
    (cd "$RAIZ" && npm install --silent)
  fi
  if [ ! -d "$RAIZ/frontend/node_modules" ]; then
    azul "  instalando dependências do frontend"
    (cd "$RAIZ/frontend" && npm ci --silent)
  fi
}

saude_do_banco() {
  docker inspect -f '{{.State.Health.Status}}' aether-postgres 2>/dev/null || true
}

subir_banco() {
  azul "banco de dados"
  compose up -d
  local i=0
  while [ "$i" -lt "$ESPERA_MAXIMA" ]; do
    if [ "$(saude_do_banco)" = "healthy" ]; then
      break
    fi
    i=$((i + 1))
    sleep 1
  done
  if [ "$(saude_do_banco)" != "healthy" ]; then
    falhar "  o PostgreSQL não ficou saudável. Veja: ./scripts/ambiente.sh logs banco"
  fi
  verde "  PostgreSQL pronto em localhost:$PORTA_BANCO"
  if [ "$COM_OBSERVABILIDADE" = true ]; then
    if aguardar "http://localhost:$PORTA_OBSERVABILIDADE/healthz" "coletor"; then
      verde "  Observabilidade em http://localhost:$PORTA_OBSERVABILIDADE (dev@aerodash.com.br / observabilidade)"
    fi
  fi
}

exportar_observabilidade() {
  [ "$COM_OBSERVABILIDADE" = true ] || return 0
  export OTEL_TRACES_EXPORTER=otlp
  export OTEL_LOGS_EXPORTER=otlp
  export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
  export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:$PORTA_OBSERVABILIDADE/api/default"
  export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(printf 'dev@aerodash.com.br:observabilidade' | base64)"
}

subir_backend() {
  azul "backend"
  if responde "http://localhost:$PORTA_BACKEND/saude"; then
    verde "  já estava no ar em http://localhost:$PORTA_BACKEND"
    if [ "$COM_OBSERVABILIDADE" = true ]; then
      ambar "  atenção: ele subiu sem exportar para o coletor. Rode 'down' e suba de novo."
    fi
    return 0
  fi
  local ocupante
  ocupante="$(dono_da_porta "$PORTA_BACKEND")"
  if [ -n "$ocupante" ]; then
    falhar "  a porta $PORTA_BACKEND está tomada pelo processo $ocupante, que não é o Aether."
  fi
  exportar_observabilidade
  # `< /dev/null` importa: sem ele o processo em background segura o stdin herdado e
  # `./scripts/ambiente.sh up | tail` nunca devolve o prompt.
  nohup bash -c "cd '$RAIZ/backend' && ./gradlew bootRun" \
    > "$TRABALHO/backend.log" 2>&1 < /dev/null &
  disown 2>/dev/null || true
  if aguardar "http://localhost:$PORTA_BACKEND/saude" "backend"; then
    verde "  http://localhost:$PORTA_BACKEND — OpenAPI em /swagger-ui.html"
  else
    falhar "  o backend não subiu. Veja: ./scripts/ambiente.sh logs backend"
  fi
}

subir_frontend() {
  azul "frontend"
  if responde "http://localhost:$PORTA_FRONTEND/"; then
    verde "  já estava no ar em http://localhost:$PORTA_FRONTEND"
    if [ "$COM_OBSERVABILIDADE" = true ]; then
      ambar "  atenção: ele subiu sem exportar para o coletor. Rode 'down' e suba de novo."
    fi
    return 0
  fi
  local ocupante
  ocupante="$(dono_da_porta "$PORTA_FRONTEND")"
  if [ -n "$ocupante" ]; then
    falhar "  a porta $PORTA_FRONTEND está tomada pelo processo $ocupante, que não é o Aether."
  fi
  if [ "$COM_OBSERVABILIDADE" = true ]; then
    export VITE_OTEL_ENDPOINT="http://localhost:$PORTA_OBSERVABILIDADE/api/default"
    export VITE_OTEL_HEADERS="Authorization=Basic $(printf 'dev@aerodash.com.br:observabilidade' | base64)"
  fi
  nohup bash -c "cd '$RAIZ/frontend' && npm run dev" \
    > "$TRABALHO/frontend.log" 2>&1 < /dev/null &
  disown 2>/dev/null || true
  if aguardar "http://localhost:$PORTA_FRONTEND/" "frontend"; then
    verde "  http://localhost:$PORTA_FRONTEND"
  else
    falhar "  o frontend não subiu. Veja: ./scripts/ambiente.sh logs frontend"
  fi
}

parar_porta() {
  local porta="$1" nome="$2" pid
  pid="$(dono_da_porta "$porta")"
  if [ -z "$pid" ]; then
    azul "  $nome já estava parado"
    return 0
  fi
  kill "$pid" 2>/dev/null || true
  local i=0
  while [ "$i" -lt 15 ] && kill -0 "$pid" 2>/dev/null; do
    i=$((i + 1))
    sleep 1
  done
  kill -9 "$pid" 2>/dev/null || true
  verde "  $nome parado"
}

# ----------------------------------------------------------------------------- comandos
comando_up() {
  conferir_prerequisitos
  preparar_arquivos
  subir_banco
  subir_backend
  subir_frontend
  echo
  verde "Ambiente no ar. Logs: ./scripts/ambiente.sh logs"
}

comando_down() {
  azul "parando processos locais"
  parar_porta "$PORTA_FRONTEND" "frontend"
  parar_porta "$PORTA_BACKEND" "backend"
  azul "parando contêineres (os dados ficam)"
  compose_todos stop >/dev/null 2>&1 || true
  verde 'Ambiente parado. Os volumes foram preservados; use "reset" para apagá-los.'
}

comando_reset() {
  conferir_prerequisitos
  ambar "Isto apaga os volumes do Docker: o banco volta vazio e o Flyway roda do zero."
  comando_down
  azul "removendo contêineres e volumes"
  compose_todos down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$TRABALHO"
  verde "  volumes removidos"
  echo
  comando_up
}

comando_status() {
  azul "contêineres"
  compose_todos ps --format '  {{.Name}}  {{.Status}}' 2>/dev/null || echo "  nenhum"
  echo
  azul "processos locais"
  for par in "backend:$PORTA_BACKEND:/saude" "frontend:$PORTA_FRONTEND:/"; do
    IFS=: read -r nome porta caminho <<< "$par"
    if responde "http://localhost:$porta$caminho"; then
      verde "  $nome  no ar em http://localhost:$porta"
    else
      ambar "  $nome  parado"
    fi
  done
}

comando_logs() {
  local alvo="${1:-tudo}"
  case "$alvo" in
    backend)  tail -f "$TRABALHO/backend.log" ;;
    frontend) tail -f "$TRABALHO/frontend.log" ;;
    banco)    compose logs -f postgres ;;
    tudo)     tail -f "$TRABALHO/backend.log" "$TRABALHO/frontend.log" ;;
    *)        falhar "Alvo desconhecido: $alvo. Use backend, frontend ou banco." ;;
  esac
}

# ----------------------------------------------------------------------------- entrada
COMANDO=""
for argumento in "$@"; do
  case "$argumento" in
    --observabilidade) COM_OBSERVABILIDADE=true ;;
    -h|--help|help)    uso; exit 0 ;;
    *)                 if [ -z "$COMANDO" ]; then COMANDO="$argumento"; else ALVO="$argumento"; fi ;;
  esac
done

case "${COMANDO:-up}" in
  up)     comando_up ;;
  down)   comando_down ;;
  reset)  comando_reset ;;
  status) comando_status ;;
  logs)   comando_logs "${ALVO:-tudo}" ;;
  *)      uso; falhar "Comando desconhecido: $COMANDO" ;;
esac
