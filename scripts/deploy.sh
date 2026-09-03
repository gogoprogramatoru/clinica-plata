#!/usr/bin/env bash
# Actualizează aplicația pe server: aduce codul nou, reconstruiește imaginea și
# repornește containerul. Migrațiile Prisma rulează automat în entrypoint.
#
# Utilizare:
#   /opt/clinica-plata/scripts/deploy.sh                       # VPS (Caddy)
#   COMPOSE_FILE=compose.yaml /opt/stacks/clinica-plata/scripts/deploy.sh
#                                                              # instalare locală
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"
COMPOSE="docker compose -f $COMPOSE_FILE"

echo "▶ Stack: $COMPOSE_FILE"

echo "▶ Aduc ultimele modificări din Git…"
git pull --ff-only

echo "▶ Reconstruiesc imaginea aplicației…"
$COMPOSE build app

echo "▶ Repornesc stack-ul…"
$COMPOSE up -d

echo "▶ Stare curentă:"
$COMPOSE ps
