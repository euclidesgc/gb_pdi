#!/usr/bin/env bash
# Postgres local de desenvolvimento, isolado em .local-db/ (fora do git).
#   scripts/dev-db.sh start   cria (na primeira vez) e sobe o banco
#   scripts/dev-db.sh stop    derruba o banco
#   scripts/dev-db.sh reset   derruba e apaga todos os dados locais
# Conexão: postgres://gbpdi@127.0.0.1:54329/gbpdi (só aceita conexões locais).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT=.local-db
DATA="$ROOT/data"
LOG="$ROOT/postgres.log"
PORT=54329
DB=gbpdi

# Sem um locale definido, o Postgres do Homebrew aborta com "postmaster became multithreaded".
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

if ! command -v pg_ctl >/dev/null; then
  echo "Postgres não encontrado. Instale com: brew install postgresql@16" >&2
  exit 1
fi

running() { pg_ctl -D "$DATA" status >/dev/null 2>&1; }

start() {
  if [ ! -f "$DATA/PG_VERSION" ]; then
    echo "Criando o banco local em ${DATA}…"
    mkdir -p "$ROOT"
    initdb -D "$DATA" -U "$DB" --auth=trust --encoding=UTF8 >/dev/null
    # Só TCP em 127.0.0.1: o caminho do socket Unix ficaria longo demais.
    cat >>"$DATA/postgresql.conf" <<EOF
listen_addresses = '127.0.0.1'
port = $PORT
unix_socket_directories = ''
EOF
  fi
  if running; then
    echo "Postgres local já está rodando na porta $PORT."
  else
    pg_ctl -D "$DATA" -l "$LOG" -w start >/dev/null
    echo "Postgres local rodando na porta $PORT."
  fi
  if ! psql -h 127.0.0.1 -p "$PORT" -U "$DB" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1; then
    createdb -h 127.0.0.1 -p "$PORT" -U "$DB" "$DB"
  fi
}

stop() {
  if running; then
    pg_ctl -D "$DATA" -m fast -w stop >/dev/null
    echo "Postgres local parado."
  else
    echo "Postgres local já estava parado."
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset)
    stop
    rm -rf "${DATA:?}"
    echo "Dados locais apagados. O próximo start cria um banco novo."
    ;;
  *)
    echo "Uso: $0 start|stop|reset" >&2
    exit 1
    ;;
esac
