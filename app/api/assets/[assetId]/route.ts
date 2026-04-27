import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { deleteBlob } from '@/lib/storage';

const paramsSchema = z.object({ assetId: z.string().uuid() });

export async function DELETE(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId } = paramsSchema.parse(await context.params);

    // Verify ownership via project
    const assets = await sql`
      SELECT a.id, a.blob_url, p.owner_id 
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ${assetId}
    ` as any[];

    const asset = assets[0];
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from Vercel Blob (if it's a blob url)
    if (asset.blob_url.includes('blob.vercel-storage.com')) {
      try {
        await deleteBlob(asset.blob_url);
      } catch (e) {
        console.warn('Failed to delete blob, continuing with DB deletion', e);
      }
    }

    // Delete from DB
    await sql`DELETE FROM assets WHERE id = ${assetId}`;

    return NextResponse.json({ status: 'succeeded' });
  } catch (error) {
    return apiErrorResponse(error, { route: 'delete-asset' });
  }
}
