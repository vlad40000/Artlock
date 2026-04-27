import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

const bodySchema = z.object({
  title: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = bodySchema.parse(await request.json());
    const projectId = randomUUID();

    await sql`
      INSERT INTO projects (id, owner_id, title)
      VALUES (${projectId}, ${userId}, ${body.title.trim()})
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: { projectId },
      inputs: { title: body.title.trim() },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'create-project' });
  }
}
