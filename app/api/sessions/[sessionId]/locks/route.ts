import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';

const paramsSchema = z.object({ sessionId: z.string().uuid() });

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = paramsSchema.parse(await context.params);
  const result = await getOwnedSessionDetail(sessionId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    status: 'succeeded',
    artifacts: {
      activeLockId: result.detail.activeLock?.id ?? null,
      locks: result.detail.locks,
    },
  });
}

const patchSchema = z.object({
  designIdLock: z.string().optional(),
  styleIdLock: z.string().optional(),
  contextIdLock: z.string().optional(),
  cameraIdLock: z.string().optional(),
  compositionIdLock: z.string().optional(),
  tattooIdLock: z.string().optional(),
  placementIdLock: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = paramsSchema.parse(await context.params);
    const body = patchSchema.parse(await request.json());
    const result = await getOwnedSessionDetail(sessionId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const lock = result.detail.activeLock;
    if (!lock) {
      return NextResponse.json({ error: 'No active lock found to update' }, { status: 404 });
    }

    const updates = {
      design_id_lock: body.designIdLock ?? lock.design_id_lock,
      style_id_lock: body.styleIdLock ?? lock.style_id_lock,
      context_id_lock: body.contextIdLock ?? lock.context_id_lock,
      camera_id_lock: body.cameraIdLock ?? lock.camera_id_lock,
      composition_id_lock: body.compositionIdLock ?? lock.composition_id_lock,
      tattoo_id_lock: body.tattooIdLock ?? lock.tattoo_id_lock,
      placement_id_lock: body.placementIdLock ?? lock.placement_id_lock,
    };

    await sql`
      UPDATE locks
      SET
        design_id_lock = ${updates.design_id_lock},
        style_id_lock = ${updates.style_id_lock},
        context_id_lock = ${updates.context_id_lock},
        camera_id_lock = ${updates.camera_id_lock},
        composition_id_lock = ${updates.composition_id_lock},
        tattoo_id_lock = ${updates.tattoo_id_lock},
        placement_id_lock = ${updates.placement_id_lock}
      WHERE id = ${lock.id}
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: { lockId: lock.id },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'locks-patch' });
  }
}
