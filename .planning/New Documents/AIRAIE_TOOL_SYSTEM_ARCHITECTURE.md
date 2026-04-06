# AIRAIE TOOL SYSTEM — Complete Architecture & Implementation Guide

> How Tools actually work at every layer: definition, contracts, execution, outputs, resolution, integration, versioning, governance, and deployment.
> Date: 2026-04-06

---

## 1. WHAT IS A TOOL?

### Definition

A **Tool** in Airaie is a **self-contained, versioned, executable unit** that performs a single well-defined engineering operation. It accepts typed inputs, runs computation logic in an isolated environment, and produces typed outputs.

A Tool is NOT:
- A UI component
- A library function you import
- A loose script sitting on someone's laptop

A Tool IS:
- A **black box with a contract** — defined inputs, defined outputs, defined resource needs
- **Containerized** — runs in Docker (primary), Python runtime, WASM sandbox, CLI, hardware device, or as a remote API call
- **Versioned** — every change creates a new version with semantic numbering
- **Registered** — stored in the ToolShelf (Registry) with metadata, contract, and execution config
- **Composable** — can be used inside Workflows (as nodes) and by Agents (as callable tools)
- **Trust-tracked** — carries a trust level that evolves with usage history

### The Tool Equation

```
Tool = Contract (what it accepts/returns)
     + Logic (how it computes)
     + Execution Config (where/how it runs)
     + Metadata (name, version, category, owner, domain_tags)
     + Trust (Bayesian trust score from execution history)
```

### Tool Tier Taxonomy

Tools are classified into three tiers based on scope, complexity, and composability:

| Tier | Name | Scope | Example | Characteristics |
|------|------|-------|---------|-----------------|
| **Tier 1** | Primitives | Small, stable, reusable | Unit Converter, Format Validator, Hash Calculator | Single operation, <1s typical runtime, no side effects, easily testable |
| **Tier 2** | Domain Operators | Mid-level, domain-specific | FEA Solver, Mesh Generator, Material Lookup | One engineering task, seconds-to-minutes runtime, domain expertise required |
| **Tier 3** | Products | End-to-end pipelines, agent-composable | Full Structural Validation Pipeline, DFM Check Suite | Multi-step, minutes-to-hours runtime, orchestrates Tier 1/2 internally |

**Guidelines:**
- Prefer Tier 1 and Tier 2 tools for maximum reusability
- Tier 3 tools should compose lower-tier tools, not duplicate their logic
- Agent selection prefers Tier 2 for most tasks; Tier 3 only when explicitly requested

### Tool Types

| Type | What It Does | Example | Typical Runtime | Typical Tier |
|------|-------------|---------|-----------------|--------------|
| **Simulation** | Runs physics/engineering simulation | FEA Solver, CFD Engine | Docker (heavy compute) | 2 |
| **Meshing** | Generates or processes mesh geometry | Mesh Generator, Mesh Refiner | Docker | 2 |
| **Analysis** | Post-processes simulation results | Result Analyzer, Tolerance Checker | Python or Docker | 2 |
| **Data Query** | Fetches data from external databases | Material Database, Standards Lookup | Remote API | 1-2 |
| **File Processor** | Transforms file formats | STEP Converter, Report Builder | Python or WASM | 1 |
| **AI/ML Model** | Runs inference or training | Surrogate Model, Defect Detector | Docker (GPU) | 2-3 |
| **Validator** | Checks compliance against rules | DFM Checker, Code Validator | Python | 1-2 |
| **Utility** | General-purpose helper operations | Unit Converter, Data Formatter | Python or WASM | 1 |

### What Makes Airaie Tools Different from n8n Nodes

```
n8n Node:
  - In-process JavaScript function
  - Calls external APIs (Slack, Gmail, etc.)
  - Data stays in memory (KB-sized JSON)
  - Millisecond execution
  - No resource isolation

Airaie Tool:
  - Isolated Docker container (or Python/WASM/API/CLI/hardware)
  - Runs actual engineering software (FEA solvers, CFD engines)
  - Data flows as artifact references (GB-sized files in S3)
  - Seconds to hours execution
  - Full resource isolation (CPU, memory, network, filesystem limits)
  - Policy enforcement (sandbox, deny network, etc.)
  - Trust tracking and Bayesian scoring
  - Intent-based resolution (agents find tools by what they need, not by name)
```

---

## 2. TOOLCONTRACT — THE COMPLETE TOOL DEFINITION

### Overview

A ToolContract is the single source of truth for a tool. It contains 7 required sections and 2 optional sections. Everything — the registry, agents, workflows, runners, governance — reads from this contract.

### Full ToolContract Structure

```json
{
  "metadata": {
    "id": "tool_fea_stress_v2",
    "name": "FEA Stress Analyzer",
    "version": "2.1.0",
    "owner": "structural-team",
    "domain_tags": ["structural", "fea", "stress-analysis"],
    "license": "proprietary",
    "source": "registry.airaie.io/fea-solver:2.1",
    "tier": 2,
    "description": "Performs finite element stress analysis on meshed geometry"
  },

  "interface": {
    "inputs": [
      {
        "name": "mesh_file",
        "type": "artifact",
        "required": true,
        "description": "Input mesh geometry file in STL, STEP, or VTK format",
        "constraints": {
          "accepted_formats": [".stl", ".step", ".vtk"],
          "max_size_mb": 500
        }
      },
      {
        "name": "threshold",
        "type": "parameter",
        "required": false,
        "description": "Maximum allowable stress in MPa",
        "schema": { "type": "number" },
        "constraints": { "min": 1, "max": 10000 },
        "default": 250,
        "unit": "MPa"
      },
      {
        "name": "output_format",
        "type": "parameter",
        "required": true,
        "description": "Output file format for results",
        "schema": { "type": "string" },
        "constraints": { "enum": ["vtk", "csv", "json"] },
        "default": "vtk"
      },
      {
        "name": "analysis_config",
        "type": "parameter",
        "required": false,
        "description": "Advanced solver configuration",
        "schema": { "type": "object" },
        "value_schema": {
          "type": "object",
          "properties": {
            "solver_type": { "type": "string", "enum": ["linear", "nonlinear"] },
            "convergence_tol": { "type": "number", "default": 1e-6 },
            "max_iterations": { "type": "integer", "default": 100 }
          }
        }
      },
      {
        "name": "material",
        "type": "parameter",
        "required": true,
        "description": "Material designation (e.g., Al6061-T6, Steel-304)",
        "schema": { "type": "string" },
        "constraints": { "pattern": "^[A-Za-z0-9\\-]+$" }
      }
    ],

    "outputs": [
      {
        "name": "result",
        "type": "artifact",
        "description": "Primary simulation result file",
        "artifact_kind": "measurement.result",
        "constraints": { "format_hint": "vtk" }
      },
      {
        "name": "metrics",
        "type": "metric",
        "description": "Execution metrics and summary data",
        "value_schema": {
          "type": "object",
          "properties": {
            "max_stress": { "type": "number", "unit": "MPa" },
            "min_stress": { "type": "number", "unit": "MPa" },
            "safety_factor": { "type": "number" },
            "element_count": { "type": "integer" },
            "iterations": { "type": "integer" },
            "converged": { "type": "boolean" }
          }
        }
      }
    ],

    "errors": [
      { "code": "MESH_INVALID", "description": "Input mesh is malformed or unreadable" },
      { "code": "DIVERGED", "description": "Solver failed to converge within max_iterations" },
      { "code": "OOM", "description": "Analysis exceeded memory limits" }
    ],

    "streaming": {
      "progress": true,
      "log_chunks": true,
      "intermediate_results": false
    }
  },

  "runtime": {
    "adapter": "docker",
    "locality": "cloud",
    "resources": {
      "cpu": 4,
      "memory_mb": 2048,
      "disk_mb": 5000,
      "gpu": false
    },
    "timeout_sec": 300,
    "deterministic": false,
    "adapter_specific": {
      "image": "registry.airaie.io/fea-solver:2.1",
      "entrypoint": "/app/run.sh",
      "work_dir": "/workspace"
    }
  },

  "capabilities": {
    "computes": ["stress_field", "safety_factor", "convergence_check"],
    "requires": ["meshed_geometry", "material_properties"],
    "improves": ["structural_validation", "design_verification"],
    "invocation_modes": ["workflow_node", "agent_tool", "standalone"],
    "composition": {
      "can_parallelize": true,
      "idempotent": true,
      "cacheable": true,
      "cache_key_inputs": ["mesh_file", "material", "analysis_config"]
    },
    "supported_intents": [
      { "intent_type": "sim.fea_stress_analysis", "confidence": 0.95 },
      { "intent_type": "sim.structural_validation", "confidence": 0.80 },
      { "intent_type": "analysis.safety_factor", "confidence": 0.70 }
    ]
  },

  "governance": {
    "sandbox": {
      "network": "deny",
      "filesystem": "sandbox",
      "max_cpu_per_job": 8,
      "max_memory_mb_per_job": 4096,
      "max_timeout_s_per_job": 600
    },
    "audit_log": true,
    "quota": {
      "max_concurrent_jobs": 10,
      "max_daily_runs": 500
    },
    "data_policy": {
      "retention_days": 90,
      "pii_handling": "none",
      "export_restricted": false
    },
    "approval": {
      "auto_approve_below_cost": 5.00,
      "require_review_above_cost": 50.00
    },
    "trust_level": "verified"
  },

  "observability": {
    "log_level": "info",
    "emit_metrics": true,
    "emit_traces": true
  },

  "tests": {
    "sample_cases": [
      {
        "name": "simple_bracket_stress",
        "inputs": {
          "mesh_file": "testdata/bracket_mesh.stl",
          "threshold": 250,
          "output_format": "json",
          "material": "Al6061-T6"
        },
        "expected_outputs": {
          "metrics.converged": true,
          "metrics.max_stress": { "$lt": 300 },
          "metrics.safety_factor": { "$gt": 0.5 }
        }
      }
    ]
  }
}
```

