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

// Sheet: 11×14 in @ 300 DPI
const SHEET_W  = 3300;
const SHEET_H  = 4200;
const MARGIN   = 150;
const GUTTER   = 80;
const TITLE_H  = 180;
const LABEL_H  = 90;  // below each design cell

const bodySchema = z.object({
  designIds:   z.array(z.string().uuid()).min(1).max(9),
  layout:      z.enum(['1x1', '1x2', '2x2', '2x3', '3x3']).default('2x2'),
  sheetTitle:  z.string().max(80).optional().nullable(),
  includeBack: z.boolean().optional().default(false),
});

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function buildSheet(
  images: { buffer: Buffer; title: string | null }[],
  layout: Layout,
  sheetTitle: string,
  isBack: boolean,
): Promise<Buffer> {
  const { cols, rows } = LAYOUTS[layout];
  const availW  = SHEET_W - MARGIN * 2;
  const availH  = SHEET_H - MARGIN * 2 - TITLE_H;
  const cellW   = Math.floor((availW - GUTTER * (cols - 1)) / cols);
  const cellH   = Math.floor((availH - GUTTER * (rows - 1) - LABEL_H * rows) / rows);

  const composites: sharp.OverlayOptions[] = [];

  // Title SVG
  const mode   = isBack ? ' — STENCIL / OUTLINE' : '';
  const titleSvg = Buffer.from(`
    <svg width="${SHEET_W}" height="${TITLE_H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${SHEET_W / 2}" y="${TITLE_H * 0.65}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="64" font-weight="900" text-anchor="middle" fill="#111111"
        letter-spacing="6">${sheetTitle.toUpperCase()}${mode}</text>
    </svg>`);
  composites.push({ input: titleSvg, top: MARGIN, left: 0 });

  for (let i = 0; i < Math.min(images.length, cols * rows); i++) {
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const left = MARGIN + col * (cellW + GUTTER);
    const top  = MARGIN + TITLE_H + row * (cellH + LABEL_H + GUTTER);

    let src = images[i].buffer;

    // Back sheet: convert to high-contrast B&W outline
    if (isBack) {
      src = await sharp(src)
        .greyscale()
        .normalise()
        .threshold(180)
        .negate()          // white lines on white bg → black lines
        .negate()
        .png()
        .toBuffer();
    }

    // Fit into cell
    const fitted = await sharp(src)
      .resize(cellW, cellH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    composites.push({ input: fitted, top, left });

    // Label SVG below design
    const label = (images[i].title ?? `Design ${i + 1}`).slice(0, 40);
    const labelSvg = Buffer.from(`
      <svg width="${cellW}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
        <text x="${cellW / 2}" y="${LABEL_H * 0.6}"
          font-family="Arial, sans-serif" font-size="36" font-weight="700"
          text-anchor="middle" fill="#333333">${label}</text>
      </svg>`);
    composites.push({ input: labelSvg, top: top + cellH + 8, left });
  }

  return sharp({
    create: {
      width: SHEET_W, height: SHEET_H, channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .composite(composites)
    .png()
    .toBuffer();
}

export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await req.json());

    const boards = await sql`
      SELECT id, title FROM flash_boards
      WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string; title: string }[];
    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    const designs = await sql`
      SELECT fd.id, fd.title, a.blob_url
      FROM flash_designs fd
      JOIN assets a ON a.id = fd.asset_id
      WHERE fd.id = ANY(${body.designIds}::uuid[])
        AND fd.flash_board_id = ${boardId}
        AND fd.status != 'archived'
      ORDER BY fd.sort_order ASC, fd.created_at ASC
    ` as { id: string; title: string | null; blob_url: string }[];

    if (designs.length === 0) return NextResponse.json({ error: 'No valid designs found' }, { status: 400 });

    const sheetTitle = body.sheetTitle ?? boards[0].title;

    // Download images in parallel
    const images = await Promise.all(
      designs.map(async d => ({
        buffer: await fetchImageBuffer(d.blob_url),
        title: d.title,
      }))
    );

    // Build front sheet
    const frontBuffer = await buildSheet(images, body.layout, sheetTitle, false);
    const exportId    = randomUUID();
    const frontBlob   = await put(
      `flash/${boardId}/exports/${exportId}-front.png`,
      frontBuffer,
      { access: 'public', contentType: 'image/png' },
    );

    const result: Record<string, string> = { front: frontBlob.url };

    // Build back sheet (stencil/outline) if requested
    if (body.includeBack) {
      const backBuffer = await buildSheet(images, body.layout, sheetTitle, true);
      const backBlob   = await put(
        `flash/${boardId}/exports/${exportId}-back.png`,
        backBuffer,
        { access: 'public', contentType: 'image/png' },
      );
      result.back = backBlob.url;
    }

    return NextResponse.json({
      status: 'succeeded',
      export: {
        id: exportId,
        layout: body.layout,
        designCount: designs.length,
        sheetTitle,
        ...result,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-export' });
  }
}
