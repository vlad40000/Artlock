import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ModelTestClient } from './model-test-client';

export default async function ModelTestPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect('/');
  return <ModelTestClient />;
}
