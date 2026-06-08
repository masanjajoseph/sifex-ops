"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plane, PackageOpen, Warehouse, Receipt, Truck, Users,
  UserCog, ShoppingCart, BarChart3, Settings, ChevronRight,
  LayoutGrid, X, Package, MapPin, Shield, FileText, FileSpreadsheet,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { SYSTEM_MODULES } from "@/config/modules";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Plane, PackageOpen, Warehouse, Receipt, Truck, Users,
  UserCog, ShoppingCart, BarChart3, Settings, Package,
  MapPin, Shield, FileText, FileSpreadsheet,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}

export function Sidebar({ isOpen, onClose, collapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { hasAnyPermission, hasRole, isLoading } = usePermissions();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Operations", "Logistics"]));

  const isSuperAdmin = hasRole("SUPER_ADMIN");

  const accessibleModules = SYSTEM_MODULES.filter((mod) =>
    isSuperAdmin || hasAnyPermission(mod.requiredPermissions)
  ).sort((a, b) => (a.sidebarConfig?.order ?? 99) - (b.sidebarConfig?.order ?? 99));

  // Group modules
  const groups = accessibleModules.reduce<Record<string, typeof SYSTEM_MODULES>>((acc, mod) => {
    const group = mod.sidebarConfig?.group ?? "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(mod);
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const sidebarContent = (
    <nav className="flex flex-col h-full">
      {/* Workspace launcher link */}
      <div className="px-3 py-2">
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
          {!collapsed && <span>Workspace</span>}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : Object.entries(groups).length === 0 ? (
          <div className="px-2.5 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
            No modules available
          </div>
        ) : (Object.entries(groups).map(([group, modules]) => (
          <div key={group}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {group}
                <ChevronRight
                  className={cn(
                    "w-3 h-3 transition-transform",
                    expandedGroups.has(group) && "rotate-90"
                  )}
                />
              </button>
            )}

            {(collapsed || expandedGroups.has(group)) && (
              <div className="space-y-0.5">
                {modules.map((mod) => {
                  const Icon = ICON_MAP[mod.icon] ?? Settings;
                  const isActive = pathname.startsWith(mod.path);

                  return (
                    <Link
                      key={mod.id}
                      href={mod.path}
                      onClick={onClose}
                      title={collapsed ? mod.name : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{mod.name}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )))}
      </div>

      {/* Collapse toggle (desktop) */}
      {onCollapsedChange && (
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="flex items-center gap-2 px-2.5 py-2 w-full rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-transform duration-200 lg:hidden",
          collapsed ? "w-16" : "w-64",
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

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
