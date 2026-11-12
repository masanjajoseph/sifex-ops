'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Send, Loader2, Clock, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function CustomerSupport() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/support')
      .then(r => r.json())
      .then(d => setTickets(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submitTicket = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch('/api/customer/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      setMessage('');
      const res = await fetch('/api/customer/support');
      const d = await res.json();
      setTickets(d.data || []);
    } catch {} finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/dashboard')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Logo size="xs" priority container containerClassName="bg-white p-2" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
            placeholder="Describe your issue or question..." />
          <div className="mt-2 flex justify-end">
            <button onClick={submitTicket} disabled={sending || !message.trim()}
              className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-900" />)}
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your Tickets</h3>
            {tickets.map((t: any) => (
              <div key={t.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-white">{t.message}</p>
                  <span className={`text-xs font-medium shrink-0 ml-2 ${t.status === 'RESOLVED' ? 'text-green-400' : t.status === 'OPEN' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {t.status || 'OPEN'}
                  </span>
                </div>
                {t.response && <p className="mt-2 text-xs text-gray-500">Response: {t.response}</p>}
                <p className="mt-1 text-[10px] text-gray-600">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
