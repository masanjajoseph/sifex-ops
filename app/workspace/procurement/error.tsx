'use client';

import { ModuleError } from '@/components/workspace/ModuleError';

export default function ProcurementError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} moduleName="Procurement" />;
}
