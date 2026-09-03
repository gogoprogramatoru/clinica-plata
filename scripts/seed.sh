#!/usr/bin/env bash
# Creează conturile inițiale și datele demo. Se rulează O SINGURĂ DATĂ, după
# prima pornire a stack-ului. Seed-ul e idempotent (upsert), dar nu resetează
# parolele conturilor deja existente.
#
# Utilizare:
#   scripts/seed.sh                                  # stack local (compose.yaml)
#   COMPOSE_FILE=compose.prod.yml scripts/seed.sh    # VPS
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"

if [ ! -f .env ]; then
  echo "✖ Lipsește .env. Generează-l cu: scripts/gen-env.sh http://IP_SERVER:3000" >&2
  exit 1
fi

# Containerul aplicației NU primește variabilele SEED_* (vezi compose): sunt
# credențiale de bootstrap, n-au ce căuta în mediul procesului care rulează
# permanent. Le încărcăm aici și le dăm doar containerului temporar de seed.
#
# `docker compose run` nu acceptă `--env-file` (acela e flag de top-level, și
# ține de interpolarea fișierului compose, nu de mediul containerului). Forma
# `-e NUME`, fără valoare, transmite valoarea din mediul curent.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

docker compose -f "$COMPOSE_FILE" run --rm \
  -e SEED_ADMIN_USERNAME -e SEED_ADMIN_PASSWORD \
  -e SEED_RECEPTION_USERNAME -e SEED_RECEPTION_PASSWORD \
  -e SEED_NURSE_USERNAME -e SEED_NURSE_PASSWORD \
  --entrypoint npx app tsx prisma/seed.ts
