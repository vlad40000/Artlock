import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { StudioClient } from '@/components/studio/studio-client';

export default async function StudioEmptyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?next=/studio');
  }

  const sessions = await sql`
    SELECT ds.id
    FROM design_sessions ds
    JOIN projects p ON p.id = ds.project_id
    WHERE p.owner_id = ${session.user.id}
      AND ds.status = 'active'
    ORDER BY ds.created_at DESC
    LIMIT 1
  ` as Array<{ id: string }>;

  if (sessions[0]?.id) {
    redirect(`/studio/${sessions[0].id}`);
  }

  return (
    <Suspense fallback={null}>
      <StudioClient />
    </Suspense>
  );
}
