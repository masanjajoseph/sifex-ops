'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Grid, List, Plane, PackageOpen, Warehouse, Receipt, Truck, Users, UserCog, ShoppingCart, BarChart3, Settings, Package, MapPin, Shield, FileText, FileSpreadsheet } from 'lucide-react';
import { AppCard } from '@/components/ui/AppCard';
import { SYSTEM_MODULES, ModuleCategory } from '@/config/modules';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Plane,
  PackageOpen,
  Warehouse,
  Receipt,
  Truck,
  Users,
  UserCog,
  ShoppingCart,
  BarChart3,
  Settings,
  Package,
  MapPin,
  Shield,
  FileText,
  FileSpreadsheet,
};

interface AppLauncherProps {
  userPermissions: string[];
  recentlyUsed?: string[];
  favorites?: string[];
}

export function AppLauncher({
  userPermissions,
  recentlyUsed = [],
  favorites = [],
}: AppLauncherProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all');

  const accessibleModules = useMemo(() => {
    return getAccessibleModules(userPermissions);
  }, [userPermissions]);

  const filteredModules = useMemo(() => {
    let result = accessibleModules;

    if (selectedCategory !== 'all') {
      result = result.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [accessibleModules, selectedCategory, searchQuery]);

  const sortedModules = useMemo(() => {
    return [...filteredModules].sort((a, b) => {
      const aIsFavorite = favorites.includes(a.id);
      const bIsFavorite = favorites.includes(b.id);
      if (aIsFavorite !== bIsFavorite) return bIsFavorite ? 1 : -1;

      const aIsRecent = recentlyUsed.includes(a.id);
      const bIsRecent = recentlyUsed.includes(b.id);
      if (aIsRecent !== bIsRecent) return bIsRecent ? 1 : -1;

      return a.name.localeCompare(b.name);
    });
  }, [filteredModules, favorites, recentlyUsed]);

  const categories = Object.values(ModuleCategory);

  const handleModuleClick = (path: string) => {
    router.push(path);
  };

  const getIcon = (iconName: string) => {
    return (ICON_MAP[iconName] || Package) as React.ElementType;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workspace</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {accessibleModules.length} accessible modules
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <SearchInput
              placeholder="Search modules..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded px-3 py-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded px-3 py-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600'
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors',
                selectedCategory === category
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid/List */}
      {sortedModules.length > 0 ? (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'space-y-2'
          )}
        >
          {sortedModules.map((module) => (
            <AppCard
              key={module.id}
              icon={getIcon(module.icon)}
              title={module.name}
              description={module.description}
              category={module.category}
              onClick={() => handleModuleClick(module.path)}
              className={cn(
                viewMode === 'list' && '!flex-row items-center justify-between'
              )}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? 'No modules found matching your search'
              : 'No modules available for your role'}
          </p>
        </div>
      )}
    </div>
  );
}

function getAccessibleModules(userPermissions: string[]) {
  return SYSTEM_MODULES.filter((module) =>
    module.requiredPermissions.some((perm) => userPermissions.includes(perm))
  );
}
