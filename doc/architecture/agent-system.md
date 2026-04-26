# AIRAIE AGENT SYSTEM — Complete Architecture & Implementation Guide

> How Agents actually work at every layer: architecture, decision-making, tool usage, memory, policies, and execution.
> **Authored:** 2026-04-06 · **Conceptually re-anchored:** 2026-04-26

---

> **Scope.** Implementation deep-dive. For the *concept* — what an Agent is, how it relates to Workflows and Tools, and how Mode confidence floors work — read:
>
> - [`../concepts/01-CORE-MODEL.md`](../concepts/01-CORE-MODEL.md) §"Workflow / Workflow Version" (Agent → ActionProposal → Workflow compile)
> - [`../concepts/02-GOVERNANCE-AND-MODES.md`](../concepts/02-GOVERNANCE-AND-MODES.md) (Mode dial sets agent confidence floor)
> - [`../concepts/03-CARDS-AS-PAGES.md`](../concepts/03-CARDS-AS-PAGES.md) §"Card-type variants" (`agent` Card)
>
> Sections below covering the conceptual model may be superseded by the above. The architecture, data flow, and code-level details remain current.

---

## 1. WHAT IS AN AGENT?

### Definition

An **Agent** in Airaie is an **autonomous decision-making entity** that uses an LLM (Large Language Model) combined with algorithmic scoring to dynamically select and execute engineering tools based on a stated goal, available context, and governance policies.

```
An Agent is NOT:
  - A chatbot that answers questions
  - A simple rule engine with if/else chains
  - A script that runs predefined steps
  - A workflow node that always does the same thing

An Agent IS:
  - An INTELLIGENT NODE inside a workflow (or standalone)
  - Given a GOAL ("optimize mesh density for FEA simulation")
  - With ACCESS to a set of TOOLS (fea-solver, mesh-gen, etc.)
  - Constrained by POLICIES (budget, confidence thresholds, approvals)
  - That DECIDES at runtime which tool to call, with what inputs, and how many times
  - And LEARNS from outcomes via persistent memory
```

### Agent vs Tool — The Key Difference

```
TOOL:
  - Deterministic: same inputs -> same outputs every time
  - Fixed: always runs the same computation
  - No reasoning: just executes what it's told
  - No choice: doesn't pick between alternatives
  - Single execution: runs once and returns

AGENT:
  - Non-deterministic: decisions depend on context and LLM reasoning
  - Dynamic: chooses WHICH tool to run based on the situation
  - Reasoning: explains WHY it chose a particular tool
  - Choice: evaluates alternatives and picks the best one
  - Iterative: may run multiple tools in sequence, evaluating results between each
```

### Agent Responsibilities

```
RESPONSIBILITY 1: TOOL SELECTION
  "Given these 5 available tools and this input geometry,
   which tool should I run first?"
  Agent searches, scores, and selects the most appropriate tool.

RESPONSIBILITY 2: INPUT CONSTRUCTION
  "Now that I've chosen mesh-generator, what parameters should I use?"
  Agent reads the tool contract and proposes specific input values.

RESPONSIBILITY 3: RESULT EVALUATION
  "The mesh has 45,000 elements with quality 0.95. Is this good enough
   to proceed to FEA, or should I refine the mesh further?"
  Agent interprets tool outputs and decides what to do next.

RESPONSIBILITY 4: ITERATION CONTROL
  "FEA shows stress 312 MPa, above the 250 MPa threshold.
   I should try a finer mesh and re-run. Iteration 2 of 5."
  Agent manages a multi-step loop, trying different approaches.

RESPONSIBILITY 5: CONFIDENCE REPORTING
  "I'm 92% confident that mesh-generator is the right first step.
   This exceeds the 85% auto-approve threshold."
  Agent produces a confidence score that drives policy decisions.

RESPONSIBILITY 6: LEARNING
  "Last time I used density 0.8 for Al6061 plates, it worked well.
   I'll start with that density for this similar geometry."
  Agent applies persistent memory to improve future decisions.
```

### Hybrid System: LLM + Algorithmic

```
Airaie agents are NOT purely LLM-based. They use a HYBRID approach:

  +---------------------------------------------+
  |           AGENT DECISION SYSTEM              |
  |                                              |
  |   ALGORITHMIC SCORING (5 dimensions)         |
  |   |-- Compatibility (input/output match) 0.4 |
  |   |-- Trust (Bayesian success rate)      0.3 |
  |   |-- Cost (normalized cost/budget)      0.2 |
  |   |-- Latency (normalized time/deadline) 0.1 |
  |   +-- Risk Penalty (side effects/failures)   |
  |                                              |
  |   LLM REASONING (configurable weight)        |
  |   |-- Goal understanding                     |
  |   |-- Context interpretation                 |
  |   |-- Tool selection reasoning               |
  |   +-- Input value proposal                   |
  |                                              |
  |   FINAL = (1-llm_weight) x algorithmic       |
  |         + llm_weight x llm_score             |
  |                                              |
  |   The weight is configurable per agent.      |
  |   Some agents may be 100% algorithmic.       |
  |   Some agents may be 100% LLM.              |
  +---------------------------------------------+

WHY HYBRID:
  - Pure LLM: creative but unpredictable, may hallucinate tool names
  - Pure algorithmic: reliable but rigid, can't handle novel situations
  - Hybrid: gets the creativity of LLM + the reliability of algorithms
  - The algorithmic layer GROUNDS the LLM's suggestions in real data
```

---

## 2. AGENT ARCHITECTURE

### AgentSpec Schema

```
The AgentSpec is the declarative specification that defines an agent's behavior.
It has 7 MANDATORY fields and 3 OPTIONAL fields:

MANDATORY (7):
  1. metadata       — name, description, version, owner, tags
  2. goal           — the agent's objective statement
  3. tool_permissions — list of allowed tools + access levels
  4. context_schema — expected input structure (json schema)
  5. scoring        — how tools are scored (dimensions + weights)
  6. constraints    — budget, timeout, iterations, retries
  7. decision_policy — approval thresholds, escalation rules, gates

OPTIONAL (3):
  8. validation_policy — pre/post execution validation rules
  9. explainability    — reasoning trace depth, explanation format
  10. llm              — provider, model, weight, temperature, max_tokens
```

### Agent Version

```
AGENT VERSIONING:

  AgentVersion.Version is an INTEGER (sequential):
    Version 1 — first published version
    Version 2 — second published version
    Version 3 — etc.

  NOT semver (not "2.1.0"). Simple incrementing integer.

  VERSION LIFECYCLE:
    draft -> validated -> published

    draft:     Spec is being authored/edited. Not runnable.
    validated: Spec has been checked for correctness (schema valid,
               referenced tools exist, policies parseable). Not yet
               published — still in review/testing.
    published: Live and runnable. Can be selected for execution.

  There is no "deprecated" state. To retire a version, publish a
  new version and update references. Old versions remain published
  but are superseded by higher version numbers.
```

### Core Components

```
+-------------------------------------------------------------+
|                    AGENT ARCHITECTURE                         |
|                                                              |
|  +----------------------+                                   |
|  |  1. MODEL (LLM)       |                                   |
|  |  Provider: Anthropic   |                                   |
|  |  Model: Claude Sonnet  |                                   |
|  |  Weight: configurable  |                                   |
|  +----------+-------------+                                   |
|             |                                                |
|  +----------v-------------+                                   |
|  |  2. AGENT CORE         |                                   |
|  |  Goal processor        |                                   |
|  |  Tool searcher         |                                   |
|  |  Scorer (5-dimension)  |                                   |
|  |  Proposal generator    |                                   |
|  |  Proposal executor     |                                   |
|  |  Result evaluator      |                                   |
|  |  Iteration controller  |                                   |
|  +----------+-------------+                                   |
|             |                                                |
|  +----------v-------------+  +--------------------+         |
|  |  3. TOOLS              |  |  4. POLICIES        |         |
|  |  fea-solver@2          |  |  4 verdicts          |         |
|  |  mesh-gen@1            |  |  board mode override |         |
|  |  result-analyzer@1     |  |  escalation rules    |         |
|  |  (contracts + perms)   |  |  constraint limits   |         |
|  +-------------------------+  +--------------------+         |
|                                                              |
|  +-------------------------+  +--------------------+         |
|  |  5. MEMORY (dual-layer) |  |  6. CONTEXT         |         |
|  |  Episodic (TTL-based)   |  |  Input data          |         |
|  |  Semantic (persistent)  |  |  Goal text           |         |
|  |  pgvector embeddings    |  |  Upstream outputs     |         |
|  |  Top-k similarity       |  |  Board mode           |         |
|  +-------------------------+  +--------------------+         |
|                                                              |
+-------------------------------------------------------------+
```

### Component 1: Model (LLM)

```
WHAT IT IS:
  The language model that provides reasoning capability.
  It's the "brain" that interprets goals and proposes actions.

CONFIGURATION:
{
  "model": {
    "provider": "anthropic",           // anthropic, openai, google, huggingface
    "model_id": "claude-sonnet-4-6",  // specific model version
    "api_key": "${CREDENTIAL:anthropic_key}",  // encrypted credential
    "llm_weight": 0.7,                // weight in hybrid scoring (0.0 to 1.0)
    "max_tokens": 4096,               // max response length
    "temperature": 0.3                 // low = more deterministic, high = more creative
  }
}

SUPPORTED PROVIDERS:
  Anthropic: Claude Sonnet, Claude Haiku, Claude Opus
  OpenAI: GPT-4o, GPT-4-turbo
  Google: Gemini Pro, Gemini Flash
  HuggingFace: Custom hosted models (open-source)

LLM EXPOSURE RULE:
  Agent sees STRUCTURED SUMMARIES ONLY:
    - Metrics, scores, metadata
    - Tool contracts and descriptions
    - Memory entries (text)
  Agent NEVER sees:
    - Raw files or binary data
    - Credentials or secrets
    - Unfiltered user input
  LLM input sanitized via 14 regex patterns for prompt injection defense.

HOW IT'S USED:
  The LLM receives a structured PROMPT containing:
  1. System instructions (agent goal + constraints)
  2. Available tools (names + contracts)
  3. Current context (structured summaries of input data)
  4. Memory entries (relevant past experiences)
  5. Request: "Which tool should I use and with what inputs?"
  
  The LLM returns a structured response:
  {
    "selected_tool": "mesh-generator@1",
    "reasoning": "Need mesh before FEA analysis...",
    "confidence": 0.92,
    "proposed_inputs": { "density": 0.8, "geometry": "art_001" }
  }
```

