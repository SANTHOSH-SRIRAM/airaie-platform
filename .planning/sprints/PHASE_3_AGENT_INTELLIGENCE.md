# PHASE 3: AGENT INTELLIGENCE LAYER -- Complete Sprint Documents

> Phase 3 enables autonomous AI agents that select, execute, and learn from engineering tools.
> 4 sprints, 10-15 days. Runs IN PARALLEL with Phase 2.
> Start date: ~2026-04-28 (after Phase 1 completion).
> Dependencies: Phase 1 (tool execution golden path proven).

---

## Phase 3 Architecture Overview

```
+------------------------------------------------------------------+
|                   AGENT INTELLIGENCE LAYER                        |
|                                                                   |
|  Sprint 3.1: SCORING & TOOL SELECTION                            |
|  +---------------------------------------------------------+     |
|  | 5-dimension scoring | ToolShelf integration | LLM blend |     |
|  | Deterministic fallback | Score visualization             |     |
|  +---------------------------------------------------------+     |
|                          |                                        |
|  Sprint 3.2: PROPOSAL GENERATION & POLICY ENGINE                 |
|  +---------------------------------------------------------+     |
|  | ProposalGenerator | PolicyEnforcer (4 verdicts)          |     |
|  | Board mode override | Approval queue                    |     |
|  +---------------------------------------------------------+     |
|                          |                                        |
|  Sprint 3.3: AGENT MEMORY (pgvector)                             |
|  +---------------------------------------------------------+     |
|  | Episodic (TTL) | Semantic (persistent) | 4 categories   |     |
|  | Embedding retrieval | Auto-learning from runs            |     |
|  +---------------------------------------------------------+     |
|                          |                                        |
|  Sprint 3.4: MULTI-TURN SESSIONS & REPLANNING                   |
|  +---------------------------------------------------------+     |
|  | Session management | Multi-turn context | Replan on fail |     |
|  | Decision trace | Session expiry                          |     |
|  +---------------------------------------------------------+     |
+------------------------------------------------------------------+
```

---
---

# SPRINT 3.1: Agent Scoring & Tool Selection

**Duration:** 3 days
**Goal:** Implement production-ready 5-dimension hybrid scoring with ToolShelf integration, LLM blending, and deterministic fallback.
**Depends on:** Phase 1 complete (ToolShelf resolution engine proven, tool execution working).

---

## Section 1: Objectives & Success Metrics

### Sprint Objectives
1. Verify and harden the 5-dimension scoring algorithm with correct weights and formulas.
2. Wire ToolShelf 5-stage resolution as the sole tool candidate source for agents.
3. Implement LLM scoring blend with configurable weight per agent.
4. Implement deterministic fallback when LLM is unavailable.

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Scoring accuracy | 5/5 dimensions produce correct values | Unit tests with mock tool data |
| ToolShelf integration | 100% of agent tool queries go through ToolShelf | Integration test verifying no direct DB queries from agent |
| LLM blend correctness | Blended score = (1-w)*algo + w*llm within 0.001 tolerance | Parameterized tests across w=0.0, 0.3, 0.5, 0.7, 1.0 |
| Deterministic fallback | Agent executes successfully with llm_weight=0 | Integration test with LLM provider disabled |
| Scoring latency | < 200ms for 10 candidate tools | Benchmark test |

---

## Section 2: User Stories & Acceptance Criteria

### US-3.1.1: As an agent, I score candidate tools across 5 dimensions to select the best one.
**Acceptance Criteria:**
- [ ] Compatibility score = match(inputs) * match(outputs), weight 0.4
- [ ] Trust score = bayesian_rate * test_coverage, weight 0.3
- [ ] Cost score = 1 - (estimated_cost / max_cost_usd), weight 0.2
- [ ] Latency score = 1 - (estimated_duration / timeout_sec), weight 0.1
- [ ] Risk penalty = -(side_effects * w_se + failure_rate * 0.5), range [-0.5, 0.0]
- [ ] Final algorithmic = sum of weighted dimensions + risk_penalty
- [ ] Tools ranked in descending order of final score
- [ ] Ties broken by trust score, then by cost score

### US-3.1.2: As an agent, I receive tool candidates exclusively from ToolShelf.
**Acceptance Criteria:**
- [ ] ToolSearcher calls ToolShelf resolve (5-stage: DISCOVER -> FILTER -> RANK -> EXPLAIN -> ASSEMBLE)
- [ ] Agent's tool_permissions list is passed as filter constraint
- [ ] Only published tool versions returned
- [ ] Candidate list includes full ToolContract for each tool
- [ ] If ToolShelf returns 0 candidates, agent returns error with explanation

### US-3.1.3: As an agent, I blend LLM relevance scores with algorithmic scores.
**Acceptance Criteria:**
- [ ] LLM receives structured prompt: goal + context + tool contracts
- [ ] LLM returns per-tool relevance score in [0.0, 1.0]
- [ ] Blend formula: final = (1 - llm_weight) * algorithmic + llm_weight * llm_score
- [ ] llm_weight read from AgentSpec.llm.llm_weight (default 0.7)
- [ ] If LLM returns invalid scores (out of range, missing tools), fall back to algorithmic

### US-3.1.4: As an agent, I fall back to deterministic scoring when LLM is unavailable.
**Acceptance Criteria:**
- [ ] When LLM call fails (timeout, 5xx, auth error), set llm_weight=0 automatically
- [ ] ProposalGenerator mode switches to "deterministic"
- [ ] Agent execution continues with algorithmic-only scoring
- [ ] Warning logged: "LLM unavailable, using deterministic fallback"
- [ ] Run metadata includes `scoring_mode: "deterministic"` or `scoring_mode: "hybrid"`

### US-3.1.5: As a platform user, I configure scoring weights in the Agent Builder.
**Acceptance Criteria:**
- [ ] Strategy selector dropdown: weighted (default), priority, cost_optimized
- [ ] Weight sliders for 5 dimensions (sum to 1.0 enforced in UI)
- [ ] min_threshold input (tools below this score are excluded)
- [ ] Changes saved to AgentSpec.scoring via PUT /v0/agents/{id}/versions/{v}

### US-3.1.6: As a platform user, I see score breakdowns in the playground.
**Acceptance Criteria:**
- [ ] Per-tool score breakdown with 5 dimension bars
- [ ] LLM score vs algorithmic score comparison
- [ ] Final blended score prominently displayed
- [ ] Winning tool highlighted with reasoning text

---

## Section 3: Technical Design

### 3.1.1 Scoring Algorithm Implementation

**File:** `internal/service/runtime.go` (Scorer struct)

```
SCORING PIPELINE:

  Input: []CandidateTool, AgentContext, ScoringConfig
  Output: []ScoredTool (sorted descending by final_score)

  FOR EACH candidate tool:

    STEP 1: Compatibility (weight = config.weights.compatibility, default 0.4)
      available_inputs = set of input types available in agent context
      required_inputs  = set of required inputs from tool contract
      optional_inputs  = set of optional inputs from tool contract
      
      input_match  = |available_inputs INTERSECT required_inputs| / |required_inputs|
                     (1.0 if all required inputs available, 0.0 if none)
      
      goal_outputs = set of output types needed by the agent goal
      tool_outputs = set of outputs declared in tool contract
      
      output_match = |tool_outputs INTERSECT goal_outputs| / |goal_outputs|
                     (1.0 if tool produces everything needed, 0.0 if nothing)
                     (1.0 if goal_outputs is empty -- no specific requirement)
      
      compatibility = input_match * output_match

    STEP 2: Trust (weight = config.weights.trust, default 0.3)
      successes      = tool.execution_stats.success_count
      total          = tool.execution_stats.total_count
      prior          = 10  // Bayesian regularization parameter
      
      bayesian_rate  = (successes + prior * 0.5) / (total + prior)
                     = (successes + 5) / (total + 10)
      
      test_coverage  = tool.version.test_coverage  // 0.0 to 1.0, from registry
      
      trust = bayesian_rate * test_coverage

    STEP 3: Cost (weight = config.weights.cost, default 0.2)
      estimated_cost = tool.contract.estimated_cost_usd
      max_budget     = agent.constraints.max_cost_usd
      
      cost = 1.0 - (estimated_cost / max_budget)
      cost = clamp(cost, 0.0, 1.0)  // handle edge cases

    STEP 4: Latency (weight = config.weights.latency, default 0.1)
      estimated_duration = tool.contract.estimated_duration_sec
      timeout            = agent.constraints.timeout_sec
      
      latency = 1.0 - (estimated_duration / timeout)
      latency = clamp(latency, 0.0, 1.0)

    STEP 5: Risk Penalty (subtractive, range [-0.5, 0.0])
      has_side_effects  = tool.contract.has_side_effects  // bool -> 0 or 1
      w_se              = config.risk.side_effect_weight   // default 0.3
      recent_failure_rate = tool.execution_stats.recent_failure_rate  // last 20 runs
      
      risk_penalty = -(has_side_effects * w_se + recent_failure_rate * 0.5)
      risk_penalty = clamp(risk_penalty, -0.5, 0.0)

    FINAL ALGORITHMIC:
      algorithmic = (compatibility * w_compat) + (trust * w_trust) 
                  + (cost * w_cost) + (latency * w_latency) + risk_penalty

  AFTER SCORING ALL TOOLS:
    Sort by algorithmic score descending
    Remove tools below min_threshold (default 0.3)
```

### 3.1.2 LLM Scoring Blend

```
LLM SCORING REQUEST:

  PROMPT (structured):
    system: "You are an engineering tool selection assistant."
    user: {
      "goal": "<agent goal text>",
      "context": { <structured input summary> },
      "iteration": <current iteration>,
      "previous_results": [ <summary of prior iterations> ],
      "candidate_tools": [
        {
          "ref": "mesh-generator@1",
          "description": "Generates FEM mesh from CAD geometry",
          "inputs": [ { "name": "geometry", "type": "artifact", "required": true }, ... ],
          "outputs": [ { "name": "mesh_output", "type": "artifact" }, ... ],
          "estimated_cost": 0.30,
          "estimated_duration_sec": 8
        },
        ...
      ],
      "instruction": "Score each tool 0.0-1.0 for relevance to the goal given current context.
                      Return JSON: { 'scores': { '<tool_ref>': <score>, ... }, 'reasoning': '...' }"
    }

  RESPONSE PARSING:
    Parse JSON response
    Validate: all tool refs present, all scores in [0.0, 1.0]
    If invalid: log warning, fall back to algorithmic only

  BLEND:
    FOR EACH tool:
      final_score = (1 - llm_weight) * algorithmic_score + llm_weight * llm_score
    
    Re-sort by final_score descending
```

### 3.1.3 ToolShelf Integration

```
TOOLSEARCHER WIRING:

  BEFORE (direct DB):
    tools = toolStore.ListByIDs(agent.tool_permissions.tool_refs)

  AFTER (ToolShelf):
    resolution = toolShelf.Resolve(ResolveRequest{
      intent_type:  inferred from agent goal,
      tool_refs:    agent.tool_permissions.tool_refs,   // pre-filter
      trust_min:    agent.scoring.min_trust_level,
      adapter:      "",                                  // any adapter
      strategy:     agent.scoring.strategy,              // weighted/priority/cost_optimized
      limit:        20,
    })
    
    candidates = resolution.recommended + resolution.alternatives
    // Each candidate has full ToolContract loaded
```

### 3.1.4 Deterministic Fallback

```
FALLBACK LOGIC (in Scorer.ScoreTools):

  func (s *Scorer) ScoreTools(ctx, candidates, agentCtx) ([]ScoredTool, error) {
    // Step 1: Algorithmic scoring (always runs)
    scored := s.algorithmicScore(candidates, agentCtx)
    
    // Step 2: Attempt LLM scoring
    if agentCtx.LLMConfig != nil && agentCtx.LLMConfig.Weight > 0 {
      llmScores, err := s.llmScore(ctx, candidates, agentCtx)
      if err != nil {
        // FALLBACK: LLM unavailable
        log.Warn("LLM scoring failed, using deterministic fallback", "error", err)
        agentCtx.RunMetadata["scoring_mode"] = "deterministic"
        return scored, nil  // return algorithmic-only
      }
      // BLEND
      scored = s.blend(scored, llmScores, agentCtx.LLMConfig.Weight)
      agentCtx.RunMetadata["scoring_mode"] = "hybrid"
    } else {
      agentCtx.RunMetadata["scoring_mode"] = "deterministic"
    }
    
    return scored, nil
  }
```

### 3.1.5 Scoring Strategies

```
THREE STRATEGIES:

  WEIGHTED (default):
    Uses configured weights: compat=0.4, trust=0.3, cost=0.2, latency=0.1

  PRIORITY:
    Sort by compatibility DESC, then trust DESC on ties
    Ignores cost and latency entirely
    Use case: when correctness matters more than efficiency

  COST_OPTIMIZED:
    Reweight: compat=0.2, trust=0.2, cost=0.5, latency=0.1
    Use case: budget-constrained runs where cheapest viable tool preferred
```

---

## Section 4: API Contracts

### Existing APIs (verify/enhance)

```
GET /v0/agents/{id}/versions/{v}/score-tools
  Description: Score candidate tools for an agent version
  Query params:
    context (JSON, optional): Input context for scoring
    strategy (string, optional): weighted | priority | cost_optimized
  Response 200:
    {
      "scoring_mode": "hybrid" | "deterministic",
      "strategy": "weighted",
      "llm_weight": 0.7,
      "tools": [
        {
          "tool_ref": "mesh-generator@1",
          "algorithmic_score": 0.933,
          "llm_score": 0.95,
          "final_score": 0.945,
          "dimensions": {
            "compatibility": { "value": 1.0, "weight": 0.4, "weighted": 0.4 },
            "trust": { "value": 0.867, "weight": 0.3, "weighted": 0.260 },
            "cost": { "value": 0.97, "weight": 0.2, "weighted": 0.194 },
            "latency": { "value": 0.987, "weight": 0.1, "weighted": 0.099 },
            "risk_penalty": { "value": -0.02 }
          },
          "selected": true
        },
        ...
      ]
    }

PUT /v0/agents/{id}/versions/{v}
  Body (scoring config subset):
    {
      "scoring": {
        "strategy": "weighted",
        "weights": {
          "compatibility": 0.4,
          "trust": 0.3,
          "cost": 0.2,
          "latency": 0.1
        },
        "min_threshold": 0.3,
        "risk": {
          "side_effect_weight": 0.3
        }
      },
      "llm": {
        "llm_weight": 0.7
      }
    }
```

---

## Section 5: Data Models & Schema

### ScoredTool (in-memory model)

```go
type ScoredTool struct {
    ToolRef           string             `json:"tool_ref"`
    Contract          ToolContract       `json:"contract"`
    AlgorithmicScore  float64            `json:"algorithmic_score"`
    LLMScore          *float64           `json:"llm_score,omitempty"`
    FinalScore        float64            `json:"final_score"`
    Dimensions        ScoreDimensions    `json:"dimensions"`
    Selected          bool               `json:"selected"`
}

type ScoreDimensions struct {
    Compatibility  DimensionScore  `json:"compatibility"`
    Trust          DimensionScore  `json:"trust"`
    Cost           DimensionScore  `json:"cost"`
    Latency        DimensionScore  `json:"latency"`
    RiskPenalty    float64         `json:"risk_penalty"`
}

type DimensionScore struct {
    Value    float64  `json:"value"`     // raw dimension score 0.0-1.0
    Weight   float64  `json:"weight"`    // configured weight
    Weighted float64  `json:"weighted"`  // value * weight
}
```

