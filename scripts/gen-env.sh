#!/usr/bin/env bash
# Generează fișierul `.env` pentru o instalare, cu parole aleatoare.
#
# Utilizare:
#   scripts/gen-env.sh http://192.168.1.50:3000      # instalare locală (LAN)
#   scripts/gen-env.sh https://clinica.exemplu.ro    # în spatele unui proxy TLS
#   scripts/gen-env.sh http://192.168.1.50:3000 --force   # rescrie .env existent
#
# Nu atinge un `.env` existent fără `--force`: parolele MySQL sunt fixate la
# prima pornire a containerului bazei de date, iar schimbarea lor ulterioară
# lasă aplicația fără acces la datele deja scrise.
set -euo pipefail

cd "$(dirname "$0")/.."

URL="${1:-}"
FORCE="${2:-}"

if [ -z "$URL" ]; then
  echo "Utilizare: scripts/gen-env.sh <URL_APLICAȚIE> [--force]" >&2
  echo "Exemplu:   scripts/gen-env.sh http://192.168.1.50:3000" >&2
  exit 1
fi

case "$URL" in
  http://*|https://*) ;;
  *) echo "✖ URL-ul trebuie să înceapă cu http:// sau https:// (primit: $URL)" >&2; exit 1 ;;
esac

case "$URL" in
  */) echo "✖ Scoate slash-ul final din URL: ${URL%/}" >&2; exit 1 ;;
esac

if [ -e .env ] && [ "$FORCE" != "--force" ]; then
  echo "✖ .env există deja. Rulează cu --force doar dacă ești sigur că vrei" >&2
  echo "  parole noi (o bază de date deja inițializată NU le va accepta)." >&2
  exit 1
fi

# Parole alfanumerice: intră neescapate în DATABASE_URL și trec politica din
# aplicație (minim 10 caractere, litere și cifre).
gen_pw() { openssl rand -hex 16; }

MYSQL_PASSWORD="$(gen_pw)"
MYSQL_ROOT_PASSWORD="$(gen_pw)"
AUTH_SECRET="$(openssl rand -base64 32)"
SEED_ADMIN_PASSWORD="$(gen_pw)"
SEED_RECEPTION_PASSWORD="$(gen_pw)"
SEED_NURSE_PASSWORD="$(gen_pw)"

umask 077
cat > .env <<ENVFILE
# Generat de scripts/gen-env.sh la $(date -u +"%Y-%m-%d %H:%M:%S UTC").
# NU comite acest fișier. Păstrează o copie a parolelor într-un manager de parole.

# --- Bază de date (MySQL, containerul \`db\` din compose) ---
DATABASE_URL="mysql://clinica:${MYSQL_PASSWORD}@db:3306/clinica_plata"
MYSQL_DATABASE="clinica_plata"
MYSQL_USER="clinica"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"

# --- NextAuth / Auth.js ---
AUTH_SECRET="${AUTH_SECRET}"
# Exact adresa pe care o tastezi în browser. Protocolul de aici decide dacă
# sesiunea folosește cookie-uri "secure" (vezi src/lib/deployment.ts).
AUTH_URL="${URL}"
AUTH_TRUST_HOST="true"

# --- Server / Socket.io ---
PORT="3000"
HOSTNAME="0.0.0.0"
SOCKET_ALLOWED_ORIGINS="${URL}"
# Portul publicat pe host de compose.yaml (instalarea locală).
APP_PORT="3000"

# --- Seed: conturile create la prima instalare ---
# Schimbă parolele din aplicație după primul login.
SEED_ADMIN_USERNAME="admin"
SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD}"
SEED_RECEPTION_USERNAME="receptie"
SEED_RECEPTION_PASSWORD="${SEED_RECEPTION_PASSWORD}"
SEED_NURSE_USERNAME="asistenta"
SEED_NURSE_PASSWORD="${SEED_NURSE_PASSWORD}"
ENVFILE

chmod 600 .env

cat <<SUMMARY

✔ .env generat (chmod 600), pentru ${URL}

Conturile care vor fi create de seed — notează-le acum, parolele nu mai apar:

  admin      ${SEED_ADMIN_PASSWORD}
  receptie   ${SEED_RECEPTION_PASSWORD}
  asistenta  ${SEED_NURSE_PASSWORD}

Urmează:  docker compose up -d --build   apoi   scripts/seed.sh
SUMMARY