### Component 2: Agent Core

```
THE AGENT CORE is the orchestration engine that coordinates all components.
It lives in: internal/service/runtime.go (AgentRuntimeService)

SUB-COMPONENTS:

  TOOL SEARCHER (internal/service/runtime.go -- ToolSearcher)
    - Uses ToolShelf resolution with 5-stage algorithm:
      DISCOVER -> FILTER -> RANK -> EXPLAIN -> ASSEMBLE
    - Queries the tool registry for tools matching the agent's allowed list
    - Filters by: permissions, capabilities, input type compatibility
    - Returns: ranked list of candidate tools with metadata
    
  SCORER (internal/service/runtime.go -- Scorer)
    - Computes hybrid score using 5 DIMENSIONS (see Section 4)
    - Algorithmic: compatibility, trust, cost, latency, risk penalty
    - LLM: sends tool list + context to LLM, asks for relevance ranking
    - Blends: final_score = (1-llm_weight) x algorithmic + llm_weight x llm
    
  PROPOSAL GENERATOR (internal/service/runtime.go -- ProposalGenerator)
    - Two modes:
      Phase A "deterministic": algorithmic scoring only, no LLM
      Phase B "llm_augmented": algorithmic + LLM blend
    - Takes the top-scored tool + context
    - In LLM mode: sends to LLM "Propose specific inputs for this tool"
    - LLM returns: ActionProposal with inputs, reasoning, confidence
    - On failure: GenerateWithFailureContext(agentCtx, failCtx)
      - Excludes failed tool from candidates
      - Enriches goal with failure context
      - Regenerates proposal with remaining tools
      - Enforces remaining budget after failure
    
  POLICY ENFORCER (internal/service/runtime.go -- PolicyEnforcer)
    - Checks the proposal against all policy rules
    - Returns one of 4 VERDICTS:
      APPROVED:       Execute immediately
      NEEDS_APPROVAL: Human gate before execution
      REJECTED:       Stop with reason
      ESCALATE:       Route to escalation target
    
  PROPOSAL EXECUTOR (internal/service/runtime.go -- ProposalExecutor)
    - If approved: dispatches the tool as a Run (same as workflow tool execution)
    - Creates a standard Job payload
    - Publishes to NATS, waits for Result
    
  RESULT EVALUATOR
    - Interprets the tool's output in the context of the agent's goal
    - Asks LLM: "Given this result, is the goal achieved?"
    - Returns: goal_achieved (boolean) + next_action + reasoning
    
  ITERATION CONTROLLER
    - Manages the multi-step loop
    - Tracks: current_iteration, max_iterations, total_cost, total_duration
    - Decides: continue iterating or stop (goal achieved / limits reached)
    - On tool failure: triggers replanning via ProposalGenerator
```

### Component 3: Tools

```
WHAT THE AGENT SEES:

  The agent has a list of ALLOWED TOOLS defined in its spec.
  Each tool entry includes:
  
  {
    "tool_ref": "fea-solver@2",
    "permissions": ["read", "execute"],    // what the agent can do
    "max_invocations": 5,                  // max times agent can call this tool
    "required_capabilities": ["structural"] // domain tags for matching
  }

  At runtime, the agent also sees each tool's CONTRACT:
  {
    "name": "fea-solver",
    "version": 2,
    "description": "Finite element analysis for structural stress simulation",
    "inputs": [
      { "name": "mesh_file", "type": "artifact", "required": true },
      { "name": "threshold", "type": "number", "default": 250 },
      ...
    ],
    "outputs": [
      { "name": "result", "type": "artifact" },
      { "name": "metrics", "type": "json" }
    ],
    "estimated_cost": 0.50,
    "estimated_duration_sec": 15
  }

  TOOLSHELF INTEGRATION:
  The agent's ToolSearcher uses the ToolShelf 5-stage resolution:
    1. DISCOVER: Find all tools matching capability tags
    2. FILTER:   Remove tools agent lacks permission for
    3. RANK:     Score using 5-dimension algorithm
    4. EXPLAIN:  Generate reasoning for top candidates
    5. ASSEMBLE: Build final candidate list with contracts

  The agent uses each tool's contract to:
  1. Understand what each tool DOES (from description)
  2. Know what inputs to PROVIDE (from input schema)
  3. Know what outputs to EXPECT (from output schema)
  4. Estimate cost and time (for budget planning)
```

### Component 4: Policies

```
POLICY CONFIGURATION (from agent spec decision_policy):

{
  "decision_policy": {
    "auto_approve_threshold": 0.85,
    "require_approval_for": ["write", "delete"],
    "escalation_rules": [
      {
        "condition": "confidence < 0.5",
        "action": "reject",
        "reason": "Confidence too low for autonomous execution"
      },
      {
        "condition": "cost > 5.00",
        "action": "escalate",
        "target": "project_lead",
        "reason": "High cost requires human review"
      }
    ]
  },
  "constraints": {
    "max_cost_usd": 10.00,
    "timeout_sec": 600,
    "max_retries": 3,
    "max_iterations": 5
  }
}

4 POLICY VERDICTS:

  APPROVED:       Execute immediately. Confidence meets threshold,
                  no policy gates triggered.
  NEEDS_APPROVAL: Human gate before execution. Confidence is between
                  reject and auto-approve thresholds, or tool requires
                  approval for its permission type.
  REJECTED:       Stop with reason. Confidence below reject threshold,
                  budget exhausted, or hard constraint violated.
  ESCALATE:       Route to escalation target. Cost exceeds limit,
                  risk assessment triggers escalation rule.

POLICY EVALUATION ORDER:
  1. Check REJECT rules first (hard stops)
     - confidence < 0.5 -> REJECTED immediately, no execution
  2. Check ESCALATE rules
     - cost > 5.00 -> ESCALATE to escalation target
  3. Check APPROVAL requirements
     - tool needs "write" permission -> require_approval_for includes "write" -> NEEDS_APPROVAL
  4. Check AUTO-APPROVE threshold
     - confidence >= 0.85 -> APPROVED, execute without human
  5. Check CONSTRAINTS
     - total_cost > max_cost_usd -> REJECTED (budget exhausted)
     - iteration > max_iterations -> REJECTED (iteration limit)
     - elapsed > timeout_sec -> REJECTED (timeout)
  6. DEFAULT (if none of above triggered)
     - confidence < 0.85 but > 0.5 -> NEEDS_APPROVAL

BOARD MODE OVERRIDE (Governance Inheritance):

  When an agent runs within a Board context, the board's mode
  AUTO-INJECTS policy overrides. These are ADDITIVE only
  (can tighten constraints, never loosen them).

  Explore mode:
    confidence_threshold = 0.5
    No additional overrides.
    Most permissive — suitable for experimentation.

  Study mode:
    confidence_threshold = 0.75
    Requires approval for: high_risk operations
    Tighter than Explore — suitable for analysis.

  Release mode:
    confidence_threshold = 0.90
    Requires approval for: medium_risk + side_effects
    Most restrictive — suitable for production/certification.

  Override logic:
    effective_threshold = max(agent_threshold, board_threshold)
    effective_approval  = union(agent_approval_list, board_approval_list)
    
  Board overrides NEVER loosen. If agent has threshold 0.90 and
  board is Explore (0.5), agent keeps 0.90. If agent has 0.5 and
  board is Release (0.90), agent gets tightened to 0.90.
```

### Component 5: Memory (Dual-Layer System)

