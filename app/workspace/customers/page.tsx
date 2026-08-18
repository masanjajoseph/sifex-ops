'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Search, RefreshCw, Plus, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CustomerItem {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

interface EditForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  isActive: boolean;
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [form, setForm] = useState<EditForm>({ name: '', email: '', phone: '', address: '', city: '', country: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers?limit=100');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(
    () => data.filter((c) =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((c) => c.isActive).length,
  }), [data]);

  const openEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', country: c.country || '', isActive: c.isActive });
    setSaveError('');
  };

  const closeEdit = () => {
    setEditingCustomer(null);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editingCustomer) return;
    if (!form.name.trim()) { setSaveError('Name is required'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update customer');
      }
      await fetchData();
      closeEdit();
      setToast('Customer updated successfully');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg dark:border-green-800 dark:bg-green-900/50 dark:text-green-200">
          {toast}
        </div>
      )}

      <PageHeader
        title="Customers"
        description="Manage customer accounts and relationships"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Customers' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Customer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Accounts" value={stats.active} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Pending" value={stats.total - stats.active} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={data.length === 0 ? 'No customers yet' : 'No results'}
          description="Customer profiles will appear once created."
          action={data.length === 0 ? <Button><Plus className="mr-1 h-4 w-4" /> Add Customer</Button> : undefined}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All Customers</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => openEdit(c)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.code} · {c.email || 'N/A'}</p>
                  </div>
                </div>
                <StatusBadge status={c.isActive ? 'success' : 'pending'} label={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!editingCustomer} onOpenChange={(v) => { if (!v) closeEdit(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              {editingCustomer?.code} — Update customer details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Address</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">City</label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Country</label>
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-xs font-medium text-gray-700 dark:text-gray-300">Active Account</label>
            </div>

            {saveError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={closeEdit}>Cancel</Button>
              <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
