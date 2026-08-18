import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Link2Off } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const session = await auth();

  if (session) {
    redirect("/workspace");
  }

  const { token } = await searchParams;
  const isValidToken =
    typeof token === "string" &&
    token.length > 0 &&
    (await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
      select: { id: true },
    })) !== null;

  return (
    <AuthLayout>
      {!isValidToken ? (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Invalid or expired link
            </h2>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <Link2Off className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              Reset links expire after 1 hour. Request a new one to continue.
            </p>
          </div>

          <Link href="/forgot-password" className="block">
            <Button className="w-full h-10" size="lg">
              Request New Link
            </Button>
          </Link>
        </div>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </AuthLayout>
  );
}