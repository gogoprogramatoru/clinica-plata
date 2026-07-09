# Clinica Plata

Platformă web internă pentru o clinică medicală: asistentele înregistrează
procedurile efectuate, iar recepția vede în timp real tichetele de plată și le
încasează cu un singur buton. Adminul configurează specialități, medici,
proceduri, prețuri și conturi.

> Dezvoltat de [GxA Solutions](https://gxasolutions.com).

---

## Cuprins

- [Stack tehnic](#stack-tehnic)
- [Arhitectură](#arhitectură)
- [Roluri](#roluri)
- [Cerințe](#cerințe)
- [Instalare (dezvoltare)](#instalare-dezvoltare)
- [Variabile de mediu](#variabile-de-mediu)
- [Comenzi](#comenzi)
- [Deployment pe VPS (Hosterion)](#deployment-pe-vps-hosterion)
- [Securitate](#securitate)
- [Testare](#testare)
- [Structura proiectului](#structura-proiectului)

---

## Stack tehnic

- **Next.js** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS**
- **Prisma ORM** + **MySQL**
- **Socket.io** (server + client, pe același port cu Next)
- **NextAuth (Auth.js)** — provider `credentials`
- **argon2** (argon2id) pentru parole
- **Zod** — validare pe client și server
- **react-hook-form** + `@hookform/resolvers/zod`
- **Vitest** — teste

## Arhitectură

Aplicația rulează ca **proces Node.js persistent** (nu serverless). Un server
custom [`server.ts`](./server.ts) pornește Next.js și atașează Socket.io pe
**același HTTP server / port**. Real-time-ul este 100% intern (fără Pusher/Ably).

- Instanța Socket.io este expusă pe `globalThis.__io`; server actions o folosesc
  pentru a emite evenimente (`ticket:new`, `ticket:paid`) către camera `reception`.
- Conexiunile Socket.io sunt **autentificate la handshake** (se verifică JWT-ul
  de sesiune din cookie). Un client neautentificat nu primește evenimente.
- Se rulează **o singură instanță** (pm2 `fork`) pentru sticky sessions Socket.io
  și pentru rate limiter-ul in-memory.

**Principiu cheie de date:** prețul fiecărei linii de tichet este salvat ca
_snapshot_ în `TicketItem.price` la momentul creării. Modificarea ulterioară a
`Procedure.defaultPrice` **nu** alterează tichetele istorice.

## Roluri

| Rol         | Acces                                                                 |
| ----------- | --------------------------------------------------------------------- |
| `NURSE`     | Creează tichete doar pentru specialitatea contului ei.                |
| `RECEPTION` | Vede coada tuturor tichetelor `PENDING` și le încasează.              |
| `ADMIN`     | Configurează specialități, medici, proceduri, prețuri și conturi.     |

Autorizarea se verifică pe **server** (middleware + în fiecare server action),
nu doar în UI.

## Cerințe

- Node.js **≥ 20** (recomandat 20 LTS sau mai nou)
- MySQL **8+** (sau MariaDB compatibil)
- npm

## Instalare (dezvoltare)

```bash
# 1. Dependențe
npm install

# 2. Variabile de mediu
cp .env.example .env
#   editează .env — cel puțin DATABASE_URL, AUTH_SECRET, credențialele de seed
#   generează un secret: openssl rand -base64 32

# 3. Migrare bază de date + client Prisma
npm run prisma:migrate       # creează schema în MySQL (dev)

# 4. Seed (admin + conturi/date demo)
npm run seed

# 5. Pornire în dev (Next + Socket.io pe :3000)
npm run dev
```

Aplicația pornește pe `http://localhost:3000`. Conturile demo sunt cele din
variabilele `SEED_*` (implicit: `admin`, `receptie`, `asistenta`).

## Variabile de mediu

Vezi [`.env.example`](./.env.example). Rezumat:

| Variabilă                 | Descriere                                                        |
| ------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`            | Conexiune MySQL (`mysql://user:pass@host:3306/db`).              |
| `AUTH_SECRET`             | Secret pentru JWT/CSRF (`openssl rand -base64 32`).              |
| `AUTH_URL`                | URL-ul public complet (prod, în spatele nginx).                 |
| `AUTH_TRUST_HOST`         | `true` când rulezi în spatele unui reverse proxy.               |
| `PORT` / `HOSTNAME`       | Portul și adresa de bind ale serverului Node.                   |
| `SOCKET_ALLOWED_ORIGINS`  | Origini permise pentru CORS-ul Socket.io (prod).                |
| `SEED_ADMIN_*` etc.       | Credențiale pentru scriptul de seed.                            |

> **Nu comite** niciodată `.env` cu valori reale.

## Comenzi

| Comandă                   | Efect                                                    |
| ------------------------- | -------------------------------------------------------- |
| `npm run dev`             | Dezvoltare (server custom + HMR).                        |
| `npm run build`           | `prisma generate` + build Next de producție.             |
| `npm run start`           | Pornește serverul de producție (`server.ts` prin tsx).   |
| `npm run prisma:migrate`  | Migrare în dev.                                           |
| `npm run prisma:deploy`   | Aplică migrările în producție.                            |
| `npm run seed`            | Rulează seed-ul.                                          |
| `npm run typecheck`       | Verificare TypeScript.                                    |
| `npm run lint`            | ESLint.                                                   |
| `npm test`                | Teste Vitest.                                             |

## Deployment pe VPS (Docker + Caddy)

Aplicația rulează **doar pe HTTPS, în spatele unui reverse proxy**.

Instalarea curentă (VPS Hetzner, `nurse-reception.sanmedica.ro`) folosește
**Docker Compose** în spatele **Caddy**, care deține deja porturile 80/443 pe
server și emite automat certificate Let's Encrypt. Aplicația și MySQL rulează în
containere; niciun port nu e publicat pe host.

```
Internet ──HTTPS──► Caddy (container) ──HTTP──► clinica-app:3000
                                                     │
                                              rețea privată
                                                     ▼
                                              clinica-mysql:3306
```

### 1. DNS

Creează o înregistrare **A** pentru subdomeniu către IP-ul serverului. Caddy nu
poate emite certificatul înainte ca DNS-ul să se propage.

### 2. Cod + configurare

```bash
git clone <repo> /opt/clinica-plata
cd /opt/clinica-plata
cp .env.example .env    # completează valorile REALE de producție
```

Setează în `.env`:

- `DATABASE_URL="mysql://clinica:PAROLA@db:3306/clinica_plata"` — host-ul e `db`,
  numele serviciului MySQL din `compose.prod.yml`.
- `MYSQL_*` — aceleași user/parolă/bază ca în `DATABASE_URL`.
- `AUTH_SECRET` — `openssl rand -base64 32`.
- `AUTH_URL="https://subdomeniul-tau"` și `AUTH_TRUST_HOST="true"`.
- `SOCKET_ALLOWED_ORIGINS="https://subdomeniul-tau"`.
- `HOSTNAME="0.0.0.0"`, `PORT="3000"` (bind în interiorul containerului).

### 3. Pornire

```bash
docker compose -f compose.prod.yml up -d --build
```

Migrațiile Prisma se aplică automat la fiecare pornire (vezi
`docker/entrypoint.sh`). Seed-ul se rulează **o singură dată**, la prima
instalare, într-un container temporar care primește și variabilele `SEED_*`:

```bash
docker compose -f compose.prod.yml run --rm --env-file .env \
  --entrypoint npx app tsx prisma/seed.ts
```

> Rulează **o singură instanță** a aplicației, obligatoriu pentru Socket.io
> (altfel ar fi nevoie de sticky sessions + adapter Redis) și pentru rate
> limiter-ul in-memory.

### 4. Caddy (reverse proxy HTTPS + WebSocket)

Adaugă blocul din [`docs/Caddyfile.example`](./docs/Caddyfile.example) în
Caddyfile-ul serverului, apoi reîncarcă:

```bash
docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Caddy transmite nativ upgrade-ul WebSocket, deci Socket.io funcționează fără
configurație suplimentară.

### 5. Actualizări

Deploy-ul se face din Git:

```bash
# local
git push

# pe server
/opt/clinica-plata/scripts/deploy.sh
```

Scriptul face `git pull`, reconstruiește imaginea și repornește containerul;
migrațiile rulează la pornire.

### Alternativă: Node + pm2 direct pe host

Dacă preferi să rulezi fără Docker, vezi
[`ecosystem.config.cjs`](./ecosystem.config.cjs) și
[`docs/nginx.conf.example`](./docs/nginx.conf.example). Ai nevoie de Node ≥ 20,
MySQL 8 și nginx instalate pe server, iar `.env` trebuie să folosească
`HOSTNAME=127.0.0.1` și un `DATABASE_URL` către MySQL-ul local.

## Securitate

- Parole hash-uite cu **argon2id** (parametri OWASP). Nicăieri în plaintext.
- **Autorizare pe server** la fiecare server action (rol + apartenența la
  specialitate pentru asistente). Un `NURSE` nu poate crea tichete sau vedea
  proceduri ale altei specialități.
- **Validare Zod** pe toate input-urile, pe server (nu doar în client).
- **Rate limiting** pe login (5/5min/IP) și pe crearea de tichete (40/min).
- **CSRF**: server actions Next au protecție încorporată; NextAuth pentru auth.
- **Security headers**: `Content-Security-Policy` (cu nonce), `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`,
  `Permissions-Policy` (vezi `middleware.ts` + `next.config.mjs`).
- **Cookie-uri** `httpOnly`, `secure` (prod), `sameSite=lax`.
- **Fără SQL injection**: exclusiv Prisma parametrizat (fără query raw din input).
- **Fără XSS**: textul introdus de utilizatori e randat ca text (React escapează);
  nu se folosește `dangerouslySetInnerHTML`.
- **Audit**: `createdByUserId` / `paidByUserId` pe fiecare tichet.
- Erorile către client sunt generice; fără stack trace-uri sau detalii interne.
- Login-ul nu dezvăluie dacă username-ul există (mesaj generic + timp constant).

## Testare

```bash
npm test
```

Acoperă logica critică: calculul totalului unui tichet (sigur la virgulă mobilă),
autorizarea pe rol (`canAccess`) și validarea schemelor de tichet.

## Structura proiectului

```
server.ts                     # server Node custom: Next + Socket.io
prisma/
  schema.prisma               # modele de date
  seed.ts                     # date de bootstrap
src/
  auth.ts, auth.config.ts     # NextAuth (config edge-safe separat)
  middleware.ts               # gating pe rol + security headers + CSP
  app/
    login/                    # autentificare
    nurse/                    # flux asistentă (formular tichet)
    reception/                # coadă real-time + încasare
    admin/                    # specialități, medici, proceduri, utilizatori
    api/auth/[...nextauth]/   # handler NextAuth
  components/ui/              # componente reutilizabile (design system)
  features/
    tickets/                  # server actions + queries tichete
    admin/                    # server actions + queries admin
  lib/                        # prisma, password, rbac, rate-limit, realtime, ...
  types/                      # tipuri partajate (realtime, next-auth)
tests/                        # Vitest
docs/nginx.conf.example       # exemplu reverse proxy
ecosystem.config.cjs          # configurație pm2
```
