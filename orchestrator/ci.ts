// orchestrator/ci.ts
// One-shot CI gate: validate -> render docs -> generate backlog.
// Exit code: 0 = APPROVE_GATE, 2 = ada BLOCKER, 1 = error (state tak ada, dsb).
//
// Pakai:
//   bun run orchestrator/ci.ts
//   bun run orchestrator/ci.ts --state examples/pos-kasir/state.json --out-dir examples/pos-kasir/docs
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import { CrossValidator } from "./validator";
import { renderAll } from "./render";
import { buildTasks, toMarkdown } from "./tasks";
import type { SharedState } from "./state";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

interface Args {
  state?: string;
  outDir?: string;
  render: boolean;
  tasks: boolean;
  quiet: boolean;
}

function parse(argv: string[]): Args {
  const a: Args = { render: true, tasks: true, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const c = argv[i];
    if (c === "--state" || c === "-s") a.state = argv[++i];
    else if (c === "--out-dir" || c === "-o") a.outDir = argv[++i];
    else if (c === "--no-render") a.render = false;
    else if (c === "--no-tasks") a.tasks = false;
    else if (c === "--quiet" || c === "-q") a.quiet = true;
  }
  return a;
}

function loadState(p?: string): SharedState {
  const candidates = [p, join(ROOT, "workspace-output", "STATE-SNAPSHOT.json")].filter(
    Boolean,
  ) as string[];
  for (const c of candidates) {
    if (existsSync(c)) return JSON.parse(readFileSync(c, "utf8")) as SharedState;
  }
  throw new Error(
    `State tidak ditemukan (${candidates.join(" | ")}). Jalankan bootstrap atau seed dulu.`,
  );
}

function main() {
  const args = parse(process.argv.slice(2));
  const log = (...m: unknown[]) => {
    if (!args.quiet) console.log(...m);
  };

  let state: SharedState;
  try {
    state = loadState(args.state);
  } catch (e) {
    console.error(`[ci] ERROR: ${(e as Error).message}`);
    process.exit(1);
  }

  const validator = new CrossValidator();
  const issues = validator.validate(state);
  const matrix = validator.traceabilityMatrix(state);
  const blockers = issues.filter((i) => i.severity === "BLOCKER" && i.status === "OPEN");
  const majors = issues.filter((i) => i.severity === "MAJOR");
  const minors = issues.filter((i) => i.severity === "MINOR");
  const passed = !validator.hasBlocker(issues);

  log("=== [ci] Architecture Gate ===");
  log(`Project : ${state.project_meta?.name ?? "-"}`);
  log(`Profile : ${state.tech_stack_state?.profile ?? "(custom)"}`);
  log(
    `Counts  : FR=${state.prd_state.functional_requirements.length} ` +
      `FE=${state.fe_state.screens.length} BE=${state.be_state.modules.length} ` +
      `DB=${state.db_state.tables.length} API=${state.api_state.endpoints.length}`,
  );
  log(
    `Issues  : ${issues.length} (BLOCKER=${blockers.length}, MAJOR=${majors.length}, MINOR=${minors.length})`,
  );
  for (const i of issues) log(`  - [${i.severity}] ${i.issue_type} -> ${i.target_agent}: ${i.description}`);

  // Artefak
  const docsDir = args.outDir ? resolve(args.outDir) : join(ROOT, "docs");
  if (args.render) {
    try {
      renderAll(state, true, docsDir);
      log(`[ci] render -> ${docsDir}`);
    } catch (e) {
      console.error(`[ci] render gagal: ${(e as Error).message}`);
    }
  }

  let taskCount = 0;
  if (args.tasks) {
    const tasks = buildTasks(state);
    taskCount = tasks.length;
    const md = toMarkdown(tasks, state);
    const outDir = join(ROOT, "workspace-output");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "BACKLOG.md"), md, "utf8");
    writeFileSync(join(outDir, "BACKLOG.json"), JSON.stringify({ tasks }, null, 2), "utf8");
    log(`[ci] backlog -> ${taskCount} task`);
  }

  const report = {
    project: state.project_meta?.name ?? null,
    profile: state.tech_stack_state?.profile ?? null,
    generated_at: new Date().toISOString(),
    counts: {
      fr: state.prd_state.functional_requirements.length,
      fe: state.fe_state.screens.length,
      be: state.be_state.modules.length,
      db: state.db_state.tables.length,
      api: state.api_state.endpoints.length,
      tasks: taskCount,
    },
    issues: { total: issues.length, blocker: blockers.length, major: majors.length, minor: minors.length },
    traceability: matrix,
    gate: passed ? "APPROVE_GATE" : "CONTINUE_REVISE",
  };
  const reportDir = join(ROOT, "workspace-output");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "CI-REPORT.json"), JSON.stringify(report, null, 2), "utf8");
  log(`[ci] report -> ${join(reportDir, "CI-REPORT.json")}`);

  if (!passed) {
    log("RESULT: CONTINUE_REVISE (ada BLOCKER).");
    process.exit(2);
  }
  log("RESULT: APPROVE_GATE (tidak ada BLOCKER).");
}

const invokedDirectly =
  !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly || process.env.MAA_FORCE_MAIN === "1") main();