### AgentSpec.Scoring (persisted)

```go
type ScoringConfig struct {
    Strategy      string             `json:"strategy"`       // weighted, priority, cost_optimized
    Weights       DimensionWeights   `json:"weights"`
    MinThreshold  float64            `json:"min_threshold"`  // default 0.3
    Risk          RiskConfig         `json:"risk"`
}

type DimensionWeights struct {
    Compatibility  float64  `json:"compatibility"`  // default 0.4
    Trust          float64  `json:"trust"`          // default 0.3
    Cost           float64  `json:"cost"`           // default 0.2
    Latency        float64  `json:"latency"`        // default 0.1
}

type RiskConfig struct {
    SideEffectWeight  float64  `json:"side_effect_weight"`  // default 0.3
}
```

---

## Section 6: Frontend Tasks

### 6.1 Agent Builder -- Scoring Configuration

**File:** `frontend/src/components/agents/builder/AgentSpecForm.tsx`
**What exists:** AgentSpecForm with tabs for metadata, tools, policies, etc.
**What to build:**

```
SCORING CONFIG TAB:
  +--------------------------------------------------+
  | Scoring Strategy                                  |
  | [Weighted v]  [Priority]  [Cost Optimized]        |
  |                                                    |
  | Dimension Weights           (sum must = 1.0)       |
  | Compatibility  [====|====|==       ] 0.40          |
  | Trust          [====|====|         ] 0.30          |
  | Cost           [====|              ] 0.20          |
  | Latency        [==                 ] 0.10          |
  |                              Total: 1.00           |
  |                                                    |
  | Min Score Threshold                                |
  | [=====                     ] 0.30                  |
  |                                                    |
  | LLM Blend Weight                                   |
  | [=======|=====|===         ] 0.70                  |
  | (0 = algorithmic only, 1 = LLM only)              |
  |                                                    |
  | Risk Penalty                                       |
  | Side Effect Weight  [===                ] 0.30     |
  +--------------------------------------------------+

BEHAVIORS:
  - Strategy selector disables weight sliders for "priority" mode
  - Weight sliders auto-normalize to sum 1.0 (adjust others proportionally)
  - Min threshold shows red warning if > 0.7 (may filter too aggressively)
  - LLM weight slider shows "Deterministic" label at 0.0
  - Save writes to AgentSpec.scoring via PUT endpoint
```

### 6.2 Playground -- Score Visualization

**File:** `frontend/src/components/agents/InspectorPanel.tsx`
**What exists:** Inspector panel in playground with tabs.
**What to build:**

```
SCORE BREAKDOWN (inside Inspector panel, "Scoring" tab):
  +---------------------------------------------------+
  | Tool Scoring Results         mode: hybrid          |
  |                                                     |
  | #1 mesh-generator@1              SELECTED           |
  | +-----------+--------+--------+--------+           |
  | | Dimension | Score  | Weight | Total  |           |
  | +-----------+--------+--------+--------+           |
  | | Compat    | 1.000  | 0.40   | 0.400  |           |
  | | Trust     | 0.867  | 0.30   | 0.260  |           |
  | | Cost      | 0.970  | 0.20   | 0.194  |           |
  | | Latency   | 0.987  | 0.10   | 0.099  |           |
  | | Risk      | -0.020 |   --   | -0.020 |           |
  | +-----------+--------+--------+--------+           |
  | Algorithmic: 0.933  LLM: 0.950  Final: 0.945       |
  |                                                     |
  | [=========|==] Algo    [===========] LLM            |
  |                                                     |
  | #2 fea-solver@2                                     |
  | Algorithmic: 0.714  LLM: 0.400  Final: 0.494       |
  |                                                     |
  | #3 result-analyzer@1                                |
  | Algorithmic: 0.437  LLM: 0.100  Final: 0.201       |
  +---------------------------------------------------+

BEHAVIORS:
  - Dimension bars colored: green (>0.7), yellow (0.4-0.7), red (<0.4)
  - Risk penalty bar is always red (negative value)
  - Selected tool has green highlight border
  - LLM vs Algo comparison shows side-by-side mini bars
  - Click on a tool expands full dimension breakdown
  - "deterministic" mode hides LLM column, shows "N/A"
```

---

## Section 7: State Machines & Lifecycle

### Scoring Pipeline State Machine

```
                    +---------------+
                    |   IDLE        |
                    +-------+-------+
                            |
                    agent run triggered
                            |
                    +-------v-------+
                    | RESOLVING     |  -- ToolShelf 5-stage
                    +-------+-------+
                            |
                    +-------v-------+
                    | SCORING_ALGO  |  -- 5-dimension computation
                    +-------+-------+
                            |
                    +-------v-------+
              +---->| SCORING_LLM   |  -- LLM call for relevance
              |     +-------+-------+
              |             |
         LLM fails    LLM succeeds
              |             |
              |     +-------v-------+
              |     | BLENDING      |  -- (1-w)*algo + w*llm
              |     +-------+-------+
              |             |
              +-----+-------v-------+
                    | RANKED        |  -- sorted, filtered, ready
                    +-------+-------+
                            |
                    +-------v-------+
                    | SELECTED      |  -- top tool chosen
                    +---------------+
```

---

## Section 8: Test Scenarios

### T-3.1.1: Scoring accuracy with known tool data
```
GIVEN: 3 mock tools with known stats
  mesh-gen: 89 successes/93 total, coverage 0.95, cost $0.30, duration 8s, no side effects
  fea-solver: 47/49, coverage 0.94, cost $0.50, duration 15s, no side effects
  result-analyzer: 34/36, coverage 0.92, cost $0.10, duration 3s, no side effects

AND: Agent budget=$10, timeout=600s, all tools have all required inputs available

WHEN: Scorer.algorithmicScore(candidates, context)

THEN:
  mesh-gen:
    compatibility = 1.0 * 1.0 = 1.0
    trust = ((89+5)/(93+10)) * 0.95 = 0.913 * 0.95 = 0.867
    cost = 1 - (0.30/10.0) = 0.97
    latency = 1 - (8/600) = 0.987
    risk = -(0*0.3 + (4/93)*0.5) = -0.022
    algo = (1.0*0.4) + (0.867*0.3) + (0.97*0.2) + (0.987*0.1) + (-0.022) = 0.932

  fea-solver:
    compatibility = 1.0 (has mesh input)
    trust = ((47+5)/(49+10)) * 0.94 = 0.881 * 0.94 = 0.828
    cost = 1 - (0.50/10.0) = 0.95
    latency = 1 - (15/600) = 0.975
    risk = -(0*0.3 + (2/49)*0.5) = -0.020
    algo = 0.4 + 0.248 + 0.190 + 0.098 + (-0.020) = 0.916

  Ranking: mesh-gen (0.932) > fea-solver (0.916) > result-analyzer
```

### T-3.1.2: LLM blend correctness
```
GIVEN: algorithmic scores: tool_A=0.8, tool_B=0.6
AND: LLM scores: tool_A=0.9, tool_B=0.7
AND: llm_weight=0.7

WHEN: blend(algo, llm, 0.7)

THEN:
  tool_A: (0.3 * 0.8) + (0.7 * 0.9) = 0.24 + 0.63 = 0.87
  tool_B: (0.3 * 0.6) + (0.7 * 0.7) = 0.18 + 0.49 = 0.67
```

### T-3.1.3: Deterministic fallback on LLM failure
```
GIVEN: LLM provider returns HTTP 503
AND: Agent has llm_weight=0.7

WHEN: Scorer.ScoreTools() called

THEN:
  - LLM error logged at WARN level
  - Scoring completes with algorithmic-only scores
  - Run metadata: scoring_mode = "deterministic"
  - Agent execution continues normally
```

### T-3.1.4: ToolShelf provides candidates
```
GIVEN: Agent has tool_permissions: [mesh-gen@1, fea-solver@2]
AND: ToolShelf has both tools as published

WHEN: ToolSearcher.SearchTools(agent.tool_permissions)

THEN:
  - ToolShelf.Resolve called (not direct DB query)
  - Response includes full ToolContract for each tool
  - Unpublished tool versions excluded
  - Tools not in agent permissions excluded
```

### T-3.1.5: Strategy changes ranking
```
GIVEN: tool_A (compat=1.0, trust=0.5, cost=0.9) and tool_B (compat=0.8, trust=0.9, cost=0.3)

WHEN strategy=weighted:   tool_A wins (higher compat has more weight)
WHEN strategy=priority:   tool_A wins (highest compat first)
WHEN strategy=cost_optimized: tool_A wins (cost weighted at 0.5)

GIVEN: tool_C (compat=0.9, trust=0.8, cost=0.3) and tool_D (compat=0.9, trust=0.7, cost=0.9)
WHEN strategy=priority:   tool_C wins (same compat, higher trust tiebreak)
WHEN strategy=cost_optimized: tool_D wins (cost=0.9 >> cost=0.3 at 0.5 weight)
```

---

## Section 9: Dependencies & Risks

### Dependencies
| Dependency | Status | Mitigation |
|-----------|--------|------------|
| ToolShelf 5-stage resolution (Sprint 1.3) | Required | ToolShelf must be proven before agent wiring |
| LLM provider configuration (Phase 0 B4) | Required | Fallback to deterministic if unconfigured |
| Tool execution stats in DB | Required | Bayesian trust uses success/total counts |
| Tool contract schema with cost/duration | Required | Scoring needs estimated_cost, estimated_duration |

### Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM scoring adds latency (>2s per call) | Medium | High | Cache LLM scores for identical context; set 5s timeout |
| Weight normalization edge cases | Low | Medium | Validate weights sum to 1.0 in API; clamp individual dimensions |
| ToolShelf returns 0 candidates | High | Low | Clear error message; suggest checking tool_permissions and tool status |

---

## Section 10: NATS Subjects & Events

```
EXISTING SUBJECTS (no new subjects needed for scoring):
  airaie.jobs.agent.execution     -- tool dispatch after scoring+proposal
  airaie.results.completed        -- tool results consumed by agent
  airaie.events.{runId}           -- progress events for playground

SCORING DOES NOT PUBLISH TO NATS:
  Scoring is a synchronous in-memory operation within the agent runtime.
  Only after a proposal is approved and executed does NATS get involved.
```

---

## Section 11: Migration & Data Requirements

```
NO NEW MIGRATIONS for Sprint 3.1.

Existing tables used:
  - agents, agent_versions: AgentSpec with scoring config
  - tools, tool_versions: ToolContract, execution stats
  - runs: success/failure counts for Bayesian trust
  
Verify:
  - tool_versions.estimated_cost column populated (default 0.0 if missing)
  - tool_versions.estimated_duration_sec column populated (default 60 if missing)
  - tool_versions.test_coverage column populated (default 0.0 if missing)
```

---

## Section 12: Definition of Done

- [ ] 5-dimension scoring produces mathematically correct scores (verified by unit tests)
- [ ] ToolShelf is the sole source of tool candidates for agents
- [ ] LLM blend works when LLM provider is configured
- [ ] Deterministic fallback works when LLM is unavailable
- [ ] 3 scoring strategies (weighted, priority, cost_optimized) produce correct rankings
- [ ] Frontend scoring config saves to AgentSpec
- [ ] Frontend score visualization renders in playground
- [ ] All scoring tests pass (unit + integration)
- [ ] Scoring completes in < 200ms for 10 tools (excluding LLM call)
- [ ] Run metadata includes scoring_mode field

---
---

# SPRINT 3.2: Proposal Generation & Policy Engine

**Duration:** 3 days
**Goal:** Generate ActionProposals from scored tools and enforce governance policies with 4 verdicts, board mode override, and approval queue.
**Depends on:** Sprint 3.1 (scoring produces ranked tool candidates).

---

## Section 1: Objectives & Success Metrics

### Sprint Objectives
1. Verify and harden ProposalGenerator: goal + context + scored tools -> ActionProposal.
2. Verify and harden PolicyEnforcer with all 4 verdicts and correct evaluation order.
3. Implement board mode override (Explore/Study/Release threshold injection).
4. Wire approval queue for NEEDS_APPROVAL proposals.

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Proposal generation | Proposals include tool, confidence, reasoning, inputs, alternatives | Integration test with real LLM call |
| Policy verdicts | All 4 verdicts triggered by correct conditions | Unit tests for each verdict path |
| Board mode override | effective_threshold = max(agent, board), never loosens | Parameterized test across all mode combinations |
| Approval queue flow | NEEDS_APPROVAL -> queue -> approve -> execute | E2E integration test |
| Proposal latency | < 3s including LLM call | Benchmark test |

---

## Section 2: User Stories & Acceptance Criteria

### US-3.2.1: As an agent, I generate ActionProposals with confidence and reasoning.
**Acceptance Criteria:**
- [ ] ProposalGenerator receives: goal + context + scored tools (from Sprint 3.1)
- [ ] In LLM mode: sends structured prompt to LLM requesting tool selection + inputs
- [ ] Proposal includes: selected_tool, confidence (0-1), reasoning (text), proposed_inputs (map), alternatives (list), estimated_cost
- [ ] In deterministic mode: selects top-scored tool, generates inputs from contract defaults and context matching
- [ ] Confidence in deterministic mode = algorithmic_score of selected tool

### US-3.2.2: As an agent, I receive one of 4 policy verdicts for each proposal.
**Acceptance Criteria:**
- [ ] APPROVED: confidence >= effective_threshold AND no escalation rules triggered AND no approval-required permissions AND constraints within limits
- [ ] NEEDS_APPROVAL: confidence between reject_threshold (0.5) and effective_threshold, OR tool has approval-required permission type
- [ ] REJECTED: confidence < 0.5, OR budget exhausted, OR iteration limit, OR timeout
- [ ] ESCALATE: escalation rule triggered (e.g., cost > limit)
- [ ] Evaluation order: REJECT -> ESCALATE -> APPROVAL_REQUIRED -> AUTO_APPROVE -> CONSTRAINTS -> DEFAULT
- [ ] Policy verdict attached to Run record

### US-3.2.3: As an agent running in a board context, board mode tightens my thresholds.
**Acceptance Criteria:**
- [ ] Explore mode injects threshold 0.5
- [ ] Study mode injects threshold 0.75
- [ ] Release mode injects threshold 0.90
- [ ] Effective threshold = max(agent_threshold, board_threshold)
- [ ] Effective approval list = union(agent_approval_list, board_approval_list)
- [ ] Board overrides NEVER loosen (if agent=0.90 and board=Explore(0.5), agent keeps 0.90)
- [ ] Study mode adds "high_risk" to require_approval_for
- [ ] Release mode adds "medium_risk" and "side_effects" to require_approval_for

### US-3.2.4: As a platform user, I see pending proposals in an approval queue.
**Acceptance Criteria:**
- [ ] NEEDS_APPROVAL proposals appear in GET /v0/approvals endpoint
- [ ] Each approval shows: agent name, proposal details, confidence, reasoning
- [ ] User can approve or reject each proposal
- [ ] Approving resumes agent execution with the proposal
- [ ] Rejecting triggers replanning (or stops if no alternatives)
- [ ] Approval has timestamp and approver_id

