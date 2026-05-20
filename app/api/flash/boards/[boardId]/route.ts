import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';
import type { FlashBoard, FlashTheme, FlashDesign } from '@/types/flash';

const paramsSchema = z.object({ boardId: z.string().uuid() });

// GET /api/flash/boards/[boardId] — full board detail (board + themes + designs)
export async function GET(_req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);

    const boards = await sql`
      SELECT id, owner_id, title, description, status, sort_order, created_at, updated_at
      FROM flash_boards
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as FlashBoard[];

    if (!boards[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [themes, designs] = await Promise.all([
      sql`
        SELECT id, flash_board_id, source_asset_id, title, style_family, palette_lock,
               motif_lock, line_weight_lock, shading_lock, composition_rules,
               raw_theme_lock, model_name, prompt_contract_version, is_active, created_at
        FROM flash_themes
        WHERE flash_board_id = ${boardId}
        ORDER BY created_at DESC
      ` as Promise<FlashTheme[]>,
      sql`
        SELECT fd.id, fd.flash_board_id, fd.flash_theme_id, fd.asset_id, fd.stencil_asset_id,
               fd.title, fd.tags, fd.placement_hint, fd.status, fd.sort_order,
               fd.generation_prompt, fd.is_ai_generated, fd.created_at, fd.updated_at,
               a.blob_url, a.width, a.height,
               sa.blob_url AS stencil_blob_url
        FROM flash_designs fd
        JOIN assets a ON a.id = fd.asset_id
        LEFT JOIN assets sa ON sa.id = fd.stencil_asset_id
        WHERE fd.flash_board_id = ${boardId}
          AND fd.status != 'archived'
        ORDER BY fd.sort_order ASC, fd.created_at DESC
      ` as Promise<FlashDesign[]>,
    ]);

    return NextResponse.json({ board: boards[0], themes, designs });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-board-detail' });
  }
}

// PATCH /api/flash/boards/[boardId] — update title/description/status
export async function PATCH(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = z.object({
      title: z.string().min(1).max(120).optional(),
      description: z.string().max(500).nullable().optional(),
      status: z.enum(['active', 'archived']).optional(),
    }).parse(await req.json());

    const boards = await sql`
      UPDATE flash_boards
      SET
        title       = COALESCE(${body.title ?? null}, title),
        description = COALESCE(${body.description !== undefined ? body.description : null}, description),
        status      = COALESCE(${body.status ?? null}, status),
        updated_at  = NOW()
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
      RETURNING id, owner_id, title, description, status, sort_order, created_at, updated_at
    ` as FlashBoard[];

    if (!boards[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ board: boards[0] });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-board-update' });
  }
}
