import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';
import { PDFDocument, PageSizes } from 'pdf-lib';

const paramsSchema = z.object({ boardId: z.string().uuid() });
const bodySchema = z.object({
  frontUrl: z.string().url(),
  backUrl:  z.string().url().optional().nullable(),
  sheetTitle: z.string().max(80).optional().nullable(),
});

// POST /api/flash/boards/[boardId]/export-pdf
// Takes already-generated sheet PNG URL(s) and wraps into a print-ready PDF
export async function POST(req: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { boardId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await req.json());

    // Verify board ownership
    const boards = await sql`
      SELECT id FROM flash_boards WHERE id = ${boardId} AND owner_id = ${session.user.id}
    ` as { id: string }[];
    if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    const pdf = await PDFDocument.create();
    pdf.setTitle(body.sheetTitle ?? 'Flash Sheet');
    pdf.setCreator('TattooLock Studio');

    // Page size: 11×14 inches (PDF points = inches × 72)
    const PAGE_W = 11 * 72;  // 792pt
    const PAGE_H = 14 * 72;  // 1008pt

    // Embed front sheet
    const frontBytes = await (await fetch(body.frontUrl)).arrayBuffer();
    const frontImage = await pdf.embedPng(frontBytes);
    const frontPage  = pdf.addPage([PAGE_W, PAGE_H]);
    frontPage.drawImage(frontImage, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

    // Embed back sheet (stencil) if provided
    if (body.backUrl) {
      const backBytes = await (await fetch(body.backUrl)).arrayBuffer();
      const backImage = await pdf.embedPng(backBytes);
      const backPage  = pdf.addPage([PAGE_W, PAGE_H]);
      backPage.drawImage(backImage, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    }

    const pdfBytes = await pdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="flash-sheet.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'flash-export-pdf' });
  }
}
