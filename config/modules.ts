// Enterprise module registry system

export enum ModuleCategory {
  OPERATIONS = "operations",
  FINANCE = "finance",
  LOGISTICS = "logistics",
  MANAGEMENT = "management",
  SYSTEM = "system",
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  category: ModuleCategory;
  requiredPermissions: string[];
  mobileVisible: boolean;
  sidebarConfig?: {
    order: number;
    group?: string;
    children?: Array<{
      name: string;
      path: string;
      permission: string;
    }>;
  };
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  {
    id: "export",
    name: "Export Operations",
    description: "Manage export shipments and documentation",
    icon: "Plane",
    path: "/workspace/export",
    color: "bg-blue-500",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["export.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 1,
      group: "Operations",
    },
  },
  {
    id: "import",
    name: "Import Operations",
    description: "Handle import clearance and processing",
    icon: "PackageOpen",
    path: "/workspace/import",
    color: "bg-green-500",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["import.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 2,
      group: "Operations",
    },
  },
  {
    id: "warehouse",
    name: "Warehouse",
    description: "Warehouse operations and inventory",
    icon: "Warehouse",
    path: "/workspace/warehouse",
    color: "bg-orange-500",
    category: ModuleCategory.LOGISTICS,
    requiredPermissions: ["warehouse.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 3,
      group: "Logistics",
    },
  },
  {
    id: "billing",
    name: "Billing",
    description: "Invoicing and financial management",
    icon: "Receipt",
    path: "/workspace/billing",
    color: "bg-purple-500",
    category: ModuleCategory.FINANCE,
    requiredPermissions: ["billing.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 4,
      group: "Finance",
    },
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "Delivery management and rider tracking",
    icon: "Truck",
    path: "/workspace/delivery",
    color: "bg-red-500",
    category: ModuleCategory.LOGISTICS,
    requiredPermissions: ["delivery.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 5,
      group: "Logistics",
    },
  },
  {
    id: "customers",
    name: "Customers",
    description: "Customer relationship management",
    icon: "Users",
    path: "/workspace/customers",
    color: "bg-cyan-500",
    category: ModuleCategory.MANAGEMENT,
    requiredPermissions: ["customers.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 6,
      group: "Management",
    },
  },
  {
    id: "hr",
    name: "Human Resources",
    description: "HR and attendance management",
    icon: "UserCog",
    path: "/workspace/hr",
    color: "bg-pink-500",
    category: ModuleCategory.MANAGEMENT,
    requiredPermissions: ["hr.view"],
    mobileVisible: false,
    sidebarConfig: {
      order: 7,
      group: "Management",
    },
  },
  {
    id: "procurement",
    name: "Procurement",
    description: "Procurement and vendor management",
    icon: "ShoppingCart",
    path: "/workspace/procurement",
    color: "bg-yellow-500",
    category: ModuleCategory.MANAGEMENT,
    requiredPermissions: ["procurement.view"],
    mobileVisible: false,
    sidebarConfig: {
      order: 8,
      group: "Management",
    },
  },
  {
    id: "reports",
    name: "Reports",
    description: "Analytics and business intelligence",
    icon: "BarChart3",
    path: "/workspace/reports",
    color: "bg-indigo-500",
    category: ModuleCategory.SYSTEM,
    requiredPermissions: ["reports.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 9,
      group: "Analytics",
    },
  },
  {
    id: "settings",
    name: "Settings",
    description: "System configuration and preferences",
    icon: "Settings",
    path: "/workspace/settings",
    color: "bg-gray-500",
    category: ModuleCategory.SYSTEM,
    requiredPermissions: ["settings.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 10,
      group: "System",
    },
  },
  {
    id: "master-awb",
    name: "Master AWB",
    description: "Master air waybill management",
    icon: "FileText",
    path: "/workspace/master-awb",
    color: "bg-blue-600",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["master-awb.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 11,
      group: "Operations",
    },
  },
  {
    id: "house-awb",
    name: "House AWB",
    description: "House air waybill processing",
    icon: "FileText",
    path: "/workspace/house-awb",
    color: "bg-cyan-600",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["house-awb.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 12,
      group: "Operations",
    },
  },
  {
    id: "parcels",
    name: "Parcels",
    description: "Parcel and small package management",
    icon: "Package",
    path: "/workspace/parcels",
    color: "bg-teal-500",
    category: ModuleCategory.LOGISTICS,
    requiredPermissions: ["parcels.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 13,
      group: "Logistics",
    },
  },
  {
    id: "tracking",
    name: "Tracking",
    description: "Real-time shipment tracking and visibility",
    icon: "MapPin",
    path: "/workspace/tracking",
    color: "bg-emerald-500",
    category: ModuleCategory.LOGISTICS,
    requiredPermissions: ["tracking.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 14,
      group: "Logistics",
    },
  },
  {
    id: "customs",
    name: "Customs",
    description: "Customs clearance and compliance management",
    icon: "Shield",
    path: "/workspace/customs",
    color: "bg-amber-500",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["customs.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 15,
      group: "Operations",
    },
  },
  {
    id: "flights",
    name: "Flights",
    description: "Flight scheduling and cargo space management",
    icon: "Plane",
    path: "/workspace/flights",
    color: "bg-indigo-500",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["flights.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 16,
      group: "Operations",
    },
  },
  {
    id: "manifests",
    name: "Manifests",
    description: "Cargo manifest creation and management",
    icon: "FileSpreadsheet",
    path: "/workspace/manifests",
    color: "bg-lime-500",
    category: ModuleCategory.OPERATIONS,
    requiredPermissions: ["manifests.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 17,
      group: "Operations",
    },
  },
  {
    id: "quotes",
    name: "Quotes",
    description: "Freight quote generation and pricing",
    icon: "FileText",
    path: "/workspace/quotes",
    color: "bg-violet-500",
    category: ModuleCategory.FINANCE,
    requiredPermissions: ["quotes.view"],
    mobileVisible: true,
    sidebarConfig: {
      order: 18,
      group: "Finance",
    },
  },
  {
    id: "users",
    name: "User Management",
    description: "User accounts, roles, and permissions",
    icon: "Users",
    path: "/workspace/users",
    color: "bg-slate-500",
    category: ModuleCategory.SYSTEM,
    requiredPermissions: ["users.view"],
    mobileVisible: false,
    sidebarConfig: {
      order: 19,
      group: "System",
    },
  },
];

export const getModulesByCategory = (category: ModuleCategory) =>
  SYSTEM_MODULES.filter((m) => m.category === category);

export const getModuleById = (id: string) => SYSTEM_MODULES.find((m) => m.id === id);

export const getAccessibleModules = (userPermissions: string[]) =>
  SYSTEM_MODULES.filter((module) =>
    module.requiredPermissions.some((perm) => userPermissions.includes(perm))
  );
