import { useQuery } from '@tanstack/react-query';
import { listBoardArtifacts, getArtifactDownloadUrl, getArtifact } from '@api/artifacts';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const artifactKeys = {
  all: ['artifacts'] as const,
  forBoard: (boardId: string) => [...artifactKeys.all, 'board', boardId] as const,
  detail: (artifactId: string) => [...artifactKeys.all, 'detail', artifactId] as const,
  downloadUrl: (artifactId: string) =>
    [...artifactKeys.all, 'download-url', artifactId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the Board's artifact pool — the inputs the Card can pin to its
 * IntentSpec. Returns `[]` while disabled (boardId missing) and propagates
 * fetch errors so React Query surfaces error states normally.
 */
export function useArtifactList(boardId: string | undefined) {
  return useQuery({
    queryKey: artifactKeys.forBoard(boardId ?? '__missing__'),
    queryFn: () => listBoardArtifacts(boardId!),
    enabled: !!boardId,
    staleTime: 15_000,
  });
}

/**
 * Request a presigned MinIO GET URL for an artifact. Each renderer slot in
 * the Results section uses this hook to fetch its own URL — independent
 * cache entries keep one slot's refresh from cascading into siblings.
 *
 * `staleTime: 5min` matches the kernel's default presigned-URL expiry minus
 * a small safety margin. Renderers re-fetch after that threshold; in-flight
 * fetches stay valid until the user navigates away.
 */
export function useArtifactDownloadUrl(artifactId: string | undefined) {
  return useQuery({
    queryKey: artifactKeys.downloadUrl(artifactId ?? '__missing__'),
    queryFn: () => getArtifactDownloadUrl(artifactId!),
    enabled: !!artifactId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch a single artifact's metadata. Used by InputBlockView /
 * ResultBlockView NodeViews — each block fetches its own bound artifact
 * independently so a refresh on one block does not cascade into siblings.
 *
 * `staleTime: 30s` matches `useIntent` (Phase 8); artifacts are append-only
 * in the kernel so a longer stale window is safe.
 */
export function useArtifact(artifactId: string | undefined) {
  return useQuery({
    queryKey: artifactKeys.detail(artifactId ?? '__missing__'),
    queryFn: () => getArtifact(artifactId!),
    enabled: !!artifactId,
    staleTime: 30_000,
  });
}
