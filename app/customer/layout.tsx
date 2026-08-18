'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  type: string;
}

interface CustomerContextType {
  customer: Customer | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  loading: true,
  logout: async () => {},
});

export const useCustomer = () => useContext(CustomerContext);

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/auth/session')
      .then(r => r.json())
      .then(d => {
        if (d.customer) setCustomer(d.customer);
        else if (pathname !== '/customer/login') router.push('/customer/login');
      })
      .catch(() => { if (pathname !== '/customer/login') router.push('/customer/login'); })
      .finally(() => setLoading(false));
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/customer/auth/session', { method: 'DELETE' });
    setCustomer(null);
    router.push('/customer/login');
  };

  if (loading && pathname !== '/customer/login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <CustomerContext.Provider value={{ customer, loading, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}
