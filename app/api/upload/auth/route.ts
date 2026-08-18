import { auth } from "@/lib/auth";
import { getImageKitAuth } from "@/lib/imagekit";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const authParams = getImageKitAuth();
  return apiSuccess(authParams);
});
