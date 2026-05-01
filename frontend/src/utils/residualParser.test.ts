import { describe, expect, it } from 'vitest';
import { parseResidualLine, ResidualAccumulator } from './residualParser';

// Phase 9 Plan 09-02 §2E.1.

describe('parseResidualLine', () => {
  it('parses a canonical OpenFOAM residual line', () => {
    const line =
      'DILUPBiCG:  Solving for Ux, Initial residual = 0.5, Final residual = 1e-7, No Iterations 5';
    expect(parseResidualLine(line)).toEqual({ name: 'Ux', value: 1e-7 });
  });

  it('parses scalar pressure solver line', () => {
    const line =
      'DICPCG:  Solving for p, Initial residual = 1, Final residual = 1.234e-6, No Iterations 25';
    expect(parseResidualLine(line)).toEqual({ name: 'p', value: 1.234e-6 });
  });

  it('parses turbulence model fields (k, omega, epsilon)', () => {
    expect(
      parseResidualLine(
        'DILUPBiCG:  Solving for k, Initial residual = 0.1, Final residual = 5e-5, No Iterations 3',
      ),
    ).toEqual({ name: 'k', value: 5e-5 });
    expect(
      parseResidualLine(
        'smoothSolver:  Solving for omega, Initial residual = 0.2, Final residual = 2e-4, No Iterations 1',
      ),
    ).toEqual({ name: 'omega', value: 2e-4 });
  });

  it('returns null for a non-residual line', () => {
    expect(parseResidualLine('Time = 0.001')).toBeNull();
    expect(parseResidualLine('ExecutionTime = 0.05 s  ClockTime = 0 s')).toBeNull();
    expect(parseResidualLine('PIMPLE: not converged within 50 iterations')).toBeNull();
    expect(parseResidualLine('')).toBeNull();
  });

  it('rejects non-positive residuals (cannot plot on log-Y)', () => {
    const line =
      'DILUPBiCG:  Solving for trivial, Initial residual = 0, Final residual = 0, No Iterations 0';
    expect(parseResidualLine(line)).toBeNull();
  });

  it('rejects unparseable numeric residuals', () => {
    const line =
      'DILUPBiCG:  Solving for x, Initial residual = 0.5, Final residual = NaN, No Iterations 1';
    expect(parseResidualLine(line)).toBeNull();
  });
});

describe('ResidualAccumulator', () => {
  it('increments per-name iteration counter independently', () => {
    const acc = new ResidualAccumulator();
    const lines = [
      'Solving for Ux, Initial residual = 0.5, Final residual = 1e-3, No Iterations 5',
      'Solving for Uy, Initial residual = 0.4, Final residual = 1e-3, No Iterations 5',
      'Solving for Ux, Initial residual = 0.5, Final residual = 1e-5, No Iterations 5',
      'Solving for p, Initial residual = 1, Final residual = 1e-6, No Iterations 25',
      'Solving for Ux, Initial residual = 0.5, Final residual = 1e-7, No Iterations 5',
    ];
    const points = lines.map((l) => acc.consume(l));
    expect(points).toEqual([
      { name: 'Ux', value: 1e-3, iteration: 1 },
      { name: 'Uy', value: 1e-3, iteration: 1 },
      { name: 'Ux', value: 1e-5, iteration: 2 },
      { name: 'p', value: 1e-6, iteration: 1 },
      { name: 'Ux', value: 1e-7, iteration: 3 },
    ]);
  });

  it('returns null for non-residual lines without bumping counters', () => {
    const acc = new ResidualAccumulator();
    expect(acc.consume('Time = 0.001')).toBeNull();
    const next = acc.consume(
      'Solving for Ux, Initial residual = 0.5, Final residual = 1e-3, No Iterations 5',
    );
    expect(next).toEqual({ name: 'Ux', value: 1e-3, iteration: 1 });
  });

  it('reset() clears counters', () => {
    const acc = new ResidualAccumulator();
    acc.consume('Solving for Ux, Initial residual = 0.5, Final residual = 1e-3, No Iterations 5');
    acc.reset();
    const next = acc.consume(
      'Solving for Ux, Initial residual = 0.5, Final residual = 1e-7, No Iterations 5',
    );
    expect(next?.iteration).toBe(1);
  });
});
