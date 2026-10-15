// orchestrator/runner.ts
import { CrossValidator } from "./validator";
import type { SharedState, ReviewIssue } from "./state";

export type AgentStep =
  | "discovery" // Agent 00
  | "flow-prd" // Agent 01
  | "fe-architect" // Agent 02
  | "be-architect" // Agent 03
  | "db-architect" // Agent 04
  | "api-designer" // Agent 05
  | "cross-reviewer"; // Agent 06

export interface RunResult {
  state: SharedState;
  issues: ReviewIssue[];
  rounds: number;
  gate_passed: boolean;
  traceability: ReturnType<CrossValidator["traceabilityMatrix"]>;
}

/**
 * OrchestratorRunner drives the 6-agent pipeline with a cyclic validation loop.
 *
 *   Agent 00 discovery (Gerbang 1 - lock tech stack & standards)
 *        │
 *   Agent 01 flow-prd
 *        │
 *        ├── Agent 02 fe-architect  (parallel)
 *        └── Agent 03 be-architect  (parallel)
 *        │
 *   Agent 04 db-architect   (butuh PRD + BE)
 *        │
 *   Agent 05 api-designer   (butuh PRD + FE + BE + DB)
 *        │
 *   Agent 06 cross-reviewer -> jika ada BLOCKER, ulangi agen terkait (loop)
 *
 * The `exec` callback is injected so the caller decides HOW each agent runs
 * (LLM SDK, CLI subagent, manual prompt, etc).
 */
export class OrchestratorRunner {
  private validator = new CrossValidator();
  private maxRounds: number;

  constructor(maxRounds = 3) {
    this.maxRounds = maxRounds;
  }

  async run(
    initial: SharedState,
    exec: (step: AgentStep, state: SharedState) => Promise<Partial<SharedState>>
  ): Promise<RunResult> {
    let state: SharedState = structuredClone(initial);
    let rounds = 0;
    let lastIssues: ReviewIssue[] = [];

    // 0) Agent 00 - Discovery (lock tech stack & clean code standards)
    state = { ...state, ...(await exec("discovery", state)) };

    // 1) Agent 01 - Flow & PRD
    state = { ...state, ...(await exec("flow-prd", state)) };

    while (rounds < this.maxRounds) {
      rounds++;
      state.revision_round = rounds;

      // 2) Agent 02 + 03 (parallel) - depends on PRD
      const [fePatch, bePatch] = await Promise.all([
        exec("fe-architect", state),
        exec("be-architect", state),
      ]);
      state = { ...state, ...fePatch, ...bePatch };

      // 3) Agent 04 - depends on PRD + BE
      state = { ...state, ...(await exec("db-architect", state)) };

      // 4) Agent 05 - depends on PRD + FE + BE + DB
      state = { ...state, ...(await exec("api-designer", state)) };

      // 5) Agent 06 - cross review
      const issues = this.validator.validate(state);
      lastIssues = issues;
      state.review_log = [...state.review_log, ...issues];

      if (!this.validator.hasBlocker(issues)) {
        state.gate_passed = true;
        state.handoff_ready = true;
        return {
          state,
          issues,
          rounds,
          gate_passed: true,
          traceability: this.validator.traceabilityMatrix(state),
        };
      }
      // else: loop. Agents should read state.review_log to patch their part.
    }

    return {
      state,
      issues: lastIssues,
      rounds,
      gate_passed: false,
      traceability: this.validator.traceabilityMatrix(state),
    };
  }
}
