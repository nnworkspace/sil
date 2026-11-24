import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The `jewelry` category was renamed to `jewellery` (#282). Permanent, so a
  // bookmark or a shared link keeps working: the slug moved, and a moved URL
  // that 404s silently is the one cost a rename must not have.
  async redirects() {
    return [
      { source: "/category/jewelry", destination: "/category/jewellery", permanent: true },
    ];
  },
  experimental: {
    // Photo uploads go through Server Actions; the default 1 MB body limit is
    // far too small for real phone photos. Raise it to allow several multi-MB
    // images per submit.
    serverActions: {
      bodySizeLimit: "30mb",
    },
    // Every request passes through `src/proxy.ts` (the auth gate), and Next.js
    // clones the request body to feed the proxy. That clone has its OWN cap,
    // defaulting to 10 MB, and on exceeding it Next silently *truncates* the
    // stream rather than erroring, so the Server Action receives half a
    // multipart body and the parser throws "Unexpected end of form" (#150).
    // It bites before `serverActions.bodySizeLimit` applies, so both must be
    // raised together and kept in step.
    // (Formerly `middlewareClientMaxBodySize`, deprecated with middleware →
    // proxy in Next.js 16; setting both names throws.)
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
