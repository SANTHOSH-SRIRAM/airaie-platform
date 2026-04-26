import { describe, it, expect } from 'vitest';
import {
  manifestErrorByField,
  toContractValidation,
  type ContractValidationIssue,
} from './tools';
import type { ContractValidationResult } from '@/types/tool';

describe('manifestErrorByField', () => {
  const issues: ContractValidationIssue[] = [
    { path: 'metadata.name', message: 'name is required' },
    { path: 'metadata.version', message: 'version must be semver' },
    { path: 'interface.inputs.0.name', message: 'port name is required' },
    { code: 'LINT_001', message: 'global lint warning' },
  ];

  it('returns the exact-path match when present', () => {
    const issue = manifestErrorByField(issues, 'metadata.name');
    expect(issue?.message).toBe('name is required');
  });

  it('returns a prefix match when no exact match exists', () => {
    const issue = manifestErrorByField(issues, 'metadata');
    // First metadata.* issue wins.
    expect(issue?.path).toBe('metadata.name');
  });

  it('handles deeply-nested paths', () => {
    const issue = manifestErrorByField(issues, 'interface.inputs.0');
    expect(issue?.path).toBe('interface.inputs.0.name');
  });

  it('returns undefined when no path matches', () => {
    expect(manifestErrorByField(issues, 'runtime')).toBeUndefined();
  });

  it('returns undefined for empty fieldPath', () => {
    expect(manifestErrorByField(issues, '')).toBeUndefined();
  });

  it('skips issues that have no path', () => {
    const onlyPathless: ContractValidationIssue[] = [{ code: 'X', message: 'no path here' }];
    expect(manifestErrorByField(onlyPathless, 'metadata.name')).toBeUndefined();
  });

  it('prefers exact match over prefix match', () => {
    const mixed: ContractValidationIssue[] = [
      { path: 'metadata.name.first', message: 'nested' },
      { path: 'metadata.name', message: 'exact' },
    ];
    expect(manifestErrorByField(mixed, 'metadata.name')?.message).toBe('exact');
  });
});

describe('toContractValidation', () => {
  it('returns an empty invalid result when input is null', () => {
    const v = toContractValidation(null);
    expect(v).toEqual({ valid: false, errors: [], warnings: [] });
  });

  it('flattens section errors into dotted-path issues', () => {
    const result: ContractValidationResult = {
      valid: false,
      sections: {
        metadata: {
          valid: false,
          errors: [{ field: 'name', code: 'REQUIRED', message: 'name is required' }],
          warnings: [],
        },
        runtime: {
          valid: true,
          errors: [],
          warnings: [{ field: 'image', code: 'HINT', message: 'image not pinned' }],
        },
      },
      lint: { checks: [], passed: true, error_count: 0, warning_count: 0 },
    };
    const v = toContractValidation(result);
    expect(v.valid).toBe(false);
    expect(v.errors).toHaveLength(1);
    expect(v.errors[0]).toMatchObject({
      path: 'metadata.name',
      code: 'REQUIRED',
      message: 'name is required',
    });
    expect(v.warnings).toHaveLength(1);
    expect(v.warnings[0]).toMatchObject({ path: 'runtime.image', code: 'HINT' });
  });

  it('treats failing lint checks as errors and warning checks as warnings', () => {
    const result: ContractValidationResult = {
      valid: false,
      sections: {},
      lint: {
        passed: false,
        error_count: 1,
        warning_count: 1,
        checks: [
          { name: 'L1', status: 'fail', message: 'lint error' },
          { name: 'L2', status: 'warn', message: 'lint warning' },
          { name: 'L3', status: 'pass', message: 'ok' },
        ],
      },
    };
    const v = toContractValidation(result);
    expect(v.errors.map((e) => e.code)).toEqual(['L1']);
    expect(v.warnings.map((w) => w.code)).toEqual(['L2']);
  });

  it('uses the section name when an error has no field', () => {
    const result: ContractValidationResult = {
      valid: false,
      sections: {
        governance: {
          valid: false,
          errors: [{ field: '', code: 'MISSING', message: 'governance section missing' }],
          warnings: [],
        },
      },
      lint: { checks: [], passed: true, error_count: 0, warning_count: 0 },
    };
    const v = toContractValidation(result);
    expect(v.errors[0].path).toBe('governance');
  });
});
