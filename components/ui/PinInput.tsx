'use client';

import { OtpInput } from './OtpInput';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function PinInput({
  value,
  onChange,
  length = 5,
  label,
  error = false,
  errorMessage,
  disabled = false,
  className,
}: PinInputProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      )}
      <div className="flex justify-center">
        <OtpInput
          length={length}
          value={value}
          onChange={onChange}
          disabled={disabled}
          error={error}
        />
      </div>
      {error && errorMessage && (
        <p className="text-center text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
