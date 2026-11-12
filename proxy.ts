import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log("[auth:middleware] start", { pathname });

  // Behind the HTTPS reverse proxy the session cookie is named
  // __Secure-authjs.session-token, so getToken() must know the request is secure.
  const isSecure =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecure,
  });

  const isLoggedIn = !!token;
  console.log("[auth:middleware] token present:", isLoggedIn);

  // Root path: redirect based on auth state
  if (pathname === "/") {
    const dest = isLoggedIn ? "/workspace" : "/login";
    console.log("[auth:middleware] redirect / ->", dest);
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Workspace routes: require auth
  if (pathname.startsWith("/workspace") && !isLoggedIn) {
    console.log("[auth:middleware] workspace without auth, redirecting to login");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Login routes: redirect to workspace if already logged in
  if (pathname.startsWith("/login") && isLoggedIn) {
    console.log("[auth:middleware] already logged in, redirecting to workspace");
    return NextResponse.redirect(new URL("/workspace", req.url));
  }

  console.log("[auth:middleware] pass through");
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/workspace/:path*", "/login/:path*"],
};
