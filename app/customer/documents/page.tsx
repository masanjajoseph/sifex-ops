'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Download, File, Image } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCustomer } from '../layout';

export default function CustomerDocuments() {
  const router = useRouter();
  const { customer } = useCustomer();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/documents')
      .then(r => r.json())
      .then(d => setDocuments(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const docIcon = (type?: string) => {
    if (type?.startsWith('image/')) return Image;
    return FileText;
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/dashboard')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Logo size="xs" priority container containerClassName="bg-white p-2" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-900" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-3 h-12 w-12 text-gray-600" />
            <p className="text-sm text-gray-500">No documents available yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => {
              const Icon = docIcon(doc.mimeType);
              return (
                <div key={doc.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-gray-800 p-2 shrink-0">
                      <Icon className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.title || doc.fileName || 'Document'}</p>
                      <p className="text-xs text-gray-500">
                        {doc.documentType?.replace(/_/g, ' ') || 'General'}
                        {doc.houseAWB && <span> · {doc.houseAWB.houseAWBNumber}</span>}
                        {doc.masterAWB && !doc.houseAWB && <span> · {doc.masterAWB.awbNumber}</span>}
                        <span> · {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <a href={doc.fileUrl || doc.url || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-gray-600 hover:text-white">
                    <Download className="h-3 w-3" /> View
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