```
DUAL-LAYER MEMORY SYSTEM:

  The memory system has two layers: a STORAGE LAYER (how data is stored)
  and a CATEGORIZATION LAYER (how memories are classified).

STORAGE LAYER (pgvector):

  EPISODIC MEMORY — Specific run outcomes
    What: Individual execution results, tool outputs, decisions made
    Lifetime: TTL-based (expires after configurable period)
    Purpose: Short-to-medium term recall of specific events
    Example:
      "Run run_abc on 2026-04-01: mesh-gen with density=0.8 produced
       45K elements, quality 0.95, took 7.2s"
    Expires: after 30 days (configurable per agent)

  SEMANTIC MEMORY — Patterns extracted from multiple runs
    What: Generalized knowledge distilled from repeated observations
    Lifetime: Persistent (no expiration)
    Purpose: Long-term learned behaviors and domain knowledge
    Example:
      "Al6061 plates >3mm thick work best with mesh density 0.8"
      (extracted after seeing this pattern across 12 runs)

  VECTOR EMBEDDINGS:
    embedding: vector(1536) — OpenAI/Claude text embeddings
    Index: IVFFlat for approximate nearest neighbor search
    Recall: Top-k similarity search injected into agent context

  RETRIEVAL:
    Before each decision, the agent retrieves relevant memories:
    1. Embed the current context (goal + input summary) as a vector
    2. Query agent_memories with cosine similarity against embedding
    3. Return top-k most similar memories (default k=5)
    4. Inject retrieved memories into LLM prompt as context

CATEGORIZATION LAYER (within episodic and semantic):

  fact:          Concrete knowledge
                 Example: "Al6061 optimal mesh density is 0.8"
                 
  preference:    User or domain preferences
                 Example: "User prefers hex8 over tet4 elements"
                 
  lesson:        Learned from successes
                 Example: "Running mesh-gen before fea-solver produces better results"
                 
  error_pattern: Learned from failures
                 Example: "density 0.6 insufficient for thin walls < 3mm"

DATABASE SCHEMA:

  TABLE: agent_memories
    id:            UUID PRIMARY KEY
    agent_id:      UUID REFERENCES agents(id)
    memory_type:   VARCHAR(20)  -- 'episodic' or 'semantic'
    category:      VARCHAR(20)  -- 'fact', 'preference', 'lesson', 'error_pattern'
    content:       TEXT          -- the memory text
    embedding:     vector(1536) -- pgvector embedding for similarity search
    context:       JSONB         -- when/how this was learned
    expires_at:    TIMESTAMP     -- NULL for semantic (persistent), set for episodic (TTL)
    created_at:    TIMESTAMP
    updated_at:    TIMESTAMP
    created_by:    VARCHAR(50)   -- 'agent' (auto) or 'user' (manual)

  INDEX: ivfflat ON agent_memories USING ivfflat (embedding vector_cosine_ops)

MEMORY LIFECYCLE:

  CREATION:
    1. AUTOMATIC: After each tool execution, the agent evaluates the result.
       If the result reveals something new, a memory is created.
       
       Episodic example: { memory_type: "episodic", category: "error_pattern",
         content: "density 0.6 caused mesh failure for Al6061 thin wall 2mm",
         expires_at: now() + interval '30 days' }
       
       If a pattern appears across 3+ episodic memories, extract semantic:
       { memory_type: "semantic", category: "lesson",
         content: "Al6061 thin walls <3mm need density >= 0.8",
         expires_at: NULL }
    
    2. MANUAL: User adds memories in the Agent Builder Memory page.
       { memory_type: "semantic", category: "fact",
         content: "ISO 12345 requires safety factor > 1.2" }

  EXPIRATION:
    Episodic memories expire based on their TTL (expires_at field).
    Semantic memories persist indefinitely.
    A background job cleans up expired episodic memories periodically.
```

### Component 6: Context

```
CONTEXT is everything the agent knows at decision time:

{
  "goal": "Determine optimal mesh density and run FEA to verify stress requirements",
  
  "input_data": {
    "json": {
      "material": "Al6061-T6",
      "load_newtons": 500,
      "threshold_mpa": 250,
      "geometry_type": "bracket",
      "dimensions": "160x80x5mm"
    },
    "artifacts": {
      "geometry": "art_cad_001"
    }
  },
  
  "available_tools": [
    { "ref": "mesh-gen@1", "description": "...", "inputs": [...], "outputs": [...] },
    { "ref": "fea-solver@2", "description": "...", "inputs": [...], "outputs": [...] },
    { "ref": "result-analyzer@1", "description": "...", "inputs": [...], "outputs": [...] }
  ],
  
  "iteration_state": {
    "current_iteration": 1,
    "max_iterations": 5,
    "previous_results": [],
    "total_cost_so_far": 0,
    "budget_remaining": 10.00,
    "elapsed_seconds": 0
  },
  
  "relevant_memories": [
    { "category": "fact", "content": "Al6061 optimal mesh density is 0.8 for plates" },
    { "category": "lesson", "content": "mesh-gen before fea-solver produces better results" }
  ],
  
  "board_context": {
    "mode": "study",
    "effective_threshold": 0.85
  },
  
  "policies": {
    "auto_approve_threshold": 0.85,
    "require_approval_for": ["write", "delete"],
    "max_cost": 10.00
  }
}
```

---

## 3. AGENT INPUT

### What Inputs an Agent Receives

```
SOURCE 1: FROM WORKFLOW (most common)
  When an agent is a node in a workflow, it receives the upstream node's output:
  
  [Mesh Generator] -> [AI Optimizer Agent]
  
  Agent receives:
  {
    "json": {
      "element_count": 45000,
      "quality": 0.95,
      "max_stress": 312    // from previous FEA run, if any
    },
    "artifacts": {
      "mesh_output": "art_mesh_002",
      "geometry": "art_cad_001"
    }
  }

SOURCE 2: FROM USER (interactive -- Playground)
  When used in the Playground chat interface:
  
  User types: "I have a bracket design in Al6061, 160x80x5mm.
               Can you run FEA with 500N load and check ISO 12345?"
  
  Agent receives:
  {
    "message": "I have a bracket design...",
    "attachments": ["art_cad_001"],   // user-uploaded files
    "session_id": "ses_x7k2m"         // for session memory
  }

SOURCE 3: FROM API (programmatic)
  When called via REST API:
  
  POST /v0/agents/{id}/versions/{v}/run
  {
    "context": {
      "geometry": "art_cad_001",
      "material": "Al6061-T6",
      "load": 500,
      "threshold": 250
    }
  }

SOURCE 4: FROM ANOTHER AGENT (agent chain)
  An agent's output can feed into another agent:
  
  [Design Agent] -> [Validation Agent]
  
  Validation Agent receives Design Agent's output.
```

### Input Format

```
REGARDLESS OF SOURCE, the input is normalized to:

{
  "goal": "The agent's configured goal text (from agent spec)",
  "context": {
    "json": { ... structured data ... },
    "artifacts": { ... artifact ID references ... },
    "message": "..." // only for interactive/chat mode
  },
  "session_id": "ses_..." // only for interactive sessions
}

The goal is ALWAYS from the agent spec (not from user input).
The user provides CONTEXT, not a new goal.
This separation is important for security and predictability.
```

---

## 4. DECISION-MAKING PROCESS (THE CRITICAL PIECE)

### 5-Phase Reasoning Cycle

```
The agent's reasoning follows a 5-PHASE CYCLE:

  THINK   -> Understand the goal, assemble context, recall memories
  SELECT  -> Search and score tools, pick the best candidate
  VALIDATE -> Enforce policies, check constraints, get approval if needed
  PROPOSE -> Generate specific inputs for the selected tool
  EXPLAIN -> Produce reasoning trace for audit and transparency

Each phase maps to steps in the 13-step execution pipeline below.
```

### 13-Step Execution Pipeline

```
+------------------------------------------------------------------+
|              AGENT EXECUTION PIPELINE (13 Steps)                  |
|                                                                   |
|  THINK PHASE:                                                    |
|  +---------------------------------------------+                 |
|  | STEP 1: Load AgentSpec version               |                 |
|  | Load spec by version (integer). Verify       |                 |
|  | status = "published". Load tool_permissions,  |                 |
|  | scoring config, decision_policy, constraints. |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 2: Assemble context                     |                 |
|  | Combine: inputs + run history + board mode    |                 |
|  | + recalled memories (top-k from pgvector)    |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  SELECT PHASE:                                                   |
|  +---------------------v------------------------+                 |
|  | STEP 3: Resolve capabilities -> load          |                 |
|  | ToolContracts via ToolShelf 5-stage           |                 |
|  | (DISCOVER -> FILTER -> RANK -> EXPLAIN ->     |                 |
|  |  ASSEMBLE)                                    |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 4: Score tools (5 dimensions)            |                 |
|  | Compatibility, Trust, Cost, Latency, Risk     |                 |
|  | See "Scoring" section below for formulas      |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 5: Filter by permissions + threshold     |                 |
|  | Remove tools below minimum score              |                 |
|  | Remove tools agent lacks permission for       |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  PROPOSE PHASE:                                                  |
|  +---------------------v------------------------+                 |
|  | STEP 6: Generate proposal                     |                 |
|  | Mode A "deterministic": algorithmic only      |                 |
|  | Mode B "llm_augmented": algorithmic + LLM     |                 |
|  | Output: ActionProposal (tool + inputs +       |                 |
|  |         confidence + reasoning)               |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  VALIDATE PHASE:                                                 |
|  +---------------------v------------------------+                 |
|  | STEP 7: Evaluate policy (gates + escalation)  |                 |
|  | 4 verdicts: APPROVED, NEEDS_APPROVAL,         |                 |
|  |             REJECTED, ESCALATE                |                 |
|  | Board mode overrides applied (additive only)  |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 8: Build RunPlan (DAG levels)            |                 |
|  | If proposal involves multiple tools,          |                 |
|  | organize into dependency levels for           |                 |
|  | parallel execution within each level          |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 9: Dispatch Jobs to NATS                 |                 |
|  | Subject: airaie.jobs.agent.execution          |                 |
|  | Standard Job payload, same as workflow tools  |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 10: Execute levels sequentially           |                 |
|  | (parallel within each level)                   |                 |
|  | Wait for all jobs in level N before level N+1 |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 11: Collect artifacts + metrics           |                 |
|  | Gather: outputs, cost, duration, status       |                 |
|  | Store artifacts in MinIO                       |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  EXPLAIN PHASE:                                                  |
|  +---------------------v------------------------+                 |
|  | STEP 12: Update trust scores                   |                 |
|  | Bayesian trust formula (see Trust section)    |                 |
|  | Cached with 60-second TTL                      |                 |
|  +---------------------+------------------------+                 |
|                        |                                          |
|  +---------------------v------------------------+                 |
|  | STEP 13: Learn from run (memory)               |                 |
|  | Create episodic memory for this run            |                 |
|  | Extract semantic patterns if threshold met    |                 |
|  | Embed and store in pgvector                    |                 |
|  +---------------------------------------------+                 |
|                                                                   |
+------------------------------------------------------------------+
```

### Replanning on Failure

