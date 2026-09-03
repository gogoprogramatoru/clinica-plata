/**
 * Un singur adevăr despre "aplicația este servită peste HTTPS", derivat din
 * protocolul lui `AUTH_URL`.
 *
 * De ce nu `NODE_ENV`: instalarea din clinică rulează în producție, dar peste
 * HTTP simplu, în rețeaua locală (fără domeniu public, fără certificat).
 * Auth.js alege prefixul cookie-ului de sesiune după protocolul din `AUTH_URL`
 * (`__Secure-` doar pe https), deci middleware-ul și handshake-ul Socket.io
 * trebuie să caute exact același cookie. Legate de `NODE_ENV`, ar căuta
 * `__Secure-…` pe o instalare http, n-ar găsi sesiunea și login-ul ar intra în
 * buclă la /login.
 *
 * Fișierul nu importă nimic intenționat: este folosit atât din middleware
 * (edge runtime), cât și din `server.ts` (rulat de tsx, în afara bundle-ului
 * Next). Citirea se face la fiecare apel, nu la încărcarea modulului, ca
 * valoarea să vină din mediul containerului, nu din momentul build-ului.
 */
export function isHttpsDeployment(): boolean {
  return (process.env.AUTH_URL ?? "").trim().toLowerCase().startsWith("https://");
}
