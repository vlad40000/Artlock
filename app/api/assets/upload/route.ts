import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/server/api-error';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { uploadBlob } from '@/lib/storage';
import { assertSupportedImageMime, getFileExtension } from '@/lib/utils/files';
import { getImageDimensions } from '@/lib/utils/image-dimensions';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const uploadSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(['reference', 'mask']),
  blobUrl: z.string().url().refine(u => u.startsWith('https://'), 'Must be a secure URL'),
  fileName: z.string().optional().default('upload'),
  mimeType: z.string().refine(m => m.startsWith('image/'), 'Only image mime types allowed'),
  size: z.number().optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let projectId: string;
    let rawKind: string;
    let blobUrl: string | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;
    let size: number | null = null;
    let dimensions: { width: number; height: number } | null = null;

    const assetId = randomUUID();

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = uploadSchema.parse(await request.json());
      projectId = body.projectId;
      rawKind = body.kind;
      blobUrl = body.blobUrl;
      fileName = body.fileName;
      mimeType = body.mimeType;
      size = body.size ?? null;
      dimensions = body.dimensions ?? null;
    } else {
      const formData = await request.formData();
      projectId = String(formData.get('projectId') ?? '').trim();
      rawKind = String(formData.get('kind') ?? 'reference').trim().toLowerCase();
      const file = formData.get('file');
      
      if (!projectId || !projectId.match(/^[0-9a-f-]{36}$/i)) {
        return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
      }

      if (rawKind !== 'reference' && rawKind !== 'mask') {
        return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
      }

      if (file instanceof File) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: 'File too large' }, { status: 400 });
        }
        assertSupportedImageMime(file.type);
        
        const extension = getFileExtension(file.name, file.type);
        const blobPath = `users/${user.id}/projects/${projectId}/${rawKind}/${assetId}.${extension}`;
        
        const buffer = Buffer.from(await file.arrayBuffer());
        dimensions = getImageDimensions(buffer, file.type);
        blobUrl = await uploadBlob(blobPath, file);
        fileName = file.name;
        mimeType = file.type;
        size = file.size;
      } else {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }
    }

    // Verify project ownership in Neon
    const projects = await sql`
      SELECT id, owner_id FROM projects WHERE id = ${projectId}
    `;
    const project = projects[0];

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Insert metadata into Neon
    try {
      await sql`
        INSERT INTO assets (
          id, project_id, kind, blob_url, mime_type, 
          width, height, source_asset_id, created_by_phase
        ) VALUES (
          ${assetId}, ${projectId}, ${rawKind}, ${blobUrl}, ${mimeType},
          ${dimensions?.width ?? null}, ${dimensions?.height ?? null}, NULL, ${rawKind === 'reference' ? 'intake' : 'mask'}
        )
      `;
    } catch (dbError: any) {
      return apiErrorResponse(dbError, { route: 'asset-upload-db' });
    }

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        assetId,
        kind: rawKind,
        blobUrl,
      },
      inputs: {
        projectId,
        fileName,
        mimeType,
        bytes: size,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'asset-upload' });
  }
}
