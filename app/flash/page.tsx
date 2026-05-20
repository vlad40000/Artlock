import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { FlashBoardIndex } from '@/components/flash/flash-board-index';
import type { FlashBoard } from '@/types/flash';

export default async function FlashIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/flash');

  let boards: FlashBoard[] = [];
  try {
    boards = await sql`
      SELECT id, owner_id, title, description, status, sort_order, created_at, updated_at
      FROM flash_boards
      WHERE owner_id = ${session.user.id} AND status = 'active'
      ORDER BY sort_order ASC, created_at DESC
    ` as FlashBoard[];
  } catch (error) {
    console.error('[flash-index] failed to load boards', error);
  }

  return <FlashBoardIndex boards={boards} />;
}
