# syntax=docker/dockerfile:1
#
# Imagine de producție pentru Clinica Plata.
#
# Aplicația rulează ca un proces Node persistent (server custom: Next + Socket.io
# pe același port), NU serverless. Imaginea conține exact ce e nevoie la runtime:
# build-ul Next, sursele TypeScript (serverul custom rulează prin tsx), clientul
# Prisma generat și CLI-ul Prisma pentru `migrate deploy`.

# ---- Stage 1: build ---------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# openssl: cerut de Prisma la generarea/rularea clientului.
# python3/make/g++: necesare dacă argon2 nu are prebuild pentru platformă.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# `postinstall` rulează `prisma generate`, deci schema trebuie să existe deja.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
# Build-ul Next are nevoie doar de tipuri, nu de o conexiune reală la MySQL.
RUN npm run build

# ---- Stage 2: dependențe de producție ---------------------------------------
# Instalare separată, fără devDependencies, ca imaginea finală să nu conțină
# toolchain-ul de build (typescript, eslint, vitest, tailwind).
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# ---- Stage 3: runtime -------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# server.ts importă ./src/types/realtime.js, rezolvat de tsx din sursa .ts.
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
# Schema + migrațiile: folosite de `prisma migrate deploy` din entrypoint.
COPY --from=builder /app/prisma ./prisma
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Next scrie în .next/cache la runtime; procesul rulează neprivilegiat.
RUN chmod +x /usr/local/bin/entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "start"]
