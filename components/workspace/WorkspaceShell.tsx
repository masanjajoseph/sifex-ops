"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TopNavbar } from "./TopNavbar";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";
import { usePermissions } from "@/hooks/usePermissions";
import { SYSTEM_MODULES } from "@/config/modules";
import {
  LayoutGrid,
  Plane,
  PackageOpen,
  Warehouse,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid,
  Plane,
  PackageOpen,
  Warehouse,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Settings,
};

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { hasAnyPermission, hasRole } = usePermissions();

  const isSuperAdmin = hasRole("SUPER_ADMIN");

  const mobileNavItems = useMemo(() => {
    const modules = SYSTEM_MODULES.filter((m) => m.mobileVisible).filter(
      (m) => isSuperAdmin || hasAnyPermission(m.requiredPermissions)
    );

    const activePath = pathname;

    return [
      {
        id: "workspace",
        label: "Workspace",
        icon: <LayoutGrid className="w-5 h-5" />,
        href: "/workspace",
        active: activePath === "/workspace",
      },
      ...modules.slice(0, 4).map((mod) => {
        const Icon = ICON_MAP[mod.icon] ?? LayoutGrid;
        return {
          id: mod.id,
          label: mod.name,
          icon: <Icon className="w-5 h-5" />,
          href: mod.path,
          active: activePath.startsWith(mod.path),
        };
      }),
    ];
  }, [pathname, hasAnyPermission, isSuperAdmin]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <TopNavbar onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-4 md:p-6 pb-20 lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
