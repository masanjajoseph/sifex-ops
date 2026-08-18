import { NextRequest } from "next/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { resetPassword } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { token, password } = await req.json();

  if (!token || typeof token !== "string") {
    return apiError(new Error("Reset token is required"), 400);
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return apiError(new Error("Password must be at least 6 characters"), 400);
  }

  await resetPassword(token, password);

  return apiSuccess({ message: "Password reset successfully. You can now sign in." });
});