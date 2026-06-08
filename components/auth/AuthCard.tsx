"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[420px]">
      <Card className="border-border/50 backdrop-blur-sm">
        <CardContent className="p-8">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
