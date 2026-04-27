import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let query;
    if (projectId) {
      query = sql`
        SELECT a.id, a.blob_url, a.created_at,
               EXISTS (SELECT 1 FROM locks l WHERE l.source_asset_id = a.id) as is_locked
        FROM assets a 
        JOIN projects p ON a.project_id = p.id
        WHERE a.project_id = ${projectId} 
          AND p.owner_id = ${user.id}
          AND a.kind = 'reference'
        ORDER BY a.created_at DESC
      `;
    } else {
      // Get references from the most recent project
      query = sql`
        SELECT a.id, a.blob_url, a.created_at, p.title as project_title, p.id as project_id,
               EXISTS (SELECT 1 FROM locks l WHERE l.source_asset_id = a.id) as is_locked
        FROM assets a
        JOIN projects p ON a.project_id = p.id
        WHERE p.owner_id = ${user.id} AND a.kind = 'reference'
        ORDER BY a.created_at DESC
        LIMIT 20
      `;
    }

    const assets = await query;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        assets
      }
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'list-references' });
  }
}
