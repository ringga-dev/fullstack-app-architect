// orchestrator/index.ts
// Universal entrypoint: bootstrap the engine, prepare workspace, and print the
// 6-agent execution order. Works from any directory.
import { writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { initialState, type SharedState } from "./state";
import { applyProfile, loadProfile, listProfiles } from "./catalog";

function saveJSON(path: string, data: unknown) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

function saveMD(path: string, content: string) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
}

export interface BootstrapResult {
  root: string;
  out: string;
  docs: string;
  statePathInit: string;
  statePathSnapshot: string;
  runLog: string;
  projectName: string;
  idea: string;
  profile?: string;
}

const PIPELINE = [
  ["00-discovery-interviewer", "docs/00-TECH-STACK-AND-STANDARDS.md", "Gerbang 1: Wawancara & lock Tech Stack + Clean Code"],
  ["01-flow-prd", "docs/01-PRD-AND-FLOW.md", "PRD + user flows + MoSCoW (FR-XX)"],
  ["02-fe-architect", "docs/02-FE-ARCHITECTURE.md", "Screens (FE-XX) + UI states (paralel dgn 03)"],
  ["03-be-architect", "docs/03-BE-ARCHITECTURE.md", "Modules (BE-XX) + RBAC + errors (paralel dgn 02)"],
  ["04-db-architect", "docs/04-DATABASE-SCHEMA.md", "Tables (DB-XX) + ERD + ORM + index"],
  ["05-api-designer", "docs/05-API-CONTRACT.md", "Endpoints (API-XX) + envelope + idempotency"],
  ["06-cross-reviewer", "docs/06-AUDIT-AND-ROADMAP.md", "Gerbang 3: audit + traceability + roadmap"],
] as const;

export function bootstrap(
  projectName?: string,
  idea?: string,
  profileId?: string,
): BootstrapResult {
  const root = resolve(process.cwd());
  const out = join(root, "workspace-output");
  const docs = join(root, "docs");

  mkdirSync(out, { recursive: true });
  mkdirSync(docs, { recursive: true });

  const name = projectName?.trim() || "multi-agent-project";
  let state: SharedState = initialState({ name });

  // Terapkan profile (preset) bila diberikan — tetap bisa di-override.
  if (profileId) {
    const profile = loadProfile(profileId);
    state = applyProfile(state, profile, true);
    // --name eksplisit menang atas nama dari profile
    state = { ...state, project_meta: { ...state.project_meta, name } };
  }

  saveJSON(join(out, "STATE-INIT.json"), state);
  saveJSON(join(out, "STATE-SNAPSHOT.json"), state);

  const ideaText = idea?.trim() || "NO_IDEA_PROVIDED";
  const runLog = `# Multi-Agent Architect - Run Log

## Project
- Name: ${state.project_meta.name}
- Profile: ${state.tech_stack_state.profile ?? "(custom / none)"}
- Sync Mode: ${state.tech_stack_state.sync_mode ?? "(unset)"}
- Generated At: ${new Date().toISOString()}
- Root: ${root}

## Idea Input
${ideaText}

## 3 Gerbang Utama
- GERBANG 1 (Discovery & Locking): 00-discovery-interviewer
- GERBANG 2 (Isolated Specialist Design): 01 -> (02+03) -> 04 -> 05
- GERBANG 3 (Quality Gate & Cross-Review): 06-cross-reviewer (LOOP sampai APPROVE_GATE)

## Pipeline (7 Agents)
1. 00-discovery       -> docs/00-TECH-STACK-AND-STANDARDS.md  (Gerbang 1 - LOCKED)
2. 01-flow-prd        -> docs/01-PRD-AND-FLOW.md
3. 02-fe-architect    -> docs/02-FE-ARCHITECTURE.md   (paralel dgn 03)
4. 03-be-architect    -> docs/03-BE-ARCHITECTURE.md   (paralel dgn 02)
5. 04-db-architect    -> docs/04-DATABASE-SCHEMA.md   (butuh PRD + BE)
6. 05-api-designer    -> docs/05-API-CONTRACT.md      (butuh PRD + FE + BE + DB)
7. 06-cross-reviewer  -> docs/06-AUDIT-AND-ROADMAP.md (LOOP sampai APPROVE_GATE)

## ID Taxonomy (untuk Traceability)
- FR-XX  : Functional Requirement
- FE-XX  : Frontend Screen
- BE-XX  : Backend Module / Use Case
- DB-XX  : Database Table
- API-XX : API Endpoint

## Status
- [ ] 00-discovery-interviewer (standards LOCKED)
- [ ] 01-flow-prd
- [ ] 02-fe-architect
- [ ] 03-be-architect
- [ ] 04-db-architect
- [ ] 05-api-designer
- [ ] 06-cross-reviewer (loop until gate passed)
`;

  saveMD(join(out, "RUN-LOG.md"), runLog);

  return {
    root,
    out,
    docs,
    statePathInit: join(out, "STATE-INIT.json"),
    statePathSnapshot: join(out, "STATE-SNAPSHOT.json"),
    runLog: join(out, "RUN-LOG.md"),
    projectName: name,
    idea: ideaText,
    profile: state.tech_stack_state.profile,
  };
}

function main() {
  const args = process.argv.slice(2);
  let projectName = "multi-agent-project";
  let idea: string | undefined;
  let profileId: string | undefined;

  if (args.includes("--list-profiles")) {
    console.log("Profiles tersedia:");
    for (const p of listProfiles()) {
      console.log(`  ${p.id.padEnd(24)} ${p.name}`);
    }
    return;
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--name" || a === "-n") {
      projectName = args[i + 1] || projectName;
      i++;
      continue;
    }
    if (a === "--profile" || a === "-p") {
      profileId = args[i + 1] || profileId;
      i++;
      continue;
    }
    if (a === "--idea" || a === "-i") {
      idea = args.slice(i + 1).join(" ");
      break;
    }
    if (!a.startsWith("-")) {
      idea = idea ? idea + " " + a : a;
    }
  }

  const res = bootstrap(projectName, idea, profileId);

  console.log("======================================================");
  console.log("       MULTI-AGENT ARCHITECT ENGINE - START           ");
  console.log("======================================================");
  console.log("");
  console.log("Root        :", res.root);
  console.log("Project     :", res.projectName);
  console.log("Profile     :", res.profile ?? "(custom / none)");
  console.log("Workspace   :", res.out);
  console.log("Docs        :", res.docs);
  console.log("State Init  :", res.statePathInit);
  console.log("Run Log     :", res.runLog);
  console.log("");
  console.log("Idea:");
  console.log(res.idea);
  console.log("");
  console.log("------------------------------------------------------");
  console.log("PIPELINE (7 Agents - 3 Gerbang):");
  console.log("------------------------------------------------------");
  for (const [step, file, desc] of PIPELINE) {
    console.log(`${step}  ->  ${file}  [${desc}]`);
  }
  console.log("");
  console.log("Bootstrap done. Engine ready.");
  console.log("See workspace-output/RUN-LOG.md for progress tracking.");
}

const invokedDirectly =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly || process.env.MAA_FORCE_MAIN === "1") {
  main();
}
