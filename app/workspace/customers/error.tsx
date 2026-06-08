'use client';

import { ModuleError } from '@/components/workspace/ModuleError';

export default function CustomersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} moduleName="Customers" />;
}
