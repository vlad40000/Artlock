import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { put } from '@vercel/blob';
import { apiErrorResponse } from '@/lib/server/api-error';
import { generateFlashDesign } from '@/lib/ai/gemini';
import { TATTOO_FLASH_GENERATE } from '@/lib/ai/prompt-contracts/tattoo-flash-generate';
import type { FlashTheme } from '@/types/flash';

const paramsSchema = z.object({ boardId: z.string().uuid() });

const bodySchema = z.object({
  themeId:        z.string().uuid(),
  subjectRequest: z.string().min(1).max(400),
  title:          z.string().max(120).optional().nullable(),
  placementHint:  z.string().max(60).optional().nullable(),
  tags:           z.array(z.string().max(40)).max(10).optional().default([]),
});

// POST /api/flash/boards/[boardId]/generate
export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await req.json());

    // Verify board + get project_id
    const boards = await sql`
      SELECT id, project_id FROM flash_boards
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string; project_id: string | null }[];

    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    const projectId = boards[0].project_id;
    if (!projectId) return NextResponse.json({ error: 'Board has no backing project' }, { status: 400 });

    // Load theme
    const themes = await sql`
      SELECT id, flash_board_id, source_asset_id, title, style_family, palette_lock,
             motif_lock, line_weight_lock, shading_lock, composition_rules,
             raw_theme_lock, model_name, prompt_contract_version, is_active, created_at
      FROM flash_themes
      WHERE id = ${body.themeId} AND flash_board_id = ${boardId}
    ` as FlashTheme[];

    if (!themes[0]) return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    const theme = themes[0];

    if (!theme.raw_theme_lock) {
      return NextResponse.json({ error: 'Theme has no raw_theme_lock — re-extract the theme.' }, { status: 400 });
    }

    // Generate the design
    const result = await generateFlashDesign({
      subjectRequest:  body.subjectRequest,
      rawThemeLock:    theme.raw_theme_lock,
      paletteLock:     theme.palette_lock     ?? '[X]',
      lineWeightLock:  theme.line_weight_lock ?? '[X]',
      shadingLock:     theme.shading_lock     ?? '[X]',
      compositionRules: theme.composition_rules ?? '[X]',
      motifLock:       theme.motif_lock       ?? '[X]',
      styleFamilyLock: theme.style_family     ?? '[X]',
    });

    // Upload to blob
    const assetId = randomUUID();
    const buffer = Buffer.from(result.base64, 'base64');
    const blob = await put(
      `flash/${boardId}/generated/${assetId}.png`,
      buffer,
      { access: 'public', contentType: result.mimeType },
    );

    // Save asset
    await sql`
      INSERT INTO assets (id, project_id, kind, blob_url, mime_type, created_by_phase)
      VALUES (${assetId}, ${projectId}, 'flash', ${blob.url}, ${result.mimeType}, 'flash-generate')
    `;

    // Save flash_design
    const designs = await sql`
      INSERT INTO flash_designs (
        flash_board_id, flash_theme_id, asset_id, title, tags,
        placement_hint, generation_prompt, status, is_ai_generated
      ) VALUES (
        ${boardId}, ${body.themeId}, ${assetId},
        ${body.title ?? body.subjectRequest.slice(0, 80)},
        ${body.tags}, ${body.placementHint ?? null},
        ${body.subjectRequest}, 'draft', true
      )
      RETURNING id, flash_board_id, flash_theme_id, asset_id, stencil_asset_id,
                title, tags, placement_hint, status, sort_order,
                generation_prompt, is_ai_generated, created_at, updated_at
    ` as any[];

    return NextResponse.json({
      status: 'succeeded',
      design: { ...designs[0], blob_url: blob.url },
      prompt_contract: {
        name:    TATTOO_FLASH_GENERATE.name,
        version: TATTOO_FLASH_GENERATE.version,
      },
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-generate' });
  }
}
