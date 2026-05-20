import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';
import type { FlashBoard } from '@/types/flash';

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const boards = await sql`
      SELECT id, owner_id, project_id, title, description, status, sort_order, created_at, updated_at
      FROM flash_boards
      WHERE owner_id = ${session.user.id} AND status = 'active'
      ORDER BY sort_order ASC, created_at DESC
    ` as FlashBoard[];

    return NextResponse.json({ boards });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-boards-list' });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = createSchema.parse(await request.json());

    // Auto-create a backing project for this flash board's assets
    const projects = await sql`
      INSERT INTO projects (owner_id, title, status)
      VALUES (${session.user.id}, ${'Flash: ' + body.title}, 'active')
      RETURNING id
    ` as { id: string }[];

    const projectId = projects[0].id;

    const rows = await sql`
      INSERT INTO flash_boards (owner_id, project_id, title, description)
      VALUES (${session.user.id}, ${projectId}, ${body.title}, ${body.description ?? null})
      RETURNING id, owner_id, project_id, title, description, status, sort_order, created_at, updated_at
    ` as FlashBoard[];

    return NextResponse.json({ board: rows[0] }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-boards-create' });
  }
}
