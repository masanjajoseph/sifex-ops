import { Receipt } from 'lucide-react';
import { ModulePage } from '@/components/workspace/ModulePage';

export const metadata = {
  title: 'Billing | Sifex',
  description: 'Invoicing and financial management',
};

export default function BillingPage() {
  return (
    <ModulePage
      title="Billing"
      description="Manage invoices, payments, and financial transactions"
      icon={<Receipt className="h-12 w-12" />}
      breadcrumbs={[
        { label: 'Workspace', href: '/workspace' },
        { label: 'Billing' },
      ]}
    />
  );
}
