/**
 * n8n-inspired handle format for ReactFlow connection ports.
 * Format: "mode/type/index" e.g. "outputs/main/0"
 */

export type HandleMode = 'inputs' | 'outputs';
export type HandleType = 'main' | 'ai_model' | 'ai_tool' | 'ai_policy' | 'ai_memory';

export interface HandleInfo {
  mode: HandleMode;
  type: HandleType;
  index: number;
}

/** Encode handle parts into string format: "outputs/main/0" */
export function encodeHandle(mode: HandleMode, type: HandleType, index: number): string {
  return `${mode}/${type}/${index}`;
}

/** Decode handle string back to parts */
export function decodeHandle(handle: string): HandleInfo {
  const parts = handle.split('/');
  if (parts.length !== 3) {
    throw new Error(`Invalid handle format: "${handle}". Expected "mode/type/index"`);
  }
  return {
    mode: parts[0] as HandleMode,
    type: parts[1] as HandleType,
    index: parseInt(parts[2], 10),
  };
}

/** Check if a handle string is valid */
export function isValidHandle(handle: string): boolean {
  try {
    const info = decodeHandle(handle);
    return (
      (info.mode === 'inputs' || info.mode === 'outputs') &&
      typeof info.index === 'number' &&
      !isNaN(info.index) &&
      info.index >= 0
    );
  } catch {
    return false;
  }
}

/** Get the opposite mode */
export function oppositeMode(mode: HandleMode): HandleMode {
  return mode === 'inputs' ? 'outputs' : 'inputs';
}

/** Check if two handles can connect (output -> input, same type) */
export function canConnect(sourceHandle: string, targetHandle: string): boolean {
  try {
    const source = decodeHandle(sourceHandle);
    const target = decodeHandle(targetHandle);
    return source.mode === 'outputs' && target.mode === 'inputs' && source.type === target.type;
  } catch {
    return false;
  }
}

/** Generate standard main I/O handles for a node with given input/output counts */
export function generateMainHandles(inputCount: number, outputCount: number): {
  inputs: string[];
  outputs: string[];
} {
  return {
    inputs: Array.from({ length: inputCount }, (_, i) => encodeHandle('inputs', 'main', i)),
    outputs: Array.from({ length: outputCount }, (_, i) => encodeHandle('outputs', 'main', i)),
  };
}

/** Generate agent sub-port handles */
export function generateAgentHandles(): {
  inputs: string[];
  outputs: string[];
} {
  return {
    inputs: [
      encodeHandle('inputs', 'main', 0),
      encodeHandle('inputs', 'ai_model', 0),
      encodeHandle('inputs', 'ai_tool', 0),
      encodeHandle('inputs', 'ai_policy', 0),
      encodeHandle('inputs', 'ai_memory', 0),
    ],
    outputs: [encodeHandle('outputs', 'main', 0)],
  };
}
