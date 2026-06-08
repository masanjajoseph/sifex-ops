import { ReactNode } from "react";
import Image from "next/image";
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
      <div className="hidden lg:flex lg:w-[55%] flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
        {/* Grid background pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Red gradient overlay - subtle brand accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/3 blur-3xl rounded-full" />

        {/* Cargo route lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07]"
          viewBox="0 0 800 600"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="r1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="r2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="white" />
            </linearGradient>
          </defs>
          <path d="M 0 300 Q 150 150 300 300 T 600 200 T 800 350" fill="none" stroke="url(#r1)" strokeWidth="2" />
          <path d="M 0 400 Q 200 500 400 350 T 700 450 T 800 250" fill="none" stroke="url(#r2)" strokeWidth="1.5" />
          <circle cx="300" cy="300" r="4" fill="#ef4444" opacity="0.5" />
          <circle cx="600" cy="200" r="4" fill="white" opacity="0.4" />
          <circle cx="400" cy="350" r="3" fill="#ef4444" opacity="0.4" />
          <circle cx="700" cy="450" r="3" fill="white" opacity="0.3" />
        </svg>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-between p-8 lg:p-12">
          <LoginHero />

          {/* Footer message */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 leading-relaxed">
              Sifex ERP | International Air Cargo Operations Platform
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
          <Image
            src="/logo.png"
            alt="Sifex ERP"
            width={100}
            height={41}
            priority
            className="object-contain"
            style={{ width: "auto", height: 32 }}
          />
        </div>

        {/* Logo above card — visible on desktop, hidden on mobile (mobile has its own header) */}
        <div className="hidden lg:flex justify-center pt-6 pb-2">
          <Image
            src="/logo.png"
            alt="Sifex ERP"
            width={130}
            height={53}
            priority
            className="object-contain"
            style={{ width: "auto", height: 48 }}
          />
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
              &copy; 2025 Sifex ERP. All rights reserved. Enterprise cargo operations platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
