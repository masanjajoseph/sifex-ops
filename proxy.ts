import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

function addCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  const isRootPath = pathname === "/";
  const isLoginPath = pathname === "/login" || pathname === "/(auth)/login";
  const isWorkspaceRoute = pathname.startsWith("/workspace") || pathname.startsWith("/(workspace)");
  const isApiAuthRoute = pathname.startsWith("/api/auth");

  // Always allow auth API routes
  if (isApiAuthRoute) {
    const response = NextResponse.next();
    return addCorsHeaders(response, origin);
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;

  // Root path: redirect based on auth status
  if (isRootPath) {
    if (isLoggedIn) {
      return addCorsHeaders(NextResponse.redirect(new URL("/workspace", req.url)), origin);
    }
    return addCorsHeaders(NextResponse.redirect(new URL("/login", req.url)), origin);
  }

  // Redirect unauthenticated users away from workspace
  if (isWorkspaceRoute && !isLoggedIn) {
    return addCorsHeaders(NextResponse.redirect(new URL("/login", req.url)), origin);
  }

  // Redirect authenticated users away from login
  if (isLoginPath && isLoggedIn) {
    return addCorsHeaders(NextResponse.redirect(new URL("/workspace", req.url)), origin);
  }

  return addCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
