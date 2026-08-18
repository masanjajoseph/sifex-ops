'use client';

import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  aspectRatio?: 'square' | '4:3' | '16:9' | 'free';
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  previewClassName?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  folder = 'images',
  aspectRatio = 'free',
  maxSizeMB = 5,
  disabled = false,
  className,
  previewClassName,
  placeholder = 'Upload Image',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ratioClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === '4:3' ? 'aspect-[4/3]' : aspectRatio === '16:9' ? 'aspect-video' : '';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      const authRes = await fetch('/api/upload/auth');
      const auth = await authRes.json();
      if (!auth.success) throw new Error('Failed to get upload auth');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', auth.data.publicKey);
      formData.append('signature', auth.data.signature);
      formData.append('expire', String(auth.data.expire));
      formData.append('token', auth.data.token);
      formData.append('folder', `/${folder}`);
      formData.append('useUniqueFileName', 'true');

      const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.message || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      onChange(uploadData.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    onRemove?.();
  };

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className={cn('relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700', ratioClass, previewClassName)}>
          <img src={value} alt="Uploaded" className="h-full w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800',
          ratioClass || 'h-40',
          disabled && 'cursor-not-allowed opacity-50',
          previewClassName,
        )}>
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{placeholder}</span>
              <span className="text-xs text-gray-400">Max {maxSizeMB}MB</span>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={disabled || uploading} />
        </label>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
