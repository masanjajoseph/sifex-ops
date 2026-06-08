"use client";

import { ShieldCheck, Lock } from "lucide-react";

export function SecurityBadge() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
        <ShieldCheck className="w-4 h-4 text-primary/70" />
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
          <Lock className="w-3 h-3" />
          Protected enterprise session
        </div>
        <p className="text-[11px] text-muted-foreground leading-tight">
          Encrypted connection with audit tracking and access logging
        </p>
      </div>
    </div>
  );
}
