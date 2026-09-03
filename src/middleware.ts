import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@prisma/client";

import { canAccess, isProtectedPath, ROLE_HOME } from "@/lib/rbac";
import { isHttpsDeployment } from "@/lib/deployment";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Construiește un Content-Security-Policy cu nonce. Next.js citește acest
 * header de pe REQUEST și aplică automat nonce-ul pe scripturile sale inline.
 *
 * `upgrade-insecure-requests` depinde de protocolul pe care e servită
 * aplicația, nu de NODE_ENV: pe o instalare locală, în http, ar rescrie
 * cererile către https://IP și ar rupe toate asset-urile.
 */
function buildCsp(nonce: string, https: boolean): string {
  const directives = [
    `default-src 'self'`,
    // În dev, Next folosește eval pentru HMR.
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    // Stiluri inline necesare pentru Next/styled-jsx; Tailwind e compilat.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    // 'self' acoperă WebSocket-urile same-origin (Socket.io). În dev permitem ws.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(https ? [`upgrade-insecure-requests`] : []),
  ];
  return directives.join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const https = isHttpsDeployment();

  // --- 1. CSP cu nonce ---
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, https);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js detectează nonce-ul din acest header de request.
  requestHeaders.set("content-security-policy", csp);

  const makeResponse = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("content-security-policy", csp);
    // HSTS are sens doar peste HTTPS. Îl setăm aici, la runtime, pentru că
    // headerele din next.config.mjs sunt fixate la build, când nu se știe încă
    // pe ce protocol va fi servită instanța.
    if (https) {
      res.headers.set(
        "strict-transport-security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }
    return res;
  };

  // --- 2. Autentificare + autorizare pe rol ---
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // Trebuie să corespundă prefixului cookie-ului scris de Auth.js, care
    // depinde de protocolul din AUTH_URL. Vezi src/lib/deployment.ts.
    secureCookie: https,
  });
  const role = token?.role as Role | undefined;
  const isLoggedIn = Boolean(token);

  // Utilizator logat care accesează /login → trimite la home-ul rolului.
  if (isLoggedIn && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = role ? ROLE_HOME[role] : "/";
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname)) {
    if (!isLoggedIn) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    // Logat, dar fără dreptul de a accesa această zonă → trimite la home-ul lui.
    if (!canAccess(pathname, role)) {
      const url = req.nextUrl.clone();
      url.pathname = role ? ROLE_HOME[role] : "/login";
      return NextResponse.redirect(url);
    }
  }

  return makeResponse();
}

export const config = {
  // Aplică pe toate rutele mai puțin asset-urile statice și API-ul de auth
  // (care își gestionează propriile cookie-uri/headere).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)",
  ],
};
