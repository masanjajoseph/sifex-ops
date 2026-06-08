'use client';

import { ModuleError } from '@/components/workspace/ModuleError';

export default function MasterAwbError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} moduleName="Master AWB" />;
}
