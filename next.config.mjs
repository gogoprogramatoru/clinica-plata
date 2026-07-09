/** @type {import('next').NextConfig} */

// Security headers applied to every response. Note: middleware.ts sets a
// per-request nonce-based CSP; the CSP here is a static fallback that also
// covers static assets served outside the middleware matcher.
const isProd = process.env.NODE_ENV === "production";

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
  // HSTS is only meaningful over HTTPS; enabled in production (behind nginx TLS).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
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
