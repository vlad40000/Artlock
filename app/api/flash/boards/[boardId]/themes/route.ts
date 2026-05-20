import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';
import { downloadAsset } from '@/lib/utils/storage';
import { extractFlashTheme } from '@/lib/ai/gemini';
import { env } from '@/lib/utils/env';
import type { FlashTheme } from '@/types/flash';

const paramsSchema = z.object({ boardId: z.string().uuid() });

const bodySchema = z.object({
  assetId: z.string().uuid(),        // the design to extract from
  title:   z.string().max(120).optional().nullable(), // override suggested title
});

// POST /api/flash/boards/[boardId]/themes
// Extracts style/motif theme DNA from an existing design asset
export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await req.json());

    // Verify board ownership
    const boards = await sql`
      SELECT id FROM flash_boards
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string }[];
    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    // Verify asset ownership
    const assets = await sql`
      SELECT a.id, a.blob_url, a.mime_type FROM assets a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = ${body.assetId} AND p.owner_id = ${session.user.id}
    ` as { id: string; blob_url: string; mime_type: string }[];
    if (!assets[0]) return NextResponse.json({ error: 'Asset not found or not owned' }, { status: 404 });

    // Download the image
    const { base64, mimeType } = await downloadAsset(assets[0].blob_url);

    // Extract theme via AI
    const extraction = await extractFlashTheme({ imageBase64: base64, mimeType });

    // Save to flash_themes
    const themes = await sql`
      INSERT INTO flash_themes (
        flash_board_id, source_asset_id, title,
        style_family, palette_lock, motif_lock,
        line_weight_lock, shading_lock, composition_rules, raw_theme_lock,
        model_name, prompt_contract_version, is_active
      ) VALUES (
        ${boardId}, ${body.assetId},
        ${body.title ?? extraction.suggested_title},
        ${extraction.style_family}, ${extraction.palette_lock},
        ${extraction.motif_lock}, ${extraction.line_weight_lock},
        ${extraction.shading_lock}, ${extraction.composition_rules},
        ${extraction.raw_theme_lock},
        ${env.geminiPhase1AModel}, ${'v1.0-flash-theme'},
        true
      )
      RETURNING id, flash_board_id, source_asset_id, title, style_family,
                palette_lock, motif_lock, line_weight_lock, shading_lock,
                composition_rules, raw_theme_lock, model_name,
                prompt_contract_version, is_active, created_at
    ` as FlashTheme[];

    return NextResponse.json({ theme: themes[0], extraction }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-theme-extract' });
  }
}
