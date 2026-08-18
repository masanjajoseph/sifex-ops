'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

const EXT_MAP: Record<string, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
  xls: 'XLS',
  xlsx: 'XLSX',
  csv: 'CSV',
  txt: 'TXT',
};

interface DocumentUploadProps {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  fileName?: string;
}

export function DocumentUpload({
  value,
  onChange,
  onRemove,
  folder = 'documents',
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  maxSizeMB = 20,
  disabled = false,
  className,
  placeholder = 'Upload Document',
  fileName,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localName, setLocalName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = fileName || localName || value.split('/').pop() || 'document';

  const ext = displayName.split('.').pop()?.toUpperCase() || 'FILE';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLocalName(file.name);

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

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {ext}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
            <p className="text-xs text-gray-400">Uploaded to ImageKit</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => { onChange(''); setLocalName(''); onRemove?.(); }}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800',
          'h-32',
          disabled && 'cursor-not-allowed opacity-50',
        )}>
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{placeholder}</span>
              <span className="text-xs text-gray-400">PDF, DOC, XLS, CSV &bull; Max {maxSizeMB}MB</span>
            </div>
          )}
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} disabled={disabled || uploading} />
        </label>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
