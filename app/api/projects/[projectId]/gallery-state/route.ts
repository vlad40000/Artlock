import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { z } from 'zod';

const paramsSchema = z.object({ projectId: z.string().uuid() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = paramsSchema.parse(await context.params);
    const { gallery_state } = z.object({ gallery_state: z.record(z.any()) }).parse(await request.json());

    // Verify project ownership
    const projects = await sql`
      SELECT id, owner_id FROM projects WHERE id = ${projectId}
    ` as any[];

    const project = projects[0];
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update gallery state
    await sql`
      UPDATE projects
      SET gallery_state = ${JSON.stringify(gallery_state)}
      WHERE id = ${projectId}
    `;

    return NextResponse.json({ status: 'succeeded' });
  } catch (error) {
    return apiErrorResponse(error, { route: 'gallery-state-update' });
  }
}
