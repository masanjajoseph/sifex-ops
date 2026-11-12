import { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";
import { LoginHero } from "./LoginHero";
import { AuthCard } from "./AuthCard";
import { SecurityBadge } from "./SecurityBadge";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Panel — Enterprise Branding & Operations */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gray-950">
        {/* Full-bleed brand image */}
        <Image
          src="/login-hero.jpg"
          alt="Sifex air cargo operations"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />

        {/* Readability overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/20" />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-between p-8 lg:p-12">
          <LoginHero />

          {/* Footer message */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 leading-relaxed">
              Sifex Air Cargo | International Air Cargo Operations Platform
            </p>
            <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono">
              <span>Enterprise</span>
              <span className="w-1 h-1 rounded-full bg-red-500/50" />
              <span>Secure</span>
              <span className="w-1 h-1 rounded-full bg-red-500/50" />
              <span>Audited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Authentication Form */}
      <div className="flex-1 flex flex-col lg:bg-muted/30 relative">
        {/* Mobile header */}
        <div className="lg:hidden px-4 py-4 border-b border-border/50 bg-card">
          <Logo size="sm" priority container />
        </div>

        {/* Logo above card — visible on desktop, hidden on mobile (mobile has its own header) */}
        <div className="hidden lg:flex justify-center pt-60 pb-1">
          <Logo size="lg" priority container />
        </div>

        {/* Main auth card area */}
        <div className="flex-1 flex items-center justify-center px-4 lg:px-8 pb-4 lg:pb-8">
          <AuthCard>{children}</AuthCard>
        </div>

        {/* Footer */}
        <div className="px-4 lg:px-8 py-6 border-t border-border/50 bg-card">
          <div className="max-w-[420px] mx-auto space-y-3">
            <SecurityBadge />
            <p className="text-xs text-muted-foreground text-center">
              &copy; 2025 Sifex Courier. All rights reserved. Enterprise cargo operations platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
