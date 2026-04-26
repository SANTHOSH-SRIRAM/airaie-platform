import { useQuery } from '@tanstack/react-query';
import { listBoardArtifacts } from '@api/artifacts';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const artifactKeys = {
  all: ['artifacts'] as const,
  forBoard: (boardId: string) => [...artifactKeys.all, 'board', boardId] as const,
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