### US-3.2.5: As a platform user, I view proposals in the playground.
**Acceptance Criteria:**
- [ ] ProposalViewer shows: selected tool, confidence badge (color-coded), reasoning text
- [ ] Proposed inputs displayed with labels from tool contract
- [ ] Alternatives listed with scores and reasons
- [ ] Policy verdict displayed with color: green=APPROVED, yellow=NEEDS_APPROVAL, red=REJECTED, orange=ESCALATE

---

## Section 3: Technical Design

### 3.2.1 ProposalGenerator

**File:** `internal/service/runtime.go` (ProposalGenerator struct)

```
PROPOSAL GENERATION FLOW:

  Input: AgentContext (goal, inputs, memories, board_context)
         []ScoredTool (ranked from Sprint 3.1)
         ScoringConfig

  IF mode == "deterministic":
    selected = scoredTools[0]  // highest algorithmic score
    inputs = matchInputsFromContext(selected.Contract, agentCtx)
    confidence = selected.AlgorithmicScore
    reasoning = fmt.Sprintf("Selected %s with score %.3f (deterministic)", selected.ToolRef, confidence)
    alternatives = scoredTools[1:min(3, len(scoredTools))]

  IF mode == "llm_augmented":
    PROMPT TO LLM:
      "You have these scored tools: <top 5 from scoredTools>
       Goal: <goal>
       Context: <input data summary>
       Relevant memories: <injected memories>
       
       Select the best tool and propose specific input values.
       Return JSON:
       {
         'selected_tool': '<tool_ref>',
         'confidence': <0.0-1.0>,
         'reasoning': '<why this tool, why these inputs>',
         'proposed_inputs': { '<param>': <value>, ... },
         'alternatives': [ { 'tool': '<ref>', 'score': <score>, 'reason': '<why not selected>' } ]
       }"
    
    Parse LLM response
    Validate: selected_tool in scoredTools, confidence in [0,1], inputs match contract schema
    If invalid: fall back to deterministic generation

  Output: ActionProposal {
    selected_tool:    string
    confidence:       float64
    reasoning:        string
    proposed_inputs:  map[string]interface{}
    alternatives:     []Alternative
    estimated_cost:   float64
    mode:             "deterministic" | "llm_augmented"
  }
```

### 3.2.2 PolicyEnforcer -- 4 Verdicts

**File:** `internal/service/runtime.go` (PolicyEnforcer struct)

```
POLICY EVALUATION (strict order):

  func (pe *PolicyEnforcer) Evaluate(proposal ActionProposal, agentCtx AgentContext) PolicyVerdict {

    // STEP 0: Compute effective thresholds (board mode override)
    effectiveThreshold := pe.computeEffectiveThreshold(agentCtx)
    effectiveApprovalList := pe.computeEffectiveApprovalList(agentCtx)

    // STEP 1: REJECT rules (hard stops, checked first)
    if proposal.Confidence < 0.5 {
      return PolicyVerdict{
        Verdict: "REJECTED",
        Reason:  fmt.Sprintf("Confidence %.2f below rejection threshold 0.5", proposal.Confidence),
      }
    }
    if agentCtx.CostSoFar + proposal.EstimatedCost > agentCtx.Constraints.MaxCostUSD {
      return PolicyVerdict{
        Verdict: "REJECTED",
        Reason:  "Budget exhausted",
      }
    }
    if agentCtx.CurrentIteration > agentCtx.Constraints.MaxIterations {
      return PolicyVerdict{
        Verdict: "REJECTED",
        Reason:  "Max iterations exceeded",
      }
    }

    // STEP 2: ESCALATE rules (custom escalation conditions)
    for _, rule := range agentCtx.DecisionPolicy.EscalationRules {
      if rule.Action == "escalate" && pe.evaluateCondition(rule.Condition, proposal, agentCtx) {
        return PolicyVerdict{
          Verdict: "ESCALATE",
          Reason:  rule.Reason,
          Target:  rule.Target,
        }
      }
    }

    // STEP 3: APPROVAL requirements (permission-based)
    toolPermission := agentCtx.ToolPermissions[proposal.SelectedTool]
    for _, perm := range toolPermission.Permissions {
      if contains(effectiveApprovalList, perm) {
        return PolicyVerdict{
          Verdict: "NEEDS_APPROVAL",
          Reason:  fmt.Sprintf("Tool requires '%s' permission which needs approval", perm),
        }
      }
    }

    // STEP 4: AUTO-APPROVE threshold
    if proposal.Confidence >= effectiveThreshold {
      return PolicyVerdict{
        Verdict: "APPROVED",
        Reason:  fmt.Sprintf("Confidence %.2f meets threshold %.2f", proposal.Confidence, effectiveThreshold),
      }
    }

    // STEP 5: DEFAULT -- between reject and approve thresholds
    return PolicyVerdict{
      Verdict: "NEEDS_APPROVAL",
      Reason:  fmt.Sprintf("Confidence %.2f below auto-approve threshold %.2f", proposal.Confidence, effectiveThreshold),
    }
  }
```

### 3.2.3 Board Mode Override

```
BOARD MODE THRESHOLDS:
  Explore  = 0.50  (most permissive, experimentation)
  Study    = 0.75  (tighter, analysis)
  Release  = 0.90  (strictest, production/certification)

BOARD MODE ADDITIONAL APPROVALS:
  Explore  = []                                       // no additional
  Study    = ["high_risk"]                            // high-risk ops need approval
  Release  = ["medium_risk", "side_effects"]          // more ops need approval

EFFECTIVE THRESHOLD COMPUTATION:
  func computeEffectiveThreshold(agentCtx) float64 {
    agentThreshold := agentCtx.DecisionPolicy.AutoApproveThreshold  // e.g., 0.85
    
    if agentCtx.BoardContext == nil {
      return agentThreshold  // no board context, use agent's own threshold
    }
    
    boardThreshold := boardModeThresholds[agentCtx.BoardContext.Mode]
    // Explore=0.50, Study=0.75, Release=0.90
    
    return max(agentThreshold, boardThreshold)
    // NEVER loosens: if agent=0.90 and board=Explore(0.50), result=0.90
    // CAN tighten:   if agent=0.60 and board=Release(0.90), result=0.90
  }

EFFECTIVE APPROVAL LIST COMPUTATION:
  func computeEffectiveApprovalList(agentCtx) []string {
    agentList := agentCtx.DecisionPolicy.RequireApprovalFor  // e.g., ["write", "delete"]
    
    if agentCtx.BoardContext == nil {
      return agentList
    }
    
    boardList := boardModeApprovals[agentCtx.BoardContext.Mode]
    // Study=["high_risk"], Release=["medium_risk","side_effects"]
    
    return union(agentList, boardList)
    // Additive: board can add requirements, never remove agent's existing requirements
  }
```

### 3.2.4 Approval Queue Flow

**File:** `internal/service/approval.go`

```
APPROVAL QUEUE STATE MACHINE:

  +----------+    user approves    +-----------+
  | PENDING  | -----------------> | APPROVED  |
  +----+-----+                    +-----+-----+
       |                                |
       |    user rejects          agent resumes
       |                                |
       +----v-----+              +------v------+
       | REJECTED |              | EXECUTING   |
       +----------+              +-------------+

APPROVAL CREATION (when PolicyEnforcer returns NEEDS_APPROVAL):
  approval = ApprovalService.Create({
    entity_type:   "agent_proposal",
    entity_id:     proposal.ID,
    agent_id:      agent.ID,
    run_id:        run.ID,
    request_data:  {
      tool_ref:       proposal.SelectedTool,
      confidence:     proposal.Confidence,
      reasoning:      proposal.Reasoning,
      proposed_inputs: proposal.ProposedInputs,
      estimated_cost: proposal.EstimatedCost,
    },
    status:        "pending",
    requested_at:  now(),
    requested_by:  "agent:" + agent.Name,
  })

APPROVAL RESOLUTION:
  POST /v0/approvals/{id}/approve
    -> ApprovalService.Approve(id, approverID)
    -> Update approval.status = "approved"
    -> Notify agent runtime to resume execution
    -> Agent continues: dispatch tool, collect results

  POST /v0/approvals/{id}/reject
    -> ApprovalService.Reject(id, approverID, reason)
    -> Update approval.status = "rejected"
    -> Notify agent runtime of rejection
    -> Agent triggers replanning (or stops if no alternatives)

AGENT WAITING BEHAVIOR:
  When NEEDS_APPROVAL:
    1. Create approval record
    2. Set run status to AWAITING_APPROVAL
    3. Block agent loop (poll approval status every 5s with 1h max wait)
    4. On approval: resume execution
    5. On rejection: call ProposalGenerator.GenerateWithFailureContext()
    6. On timeout (1h): auto-reject with reason "Approval timeout"
```

---

## Section 4: API Contracts

```
POST /v0/agents/{id}/versions/{v}/run
  Description: Run an agent version (triggers full 13-step pipeline)
  Body:
    {
      "context": { "geometry": "art_cad_001", "material": "Al6061-T6", ... },
      "board_id": "board_abc" (optional, for board mode override)
    }
  Response 201:
    {
      "run_id": "run_xyz",
      "status": "RUNNING",
      "scoring_mode": "hybrid"
    }

GET /v0/approvals
  Description: List pending approvals
  Query params:
    status: pending | approved | rejected (default: pending)
    agent_id: filter by agent (optional)
    limit: int (default 20)
    offset: int (default 0)
  Response 200:
    {
      "approvals": [
        {
          "id": "appr_001",
          "entity_type": "agent_proposal",
          "agent_id": "agent_abc",
          "agent_name": "FEA Optimizer",
          "run_id": "run_xyz",
          "status": "pending",
          "request_data": {
            "tool_ref": "mesh-generator@1",
            "confidence": 0.72,
            "reasoning": "Mesh generation needed but confidence below threshold",
            "proposed_inputs": { "geometry": "art_cad_001", "density": 0.8 },
            "estimated_cost": 0.30
          },
          "requested_at": "2026-04-29T10:30:00Z",
          "requested_by": "agent:fea-optimizer"
        }
      ],
      "total": 1
    }

POST /v0/approvals/{id}/approve
  Body:
    { "comment": "Looks good, proceed" (optional) }
  Response 200:
    { "id": "appr_001", "status": "approved", "resolved_at": "...", "resolved_by": "user:jdoe" }

POST /v0/approvals/{id}/reject
  Body:
    { "reason": "Cost too high for this experiment" }
  Response 200:
    { "id": "appr_001", "status": "rejected", "resolved_at": "...", "resolved_by": "user:jdoe" }
```

---

## Section 5: Data Models & Schema

### ActionProposal (in-memory model)

```go
type ActionProposal struct {
    ID              string                 `json:"id"`
    SelectedTool    string                 `json:"selected_tool"`
    Confidence      float64                `json:"confidence"`
    Reasoning       string                 `json:"reasoning"`
    ProposedInputs  map[string]interface{} `json:"proposed_inputs"`
    EstimatedCost   float64                `json:"estimated_cost"`
    Alternatives    []Alternative          `json:"alternatives"`
    Mode            string                 `json:"mode"`  // "deterministic" | "llm_augmented"
}

type Alternative struct {
    ToolRef  string  `json:"tool_ref"`
    Score    float64 `json:"score"`
    Reason   string  `json:"reason"`
}

type PolicyVerdict struct {
    Verdict  string  `json:"verdict"`   // APPROVED | NEEDS_APPROVAL | REJECTED | ESCALATE
    Reason   string  `json:"reason"`
    Target   string  `json:"target,omitempty"`  // for ESCALATE
}
```

### Approval (persisted)

```go
type Approval struct {
    ID           string          `json:"id" db:"id"`
    EntityType   string          `json:"entity_type" db:"entity_type"`
    EntityID     string          `json:"entity_id" db:"entity_id"`
    AgentID      string          `json:"agent_id" db:"agent_id"`
    RunID        string          `json:"run_id" db:"run_id"`
    Status       string          `json:"status" db:"status"`       // pending, approved, rejected
    RequestData  json.RawMessage `json:"request_data" db:"request_data"`
    RequestedAt  time.Time       `json:"requested_at" db:"requested_at"`
    RequestedBy  string          `json:"requested_by" db:"requested_by"`
    ResolvedAt   *time.Time      `json:"resolved_at,omitempty" db:"resolved_at"`
    ResolvedBy   *string         `json:"resolved_by,omitempty" db:"resolved_by"`
    Comment      *string         `json:"comment,omitempty" db:"comment"`
}
```

---

## Section 6: Frontend Tasks

### 6.1 ProposalViewer in Playground

**File:** `frontend/src/components/agents/execution/ProposalViewer.tsx`
**What exists:** ProposalViewer component exists with placeholder data.
**What to build:**

```
PROPOSAL VIEWER (in playground right panel):
  +---------------------------------------------------+
  | Proposal #1                                        |
  |                                                     |
  | Tool: mesh-generator@1                              |
  | Confidence: [========] 0.92  (green badge)          |
  |                                                     |
  | Reasoning:                                          |
  | "Mesh generation is the necessary first step.       |
  |  Using density 0.8 based on memory of optimal       |
  |  density for Al6061 plates."                        |
  |                                                     |
  | Proposed Inputs:                                    |
  | +-------------------+-------------------+           |
  | | geometry          | art_cad_001       |           |
  | | density           | 0.8               |           |
  | | element_type      | hex8              |           |
  | +-------------------+-------------------+           |
  |                                                     |
  | Policy Verdict: APPROVED (green)                    |
  |                                                     |
  | Alternatives:                                       |
  | - fea-solver@2 (0.494): Needs mesh input first      |
  | - result-analyzer@1 (0.201): No FEA results yet     |
  +---------------------------------------------------+

DATA SOURCE: 
  GET /v0/runs/{id} includes proposal data in run.decision_trace
  OR subscribe to SSE airaie.events.{runId} for real-time updates

CONFIDENCE BADGE COLORS:
  >= 0.85: green
  >= 0.50: yellow
  < 0.50:  red

VERDICT COLORS:
  APPROVED:       green badge
  NEEDS_APPROVAL: yellow badge with "Awaiting Approval" text
  REJECTED:       red badge
  ESCALATE:       orange badge with escalation target name
```

### 6.2 Approvals Page

**File:** `frontend/src/pages/ApprovalsPage.tsx` (create if not exists; route: /approvals)
**What exists:** Page exists in the routing.
**What to build:**

