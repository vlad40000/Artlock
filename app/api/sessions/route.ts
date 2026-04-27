import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

const bodySchema = z.object({
  projectId: z.string().uuid(),
  referenceAssetId: z.string().uuid(),
  status: z.enum(['active', 'archived']).optional(),
});

export async function POST(request: Request) {
  try {
    const sessionUser = await auth();
    if (!sessionUser?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = sessionUser.user.id;

    const body = bodySchema.parse(await request.json());

    // Verify project and asset
    const [projects, assets] = await Promise.all([
      sql`SELECT id, owner_id FROM projects WHERE id = ${body.projectId}`,
      sql`SELECT id, project_id, kind FROM assets WHERE id = ${body.referenceAssetId}`
    ]) as any;

    const project = projects[0];
    const asset = assets[0];

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!asset) {
      return NextResponse.json({ error: 'Reference asset not found' }, { status: 404 });
    }

    if (asset.project_id !== body.projectId) {
      return NextResponse.json({ error: 'Reference asset must belong to the same project' }, { status: 409 });
    }

    if (asset.kind !== 'reference') {
      return NextResponse.json({ error: 'Only reference assets can start a session' }, { status: 409 });
    }

    const sessionId = randomUUID();
    await sql`
      INSERT INTO design_sessions (
        id, project_id, reference_asset_id, active_lock_id, latest_approved_asset_id, status
      ) VALUES (
        ${sessionId}, ${body.projectId}, ${body.referenceAssetId}, null, null, ${body.status ?? 'active'}
      )
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        sessionId,
      },
      inputs: {
        projectId: body.projectId,
        referenceAssetId: body.referenceAssetId,
      },
      params: {
        status: body.status ?? 'active',
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'create-session' });
  }
}
