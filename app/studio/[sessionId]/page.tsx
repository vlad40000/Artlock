import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { StudioClient } from '@/components/studio/studio-client';
import { StudioLoadError } from '@/components/studio/studio-load-error';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';

export default async function StudioSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  if (!sessionId) {
    notFound();
  }

  let result;
  try {
    result = await getOwnedSessionDetail(sessionId);
  } catch (error) {
    console.error('[studio-session-page] failed to load session detail', error);
    return <StudioLoadError />;
  }

  if (!result.ok) {
    if (result.status === 401) {
      redirect(`/login?next=/studio/${sessionId}`);
    }

    notFound();
  }

  return (
    <Suspense fallback={null}>
      <StudioClient detail={result.detail} />
    </Suspense>
  );
}