```
APPROVALS PAGE:
  +---------------------------------------------------+
  | Approvals                              [Refresh]   |
  |                                                     |
  | Filter: [All v] [Pending] [Approved] [Rejected]    |
  |                                                     |
  | +------------------------------------------------+ |
  | | PENDING  FEA Optimizer -> mesh-generator@1      | |
  | | Confidence: 0.72   Cost: $0.30                  | |
  | | "Mesh generation needed but confidence below    | |
  | |  auto-approve threshold of 0.85"                | |
  | | Requested: 2 min ago by agent:fea-optimizer     | |
  | |                                                  | |
  | | [Approve]  [Reject]  [View Details]              | |
  | +------------------------------------------------+ |
  |                                                     |
  | +------------------------------------------------+ |
  | | APPROVED  Validation Agent -> fea-solver@2      | |
  | | Confidence: 0.78   Cost: $0.50                  | |
  | | Approved by jdoe 15 min ago                     | |
  | +------------------------------------------------+ |
  +---------------------------------------------------+

API CALLS:
  Load: GET /v0/approvals?status=pending&limit=20
  Approve: POST /v0/approvals/{id}/approve
  Reject: POST /v0/approvals/{id}/reject { reason: "..." }
  Poll: refresh every 10s for new pending approvals

INTERACTIONS:
  - Approve button -> confirmation dialog -> POST approve -> remove from pending
  - Reject button -> reason textarea dialog -> POST reject -> remove from pending
  - View Details -> expandable panel showing full proposal, scoring, alternatives
```

---

## Section 7: State Machines & Lifecycle

### Proposal-to-Execution State Machine

```
                +------------------+
                |   SCORED         |  (tools ranked from Sprint 3.1)
                +--------+---------+
                         |
                +--------v---------+
                |   PROPOSING      |  (LLM generates ActionProposal)
                +--------+---------+
                         |
                +--------v---------+
                |   EVALUATING     |  (PolicyEnforcer checks 4 verdicts)
                +--------+---------+
                         |
         +---------------+----------------+----------------+
         |               |                |                |
  +------v------+ +------v-------+ +------v------+ +------v-------+
  |  APPROVED   | | NEEDS_APPROVE| |  REJECTED   | |  ESCALATED   |
  +------+------+ +------+-------+ +------+------+ +------+-------+
         |               |                |                |
         |        +------v-------+        |         +------v-------+
         |        | AWAITING     |        |         | ROUTED TO    |
         |        | (in queue)   |        |         | TARGET       |
         |        +------+-------+        |         +--------------+
         |               |                |
         |        approve/reject          |
         |          |         |            |
         |     +----v---+ +--v--------+   |
         |     |APPROVED| |REJECTED   |   |
         |     +----+---+ +--+--------+   |
         |          |         |            |
  +------v----------v----+   |            |
  |    DISPATCHING       |   |            |
  +------+---------------+   |            |
         |                   |            |
  +------v---------------+   |            |
  |    EXECUTING TOOL    |   |            |
  +------+---------------+   |            |
         |                   |            |
  +------v---------------+   |            |
  |    EVALUATING RESULT |   |            |
  +----------------------+   |            |
                             |            |
  (replanning if rejected) <-+            |
  (agent stops if rejected with no alternatives)
```

### Run Status During Proposal Flow

```
Run.Status transitions during policy evaluation:
  RUNNING           -> agent is scoring/proposing
  AWAITING_APPROVAL -> NEEDS_APPROVAL verdict, waiting for human
  RUNNING           -> approval granted, executing tool
  FAILED            -> REJECTED verdict with no alternatives
```

---

## Section 8: Test Scenarios

### T-3.2.1: Proposal generation in LLM mode
```
GIVEN: Agent with llm_weight=0.7, goal="Run FEA simulation"
AND: Scored tools: mesh-gen(0.945), fea-solver(0.494), result-analyzer(0.201)
AND: LLM provider configured and responsive

WHEN: ProposalGenerator.Generate(agentCtx, scoredTools)

THEN:
  - Proposal.SelectedTool = "mesh-generator@1"
  - Proposal.Confidence in [0.0, 1.0]
  - Proposal.Reasoning is non-empty string
  - Proposal.ProposedInputs contains all required inputs from tool contract
  - Proposal.Alternatives contains at least fea-solver@2
  - Proposal.Mode = "llm_augmented"
```

### T-3.2.2: All 4 policy verdicts
```
TEST APPROVED:
  GIVEN: proposal.Confidence=0.92, threshold=0.85, budget OK, no escalation rules
  THEN: verdict = APPROVED

TEST NEEDS_APPROVAL (confidence below threshold):
  GIVEN: proposal.Confidence=0.72, threshold=0.85, budget OK
  THEN: verdict = NEEDS_APPROVAL, reason mentions threshold

TEST NEEDS_APPROVAL (permission requires approval):
  GIVEN: proposal.Confidence=0.95, tool permission="write", require_approval_for=["write"]
  THEN: verdict = NEEDS_APPROVAL, reason mentions "write" permission

TEST REJECTED (confidence too low):
  GIVEN: proposal.Confidence=0.35
  THEN: verdict = REJECTED, reason mentions "below rejection threshold 0.5"

TEST REJECTED (budget exhausted):
  GIVEN: cost_so_far=$9.80, estimated_cost=$0.50, max_cost=$10.00
  THEN: verdict = REJECTED, reason = "Budget exhausted"

TEST ESCALATE:
  GIVEN: escalation_rule={condition: "cost > 5.00", action: "escalate", target: "project_lead"}
  AND: proposal.EstimatedCost=$6.00
  THEN: verdict = ESCALATE, target = "project_lead"
```

### T-3.2.3: Board mode override -- never loosens
```
TEST: Agent=0.85, Board=Explore(0.50) -> effective=0.85 (kept agent's stricter)
TEST: Agent=0.60, Board=Study(0.75)   -> effective=0.75 (board tightened)
TEST: Agent=0.60, Board=Release(0.90) -> effective=0.90 (board tightened further)
TEST: Agent=0.95, Board=Release(0.90) -> effective=0.95 (kept agent's stricter)
TEST: No board context               -> effective=agent_threshold
```

### T-3.2.4: Board mode adds approval requirements
```
TEST: Agent=["write"], Board=Study     -> effective=["write", "high_risk"]
TEST: Agent=["write"], Board=Release   -> effective=["write", "medium_risk", "side_effects"]
TEST: Agent=["write"], Board=Explore   -> effective=["write"]
TEST: Agent=[], Board=Release          -> effective=["medium_risk", "side_effects"]
```

### T-3.2.5: Approval queue end-to-end
```
GIVEN: Agent runs, proposal confidence=0.72, threshold=0.85
WHEN: PolicyEnforcer returns NEEDS_APPROVAL
THEN:
  1. Approval record created in DB with status="pending"
  2. Run status = AWAITING_APPROVAL
  3. GET /v0/approvals returns the pending approval
  4. POST /v0/approvals/{id}/approve
  5. Approval status = "approved"
  6. Run status = RUNNING (resumed)
  7. Agent continues execution with the approved proposal
```

### T-3.2.6: Approval rejection triggers replanning
```
GIVEN: Pending approval for mesh-generator@1
WHEN: POST /v0/approvals/{id}/reject { reason: "Try cheaper alternative" }
THEN:
  1. Approval status = "rejected"
  2. Agent receives rejection notification
  3. ProposalGenerator.GenerateWithFailureContext called
  4. mesh-generator@1 excluded from candidates
  5. New proposal generated with remaining tools
  6. New policy evaluation on new proposal
```

---

## Section 9: Dependencies & Risks

### Dependencies
| Dependency | Status | Mitigation |
|-----------|--------|------------|
| Sprint 3.1 scoring | Required | Proposals depend on scored tool list |
| LLM provider (Phase 0 B4) | Required | Deterministic mode fallback |
| Board service (existing) | Required for board mode | Test with mock board context first |
| Approval service (existing) | Required | Verify CRUD operations work |

### Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM proposes invalid inputs | High | Medium | Validate inputs against ToolContract schema before dispatch |
| Approval timeout blocks agent indefinitely | Medium | Low | 1h max wait; auto-reject on timeout |
| Board mode not available at agent runtime | Low | Low | Graceful degradation: use agent-only threshold |

---

## Section 10: NATS Subjects & Events

```
EXISTING SUBJECTS:
  airaie.jobs.agent.execution   -- dispatch after approval
  airaie.results.completed      -- tool result consumed
  airaie.events.{runId}         -- SSE events to playground

NEW EVENTS ON airaie.events.{runId}:
  { "type": "proposal_generated", "data": { "tool": "mesh-gen@1", "confidence": 0.92 } }
  { "type": "policy_verdict", "data": { "verdict": "APPROVED" } }
  { "type": "awaiting_approval", "data": { "approval_id": "appr_001" } }
  { "type": "approval_resolved", "data": { "verdict": "approved" } }
```

---

## Section 11: Migration & Data Requirements

```
NO NEW MIGRATIONS for Sprint 3.2.

Existing tables used:
  - approvals: CRUD for approval queue (verify entity_type supports "agent_proposal")
  - runs: status field supports AWAITING_APPROVAL
  - agents, agent_versions: decision_policy and constraints configuration
  - boards: board mode (explore/study/release) for override computation

Verify:
  - approvals table has request_data JSONB column
  - runs.status enum includes "awaiting_approval"
  - boards.mode column populated correctly
```

---

## Section 12: Definition of Done

- [ ] ProposalGenerator produces valid ActionProposal with all fields
- [ ] PolicyEnforcer returns correct verdict for all 4 paths
- [ ] Board mode override tightens thresholds (never loosens) -- verified by parameterized tests
- [ ] Approval queue creates records for NEEDS_APPROVAL verdicts
- [ ] Approving a proposal resumes agent execution
- [ ] Rejecting a proposal triggers replanning
- [ ] ProposalViewer in playground displays real data
- [ ] ApprovalsPage lists pending proposals with approve/reject actions
- [ ] SSE events published for proposal and policy verdict
- [ ] Policy evaluation order is REJECT -> ESCALATE -> APPROVAL -> AUTO_APPROVE -> CONSTRAINTS -> DEFAULT

---
---

# SPRINT 3.3: Agent Memory (pgvector)

**Duration:** 3 days
**Goal:** Implement dual-layer memory system with pgvector embedding-based retrieval, episodic TTL, semantic persistence, 4 memory categories, and auto-learning from runs.
**Depends on:** Sprint 3.2 (agent can execute tools; memory learns from execution results).

---

## Section 1: Objectives & Success Metrics

### Sprint Objectives
1. Verify pgvector setup: vector(1536) column, IVFFlat index, cosine similarity search.
2. Implement episodic memory with TTL and automatic cleanup.
3. Implement semantic memory extraction from repeated episodic patterns.
4. Verify all 4 memory categories: fact, preference, lesson, error_pattern.
5. Wire memory retrieval injection into agent LLM prompts.
6. Implement auto-learning from run outcomes.

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| pgvector indexing | Cosine similarity returns correct top-k | Test with known embeddings |
| Episodic TTL | Expired memories cleaned within 10 minutes | Integration test with short TTL |
| Semantic extraction | Semantic created after 3+ similar episodic | Integration test with repeated patterns |
| Memory retrieval latency | < 50ms for top-5 from 10,000 memories | Benchmark with IVFFlat index |
| Auto-learning | Memory created for every completed run | Integration test verifying memory count |

---

## Section 2: User Stories & Acceptance Criteria

### US-3.3.1: As a system, I store agent memories as vector embeddings in pgvector.
**Acceptance Criteria:**
- [ ] agent_memories table has `embedding vector(1536)` column
- [ ] IVFFlat index created: `CREATE INDEX ON agent_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- [ ] Embedding generation via LLM provider (OpenAI text-embedding-3-small or equivalent)
- [ ] Cosine similarity search: `ORDER BY embedding <=> $query_vector LIMIT $k`
- [ ] If embedding generation fails, memory stored with NULL embedding (text-only, not retrievable by similarity)

### US-3.3.2: As an agent, my episodic memories expire after their TTL.
**Acceptance Criteria:**
- [ ] Episodic memories have `expires_at` set to `now() + interval '30 days'` (configurable per agent)
- [ ] Background cleanup goroutine runs every 5 minutes
- [ ] Cleanup query: `DELETE FROM agent_memories WHERE expires_at IS NOT NULL AND expires_at < now()`
- [ ] Episodic memories created automatically after each tool execution
- [ ] Expired memories no longer returned by similarity search

### US-3.3.3: As an agent, semantic memories are extracted from repeated patterns.
**Acceptance Criteria:**
- [ ] After each episodic memory creation, check for pattern: 3+ episodic memories with cosine similarity > 0.85
- [ ] If pattern found: extract generalized semantic memory
- [ ] Semantic memories have `expires_at = NULL` (persist indefinitely)
- [ ] Semantic memories get higher relevance weighting in retrieval (1.5x boost)
- [ ] Semantic extraction prompt to LLM: "Given these similar experiences: <episodic list>. Extract a generalized lesson."

### US-3.3.4: As an agent, my memories are categorized into 4 types.
**Acceptance Criteria:**
- [ ] `fact`: Concrete knowledge (e.g., "Al6061 optimal mesh density is 0.8")
- [ ] `preference`: User or domain preferences (e.g., "User prefers hex8 over tet4")
- [ ] `lesson`: Learned from successes (e.g., "mesh-gen before fea-solver works better")
- [ ] `error_pattern`: Learned from failures (e.g., "density 0.6 causes divergence for thin walls")
- [ ] Category assigned by LLM during memory creation
- [ ] Category stored in `category` column and filterable in queries

### US-3.3.5: As an agent, relevant memories are injected into my LLM prompt before each decision.
**Acceptance Criteria:**
- [ ] Before each decision step: embed current context (goal + input summary)
- [ ] Query: top-k memories by cosine similarity (default k=5)
- [ ] Filter: `agent_id = $1 AND (expires_at IS NULL OR expires_at > now())`
- [ ] Board-scoped memories (if board_id present in context) get 1.3x relevance boost
- [ ] Semantic memories get 1.5x relevance boost over episodic
- [ ] Retrieved memories injected into LLM prompt under "Relevant Memories" section

### US-3.3.6: As an agent, I automatically learn from completed runs.
**Acceptance Criteria:**
- [ ] On success: create `fact` or `lesson` episodic memory with run summary
- [ ] On failure: create `error_pattern` episodic memory with failure details
- [ ] On retry (success after failure): create `lesson` episodic memory
- [ ] Auto-learning is async with panic recovery (must not crash agent runtime)
- [ ] Memory includes `source_run_id` in context JSONB for traceability

### US-3.3.7: As a platform user, I browse and manage agent memories.
**Acceptance Criteria:**
- [ ] MemoryPage lists all memories for an agent
- [ ] Filter by: memory_type (episodic/semantic), category (fact/preference/lesson/error_pattern)
- [ ] Search memories by text (full-text or similarity search)
- [ ] Manually add memories (semantic facts, preferences)
- [ ] Delete individual memories
- [ ] Show source_run_id link for auto-created memories

---

## Section 3: Technical Design

### 3.3.1 pgvector Setup & Schema

```sql
-- Verify extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table (should already exist from migrations)
CREATE TABLE IF NOT EXISTS agent_memories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    memory_type   VARCHAR(20) NOT NULL CHECK (memory_type IN ('episodic', 'semantic')),
    category      VARCHAR(20) NOT NULL CHECK (category IN ('fact', 'preference', 'lesson', 'error_pattern')),
    content       TEXT NOT NULL,
    embedding     vector(1536),
    context       JSONB DEFAULT '{}',
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    created_by    VARCHAR(50) NOT NULL DEFAULT 'agent'
);