```
WHEN A TOOL FAILS during execution:

  The ProposalGenerator supports replanning via:
  ProposalGenerator.GenerateWithFailureContext(agentCtx, failCtx)

  failCtx contains:
  {
    "failed_tool": "fea-solver@2",
    "failure_reason": "Mesh too coarse, solver diverged",
    "iteration": 2,
    "cost_spent": 0.80,
    "budget_remaining": 9.20
  }

  Replanning logic:
  1. EXCLUDE the failed tool from candidate list
  2. ENRICH the goal with failure context:
     Original: "Run FEA simulation"
     Enriched: "Run FEA simulation (previous attempt with fea-solver@2 failed:
                mesh too coarse, solver diverged. Try alternative approach.)"
  3. REGENERATE proposal with remaining tools
  4. ENFORCE remaining budget (budget_remaining, not original budget)
  
  If no viable alternatives exist after replanning:
    Return partial result with failure explanation.
```

### Scoring: 5 Dimensions

```
5-DIMENSION SCORING (for each candidate tool):

  DIMENSION 1: COMPATIBILITY (weight 0.4)
    Formula: match(inputs) x match(outputs)
    match(inputs):  fraction of tool's required inputs that are available
    match(outputs): fraction of tool's outputs that are useful for the goal
    Range: 0.0 to 1.0
    
    Example:
      mesh-gen needs geometry (have it) -> match(inputs) = 1.0
      mesh-gen outputs mesh (needed for FEA) -> match(outputs) = 1.0
      compatibility = 1.0 x 1.0 = 1.0

  DIMENSION 2: TRUST (weight 0.3)
    Formula: success_rate x test_coverage
    success_rate: Bayesian trust score (see Trust Formula below)
    test_coverage: fraction of tool's test suite passing (from registry)
    Range: 0.0 to 1.0
    
    Example:
      mesh-gen: 89 successes, 93 total runs -> trust = (89+5)/(93+10) = 0.913
      test_coverage: 0.95
      trust_score = 0.913 x 0.95 = 0.867

  DIMENSION 3: COST (weight 0.2)
    Formula: 1 - normalize(cost / budget)
    normalize: estimated_cost / max_cost_usd
    Range: 0.0 to 1.0 (higher = cheaper relative to budget)
    
    Example:
      mesh-gen estimated $0.30, budget $10.00
      cost_score = 1 - (0.30 / 10.00) = 0.97

  DIMENSION 4: LATENCY (weight 0.1)
    Formula: 1 - normalize(duration / deadline)
    normalize: estimated_duration / timeout_sec
    Range: 0.0 to 1.0 (higher = faster relative to deadline)
    
    Example:
      mesh-gen estimated 8s, timeout 600s
      latency_score = 1 - (8 / 600) = 0.987

  DIMENSION 5: RISK PENALTY (no positive weight -- subtractive)
    Formula: side_effects x w_se + failures x 0.5
    side_effects: does the tool have known side effects? (0 or 1)
    w_se: side effect weight (configurable, default 0.3)
    failures: recent failure rate (0.0 to 1.0)
    Range: -0.5 to 0.0 (always negative or zero, penalizes risky tools)
    
    Example:
      mesh-gen: no side effects, failure rate 0.04
      risk_penalty = 0 x 0.3 + 0.04 x 0.5 = -0.02

ALGORITHMIC SCORE:
  algorithmic = (compatibility x 0.4) + (trust x 0.3) + (cost x 0.2)
              + (latency x 0.1) + risk_penalty

  mesh-gen example:
    = (1.0 x 0.4) + (0.867 x 0.3) + (0.97 x 0.2) + (0.987 x 0.1) + (-0.02)
    = 0.400 + 0.260 + 0.194 + 0.099 + (-0.02)
    = 0.933

FINAL BLENDED SCORE:
  final_score = (1 - llm_weight) x algorithmic + llm_weight x llm_score

  With llm_weight = 0.7:
    mesh-gen: (0.3 x 0.933) + (0.7 x 0.95) = 0.280 + 0.665 = 0.945
```

### Trust Formula (Bayesian)

```
TRUST CALCULATION:

  trust = (successes + prior x 0.5) / (total + prior)
  
  Where:
    successes = number of successful tool executions
    total     = total number of tool executions
    prior     = 10 (virtual observations -- regularization parameter)

  Simplified:
    trust = (successes + 5) / (total + 10)

  Properties:
    Initial trust (0 runs): (0 + 5) / (0 + 10) = 0.5 (neutral)
    After 10 successes, 0 failures: (10 + 5) / (10 + 10) = 0.75
    After 50 successes, 2 failures: (50 + 5) / (52 + 10) = 0.887
    After 100 successes, 4 failures: (100 + 5) / (104 + 10) = 0.921

  Bounded: 0.0 to 1.0 (mathematically guaranteed by the formula)
  
  Cached: 60-second TTL. Trust scores are computed once and cached.
  After 60 seconds, the cache expires and trust is recomputed from
  the latest execution data.

  WHY BAYESIAN:
    - New tools start at 0.5 (neutral), not 0.0 (untrusted) or 1.0 (fully trusted)
    - A single failure doesn't destroy trust (prior acts as damping)
    - Trust converges to actual success rate as data accumulates
    - No special cases needed for "no data" vs "some data" vs "lots of data"
```

### Step-by-Step with Actual Prompts

**STEP 2: Assemble Context**

```
The system builds a context object:

{
  goal: "Determine optimal mesh density and run FEA simulation to verify 
         stress requirements under specified loads while minimizing weight",
  
  input: {
    material: "Al6061-T6",
    geometry: "art_cad_001" (bracket 160x80x5mm),
    load: 500N,
    threshold: 250 MPa
  },
  
  iteration: 1 of 5,
  previous_results: [],
  cost_so_far: $0,
  budget_remaining: $10,
  
  memories: [
    "Al6061 optimal mesh density is 0.8 for plates",
    "mesh-gen before fea-solver produces better results"
  ],
  
  board: { mode: "study", effective_threshold: 0.85 }
}
```

**STEP 3-5: Search, Score, and Filter Tools**

```
ToolSearcher queries the registry via ToolShelf:

  Input: agent's tool list [mesh-gen@1, fea-solver@2, result-analyzer@1]
  
  For each tool, fetches:
  - Full contract (inputs, outputs, types)
  - Usage stats (success rate, avg duration, avg cost)
  - Capability tags (structural, meshing, analysis)
  
  Filters out:
  - Tools the agent doesn't have permission for
  - Tools that can't accept the available input types
  - Tools that have exceeded max_invocations for this run
  
  Result: 3 candidate tools with full metadata

SCORING (5 dimensions for each tool):

  mesh-generator@1:
    compatibility: 1.00 (accepts artifact input, which we have)
    trust: 0.867 (89/93 success, Bayesian=(89+5)/(93+10)=0.913, coverage=0.95)
    cost: 0.97 (estimated $0.30, well within $10 budget)
    latency: 0.987 (8s estimated, 600s timeout)
    risk_penalty: -0.02 (no side effects, low failure rate)
    algorithmic_score = 0.933

  fea-solver@2:
    compatibility: 0.50 (needs mesh input, which we DON'T have yet)
    trust: 0.847 (47/49 success, Bayesian, coverage=0.94)
    cost: 0.95 (estimated $0.50)
    latency: 0.975 (15s estimated)
    risk_penalty: -0.02
    algorithmic_score = 0.714

  result-analyzer@1:
    compatibility: 0.10 (needs FEA results, which we don't have)
    trust: 0.830 (34/36 success, Bayesian, coverage=0.92)
    cost: 0.99 ($0.10)
    latency: 0.995 (3s estimated)
    risk_penalty: -0.01
    algorithmic_score = 0.437

LLM SCORING:

  PROMPT TO LLM:
  "You are an engineering analysis assistant.
   Goal: {goal}
   Context: {input data}
   Available tools:
   1. mesh-generator@1: Generates mesh from CAD geometry
   2. fea-solver@2: Runs FEA stress analysis (needs mesh as input)
   3. result-analyzer@1: Post-processes FEA results (needs FEA output)
   
   This is iteration 1. No previous results.
   Which tool should be used FIRST? Score each tool 0-1 for relevance."

  LLM RESPONSE:
  {
    "scores": {
      "mesh-generator@1": 0.95,
      "fea-solver@2": 0.40,
      "result-analyzer@1": 0.10
    },
    "reasoning": "Must generate mesh before FEA analysis. Mesh generator 
                  is the logical first step for CAD geometry input."
  }

BLENDED SCORES (weight = 0.7 LLM, 0.3 algorithmic):
  mesh-generator: 0.3 x 0.933 + 0.7 x 0.95 = 0.945   <-- WINNER
  fea-solver:     0.3 x 0.714 + 0.7 x 0.40 = 0.494
  result-analyzer: 0.3 x 0.437 + 0.7 x 0.10 = 0.201
```

**STEP 6: Generate Proposal**

```
PROMPT TO LLM:

  "You have selected mesh-generator@1 as the best tool.
   
   Tool contract:
   - geometry (artifact, required): CAD geometry file
   - density (number, optional, default 1.0): Mesh density parameter 0.1-2.0
   - element_type (enum: hex8/tet4/tet10, default hex8): Element type
   
   Available context:
   - geometry artifact: art_cad_001 (bracket_v3.step)
   - material: Al6061-T6
   - geometry type: plate bracket
   
   Relevant memory: 'Al6061 optimal mesh density is 0.8 for plates'
   
   Propose the exact input values for this tool.
   Include your confidence (0-1) and reasoning."

LLM RESPONSE:

  {
    "selected_tool": "mesh-generator@1",
    "confidence": 0.92,
    "reasoning": "Mesh generation is the necessary first step. Using density 0.8 
                  based on memory of optimal density for Al6061 plates. Hex8 elements 
                  are preferred for structural plate analysis.",
    "proposed_inputs": {
      "geometry": "art_cad_001",
      "density": 0.8,
      "element_type": "hex8"
    },
    "estimated_cost": 0.30,
    "alternatives": [
      {
        "tool": "fea-solver@2",
        "score": 0.494,
        "reason": "Cannot run without mesh -- needs mesh-generator output first"
      }
    ]
  }

THIS BECOMES THE ActionProposal OBJECT.
```

