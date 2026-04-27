import type { BoardArtifact } from '@api/artifacts';
import type { RunArtifact } from '@api/runs';

/**
 * Coerce a BoardArtifact (returned by `getArtifact`) into the RunArtifact
 * shape the renderer registry's `pickRenderer` expects. The two types are
 * structurally similar — both serialize from the kernel's `model.Artifact`.
 *
 * The fields the registry actually inspects (`type`, `metadata.renderer_hint`)
 * are present on both. `RunArtifact.created_by` is optional on RunArtifact
 * and absent on BoardArtifact; we default to '' so the resulting object is
 * structurally complete for any consumer that does inspect it.
 *
 * Pure; no fetches.
 */
export function boardArtifactToRunArtifact(a: BoardArtifact): RunArtifact {
  return {
    id: a.id,
    project_id: a.project_id,
    name: a.name,
    type: a.type,
    content_hash: a.content_hash,
    size_bytes: a.size_bytes,
    created_at: a.created_at,
    created_by: '',
    metadata: a.metadata,
  };
}
