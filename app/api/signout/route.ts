import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const past = new Date(0);
  const response = NextResponse.redirect(
    new URL("/login", process.env.AUTH_URL || "http://localhost:3000")
  );

  const cookiesToClear = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Secure-authjs.csrf-token",
    "next-auth.session-token",
  ];

  for (const name of cookiesToClear) {
    response.cookies.set(name, "", {
      expires: past,
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-"),
    });
  }

  return response;
}
