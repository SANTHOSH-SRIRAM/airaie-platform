import type { BoardArtifact } from '@api/artifacts';

/**
 * Format an artifact's storage size for human display. Pure.
 *
 *   undefined -> ''
 *   0         -> '0 B'
 *   1024      -> '1.0 KB'
 *   1048576   -> '1.0 MB'
 */
export function formatBytes(size: number | undefined): string {
  if (size === undefined || size === null) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Build a single-line artifact summary used in the InputBlockView header.
 * Concatenates name (or id), type, and size.
 *
 * Examples:
 *   { name: 'inflow.csv', type: 'csv', size_bytes: 2048 } ->
 *     'inflow.csv · csv · 2.0 KB'
 *   { id: 'art_x', type: 'frd' } ->
 *     'art_x · frd'
 */
export function formatArtifactSummary(a: BoardArtifact | undefined | null): string {
  if (!a) return '';
  const parts: string[] = [];
  parts.push(a.name && a.name.length > 0 ? a.name : a.id);
  if (a.type) parts.push(a.type);
  const sizeStr = formatBytes(a.size_bytes);
  if (sizeStr) parts.push(sizeStr);
  return parts.join(' · ');
}
