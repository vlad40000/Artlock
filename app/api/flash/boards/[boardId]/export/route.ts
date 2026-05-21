import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { put } from '@vercel/blob';
import { apiErrorResponse } from '@/lib/server/api-error';
import sharp from 'sharp';

const paramsSchema = z.object({ boardId: z.string().uuid() });

const LAYOUTS = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  '2x3': { cols: 2, rows: 3 },
  '3x3': { cols: 3, rows: 3 },
} as const;

type Layout = keyof typeof LAYOUTS;

// Sheet spec: 11×14 inches @ 300 DPI
const SHEET_W = 3300;
const SHEET_H = 4200;
const MARGIN  = 150;   // 0.5 inch
const GUTTER  = 80;    // between cells
const TITLE_H = 180;   // top title bar

const bodySchema = z.object({
  designIds:   z.array(z.string().uuid()).min(1).max(9),
  layout:      z.enum(['1x1', '1x2', '2x2', '2x3', '3x3']).default('2x2'),
  sheetTitle:  z.string().max(80).optional().nullable(),
  includeBack: z.boolean().optional().default(false), // stencil/outline back sheet
});

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function compositeSheet(
  imageBuffers: Buffer[],
  layout: Layout,
  sheetTitle: string | null | undefined,
): Promise<Buffer> {
  const { cols, rows } = LAYOUTS[layout];
  const availW = SHEET_W - MARGIN * 2;
  const availH = SHEET_H - MARGIN * 2 - TITLE_H;
  const cellW   = Math.floor((availW - GUTTER * (cols - 1)) / cols);
  const cellH   = Math.floor((availH - GUTTER * (rows - 1)) / rows);

  // Build white background
  let base = sharp({
    create: {
      width: SHEET_W, height: SHEET_H,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).png();

  // Title SVG
  const title = sheetTitle?.trim() || 'Flash Sheet';
  const titleSvg = Buffer.from(`
    <svg width="${SHEET_W}" height="${TITLE_H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${SHEET_W / 2}" y="${TITLE_H * 0.65}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="72" font-weight="900"
        text-anchor="middle" fill="#111111"
        letter-spacing="8">${title.toUpperCase()}</text>
    </svg>`);

  const composites: sharp.OverlayOptions[] = [
    { input: titleSvg, top: MARGIN, left: 0 },
  ];

  for (let i = 0; i < Math.min(imageBuffers.length, cols * rows); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = MARGIN + col * (cellW + GUTTER);
    const top  = MARGIN + TITLE_H + row * (cellH + GUTTER);

    // Fit design into cell, white background padding
    const fitted = await sharp(imageBuffers[i])
      .resize(cellW, cellH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    composites.push({ input: fitted, top, left });
  }

  return base.composite(composites).png().toBuffer();
}

// POST /api/flash/boards/[boardId]/export
export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await req.json());

    // Verify board ownership
    const boards = await sql`
      SELECT id, title FROM flash_boards
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string; title: string }[];
    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    // Load selected designs with asset URLs (verifying ownership via board)
    const designs = await sql`
      SELECT fd.id, a.blob_url
      FROM flash_designs fd
      JOIN assets a ON a.id = fd.asset_id
      WHERE fd.id = ANY(${body.designIds}::uuid[])
        AND fd.flash_board_id = ${boardId}
        AND fd.status != 'archived'
      ORDER BY fd.sort_order ASC, fd.created_at ASC
    ` as { id: string; blob_url: string }[];

    if (designs.length === 0) {
      return NextResponse.json({ error: 'No valid designs found' }, { status: 400 });
    }

    // Download all images in parallel
    const imageBuffers = await Promise.all(designs.map(d => fetchImageBuffer(d.blob_url)));

    // Composite the sheet
    const sheetTitle = body.sheetTitle ?? boards[0].title;
    const sheetBuffer = await compositeSheet(imageBuffers, body.layout, sheetTitle);

    // Upload
    const exportId = randomUUID();
    const blob = await put(
      `flash/${boardId}/exports/${exportId}.png`,
      sheetBuffer,
      { access: 'public', contentType: 'image/png' },
    );

    return NextResponse.json({
      status: 'succeeded',
      export: {
        id: exportId,
        url: blob.url,
        layout: body.layout,
        designCount: designs.length,
        sheetTitle,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-export' });
  }
}
