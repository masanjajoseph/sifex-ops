'use client';

import {
  Plane, PackageOpen, Warehouse, Receipt, Truck, Users,
  UserCog, ShoppingCart, BarChart3, Settings, Package,
  MapPin, Shield, FileText, FileSpreadsheet, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { SYSTEM_MODULES } from '@/config/modules';

const ICON_MAP: Record<string, React.ElementType> = {
  Plane, PackageOpen, Warehouse, Receipt, Truck, Users,
  UserCog, ShoppingCart, BarChart3, Settings, Package,
  MapPin, Shield, FileText, FileSpreadsheet,
};

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Workspace
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quick access to all modules and tools
          </p>
        </div>
        <Link
          href="/workspace/export"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          New Shipment
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {SYSTEM_MODULES.map((mod) => {
          const Icon = ICON_MAP[mod.icon];
          return (
            <Link
              key={mod.id}
              href={mod.path}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110 ${mod.color}`}
                >
                  {Icon && <Icon className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {mod.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {mod.description}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                Open <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
