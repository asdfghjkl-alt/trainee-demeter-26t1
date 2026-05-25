import { NextRequest, NextResponse } from "next/server";
import { updateSessionMiddleware } from "./lib/session";

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";



  // In production, generate a per-request cryptographic nonce so we can drop
  // 'unsafe-inline' from script-src / style-src. In development we keep
  // 'unsafe-inline' (and 'unsafe-eval') for HMR compatibility.
  const nonce = isDev
    ? null
    : Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
        "base64",
      );

  const scriptSrc = isDev
    ? `'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://unpkg.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://api.mapbox.com https://unpkg.com`;



  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://api.mapbox.com https://unpkg.com;
    img-src 'self' blob: data: https://api.mapbox.com https://*.mapbox.com;
    connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://events.mapbox.com https://api.transport.nsw.gov.au;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    frame-src 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Forward the nonce and the CSP to Server Components via request headers
  // Next.js uses this to attach the nonce to its internal hydration scripts
  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", cspHeader);
  }

  // Run session middleware, carrying the updated request headers
  const response = await updateSessionMiddleware(
    new NextRequest(request, { headers: requestHeaders }),
  );

  // Apply CSP to the outgoing response
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};
