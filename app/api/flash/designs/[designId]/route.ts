import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';

const paramsSchema = z.object({ designId: z.string().uuid() });

const patchSchema = z.object({
  title: z.string().max(120).optional().nullable(),
  placementHint: z.string().max(60).optional().nullable(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  status: z.enum(['draft', 'ready', 'archived']).optional(),
  flashThemeId: z.string().uuid().optional().nullable(),
});

// PATCH /api/flash/designs/[designId]
export async function PATCH(req: Request, context: { params: Promise<{ designId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { designId } = paramsSchema.parse(await context.params);
    const body = patchSchema.parse(await req.json());

    // Verify ownership via board
    const rows = await sql`
      UPDATE flash_designs fd
      SET
        title            = COALESCE(${body.title !== undefined ? body.title : null}, fd.title),
        placement_hint   = COALESCE(${body.placementHint !== undefined ? body.placementHint : null}, fd.placement_hint),
        tags             = COALESCE(${body.tags !== undefined ? body.tags : null}, fd.tags),
        status           = COALESCE(${body.status ?? null}, fd.status),
        flash_theme_id   = COALESCE(${body.flashThemeId !== undefined ? body.flashThemeId : null}, fd.flash_theme_id),
        updated_at       = NOW()
      FROM flash_boards fb
      WHERE fd.id = ${designId}
        AND fd.flash_board_id = fb.id
        AND fb.owner_id = ${session.user.id}
      RETURNING fd.id, fd.status, fd.title, fd.tags, fd.placement_hint, fd.updated_at
    ` as any[];

    if (!rows[0]) return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    return NextResponse.json({ design: rows[0] });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-design-update' });
  }
}

// DELETE /api/flash/designs/[designId] — archive (soft delete)
export async function DELETE(_req: Request, context: { params: Promise<{ designId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { designId } = paramsSchema.parse(await context.params);

    const rows = await sql`
      UPDATE flash_designs fd
      SET status = 'archived', updated_at = NOW()
      FROM flash_boards fb
      WHERE fd.id = ${designId}
        AND fd.flash_board_id = fb.id
        AND fb.owner_id = ${session.user.id}
      RETURNING fd.id
    ` as { id: string }[];

    if (!rows[0]) return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    return NextResponse.json({ status: 'archived' });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-design-delete' });
  }
}