### Port Type System (3-Type)

Every input and output port uses one of three types:

| Type | What It Is | How It's Passed | Use Case |
|------|-----------|-----------------|----------|
| `artifact` | A file stored in S3/MinIO | Artifact ID reference; presigned URL downloaded into container | Geometry files, result files, reports, images |
| `parameter` | A typed value (string, number, boolean, object, array) | Direct value in Job payload; detailed type via `schema` field | Configuration values, thresholds, material names, solver settings |
| `metric` | A structured measurement or result value | Inline JSON in Result payload; detailed type via `value_schema` | Stress values, element counts, pass/fail status, timing data |

**How detailed typing works:**

The `schema` field on `parameter` ports and `value_schema` on `metric` ports use standard JSON Schema to express the full type:

```json
{
  "name": "threshold",
  "type": "parameter",
  "schema": { "type": "number" },
  "constraints": { "min": 1, "max": 10000 }
}
```

```json
{
  "name": "solver_config",
  "type": "parameter",
  "schema": { "type": "object" },
  "value_schema": {
    "type": "object",
    "properties": {
      "solver_type": { "type": "string", "enum": ["linear", "nonlinear"] },
      "convergence_tol": { "type": "number" }
    },
    "required": ["solver_type"]
  }
}
```

```json
{
  "name": "result_vtk",
  "type": "artifact",
  "artifact_kind": "report.pdf",
  "constraints": { "accepted_formats": [".pdf"], "max_size_mb": 100 }
}
```

**Constraints object reference:**

| Constraint | Applies To | Example |
|-----------|-----------|---------|
| `enum` | parameter (string) | `["vtk", "csv", "json"]` |
| `min`, `max` | parameter (number/integer) | `{ "min": 1, "max": 10000 }` |
| `pattern` | parameter (string) | `"^[A-Za-z0-9\\-]+$"` |
| `shape` | parameter (array) | `[3, 3]` (for matrix dimensions) |
| `accepted_formats` | artifact | `[".stl", ".step", ".vtk"]` |
| `max_size_mb` | artifact | `500` |
| `format_hint` | artifact (output) | `"vtk"` |

### Input Validation

Validation happens at **three stages**:

```
STAGE 1: LINT TIME (when tool contract is registered)
  - Schema validation: does the contract conform to ToolContract schema?
  - Port type checks: are all types one of artifact | parameter | metric?
  - Constraints validity: are min < max, enum non-empty, patterns valid regex?
  - 12 lint checks applied (see Section 11: Contract Validation)
  - Detected at: tool registration (POST /v0/tools)
  - Result: registration rejected if lint fails

STAGE 2: COMPILE TIME (when workflow is compiled)
  - Schema validation: are all required inputs connected?
  - Type checking: does the upstream output type match this input type?
  - Enum validation: are enum values in the allowed set?
  - Detected at: workflow compile step (POST /v0/workflows/compile)
  - Result: compile error if validation fails — workflow cannot be published

STAGE 3: RUNTIME (when job is dispatched)
  - Value validation: is the number within min/max range?
  - Artifact validation: does the artifact ID exist in MinIO?
  - Size validation: is the file under max_size_mb?
  - Format validation: does file extension match accepted_formats?
  - value_schema validation: does JSON object match its JSON Schema?
  - Detected at: Go control plane before NATS dispatch (PreflightService)
  - Result: run fails immediately with validation error — no container started
```

### Where Inputs Come From

```
SOURCE 1: USER (manual input)
  User provides values in the Workflow Editor Node Inspector panel.
  These become static values in the workflow definition.
  Example: threshold = 250 (hardcoded in workflow)

SOURCE 2: PREVIOUS WORKFLOW STEP (data flow)
  Output from upstream node flows as input to this node.
  Mapping: {{ $('Mesh Generator').artifacts.mesh_output }}
  The workflow scheduler resolves expressions at runtime.

SOURCE 3: AGENT DECISION (dynamic)
  Agent's LLM proposes input values in the ActionProposal.
  Example: Agent decides threshold = 200 based on material properties.
  These are resolved at agent runtime, not at workflow compile time.

SOURCE 4: TRIGGER DATA (webhook/event)
  Incoming webhook payload provides initial inputs.
  Example: POST /webhook/validate with body { "geometry": "bracket_v3.step" }

SOURCE 5: DEFAULTS (fallback)
  If input is optional and no value provided, the default from the
  contract is used.
  Example: convergence_tol defaults to 1e-6 if not specified.
```

### Input Resolution Order

```
1. Explicit value from workflow definition (user-configured)
2. Expression result from upstream node ({{ $('Node').json.field }})
3. Agent proposal value (if inside agent execution)
4. Trigger/webhook payload data
5. Default value from tool contract
6. ERROR: if required and no value found → run fails with missing input error
```

---

## 3. TOOL EXECUTION LOGIC (THE CRITICAL PIECE)

### Where the Actual Logic Lives

This is the most important section. A tool's contract defines WHAT it accepts and returns. The execution logic defines HOW it actually computes.

```
TOOL REGISTRATION consists of TWO things:

  1. CONTRACT (stored in PostgreSQL):
     Full ToolContract with all 7+ sections (metadata, interface,
     runtime, capabilities, governance, observability, tests)

  2. EXECUTION TARGET (stored in PostgreSQL + Docker Registry):
     Determined by the runtime section:
     {
       adapter: "docker",
       adapter_specific: {
         image: "registry.airaie.io/fea-solver:2.1",
         entrypoint: "/app/run.sh",
         work_dir: "/workspace"
       }
     }
     This points to WHERE the actual code lives.
```

### The Nine Runtime Adapters

Airaie supports nine ways to execute tool logic:

| # | Adapter | Use Case | Isolation | Startup | Compute |
|---|---------|----------|-----------|---------|---------|
| 1 | **docker** | Heavy simulation, custom environments | Full container | Seconds | Heavy |
| 2 | **python** | Lightweight data transforms, simple calcs | Process-level | Fast | Light |
| 3 | **native** | WASM/compiled binaries, sandboxed execution | WASM sandbox | Instant | Light |
| 4 | **remote_api** | External HTTP services, databases | Network call | N/A | External |
| 5 | **notebook** | Jupyter-based analysis, exploratory tools | Container | Seconds | Medium |
| 6 | **workflow** | Composite tools that run sub-workflows | Orchestrated | Variable | Variable |
| 7 | **cli** | Command-line tools on runner host | Process-level | Fast | Light-Medium |
| 8 | **human_task** | Manual steps requiring human action | None (human) | Variable | N/A |
| 9 | **hardware_device** | Physical instruments, test equipment | Device protocol | Variable | External |

---

#### ADAPTER 1: Docker Container (PRIMARY — used by 80% of tools)

```
HOW IT WORKS:
  1. Tool author builds a Docker image containing their software
  2. Image is pushed to a Docker registry (registry.airaie.io or Docker Hub)
  3. Tool registration records the image name and tag
  4. At runtime, the Rust Runner pulls the image, creates a container,
     mounts inputs, executes, and collects outputs

WHAT'S INSIDE THE DOCKER IMAGE:
  ┌─────────────────────────────────────┐
  │  Docker Image: fea-solver:2.1       │
  │                                     │
  │  /app/                              │
  │    ├── run.sh          (entrypoint) │
  │    ├── solver.py       (main logic) │
  │    ├── requirements.txt             │
  │    └── lib/                         │
  │        ├── mesh_reader.py           │
  │        ├── fem_engine.py            │
  │        └── output_writer.py         │
  │                                     │
  │  /workspace/           (mounted)    │
  │    ├── inputs/                      │
  │    │   ├── mesh_file.stl (downloaded from S3) │
  │    │   └── config.json   (input params)       │
  │    └── outputs/                     │
  │        ├── result.vtk    (produced by tool)   │
  │        └── metrics.json  (produced by tool)   │
  └─────────────────────────────────────┘

ENTRYPOINT SCRIPT (run.sh):
  #!/bin/bash
  # Inputs are already downloaded to /workspace/inputs/
  # Config is at /workspace/inputs/config.json
  
  python /app/solver.py \
    --mesh /workspace/inputs/mesh_file.stl \
    --config /workspace/inputs/config.json \
    --output-dir /workspace/outputs/
  
  # Exit code 0 = success, non-zero = failure
  # Outputs in /workspace/outputs/ are auto-uploaded to S3

THE SOLVER SCRIPT (solver.py — this is the actual tool logic):
  import json
  import sys
  from lib.mesh_reader import read_mesh
  from lib.fem_engine import run_analysis
  from lib.output_writer import write_vtk, write_metrics

  def main():
      # Read config
      with open('/workspace/inputs/config.json') as f:
          config = json.load(f)
      
      # Read mesh
      mesh = read_mesh(config['mesh_file_path'])
      
      # Run FEA analysis
      results = run_analysis(
          mesh=mesh,
          material=config['material'],
          solver_type=config.get('solver_type', 'linear'),
          convergence_tol=config.get('convergence_tol', 1e-6),
          max_iterations=config.get('max_iterations', 100)
      )
      
      # Write outputs
      output_format = config.get('output_format', 'vtk')
      if output_format == 'vtk':
          write_vtk(results, '/workspace/outputs/result.vtk')
      
      # Write metrics
      metrics = {
          'max_stress': results.max_stress,
          'min_stress': results.min_stress,
          'safety_factor': results.safety_factor,
          'element_count': mesh.element_count,
          'iterations': results.iterations,
          'converged': results.converged
      }
      write_metrics(metrics, '/workspace/outputs/metrics.json')
      
      # Check threshold
      threshold = config.get('threshold', 250)
      if results.max_stress > threshold:
          print(f"WARNING: Max stress {results.max_stress} exceeds threshold {threshold}")
          # Still exit 0 — the tool completed successfully
          # The threshold check is informational, not a hard failure
      
      print(f"Analysis complete. Max stress: {results.max_stress} MPa")
      sys.exit(0)

  if __name__ == '__main__':
      main()
```

