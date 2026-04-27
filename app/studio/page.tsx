import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { StudioClient } from '@/components/studio/studio-client';

export default async function StudioEmptyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?next=/studio');
  }

  return (
    <Suspense fallback={null}>
      <StudioClient />
    </Suspense>
  );
}
