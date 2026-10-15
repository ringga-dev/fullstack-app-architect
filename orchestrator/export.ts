// orchestrator/export.ts
// Cross-platform adapter exporter. No bash required — works on Windows,
// macOS and Linux via `bun run orchestrator/export.ts <target>`.
import {
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "fs";
import { join, resolve, basename, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const AGENTS_DIR = join(ROOT, "agents");
const SCHEMAS_DIR = join(ROOT, "schemas");
const ORCH_DIR = join(ROOT, "orchestrator");
const CONFIG_DIR = join(ROOT, "config");

function ensure(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function agentFiles(): string[] {
  if (!existsSync(AGENTS_DIR)) return [];
  return readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".agent.md"));
}

// Nama agen untuk OpenCode: `.agent.md` -> `.md` supaya agent ID bersih
// (mis. `00-discovery-interviewer`, bukan `00-discovery-interviewer.agent`).
function opencodeName(f: string): string {
  return f.replace(/\.agent\.md$/, ".md");
}

// Buang blok YAML frontmatter di awal file (dipakai ulang oleh target lain,
// mis. Cursor .mdc yang menambahkan frontmatter-nya sendiri).
function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md;
  return md.slice(end + 4).replace(/^\s*\n/, "");
}

function copyInto(dest: string, files: string[]) {
  ensure(dest);
  const copied: string[] = [];
  for (const f of files) {
    const src = join(AGENTS_DIR, f);
    if (existsSync(src)) {
      copyFileSync(src, join(dest, f));
      copied.push(join(dest, f));
    }
  }
  return copied;
}

function copyDirInto(srcDir: string, destDir: string) {
  if (!existsSync(srcDir)) return;
  ensure(destDir);
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) copyDirInto(src, dest);
    else copyFileSync(src, dest);
  }
}

function copyConfig(dest: string) {
  // Katalog stack + profiles ikut diexport agar agen di platform lain
  // (OpenCode/Antigraviti/Hermes/Cursor/Cline) bisa membaca pilihan teknologi.
  copyDirInto(CONFIG_DIR, join(dest, "config"));
}

function copyTemplates(dest: string) {
  copyDirInto(join(ROOT, "templates"), join(dest, "templates"));
}

function copyExamples(dest: string) {
  // Contoh blueprint terisi (POS Kasir) + seed script, sebagai referensi few-shot.
  copyDirInto(join(ROOT, "examples"), join(dest, "examples"));
}

function copySchemasAndCore(dest: string) {
  ensure(dest);
  // Agent files + core agar paket skill SELF-CONTAINED.
  for (const f of agentFiles()) {
    copyFileSync(join(AGENTS_DIR, f), join(dest, opencodeName(f)));
  }
  if (existsSync(SCHEMAS_DIR)) {
    for (const f of readdirSync(SCHEMAS_DIR)) {
      copyFileSync(join(SCHEMAS_DIR, f), join(dest, f));
    }
  }
  for (const f of ["state.ts", "validator.ts", "catalog.ts", "prompt.ts", "tasks.ts", "render.ts", "ci.ts"]) {
    const src = join(ORCH_DIR, f);
    if (existsSync(src)) copyFileSync(src, join(dest, f));
  }
  const readme = join(ROOT, "README.md");
  if (existsSync(readme)) copyFileSync(readme, join(dest, "README.md"));
  const runbook = join(ROOT, "RUNBOOK.md");
  if (existsSync(runbook)) copyFileSync(runbook, join(dest, "RUNBOOK.md"));
  // Salin folder orchestrator/ apa adanya agar skrip (mis. examples/*/seed.ts) tetap bisa dijalankan.
  copyDirInto(ORCH_DIR, join(dest, "orchestrator"));
  copyConfig(dest);
  copyTemplates(dest);
  copyExamples(dest);
}

// --- Targets -------------------------------------------------------------

function exportOpenCode() {
  const destAgents = join(ROOT, ".opencode", "agents");
  const destSkills = join(ROOT, ".opencode", "skills", "multi-agent-architect");
  ensure(destAgents);
  const copied: string[] = [];
  for (const f of agentFiles()) {
    const dest = join(destAgents, opencodeName(f));
    copyFileSync(join(AGENTS_DIR, f), dest);
    copied.push(dest);
  }
  copySchemasAndCore(destSkills);

  const skillMd = `---
name: multi-agent-architect
description: Multi-Agent Architecture Engine - jalankan 7 sub-agen (#0 Discovery s.d. #6 Cross-Review) untuk menghasilkan blueprint fullstack traceable (docs/00..06). Gunakan saat user ingin merancang arsitektur aplikasi fullstack, memilih tech stack, atau membuat PRD/ERD/API contract, terutama bila memakai model AI murah (gunakan tier cheap + prompt generator).
---

# Multi-Agent Architect

Engine 7 sub-agen + 3 Gerbang. Lihat \`RUNBOOK.md\` untuk langkah demi langkah.

## Alur cepat
1. \`bun run orchestrator/catalog.ts list\` — lihat preset tech stack (8 preset).
2. \`bun run orchestrator/index.ts --name <app> --profile <id> --idea "..."\` — bootstrap.
3. \`bun run orchestrator/prompt.ts --step <NN> --tier cheap --out\` — prompt mandiri per agen.
4. Jalankan agen di folder \`agents/\` berurutan \`00 -> 01 -> (02+03) -> 04 -> 05 -> 06\`.
5. \`bun run orchestrator/tasks.ts --out\` — backlog task atomik.
6. \`bun run orchestrator/render.ts\` — render docs/00..06 dari state (deterministik).
7. \`bun run orchestrator/ci.ts\` — validate + render + backlog sekali jalan (gate PR).

Referensi terisi: \`examples/pos-kasir/\` dan \`examples/pos-kasir-multitenant/\`.
Katalog teknologi: \`config/stack-catalog.json\`. Template: \`templates/\`.
`;
  ensure(destSkills);
  writeFileSync(join(destSkills, "SKILL.md"), skillMd, "utf8");

  const note = `# Multi-Agent Architect - OpenCode Instructions

Load subagents from \`.opencode/agents/\`:
${agentFiles().map((f) => "- " + opencodeName(f).replace(/\.md$/, "")).join("\n")}

Mandatory workflow: 00 (Discovery/Lock) -> 01 -> (02+03 parallel) -> 04 -> 05 -> 06 (loop until APPROVE_GATE)
Use SharedState (workspace-output/STATE-*.json) as single source of truth.
`;
  ensure(join(ROOT, ".opencode"));
  writeFileSync(join(ROOT, ".opencode", "multi-agent-architect.md"), note, "utf8");

  console.log(`[opencode] ${copied.length} agents -> ${destAgents}`);
  console.log(`[opencode] skills -> ${destSkills}`);
}