-- IVFFlat index for approximate nearest neighbor
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding
  ON agent_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- B-tree indexes for filtering
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id ON agent_memories (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_expires_at ON agent_memories (expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_memories_type_cat ON agent_memories (agent_id, memory_type, category);
```

### 3.3.2 Memory Retrieval Query

```sql
-- Top-k similarity search with TTL filter and relevance boosting
SELECT
    id,
    memory_type,
    category,
    content,
    context,
    created_at,
    created_by,
    -- Cosine distance (lower = more similar)
    (embedding <=> $1::vector) AS distance,
    -- Relevance score (higher = more relevant)
    CASE
        WHEN memory_type = 'semantic' THEN (1.0 - (embedding <=> $1::vector)) * 1.5
        ELSE (1.0 - (embedding <=> $1::vector))
    END AS relevance_score
FROM agent_memories
WHERE agent_id = $2
  AND (expires_at IS NULL OR expires_at > now())
  AND embedding IS NOT NULL
ORDER BY relevance_score DESC
LIMIT $3;  -- k (default 5)
```

### 3.3.3 Embedding Generation

```
EMBEDDING PIPELINE:

  func (ms *MemoryService) generateEmbedding(ctx, text string) ([]float32, error) {
    // Use configured embedding provider
    // Primary: OpenAI text-embedding-3-small (1536 dimensions)
    // Fallback: Anthropic embed if available
    
    resp, err := ms.embeddingClient.Embed(ctx, EmbedRequest{
      Input: text,
      Model: "text-embedding-3-small",
    })
    if err != nil {
      log.Warn("Embedding generation failed", "error", err)
      return nil, err  // memory stored without embedding
    }
    
    return resp.Embedding, nil  // []float32 of length 1536
  }

EMBEDDING INPUT FORMAT:
  For memory content: embed the content text directly
  For retrieval query: embed "goal: <goal> | context: <key input summary>"
  
  Example query embedding input:
    "goal: Determine optimal mesh density for FEA | context: material=Al6061-T6, geometry=bracket 160x80x5mm"
```

### 3.3.4 Episodic Memory Lifecycle

```
AUTO-CREATION (after each tool execution in agent loop):

  func (ms *MemoryService) LearnFromRun(ctx, agentID, run Run) {
    defer func() {
      if r := recover(); r != nil {
        log.Error("panic in LearnFromRun", "panic", r)
      }
    }()

    var content string
    var category string

    switch {
    case run.Status == "succeeded":
      category = "lesson"
      content = fmt.Sprintf(
        "%s with %s produced: %s (cost: $%.2f, duration: %.1fs)",
        run.ToolRef, summarizeInputs(run.Inputs),
        summarizeOutputs(run.Outputs), run.CostActual, run.DurationSec,
      )
    case run.Status == "failed":
      category = "error_pattern"
      content = fmt.Sprintf(
        "%s failed with %s: %s",
        run.ToolRef, summarizeInputs(run.Inputs), run.ErrorMessage,
      )
    case run.Status == "succeeded" && run.RetryCount > 0:
      category = "lesson"
      content = fmt.Sprintf(
        "%s succeeded after %d retries: %s -> %s",
        run.ToolRef, run.RetryCount, run.PreviousError, summarizeOutputs(run.Outputs),
      )
    }

    embedding, _ := ms.generateEmbedding(ctx, content)

    ms.store.Create(ctx, &AgentMemory{
      AgentID:    agentID,
      MemoryType: "episodic",
      Category:   category,
      Content:    content,
      Embedding:  embedding,
      Context:    json.RawMessage(fmt.Sprintf(`{"source_run_id":"%s","tool_ref":"%s"}`, run.ID, run.ToolRef)),
      ExpiresAt:  timePtr(time.Now().Add(30 * 24 * time.Hour)),  // 30-day TTL
      CreatedBy:  "agent",
    })

    // Check for semantic extraction opportunity
    ms.checkSemanticExtraction(ctx, agentID, content, embedding)
  }
```

### 3.3.5 Semantic Memory Extraction

```
EXTRACTION LOGIC:

  func (ms *MemoryService) checkSemanticExtraction(ctx, agentID string, content string, embedding []float32) {
    if embedding == nil {
      return  // cannot check similarity without embedding
    }

    // Find similar episodic memories
    similar, err := ms.store.FindSimilar(ctx, agentID, embedding, 10)  // top 10
    if err != nil {
      return
    }

    // Count episodic memories with cosine similarity > 0.85
    episodicCount := 0
    var episodicContents []string
    for _, mem := range similar {
      if mem.MemoryType == "episodic" && mem.RelevanceScore > 0.85 {
        episodicCount++
        episodicContents = append(episodicContents, mem.Content)
      }
    }

    if episodicCount < 3 {
      return  // not enough pattern evidence
    }

    // Ask LLM to extract generalized lesson
    prompt := fmt.Sprintf(
      "Given these %d similar experiences:\n%s\n\nExtract a single generalized lesson or fact. "+
      "Respond with JSON: { 'content': '<generalized statement>', 'category': 'fact|preference|lesson|error_pattern' }",
      episodicCount, strings.Join(episodicContents, "\n- "),
    )

    resp, err := ms.llm.Generate(ctx, prompt)
    if err != nil {
      return
    }

    // Parse and create semantic memory
    semanticEmbedding, _ := ms.generateEmbedding(ctx, resp.Content)
    ms.store.Create(ctx, &AgentMemory{
      AgentID:    agentID,
      MemoryType: "semantic",
      Category:   resp.Category,
      Content:    resp.Content,
      Embedding:  semanticEmbedding,
      Context:    json.RawMessage(fmt.Sprintf(`{"extracted_from":%d,"source_memories":[...]}`, episodicCount)),
      ExpiresAt:  nil,  // semantic = persistent, no TTL
      CreatedBy:  "agent",
    })
  }
```

### 3.3.6 Memory Retrieval Injection

```
INJECTION INTO AGENT CONTEXT (in runtime.go, Step 2: Assemble Context):

  func (rt *AgentRuntime) assembleContext(ctx, agent, inputs, boardCtx) AgentContext {
    // ... existing context assembly ...

    // Retrieve relevant memories
    queryText := fmt.Sprintf("goal: %s | context: %s", agent.Goal, summarizeInputs(inputs))
    queryEmbedding, err := rt.memory.GenerateEmbedding(ctx, queryText)
    
    var memories []AgentMemory
    if err == nil && queryEmbedding != nil {
      memories, _ = rt.memory.RetrieveRelevant(ctx, agent.ID, queryEmbedding, 5)
    }

    // Inject into LLM prompt context
    agentCtx.RelevantMemories = make([]MemoryEntry, len(memories))
    for i, mem := range memories {
      agentCtx.RelevantMemories[i] = MemoryEntry{
        Category:  mem.Category,
        Content:   mem.Content,
        Type:      mem.MemoryType,
        Relevance: mem.RelevanceScore,
      }
    }

    return agentCtx
  }

LLM PROMPT TEMPLATE (memory section):
  "Relevant Memories (from past experience):
   1. [fact] Al6061 optimal mesh density is 0.8 for plates (relevance: 0.92)
   2. [lesson] mesh-gen before fea-solver produces better results (relevance: 0.88)
   3. [error_pattern] density 0.6 causes divergence for thin walls <3mm (relevance: 0.81)"
```

### 3.3.7 Background Cleanup

```
CLEANUP GOROUTINE:

  func (ms *MemoryService) StartCleanupLoop(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
      select {
      case <-ctx.Done():
        return
      case <-ticker.C:
        deleted, err := ms.store.DeleteExpired(ctx)
        if err != nil {
          log.Error("memory cleanup failed", "error", err)
          continue
        }
        if deleted > 0 {
          log.Info("cleaned up expired memories", "count", deleted)
        }
      }
    }
  }

SQL:
  DELETE FROM agent_memories
  WHERE expires_at IS NOT NULL AND expires_at < now()
  RETURNING id;
```

---

## Section 4: API Contracts

```
GET /v0/agents/{id}/memories
  Description: List agent memories
  Query params:
    memory_type: episodic | semantic (optional)
    category: fact | preference | lesson | error_pattern (optional)
    search: text search string (optional, uses similarity if embedding available)
    limit: int (default 20, max 100)
    offset: int (default 0)
  Response 200:
    {
      "memories": [
        {
          "id": "mem_001",
          "memory_type": "semantic",
          "category": "fact",
          "content": "Al6061 optimal mesh density is 0.8 for plates",
          "context": { "extracted_from": 5, "source_memories": [...] },
          "expires_at": null,
          "created_at": "2026-04-30T10:00:00Z",
          "created_by": "agent"
        },
        {
          "id": "mem_002",
          "memory_type": "episodic",
          "category": "lesson",
          "content": "mesh-gen@1 with density=0.8 for Al6061 bracket produced 45K elements, quality 0.95",
          "context": { "source_run_id": "run_xyz", "tool_ref": "mesh-generator@1" },
          "expires_at": "2026-05-30T10:00:00Z",
          "created_at": "2026-04-30T10:00:00Z",
          "created_by": "agent"
        }
      ],
      "total": 2
    }

POST /v0/agents/{id}/memories
  Description: Manually create a memory
  Body:
    {
      "memory_type": "semantic",
      "category": "fact",
      "content": "ISO 12345 requires safety factor > 1.2"
    }
  Response 201:
    { "id": "mem_003", "memory_type": "semantic", ... }

DELETE /v0/agents/{id}/memories/{memId}
  Description: Delete a specific memory
  Response 204: (no content)

POST /v0/agents/{id}/memories/search
  Description: Semantic similarity search
  Body:
    {
      "query": "optimal mesh density for aluminum plates",
      "limit": 5
    }
  Response 200:
    {
      "results": [
        {
          "memory": { ... },
          "relevance_score": 0.92
        }
      ]
    }
```

---

## Section 5: Data Models & Schema

### AgentMemory (Go model)

```go
type AgentMemory struct {
    ID          string           `json:"id" db:"id"`
    AgentID     string           `json:"agent_id" db:"agent_id"`
    MemoryType  string           `json:"memory_type" db:"memory_type"`    // episodic | semantic
    Category    string           `json:"category" db:"category"`          // fact | preference | lesson | error_pattern
    Content     string           `json:"content" db:"content"`
    Embedding   pgvector.Vector  `json:"-" db:"embedding"`               // vector(1536), not exposed in API
    Context     json.RawMessage  `json:"context" db:"context"`
    ExpiresAt   *time.Time       `json:"expires_at,omitempty" db:"expires_at"`
    CreatedAt   time.Time        `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time        `json:"updated_at" db:"updated_at"`
    CreatedBy   string           `json:"created_by" db:"created_by"`
}

type MemorySearchResult struct {
    Memory         AgentMemory  `json:"memory"`
    RelevanceScore float64      `json:"relevance_score"`
    Distance       float64      `json:"-"`  // raw cosine distance
}
```

### Memory Creation Rules

```
RUN OUTCOME -> MEMORY MAPPING:

  +------------------+-------------------+-------------------+
  | Run Outcome      | Memory Type       | Category          |
  +------------------+-------------------+-------------------+
  | Success          | episodic          | lesson            |
  | Failure          | episodic          | error_pattern     |
  | Retry + Success  | episodic          | lesson            |
  | User adds        | semantic (always) | user-selected     |
  | Pattern (3+)     | semantic          | LLM-determined    |
  +------------------+-------------------+-------------------+
```

---

## Section 6: Frontend Tasks

### 6.1 Memory Browser Page

**File:** `frontend/src/components/agents/memory/MemoryBrowser.tsx` (and `frontend/src/pages/AgentStudioPage.tsx` memory tab)
**What exists:** MemoryBrowser component with placeholder data.
**What to build:**

```
MEMORY BROWSER (inside Agent Studio, Memory tab):
  +---------------------------------------------------+
  | Agent Memory                        [Add Memory]   |
  |                                                     |
  | Type: [All v] [Episodic] [Semantic]                |
  | Category: [All v] [Fact] [Preference] [Lesson] [Error]|
  | Search: [________________________] [Search]         |
  |                                                     |
  | +------------------------------------------------+ |
  | | SEMANTIC | fact                                  | |
  | | "Al6061 optimal mesh density is 0.8 for plates" | |
  | | Created: agent, 2d ago | No expiry              | |
  | | Source: extracted from 5 episodic memories       | |
  | |                                   [Delete]       | |
  | +------------------------------------------------+ |
  |                                                     |
  | +------------------------------------------------+ |
  | | EPISODIC | lesson                                | |
  | | "mesh-gen@1 with density=0.8 for Al6061         | |
  | |  bracket produced 45K elements, quality 0.95"   | |
  | | Created: agent, 1d ago | Expires: in 29d        | |
  | | Source: run_xyz [View Run]                       | |
  | |                                   [Delete]       | |
  | +------------------------------------------------+ |
  |                                                     |
  | +------------------------------------------------+ |
  | | EPISODIC | error_pattern                         | |
  | | "density 0.6 insufficient for thin walls <3mm,  | |
  | |  solver diverged"                                | |
  | | Created: agent, 3d ago | Expires: in 27d        | |
  | | Source: run_abc [View Run]                       | |
  | |                                   [Delete]       | |
  | +------------------------------------------------+ |
  +---------------------------------------------------+

ADD MEMORY MODAL:
  +---------------------------------------------------+
  | Add Memory                                         |
  |                                                     |
  | Type: (o) Semantic  ( ) Episodic                   |
  |                                                     |
  | Category: [Fact v]                                 |
  |                                                     |
  | Content:                                            |
  | [                                                 ] |
  | [  ISO 12345 requires safety factor > 1.2         ] |
  | [                                                 ] |
  |                                                     |
  | TTL (episodic only): [30] days                     |
  |                                                     |
  | [Cancel]  [Create Memory]                          |
  +---------------------------------------------------+

API CALLS:
  Load: GET /v0/agents/{id}/memories?memory_type=&category=&limit=20
  Search: POST /v0/agents/{id}/memories/search
  Create: POST /v0/agents/{id}/memories
  Delete: DELETE /v0/agents/{id}/memories/{memId}

BEHAVIORS:
  - Memory type badge color: blue=semantic, gray=episodic
  - Category badge: green=fact, blue=preference, amber=lesson, red=error_pattern
  - Expiry shows countdown for episodic, "Permanent" for semantic
  - Source run link navigates to run detail page
  - Search uses similarity search (POST /memories/search) not text filter
  - Delete has confirmation dialog
```

---

## Section 7: State Machines & Lifecycle

### Memory Lifecycle State Machine

```
EPISODIC MEMORY:
  +----------+     +--------+     +---------+
  | CREATED  | --> | ACTIVE | --> | EXPIRED |
  +----------+     +--------+     +---------+
       |                |              |
  (auto after run)  (retrievable)  (cleanup deletes)
                        |
                   +----v-----+
                   | PROMOTED |  (if pattern detected, semantic extracted)
                   +----------+

SEMANTIC MEMORY:
  +----------+     +--------+     +---------+
  | CREATED  | --> | ACTIVE | --> | DELETED |
  +----------+     +--------+     +---------+
       |                |              |
  (manual or     (retrievable,    (user deletes)
   extracted)     no expiry)
```

### Memory Retrieval Flow

```
  Agent Decision Step
         |
  +------v------+
  | Embed query |  -- current goal + context -> vector(1536)
  +------+------+
         |
  +------v------+
  | Query top-k |  -- cosine similarity, filter expired
  +------+------+
         |
  +------v------+
  | Apply boost |  -- semantic 1.5x, board-scoped 1.3x
  +------+------+
         |
  +------v------+
  | Re-rank     |  -- sort by boosted relevance
  +------+------+
         |
  +------v------+
  | Inject LLM  |  -- add to prompt as "Relevant Memories"
  +------+------+
         |
  Agent makes decision with memory-informed context
```

---

## Section 8: Test Scenarios

### T-3.3.1: pgvector cosine similarity returns correct results
```
GIVEN: 3 memories with known embeddings:
  mem_A: embedding for "mesh density for aluminum" (cosine to query = 0.05)
  mem_B: embedding for "FEA solver configuration" (cosine to query = 0.30)
  mem_C: embedding for "weekend plans" (cosine to query = 0.90)

AND: Query embedding for "optimal mesh settings for Al6061"

WHEN: SELECT ... ORDER BY embedding <=> query LIMIT 2

THEN:
  Results: [mem_A (distance=0.05), mem_B (distance=0.30)]
  mem_C excluded (furthest distance, beyond limit)
```

### T-3.3.2: Episodic memory expires after TTL
```
GIVEN: Episodic memory created with expires_at = now() + 1 second (test TTL)
AND: Memory is retrievable immediately after creation

WHEN: 2 seconds pass, cleanup goroutine runs

THEN:
  - Memory deleted from database
  - Similarity search no longer returns this memory
  - Cleanup log shows 1 deleted
```

### T-3.3.3: Semantic extraction from 3+ episodic memories
```
GIVEN: Agent has run mesh-gen 4 times with density=0.8 on Al6061, all succeeded
AND: 4 episodic memories exist with similar content (cosine similarity > 0.85)

WHEN: 5th episodic memory created, checkSemanticExtraction triggered

THEN:
  - LLM called with 5 similar episodic contents
  - Semantic memory created: "Al6061 plates work best with mesh density 0.8"
  - Semantic memory has expires_at = NULL
  - Semantic memory has context.extracted_from = 5
```

### T-3.3.4: Memory categories assigned correctly
```
GIVEN: Agent run with mesh-gen succeeded, output: 45K elements, quality 0.95
WHEN: LearnFromRun called
THEN: Memory created with category="lesson"

GIVEN: Agent run with fea-solver failed, error: "solver diverged"
WHEN: LearnFromRun called
THEN: Memory created with category="error_pattern"

GIVEN: User manually creates memory "ISO 12345 requires SF > 1.2"
WHEN: POST /v0/agents/{id}/memories with category="fact"
THEN: Memory created with memory_type="semantic", category="fact"
```

### T-3.3.5: Memory retrieval injection improves decisions
```
GIVEN: Agent has semantic memory: "Al6061 optimal mesh density is 0.8"
AND: Agent goal: "Generate mesh for Al6061 bracket"

WHEN: Agent assembles context (Step 2)

THEN:
  - Query embedding generated from goal + context
  - Memory "Al6061 optimal mesh density is 0.8" retrieved (high similarity)
  - Memory injected into LLM prompt
  - LLM proposes density=0.8 (influenced by memory)
```

### T-3.3.6: Auto-learning with panic recovery
```
GIVEN: Embedding service throws panic during LearnFromRun

WHEN: LearnFromRun called

THEN:
  - Panic recovered, error logged
  - Agent runtime continues normally (not crashed)
  - Run proceeds to next step
```

### T-3.3.7: Semantic memories boosted in retrieval
```
GIVEN: Two memories with identical cosine distance (0.10):
  mem_A: episodic, "mesh density 0.8 worked well for Al6061"
  mem_B: semantic, "Al6061 optimal mesh density is 0.8 for plates"

WHEN: RetrieveRelevant called

THEN:
  mem_B relevance = (1.0 - 0.10) * 1.5 = 1.35
  mem_A relevance = (1.0 - 0.10) * 1.0 = 0.90
  mem_B ranked higher despite same distance
```

---

## Section 9: Dependencies & Risks

### Dependencies
| Dependency | Status | Mitigation |
|-----------|--------|------------|
| pgvector extension in PostgreSQL | Required | Verify in migration; fail fast if missing |
| Embedding provider (OpenAI/Claude) | Required | Store memory without embedding if unavailable |
| Sprint 3.2 (agent executes tools) | Required | Auto-learning needs run outcomes |
| LLM for semantic extraction | Required | Skip extraction if LLM unavailable |

### Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Embedding costs at scale | Medium | Medium | Batch embeddings; cache embeddings for identical text |
| IVFFlat accuracy vs exact search | Low | Low | IVFFlat accuracy is >95% for typical workloads; exact search available for < 1000 memories |
| Semantic extraction produces low-quality generalizations | Medium | Medium | Quality check: verify LLM output is shorter than combined episodic input |
| Memory table grows unbounded | Medium | Low | TTL cleanup for episodic; consider archive for old semantic |

---

## Section 10: NATS Subjects & Events

```
NO NEW NATS SUBJECTS for memory.

Memory operations are synchronous DB operations.
Auto-learning is triggered AFTER run completion (async goroutine, not NATS).

EXISTING SUBJECTS USED:
  airaie.results.completed  -- triggers LearnFromRun after result processing
```

---

## Section 11: Migration & Data Requirements

```
MIGRATION (verify or create):

  -- Migration: 00X_agent_memories_pgvector.sql
  CREATE EXTENSION IF NOT EXISTS vector;
  
  -- Verify table exists with correct schema
  -- If column embedding does not exist:
  ALTER TABLE agent_memories ADD COLUMN IF NOT EXISTS embedding vector(1536);
  
  -- Create IVFFlat index (drop and recreate if exists with wrong config)
  DROP INDEX IF EXISTS idx_agent_memories_embedding;
  CREATE INDEX idx_agent_memories_embedding
    ON agent_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  
  -- Add expires_at if not exists
  ALTER TABLE agent_memories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
  
  -- Index for TTL cleanup
  CREATE INDEX IF NOT EXISTS idx_agent_memories_expires
    ON agent_memories (expires_at)
    WHERE expires_at IS NOT NULL;

NOTE: IVFFlat requires at least (lists * 10) = 1000 rows to be efficient.
For fewer rows, queries will still work but with sequential scan fallback.
Consider starting with lists=10 and rebuilding index as data grows.
```

---

## Section 12: Definition of Done

- [ ] pgvector stores 1536-dimension embeddings correctly
- [ ] Top-k similarity search returns relevant memories (verified with known embeddings)
- [ ] Episodic memories expire after TTL (verified with short TTL test)
- [ ] Semantic memories persist permanently (expires_at = NULL)
- [ ] Semantic extraction triggers after 3+ similar episodic memories
- [ ] All 4 memory categories (fact, preference, lesson, error_pattern) work correctly
- [ ] Memory retrieval injected into LLM prompt before each decision
- [ ] Semantic memories boosted 1.5x in retrieval ranking
- [ ] Auto-learning creates memories after each run (success -> lesson, failure -> error_pattern)
- [ ] Auto-learning has panic recovery (never crashes agent runtime)
- [ ] Background cleanup goroutine deletes expired memories every 5 minutes
- [ ] MemoryPage displays memories with type/category filters and search
- [ ] Manual memory creation works from frontend
- [ ] Memory deletion works from frontend

---
---

# SPRINT 3.4: Multi-Turn Sessions & Replanning

**Duration:** 3 days
**Goal:** Support stateful multi-turn conversations with context accumulation, implement replanning on tool failure, and expose complete decision traces for audit.
**Depends on:** Sprint 3.3 (memory system working; sessions use memory for context persistence).

---

## Section 1: Objectives & Success Metrics

### Sprint Objectives
1. Verify session management: create, send messages, maintain history, context accumulation, TTL expiry.
2. Verify multi-turn context: message N+1 has full context from messages 1..N.
3. Implement replanning on failure: exclude failed tool, regenerate with remaining budget.
4. Wire decision trace endpoint: GET /v0/runs/{id}/trace returns full reasoning chain.

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Session context | Message 3 references output from message 1 | Integration test with 3-message session |
| Session TTL | Session expires after 1h of inactivity | Test with accelerated TTL |
| Replanning success | Agent recovers from tool failure via alternate tool | Integration test with deliberately failing tool |
| Decision trace completeness | Trace includes all 13 pipeline steps | Verify trace structure for a complete run |
| Multi-turn latency | < 500ms overhead per message (excluding LLM) | Benchmark test |

---

## Section 2: User Stories & Acceptance Criteria

### US-3.4.1: As a platform user, I have multi-turn sessions with agents.
**Acceptance Criteria:**
- [ ] Create session: POST /v0/agents/{id}/sessions returns session_id
- [ ] Send message: POST /v0/agents/{id}/sessions/{sid}/messages
- [ ] Each message triggers the agent 13-step pipeline with accumulated context
- [ ] Session stores conversation history (user messages + agent responses)
- [ ] Session has 1-hour TTL from last activity (configurable)
- [ ] Expired sessions return 410 Gone on message attempts
- [ ] Session context includes outputs from all previous messages in the session

### US-3.4.2: As an agent in a session, I have full context from previous turns.
**Acceptance Criteria:**
- [ ] Message 1: "Generate mesh for this bracket" -> agent runs mesh-gen, gets mesh artifact
- [ ] Message 2: "Now run FEA with 500N load" -> agent has mesh artifact from message 1 in context
- [ ] Message 3: "What was the stress result?" -> agent recalls FEA output from message 2
- [ ] Context accumulation includes: user messages, agent responses, tool outputs, artifacts
- [ ] Context window managed: if total tokens exceed limit, summarize oldest messages

### US-3.4.3: As an agent, I replan when a tool fails during execution.
**Acceptance Criteria:**
- [ ] Tool failure triggers ProposalGenerator.GenerateWithFailureContext()
- [ ] Failed tool excluded from candidate list for replanning
- [ ] Goal enriched with failure context: "Previous attempt with <tool> failed: <reason>"
- [ ] Remaining budget enforced (budget_remaining, not original budget)
- [ ] If no viable alternatives: return partial result with failure explanation
- [ ] Replan limited to 1 attempt per iteration (avoid infinite replan loops)
- [ ] Replan uses same policy evaluation (replanned proposal can also be NEEDS_APPROVAL)

### US-3.4.4: As a platform user, I view the complete decision trace for any run.
**Acceptance Criteria:**
- [ ] GET /v0/runs/{id}/trace returns ordered list of trace steps
- [ ] Trace covers all pipeline phases: context -> search -> score -> propose -> policy -> execute -> evaluate
- [ ] Each step has: timestamp, step_name, input_summary, output_summary, duration_ms
- [ ] Failed steps include error details
- [ ] Replanning steps included with failure context
- [ ] Trace stored in run record (not ephemeral)

### US-3.4.5: As a platform user, I manage sessions in the playground.
**Acceptance Criteria:**
- [ ] SessionList shows all sessions for the current agent
- [ ] Active session indicator (green dot)
- [ ] Session shows message count and last activity time
- [ ] Click session to load its conversation history
- [ ] Start new session button
- [ ] Expired sessions grayed out with "Expired" label

### US-3.4.6: As a platform user, I view decision traces as a timeline.
**Acceptance Criteria:**
- [ ] DecisionTraceTimeline shows step-by-step visualization
- [ ] Each step has status dot: green=success, red=failure, yellow=pending, gray=skipped
- [ ] Timestamps and duration displayed per step
- [ ] Click step to expand input/output details
- [ ] Replanning branches shown as alternate paths

---

## Section 3: Technical Design

### 3.4.1 Session Management

**File:** `internal/service/session.go` (SessionService)

```
SESSION LIFECYCLE:

  CREATE SESSION:
    POST /v0/agents/{id}/sessions
    -> SessionService.Create(agentID)
    -> Generate session_id (UUID)
    -> Initialize: messages=[], context={}, last_activity=now()
    -> Store in sessions table
    -> Return session_id

  SEND MESSAGE:
    POST /v0/agents/{id}/sessions/{sid}/messages { "content": "...", "attachments": [...] }
    -> SessionService.ProcessMessage(sessionID, message)
    -> Steps:
      1. Load session (verify not expired)
      2. Append user message to session.messages
      3. Build accumulated context from all previous messages + outputs
      4. Run agent 13-step pipeline with accumulated context
      5. Append agent response to session.messages
      6. Update session.last_activity = now()
      7. Return agent response

  CONTEXT ACCUMULATION:
    func buildSessionContext(session Session) AgentContext {
      ctx := AgentContext{
        Goal:      session.Agent.Goal,
        Messages:  session.Messages,
        Artifacts: map[string]string{},
        RunOutputs: []interface{}{},
      }
      
      // Accumulate outputs from all previous turns
      for _, msg := range session.Messages {
        if msg.Role == "agent" && msg.RunOutput != nil {
          // Add artifacts from this turn
          for k, v := range msg.RunOutput.Artifacts {
            ctx.Artifacts[k] = v
          }
          // Add JSON outputs
          ctx.RunOutputs = append(ctx.RunOutputs, msg.RunOutput.JSON)
        }
      }
      
      // Manage context window (if tokens > limit, summarize old messages)
      if estimateTokens(ctx) > MAX_CONTEXT_TOKENS {
        ctx = summarizeOldMessages(ctx)
      }
      
      return ctx
    }

  SESSION EXPIRY:
    TTL: 1 hour from last_activity (configurable per agent)
    
    Check on access:
      if session.LastActivity.Add(session.TTL).Before(time.Now()) {
        return ErrSessionExpired  // 410 Gone
      }
    
    Background cleanup (every 15 minutes):
      DELETE FROM sessions WHERE last_activity + ttl < now()
```

### 3.4.2 Session Database Schema

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | expired
    messages      JSONB NOT NULL DEFAULT '[]',
    context       JSONB NOT NULL DEFAULT '{}',
    ttl_seconds   INT NOT NULL DEFAULT 3600,              -- 1 hour
    last_activity TIMESTAMP NOT NULL DEFAULT now(),
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions (agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions (last_activity);
```

### 3.4.3 Message Format

```go
type SessionMessage struct {
    ID        string          `json:"id"`
    Role      string          `json:"role"`       // "user" | "agent"
    Content   string          `json:"content"`    // text content
    RunID     *string         `json:"run_id,omitempty"`     // agent run ID for this turn
    RunOutput *RunOutput      `json:"run_output,omitempty"` // agent execution output
    Attachments []string      `json:"attachments,omitempty"` // artifact IDs
    Timestamp time.Time       `json:"timestamp"`
}

type RunOutput struct {
    GoalAchieved bool                   `json:"goal_achieved"`
    JSON         map[string]interface{} `json:"json"`
    Artifacts    map[string]string      `json:"artifacts"`
    ToolsUsed    []ToolUsage            `json:"tools_used"`
    TotalCost    float64                `json:"total_cost"`
}
```

### 3.4.4 Replanning on Failure

**File:** `internal/service/runtime.go` (ProposalGenerator.GenerateWithFailureContext)

```
REPLANNING FLOW:

  func (pg *ProposalGenerator) GenerateWithFailureContext(
    agentCtx AgentContext,
    failCtx FailureContext,
  ) (*ActionProposal, error) {

    // STEP 1: Exclude failed tool
    remainingTools := filterOut(agentCtx.ScoredTools, failCtx.FailedTool)
    if len(remainingTools) == 0 {
      return nil, ErrNoAlternatives{
        FailedTool: failCtx.FailedTool,
        Reason:     "No alternative tools available after exclusion",
      }
    }

    // STEP 2: Enrich goal with failure context
    enrichedGoal := fmt.Sprintf(
      "%s\n\n[REPLANNING] Previous attempt with %s failed: %s. "+
        "Try an alternative approach. Iteration %d, budget remaining: $%.2f",
      agentCtx.Goal,
      failCtx.FailedTool,
      failCtx.FailureReason,
      failCtx.Iteration,
      failCtx.BudgetRemaining,
    )

    // STEP 3: Create modified context
    replanCtx := agentCtx
    replanCtx.Goal = enrichedGoal
    replanCtx.ScoredTools = remainingTools
    replanCtx.Constraints.MaxCostUSD = failCtx.BudgetRemaining

    // STEP 4: Re-score remaining tools with failure context
    rescored, err := pg.scorer.ScoreTools(ctx, remainingTools, replanCtx)
    if err != nil {
      return nil, fmt.Errorf("rescoring failed: %w", err)
    }

    // STEP 5: Generate new proposal
    proposal, err := pg.Generate(replanCtx, rescored)
    if err != nil {
      return nil, fmt.Errorf("replan proposal generation failed: %w", err)
    }

    proposal.IsReplan = true
    proposal.ExcludedTools = []string{failCtx.FailedTool}
    
    return proposal, nil
  }

FAILURE CONTEXT:
  type FailureContext struct {
    FailedTool      string   `json:"failed_tool"`
    FailureReason   string   `json:"failure_reason"`
    Iteration       int      `json:"iteration"`
    CostSpent       float64  `json:"cost_spent"`
    BudgetRemaining float64  `json:"budget_remaining"`
  }

REPLAN LIMITS:
  - Max 1 replan per iteration (prevent infinite loops)
  - If replan also fails: return partial result with both failures explained
  - Replan consumes an iteration count (iteration incremented)
  - If at max_iterations when replan needed: REJECTED (iteration limit)
```

### 3.4.5 Decision Trace

**File:** `internal/service/run.go` (trace recording)

```
TRACE STRUCTURE:

  type DecisionTrace struct {
    RunID     string       `json:"run_id"`
    AgentID   string       `json:"agent_id"`
    Steps     []TraceStep  `json:"steps"`
    TotalMS   int64        `json:"total_duration_ms"`
    Iterations int         `json:"iterations"`
  }

  type TraceStep struct {
    StepNumber  int                    `json:"step_number"`
    StepName    string                 `json:"step_name"`
    Phase       string                 `json:"phase"`       // THINK, SELECT, PROPOSE, VALIDATE, EXPLAIN
    Status      string                 `json:"status"`      // success, failed, skipped
    StartedAt   time.Time              `json:"started_at"`
    CompletedAt time.Time              `json:"completed_at"`
    DurationMS  int64                  `json:"duration_ms"`
    Input       map[string]interface{} `json:"input"`       // summarized input
    Output      map[string]interface{} `json:"output"`      // summarized output
    Error       *string                `json:"error,omitempty"`
    Iteration   int                    `json:"iteration"`
  }

TRACE RECORDING (in runtime.go execution loop):

  func (rt *AgentRuntime) recordTraceStep(
    trace *DecisionTrace,
    stepNum int,
    stepName string,
    phase string,
    iteration int,
    fn func() (map[string]interface{}, error),
  ) error {
    step := TraceStep{
      StepNumber: stepNum,
      StepName:   stepName,
      Phase:      phase,
      Iteration:  iteration,
      StartedAt:  time.Now(),
    }

    output, err := fn()
    step.CompletedAt = time.Now()
    step.DurationMS = step.CompletedAt.Sub(step.StartedAt).Milliseconds()
    step.Output = output

    if err != nil {
      step.Status = "failed"
      errStr := err.Error()
      step.Error = &errStr
    } else {
      step.Status = "success"
    }

    trace.Steps = append(trace.Steps, step)
    return err
  }

FULL TRACE EXAMPLE:
  {
    "run_id": "run_xyz",
    "agent_id": "agent_abc",
    "iterations": 2,
    "total_duration_ms": 22400,
    "steps": [
      // Iteration 1
      { "step_number": 1, "step_name": "load_spec", "phase": "THINK", "iteration": 1,
        "status": "success", "duration_ms": 5,
        "output": { "spec_version": 2, "tool_count": 3 } },
      { "step_number": 2, "step_name": "assemble_context", "phase": "THINK", "iteration": 1,
        "status": "success", "duration_ms": 45,
        "output": { "memories_retrieved": 2, "artifacts_available": 1 } },
      { "step_number": 3, "step_name": "resolve_tools", "phase": "SELECT", "iteration": 1,
        "status": "success", "duration_ms": 120,
        "output": { "candidates": 3 } },
      { "step_number": 4, "step_name": "score_tools", "phase": "SELECT", "iteration": 1,
        "status": "success", "duration_ms": 1800,
        "output": { "top_tool": "mesh-generator@1", "top_score": 0.945, "mode": "hybrid" } },
      { "step_number": 5, "step_name": "filter_tools", "phase": "SELECT", "iteration": 1,
        "status": "success", "duration_ms": 2,
        "output": { "remaining": 3 } },
      { "step_number": 6, "step_name": "generate_proposal", "phase": "PROPOSE", "iteration": 1,
        "status": "success", "duration_ms": 2100,
        "output": { "tool": "mesh-generator@1", "confidence": 0.92 } },
      { "step_number": 7, "step_name": "evaluate_policy", "phase": "VALIDATE", "iteration": 1,
        "status": "success", "duration_ms": 3,
        "output": { "verdict": "APPROVED", "effective_threshold": 0.85 } },
      { "step_number": 8, "step_name": "build_run_plan", "phase": "VALIDATE", "iteration": 1,
        "status": "success", "duration_ms": 1 },
      { "step_number": 9, "step_name": "dispatch_job", "phase": "VALIDATE", "iteration": 1,
        "status": "success", "duration_ms": 15 },
      { "step_number": 10, "step_name": "execute_tool", "phase": "VALIDATE", "iteration": 1,
        "status": "success", "duration_ms": 7200,
        "output": { "tool": "mesh-generator@1", "cost": 0.30, "duration_sec": 7.2 } },
      { "step_number": 11, "step_name": "collect_results", "phase": "EXPLAIN", "iteration": 1,
        "status": "success", "duration_ms": 50,
        "output": { "artifacts": 1, "metrics": { "element_count": 45000 } } },
      { "step_number": 12, "step_name": "update_trust", "phase": "EXPLAIN", "iteration": 1,
        "status": "success", "duration_ms": 8,
        "output": { "new_trust": 0.913 } },
      { "step_number": 13, "step_name": "learn_from_run", "phase": "EXPLAIN", "iteration": 1,
        "status": "success", "duration_ms": 120,
        "output": { "memory_created": true, "category": "lesson" } },
      // Iteration 2 (steps 1-13 repeat for fea-solver)
      ...
    ]
  }
```

### 3.4.6 Context Window Management

```
CONTEXT ACCUMULATION STRATEGY:

  MAX_CONTEXT_TOKENS = 8000  (configurable per agent, from spec.llm.max_tokens)

  PRIORITY ORDER for context inclusion:
    1. System instructions (always included, ~500 tokens)
    2. Current user message (always included)
    3. Available tools + contracts (always included, ~200 tokens per tool)
    4. Retrieved memories (top-k, ~100 tokens each)
    5. Recent session messages (most recent first)
    6. Older session messages (summarized if needed)

  SUMMARIZATION:
    When total tokens exceed limit:
    1. Count tokens of items 1-4 = base_tokens
    2. Available for messages = MAX_CONTEXT_TOKENS - base_tokens
    3. Include most recent messages until budget exhausted
    4. Remaining older messages: ask LLM to summarize in 200 tokens
    5. Include summary as "Previous conversation summary: ..."

  TOKEN ESTIMATION:
    estimate_tokens(text) = len(text) / 4  // rough approximation
    (or use tiktoken for exact count if available)
```

---

## Section 4: API Contracts

```
POST /v0/agents/{id}/sessions
  Description: Create a new session
  Body: {} (empty, or optional { "ttl_seconds": 7200 })
  Response 201:
    {
      "id": "ses_abc123",
      "agent_id": "agent_abc",
      "status": "active",
      "ttl_seconds": 3600,
      "created_at": "2026-04-30T10:00:00Z"
    }

GET /v0/agents/{id}/sessions
  Description: List sessions for an agent
  Query params:
    status: active | expired (default: active)
    limit: int (default 20)
    offset: int (default 0)
  Response 200:
    {
      "sessions": [
        {
          "id": "ses_abc123",
          "status": "active",
          "message_count": 5,
          "last_activity": "2026-04-30T10:15:00Z",
          "created_at": "2026-04-30T10:00:00Z"
        }
      ],
      "total": 1
    }

GET /v0/agents/{id}/sessions/{sid}
  Description: Get session with full message history
  Response 200:
    {
      "id": "ses_abc123",
      "agent_id": "agent_abc",
      "status": "active",
      "messages": [
        {
          "id": "msg_001",
          "role": "user",
          "content": "Generate mesh for this Al6061 bracket",
          "attachments": ["art_cad_001"],
          "timestamp": "2026-04-30T10:00:05Z"
        },
        {
          "id": "msg_002",
          "role": "agent",
          "content": "I've generated the mesh using mesh-generator@1 with density 0.8...",
          "run_id": "run_xyz",
          "run_output": {
            "goal_achieved": false,
            "json": { "element_count": 45000, "quality": 0.95 },
            "artifacts": { "mesh_output": "art_mesh_002" },
            "tools_used": [{ "tool": "mesh-generator@1", "status": "succeeded", "cost": 0.30 }],
            "total_cost": 0.30
          },
          "timestamp": "2026-04-30T10:00:12Z"
        },
        {
          "id": "msg_003",
          "role": "user",
          "content": "Now run FEA with 500N load",
          "timestamp": "2026-04-30T10:01:00Z"
        }
      ],
      "last_activity": "2026-04-30T10:01:00Z"
    }
  Response 410 (expired):
    { "error": "Session expired", "expired_at": "2026-04-30T11:01:00Z" }

POST /v0/agents/{id}/sessions/{sid}/messages
  Description: Send a message in a session
  Body:
    {
      "content": "Run FEA with 500N load on the mesh",
      "attachments": []
    }
  Response 200:
    {
      "message": {
        "id": "msg_004",
        "role": "agent",
        "content": "Running FEA solver on the mesh from your previous request...",
        "run_id": "run_abc",
        "run_output": { ... },
        "timestamp": "2026-04-30T10:01:15Z"
      }
    }

GET /v0/runs/{id}/trace
  Description: Get the complete decision trace for a run
  Response 200:
    {
      "run_id": "run_xyz",
      "agent_id": "agent_abc",
      "iterations": 2,
      "total_duration_ms": 22400,
      "steps": [ ... ]  // full TraceStep array as defined in Section 3.4.5
    }
```

---

## Section 5: Data Models & Schema

### Session Model

```go
type Session struct {
    ID           string           `json:"id" db:"id"`
    AgentID      string           `json:"agent_id" db:"agent_id"`
    Status       string           `json:"status" db:"status"`
    Messages     []SessionMessage `json:"messages" db:"messages"`    // JSONB
    Context      json.RawMessage  `json:"context" db:"context"`      // accumulated context
    TTLSeconds   int              `json:"ttl_seconds" db:"ttl_seconds"`
    LastActivity time.Time        `json:"last_activity" db:"last_activity"`
    CreatedAt    time.Time        `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time        `json:"updated_at" db:"updated_at"`
}
```

### Decision Trace (stored in runs table)

```go
// Stored as JSONB in runs.decision_trace column
type DecisionTrace struct {
    RunID       string      `json:"run_id"`
    AgentID     string      `json:"agent_id"`
    Steps       []TraceStep `json:"steps"`
    TotalMS     int64       `json:"total_duration_ms"`
    Iterations  int         `json:"iterations"`
}

type TraceStep struct {
    StepNumber  int                    `json:"step_number"`
    StepName    string                 `json:"step_name"`
    Phase       string                 `json:"phase"`
    Status      string                 `json:"status"`
    StartedAt   time.Time              `json:"started_at"`
    CompletedAt time.Time              `json:"completed_at"`
    DurationMS  int64                  `json:"duration_ms"`
    Input       map[string]interface{} `json:"input,omitempty"`
    Output      map[string]interface{} `json:"output,omitempty"`
    Error       *string                `json:"error,omitempty"`
    Iteration   int                    `json:"iteration"`
}
```

---

## Section 6: Frontend Tasks

### 6.1 Session Manager in Playground

**File:** `frontend/src/components/agents/SessionList.tsx`
**What exists:** SessionList component with placeholder data.
**What to build:**

```
SESSION LIST (left sidebar in playground):
  +-----------------------------------+
  | Sessions           [New Session]  |
  |                                    |
  | * FEA Analysis Session            |
  |   5 messages | Active 2m ago      |
  |   (green dot = active)            |
  |                                    |
  |   Mesh Optimization               |
  |   12 messages | Active 45m ago    |
  |   (green dot = active)            |
  |                                    |
  |   Old Experiment                  |
  |   3 messages | Expired            |
  |   (gray dot = expired)            |
  +-----------------------------------+

API CALLS:
  Load: GET /v0/agents/{id}/sessions?status=active
  Create: POST /v0/agents/{id}/sessions
  Load history: GET /v0/agents/{id}/sessions/{sid}

BEHAVIORS:
  - Click session -> load messages into chat interface
  - "New Session" -> create session -> switch to empty chat
  - Active sessions have green dot, show relative time
  - Expired sessions have gray dot, show "Expired"
  - Current session highlighted with blue background
  - Session list refreshes every 30s
  - Chat messages from ChatInterface.tsx wired to POST .../messages
```

### 6.2 Decision Trace Timeline

**File:** `frontend/src/components/agents/DecisionTraceTimeline.tsx`
**What exists:** DecisionTraceTimeline component with placeholder data.
**What to build:**

```
DECISION TRACE TIMELINE (Inspector panel, "Trace" tab):
  +---------------------------------------------------+
  | Decision Trace                    Run: run_xyz     |
  | Total: 22.4s | 2 iterations | 13 steps            |
  |                                                     |
  | Iteration 1                                         |
  | +---+                                               |
  | | 1 | Load Spec .................. 5ms    (green)   |
  | +---+                                               |
  | | 2 | Assemble Context .......... 45ms   (green)   |
  | +---+   2 memories retrieved                       |
  | | 3 | Resolve Tools ............. 120ms  (green)   |
  | +---+   3 candidates                               |
  | | 4 | Score Tools ............... 1.8s   (green)   |
  | +---+   mesh-gen@1: 0.945 (hybrid)                |
  | | 5 | Filter Tools .............. 2ms    (green)   |
  | +---+   3 remaining                                |
  | | 6 | Generate Proposal ......... 2.1s   (green)   |
  | +---+   mesh-gen@1, conf: 0.92                    |
  | | 7 | Evaluate Policy ........... 3ms    (green)   |
  | +---+   APPROVED                                   |
  | | 8 | Build Run Plan ............ 1ms    (green)   |
  | +---+                                               |
  | | 9 | Dispatch Job .............. 15ms   (green)   |
  | +---+                                               |
  | |10 | Execute Tool .............. 7.2s   (green)   |
  | +---+   mesh-gen@1 -> 45K elements                |
  | |11 | Collect Results ........... 50ms   (green)   |
  | +---+                                               |
  | |12 | Update Trust .............. 8ms    (green)   |
  | +---+   0.907 -> 0.913                            |
  | |13 | Learn from Run ............ 120ms  (green)   |
  | +---+   lesson created                            |
  |                                                     |
  | Iteration 2                                         |
  | +---+                                               |
  | | 1 | Load Spec .................. 2ms    (green)   |
  | ...                                                 |
  +---------------------------------------------------+

STATUS DOT COLORS:
  green  = success
  red    = failed
  yellow = pending/running
  gray   = skipped

REPLANNING BRANCH:
  When a step fails and replanning occurs:
  | |10 | Execute Tool .............. 5.1s   (red)    |
  | +---+   fea-solver@2 FAILED: solver diverged      |
  |     +-- REPLAN --------------------------------+   |
  |     | Exclude: fea-solver@2                     |  |
  |     | Re-score remaining tools                  |  |
  |     | New proposal: alt-fea-solver@1            |  |
  |     +------------------------------------------+   |

API CALL:
  GET /v0/runs/{id}/trace

INTERACTIONS:
  - Click any step to expand input/output JSON viewer
  - Hover shows full duration and timestamp
  - Failed steps show error message expanded by default
  - Replan branches shown as indented sub-steps
```

---

## Section 7: State Machines & Lifecycle

### Session State Machine

```
  +----------+     message sent     +--------+     1h inactivity     +---------+
  | CREATED  | ------------------> | ACTIVE | --------------------> | EXPIRED |
  +----------+                     +--------+                       +---------+
                                       |                                 |
                                  each message                    410 Gone on
                                  resets TTL                      message attempt
                                       |
                                  +----v-----+
                                  | ACTIVE   |  (TTL reset to 1h)
                                  +----------+
```

### Replanning State Machine

```
                    +------------------+
                    | TOOL EXECUTING   |
                    +--------+---------+
                             |
                    tool fails (non-retryable)
                             |
                    +--------v---------+
                    | FAILURE DETECTED |
                    +--------+---------+
                             |
              +--------------+------------------+
              |                                 |
        replan attempts  == 0             replan attempts > 0
              |                                 |
    +---------v---------+             +---------v---------+
    | REPLANNING        |             | RETURN PARTIAL    |
    | - exclude tool    |             | - explain failure |
    | - re-score        |             | - list attempts   |
    | - new proposal    |             +-------------------+
    +---------+---------+
              |
    +---------v---------+
    | POLICY EVALUATION |
    +---------+---------+
              |
     APPROVED / NEEDS_APPROVAL / REJECTED
              |
    +---------v---------+
    | EXECUTE ALTERNATE |
    +-------------------+
```

### Decision Trace Recording Flow

```
  Agent Run Start
       |
  +----v-----+
  | STEP 1   | -- recordTraceStep("load_spec", THINK, ...)
  +----+-----+
       |
  +----v-----+
  | STEP 2   | -- recordTraceStep("assemble_context", THINK, ...)
  +----+-----+
       |
  ...  (steps 3-13, each wrapped in recordTraceStep)
       |
  +----v-----+
  | STEP 13  | -- recordTraceStep("learn_from_run", EXPLAIN, ...)
  +----+-----+
       |
  +----v-----------+
  | PERSIST TRACE  | -- run.DecisionTrace = trace (stored as JSONB)
  +----------------+
```

---

## Section 8: Test Scenarios

### T-3.4.1: Multi-turn context accumulation
```
GIVEN: Agent with goal "Optimize FEA simulation"
AND: New session created

MESSAGE 1: "Generate mesh for this Al6061 bracket" + attachment art_cad_001
THEN:
  - Agent runs mesh-gen@1 with geometry=art_cad_001
  - Response includes mesh artifact art_mesh_002
  - Session.messages has 2 entries (user + agent)

MESSAGE 2: "Now run FEA with 500N load"
THEN:
  - Agent context includes art_mesh_002 from message 1
  - Agent runs fea-solver@2 with mesh_file=art_mesh_002 (from accumulated context)
  - Agent does NOT need user to re-specify the mesh
  - Response includes FEA results

MESSAGE 3: "What was the max stress?"
THEN:
  - Agent has FEA results from message 2 in context
  - Agent responds with stress value (e.g., 187.3 MPa)
  - No new tool execution needed (information already available)
```

### T-3.4.2: Session expiry
```
GIVEN: Session created with TTL=3600s (1 hour)
AND: Last activity at T=0

WHEN: Message sent at T+3601s (1 hour + 1 second later)

THEN:
  - HTTP 410 Gone returned
  - Response body: { "error": "Session expired", "expired_at": "..." }
  - Session status updated to "expired" in DB
```

### T-3.4.3: Session TTL reset on activity
```
GIVEN: Session created at T=0, TTL=3600s
AND: Message sent at T+1800s (30 min)

THEN: Session.last_activity updated to T+1800s
AND: Session expires at T+1800s+3600s = T+5400s (not T+3600s)
```

### T-3.4.4: Replanning on tool failure
```
GIVEN: Agent has tools: [tool_A, tool_B, tool_C]
AND: tool_A selected (score 0.95), budget=$10.00, cost_so_far=$0.50

WHEN: tool_A execution fails with "input format error"

THEN:
  1. FailureContext created: { failed_tool: "tool_A", budget_remaining: $9.50 }
  2. GenerateWithFailureContext called
  3. tool_A excluded from candidates
  4. Remaining tools [tool_B, tool_C] re-scored
  5. Goal enriched: "...Previous attempt with tool_A failed: input format error..."
  6. New proposal generated with tool_B (next best)
  7. Policy evaluated on new proposal
  8. If APPROVED: tool_B executed
  9. Memory created: error_pattern for tool_A failure
```

### T-3.4.5: Replanning with no alternatives
```
GIVEN: Agent has tools: [tool_A] (only one tool)
WHEN: tool_A fails

THEN:
  1. GenerateWithFailureContext called
  2. Remaining tools = [] (empty after exclusion)
  3. ErrNoAlternatives returned
  4. Run returns partial result with failure explanation
  5. Memory created: error_pattern
```

### T-3.4.6: Decision trace completeness
```
GIVEN: Agent run completes with 2 iterations

WHEN: GET /v0/runs/{id}/trace

THEN:
  - trace.iterations = 2
  - trace.steps contains 26 entries (13 per iteration)
  - Each step has: step_number, step_name, phase, status, timestamps, duration_ms
  - Steps in correct order: load_spec -> assemble_context -> resolve_tools -> 
    score_tools -> filter_tools -> generate_proposal -> evaluate_policy -> 
    build_run_plan -> dispatch_job -> execute_tool -> collect_results -> 
    update_trust -> learn_from_run
  - All steps have status = "success" (for a successful run)
```

### T-3.4.7: Decision trace with replan
```
GIVEN: Agent run where tool_A fails at step 10, replan succeeds with tool_B

WHEN: GET /v0/runs/{id}/trace

THEN:
  - Step 10 (iteration 1, execute_tool): status = "failed", error = "..."
  - Steps 10a-10d (replan sub-steps): exclude tool, re-score, new proposal, policy check
  - Step 10e (execute_tool replan): status = "success", tool = "tool_B"
  - Total steps > 13 (extra replan steps included)
```

### T-3.4.8: Context window management
```
GIVEN: Session with 50 messages, each ~500 tokens = 25,000 total tokens
AND: MAX_CONTEXT_TOKENS = 8000

WHEN: Message 51 sent

THEN:
  - Messages 1-40 summarized into ~200 token summary
  - Messages 41-50 included in full
  - Message 51 included in full
  - Total context <= 8000 tokens
  - Agent still has awareness of early conversation (via summary)
```

---

## Section 9: Dependencies & Risks

### Dependencies
| Dependency | Status | Mitigation |
|-----------|--------|------------|
| Sprint 3.3 memory system | Required | Session context uses memory retrieval |
| Sprint 3.2 proposal generation | Required | Replanning uses ProposalGenerator |
| Sprint 3.1 scoring | Required | Replanning re-scores remaining tools |
| Session table in DB | Required | Verify migration includes sessions table |
| Run.decision_trace JSONB column | Required | Add migration if missing |

### Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Context window grows too large | High | Medium | Summarization strategy; configurable max |
| Session messages JSONB column grows large | Medium | Low | Limit messages per session (default 100) |
| Replanning creates infinite loops | High | Low | Max 1 replan per iteration; hard limit |
| Trace storage increases run record size | Low | Medium | Trace is JSONB; compress or archive old traces |
| Session cleanup misses expired sessions | Low | Low | Both on-access check and background cleanup |

---

## Section 10: NATS Subjects & Events

```
EXISTING SUBJECTS:
  airaie.jobs.agent.execution   -- tool dispatch (including replanned tools)
  airaie.results.completed      -- tool results
  airaie.events.{runId}         -- SSE events

NEW EVENTS ON airaie.events.{runId}:
  { "type": "session_message", "data": { "session_id": "ses_abc", "role": "user" } }
  { "type": "replan_started", "data": { "failed_tool": "tool_A", "reason": "..." } }
  { "type": "replan_proposal", "data": { "new_tool": "tool_B", "confidence": 0.88 } }
  { "type": "trace_step", "data": { "step": 4, "name": "score_tools", "status": "success" } }

SSE STREAM FOR PLAYGROUND:
  Playground subscribes to airaie.events.{runId} to show:
  - Real-time trace steps as they complete
  - Replan notifications
  - Session message updates
```

---

## Section 11: Migration & Data Requirements

```
MIGRATION (verify or create):

  -- Migration: 00X_sessions_and_trace.sql
  
  -- Sessions table (verify exists)
  CREATE TABLE IF NOT EXISTS sessions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      status        VARCHAR(20) NOT NULL DEFAULT 'active',
      messages      JSONB NOT NULL DEFAULT '[]',
      context       JSONB NOT NULL DEFAULT '{}',
      ttl_seconds   INT NOT NULL DEFAULT 3600,
      last_activity TIMESTAMP NOT NULL DEFAULT now(),
      created_at    TIMESTAMP NOT NULL DEFAULT now(),
      updated_at    TIMESTAMP NOT NULL DEFAULT now()
  );
  
  CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions (agent_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions (last_activity);
  
  -- Add decision_trace to runs table (if not exists)
  ALTER TABLE runs ADD COLUMN IF NOT EXISTS decision_trace JSONB;
  
  -- Index for session cleanup
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry 
    ON sessions ((last_activity + (ttl_seconds || ' seconds')::interval))
    WHERE status = 'active';
```

---

## Section 12: Definition of Done

- [ ] Multi-turn sessions maintain context across messages (verified with 3+ message test)
- [ ] Session context includes artifacts and outputs from all previous messages
- [ ] Sessions expire after 1 hour of inactivity (TTL reset on each message)
- [ ] Expired sessions return HTTP 410 Gone
- [ ] Replanning excludes failed tool and regenerates proposal
- [ ] Replanning enforces remaining budget (not original budget)
- [ ] Replanning limited to 1 attempt per iteration (no infinite loops)
- [ ] If no alternatives after replanning, partial result returned with explanation
- [ ] Decision trace records all 13 pipeline steps with timestamps and durations
- [ ] Decision trace includes replan steps when failures occur
- [ ] GET /v0/runs/{id}/trace returns complete reasoning chain
- [ ] SessionList shows active/expired sessions with message counts
- [ ] DecisionTraceTimeline renders step-by-step with status dots
- [ ] Context window managed when token count exceeds limit (summarization)
- [ ] Background cleanup removes expired sessions every 15 minutes

---
---

## Phase 3 Summary

### Sprint Schedule

| Sprint | Name | Duration | Dates (estimated) | Key Deliverables |
|--------|------|----------|-------------------|-----------------|
| 3.1 | Agent Scoring & Tool Selection | 3 days | Apr 28 - Apr 30 | 5-dim scoring, ToolShelf wiring, LLM blend, deterministic fallback |
| 3.2 | Proposal Generation & Policy Engine | 3 days | May 1 - May 3 | ProposalGenerator, 4 verdicts, board mode override, approval queue |
| 3.3 | Agent Memory (pgvector) | 3 days | May 4 - May 6 | Episodic/semantic memory, embeddings, retrieval injection, auto-learning |
| 3.4 | Multi-Turn Sessions & Replanning | 3 days | May 7 - May 9 | Sessions, context accumulation, replanning, decision trace |

### Key Files Modified

| File | Sprints | Purpose |
|------|---------|---------|
| `internal/service/runtime.go` | 3.1, 3.2, 3.3, 3.4 | Scorer, ProposalGenerator, PolicyEnforcer, memory injection, trace recording |
| `internal/service/approval.go` | 3.2 | Approval queue CRUD and resolution |
| `internal/service/memory.go` | 3.3 | Memory CRUD, embedding, retrieval, cleanup, auto-learning |
| `internal/service/run.go` | 3.3, 3.4 | LearnFromRun, decision trace storage |
| `internal/service/session.go` | 3.4 | Session management, message processing, context accumulation |
| `frontend/src/components/agents/builder/AgentSpecForm.tsx` | 3.1 | Scoring config UI |
| `frontend/src/components/agents/InspectorPanel.tsx` | 3.1 | Score visualization |
| `frontend/src/components/agents/execution/ProposalViewer.tsx` | 3.2 | Proposal display |
| `frontend/src/pages/ApprovalsPage.tsx` | 3.2 | Approval queue page |
| `frontend/src/components/agents/memory/MemoryBrowser.tsx` | 3.3 | Memory browser |
| `frontend/src/components/agents/SessionList.tsx` | 3.4 | Session management |
| `frontend/src/components/agents/DecisionTraceTimeline.tsx` | 3.4 | Decision trace |

### Phase 3 Exit Criteria

- [ ] Agent scores tools using 5-dimension hybrid algorithm with correct formulas
- [ ] Agent generates proposals with confidence, reasoning, and alternatives
- [ ] Policy engine returns correct verdicts (APPROVED/NEEDS_APPROVAL/REJECTED/ESCALATE)
- [ ] Board mode overrides tighten thresholds but never loosen them
- [ ] pgvector stores and retrieves 1536-dim embeddings via cosine similarity
- [ ] Episodic memories expire; semantic memories persist
- [ ] Auto-learning creates memories from every run outcome
- [ ] Multi-turn sessions maintain context across messages
- [ ] Replanning recovers from tool failures by excluding failed tools
- [ ] Decision trace provides complete audit trail of agent reasoning
- [ ] All frontend components wire to real backend APIs

---

*Generated: 2026-04-06*
*Source: AIRAIE_MASTER_SPRINT_PLAN.md, AIRAIE_AGENT_SYSTEM_ARCHITECTURE.md*
*Phase 3 runs in parallel with Phase 2, both starting after Phase 1 completion.*