**STEP 7: Enforce Policy**

```
PolicyEnforcer checks the proposal:

  CHECK 1: Board mode override
    - Board mode: "study" -> confidence_threshold = max(0.85, 0.75) = 0.85
    - No additional approval requirements (study only adds high_risk)

  CHECK 2: Escalation rules
    - "confidence < 0.5" -> 0.92 is NOT < 0.5 -> PASS
    - "cost > 5.00" -> 0.30 is NOT > 5.00 -> PASS
  
  CHECK 3: Permission requirements  
    - Tool requires "execute" permission
    - "require_approval_for" includes ["write", "delete"] but NOT "execute"
    - PASS -- no approval needed for execute
  
  CHECK 4: Auto-approve threshold
    - Confidence 0.92 >= 0.85 threshold -> APPROVED
  
  CHECK 5: Constraints
    - Cost $0.30 + spent $0.00 = $0.30 <= budget $10.00 -> OK
    - Iteration 1 <= max 5 -> OK
    - Elapsed 0s <= timeout 600s -> OK
  
  VERDICT: APPROVED
  
  (If confidence was 0.72 -> NEEDS_APPROVAL, queued for human)
  (If confidence was 0.35 -> REJECTED immediately)
  (If cost was $6.00 -> ESCALATE to project_lead)
```

**STEP 9-10: Dispatch and Execute**

```
ProposalExecutor dispatches the tool:

  Publish to NATS subject: airaie.jobs.agent.execution
  {
    "run_type": "tool",
    "tool_ref": "mesh-generator@1",
    "inputs": {
      "geometry": "art_cad_001",
      "density": 0.8,
      "element_type": "hex8"
    },
    "parent_run_id": "run_agent_xyz",  // links to agent's run
    "actor": "agent:fea-optimizer@2"   // tracked as agent-initiated
  }

  This follows the EXACT SAME execution path as workflow tool execution:
  -> Job payload -> NATS -> Rust Runner -> Docker container -> Result -> NATS

  Progress events published to: airaie.events.{runId}
  
  Agent WAITS for the Result (async but blocking within the agent loop).
  
  Result arrives on: airaie.results.completed
  After 7.2 seconds:
  {
    "status": "SUCCEEDED",
    "outputs": {
      "mesh_output": { "artifact_id": "art_mesh_002" },
      "metrics": { "element_count": 45000, "quality": 0.95 }
    },
    "metrics": { "duration_ms": 7200, "cost_usd": 0.30 }
  }
```

**STEP 11: Collect Artifacts + Evaluate Result**

```
PROMPT TO LLM:

  "You ran mesh-generator@1 with density=0.8, element_type=hex8.
   
   Result:
   - Status: SUCCEEDED
   - Mesh: 45,000 elements, quality score 0.95
   - Artifact: art_mesh_002
   - Duration: 7.2s, Cost: $0.30
   
   Your goal: 'Determine optimal mesh density and run FEA simulation
              to verify stress requirements under specified loads'
   
   Is the goal achieved? What should happen next?"

LLM RESPONSE:
  {
    "goal_achieved": false,
    "assessment": "Mesh generated successfully with good quality (0.95).
                   But the goal requires FEA simulation, which hasn't been run yet.
                   Next step: run FEA solver on this mesh.",
    "next_action": "continue",
    "next_tool_hint": "fea-solver@2"
  }
```

**STEP 12-13: Update Trust + Learn**

```
TRUST UPDATE:
  mesh-generator@1: was 89/93, now 90/94
  new trust = (90 + 5) / (94 + 10) = 0.913 (cached for 60s)

MEMORY CREATION:
  Episodic: {
    memory_type: "episodic",
    category: "lesson",
    content: "mesh-gen@1 with density=0.8 for Al6061 bracket produced 45K elements, quality 0.95",
    expires_at: "2026-05-06T..."  // 30-day TTL
  }

ITERATION CONTROLLER evaluates:
  goal_achieved = false -> continue
  current_iteration = 1 < max 5 -> within limits
  cost_so_far = $0.30 < budget $10.00 -> within budget
  elapsed = 7.2s < timeout 600s -> within time
  
  DECISION: LOOP BACK to Step 2 for iteration 2
```

### Iteration 2 (abbreviated)

```
STEP 2: Context now includes mesh result from iteration 1
STEP 3: Search tools -- same 3 candidates
STEP 4: Score -- fea-solver NOW scores highest (has mesh input available)
  mesh-generator: compatibility LOW (already done, redundant)
  fea-solver: compatibility HIGH (mesh artifact available)
  result-analyzer: compatibility LOW (no FEA results yet)
  
STEP 6: Proposal: fea-solver with mesh_file=art_mesh_002, threshold=250
  Confidence: 0.94
STEP 7: Policy: 0.94 >= 0.85 -> APPROVED
STEP 9-10: Execute fea-solver -> 15 seconds -> max_stress=187.3 MPa
STEP 11: Evaluate: stress 187.3 < threshold 250 -> goal ACHIEVED!
STEP 12: Trust update for fea-solver
STEP 13: Memory: "fea-solver@2 with mesh from density 0.8 showed 187.3 MPa for Al6061 bracket"

goal_achieved = true -> RETURN final output
```

### Confidence Scoring in Detail

```
HOW CONFIDENCE IS CALCULATED:

  The LLM assigns a confidence score (0.0 to 1.0) based on:
  
  FACTORS THAT INCREASE CONFIDENCE:
  + Clear input-output match (tool accepts what we have)          +0.2
  + Previous successful experience (from memory)                   +0.15
  + Straightforward goal alignment                                 +0.15
  + Well-documented tool contract                                  +0.1
  + Similar to previous successful patterns                        +0.1
  
  FACTORS THAT DECREASE CONFIDENCE:
  - Ambiguous or incomplete input data                             -0.2
  - No memory of similar situations                                -0.1
  - Multiple equally valid tool choices                            -0.1
  - Tool has poor historical success rate                          -0.15
  - Input types require complex transformation                     -0.1
  
  EXAMPLES:
  Confidence 0.92: "Clear first step, memory confirms approach, simple input mapping"
  Confidence 0.72: "Reasonable choice but untested material type, no memory"
  Confidence 0.42: "Uncertain -- input data ambiguous, could be mesh-gen OR fea-solver"
  Confidence 0.15: "Very uncertain -- unknown geometry type, no relevant experience"

THE CONFIDENCE IS NOT JUST A NUMBER:
  It drives REAL policy decisions via the 4 verdicts:
  - >= auto_approve_threshold: APPROVED, executes immediately
  - Between reject and approve: NEEDS_APPROVAL, human gate
  - < reject threshold (0.5): REJECTED automatically
  - Triggers escalation rule: ESCALATE to target
  
  Board mode overrides can tighten these thresholds further.
  This makes confidence a GOVERNANCE mechanism, not just a metric.
```

---

## 5. TOOL USAGE BY AGENT

### Tool Selection Process

```
GIVEN: Agent has 3 available tools

  mesh-generator@1:
    inputs: geometry (artifact), density (number), element_type (enum)
    outputs: mesh_output (artifact), metrics (json)
    
  fea-solver@2:
    inputs: mesh_file (artifact), threshold (number), material (string)
    outputs: result (artifact), metrics (json)
    
  result-analyzer@1:
    inputs: result_file (artifact), metrics (json)
    outputs: report (artifact), summary (json)

SELECTION LOGIC (ToolShelf 5-stage):
  1. DISCOVER: What tools are in my allowed list?
     -> mesh-gen@1, fea-solver@2, result-analyzer@1
  
  2. FILTER: Which can I use right now?
     -> mesh-generator: YES (accepts geometry artifact, I have art_cad_001)
     -> fea-solver: NO (needs mesh artifact, I only have CAD)
     -> result-analyzer: NO (needs FEA results, I have nothing)
  
  3. RANK: Score using 5 dimensions
     -> mesh-generator scores 0.933 algorithmically
  
  4. EXPLAIN: Why this tool?
     -> "mesh-gen before fea-solver produces better results" (from memory)
     -> "Only compatible tool for current inputs"
  
  5. ASSEMBLE: Build final candidate with contract
     -> mesh-generator@1 with full contract loaded

  Propose mesh-generator with confidence 0.92
```

### How Agent Constructs Tool Inputs

```
THE AGENT READS THE TOOL CONTRACT:

  Tool: mesh-generator@1
  Inputs:
    geometry (artifact, required): "Input CAD geometry"
    density (number, optional, default 1.0): "Mesh density 0.1-2.0"
    element_type (enum: hex8/tet4/tet10, default hex8): "Element type"

THE AGENT'S LLM PROPOSES VALUES:

  "I have:
   - geometry artifact: art_cad_001 -> maps to 'geometry' input
   - Memory says Al6061 plates work best with density 0.8
   - Memory says hex8 preferred for structural
   
   Proposed inputs:
   {
     geometry: 'art_cad_001',    // from available artifacts
     density: 0.8,               // from memory
     element_type: 'hex8'        // from memory
   }"

VALIDATION:
  Before dispatch, inputs are validated against the contract:
  - geometry: artifact type, art_cad_001 exists in MinIO
  - density: number type, 0.8 in range [0.1, 2.0]
  - element_type: enum, "hex8" in allowed values
  All valid -> dispatch
```

### How Agent Interprets Tool Outputs

