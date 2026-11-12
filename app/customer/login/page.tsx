'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

type LoginMode = 'email' | 'tracking';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const body: any = {};
      if (mode === 'email') {
        if (!email) { setError('Enter your email'); setLoading(false); return; }
        body.email = email;
      } else {
        if (!trackingNumber || !phone) { setError('Enter tracking number and phone'); setLoading(false); return; }
        body.trackingNumber = trackingNumber;
        body.phone = phone;
      }
      const res = await fetch('/api/customer/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send OTP'); return; }
      setStep('otp');
      setMessage('OTP sent to your registered phone/email');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customer/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp: otp.join('') }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid OTP'); return; }
      router.push('/customer/dashboard');
    } catch { setError('Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Logo size="xl" priority container containerClassName="bg-white p-2" />
          </div>
          <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
          <p className="mt-1 text-sm text-gray-400">Track shipments, view invoices, and more</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          {step === 'input' ? (
            <div className="space-y-4">
              <div className="flex rounded-lg border border-gray-700">
                <button onClick={() => setMode('email')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg ${mode === 'email' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Email</button>
                <button onClick={() => setMode('tracking')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg ${mode === 'tracking' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Tracking + Phone</button>
              </div>

              {mode === 'email' ? (
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com"
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
              ) : (
                <>
                  <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Tracking or HAWB number"
                    className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Phone number (last 6 digits)"
                    className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
                </>
              )}

              {error && <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {error}</p>}

              <button onClick={sendOtp} disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send OTP <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {message && <p className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="h-3 w-3" /> {message}</p>}
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400">Enter 6-digit OTP</label>
                <div className="flex justify-center gap-2">
                    {otp.map((d, i) => (
                    <input key={i} value={d} onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (raw.length > 1) {
                        const digits = raw.slice(0, 6).split('');
                        setOtp(prev => {
                          const next = [...prev];
                          digits.forEach((v, j) => { if (j < 6) next[j] = v; });
                          return next;
                        });
                        const idx = Math.min(raw.length, 5);
                        (document.querySelectorAll<HTMLInputElement>('input[type=tel]')[idx])?.focus();
                        return;
                      }
                      const val = raw.slice(0, 1);
                      const next = [...otp]; next[i] = val; setOtp(next);
                      if (val && i < 5) (document.querySelectorAll<HTMLInputElement>('input[type=tel]')[i + 1])?.focus();
                    }} onPaste={e => {
                      const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (data.length > 1) {
                        e.preventDefault();
                        setOtp(data.split(''));
                        const idx = Math.min(data.length, 5);
                        (document.querySelectorAll<HTMLInputElement>('input[type=tel]')[idx])?.focus();
                      }
                    }} onKeyDown={e => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0)
                        (document.querySelectorAll<HTMLInputElement>('input[type=tel]')[i - 1])?.focus();
                    }} type="tel" maxLength={6}
                      className="h-12 w-10 rounded-lg border border-gray-700 bg-gray-800 text-center text-lg text-white" />
                    ))}
                </div>
              </div>
              {error && <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {error}</p>}
              <button onClick={verifyOtp} disabled={loading || otp.join('').length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify & Sign In
              </button>
              <button onClick={() => { setStep('input'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300">Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
