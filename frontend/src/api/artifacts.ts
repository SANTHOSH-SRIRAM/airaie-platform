import { api } from './client';
import { unwrapList } from '@/utils/apiEnvelope';

// ---------------------------------------------------------------------------
// Backend contract notes (kernel reality, confirmed via CLAUDE.md memory)
//
// `GET /v0/boards/{id}/artifacts` returns the Board's artifact pool — the
// pinable inputs that downstream Cards reference. Backend wraps the list in
// `{ artifacts: [...], count }`; we unwrap with the canonical helper.
//
// `GET /v0/artifacts/{id}` returns a single artifact's full metadata; not
// used by the AvailableInputsTable but exposed here for future renderers.
// ---------------------------------------------------------------------------

/**
 * Minimum artifact shape rendered in the AvailableInputsTable. Mirrors the
 * kernel's model.Artifact serialization. Extra fields (storage_uri, owner,
 * created_by, etc.) are omitted because the table doesn't render them and
 * pulling them in would needlessly couple this module to the full kernel
 * schema.
 */
export interface BoardArtifact {
  id: string;
  project_id?: string;
  board_id?: string;
  name?: string;
  type: string;
  size_bytes?: number;
  content_hash?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export async function listBoardArtifacts(boardId: string): Promise<BoardArtifact[]> {
  const raw = await api<unknown>(`/v0/boards/${boardId}/artifacts`, { method: 'GET' });
  return unwrapList<BoardArtifact>(raw, 'artifacts');
}