```
TOOL RETURNS:
  {
    "mesh_output": "art_mesh_002" (artifact),
    "metrics": { "element_count": 45000, "quality": 0.95 }
  }

AGENT INTERPRETS:
  The LLM receives the output as a STRUCTURED SUMMARY (not raw data).
  
  PROMPT: "mesh-generator produced: 45,000 elements, quality 0.95.
           Is this mesh suitable for FEA analysis?"
  
  LLM: "Quality 0.95 is excellent (>0.9 is good). 45,000 elements is
        appropriate for a 160x80mm bracket. Mesh is ready for FEA."
  
  INTERPRETATION RESULT:
  {
    "assessment": "good",
    "can_proceed": true,
    "next_inputs_available": {
      "mesh_file": "art_mesh_002"   // this output feeds into fea-solver
    }
  }
```

---

## 6. AGENT MEMORY

### Memory Storage Schema

```sql
TABLE: agent_memories
  id:            UUID PRIMARY KEY
  agent_id:      UUID REFERENCES agents(id)
  memory_type:   VARCHAR(20)    -- 'episodic' or 'semantic'
  category:      VARCHAR(20)    -- 'fact', 'preference', 'lesson', 'error_pattern'
  content:       TEXT            -- the memory text
  embedding:     vector(1536)   -- pgvector embedding for similarity search
  context:       JSONB           -- when/how this was learned
  expires_at:    TIMESTAMP       -- NULL for semantic, set for episodic (TTL)
  created_at:    TIMESTAMP
  updated_at:    TIMESTAMP
  created_by:    VARCHAR(50)     -- 'agent' (auto) or 'user' (manual)

INDEX: ivfflat ON agent_memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
```

### Memory Lifecycle

```
CREATION:
  1. AUTOMATIC: After each tool execution, the agent evaluates the result.
     If the result reveals something new, a memory is created.
     
     Episodic example:
       Agent runs fea-solver with density 0.6 -> mesh too coarse -> fails
       -> Creates episodic memory:
          { memory_type: "episodic",
            category: "error_pattern",
            content: "density 0.6 insufficient for thin walls < 3mm, solver diverged",
            expires_at: now() + interval '30 days' }
     
     Semantic extraction (after patterns emerge across 3+ episodic memories):
       -> Creates semantic memory:
          { memory_type: "semantic",
            category: "lesson",
            content: "Al6061 thin walls <3mm require mesh density >= 0.8",
            expires_at: NULL }
  
  2. MANUAL: User adds memories in the Agent Builder Memory page.
     
     Example: Engineer adds:
       { memory_type: "semantic",
         category: "fact",
         content: "ISO 12345 requires safety factor > 1.2" }

RETRIEVAL:
  Before each decision, retrieve relevant memories via vector similarity:
  
  1. Embed current context (goal + input summary) -> query_vector
  2. SELECT * FROM agent_memories
     WHERE agent_id = $1
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY embedding <=> query_vector  -- cosine distance
     LIMIT 5
  3. Inject retrieved memories into LLM prompt as context

UPDATE:
  Memories can be updated if new information refines them:
  
  Old: "Al6061 optimal mesh density is 0.8 for plates"
  Updated: "Al6061 optimal mesh density is 0.8 for plates >3mm thick, 0.6 for <3mm"
  Re-embed and store updated vector.

EXPIRATION:
  Episodic memories expire based on their TTL (expires_at field).
  Semantic memories persist indefinitely (expires_at = NULL).
  A background job periodically deletes WHERE expires_at < now().
```

### Memory Impact on Decisions

```
WITHOUT MEMORY (first run):
  Agent has no experience.
  LLM uses general knowledge: "I'll try default density 1.0"
  Result: mesh too dense, 200,000 elements, slow execution
  -> Creates episodic memory: { category: "error_pattern",
       content: "density 1.0 produces excessively dense mesh for plate geometry" }

WITH MEMORY (subsequent runs):
  Agent retrieves (via vector similarity):
    "Al6061 optimal mesh density is 0.8 for plates" (semantic/fact)
    "density 1.0 produces excessively dense mesh" (episodic/error_pattern)
  LLM uses memories: "I'll use density 0.8 based on past experience"
  Result: mesh with 45,000 elements, perfect quality
  
  The agent IMPROVED its decision based on learned experience.
```

---

## 7. POLICY & CONSTRAINT SYSTEM

### Policy Enforcement Flowchart

```
+--------------------------------------------------------+
|              POLICY ENFORCEMENT FLOW                    |
|                                                         |
|  Proposal received: tool=mesh-gen, confidence=0.72      |
|                                                         |
|  +-------------------------------------+               |
|  | CHECK 0: Board mode override         |               |
|  | Board: "study" -> threshold=0.75     |               |
|  | Agent: threshold=0.85                |               |
|  | Effective: max(0.85, 0.75) = 0.85   |               |
|  | (board cannot loosen, only tighten)  |               |
|  +--------------+-----------------------+               |
|                 |                                       |
|  +--------------v-----------------------+               |
|  | CHECK 1: Hard rejection rules        |               |
|  | Rule: confidence < 0.5 -> REJECTED   |               |
|  | 0.72 < 0.5? -> NO -> PASS            |               |
|  +--------------+-----------------------+               |
|                 |                                       |
|  +--------------v-----------------------+               |
|  | CHECK 2: Escalation rules            |               |
|  | Rule: cost > 5.00 -> ESCALATE        |               |
|  | $0.30 > $5.00? -> NO -> PASS         |               |
|  +--------------+-----------------------+               |
|                 |                                       |
|  +--------------v-----------------------+               |
|  | CHECK 3: Permission requirements     |               |
|  | Tool needs: execute                   |               |
|  | Require approval for: write, delete  |               |
|  | Execute in list? -> NO -> PASS        |               |
|  +--------------+-----------------------+               |
|                 |                                       |
|  +--------------v-----------------------+               |
|  | CHECK 4: Auto-approve threshold      |               |
|  | Confidence: 0.72                      |               |
|  | Threshold: 0.85 (effective)           |               |
|  | 0.72 >= 0.85? -> NO -> NEEDS_APPROVAL|               |
|  +--------------+-----------------------+               |
|                 |                                       |
|  VERDICT: NEEDS_APPROVAL                                |
|  -> Proposal sent to human approval queue               |
|  -> Agent pauses until human approves/rejects           |
|  -> If approved: execute tool                            |
|  -> If rejected: agent receives rejection and may        |
|    try a different approach (replanning)                  |
|                                                         |
+--------------------------------------------------------+
```

### Constraint Enforcement

```
CONSTRAINTS ARE HARD LIMITS (different from policies):

  Budget: $10.00 maximum per agent execution
    Checked: before each tool dispatch
    If cost_so_far + estimated_cost > max_cost -> REJECTED
    Agent returns partial results with: "Budget exhausted"

  Iterations: 5 maximum
    Checked: at start of each iteration loop
    If current_iteration > max_iterations -> REJECTED
    Agent returns: "Max iterations reached without achieving goal"

  Timeout: 600 seconds
    Checked: continuously during execution
    If elapsed > timeout_sec -> REJECTED
    Any running tool is canceled
    Agent returns: "Timeout exceeded"

  Max Retries: 3 per tool
    If a tool fails, agent can retry up to 3 times
    After 3 failures -> trigger replanning (exclude failed tool)

  Max Invocations: per tool per run
    "max_invocations": 5 for mesh-gen
    If agent tries to call mesh-gen a 6th time -> blocked
    Agent must choose a different tool or stop
```

---

## 8. AGENT OUTPUT

### What an Agent Produces

```
AGENT FINAL OUTPUT:

{
  "goal_achieved": true,
  "final_result": {
    "json": {
      "max_stress": 187.3,
      "safety_factor": 1.34,
      "threshold": 250,
      "pass": true,
      "recommendation": "Design meets ISO 12345 stress requirements"
    },
    "artifacts": {
      "mesh": "art_mesh_002",
      "stress_map": "art_stress_003"
    }
  },
  "execution_summary": {
    "iterations": 2,
    "tools_used": [
      { "tool": "mesh-generator@1", "status": "succeeded", "cost": 0.30 },
      { "tool": "fea-solver@2", "status": "succeeded", "cost": 0.50 }
    ],
    "total_cost": 0.80,
    "total_duration_sec": 22.2,
    "decisions": [
      {
        "iteration": 1,
        "selected": "mesh-generator@1",
        "confidence": 0.92,
        "verdict": "approved"
      },
      {
        "iteration": 2,
        "selected": "fea-solver@2",
        "confidence": 0.94,
        "verdict": "approved"
      }
    ]
  },
  "memories_created": [
    { "category": "lesson", "content": "density 0.8 produced good mesh for Al6061 bracket" }
  ]
}
```

### Output Flows Downstream

```
IN A WORKFLOW:
  [Agent Node] -> [Gate Node]
  
  The agent's final_result becomes the output data for the agent node.
  Downstream nodes access it via expressions:
  
  {{ $('AI Optimizer').json.max_stress }}       -> 187.3
  {{ $('AI Optimizer').json.pass }}             -> true
  {{ $('AI Optimizer').artifacts.stress_map }}  -> "art_stress_003"

IN PLAYGROUND:
  The final_result is formatted as a chat response:
  
  "Analysis complete! The bracket design passes ISO 12345 requirements.
   - Max stress: 187.3 MPa (below 250 MPa threshold)
   - Safety factor: 1.34 (above 1.2 minimum)
   - Mesh: 45,000 hex8 elements, quality 0.95
   
   I used mesh-generator (7.2s, $0.30) and fea-solver (15s, $0.50).
   Total cost: $0.80, Total time: 22.2s."
```

---

## 9. AGENT -> WORKFLOW INTERACTION

### Agent as a Workflow Node

```
IN THE WORKFLOW DAG:

  [Trigger] -> [Agent Node] -> [Gate Node] -> [Output]

TO THE WORKFLOW SCHEDULER:
  The agent is a SINGLE NODE that:
  1. Receives input from upstream nodes
  2. Does SOMETHING internally (scheduler doesn't know or care what)
  3. Eventually produces output
  4. Output flows to downstream nodes

  The scheduler treats it exactly like a tool node:
  - Dispatch when dependencies satisfied
  - Wait for completion
  - Process output
  - Continue with next nodes

INSIDE THE AGENT NODE (invisible to workflow):
  The agent may:
  - Call 3 tools over 45 seconds
  - Make 3 proposals, get 2 approved and 1 needing approval
  - Create 2 artifacts
  - Generate 1 new memory
  
  But the workflow only sees: "Agent node completed, here's the output"
```