function exportAntigraviti() {
  const destProj = join(ROOT, ".antigraviti", "agents");
  const destCfg = join(homedir(), ".config", "antigraviti", "agents");
  const files = agentFiles();
  copyInto(destProj, files);
  try {
    copyInto(destCfg, files);
  } catch {
    /* user-global export is best-effort */
  }
  const readme = `# Antigraviti - Multi-Agent Architect

Agents auto-detected from \`.antigraviti/agents/\`.

Order: discovery -> flow-prd -> (fe-architect + be-architect) -> db-architect -> api-designer -> cross-reviewer (loop until APPROVE_GATE)
Shared State: workspace-output/STATE-INIT.json -> STATE-SNAPSHOT.json
`;
  ensure(join(ROOT, ".antigraviti"));
  writeFileSync(join(ROOT, ".antigraviti", "README.md"), readme, "utf8");
  console.log(`[antigraviti] ${files.length} agents -> ${destProj}`);
  console.log(`[antigraviti] synced -> ${destCfg}`);
}

function exportHermes() {
  const destProj = join(ROOT, ".hermes", "agents");
  const destCfg = join(homedir(), ".config", "hermes", "agents");
  const files = agentFiles();
  copyInto(destProj, files);
  try {
    copyInto(destCfg, files);
  } catch {
    /* best-effort */
  }
  const cfg = `# Hermes - Multi-Agent Architect Config

Active agents: ${files.length} sub-agents (universal YAML frontmatter).
Pipeline: discovery -> flow-prd -> (fe + be) -> db -> api -> cross-reviewer (loop until APPROVE_GATE)
IO Contract: SharedState JSON in workspace-output/
`;
  ensure(join(ROOT, ".hermes"));
  writeFileSync(join(ROOT, ".hermes", "config.md"), cfg, "utf8");
  console.log(`[hermes] ${files.length} agents -> ${destProj}`);
  console.log(`[hermes] synced -> ${destCfg}`);
}

function exportClaudeCode() {
  const dest = join(homedir(), ".claude", "skills", "fullstack-app-architect");
  const copied = copyInto(dest, agentFiles());
  copySchemasAndCore(dest);
  console.log(`[claude-code] ${copied.length} agents -> ${dest}`);
}

function exportCursor() {
  const dest = join(ROOT, ".cursor", "rules");
  ensure(dest);
  const files = agentFiles();
  for (const f of files) {
    const base = basename(f, ".agent.md");
    const body = stripFrontmatter(readFileSync(join(AGENTS_DIR, f), "utf8"));
    const mdc = `---\ndescription: Multi-Agent Architect - ${base}\nglobs: []\nalwaysApply: false\n---\n${body}`;
    writeFileSync(join(dest, `${base}.mdc`), mdc, "utf8");
  }
  console.log(`[cursor] ${files.length} rules -> ${dest}`);
}

function exportClineRoo() {
  const destCline = join(ROOT, ".clinerules");
  const destRoo = join(ROOT, ".roo", "rules");
  ensure(destCline);
  copyInto(destRoo, agentFiles());
  const mode = `# Architect Mode (Multi-Agent)
Enable sub-agents in order: discovery -> flow-prd -> (fe + be) -> db -> api -> cross-reviewer
Enforce: Standards Locked | Traceability | Payload Sync | Schema & Performance | Decoupling | Clean Code Layer | Reference Integrity
`;
  writeFileSync(join(destCline, "architect-mode.md"), mode, "utf8");
  console.log(`[cline-roo] -> ${destCline} & ${destRoo}`);
}

const TARGETS: Record<string, () => void> = {
  opencode: exportOpenCode,
  antigraviti: exportAntigraviti,
  hermes: exportHermes,
  claude: exportClaudeCode,
  "claude-code": exportClaudeCode,
  cursor: exportCursor,
  cline: exportClineRoo,
  roo: exportClineRoo,
};

function main() {
  const target = (process.argv[2] || "all").toLowerCase();
  if (target === "all") {
    for (const fn of [
      exportOpenCode,
      exportAntigraviti,
      exportHermes,
      exportCursor,
      exportClineRoo,
    ]) {
      fn();
    }
  } else if (TARGETS[target]) {
    TARGETS[target]();
  } else {
    console.error(`Unknown target: ${target}`);
    console.error(`Valid targets: ${Object.keys(TARGETS).join(", ")}, all`);
    process.exit(1);
  }
  console.log("Done.");
}

main();
