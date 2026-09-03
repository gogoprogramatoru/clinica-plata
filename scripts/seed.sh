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

# `--env-file .env` adaugă variabilele SEED_*, pe care containerul aplicației
# nu le primește în mod normal.
docker compose -f "$COMPOSE_FILE" run --rm --env-file .env \
  --entrypoint npx app tsx prisma/seed.ts
