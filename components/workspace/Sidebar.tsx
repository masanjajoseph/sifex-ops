"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4">
        <Link
          href="/workspace"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/workspace"
              ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Workspace</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-transform duration-200 lg:hidden w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Navigation</span>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <aside
        className="hidden lg:flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-16 shrink-0"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
