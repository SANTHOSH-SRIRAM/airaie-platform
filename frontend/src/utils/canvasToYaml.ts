import type { Edge } from '@xyflow/react';

/** Minimal node shape accepted by the YAML generator -- compatible with both WorkflowEditorNode and Node<CanvasNodeData> */
interface YamlNodeInput {
  id: string;
  data: {
    label: string;
    nodeType: string;
    toolRef?: string;
    agentRef?: string;
    inputs: Record<string, unknown>;
    resourceLimits?: { cpu?: number; memoryMb?: number; timeoutSeconds: number };
    retryPolicy?: { maxRetries: number; delaySeconds?: number; waitBetweenSeconds?: number };
  };
}

/**
 * Convert ReactFlow canvas state to AIRAIE YAML DSL string.
 * Uses simple template string building -- no yaml library dependency needed.
 */
export function canvasToYamlDsl(
  nodes: YamlNodeInput[],
  edges: Edge[],
  metadata: { name: string; version: string },
): string {
  // Build dependency map: target -> list of source node IDs
  const depsMap = new Map<string, string[]>();
  for (const edge of edges) {
    const deps = depsMap.get(edge.target) ?? [];
    deps.push(edge.source);
    depsMap.set(edge.target, deps);
  }

  const lines: string[] = [];

  lines.push(`apiVersion: airaie.workflow/v1`);
  lines.push(`kind: Workflow`);
  lines.push(``);
  lines.push(`metadata:`);
  lines.push(`  name: ${yamlStr(metadata.name)}`);
  lines.push(`  version: ${yamlStr(metadata.version)}`);
  lines.push(``);
  lines.push(`nodes:`);

  for (const node of nodes) {
    lines.push(`  - id: ${yamlStr(node.id)}`);
    lines.push(`    name: ${yamlStr(node.data.label)}`);
    lines.push(`    type: ${yamlStr(node.data.nodeType)}`);

    if (node.data.toolRef) {
      lines.push(`    tool: ${yamlStr(node.data.toolRef)}`);
    }
    if (node.data.agentRef) {
      lines.push(`    agent: ${yamlStr(node.data.agentRef)}`);
    }

    // Inputs / parameters
    const inputEntries = Object.entries(node.data.inputs);
    if (inputEntries.length > 0) {
      lines.push(`    inputs:`);
      for (const [key, value] of inputEntries) {
        lines.push(`      ${key}: ${yamlValue(value)}`);
      }
    }

    // depends_on
    const deps = depsMap.get(node.id);
    if (deps && deps.length > 0) {
      lines.push(`    depends_on:`);
      for (const dep of deps) {
        lines.push(`      - ${yamlStr(dep)}`);
      }
    }

    // Resource limits -> timeout
    if (node.data.resourceLimits) {
      lines.push(`    timeout: ${node.data.resourceLimits.timeoutSeconds}s`);
    }

    // Retry policy
    if (node.data.retryPolicy) {
      const delay = node.data.retryPolicy.delaySeconds ?? node.data.retryPolicy.waitBetweenSeconds ?? 0;
      lines.push(`    retry:`);
      lines.push(`      max_attempts: ${node.data.retryPolicy.maxRetries}`);
      lines.push(`      delay: ${delay}s`);
    }

    // Critical flag -- nodes with no dependents are considered leaf/critical
    const hasDownstream = edges.some((e) => e.source === node.id);
    if (!hasDownstream && nodes.length > 1) {
      lines.push(`    critical: true`);
    }

    lines.push(``);
  }

  lines.push(`outputs: {}`);

  return lines.join('\n');
}

// --- Helpers ---

/** Escape a string for YAML output. Wrap in quotes if it contains special characters. */
function yamlStr(val: string): string {
  if (/[:#{}[\],&*?|>!%@`'"\\]/.test(val) || val.includes('\n') || val.trim() !== val) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

/** Convert an arbitrary value to a YAML-compatible scalar string */
function yamlValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') return yamlStr(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return `[${val.map(yamlValue).join(', ')}]`;
  }
  if (typeof val === 'object') {
    // Simple inline object for shallow objects
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const parts = entries.map(([k, v]) => `${k}: ${yamlValue(v)}`);
    return `{${parts.join(', ')}}`;
  }
  return String(val);
}
