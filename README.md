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
- [Instalare locală (Dockge / Proxmox)](#instalare-locală-dockge--proxmox)
- [Deployment pe VPS (Docker + Caddy)](#deployment-pe-vps-docker--caddy)
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

# 2. MySQL local (container doar cu baza de date, pe portul 3307)
docker compose -f compose.dev.yml up -d

# 3. Variabile de mediu
cp .env.example .env
#   editează .env — cel puțin DATABASE_URL, AUTH_SECRET, credențialele de seed
#   generează un secret: openssl rand -base64 32

# 4. Migrare bază de date + client Prisma
npm run prisma:migrate       # creează schema în MySQL (dev)

# 5. Seed (admin + conturi/date demo)
npm run seed

# 6. Pornire în dev (Next + Socket.io pe :3000)
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
| `AUTH_URL`                | Adresa exactă la care se deschide aplicația, fără slash final.   |
| `AUTH_TRUST_HOST`         | `true` când rulezi în spatele unui reverse proxy.               |
| `PORT` / `HOSTNAME`       | Portul și adresa de bind ale serverului Node.                   |
| `APP_PORT`                | Portul publicat pe host de `compose.yaml` (instalare locală).    |
| `SOCKET_ALLOWED_ORIGINS`  | Origini permise pentru CORS-ul Socket.io (prod).                |
| `SEED_ADMIN_*` etc.       | Credențiale pentru scriptul de seed (min. 10 caractere, litere + cifre). |

**`AUTH_URL` decide regimul de securitate**, nu `NODE_ENV` (vezi
[`src/lib/deployment.ts`](./src/lib/deployment.ts)): pe `https://` sesiunea
folosește cookie-uri cu prefix `__Secure-`, răspunsurile poartă HSTS, iar CSP-ul
cere `upgrade-insecure-requests`; pe `http://` — instalarea din rețeaua locală —
niciuna dintre acestea, fiindcă altfel browserul ar refuza cookie-ul de sesiune
și login-ul ar intra în buclă. Trebuie să corespundă adresei reale.

Pentru orice instalare, generează fișierul cu parole aleatoare în loc să-l
completezi manual:

```bash
scripts/gen-env.sh http://192.168.1.50:3000     # sau https://domeniul-tau
```

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
| `scripts/gen-env.sh URL`  | Generează `.env` cu parole aleatoare (chmod 600).         |
| `scripts/seed.sh`         | Seed în stack-ul Docker (o singură dată, la instalare).   |
| `scripts/deploy.sh`       | Update pe server: `git pull` + rebuild + restart.         |

## Instalare locală (Dockge / Proxmox)

Varianta folosită în clinică: un LXC (sau VM) cu Docker pe Proxmox, aplicația
accesibilă **doar din rețeaua locală**, fără domeniu și fără certificat.

```
LAN ──HTTP──► clinica-local-app:3000
                     │
              rețea internă (fără port publicat)
                     ▼
              clinica-local-mysql:3306
```

MySQL rulează într-un container separat, în același stack, atașat doar la
rețeaua internă: nu are port publicat, deci e vizibil exclusiv pentru aplicație.
Datele stau în volumul `clinica-plata-local_mysql_data`.

### 1. Codul în folderul de stack

```bash
git clone <repo> /opt/stacks/clinica-plata
cd /opt/stacks/clinica-plata
```

Dockge citește stack-urile din `/opt/stacks` (sau din `DOCKGE_STACKS_DIR`) și
pornește `compose.yaml` din folder — fișierul este deja în repo, nu trebuie
creat nimic din interfață. Build-ul se face pe server, din sursă, deci folderul
stack-ului trebuie să fie chiar clona repo-ului.

### 2. `.env` cu parole generate

```bash
./scripts/gen-env.sh http://192.168.1.50:3000
```

IP-ul este al LXC-ului cu Docker, nu al nodului Proxmox. Dă-i IP static sau
rezervare DHCP: adresa intră în `AUTH_URL`, iar dacă se schimbă, sesiunile pică.
Notează credențialele afișate de script — parolele nu se mai pot citi ulterior.
Sunt conturi de bootstrap: după primul login, adminul creează conturile reale.

Dacă portul 3000 e ocupat pe server, schimbă în `.env` `APP_PORT` **și** portul
din `AUTH_URL` / `SOCKET_ALLOWED_ORIGINS`.

### 3. Pornire

Apasă **Deploy** în Dockge, sau din terminalul stack-ului:

```bash
docker compose up -d --build
```

Prima pornire durează câteva minute (`npm ci` + build Next în container).
Migrațiile Prisma se aplică automat la fiecare pornire.

### 4. Seed — o singură dată

```bash
./scripts/seed.sh
```

### 5. Actualizări

```bash
COMPOSE_FILE=compose.yaml ./scripts/deploy.sh
```

(echivalent cu `git pull` + **Deploy** din Dockge).

### 6. Backup

Snapshot-ul de LXC nu e suficient pentru o bază de date pornită; ia și un dump:

```bash
docker exec clinica-local-mysql sh -c \
  'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" clinica_plata' > backup-$(date +%F).sql
```

> Traficul este HTTP în clar în LAN: parolele trec necriptat prin switch/WiFi.
> Acceptabil într-o rețea de încredere; pentru expunere în afara ei, pune
> aplicația în spatele unui reverse proxy cu TLS și schimbă `AUTH_URL` în
> `https://…` (restul comportamentului de securitate se aliniază singur).

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
./scripts/gen-env.sh https://subdomeniul-tau    # generează .env cu parole noi
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
COMPOSE_FILE=compose.prod.yml ./scripts/seed.sh
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
- **Cookie-uri** `httpOnly`, `sameSite=lax`, `secure` + prefix `__Secure-` când
  `AUTH_URL` este `https://`. HSTS și `upgrade-insecure-requests` urmează
  același criteriu, decis la runtime (`src/lib/deployment.ts`), pentru ca
  aceeași imagine să funcționeze și în spatele HTTPS, și în rețeaua locală.
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
  lib/deployment.ts           # http vs https (derivat din AUTH_URL)
  types/                      # tipuri partajate (realtime, next-auth)
tests/                        # Vitest
compose.yaml                  # stack pentru instalarea locală (LAN, fără proxy)
compose.prod.yml              # stack pentru VPS, în spatele Caddy
compose.dev.yml               # doar MySQL, pentru development
scripts/                      # gen-env.sh, seed.sh, deploy.sh
docs/nginx.conf.example       # exemplu reverse proxy
ecosystem.config.cjs          # configurație pm2
```
