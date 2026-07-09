import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@prisma/client";

import { canAccess, isProtectedPath, ROLE_HOME } from "@/lib/rbac";

const isProd = process.env.NODE_ENV === "production";

/**
 * Construiește un Content-Security-Policy cu nonce. Next.js citește acest
 * header de pe REQUEST și aplică automat nonce-ul pe scripturile sale inline.
 */
function buildCsp(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    // În dev, Next folosește eval pentru HMR.
    `script-src 'self' 'nonce-${nonce}'${isProd ? "" : " 'unsafe-eval'"}`,
    // Stiluri inline necesare pentru Next/styled-jsx; Tailwind e compilat.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    // 'self' acoperă WebSocket-urile same-origin (Socket.io). În dev permitem ws.
    `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isProd ? [`upgrade-insecure-requests`] : []),
  ];
  return directives.join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- 1. CSP cu nonce ---
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js detectează nonce-ul din acest header de request.
  requestHeaders.set("content-security-policy", csp);

  const makeResponse = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("content-security-policy", csp);
    return res;
  };

  // --- 2. Autentificare + autorizare pe rol ---
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: isProd,
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
