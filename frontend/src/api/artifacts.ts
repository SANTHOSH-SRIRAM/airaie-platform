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
  // Kernel exposes `GET /v0/artifacts?board_id=...` (not /v0/boards/{id}/artifacts).
  // The latter doesn't exist — verified via handler/handler.go route map. Pre-fix
  // listBoardArtifacts called the missing path and 404'd; surfaced when 10-05c
  // ArtifactPoolBlockView mounted on the Board canvas.
  const raw = await api<unknown>(
    `/v0/artifacts?board_id=${encodeURIComponent(boardId)}`,
    { method: 'GET' },
  );
  return unwrapList<BoardArtifact>(raw, 'artifacts');
}

// ---------------------------------------------------------------------------
// Presigned download URL — `GET /v0/artifacts/{id}/download-url` returns
// `{ download_url, expires_at }` (kernel default expiry is 1h, max 24h).
// Renderers fetch the artifact bytes directly from MinIO via this URL — the
// kernel never proxies the bytes.
// ---------------------------------------------------------------------------

interface DownloadUrlResponse {
  download_url: string;
  expires_at: string;
}

/**
 * Request a presigned MinIO GET URL for an artifact's bytes. The URL embeds
 * an expiry timestamp; callers should re-request after ~5 minutes (the
 * useArtifactDownloadUrl hook handles staleTime accordingly).
 */
export async function getArtifactDownloadUrl(artifactId: string): Promise<string> {
  const res = await api<DownloadUrlResponse>(
    `/v0/artifacts/${artifactId}/download-url`,
    { method: 'GET' },
  );
  return res.download_url;
}

// ---------------------------------------------------------------------------
// Single-artifact fetch — `GET /v0/artifacts/{id}` returns
//   { artifact: <Artifact>, sha256: <string> }
// (see airaie-kernel/internal/handler/artifacts.go:213). We unwrap `.artifact`
// and return the BoardArtifact shape; sha256 is redundant with content_hash
// and not surfaced here.
// ---------------------------------------------------------------------------

interface ArtifactEnvelope {
  artifact: BoardArtifact;
  sha256?: string;
}

/**
 * Fetch a single artifact's metadata. Used by InputBlockView and
 * ResultBlockView to render an artifact bound to a typed governance block.
 *
 * Returns the unwrapped BoardArtifact. Throws if the kernel returns a
 * malformed envelope (missing `.artifact`).
 */
export async function getArtifact(artifactId: string): Promise<BoardArtifact> {
  const res = await api<ArtifactEnvelope>(`/v0/artifacts/${artifactId}`, {
    method: 'GET',
  });
  if (!res || !res.artifact) {
    throw new Error('Malformed artifact response: missing `.artifact`');
  }
  return res.artifact;
}
