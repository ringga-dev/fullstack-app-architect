// orchestrator/validate.ts
// Offline validator: reads a SharedState JSON (default STATE-SNAPSHOT.json),
// runs the 4 cross-review gates, prints issues + the traceability matrix.
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { CrossValidator } from "./validator";
import type { SharedState } from "./state";

function loadState(path: string): SharedState {
  return JSON.parse(readFileSync(path, "utf8")) as SharedState;
}

function main() {
  const argPath = process.argv[2];
  const target = argPath
    ? resolve(argPath)
    : join(resolve(process.cwd()), "workspace-output", "STATE-SNAPSHOT.json");

  if (!existsSync(target)) {
    console.error(`State file not found: ${target}`);
    console.error(
      "Run the orchestrator first (bun run orchestrator/index.ts) or pass a path."
    );
    process.exit(1);
  }

  const state = loadState(target);
  const validator = new CrossValidator();
  const issues = validator.validate(state);

  console.log("=== Cross-Review Validation ===");
  console.log("State   :", target);
  console.log("FR      :", state.prd_state.functional_requirements.length);
  console.log("FE      :", state.fe_state.screens.length);
  console.log("BE      :", state.be_state.modules.length);
  console.log("DB      :", state.db_state.tables.length);
  console.log("API     :", state.api_state.endpoints.length);
  console.log("");

  console.log("=== Traceability Matrix ===");
  for (const row of validator.traceabilityMatrix(state)) {
    console.log(
      `${row.fr.padEnd(6)} [${row.priority.padEnd(6)}] FE:${(row.fe.join(",") || "-").padEnd(
        10
      )} API:${(row.api.join(",") || "-").padEnd(12)} BE:${(row.be.join(",") || "-").padEnd(
        8
      )} DB:${(row.db.join(",") || "-").padEnd(8)} ${row.status}`
    );
  }
  console.log("");

  console.log(`=== Issues (${issues.length}) ===`);
  for (const i of issues) {
    console.log(
      `- [${i.severity}] ${i.issue_type} -> ${i.target_agent}: ${i.description}`
    );
    if (i.patch) console.log(`    patch: ${i.patch}`);
  }
  console.log("");

  if (validator.hasBlocker(issues)) {
    console.log("RESULT: CONTINUE_REVISE (ada BLOCKER).");
    process.exit(2);
  }
  console.log("RESULT: APPROVE_GATE (tidak ada BLOCKER).");
}

main();