**Dockerfile for the tool:**

```dockerfile
FROM python:3.11-slim

# Install dependencies
COPY requirements.txt /app/
RUN pip install -r /app/requirements.txt

# Copy tool code
COPY solver.py /app/
COPY lib/ /app/lib/
COPY run.sh /app/

RUN chmod +x /app/run.sh

# Working directory for inputs/outputs
WORKDIR /workspace

ENTRYPOINT ["/app/run.sh"]
```

---

#### ADAPTER 2: Python Runtime (for lightweight tools)

```
HOW IT WORKS:
  Tool logic is a Python function executed in a managed Python environment
  on the runner. No Docker container overhead.

  Good for: data transformations, file format conversion, simple calculations
  Bad for: heavy simulations, tools needing special dependencies

TOOL CODE (stored as a Python file in the tool package):
  # tool.py
  def execute(inputs: dict, outputs_dir: str) -> dict:
      """
      inputs: {
          "data": [1, 2, 3, 4, 5],
          "operation": "mean"
      }
      """
      data = inputs['data']
      operation = inputs['operation']
      
      if operation == 'mean':
          result = sum(data) / len(data)
      elif operation == 'sum':
          result = sum(data)
      elif operation == 'max':
          result = max(data)
      
      return {
          'result': result,
          'count': len(data),
          'operation': operation
      }

EXECUTION:
  The Rust runner loads the Python interpreter, injects inputs,
  calls execute(), and captures the return value as output.
  
  Pros: Fast startup (no container pull), low overhead
  Cons: Limited to Python, shared environment, less isolation
```

---

#### ADAPTER 3: Native (WASM/compiled binaries — sandboxed lightweight tools)

```
HOW IT WORKS:
  Tool logic compiled to WebAssembly and executed in a WASM runtime.
  Extremely lightweight, fast startup, fully sandboxed.

  Good for: Unit conversion, format validation, simple transformations
  Bad for: Anything needing filesystem, network, or heavy compute

TOOL CODE (compiled to .wasm):
  // Written in Rust, compiled to WASM
  #[no_mangle]
  pub fn execute(input_json: &str) -> String {
      let input: serde_json::Value = serde_json::from_str(input_json).unwrap();
      let value = input["value"].as_f64().unwrap();
      let from_unit = input["from"].as_str().unwrap();
      let to_unit = input["to"].as_str().unwrap();
      
      let result = convert_unit(value, from_unit, to_unit);
      
      format!(r#"{{"result": {}, "from": "{}", "to": "{}"}}"#, result, from_unit, to_unit)
  }
```

---

#### ADAPTER 4: Remote API (for external services)

```
HOW IT WORKS:
  Tool wraps an external HTTP API. The runner makes HTTP requests
  to the external service and maps responses to the tool output schema.

  Good for: Material databases, cloud simulation services, third-party APIs
  Bad for: Anything requiring file processing or local compute

TOOL CONFIGURATION:
  {
    "adapter": "remote_api",
    "adapter_specific": {
      "endpoint": "https://api.materialdb.io/v2/properties",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer ${CREDENTIAL:material_db_key}",
        "Content-Type": "application/json"
      },
      "request_mapping": {
        "body": {
          "material_name": "{{ inputs.material }}",
          "properties": ["yield_strength", "density", "elastic_modulus"]
        }
      },
      "response_mapping": {
        "outputs.properties": "$.data.properties",
        "outputs.source": "$.data.source_standard"
      },
      "timeout_ms": 10000,
      "retry_count": 3
    }
  }

EXECUTION:
  1. Runner builds HTTP request from request_mapping + input values
  2. Makes HTTP call to the endpoint
  3. Maps response JSON to output schema using response_mapping
  4. Returns mapped output
```

---

#### ADAPTER 5: Notebook (Jupyter-based analysis)

```
HOW IT WORKS:
  Tool executes a Jupyter notebook with parameterized cells.
  Good for exploratory analysis that needs to be productionized.

  adapter_specific: {
    "notebook_path": "analysis/stress_report.ipynb",
    "kernel": "python3",
    "parameters_cell_tag": "parameters"
  }

EXECUTION:
  1. Runner launches Jupyter kernel in container
  2. Injects parameters into tagged cell
  3. Executes all cells sequentially
  4. Extracts outputs from tagged output cells
  5. Collects generated files as artifacts
```

---

#### ADAPTER 6: Workflow (composite sub-workflow tools)

```
HOW IT WORKS:
  Tool invokes another Airaie workflow as a sub-execution.
  Enables Tier 3 products to compose Tier 1/2 tools.

  adapter_specific: {
    "workflow_id": "wf_structural_validation",
    "workflow_version": "1.2.0",
    "input_mapping": { ... },
    "output_mapping": { ... }
  }
```

---

#### ADAPTER 7: CLI (command-line tools)

```
HOW IT WORKS:
  Tool runs a command-line program on the runner host.
  For tools that are simple executables without Docker overhead.

  adapter_specific: {
    "command": "/usr/local/bin/meshlab-server",
    "args": ["--input", "{{ inputs.mesh_file }}", "--export-stl"],
    "env": { "DISPLAY": ":0" }
  }
```

---

#### ADAPTER 8: Human Task (manual steps)

```
HOW IT WORKS:
  Tool creates a task for a human to complete. Used for approvals,
  manual inspections, or steps requiring physical action.

  adapter_specific: {
    "task_type": "approval",
    "assignee_role": "senior-engineer",
    "instructions": "Review the stress analysis report and approve or reject.",
    "timeout_hours": 48
  }

EXECUTION:
  1. Runner creates a HumanTask record in PostgreSQL
  2. Notifies assigned user via UI/email
  3. Waits for human response (status polling)
  4. Human submits decision → tool completes
```

---

#### ADAPTER 9: Hardware Device (physical instruments)

```
HOW IT WORKS:
  Tool interfaces with physical test equipment or instruments.
  Used for lab automation, data acquisition, calibration.

  adapter_specific: {
    "device_protocol": "modbus_tcp",
    "device_address": "192.168.1.50:502",
    "command_register": 100,
    "data_registers": [200, 201, 202],
    "poll_interval_ms": 500
  }
```

---

### Execution Lifecycle

Every tool execution follows this exact lifecycle:

```
┌──────────────────────────────────────────────────────────────────┐
│                    TOOL EXECUTION LIFECYCLE                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DISPATCH                                                     │
│     Go Control Plane builds Job payload from workflow node       │
│     Validates inputs against contract (PreflightService)         │
│     Generates presigned URLs for input artifacts (MinIO)         │
│     Generates presigned upload URLs for output artifacts         │
│     Publishes Job to NATS (airaie.jobs.tool.execution)           │
│     Status: PENDING → QUEUED                                     │
│                                                                  │
│  2. PICKUP                                                       │
│     Rust Runner consumes Job from NATS                           │
│     Checks available capacity (CPU, memory, concurrent slots)    │
│     Status: QUEUED → RUNNING                                     │
│                                                                  │
│  3. PREPARE                                                      │
│     Downloads input artifacts from MinIO via presigned URLs      │
│     Creates workspace directory structure:                       │
│       /tmp/airaie-runner/{job_id}/inputs/                        │
│       /tmp/airaie-runner/{job_id}/outputs/                       │
│     Writes config.json with non-artifact input values            │
│     Applies policy enforcement (from governance.sandbox):        │
│       - Network: deny (no outbound connections from container)   │
│       - Filesystem: sandbox (only /workspace readable/writable)  │
│       - Resource limits: CPU, memory, timeout applied            │
│                                                                  │
│  4. EXECUTE                                                      │
│     Starts Docker container (or other adapter)                   │
│     Mounts /workspace/inputs/ (read-only) and /outputs/ (write)  │
│     Streams stdout/stderr to log buffer                          │
│     Monitors resource usage (CPU, memory, wall clock)            │
│     Timer starts for timeout enforcement                         │
│                                                                  │
│  5. MONITOR                                                      │
│     Checks container health periodically                         │
│     Publishes progress events to NATS (airaie.events.{runId})    │
│     If timeout exceeded → kills container → status FAILED        │
│     If OOM (out of memory) → container dies → status FAILED      │
│                                                                  │
│  6. COLLECT                                                      │
│     Container exits with exit code                               │
│     If exit code == 0: SUCCESS path                              │
│       - Scans /workspace/outputs/ for produced files             │
│       - Uploads each output file to MinIO via presigned URLs     │
│       - Creates artifact records (SHA-256 hash, size, type)      │
│       - Reads metrics.json if present                            │
│     If exit code != 0: FAILURE path                              │
│       - Captures stderr as error message                         │
│       - No artifacts uploaded                                    │
│       - Error details included in Result                         │
│                                                                  │
│  7. REPORT                                                       │
│     Builds Result payload:                                       │
│       { job_id, status, exit_code, outputs, metrics, errors }    │
│     Publishes Result to NATS (airaie.results.completed)          │
│     Cleans up workspace directory                                │
│     Status: RUNNING → SUCCEEDED | FAILED | TIMEOUT | CANCELED    │
│                                                                  │
│  8. CONSUME (back in Go Control Plane)                           │
│     Result consumer receives Result from NATS                    │
│     Updates NodeRun status in PostgreSQL                         │
│     Creates artifact records in PostgreSQL                       │
│     Emits audit event (governance.audit_log)                     │
│     Updates tool trust statistics (success/failure count)        │
│     Checks if downstream nodes are ready (all deps satisfied)    │
│     Dispatches next nodes if ready                               │
│     If all nodes complete → Run status = SUCCEEDED               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Job Result Status Values

| Status | Meaning | Exit Code | Trigger |
|--------|---------|-----------|---------|
| `SUCCEEDED` | Tool completed normally | 0 | Clean exit |
| `FAILED` | Tool encountered an error | Non-zero | Runtime error, OOM, assertion failure |
| `TIMEOUT` | Tool exceeded allowed time | N/A (killed) | Wall clock > timeout_sec from runtime |
| `CANCELED` | Job was canceled externally | N/A (killed) | User cancellation, workflow abort, budget exceeded |

### Timeout Handling

```
THREE LEVELS OF TIMEOUT:

