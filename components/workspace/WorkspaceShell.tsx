"use client";

import { TopNavbar } from "./TopNavbar";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <TopNavbar />

      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
