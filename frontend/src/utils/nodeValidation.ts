export interface ToolContractPort {
  name: string;
  type: 'artifact' | 'parameter' | 'metric';
  required: boolean;
  schema?: Record<string, unknown>;
  description?: string;
}

export interface ToolContract {
  inputs: ToolContractPort[];
  outputs: ToolContractPort[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate node input values against a tool contract.
 */
export function validateNodeInputs(
  inputs: Record<string, unknown>,
  contract: ToolContract
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check required inputs
  for (const port of contract.inputs) {
    if (port.required) {
      const value = inputs[port.name];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: port.name,
          message: `Required input "${port.name}" is missing`,
          severity: 'error',
        });
      }
    }
  }

  // Check for unknown inputs
  const knownInputs = new Set(contract.inputs.map((p) => p.name));
  for (const key of Object.keys(inputs)) {
    if (!knownInputs.has(key)) {
      warnings.push({
        field: key,
        message: `Unknown input "${key}" not in tool contract`,
        severity: 'warning',
      });
    }
  }

  // Basic type validation against JSON Schema
  for (const port of contract.inputs) {
    const value = inputs[port.name];
    if (value === undefined || value === null) continue;

    if (port.schema) {
      const typeError = validateType(port.name, value, port.schema);
      if (typeError) errors.push(typeError);

      const rangeErrors = validateRange(port.name, value, port.schema);
      errors.push(...rangeErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateType(field: string, value: unknown, schema: Record<string, unknown>): ValidationError | null {
  const expectedType = schema.type as string | undefined;
  if (!expectedType) return null;

  const actualType = typeof value;
  const typeValid =
    (expectedType === 'string' && actualType === 'string') ||
    (expectedType === 'number' && actualType === 'number') ||
    (expectedType === 'integer' && actualType === 'number' && Number.isInteger(value)) ||
    (expectedType === 'boolean' && actualType === 'boolean') ||
    (expectedType === 'object' && actualType === 'object') ||
    (expectedType === 'array' && Array.isArray(value));

  if (!typeValid) {
    return {
      field,
      message: `Expected type "${expectedType}" but got "${actualType}"`,
      severity: 'error',
    };
  }
  return null;
}

function validateRange(field: string, value: unknown, schema: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof value !== 'number') return errors;

  if (schema.minimum !== undefined && value < (schema.minimum as number)) {
    errors.push({ field, message: `Value ${value} is below minimum ${schema.minimum}`, severity: 'error' });
  }
  if (schema.maximum !== undefined && value > (schema.maximum as number)) {
    errors.push({ field, message: `Value ${value} exceeds maximum ${schema.maximum}`, severity: 'error' });
  }
  if (schema.exclusiveMinimum !== undefined && value <= (schema.exclusiveMinimum as number)) {
    errors.push({ field, message: `Value ${value} must be greater than ${schema.exclusiveMinimum}`, severity: 'error' });
  }
  if (schema.exclusiveMaximum !== undefined && value >= (schema.exclusiveMaximum as number)) {
    errors.push({ field, message: `Value ${value} must be less than ${schema.exclusiveMaximum}`, severity: 'error' });
  }

  return errors;
}

/**
 * Validate that a tool contract is well-formed.
 */
export function validateContract(contract: ToolContract): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!contract.inputs || !Array.isArray(contract.inputs)) {
    errors.push({ field: 'inputs', message: 'Contract must have an inputs array', severity: 'error' });
  }
  if (!contract.outputs || !Array.isArray(contract.outputs)) {
    errors.push({ field: 'outputs', message: 'Contract must have an outputs array', severity: 'error' });
  }

  // Check for duplicate port names
  const inputNames = new Set<string>();
  for (const port of contract.inputs ?? []) {
    if (inputNames.has(port.name)) {
      errors.push({ field: `inputs.${port.name}`, message: `Duplicate input name "${port.name}"`, severity: 'error' });
    }
    inputNames.add(port.name);
  }

  const outputNames = new Set<string>();
  for (const port of contract.outputs ?? []) {
    if (outputNames.has(port.name)) {
      errors.push({ field: `outputs.${port.name}`, message: `Duplicate output name "${port.name}"`, severity: 'error' });
    }
    outputNames.add(port.name);
  }

  if ((contract.outputs ?? []).length === 0) {
    warnings.push({ field: 'outputs', message: 'Tool has no outputs defined', severity: 'warning' });
  }

  return { valid: errors.length === 0, errors, warnings };
}