1. NODE TIMEOUT (per-tool, configurable in workflow):
   - Set in Node Inspector: "Timeout: 300s"
   - Stored in workflow node config
   - If tool runs longer than this → container killed → TIMEOUT
   - Default: from tool contract (runtime.timeout_sec)

2. POLICY TIMEOUT (per-tool, from governance.sandbox):
   - Set in tool registration: "max_timeout_s_per_job: 600"
   - This is the MAXIMUM — node timeout cannot exceed this
   - Enforced by Rust Runner before container starts
   - If node timeout > policy timeout → capped at policy timeout

3. WORKFLOW TIMEOUT (per-workflow, overall):
   - Set in workflow settings: "timeout: 3600s"
   - If total workflow execution exceeds this → all remaining nodes CANCELED
   - Enforced by Go Workflow Scheduler

TIMEOUT PRIORITY:
  Effective timeout = min(node_timeout, policy_max_timeout, remaining_workflow_timeout)
```

### Retry Logic

```
RETRY CONFIGURATION (per-node in workflow):
  {
    "retry": {
      "max_retries": 3,
      "wait_between_sec": 10,
      "backoff": "exponential",
      "retry_on": ["TIMEOUT", "FAILED"]
    }
  }

RETRY FLOW:
  Attempt 1: Execute tool → FAILED (exit code 1)
  Wait: 10 seconds
  Attempt 2: Execute tool → TIMEOUT (killed after 300s)
  Wait: 20 seconds (exponential backoff)
  Attempt 3: Execute tool → SUCCEEDED

  NodeRun record shows: attempt = 3

