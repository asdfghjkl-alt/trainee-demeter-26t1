import { NextRequest, NextResponse } from "next/server";
import { applySessionRefresh } from "./lib/session";

export async function proxy(request: NextRequest) {
  // 1. Generate Nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""} https://api.mapbox.com https://unpkg.com;
    style-src 'self' 'nonce-${nonce}' https://api.mapbox.com https://unpkg.com;
    img-src 'self' blob: data: https://api.mapbox.com https://*.mapbox.com;
    connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://events.mapbox.com https://api.transport.nsw.gov.au;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    frame-src 'self';
  `.replace(/\s{2,}/g, " ").trim();

  // 2. Set x-nonce and CSP on the request headers so Next.js injects
  //    nonce="..." into <script> and <style> tags during SSR
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // 3. Build the response, forwarding the modified request headers to the renderer.
  //    This is the critical step — NextResponse.next({ request }) is what makes
  //    Next.js read x-nonce and stamp it onto inline scripts.
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // 4. Refresh the session JWT cookie if one is present (side effect only)
  await applySessionRefresh(request, response);

  // 5. Apply CSP and nonce to the outgoing response headers
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);

  return response;
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
