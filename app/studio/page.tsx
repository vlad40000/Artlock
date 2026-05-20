import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { StudioClient } from '@/components/studio/studio-client';
import { StudioLoadError } from '@/components/studio/studio-load-error';

export default async function StudioEmptyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?next=/studio');
  }

  let sessions: Array<{ id: string }>;
  try {
    sessions = await sql`
      SELECT ds.id
      FROM design_sessions ds
      JOIN projects p ON p.id = ds.project_id
      WHERE p.owner_id = ${session.user.id}
        AND ds.status = 'active'
      ORDER BY ds.created_at DESC
      LIMIT 1
    ` as Array<{ id: string }>;
  } catch (error) {
    console.error('[studio-empty-page] failed to query sessions', error);
    return (
      <StudioLoadError message="Could not load your sessions. Check the server console and database migrations, then reload." />
    );
  }

  if (sessions[0]?.id) {
    redirect(`/studio/${sessions[0].id}`);
  }

  return (
    <Suspense fallback={null}>
      <StudioClient />
    </Suspense>
  );
}
