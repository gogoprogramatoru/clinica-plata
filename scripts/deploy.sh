#!/usr/bin/env bash
# Actualizează aplicația pe VPS: aduce codul nou, reconstruiește imaginea și
# repornește containerul. Migrațiile Prisma rulează automat în entrypoint.
#
# Utilizare (pe server):  /opt/clinica-plata/scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f compose.prod.yml"

echo "▶ Aduc ultimele modificări din Git…"
git pull --ff-only

echo "▶ Reconstruiesc imaginea aplicației…"
$COMPOSE build app

echo "▶ Repornesc stack-ul…"
$COMPOSE up -d

echo "▶ Stare curentă:"
$COMPOSE ps
