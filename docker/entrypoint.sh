#!/bin/sh
# Entrypoint al containerului de aplicație.
#
# Aplică migrațiile Prisma înainte de a porni serverul. Rulăm o singură instanță
# (Socket.io are nevoie de un singur proces, altfel ar fi necesare sticky
# sessions + adapter Redis), deci nu există risc de migrații concurente.
set -eu

echo "▶ Aplic migrațiile Prisma…"

# MySQL are healthcheck în compose, dar un restart al containerului bazei de date
# poate lăsa aplicația să pornească înaintea lui. Reîncercăm scurt.
attempt=1
max_attempts=15
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "✖ Migrațiile au eșuat după $max_attempts încercări. Opresc containerul." >&2
    exit 1
  fi
  echo "… baza de date nu răspunde (încercarea $attempt/$max_attempts); reîncerc în 2s"
  attempt=$((attempt + 1))
  sleep 2
done

echo "▶ Pornesc aplicația…"
exec "$@"