### Does the Agent Control the Workflow Path?

```
NO -- the agent does NOT modify the workflow DAG.
The workflow path is defined at DESIGN TIME.

WHAT THE AGENT CAN INFLUENCE:

  1. OUTPUT VALUES -> affect downstream condition nodes
     Agent outputs: { pass: true, max_stress: 187.3 }
     IF node after agent: {{ $('Agent').json.pass == true }}
     -> Agent's output determines which branch is taken
     -> But the BRANCHES were defined by the workflow designer
  
  2. ARTIFACTS PRODUCED -> affect downstream tool inputs
     Agent produces: art_stress_003
     Next tool receives: {{ $('Agent').artifacts.stress_map }}
     -> Agent's artifacts feed into downstream tools
  
  3. NOTHING ELSE
     Agent cannot: add nodes, remove nodes, change connections,
     skip nodes, reorder execution, or modify the workflow structure.

THIS IS BY DESIGN:
  - Workflows provide PREDICTABILITY (you know the structure)
  - Agents provide INTELLIGENCE (they make smart decisions within their node)
  - Combining both: predictable structure with intelligent decision points
```

---

## 10. AGENT EXECUTION LIFECYCLE

```
+-------------------------------------------------------------+
|                AGENT EXECUTION LIFECYCLE                      |
|                                                              |
|  +----------+                                               |
|  |  START   | Agent node dispatched by workflow scheduler    |
|  |          | or triggered via API/Playground                |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | INIT     | Load AgentSpec version (integer)              |
|  |          | Verify status = "published"                   |
|  |          | Load persistent memories (top-k via pgvector) |
|  |          | Assemble initial context + board mode          |
|  |          | Initialize iteration counter (1/5)            |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | REASON   | Resolve tools via ToolShelf 5-stage           |
|  |          | Score with 5 dimensions -> Generate proposal  |
|  |          | LLM decides which tool + what inputs          |
|  |          | Produces: ActionProposal with confidence       |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | POLICY   | Enforce policies against proposal             |
|  |          | Apply board mode override (additive)          |
|  |          | -> APPROVED -> go to EXECUTE                  |
|  |          | -> NEEDS_APPROVAL -> go to WAIT               |
|  |          | -> REJECTED -> go to REASON (replan)          |
|  |          | -> ESCALATE -> route to target                |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | WAIT     | (only if NEEDS_APPROVAL or ESCALATE)          |
|  |          | Proposal queued for human review              |
|  |          | Agent pauses                                  |
|  |          | Human approves -> go to EXECUTE               |
|  |          | Human rejects -> go to REASON (replan)        |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | EXECUTE  | Build RunPlan (DAG levels)                    |
|  |          | Dispatch Jobs to NATS:                        |
|  |          |   airaie.jobs.agent.execution                 |
|  |          | Execute levels sequentially                   |
|  |          | (parallel within each level)                  |
|  |          | Wait for completion                            |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | EVALUATE | LLM interprets tool result                    |
|  |          | Did this achieve the goal?                     |
|  |          | Should I iterate or stop?                      |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | DECIDE   | goal_achieved? -> go to LEARN then COMPLETE   |
|  |          | need_more? -> increment iteration -> REASON   |
|  |          | tool_failed? -> replan (exclude failed tool)  |
|  |          | limits exceeded? -> COMPLETE with partial     |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | LEARN    | Update trust scores (Bayesian, 60s TTL cache) |
|  |          | Create episodic memory for this run            |
|  |          | Extract semantic patterns if threshold met    |
|  |          | Embed and store in pgvector                    |
|  +----+-----+                                               |
|       |                                                      |
|  +----v-----+                                               |
|  | COMPLETE | Build final output                            |
|  |          | Include: result, summary, decisions, memories |
|  |          | Publish to: airaie.results.completed          |
|  |          | Return to workflow scheduler or Playground     |
|  +----------+                                               |
|                                                              |
+-------------------------------------------------------------+
```

---

## 11. REAL EXAMPLE: FEA OPTIMIZATION AGENT

### Full End-to-End Execution

```
===================================================================
AGENT: FEA Optimizer Agent v2 (version: 2, status: published)
GOAL: "Determine optimal mesh density and run FEA simulation
       to verify stress requirements while minimizing weight"

INPUT (from workflow trigger):
  geometry: art_cad_001 (bracket_v3.step, Al6061-T6, 160x80x5mm)
  load: 500N
  threshold: 250 MPa

TOOLS: mesh-gen@1, fea-solver@2, result-analyzer@1
POLICY: auto_approve >= 0.85, max_cost $10, max_iterations 5
MODEL: Claude Sonnet 4, weight 0.7
BOARD: Study mode (effective threshold: max(0.85, 0.75) = 0.85)

MEMORIES (retrieved via pgvector similarity):
  - "Al6061 optimal mesh density is 0.8 for plates" (semantic/fact)
  - "mesh-gen before fea-solver produces better results" (semantic/lesson)
  - "Hex8 elements preferred for structural analysis" (semantic/preference)
===================================================================

ITERATION 1:
-------------
  STEP 1-2: Load spec v2, assemble context
  STEP 3: Resolve tools via ToolShelf (3 candidates)
  STEP 4: Score (5 dimensions):
    mesh-gen: 0.933 algo, 0.945 blended
    fea-solver: 0.714 algo, 0.494 blended
    analyzer: 0.437 algo, 0.201 blended
  STEP 5: All 3 pass permission check. mesh-gen wins.
  STEP 6: Propose mesh-gen with density=0.8, element_type=hex8
    Confidence: 0.92
  STEP 7: Policy: 0.92 >= 0.85 -> APPROVED
  STEP 8: Single tool, single level RunPlan
  STEP 9: Dispatch to airaie.jobs.agent.execution
  STEP 10: Execute mesh-gen in Docker, 7.2 seconds
  STEP 11: Result: mesh art_mesh_002, 45,000 elements, quality 0.95
    Evaluate: "Good mesh. Now need FEA. Goal not yet achieved."
  STEP 12: Trust update: mesh-gen (90+5)/(94+10) = 0.913
  STEP 13: Episodic memory created (30-day TTL)
  COST SO FAR: $0.30 | ELAPSED: 7.2s

ITERATION 2:
-------------
  STEP 2: Context now includes mesh result from iteration 1
  STEP 3-4: fea-solver NOW scores highest (mesh input available)
    fea-solver: 0.952 blended
    mesh-gen: 0.320 (redundant)
    analyzer: 0.440
  STEP 6: Propose fea-solver with mesh=art_mesh_002, threshold=250
    Confidence: 0.94
  STEP 7: Policy: 0.94 >= 0.85 -> APPROVED
  STEP 9-10: Execute fea-solver -> 15 seconds
    max_stress=187.3 MPa, safety_factor=1.34, converged=true
  STEP 11: Evaluate: "Stress 187.3 < 250 threshold. Goal ACHIEVED!"
  STEP 12: Trust update for fea-solver
  STEP 13: Episodic memory + semantic extraction check
  COST SO FAR: $0.80 | ELAPSED: 22.2s

COMPLETION:
-----------
  GOAL ACHIEVED: YES
  FINAL OUTPUT:
  {
    "pass": true,
    "max_stress": 187.3,
    "safety_factor": 1.34,
    "recommendation": "Design meets ISO 12345 requirements"
  }
  
  ARTIFACTS: art_mesh_002 (mesh), art_stress_003 (stress map)
  
  DECISIONS TRACE:
    1. mesh-gen@1 -> confidence 0.92 -> APPROVED -> succeeded
    2. fea-solver@2 -> confidence 0.94 -> APPROVED -> succeeded
  
  MEMORY CREATED:
    episodic/lesson: "density 0.8 produced good 45K-element mesh for Al6061 bracket"
  
  TOTAL: 2 iterations, 2 tools, $0.80, 22.2 seconds
  Published to: airaie.results.completed

===================================================================
ALTERNATIVE SCENARIO: STRESS EXCEEDS THRESHOLD
===================================================================

Same agent, but FEA result shows max_stress = 312 MPa (exceeds 250).

ITERATION 2 EVALUATE: "Stress 312 > 250. Goal NOT achieved. Design fails."
ITERATION 2 DECIDE: "Need to try different approach. Will refine mesh and retry."

ITERATION 3:
-------------
  REASON: "Previous mesh density 0.8 resulted in stress exceeding threshold.
           This could be a mesh refinement issue. Trying finer mesh density 0.6
           near stress concentrators."
  PROPOSE: mesh-gen with density=0.6, element_type=hex8
  CONFIDENCE: 0.78
  POLICY: Board mode "study" -> effective threshold 0.85
          0.78 < 0.85 -> NEEDS_APPROVAL (human gate)
  
  [AGENT PAUSES -- waiting for human]
  
  Human reviews in Approval Queue:
    "Agent wants to re-mesh with density 0.6. Confidence is 0.78.
     This is reasonable -- finer mesh near stress concentrations."
    -> Human clicks APPROVE
  
  EXECUTE: mesh-gen with density=0.6 -> 72,000 elements, quality 0.93
  
ITERATION 4:
-------------
  PROPOSE: fea-solver with new mesh
  CONFIDENCE: 0.88 -> APPROVED
  EXECUTE: fea-solver -> max_stress = 285 MPa (still over 250)
  
  EVALUATE: "Still exceeds threshold. This is likely a DESIGN issue,
             not a mesh issue. The bracket may need to be thicker."
  DECIDE: "Cannot fix design -- that's outside my scope.
           Returning recommendation to increase thickness."

COMPLETION (partial -- goal not achieved):
  {
    "goal_achieved": false,
    "reason": "Stress exceeds threshold even with refined mesh",
    "recommendation": "increase_plate_thickness",
    "details": {
      "current_thickness": "5mm",
      "suggested_minimum": "7mm",
      "basis": "Stress 285 MPa at density 0.6 with 72K elements"
    }
  }
  
  TOTAL: 4 iterations, 4 tool calls, $2.10, 67 seconds
  
  NOTE: The agent STOPPED because it recognized the problem
  was beyond its capability (design change needed, not just optimization).
  This is intelligent behavior -- knowing when to stop.

===================================================================
ALTERNATIVE SCENARIO: TOOL FAILURE + REPLANNING
===================================================================

Same agent, but fea-solver fails on iteration 2.

ITERATION 2:
  EXECUTE: fea-solver@2 -> FAILED (solver diverged, mesh quality issue)
  
  REPLAN triggered:
    ProposalGenerator.GenerateWithFailureContext(agentCtx, {
      failed_tool: "fea-solver@2",
      failure_reason: "Solver diverged, possible mesh quality issue",
      cost_spent: 0.30,
      budget_remaining: 9.70
    })
    
    Replanning: exclude fea-solver@2, enrich goal with failure context
    Agent proposes: re-mesh with different parameters, then retry FEA
    
  ITERATION 3: mesh-gen with density=0.6 (finer mesh)
  ITERATION 4: fea-solver@2 (now allowed again with new mesh)
    -> max_stress = 187 MPa -> Goal achieved

  Memory created:
    episodic/error_pattern: "fea-solver@2 diverged with mesh density 0.8 for complex bracket geometry"
```

