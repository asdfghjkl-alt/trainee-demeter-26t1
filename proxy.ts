import { NextRequest } from "next/server";
import { updateSessionMiddleware } from "./lib/session";

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://api.mapbox.com https://unpkg.com;
    style-src 'self' 'unsafe-inline' https://api.mapbox.com https://unpkg.com;
    img-src 'self' blob: data: https://api.mapbox.com https://*.mapbox.com;
    connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://events.mapbox.com https://api.transport.nsw.gov.au;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    frame-src 'self';
  `.replace(/\s{2,}/g, " ").trim();

  // Run session middleware
  const response = await updateSessionMiddleware(request);

  // Apply CSP to the outgoing response
  response.headers.set("Content-Security-Policy", cspHeader);

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
