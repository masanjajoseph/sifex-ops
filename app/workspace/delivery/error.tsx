'use client';

import { ModuleError } from '@/components/workspace/ModuleError';

export default function DeliveryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} moduleName="Delivery" />;
}
