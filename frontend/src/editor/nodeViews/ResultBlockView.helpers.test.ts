import { describe, it, expect } from 'vitest';
import { boardArtifactToRunArtifact } from './ResultBlockView.helpers';
import type { BoardArtifact } from '@api/artifacts';

describe('boardArtifactToRunArtifact', () => {
  it('passes through every field the registry inspects', () => {
    const board: BoardArtifact = {
      id: 'art_1',
      project_id: 'proj_1',
      name: 'pressure.png',
      type: 'png',
      size_bytes: 12345,
      content_hash: 'sha256:abc',
      created_at: '2026-04-26T00:00:00Z',
      metadata: { renderer_hint: 'image' },
    };
    const run = boardArtifactToRunArtifact(board);
    expect(run.id).toBe('art_1');
    expect(run.type).toBe('png');
    expect(run.metadata).toEqual({ renderer_hint: 'image' });
    expect(run.content_hash).toBe('sha256:abc');
  });

  it('defaults created_by to empty string when absent on BoardArtifact', () => {
    const board: BoardArtifact = { id: 'a', type: 'csv', created_at: '' };
    expect(boardArtifactToRunArtifact(board).created_by).toBe('');
  });
});
