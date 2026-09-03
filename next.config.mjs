/** @type {import('next').NextConfig} */

// Security headers applied to every response. Note: middleware.ts sets a
// per-request nonce-based CSP; the CSP here is a static fallback that also
// covers static assets served outside the middleware matcher.
//
// HSTS is NOT here: headers from next.config are baked into the build, iar
// aceeași imagine rulează și în spatele HTTPS (VPS), și peste http, în rețeaua
// locală a clinicii. Îl setează middleware-ul, la runtime, doar când AUTH_URL
// este https (vezi src/lib/deployment.ts).

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fixează rădăcina pentru file tracing la acest proiect (evită inferența
  // greșită când există lockfile-uri în directoare părinte).
  outputFileTracingRoot: import.meta.dirname,
  // Prisma + argon2 are native/server-only deps; keep them external to the
  // server bundle so their binaries are resolved at runtime.
  serverExternalPackages: ["@prisma/client", "argon2"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
