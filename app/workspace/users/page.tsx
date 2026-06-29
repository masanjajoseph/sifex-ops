'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Users, Shield, RefreshCw, Plus, Mail, Key, UserCheck, Search, X, Loader2, Eye, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  roles: Array<{ id: string; code: string; name: string }>;
  passwordResetRequired: boolean;
  firstLoginAt?: string;
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  _count?: { users: number; positions: number };
}

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  userCount?: number;
  permissions?: Array<{ id: string; code: string; name: string; module: string }>;
}

interface GroupedPermission {
  [module: string]: Array<{ id: string; code: string; name: string; description: string | null }>;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
}

type DialogMode = 'create' | 'edit' | 'invite' | 'roles' | 'role-permissions' | null;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending'> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  PENDING: 'pending',
  DISABLED: 'error',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    email: '', firstName: '', lastName: '', phone: '', departmentId: '', roleIds: [] as string[],
  });
  const [roleFormData, setRoleFormData] = useState({ name: '', code: '', description: '', permissionIds: [] as string[] });
  const [permissionsGrouped, setPermissionsGrouped] = useState<GroupedPermission>({});
  const [permissionsList, setPermissionsList] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('roleId', roleFilter);
      if (deptFilter) params.set('departmentId', deptFilter);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, roleFilter, deptFilter]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
      }
    } catch {}
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRolesList(data.roles);
      }
    } catch {}
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissionsGrouped(data.grouped);
        setPermissionsList(data.permissions);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchDepartments(); fetchRoles(); }, []);
  useEffect(() => { if (dialogMode === 'role-permissions' || dialogMode === 'roles') fetchPermissions(); }, [dialogMode]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const invited = users.filter((u) => u.status === 'INVITED').length;
    const firstLoginPending = users.filter((u) => u.passwordResetRequired).length;
    return { total, active, invited, firstLoginPending };
  }, [users, total]);

  const columns: ColumnDef<User>[] = useMemo(() => [
    {
      accessorKey: 'firstName',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            {row.original.firstName?.[0]}{row.original.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-gray-500">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return <StatusBadge status={STATUS_VARIANTS[s] || 'pending'} label={s} />;
      },
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.slice(0, 2).map((r) => (
            <span key={r.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {r.name}
            </span>
          ))}
          {row.original.roles.length > 2 && (
            <span className="text-xs text-gray-400">+{row.original.roles.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.department?.name || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'passwordResetRequired',
      header: 'First Login',
      cell: ({ row }) => (
        row.original.passwordResetRequired
          ? <StatusBadge status="warning" label="Pending" />
          : row.original.firstLoginAt
            ? <StatusBadge status="success" label="Complete" />
            : <span className="text-sm text-gray-400">—</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedUser(row.original); setDialogMode('edit'); }}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Edit user"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  const handleCreateUser = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.roleIds.length) {
      setError('Email, name, and roles are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }
      setDialogMode(null);
      setFormData({ email: '', firstName: '', lastName: '', phone: '', departmentId: '', roleIds: [] });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }
      setDialogMode(null);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!roleFormData.name || !roleFormData.code) {
      setError('Name and code are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleFormData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create role');
      }
      setDialogMode(null);
      setRoleFormData({ name: '', code: '', description: '', permissionIds: [] });
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRolePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: roleFormData.permissionIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role permissions');
      }
      setDialogMode(null);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedUser(null);
    setFormData({ email: '', firstName: '', lastName: '', phone: '', departmentId: '', roleIds: [] });
    setError('');
    setDialogMode('create');
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      departmentId: user.department?.id || '',
      roleIds: user.roles.map((r) => r.id),
    });
    setError('');
    setDialogMode('edit');
  };

  const openRolePermissions = (role: Role) => {
    setSelectedRole(role);
    setRoleFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permissionIds: role.permissions?.map((p) => p.id) || [],
    });
    setError('');
    setDialogMode('role-permissions');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'User Management' }]}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialogMode('roles')}>
              <Shield className="mr-1 h-4 w-4" /> Roles
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-1 h-4 w-4" /> Add User
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Users" value={String(stats.total)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active" value={String(stats.active)} icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="Invited" value={String(stats.invited)} icon={<Mail className="h-5 w-5" />} />
        <StatCard label="First Login Pending" value={String(stats.firstLoginPending)} icon={<Key className="h-5 w-5" />} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            placeholder="Search users by name or email..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INVITED">Invited</option>
          <option value="PENDING">Pending</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="">All Roles</option>
          {rolesList.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setRoleFilter(''); setDeptFilter(''); setPage(1); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
        onRowClick={openEditDialog}
        emptyIcon={<Users className="h-12 w-12" />}
        emptyTitle="No users found"
        emptyDescription={search ? 'Try a different search query' : 'Create your first user to get started'}
        emptyAction={!search ? <Button size="sm" onClick={openCreateDialog}><Plus className="mr-1 h-4 w-4" /> Add User</Button> : undefined}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} users
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* Create/Edit User Dialog */}
      {dialogMode === 'create' || dialogMode === 'edit' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogMode(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {dialogMode === 'create' ? 'Invite User' : 'Edit User'}
              </h3>
              <button onClick={() => setDialogMode(null)} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={dialogMode === 'edit'} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="">No Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Roles</label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                  {rolesList.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setFormData({ ...formData, roleIds: [...formData.roleIds, r.id] });
                          else setFormData({ ...formData, roleIds: formData.roleIds.filter((id) => id !== r.id) });
                        }}
                        className="rounded border-gray-300"
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
                <Button onClick={dialogMode === 'create' ? handleCreateUser : handleUpdateUser} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  {dialogMode === 'create' ? 'Send Invitation' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Role List Dialog */}
      {dialogMode === 'roles' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogMode(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role Management</h3>
              <button onClick={() => setDialogMode(null)} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              {rolesList.map((role) => (
                <div key={role.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</p>
                    <p className="text-xs text-gray-500">{role.description} • {role.userCount ?? 0} users</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openRolePermissions(role)}>
                    <Shield className="mr-1 h-3 w-3" /> Permissions
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Create New Role</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Name</label>
                  <Input value={roleFormData.name} onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Code</label>
                  <Input value={roleFormData.code} onChange={(e) => setRoleFormData({ ...roleFormData, code: e.target.value })} />
                </div>
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-xs text-gray-500">Description</label>
                <Input value={roleFormData.description} onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })} />
              </div>
              <Button className="mt-2" size="sm" onClick={handleCreateRole} disabled={saving}>
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Create Role
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Role Permissions Dialog */}
      {dialogMode === 'role-permissions' && selectedRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogMode(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Permissions — {selectedRole.name}
              </h3>
              <button onClick={() => setDialogMode(null)} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-6">
              {Object.entries(permissionsGrouped).map(([module, perms]) => (
                <div key={module}>
                  <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{module}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormData.permissionIds.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) setRoleFormData({ ...roleFormData, permissionIds: [...roleFormData.permissionIds, perm.id] });
                            else setRoleFormData({ ...roleFormData, permissionIds: roleFormData.permissionIds.filter((id) => id !== perm.id) });
                          }}
                          className="rounded border-gray-300"
                        />
                        <div>
                          <p className="text-xs font-medium">{perm.name}</p>
                          <p className="text-[10px] text-gray-400">{perm.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
              <Button onClick={handleUpdateRolePermissions} disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save Permissions
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