---

## 12. NATS SUBJECTS

```
NAMESPACED NATS SUBJECTS:

  airaie.jobs.agent.execution
    Purpose: Agent job dispatch
    Publisher: ProposalExecutor (Go backend)
    Consumer: Rust Runner
    Payload: Standard Job with tool_ref, inputs, parent_run_id

  airaie.results.completed
    Purpose: Tool execution results
    Publisher: Rust Runner
    Consumer: Agent Runtime (Go backend)
    Payload: Result with status, outputs, metrics

  airaie.events.{runId}
    Purpose: Progress events for a specific run
    Publisher: Rust Runner
    Consumer: Agent Runtime + WebSocket gateway (for UI updates)
    Payload: Progress updates, log entries, status changes
```

---

## 13. ANTI-PATTERNS

```
THINGS THAT MUST NEVER HAPPEN:

  1. AGENT CALLS TOOLS DIRECTLY (bypass Workflow Runtime)
     Wrong: Agent imports tool library and calls functions directly
     Right: Agent dispatches tools through the standard Job -> NATS -> Runner pipeline
     Why: Bypassing the runtime loses auditing, cost tracking, artifact management,
          and policy enforcement

  2. LLM GENERATES ARBITRARY CODE
     Wrong: Agent asks LLM to write Python/Go code and executes it
     Right: Agent selects from pre-registered tools with validated contracts
     Why: Arbitrary code execution is a security nightmare and unauditable

  3. SESSION STATE IN BROWSER LOCALSTORAGE
     Wrong: Storing agent session state, memory, or decisions in the browser
     Right: All state lives in PostgreSQL, accessible via API
     Why: Browser storage is ephemeral, insecure, and not shared across sessions

  4. LLM CONFIDENCE SCORES TRUSTED DIRECTLY
     Wrong: Using raw LLM confidence (0.92) as the sole decision input
     Right: Blending LLM score with algorithmic scoring (5 dimensions)
     Why: LLMs are notoriously miscalibrated on confidence. The algorithmic
          layer provides grounding in real execution data (trust, cost, latency)

  5. AGENTS MODIFY OWN AGENTSPEC
     Wrong: Agent updates its own goal, tool permissions, or policy thresholds
     Right: AgentSpec is immutable once published. New version required for changes.
     Why: Self-modifying agents break governance, audit trails, and reproducibility.
          An agent that lowers its own confidence threshold could bypass approvals.
```

---

## 14. MINIMUM SYSTEM REQUIRED

### Backend Components

```
+---------------------------------------------------------------+
|              MINIMUM VIABLE AGENT SYSTEM                       |
|                                                                |
|  1. AGENT REGISTRY (Go)                                       |
|     File: internal/service/agent.go                            |
|     Does: CRUD for agents and agent versions                  |
|     Stores: agent specs, versions (integer), status            |
|     Lifecycle: draft -> validated -> published                 |
|     Database: agents, agent_versions tables                   |
|                                                                |
|  2. AGENT RUNTIME (Go -- THE CORE)                            |
|     File: internal/service/runtime.go                          |
|     Does: The 13-step execution pipeline                      |
|     Contains:                                                  |
|       - ToolSearcher: ToolShelf 5-stage resolution            |
|       - Scorer: 5-dimension + LLM hybrid scoring              |
|       - ProposalGenerator: deterministic or llm_augmented     |
|       - PolicyEnforcer: 4 verdicts + board mode override      |
|       - ProposalExecutor: dispatches tools as Runs            |
|       - ResultEvaluator: LLM-based result interpretation      |
|       - IterationController: loop + replanning on failure     |
|                                                                |
|  3. LLM PROVIDER (Go)                                         |
|     File: internal/agent/llm.go                                |
|     Does: Abstraction over LLM API calls                      |
|     Supports: Anthropic, OpenAI, Google, HuggingFace          |
|     Security: 14 regex patterns for prompt injection defense  |
|     Exposure: structured summaries only, never raw data       |
|     Interface:                                                 |
|       GenerateProposal(context, tools) -> ActionProposal      |
|       GenerateWithFailureContext(ctx, failCtx) -> ActionProposal|
|       EvaluateResult(result, goal) -> Evaluation              |
|       ScoreTools(tools, context) -> Scores                    |
|                                                                |
|  4. MEMORY STORE (Go + PostgreSQL + pgvector)                 |
|     File: internal/service/memory.go                           |
|     Does: Dual-layer memory (episodic + semantic)             |
|     Storage: pgvector embeddings, vector(1536), IVFFlat       |
|     Retrieval: top-k cosine similarity search                 |
|     Categories: fact, preference, lesson, error_pattern       |
|     TTL: episodic expires, semantic persists                  |
|     Database: agent_memories table with embedding column      |
|                                                                |
|  5. POLICY ENGINE (Go)                                        |
|     File: internal/service/runtime.go (PolicyEnforcer)        |
|     Does: Evaluate proposals against policy rules             |
|     Verdicts: APPROVED, NEEDS_APPROVAL, REJECTED, ESCALATE   |
|     Board mode: additive overrides (can tighten, not loosen)  |
|     Trust: Bayesian formula, 60-second cache TTL              |
|                                                                |
|  6. SESSION MANAGER (Go)                                      |
|     File: internal/service/session.go                          |
|     Does: Manage multi-turn interactive sessions              |
|     Stores: conversation history, session state               |
|     Database: sessions table                                  |
|                                                                |
|  7. TOOL EXECUTION (reuses existing system)                   |
|     The agent dispatches tools using the SAME RunService      |
|     that workflows use. No separate execution system needed.  |
|     Job -> NATS (airaie.jobs.agent.execution) -> Rust Runner  |
|     -> Docker -> Result -> NATS (airaie.results.completed)    |
|     Progress: airaie.events.{runId}                           |
|                                                                |
|  8. INFRASTRUCTURE (same as workflow system)                  |
|     PostgreSQL: agents, agent_versions, agent_memories,       |
|                 sessions, runs, node_runs, artifacts           |
|     pgvector: vector similarity search extension              |
|     NATS: airaie.jobs.agent.execution,                        |
|           airaie.results.completed,                            |
|           airaie.events.{runId}                                |
|     MinIO: artifact storage                                   |
|     Docker: tool container execution                          |
|     LLM API: external HTTP calls to Claude/GPT/Gemini         |
|                                                                |
|  ALL OF THIS ALREADY EXISTS IN YOUR CODEBASE.                 |
+---------------------------------------------------------------+
```

### The Key Insight

```
THE AGENT SYSTEM IS BUILT ON TOP OF THE TOOL SYSTEM:

  +-------------------------------+
  |  AGENT LAYER (decision-making) |
  |  13-step pipeline:             |
  |  Load -> Context -> ToolShelf  |
  |  -> Score -> Filter -> Propose |
  |  -> Policy -> Plan -> Dispatch |
  |  -> Execute -> Collect         |
  |  -> Trust -> Learn             |
  +---------------+---------------+
                  | uses
  +---------------v---------------+
  |  TOOL LAYER (execution)        |
  |  Job -> NATS -> Runner ->      |
  |  Docker -> Result               |
  +-------------------------------+

  The agent doesn't have its OWN execution system.
  It REUSES the tool execution system.
  
  When an agent decides to run fea-solver:
  1. Agent creates a Run (same API as workflow)
  2. Run dispatches a Job to airaie.jobs.agent.execution
  3. Rust Runner executes the Docker container (same runner)
  4. Result flows back on airaie.results.completed
  5. Agent interprets the result (agent-specific)
  
  The only NEW components are:
  - The 13-step pipeline (ToolShelf, 5-dim Scorer, ProposalGenerator)
  - The LLM integration (API calls to Claude/GPT, prompt injection defense)
  - The policy engine (4 verdicts, board mode override, Bayesian trust)
  - The dual-layer memory system (pgvector, episodic/semantic, TTL)
  - Replanning on failure
  
  Everything else is shared infrastructure.
```

---

*Generated: 2026-04-06*
*Based on: Airaie System Analysis, existing codebase architecture, planning documents, and implementation patterns*
