'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  inputClassName?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  className,
  inputClassName,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) digits.push('');

  const focus = useCallback((idx: number) => {
    const ref = inputRefs.current[idx];
    if (ref) { ref.focus(); ref.select(); }
  }, []);

  const handleChange = useCallback((idx: number, char: string) => {
    if (disabled) return;
    if (!/^\d$/.test(char)) return;
    const newVal = value.split('');
    newVal[idx] = char;
    const full = newVal.join('').slice(0, length);
    onChange(full);
    if (idx < length - 1) focus(idx + 1);
  }, [value, length, onChange, focus, disabled]);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[idx]) {
        const newVal = value.split('');
        newVal[idx] = '';
        onChange(newVal.join(''));
      } else if (idx > 0) {
        focus(idx - 1);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focus(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      focus(idx + 1);
    }
  }, [value, length, onChange, focus, disabled]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!paste) return;
    onChange(paste);
    const targetIdx = Math.min(paste.length, length - 1);
    focus(targetIdx);
  }, [length, onChange, focus, disabled]);

  return (
    <div className={cn('flex items-center gap-2', className)} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          onFocus={() => setFocusedIdx(i)}
          onBlur={() => setFocusedIdx(-1)}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className={cn(
            'flex h-12 w-10 items-center justify-center rounded-lg border text-center text-lg font-bold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            error
              ? 'border-red-400 bg-red-50 text-red-600 focus:ring-red-400 dark:border-red-600 dark:bg-red-950/20'
              : focusedIdx === i
                ? 'border-[#d00020] ring-2 ring-[#d00020]/20 dark:border-[#ff2040]'
                : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900',
            value.length === length && i < value.length ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950/20' : '',
            disabled && 'cursor-not-allowed opacity-50',
            inputClassName,
          )}
        />
      ))}
    </div>
  );
}
