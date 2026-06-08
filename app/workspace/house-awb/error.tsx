'use client';

import { ModuleError } from '@/components/workspace/ModuleError';

export default function HouseAwbError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} moduleName="House AWB" />;
}