NON-RETRYABLE CONDITIONS:
  - Input validation failure (missing required input)
  - Artifact not found (referenced artifact doesn't exist)
  - Policy violation (requested resources exceed limits)
  - CANCELED status (explicit user cancellation)
  - These fail immediately with no retry
```

### Logging

```
LOG SOURCES:

1. CONTAINER STDOUT/STDERR:
   Everything the tool prints to stdout/stderr is captured.
   Streamed in real-time to the log buffer.
   Stored as a log artifact in MinIO after execution.
   Referenced as: logs_ref = "logs/run_{id}/job_{id}"

2. RUNNER SYSTEM LOGS:
   The Rust Runner logs its own operations:
   - "Downloading artifact art_abc123 from S3..."
   - "Starting container fea-solver:2.1..."
   - "Container exited with code 0"
   These are separate from tool logs.

3. CONTROL PLANE LOGS:
   Go services log dispatch, result processing, state transitions.
   Stored via OpenTelemetry tracing.

LOG DELIVERY TO FRONTEND:
  - SSE stream: GET /v0/runs/{id}/stream sends log chunks in real-time
  - Full logs: GET /v0/runs/{id}/logs returns complete log history
  - Per-node logs: filtered by node_id in the log viewer
```

---

## 4. TOOL OUTPUT DESIGN

### Output Schema

Outputs use the same 3-type system as inputs. Each output port is `artifact`, `parameter`, or `metric`.

```json
{
  "outputs": [
    {
      "name": "result",
      "type": "artifact",
      "description": "Primary simulation result file",
      "artifact_kind": "measurement.result",
      "constraints": { "format_hint": "vtk" }
    },
    {
      "name": "metrics",
      "type": "metric",
      "description": "Execution metrics and summary data",
      "value_schema": {
        "type": "object",
        "properties": {
          "max_stress": { "type": "number", "unit": "MPa" },
          "min_stress": { "type": "number", "unit": "MPa" },
          "safety_factor": { "type": "number" },
          "element_count": { "type": "integer" },
          "iterations": { "type": "integer" },
          "converged": { "type": "boolean" }
        }
      }
    },
    {
      "name": "report",
      "type": "artifact",
      "description": "Generated PDF validation report",
      "artifact_kind": "report.pdf",
      "constraints": { "accepted_formats": [".pdf"] }
    }
  ]
}
```

### How a Tool Returns Results

```
INSIDE THE CONTAINER:

  The tool writes files to /workspace/outputs/:
  
  /workspace/outputs/
  ├── result.vtk          → becomes artifact "result" (type: artifact)
  └── metrics.json        → becomes output "metrics" (type: metric)

  File names MUST match the output names in the contract.
  The runner scans this directory after the container exits.

WHAT THE RUNNER DOES WITH OUTPUTS:

  For type "artifact":
    1. Reads the file from /workspace/outputs/result.vtk
    2. Computes SHA-256 hash of the file content
    3. Uploads to MinIO via presigned upload URL
    4. Records artifact metadata:
       {
         id: "art_def456",
         name: "result.vtk",
         type: "artifact",
         artifact_kind: "measurement.result",
         content_hash: "sha256:a1b2c3d4...",
         size_bytes: 8600000,
         storage_uri: "s3://airaie-artifacts/run_xyz/result.vtk"
       }

  For type "metric":
    1. Reads the JSON file from /workspace/outputs/metrics.json
    2. Parses and validates against the output value_schema
    3. Includes the JSON object directly in the Result payload
    4. No separate artifact created (it's inline data)

  For type "parameter" (output):
    1. Reads the value from /workspace/outputs/{name}.json
    2. Validates against schema
    3. Includes inline in the Result payload
```

### What the Result Payload Looks Like

```json
{
  "job_id": "job_abc123",
  "status": "SUCCEEDED",
  "exit_code": 0,
  "outputs": [
    {
      "name": "result",
      "type": "artifact",
      "artifact_id": "art_def456",
      "artifact_kind": "measurement.result"
    },
    {
      "name": "metrics",
      "type": "metric",
      "value": {
        "max_stress": 187.3,
        "min_stress": 2.1,
        "safety_factor": 1.34,
        "element_count": 45000,
        "iterations": 8,
        "converged": true
      }
    }
  ],
  "metrics": {
    "duration_ms": 15000,
    "peak_mem_mb": 1024,
    "cpu_time_ms": 45000
  },
  "errors": [],
  "logs_ref": "logs/run_xyz789/job_abc123"
}
```

---

## 5. TRUST SYSTEM

### Trust Levels

Every tool carries a `trust_level` that reflects its reliability and verification status:

| Level | Meaning | Who Can Use | Requirements |
|-------|---------|-------------|--------------|
| `untested` | Newly registered, never executed | Owner only | None — default for new tools |
| `community` | Shared by author, used by others | Team members | Author publishes, passes lint checks |
| `tested` | Has passing test cases | All users | sample_cases pass, basic integration verified |
| `verified` | Proven reliable through usage | All users + agents | 10+ runs, >80% success rate |
| `certified` | Formally audited and approved | All users + critical workflows | 50+ runs, >95% success rate, human review |

### Bayesian Trust Formula

Trust score is computed using a Bayesian approach with an informative prior:

```
trust_score = (successes + 5) / (total_runs + 10)
```

**Why this formula:**
- Prior: 5 successes out of 10 runs (50% prior belief)
- With 0 runs: trust = 5/10 = 0.50 (neutral — no data yet)
- With 10 successes out of 10: trust = 15/20 = 0.75 (good but not certain)
- With 100 successes out of 100: trust = 105/110 = 0.955 (high confidence)
- With 50 successes out of 100: trust = 55/110 = 0.50 (correctly cautious)

### Trust Promotion Rules

```
PROMOTION: untested → community
  Trigger: Author publishes tool, passes all 12 lint checks
  Automatic: yes

PROMOTION: community → tested
  Trigger: All sample_cases in tests section pass
  Automatic: yes (on test execution)

PROMOTION: tested → verified
  Trigger: 10+ total runs AND success rate > 0.80
  Automatic: yes (checked after each run completes)
  Computed: trust_score = (successes + 5) / (total + 10) > 0.80

PROMOTION: verified → certified
  Trigger: 50+ total runs AND success rate > 0.95 AND human review approval
  Automatic: no — requires manual certification review
  Computed: trust_score = (successes + 5) / (total + 10) > 0.95

DEMOTION: Any level → tested (on degradation)
  Trigger: Trust score drops below level threshold
  Example: verified tool drops below 0.80 → demoted to tested
  Automatic: yes (checked after each failure)
```

### Trust Score in Practice

```json
{
  "tool_id": "tool_fea_stress_v2",
  "trust_level": "verified",
  "trust_stats": {
    "total_runs": 47,
    "successes": 43,
    "failures": 4,
    "trust_score": 0.842,
    "last_failure": "2026-03-15T10:30:00Z",
    "promoted_at": "2026-02-20T14:00:00Z"
  }
}
```

---

## 6. TOOLSHELF RESOLUTION — HOW TOOLS ARE FOUND

### Overview

When an agent needs a tool or a user searches the registry, the **ToolShelf Resolution** algorithm finds and ranks the best candidates. This is a 5-stage pipeline.

### The 5-Stage Resolution Algorithm

```
┌──────────────────────────────────────────────────────────────────┐
│                   TOOLSHELF RESOLUTION PIPELINE                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STAGE 1: DISCOVER                                               │
│  ─────────────────                                               │
│  Find all tools whose supported_intents match the requested      │
│  intent_type. Uses GIN index on JSONB for fast lookup.           │
│                                                                  │
│  Query:                                                          │
│    SELECT * FROM tool_versions                                   │
│    WHERE contract->'capabilities'->'supported_intents'           │
│          @> '[{"intent_type": "sim.fea_stress_analysis"}]'       │
│                                                                  │
│  Result: Set of candidate tools (typically 3-15)                 │
│                                                                  │
│  STAGE 2: FILTER                                                 │
│  ───────────────                                                 │
│  Remove candidates that don't meet hard constraints:             │
│    - trust_level >= minimum required (e.g., "tested" or higher)  │
│    - compliance: data_policy matches project requirements        │
│    - adapter: matches available runner capabilities              │
│    - version: not deprecated (unless explicitly requested)       │
│    - permissions: user/agent has execute permission               │
│                                                                  │
│  Result: Filtered candidate set                                  │
│                                                                  │
│  STAGE 3: RANK                                                   │
│  ────────────                                                    │
│  Compute composite score for each candidate:                     │
│                                                                  │
│    score = trust_weight                                          │
│          + success_rate × 80                                     │
│          + intent_confidence × 40                                │
│          + preference_bonus                                      │
│          - estimated_cost × 0.1                                  │
│          - estimated_time × 0.05                                 │
│                                                                  │
│  Trust weight by level:                                          │
│    certified = 100                                               │
│    verified  = 70                                                │
│    tested    = 30                                                │
│    community = 10                                                │
│    untested  = 0                                                 │
│                                                                  │
│  Preference bonus:                                               │
│    +50 if tool is in project's preferred_tools list              │
│    +20 if tool was used successfully in same workflow before     │
│                                                                  │
│  STAGE 4: EXPLAIN                                                │
│  ────────────────                                                │
│  Generate attribution breakdown for each ranked tool:            │
│    {                                                             │
│      "tool": "fea-solver@2.1",                                  │
│      "total_score": 227.6,                                      │
│      "breakdown": {                                              │
│        "trust_weight": 70,                                       │
│        "success_rate_score": 67.4,                               │
│        "intent_confidence_score": 38.0,                          │
│        "preference_bonus": 50,                                   │
│        "cost_penalty": -0.05,                                    │
│        "time_penalty": -0.75                                     │
│      },                                                          │
│      "reason": "Verified trust, 84.2% success, high confidence"  │
│    }                                                             │
│                                                                  │
│  STAGE 5: ASSEMBLE                                               │
│  ────────────────                                                │
│  Return ranked list with confidence scores:                      │
│    [                                                             │
│      { tool: "fea-solver@2.1", score: 227.6, confidence: 0.95 },│
│      { tool: "stress-calc@1.0", score: 145.2, confidence: 0.70 },│
│      { tool: "simple-fea@3.0", score: 98.1, confidence: 0.60 }  │
│    ]                                                             │
│                                                                  │
│  The top result is the recommended tool.                         │
│  Agent can override if it has domain-specific reasoning.         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Capability Resolution Scoring Strategies

The RANK stage supports three scoring strategies, selectable per project or per agent:

```
STRATEGY 1: Weighted (default)
  score = 0.4 × compatibility + 0.3 × trust + 0.3 × cost_efficiency
  
  Use when: Balanced selection needed, no strong preference
  Best for: General-purpose workflows, agent autonomous mode

STRATEGY 2: Priority
  score = compatibility (primary), trust (tiebreaker)
  
  Sort by highest compatibility first.
  Break ties by highest trust score.
  Ignore cost entirely.
  
  Use when: Correctness is paramount, cost is secondary
  Best for: Safety-critical analysis, certified workflows

STRATEGY 3: CostOptimized
  score = 0.2 × compatibility + 0.2 × trust + 0.6 × cost_efficiency
  
  Use when: Budget is constrained, acceptable tools are interchangeable
  Best for: Batch processing, exploratory runs, development testing
```

### Intent Types (Hierarchical Naming)

Intent types follow a dot-separated hierarchy:

```
sim.fea_stress_analysis       — FEA stress simulation
sim.fea_thermal_analysis      — FEA thermal simulation
sim.cfd_flow_analysis         — CFD flow simulation
analysis.safety_factor        — Safety factor computation
analysis.tolerance_check      — Tolerance verification
mesh.generate                 — Mesh generation
mesh.refine                   — Mesh refinement
data.material_lookup          — Material properties query
convert.file_format           — File format conversion
convert.units                 — Unit conversion
validate.dfm                  — Design for manufacturing check
validate.compliance           — Standards compliance check
report.generate               — Report generation
```

---

## 7. TOOL → WORKFLOW INTEGRATION

### How Tools Connect in a Workflow

```
WORKFLOW DAG:
  [Webhook] → [Mesh Generator] → [FEA Solver] → [Result Analyzer]

Each arrow is a CONNECTION that carries data:
  {
    source: "Mesh Generator",
    sourceOutput: "mesh_output",     // output name from contract
    target: "FEA Solver",
    targetInput: "mesh_file"         // input name from contract
  }

THE DATA THAT FLOWS:
  Not the actual file. The ARTIFACT REFERENCE:
  {
    "json": {
      "element_count": 45000,
      "quality": 0.95
    },
    "artifacts": {
      "mesh_output": "art_abc123"    // artifact ID in MinIO
    }
  }
```

### Output-to-Input Mapping

```
AUTOMATIC MAPPING (same type, same name):
  If Mesh Generator outputs "mesh_output" (artifact)
  and FEA Solver expects "mesh_file" (artifact)
  → User maps them in the Node Inspector:
    mesh_file = {{ $('Mesh Generator').artifacts.mesh_output }}

EXPRESSION-BASED MAPPING:
  FEA Solver inputs:
    mesh_file:     {{ $('Mesh Generator').artifacts.mesh_output }}
    threshold:     {{ $('Webhook').json.threshold }}         // from trigger
    material:      {{ $('Webhook').json.material }}
    output_format: "vtk"                                     // static value
    analysis_config: {
      solver_type: {{ $('Webhook').json.solver_type }},
      convergence_tol: 1e-6                                  // static
    }

WHAT HAPPENS AT RUNTIME:
  1. Mesh Generator completes → produces art_abc123
  2. Workflow scheduler resolves expressions:
     - $('Mesh Generator').artifacts.mesh_output → "art_abc123"
     - $('Webhook').json.threshold → 250
     - $('Webhook').json.material → "Al6061-T6"
  3. Builds Job payload for FEA Solver with resolved values
  4. Dispatches Job to NATS
```

### Type Compatibility Rules

```
COMPATIBLE (automatic):
  artifact → artifact          (file reference passed through)
  parameter → parameter        (value passed directly, schema must be compatible)
  metric → parameter           (metric value can be used as parameter input)

REQUIRES EXPRESSION:
  metric.field → parameter     (extract field: {{ $json.max_stress }})
  parameter → parameter        (coercion: {{ String($json.threshold) }})
  artifact → parameter         (artifact ID as string reference)

INCOMPATIBLE (compile error):
  parameter → artifact         (can't turn a value into a file)
  metric → artifact            (can't turn a measurement into a file)
  artifact → metric            (can't turn a file into a measurement)

The compiler checks these at workflow compile time and reports errors.
```

---

## 8. TOOL → AGENT INTERACTION

### How an Agent Decides Which Tool to Use

```
AGENT EXECUTION FLOW:

  1. CONTEXT RECEIVED:
     Agent gets: goal + input data + available tools list
     Goal: "Determine optimal mesh density and run FEA simulation"
     Input: { geometry: "art_cad_001", material: "Al6061-T6", load: 500 }
     Available tools: [mesh-generator@1.0, fea-solver@2.1, result-analyzer@1.0]

  2. TOOLSHELF RESOLUTION:
     Agent expresses intent: "sim.fea_stress_analysis"
     ToolShelf runs 5-stage resolution pipeline:
       DISCOVER → FILTER → RANK → EXPLAIN → ASSEMBLE
     Returns ranked list:
       [
         { tool: "fea-solver@2.1", score: 227.6, confidence: 0.95 },
         { tool: "stress-calc@1.0", score: 145.2, confidence: 0.70 }
       ]

  3. SCORING (hybrid algorithmic + LLM):
     For each candidate tool, scorer computes:
     - Compatibility: does the tool accept the available input types? (0-1)
     - Trust: Bayesian trust score from execution history (0-1)
     - Cost: estimated cost relative to budget (0-1, lower is better)
     - Algorithmic score: ToolShelf resolution score (30%)
     - LLM score: LLM judges relevance to goal (70%)
     - Final score: 0.7 * LLM + 0.3 * algorithmic

  4. PROPOSAL:
     ProposalGenerator sends to LLM:
     "Given goal '{goal}', context '{input}', and tools [{tool_list}],
      which tool should be used first and with what inputs?"
     
     LLM returns ActionProposal:
     {
       selected_tool: "mesh-generator@1.0",
       reasoning: "Need to generate mesh before FEA analysis",
       confidence: 0.92,
       inputs: {
         geometry: "art_cad_001",
         density: 0.8,
         element_type: "hex8"
       },
       estimated_cost: 0.30
     }

  5. POLICY CHECK:
     PolicyEnforcer evaluates:
     - confidence 0.92 >= threshold 0.85 → auto-approve
     - tool trust_level: "verified" >= minimum "tested" → allowed
     - tool permissions: mesh-generator has "execute" permission
     - cost $0.30 <= remaining budget $10.00
     - Result: AUTO-APPROVED

  6. EXECUTION:
     ProposalExecutor dispatches the tool as a Run:
     POST /v0/runs {
       tool_ref: "mesh-generator@1.0",
       inputs: { geometry: "art_cad_001", density: 0.8, element_type: "hex8" }
     }
     
     This follows the exact same execution lifecycle as workflow runs.

  7. RESULT INTERPRETATION:
     Tool completes → Result returned to agent:
     {
       outputs: {
         mesh_output: "art_mesh_002",
         metrics: { element_count: 45000, quality: 0.95 }
       }
     }
     
     Agent evaluates: "Mesh generated with 45,000 elements, quality 0.95.
     Good quality. Now I should run FEA analysis on this mesh."
     
     Agent proposes NEXT tool: fea-solver@2.1
     Inputs: { mesh_file: "art_mesh_002", threshold: 250, material: "Al6061-T6" }

  8. ITERATION:
     Agent repeats steps 2-7 until:
     - Goal is achieved (agent determines success)
     - Max iterations reached (from constraints)
     - Budget exhausted
     - Timeout exceeded
```

### How the Agent Provides Inputs to Tools

```
AGENT-PROVIDED INPUTS vs USER-PROVIDED INPUTS:

  In a WORKFLOW:
    Inputs are defined at DESIGN TIME by the user in the Node Inspector.
    They don't change between runs (unless expressions reference dynamic data).
    Example: threshold is always 250 because the user typed 250.

  With an AGENT:
    Inputs are decided at RUNTIME by the LLM.
    The LLM reads the tool contract and proposes specific values.
    Example: LLM decides threshold should be 200 for this particular
    geometry because it's a thin-wall design.

  The LLM sees the tool contract:
    "Tool: fea-solver@2.1
     Trust: verified (0.842)
     Intents: sim.fea_stress_analysis (0.95), analysis.safety_factor (0.70)
     Inputs:
       mesh_file (artifact, required): Input mesh file
       threshold (parameter, optional, default 250): Max stress in MPa
       output_format (parameter, enum: vtk/csv/json, required): Output format
       material (parameter, required): Material designation
     
     Your context:
       Available artifacts: art_mesh_002 (mesh from previous step)
       User specified: material = Al6061-T6, load = 500N
     
     Propose inputs for this tool:"

  LLM responds:
    {
      mesh_file: "art_mesh_002",
      threshold: 250,
      output_format: "vtk",
      material: "Al6061-T6"
    }
```

---

## 9. TOOL CONFIGURATION LAYER

### Resource Configuration

Resource limits are defined in the `runtime.resources` section of the ToolContract and enforced by the `governance.sandbox` policy:

```json
{
  "runtime": {
    "resources": {
      "cpu": 4,
      "memory_mb": 2048,
      "timeout_sec": 300,
      "disk_mb": 5000
    }
  },
  "governance": {
    "sandbox": {
      "network": "deny",
      "filesystem": "sandbox",
      "max_cpu_per_job": 8,
      "max_memory_mb_per_job": 4096,
      "max_timeout_s_per_job": 600
    }
  }
}
```

### How Limits Are Enforced

```
ENFORCEMENT POINTS:

1. TOOL REGISTRATION (tool author sets defaults):
   "This tool needs at least 4 CPU cores and 2GB memory"
   Stored in the runtime.resources section of the ToolContract.

2. WORKFLOW NODE CONFIG (workflow builder can override):
   User can increase or decrease limits in Node Inspector.
   But cannot EXCEED the governance.sandbox maximums.
   Example: User sets CPU=6, but sandbox max is 8, so 6 is allowed.
   Example: User sets CPU=12, but sandbox max is 8, so COMPILE ERROR.

3. RUST RUNNER (runtime enforcement):
   Docker container is started with:
   --cpus=4 --memory=2048m --pids-limit=256
   
   If container exceeds memory → OOM kill → FAILED
   If container exceeds timeout → SIGTERM then SIGKILL → TIMEOUT
   If container tries network → blocked by Docker network=none

4. QUOTA SERVICE (platform-level enforcement):
   Before dispatching, QuotaService checks (governance.quota):
   - Has this user/project exceeded daily run quota?
   - Is total concurrent usage within platform limits?
   - Is estimated cost within project budget?
   If quota exceeded → run rejected before dispatch
```

### Cost Tracking

```
COST CALCULATION:

  cost = (cpu_cores * duration_sec * cpu_rate_per_core_sec)
       + (memory_gb * duration_sec * memory_rate_per_gb_sec)
       + (artifact_storage_gb * storage_rate_per_gb_month)

  Example for FEA Solver:
    4 cores * 15s * $0.00001/core-sec = $0.0006
    2 GB * 15s * $0.000005/GB-sec    = $0.00015
    0.008 GB storage * $0.023/GB-mo   = $0.000184
    Total: ~$0.50 (rounded with overhead)

  TRACKED AT:
    - Estimated cost: calculated before dispatch (from runtime.resources defaults)
    - Actual cost: calculated after completion (from real resource usage)
    - Both stored in NodeRun record: cost_estimate, cost_actual
    - Aggregated per Run, per Workflow, per Project, per User
    - Checked against governance.approval thresholds
```

---

## 10. TOOL VERSIONING

### Version Lifecycle

```
STATES:
  draft → published → suspended → published (re-enable)
                    → deprecated (permanent)

  DRAFT:
    - Can be edited (contract, image, config)
    - Cannot be used in published workflows
    - Can be tested with "Test Run"
    - Only visible to tool owner
    - trust_level: untested

  PUBLISHED:
    - Immutable — cannot be edited
    - Can be used in workflows and by agents
    - Visible to all users in the registry
    - Has a semantic version number (e.g., 2.1.0)
    - trust_level: community (minimum after publish)

  SUSPENDED:
    - Temporarily disabled (e.g., discovered bug, security issue)
    - Existing workflows that reference it will FAIL at dispatch
    - Shows red warning in UI: "This version is suspended"
    - Cannot be added to new workflows
    - Can be re-enabled → returns to published state
    - Trust level frozen during suspension

  DEPRECATED:
    - Permanent end-of-life (newer version replaces it)
    - Still works (existing workflows continue to run)
    - Shows warning in UI: "This version is deprecated"
    - Cannot be added to new workflows
    - Encourages migration to newer version
    - Cannot return to published state

TRANSITION RULES:
  draft       → published    (author publishes, passes lint checks)
  published   → suspended    (admin or author suspends — reversible)
  suspended   → published    (admin or author re-enables)
  published   → deprecated   (author deprecates — permanent)
  suspended   → deprecated   (admin deprecates suspended tool — permanent)

VERSIONING RULES:
  - Version numbers follow semantic versioning: MAJOR.MINOR.PATCH
  - Each publish creates a new immutable version
  - Multiple versions can be published simultaneously
  - One version is marked as "latest" (default for new usage)
```

### How Workflows Lock to Versions

```
WORKFLOW NODE REFERENCES A SPECIFIC VERSION:
  {
    "id": "node_3",
    "type": "tool",
    "tool_ref": "fea-solver@2.1.0",    <- LOCKED to specific version
    "parameters": { ... }
  }

WHEN A NEW TOOL VERSION IS PUBLISHED:
  - Existing workflows are NOT affected (they reference the old version)
  - The old version continues to work (Docker image still exists)
  - Users see a notification: "FEA Solver v2.2.0 available"
  - Users manually update the tool_ref in their workflow to upgrade
  - This is an EXPLICIT upgrade, never automatic

VERSION RESOLUTION:
  "fea-solver@2.1.0"  → exact version (recommended)
  "fea-solver@2.1"    → latest patch of 2.1.x
  "fea-solver@2"      → latest minor of 2.x.x
  "fea-solver@latest"  → latest published version (not recommended for production)

SUSPENDED VERSION IMPACT:
  If a workflow references a suspended version:
  - Workflow FAILS at dispatch with "Tool version suspended" error
  - UI shows red error on the node
  - User must switch to a different version or wait for re-enable

DEPRECATION IMPACT:
  If a workflow references a deprecated version:
  - Workflow still runs (deprecated != deleted)
  - UI shows orange warning on the node
  - Compile step shows warning (not error)
  - User should upgrade but is not forced to
```

---

## 11. CONTRACT VALIDATION — 12 LINT CHECKS

Every ToolContract is validated with 12 lint checks at registration time. All must pass for the tool to be published.

| # | Check | What It Validates | Failure Example |
|---|-------|-------------------|-----------------|
| 1 | **metadata_complete** | All required metadata fields present (id, name, version, owner) | Missing `owner` field |
| 2 | **version_semver** | Version follows semantic versioning (MAJOR.MINOR.PATCH) | `"version": "2.1"` (missing patch) |
| 3 | **inputs_typed** | Every input has a valid type (artifact, parameter, metric) | `"type": "file"` (invalid type) |
| 4 | **outputs_typed** | Every output has a valid type (artifact, parameter, metric) | `"type": "json"` (use metric instead) |
| 5 | **constraints_valid** | Constraint values are self-consistent | `{ "min": 100, "max": 10 }` (min > max) |
| 6 | **schema_valid** | All value_schema fields are valid JSON Schema | Invalid `$ref` in schema |
| 7 | **adapter_known** | Runtime adapter is one of the 9 supported adapters | `"adapter": "lambda"` (not supported) |
| 8 | **resources_bounded** | Resource limits are within platform maximums | `"cpu": 128` (exceeds platform max) |
| 9 | **intents_formatted** | supported_intents use valid dot-separated naming | `"intent_type": "FEA Analysis"` (spaces) |
| 10 | **errors_defined** | At least one error code is declared | Empty `errors: []` array |
| 11 | **tests_present** | At least one sample_case exists in tests section | Missing `tests` section entirely |
| 12 | **governance_complete** | sandbox and audit_log are configured | Missing `sandbox.network` policy |

**Lint severity levels:**
- **Error** (checks 1-9): Block publication. Must be fixed.
- **Warning** (checks 10-12): Allow publication but logged. Should be fixed for promotion above `community` trust level.

---

## 12. NATS SUBJECT NAMESPACE

All NATS subjects use the `airaie.` prefix for namespace isolation:

| Subject | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `airaie.jobs.tool.execution` | Control Plane → Runner | Job payload | Dispatch tool execution |
| `airaie.results.completed` | Runner → Control Plane | Result payload | Report execution results |
| `airaie.events.{runId}` | Runner → Frontend/Monitor | Progress event | Real-time execution updates |
| `airaie.events.audit` | All services → Audit log | Audit event | Governance audit trail |

**JetStream configuration:**

```
Stream: AIRAIE_JOBS
  Subjects: airaie.jobs.>
  Retention: WorkQueue
  MaxAge: 24h
  Replicas: 3

Stream: AIRAIE_RESULTS
  Subjects: airaie.results.>
  Retention: Limits
  MaxAge: 7d
  Replicas: 3

Stream: AIRAIE_EVENTS
  Subjects: airaie.events.>
  Retention: Limits
  MaxAge: 30d
  Replicas: 3
```

---

## 13. TOOL EXECUTION EXAMPLE (END-TO-END)

### Scenario: FEA Stress Analysis

```
THE WORKFLOW:
  [Webhook Trigger] → [Mesh Generator] → [FEA Solver] → [Result Analyzer]

THE GOAL:
  Receive a CAD geometry via webhook, generate mesh, run FEA stress analysis,
  and produce a validation report.
```

### Step-by-Step Execution

```
===============================================================
STEP 1: TRIGGER
===============================================================

  External system sends HTTP POST to webhook:
  
  POST https://api.airaie.io/v0/hooks/fea-validate-abc123
  Content-Type: multipart/form-data
  
  {
    "geometry_file": <bracket_v3.step>,    // uploaded file
    "material": "Al6061-T6",
    "load_newtons": 500,
    "threshold_mpa": 250
  }

  WHAT HAPPENS:
  1. Go API Gateway receives the webhook
  2. Uploads geometry_file to MinIO → creates artifact art_cad_001
  3. Creates Run record in PostgreSQL (status: PENDING)
  4. Workflow Scheduler identifies root node: Webhook (no dependencies)
  5. Webhook node "executes" instantly — its output is the webhook data:
     {
       json: { material: "Al6061-T6", load_newtons: 500, threshold_mpa: 250 },
       artifacts: { geometry_file: "art_cad_001" }
     }
  6. NodeRun for Webhook: SUCCEEDED
  7. Identifies next node: Mesh Generator (depends on Webhook — satisfied)

===============================================================
STEP 2: MESH GENERATOR EXECUTION
===============================================================

  TOOLSHELF RESOLUTION (if agent-driven):
    Intent: "mesh.generate"
    Result: mesh-generator@1.0 (score: 215, trust: verified)

  DISPATCH:
  Go Control Plane builds Job for Mesh Generator:
  
  {
    "job_id": "job_mesh_001",
    "run_id": "run_xyz789",
    "node_id": "mesh_gen_1",
    "tool_ref": "mesh-generator@1.0.0",
    "image": "registry.airaie.io/mesh-generator:1.0",
    "adapter": "docker",
    "inputs": [
      { "name": "geometry", "type": "artifact", "artifact_id": "art_cad_001" },
      { "name": "density", "type": "parameter", "value": 0.8 },
      { "name": "element_type", "type": "parameter", "value": "hex8" }
    ],
    "resources": { "cpu": 2, "memory_mb": 1024, "timeout_sec": 120 },
    "sandbox": { "network": "deny", "filesystem": "sandbox" },
    "artifact_urls": {
      "art_cad_001": "https://minio:9000/airaie/art_cad_001?token=..."
    },
    "output_upload_urls": {
      "mesh_output": "https://minio:9000/airaie/run_xyz789/mesh_output?token=..."
    }
  }

  Published to NATS subject: airaie.jobs.tool.execution

  EXECUTION (Rust Runner):
  1. Consumes Job from NATS
  2. Downloads art_cad_001 (bracket_v3.step) from MinIO → /workspace/inputs/
  3. Writes config.json with input values
  4. Starts Docker container: mesh-generator:1.0
     docker run --cpus=2 --memory=1024m --network=none \
       -v /tmp/runner/job_mesh_001/inputs:/workspace/inputs:ro \
       -v /tmp/runner/job_mesh_001/outputs:/workspace/outputs \
       registry.airaie.io/mesh-generator:1.0
  5. Container runs mesh generation algorithm
  6. Container produces:
     /workspace/outputs/mesh_output.stl (3.1 MB, 45,000 elements)
     /workspace/outputs/metrics.json ({ element_count: 45000, quality: 0.95 })
  7. Container exits with code 0
  8. Runner uploads mesh_output.stl to MinIO → creates art_mesh_002
  9. Computes SHA-256: b2c3d4e5f6g7...

  RESULT:
  {
    "job_id": "job_mesh_001",
    "status": "SUCCEEDED",
    "exit_code": 0,
    "outputs": [
      { "name": "mesh_output", "type": "artifact", "artifact_id": "art_mesh_002", "artifact_kind": "mesh.generated" },
      { "name": "metrics", "type": "metric", "value": { "element_count": 45000, "quality": 0.95 } }
    ],
    "metrics": { "duration_ms": 7200, "peak_mem_mb": 512, "cpu_time_ms": 12000 },
    "logs_ref": "logs/run_xyz789/job_mesh_001"
  }
  
  Published to NATS: airaie.results.completed

  BACK IN GO CONTROL PLANE:
  - Updates NodeRun for mesh_gen_1: SUCCEEDED
  - Creates artifact record for art_mesh_002
  - Updates mesh-generator trust stats: successes += 1
  - Checks next node: FEA Solver (depends on Mesh Generator — now satisfied)
  - Dispatches FEA Solver

===============================================================
STEP 3: FEA SOLVER EXECUTION
===============================================================

  INPUT RESOLUTION (from expressions in workflow):
    mesh_file:       {{ $('Mesh Generator').artifacts.mesh_output }} → "art_mesh_002"
    threshold:       {{ $('Webhook').json.threshold_mpa }}           → 250
    material:        {{ $('Webhook').json.material }}                 → "Al6061-T6"
    output_format:   "vtk"                                           → "vtk" (static)

  DISPATCH:
  Job payload with resolved values:
  {
    "job_id": "job_fea_001",
    "tool_ref": "fea-solver@2.1.0",
    "image": "registry.airaie.io/fea-solver:2.1",
    "inputs": [
      { "name": "mesh_file", "type": "artifact", "artifact_id": "art_mesh_002" },
      { "name": "threshold", "type": "parameter", "value": 250 },
      { "name": "material", "type": "parameter", "value": "Al6061-T6" },
      { "name": "output_format", "type": "parameter", "value": "vtk" }
    ],
    "resources": { "cpu": 4, "memory_mb": 2048, "timeout_sec": 300 }
  }

  EXECUTION:
  1. Downloads art_mesh_002 (mesh_output.stl) from MinIO
  2. Starts container: fea-solver:2.1
  3. Solver runs FEA analysis:
     - Reads mesh (45,000 elements)
     - Applies material properties (Al6061-T6: E=69GPa, v=0.33, sigma_y=276MPa)
     - Applies load (500N)
     - Solves stiffness matrix
     - Iterates until convergence (8 iterations)
  4. Produces:
     /workspace/outputs/result.vtk (8.2 MB — stress field visualization)
     /workspace/outputs/metrics.json:
     {
       "max_stress": 187.3,
       "min_stress": 2.1,
       "safety_factor": 1.34,
       "element_count": 45000,
       "iterations": 8,
       "converged": true
     }
  5. Exit code 0 → SUCCEEDED
  6. result.vtk uploaded → art_stress_003 (SHA: a1b2c3d4...)

  RESULT:
  {
    "status": "SUCCEEDED",
    "outputs": [
      { "name": "result", "type": "artifact", "artifact_id": "art_stress_003", "artifact_kind": "measurement.result" },
      { "name": "metrics", "type": "metric", "value": { "max_stress": 187.3, "safety_factor": 1.34, "converged": true } }
    ],
    "metrics": { "duration_ms": 15000, "peak_mem_mb": 1024 }
  }

  COST: $0.50 (4 cores * 15s)
  TRUST UPDATE: fea-solver@2.1 successes: 43→44, trust_score: 0.842→0.845

===============================================================
STEP 4: RESULT ANALYZER EXECUTION
===============================================================

  INPUT RESOLUTION:
    result_file:     {{ $('FEA Solver').artifacts.result }}           → "art_stress_003"
    metrics:         {{ $('FEA Solver').json.metrics }}               → { max_stress: 187.3, ... }
    threshold:       {{ $('Webhook').json.threshold_mpa }}            → 250

  EXECUTION:
  1. Downloads art_stress_003 (result.vtk) from MinIO
  2. Runs analysis: generates visualization PNG, compiles summary
  3. Produces:
     /workspace/outputs/report.pdf (validation report)
     /workspace/outputs/contour.png (stress contour visualization)
     /workspace/outputs/summary.json:
     {
       "pass": true,
       "max_stress_mpa": 187.3,
       "threshold_mpa": 250,
       "margin_percent": 25.1,
       "safety_factor": 1.34,
       "recommendation": "PASS — design meets ISO 12345 requirements"
     }
  4. Exit code 0

  RESULT:
  Three artifacts created: art_report_004 (artifact_kind: report.pdf),
  art_contour_005 (artifact_kind: visualization.image)
  Summary as metric output in result payload

===============================================================
STEP 5: WORKFLOW COMPLETE
===============================================================

  All 4 nodes complete (Webhook, Mesh Gen, FEA Solver, Result Analyzer)
  Run status: SUCCEEDED
  
  Total duration: 24 seconds
  Total cost: $1.30
  Artifacts produced: 5 (CAD input, mesh, stress map, report, contour)
  
  Evidence auto-collected by EvidenceCollectorService:
  → Attached to "Structural Validation Study" board
  → Structural Evidence Gate can now auto-evaluate

  Frontend updates via SSE (airaie.events.{runId}):
  → Run Monitor shows all green checkmarks
  → Board readiness gauge updates
```

---

## 14. MINIMUM SYSTEM REQUIRED TO MAKE TOOLS WORK

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                MINIMUM VIABLE TOOL SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  1. TOOL REGISTRY / TOOLSHELF (Go Service)        │       │
│  │     - Store ToolContracts (all 7+ sections)       │       │
│  │     - Validate contracts (12 lint checks)         │       │
│  │     - ToolShelf resolution (5-stage pipeline)     │       │
│  │     - Trust tracking and promotion                │       │
│  │     - Manage version lifecycle (incl. suspended)  │       │
│  │     - Serve tool list to frontend and agents      │       │
│  │     Location: internal/service/registry.go        │       │
│  │     Database: PostgreSQL (tools, tool_versions)   │       │
│  │     Index: GIN on supported_intents JSONB         │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  2. JOB DISPATCHER (Go Service)                   │       │
│  │     - Resolve input expressions                   │       │
│  │     - Validate inputs against contract            │       │
│  │     - Generate presigned URLs for artifacts       │       │
│  │     - Build Job payload                           │       │
│  │     - Publish to NATS                             │       │
│  │     Location: internal/service/run.go             │       │
│  └──────────────────────────────────────────────────┘       │
│                           │                                  │
│                    NATS JetStream                            │
│              (airaie.jobs.tool.execution)                    │
│                           │                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │  3. TOOL RUNNER (Rust Service)                    │       │
│  │     - Consume Jobs from NATS                      │       │
│  │     - Download input artifacts from MinIO         │       │
│  │     - Start containers via 9 runtime adapters     │       │
│  │     - Monitor execution (timeout, OOM)            │       │
│  │     - Upload output artifacts to MinIO            │       │
│  │     - Publish Results to NATS                     │       │
│  │     Location: runner/src/                         │       │
│  └──────────────────────────────────────────────────┘       │
│                           │                                  │
│                    NATS JetStream                            │
│              (airaie.results.completed)                      │
│                           │                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │  4. RESULT CONSUMER (Go Service)                  │       │
│  │     - Consume Results from NATS                   │       │
│  │     - Update NodeRun/Run status in PostgreSQL     │       │
│  │     - Create artifact records                     │       │
│  │     - Update trust statistics                     │       │
│  │     - Trigger next workflow nodes                 │       │
│  │     - Emit SSE events to frontend                 │       │
│  │     Location: internal/service/run.go             │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  5. INFRASTRUCTURE                                │       │
│  │                                                    │       │
│  │  PostgreSQL 16:                                   │       │
│  │    - tools, tool_versions (registry + contracts)  │       │
│  │    - tool_trust_stats (trust tracking)            │       │
│  │    - runs, node_runs (execution state)            │       │
│  │    - artifacts (metadata)                         │       │
│  │    - GIN indexes on JSONB for intent resolution   │       │
│  │                                                    │       │
│  │  NATS JetStream 2.10:                             │       │
│  │    - airaie.jobs.tool.execution (ctrl → runner)   │       │
│  │    - airaie.results.completed (runner → ctrl)     │       │
│  │    - airaie.events.* (audit + progress stream)    │       │
│  │                                                    │       │
│  │  MinIO (S3-compatible):                           │       │
│  │    - Input/output artifact storage                │       │
│  │    - Presigned upload/download URLs               │       │
│  │    - Content-hash verification                    │       │
│  │                                                    │       │
│  │  Docker Engine:                                   │       │
│  │    - Container runtime for tool execution         │       │
│  │    - Image registry (registry.airaie.io)          │       │
│  │    - Resource limits enforcement                  │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### What You Need to Build (Priority Order)

```
PHASE 1: TOOL CAN EXECUTE (minimum viable)
  [x] PostgreSQL tables: tools, tool_versions, tool_trust_stats, runs, node_runs, artifacts
  [x] Go service: RegistryService (CRUD for tools and versions, 12 lint checks)
  [x] Go service: RunService (create run, dispatch job, consume result)
  [x] NATS setup: airaie.jobs.tool.execution and airaie.results.completed streams
  [x] Rust runner: consume job, execute via 9 adapters, publish result
  [x] MinIO setup: artifact bucket with presigned URL support
  [x] Docker: ability to pull and run tool images

PHASE 2: TOOL IS USABLE (frontend integration)
  [x] API endpoints: /v0/tools, /v0/runs, /v0/artifacts
  [x] Frontend: Tool Registry page (list, detail, register wizard)
  [x] Frontend: Node Inspector in Workflow Editor (configure tool nodes)
  [x] Frontend: Run Monitor (view execution, logs, artifacts)
  [x] SSE streaming: real-time status updates to frontend

PHASE 3: TOOL IS GOVERNED (quality and compliance)
  [x] Contract validation at lint time (12 checks)
  [x] Preflight checks before dispatch
  [x] Quota enforcement (governance.quota)
  [x] Policy enforcement in runner (governance.sandbox)
  [x] Audit event emission (governance.audit_log)
  [x] Cost tracking (governance.approval)
  [x] Evidence collection for boards
  [x] Trust tracking and promotion (Bayesian formula)
  [x] ToolShelf resolution (5-stage pipeline)
  [x] Version lifecycle with suspended state

ALL OF THIS ALREADY EXISTS IN YOUR CODEBASE:
  - Go control plane: internal/service/registry.go, run.go
  - Rust runner: runner/src/
  - Contracts: contracts/job.schema.json, result.schema.json
  - Database: infra/migrations/ (34 migration files)
  - Infrastructure: infra/docker-compose.yaml
```

### Summary: The Tool Contract is the API

```
THE KEY INSIGHT:

  A Tool's CONTRACT is the interface between everything:

  ┌────────────────────────────────────────────┐
  │              TOOL CONTRACT                  │
  │                                            │
  │  metadata:                                 │
  │    id, name, version, owner, domain_tags   │
  │                                            │
  │  interface:                                │
  │    inputs:                                 │
  │      mesh_file: artifact (required)        │
  │      threshold: parameter (optional)       │
  │      output_format: parameter (required)   │
  │    outputs:                                │
  │      result: artifact (measurement.result) │
  │      metrics: metric (stress data)         │
  │    errors: [MESH_INVALID, DIVERGED, OOM]   │
  │                                            │
  │  runtime:                                  │
  │    adapter: docker                         │
  │    image: fea-solver:2.1                   │
  │    resources: cpu=4, mem=2048              │
  │                                            │
  │  capabilities:                             │
  │    intents: sim.fea_stress_analysis (0.95) │
  │    computes: [stress_field, safety_factor] │
  │                                            │
  │  governance:                               │
  │    sandbox: network=deny, fs=sandbox       │
  │    trust_level: verified                   │
  │                                            │
  │  observability:                            │
  │    log_level: info, metrics: true          │
  │                                            │
  │  tests:                                    │
  │    sample_cases: [simple_bracket_stress]   │
  └────────────────────────────────────────────┘

  This contract is used by:
  ├── Registry UI → displays inputs/outputs in the detail page
  ├── ToolShelf → resolves tools by intent with 5-stage pipeline
  ├── Workflow Editor → generates the Node Inspector form
  ├── Workflow Compiler → validates type compatibility (3-type system)
  ├── Agent Runtime → LLM reads contract to propose inputs
  ├── Job Dispatcher → validates inputs, builds Job payload
  ├── Rust Runner → enforces limits and policy (9 adapters)
  ├── Result Consumer → validates outputs against schema
  ├── Trust System → tracks success/failure for Bayesian scoring
  ├── Governance → enforces sandbox, quota, audit, approval
  └── Board System → knows what artifacts to expect as evidence

  Everything revolves around the contract.
  The contract IS the tool's public API.
```

---

*Generated: 2026-04-06*
*Based on: Airaie System Analysis, existing codebase architecture, planning documents, and implementation patterns*
