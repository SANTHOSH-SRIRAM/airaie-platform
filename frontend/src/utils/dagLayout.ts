/**
 * Shared depth-by-dependency DAG layout primitives.
 *
 * Used by both the workflow DSL converter (`workflowDsl.ts`) and the
 * execution plan converter (`executionPlanLayout.ts`). Extracted so a
 * change to the layout strategy lands in one place.
 *
 * The algorithm is intentionally simple — left-to-right by topological
 * depth, top-to-bottom by sibling index. It mirrors the historical
 * `dslToSteps` placement so existing graphs render in the same spots.
 */

export interface DagPosition {
  x: number;
  y: number;
}

export interface DagLayoutOptions {
  /** Pixels between depth columns. Default 220. */
  colWidth?: number;
  /** Pixels between sibling rows. Default 110. */
  rowHeight?: number;
  /** Left padding before the first column. Default 80. */
  x0?: number;
  /** Top padding before the first row. Default 80. */
  y0?: number;
}

/**
 * Compute `{nodeId -> depth}` for a graph defined by a parents-of fn.
 * Cycles are broken by treating the second visit as depth 0; downstream
 * validators should flag cycles separately.
 */
export function computeDagDepths<T extends { id: string }>(
  nodes: T[],
  parentsOf: (node: T) => string[],
): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const depthOf = new Map<string, number>();

  const compute = (id: string, seen: Set<string>): number => {
    const cached = depthOf.get(id);
    if (cached !== undefined) return cached;
    if (seen.has(id)) return 0;
    seen.add(id);
    const node = byId.get(id);
    const parents = node ? parentsOf(node) : [];
    const d = parents.length
      ? Math.max(...parents.map((p) => compute(p, seen) + 1))
      : 0;
    depthOf.set(id, d);
    return d;
  };

  nodes.forEach((n) => compute(n.id, new Set()));
  return depthOf;
}

/**
 * Lay nodes out left-to-right by topological depth, top-to-bottom by
 * sibling index. Returns `Map<nodeId, {x, y}>`.
 */
export function autoLayoutByDepth<T extends { id: string }>(
  nodes: T[],
  parentsOf: (node: T) => string[],
  opts: DagLayoutOptions = {},
): Map<string, DagPosition> {
  const colWidth = opts.colWidth ?? 220;
  const rowHeight = opts.rowHeight ?? 110;
  const x0 = opts.x0 ?? 80;
  const y0 = opts.y0 ?? 80;

  const depthOf = computeDagDepths(nodes, parentsOf);
  const siblingsByDepth = new Map<number, number>();
  const positions = new Map<string, DagPosition>();

  nodes.forEach((node) => {
    const depth = depthOf.get(node.id) ?? 0;
    const sibling = siblingsByDepth.get(depth) ?? 0;
    siblingsByDepth.set(depth, sibling + 1);
    positions.set(node.id, {
      x: x0 + depth * colWidth,
      y: y0 + sibling * rowHeight,
    });
  });

  return positions;
}
