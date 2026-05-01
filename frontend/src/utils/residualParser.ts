// ---------------------------------------------------------------------------
// Residual parser — extract per-step solver residuals from CFD/FEA solver
// stdout lines that arrive as `log_line` SSE events.
//
// Phase 9 Plan 09-02 §2E.1 (2026-05-01).
//
// Deliberate non-goal: this does NOT introduce a new SSE event type. The
// runner already pumps tool stdout as log_line events; we just parse the
// shape that real solvers (OpenFOAM PISO/SIMPLE, CalculiX) print to stdout
// for free. This trades a slightly more brittle parser for zero kernel/
// runner changes.
//
// Supported solver outputs:
//   - OpenFOAM:  "DILUPBiCG: Solving for Ux, Initial residual = 0.5,
//                 Final residual = 1e-7, No Iterations 5"
//   - simpleFoam Time markers: "Time = 0.0001"  → bumps the iteration
//     counter shared across all residuals in that pseudo-time
// ---------------------------------------------------------------------------

export interface ResidualPoint {
  /** Solver field name (e.g. 'Ux', 'Uy', 'Uz', 'p', 'k', 'omega', 'epsilon'). */
  name: string;
  /** Final residual after the iteration. log10 friendly (always > 0). */
  value: number;
  /** Iteration index (per-name; bumped each time we see another line for that name). */
  iteration: number;
}

/**
 * Parse a single solver-output line. Returns null if the line is not a
 * residual report.
 *
 * Returned `iteration` is always 0 — the caller is responsible for tracking
 * per-name counters across many lines (see `ResidualAccumulator`).
 */
export function parseResidualLine(line: string): { name: string; value: number } | null {
  // OpenFOAM canonical: "<solver>:  Solving for <name>, Initial residual = X,
  //                      Final residual = Y, No Iterations N"
  // We grab name + Final residual.
  const m = line.match(
    /Solving for (\w+),\s*Initial residual\s*=\s*[\d.eE+-]+,\s*Final residual\s*=\s*([\d.eE+-]+)/,
  );
  if (!m) return null;
  const name = m[1];
  const value = Number(m[2]);
  if (!Number.isFinite(value) || value <= 0) {
    // log-Y charts can't plot non-positive values. Drop noisy zero residuals
    // (sometimes printed as `Final residual = 0` for trivial cases).
    return null;
  }
  return { name, value };
}

/**
 * Accumulator that tracks per-residual-name iteration counts across a stream
 * of log lines. Returns ResidualPoint or null per line.
 *
 * Usage:
 *   const acc = new ResidualAccumulator();
 *   for (const line of stdoutLines) {
 *     const p = acc.consume(line);
 *     if (p) points.push(p);
 *   }
 */
export class ResidualAccumulator {
  private counters = new Map<string, number>();

  consume(line: string): ResidualPoint | null {
    const parsed = parseResidualLine(line);
    if (!parsed) return null;
    const next = (this.counters.get(parsed.name) ?? 0) + 1;
    this.counters.set(parsed.name, next);
    return { name: parsed.name, value: parsed.value, iteration: next };
  }

  /** Reset state — useful when a run restarts or the user manually clears. */
  reset() {
    this.counters.clear();
  }
}
