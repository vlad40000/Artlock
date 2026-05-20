import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { FlashBoardClient } from '@/components/flash/flash-board-client';
import { StudioLoadError } from '@/components/studio/studio-load-error';
import type { FlashBoard, FlashTheme, FlashDesign, FlashBoardDetail } from '@/types/flash';

export default async function FlashBoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    const { boardId } = await params;
    redirect(`/login?next=/flash/${boardId}`);
  }

  const { boardId } = await params;

  let detail: FlashBoardDetail;
  try {
    const [boards, themes, designs] = await Promise.all([
      sql`
        SELECT id, owner_id, title, description, status, sort_order, created_at, updated_at
        FROM flash_boards
        WHERE id = ${boardId} AND owner_id = ${session.user.id}
      ` as Promise<FlashBoard[]>,
      sql`
        SELECT id, flash_board_id, source_asset_id, title, style_family, palette_lock,
               motif_lock, line_weight_lock, shading_lock, composition_rules,
               raw_theme_lock, model_name, prompt_contract_version, is_active, created_at
        FROM flash_themes
        WHERE flash_board_id = ${boardId}
        ORDER BY created_at DESC
      ` as Promise<FlashTheme[]>,
      sql`
        SELECT fd.id, fd.flash_board_id, fd.flash_theme_id, fd.asset_id, fd.stencil_asset_id,
               fd.title, fd.tags, fd.placement_hint, fd.status, fd.sort_order,
               fd.generation_prompt, fd.is_ai_generated, fd.created_at, fd.updated_at,
               a.blob_url, a.width, a.height,
               sa.blob_url AS stencil_blob_url
        FROM flash_designs fd
        JOIN assets a ON a.id = fd.asset_id
        LEFT JOIN assets sa ON sa.id = fd.stencil_asset_id
        WHERE fd.flash_board_id = ${boardId}
          AND fd.status != 'archived'
        ORDER BY fd.sort_order ASC, fd.created_at DESC
      ` as Promise<FlashDesign[]>,
    ]);

    if (!boards[0]) notFound();
    detail = { board: boards[0], themes, designs };
  } catch (error) {
    console.error('[flash-board-page] failed to load board', error);
    return <StudioLoadError title="Flash Board could not load" message="Check server console and database migrations, then reload." />;
  }

  return <FlashBoardClient detail={detail} />;
}
