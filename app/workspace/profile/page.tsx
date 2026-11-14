'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  User, Shield, PenLine, CheckCircle2, AlertCircle, Loader2, Upload, Eye, EyeOff, KeyRound,
  Camera, Mail, Fingerprint, Lock, Save,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/OtpInput';
import { PinInput } from '@/components/ui/PinInput';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface SignatureData {
  signatureImage: string | null;
  avatar: string | null;
  hasPin: boolean;
}

type OtpStage = 'idle' | 'sending' | 'sent' | 'verifying';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();

  const [sigData, setSigData] = useState<SignatureData | null>(null);

  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [otpStage, setOtpStage] = useState<OtpStage>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    fetch('/api/user/signature')
      .then(r => r.json())
      .then(j => { if (j.success) setSigData(j.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Seed from the session immediately so the form never looks empty…
    const parts = session.user.name?.split(' ') || [];
    setProfile(p => ({
      firstName: p.firstName || parts[0] || '',
      lastName: p.lastName || parts.slice(1).join(' ') || '',
      email: p.email || session.user.email || '',
      phone: p.phone || '',
    }));

    // …then load the authoritative record (the session token can be stale and
    // does not carry the phone number at all).
    fetch(`/api/users/${session.user.id}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j) return;
        setProfile({
          firstName: j.firstName || '',
          lastName: j.lastName || '',
          email: j.email || '',
          phone: j.phone || '',
        });
      })
      .catch(() => {});
  }, [session?.user?.id, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const id = setInterval(() => setOtpCountdown(c => c - 1), 1000);
      return () => clearInterval(id);
    }
  }, [otpCountdown]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      const userId = session?.user?.id;
      if (!userId) { showMsg('error', 'Session not found — please re-login'); setProfileSaving(false); return; }
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile({
          firstName: updated.firstName ?? profile.firstName,
          lastName: updated.lastName ?? profile.lastName,
          email: updated.email ?? profile.email,
          phone: updated.phone ?? profile.phone,
        });
        setProfileSaved(true);
        showMsg('success', 'Profile updated');
        await updateSession();
        setTimeout(() => setProfileSaved(false), 3000);
      } else {
        const err = await res.json();
        showMsg('error', err.error || 'Failed to update');
      }
    } catch { showMsg('error', 'Failed to update'); }
    setProfileSaving(false);
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwMsg({ type: 'error', text: 'All fields are required' }); return;
    }
    if (pwNew.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' }); return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'error', text: 'Passwords do not match' }); return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const j = await res.json();
      if (j.success) {
        setPwMsg({ type: 'success', text: 'Password changed successfully' });
        setPwCurrent(''); setPwNew(''); setPwConfirm('');
      } else {
        setPwMsg({ type: 'error', text: j.error || 'Failed to change password' });
      }
    } catch { setPwMsg({ type: 'error', text: 'Failed to change password' }); }
    setPwSaving(false);
  };

  const handleSendOtp = async () => {
    setOtpStage('sending');
    try {
      const res = await fetch('/api/user/otp/send', { method: 'POST' });
      const j = await res.json();
      if (j.success) { setOtpStage('sent'); setOtpCountdown(120); showMsg('success', 'Verification code sent'); }
      else { showMsg('error', j.error || 'Failed'); setOtpStage('idle'); }
    } catch { showMsg('error', 'Failed'); setOtpStage('idle'); }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) { showMsg('error', 'Enter the 6-digit code'); return; }
    if (pin.length < 4) { showMsg('error', 'PIN must be 4-10 digits'); return; }
    if (pin !== pinConfirm) { showMsg('error', 'PINs do not match'); return; }
    setOtpStage('verifying');
    try {
      const res = await fetch('/api/user/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode, pin }),
      });
      const j = await res.json();
      if (j.success) {
        showMsg('success', 'PIN changed');
        setPin(''); setPinConfirm(''); setOtpCode(''); setOtpStage('idle');
        setSigData(prev => prev ? { ...prev, hasPin: true } : null);
      } else showMsg('error', j.error || 'Verification failed');
    } catch { showMsg('error', 'Failed'); }
    setOtpStage('sent');
  };

  const handleSetPinDirect = async () => {
    if (!/^\d{4,10}$/.test(pin)) { showMsg('error', 'PIN must be 4-10 digits'); return; }
    if (pin !== pinConfirm) { showMsg('error', 'PINs do not match'); return; }
    setSaving('pin');
    try {
      const res = await fetch('/api/user/signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const j = await res.json();
      if (j.success) { showMsg('success', 'PIN set'); setPin(''); setPinConfirm(''); setSigData(prev => prev ? { ...prev, hasPin: true } : null); }
      else showMsg('error', j.error || 'Failed');
    } catch { showMsg('error', 'Failed'); }
    setSaving('');
  };

  const user = session?.user;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your profile, security, and signature settings"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Profile' }]}
      />

      {msg && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="bg-gradient-to-r from-[#d00020] to-[#a00018] p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              {user?.image ? (
                <img src={user.image} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/30" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white shadow-inner ring-2 ring-white/30">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 text-white">
              <h2 className="text-xl font-bold truncate">{user?.name || 'User'}</h2>
              <p className="mt-0.5 text-sm text-white/80 truncate">{user?.email || ''}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user?.roles?.map(r => (
                  <span key={r} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-gray-200 dark:bg-gray-700 sm:grid-cols-3">
          {[
            { label: 'Department', value: user?.departmentId || '—' },
            { label: 'Branch', value: user?.branchId || '—' },
            { label: 'Status', value: user?.status || '—' },
          ].map(item => (
            <div key={item.label} className="bg-white px-5 py-3 dark:bg-gray-900">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <User className="h-4 w-4" />
            Personal Information
          </h3>
          <div className="flex items-center gap-2">
            {profileSaved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Saved</span>}
            <Button size="sm" onClick={handleSaveProfile} disabled={profileSaving}>
              <Save className="mr-1 h-3 w-3" />
              {profileSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">First Name</Label>
            <Input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Last Name</Label>
            <Input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Email</Label>
            <Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Phone</Label>
            <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Picture */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Profile Picture</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">Upload a profile photo to personalise your account.</p>
          <ImageUpload
            value={user?.image || ''}
            onChange={async (url) => {
              await fetch('/api/user/avatar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: url }),
              });
              await updateSession();
              showMsg('success', 'Profile picture updated');
            }}
            aspectRatio="square"
            maxSizeMB={5}
            folder="avatars"
            placeholder="Upload Photo"
          />
        </div>

        {/* Signature Image */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <PenLine className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Signature Image</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">Upload your handwritten signature. It appears on invoices you sign.</p>
          <ImageUpload
            value={sigData?.signatureImage || ''}
            onChange={async (url) => {
              const res = await fetch('/api/user/signature', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureImage: url }),
              });
              const j = await res.json();
              if (j.success) { setSigData(prev => prev ? { ...prev, signatureImage: url } : null); showMsg('success', 'Signature saved'); }
              else showMsg('error', j.error || 'Failed');
            }}
            aspectRatio="free"
            maxSizeMB={2}
            folder="signatures"
            placeholder="Upload Signature"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Password */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">Update your login password. Minimum 6 characters.</p>

          {pwMsg && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {pwMsg.type === 'success' ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <AlertCircle className="h-3 w-3 shrink-0" />}
              {pwMsg.text}
            </div>
          )}

          <div className="space-y-3">
            <div className="relative">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Current Password</Label>
              <Input type={showPw ? 'text' : 'password'} value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Enter current password" className="pr-9 mt-1" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-[34px] text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">New Password</Label>
              <Input type={showPw ? 'text' : 'password'} value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="Enter new password" className="pr-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Confirm New Password</Label>
              <Input type={showPw ? 'text' : 'password'} value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Confirm new password" />
            </div>
            <Button size="sm" className="w-full" onClick={handleChangePassword} disabled={pwSaving || !pwCurrent || !pwNew || pwNew.length < 6 || pwNew !== pwConfirm}>
              {pwSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {pwSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>

        {/* Signature PIN */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Signature PIN</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            A numeric PIN used to authorize invoice signing. Changing an existing PIN requires email verification.
          </p>

          {sigData?.hasPin && otpStage === 'idle' && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              PIN is configured
            </div>
          )}

          {!sigData?.hasPin && otpStage === 'idle' && (
            <div className="space-y-4">
              <PinInput
                value={pin}
                onChange={setPin}
                length={5}
                label="PIN"
              />
              <PinInput
                value={pinConfirm}
                onChange={setPinConfirm}
                length={5}
                label="Confirm PIN"
              />
              <Button size="sm" className="w-full" onClick={handleSetPinDirect}
                disabled={saving === 'pin' || !/^\d{4,10}$/.test(pin) || pin !== pinConfirm}>
                {saving === 'pin' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                {saving === 'pin' ? 'Saving...' : 'Set PIN'}
              </Button>
            </div>
          )}

          {sigData?.hasPin && otpStage === 'idle' && (
            <Button size="sm" className="w-full" onClick={handleSendOtp}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Change PIN
            </Button>
          )}

          {otpStage === 'sending' && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Sending code...
            </div>
          )}

          {(otpStage === 'sent' || otpStage === 'verifying') && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <div className="flex items-center gap-1.5 font-medium">
                  <Fingerprint className="h-3.5 w-3.5" />
                  Check your email for the verification code
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Verification Code</Label>
                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={otpStage === 'verifying'}
                />
              </div>

              <PinInput
                value={pin}
                onChange={setPin}
                length={5}
                label="New PIN"
              />
              <PinInput
                value={pinConfirm}
                onChange={setPinConfirm}
                length={5}
                label="Confirm PIN"
              />

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => { setOtpStage('idle'); setOtpCode(''); setPin(''); setPinConfirm(''); }}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={handleVerifyOtp}
                  disabled={otpStage === 'verifying' || otpCode.length < 6 || !/^\d{4,10}$/.test(pin) || pin !== pinConfirm}>
                  {otpStage === 'verifying' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {otpStage === 'verifying' ? 'Verifying...' : 'Verify & Save'}
                </Button>
              </div>

              {otpCountdown > 0 ? (
                <p className="text-center text-xs text-gray-400">Resend in {otpCountdown}s</p>
              ) : (
                <button onClick={handleSendOtp} className="w-full text-center text-xs text-blue-600 hover:text-blue-700">
                  Resend code
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-gray-400" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">How Signing Works</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-gray-500">
              <li>• Upload your handwritten signature image above</li>
              <li>• Set a numeric PIN (at least 4 digits)</li>
              <li>• Changing your PIN sends a verification code to your email</li>
              <li>• When viewing an unpaid invoice, click <strong>Sign</strong> and enter your PIN</li>
              <li>• Your signature image, name, and title will appear on the invoice</li>
              <li>• Once signed, the invoice is locked and shows who signed it</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
