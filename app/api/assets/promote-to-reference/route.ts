import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId, projectId } = await request.json();

    if (!assetId || !projectId) {
      return NextResponse.json({ error: 'assetId and projectId are required' }, { status: 400 });
    }

    // Verify project ownership and fetch source asset
    const [[project], [sourceAsset]] = await Promise.all([
      sql`SELECT id, owner_id FROM projects WHERE id = ${projectId}`,
      sql`SELECT * FROM assets WHERE id = ${assetId} AND project_id = ${projectId}`
    ]) as any;

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!sourceAsset) return NextResponse.json({ error: 'Source asset not found or belongs to another project' }, { status: 404 });

    const newAssetId = randomUUID();
    
    // Create a NEW asset record with kind='reference'
    await sql`
      INSERT INTO assets (
        id, project_id, kind, blob_url, mime_type, 
        width, height, source_asset_id, created_by_phase
      ) VALUES (
        ${newAssetId}, ${projectId}, 'reference', ${sourceAsset.blob_url}, ${sourceAsset.mime_type},
        ${sourceAsset.width}, ${sourceAsset.height}, ${assetId}, 'workspace'
      )
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        assetId: newAssetId,
        blobUrl: sourceAsset.blob_url
      }
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'promote-to-reference' });
  }
}
