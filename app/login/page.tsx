import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { EnterpriseLoginForm } from '@/components/auth/EnterpriseLoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/workspace');
  }

  return (
    <AuthLayout>
      <EnterpriseLoginForm />
    </AuthLayout>
  );
}
