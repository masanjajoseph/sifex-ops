import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/lib/env";

export async function proxy(req: NextRequest) {
  const start = Date.now();
  const { pathname } = req.nextUrl;

  const isRootPath = pathname === "/";
  const isLoginPath = pathname.startsWith("/login");
  const isWorkspaceRoute = pathname.startsWith("/workspace");
  const isApiRoute = pathname.startsWith("/api");
  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname === "/logo.png";

  if (isStaticFile) {
    return NextResponse.next();
  }

  if (isApiRoute && env.PROMETHEUS_ENABLED) {
    const { apiRequestsTotal, httpRequestDuration } = await import("@/lib/monitoring/metrics");
    const response = NextResponse.next();
    const duration = (Date.now() - start) / 1000;
    const url = new URL(req.url);
    const route = url.pathname.replace(/\/[^/]+$/, "/:id");
    apiRequestsTotal.inc({ method: req.method, route, status: response.status });
    httpRequestDuration.observe({ method: req.method, route, status: response.status }, duration);
    return response;
  }

  if (isApiRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;

  if (isRootPath) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/workspace", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isWorkspaceRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPath && isLoggedIn) {
    return NextResponse.redirect(new URL("/workspace", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|logo.png).*)",
  ],
};
