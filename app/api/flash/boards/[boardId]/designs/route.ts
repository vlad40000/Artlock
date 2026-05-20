import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';
import type { FlashDesign } from '@/types/flash';

const paramsSchema = z.object({ boardId: z.string().uuid() });

const addSchema = z.object({
  assetId: z.string().uuid(),
  flashThemeId: z.string().uuid().optional().nullable(),
  title: z.string().max(120).optional().nullable(),
  tags: z.array(z.string()).max(10).optional().default([]),
  placementHint: z.string().max(60).optional().nullable(),
  generationPrompt: z.string().max(500).optional().nullable(),
  isAiGenerated: z.boolean().optional().default(false),
});

// POST /api/flash/boards/[boardId]/designs — add a design to the board
export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = addSchema.parse(await req.json());

    // verify board ownership
    const boards = await sql`
      SELECT id FROM flash_boards WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string }[];
    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    // verify asset belongs to this user (via project ownership)
    const assets = await sql`
      SELECT a.id FROM assets a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = ${body.assetId} AND p.owner_id = ${session.user.id}
    ` as { id: string }[];
    if (!assets[0]) return NextResponse.json({ error: 'Asset not found or not owned' }, { status: 404 });

    const designs = await sql`
      INSERT INTO flash_designs (
        flash_board_id, flash_theme_id, asset_id, title, tags,
        placement_hint, generation_prompt, is_ai_generated
      ) VALUES (
        ${boardId}, ${body.flashThemeId ?? null}, ${body.assetId}, ${body.title ?? null},
        ${body.tags}, ${body.placementHint ?? null},
        ${body.generationPrompt ?? null}, ${body.isAiGenerated}
      )
      RETURNING id, flash_board_id, flash_theme_id, asset_id, stencil_asset_id,
                title, tags, placement_hint, status, sort_order,
                generation_prompt, is_ai_generated, created_at, updated_at
    ` as FlashDesign[];

    return NextResponse.json({ design: designs[0] }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-design-add' });
  }
}
