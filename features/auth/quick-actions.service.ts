export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const ACTION_DEFS: Record<string, QuickAction[]> = {
  "export.view": [
    { id: "new-export", label: "New Export", description: "Create export shipment", icon: "Plane", path: "/workspace/export/new", color: "bg-blue-500" },
  ],
  "export.create": [
    { id: "new-export", label: "New Export", description: "Create export shipment", icon: "Plane", path: "/workspace/export/new", color: "bg-blue-500" },
  ],
  "import.view": [
    { id: "new-import", label: "New Import", description: "Process import shipment", icon: "PackageOpen", path: "/workspace/import/new", color: "bg-green-500" },
  ],
  "warehouse.receive": [
    { id: "receive-shipment", label: "Receive Shipment", description: "Receive cargo into warehouse", icon: "Warehouse", path: "/workspace/warehouse/receive", color: "bg-orange-500" },
  ],
  "warehouse.view": [
    { id: "warehouse-view", label: "View Warehouse", description: "View warehouse status", icon: "Warehouse", path: "/workspace/warehouse", color: "bg-orange-500" },
  ],
  "billing.generate": [
    { id: "generate-invoice", label: "Generate Invoice", description: "Create new invoice", icon: "Receipt", path: "/workspace/billing", color: "bg-purple-500" },
  ],
  "billing.payment": [
    { id: "receive-payment", label: "Receive Payment", description: "Record customer payment", icon: "Receipt", path: "/workspace/billing", color: "bg-purple-500" },
  ],
  "delivery.assign": [
    { id: "assign-rider", label: "Assign Rider", description: "Assign delivery to rider", icon: "Truck", path: "/workspace/delivery", color: "bg-red-500" },
  ],
  "delivery.view": [
    { id: "print-delivery-note", label: "Print Delivery Note", description: "Print delivery confirmation", icon: "FileText", path: "/workspace/delivery", color: "bg-red-500" },
  ],
  "users.view": [
    { id: "manage-users", label: "Manage Users", description: "View and manage user accounts", icon: "Users", path: "/workspace/users", color: "bg-slate-500" },
  ],
  "users.create": [
    { id: "invite-user", label: "Invite User", description: "Create new user account", icon: "UserPlus", path: "/workspace/users?action=invite", color: "bg-slate-500" },
  ],
  "reports.view": [
    { id: "view-reports", label: "View Reports", description: "Access business reports", icon: "BarChart3", path: "/workspace/reports", color: "bg-indigo-500" },
  ],
  "master-awb.view": [
    { id: "view-master-awb", label: "Master AWBs", description: "View master air waybills", icon: "FileText", path: "/workspace/master-awb", color: "bg-blue-600" },
  ],
  "house-awb.view": [
    { id: "view-house-awb", label: "House AWBs", description: "View house air waybills", icon: "FileText", path: "/workspace/house-awb", color: "bg-cyan-600" },
  ],
};

export function getQuickActions(permissions: string[]): QuickAction[] {
  const seen = new Set<string>();
  const actions: QuickAction[] = [];

  for (const perm of permissions) {
    const defs = ACTION_DEFS[perm];
    if (!defs) continue;
    for (const action of defs) {
      if (!seen.has(action.id)) {
        seen.add(action.id);
        actions.push(action);
      }
    }
  }

  return actions;
}
