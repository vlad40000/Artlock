import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { put } from '@vercel/blob';
import { apiErrorResponse } from '@/lib/server/api-error';
import { randomUUID } from 'node:crypto';

const paramsSchema = z.object({ boardId: z.string().uuid() });

// POST /api/flash/boards/[boardId]/upload
// Multipart: file + optional title, placementHint, tags (comma-separated)
export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);

    // Verify board ownership and get project_id
    const boards = await sql`
      SELECT id, project_id FROM flash_boards
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string; project_id: string | null }[];

    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    const projectId = boards[0].project_id;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Board has no backing project. Re-create the board to fix.' },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const title = (formData.get('title') as string | null)?.trim() || null;
    const placementHint = (formData.get('placementHint') as string | null)?.trim() || null;
    const tagsRaw = (formData.get('tags') as string | null)?.trim() || '';
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Upload to Vercel Blob
    const assetId = randomUUID();
    const ext = file.name.split('.').pop() ?? 'png';
    const blob = await put(
      `flash/${boardId}/${assetId}.${ext}`,
      file,
      { access: 'public', contentType: file.type || 'image/png' },
    );

    // Create asset record
    await sql`
      INSERT INTO assets (id, project_id, kind, blob_url, mime_type, created_by_phase)
      VALUES (${assetId}, ${projectId}, 'flash', ${blob.url}, ${file.type || 'image/png'}, 'flash-upload')
    `;

    // Create flash_design record
    const designs = await sql`
      INSERT INTO flash_designs (
        flash_board_id, asset_id, title, tags, placement_hint,
        status, is_ai_generated
      ) VALUES (
        ${boardId}, ${assetId}, ${title}, ${tags},
        ${placementHint}, 'ready', false
      )
      RETURNING id, flash_board_id, flash_theme_id, asset_id, stencil_asset_id,
                title, tags, placement_hint, status, sort_order,
                generation_prompt, is_ai_generated, created_at, updated_at
    ` as any[];

    return NextResponse.json({
      design: { ...designs[0], blob_url: blob.url },
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-design-upload' });
  }
}
