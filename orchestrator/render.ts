// orchestrator/render.ts
// Render dokumen arsitektur docs/00..06 DARI SharedState (JSON) secara deterministik.
// Manfaat: AI cukup mengisi STATE OUTPUT (JSON); markdown dijamin konsisten & traceable.
//
// Pakai:
//   bun run orchestrator/render.ts               -> tulis docs/00..06
//   bun run orchestrator/render.ts --stdout       -> cetak ke stdout
//   bun run orchestrator/render.ts --state path   -> pakai state tertentu
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import type { SharedState } from "./state";
import { CrossValidator } from "./validator";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DOCS_DIR = join(ROOT, "docs");
const validator = new CrossValidator();

const now = () => new Date().toISOString();

function j(v: unknown): string {
  return "`" + String(v ?? "-") + "`";
}

function loadState(statePath?: string): SharedState {
  const candidates = [
    statePath,
    join(ROOT, "workspace-output", "STATE-SNAPSHOT.json"),
    join(ROOT, "workspace-output", "STATE-INIT.json"),
  ].filter(Boolean) as string[];
  for (const p of candidates) if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  throw new Error("State tidak ditemukan. Jalankan bootstrap dulu.");
}

// ---------------------------------------------------------------- doc 00
function render00(s: SharedState): string {
  const t = s.tech_stack_state || {};
  const rows: (string | undefined)[][] = [
    ["Platform", (t.platforms || []).join(", ")],
    ["Sync Mode", t.sync_mode || "-"],
    ["FE Framework", t.fe?.ui_framework],
    ["FE Pattern", t.fe?.presentation_pattern],
    ["FE DI", t.fe?.di],
    ["FE Networking", t.fe?.networking],
    ["FE LocalDB", t.fe?.local_db],
    ["BE Language", t.be?.language],
    ["BE Framework", t.be?.framework],
    ["BE Architecture", t.be?.architecture_style],
    ["BE System Style", t.be?.system_style],
    ["Auth", t.be?.auth],
    ["DB Engine", t.db?.server_engine],
    ["ORM", t.db?.orm],
    ["Migration", t.db?.migration_tool],
    ["ID Strategy", t.db?.primary_key_strategy],
    ["Repo Strategy", t.repo_strategy],
    ["Module Strategy", t.module_strategy],
  ];
  const status = t.standards?.status || "DRAFT";
  return `# 00 - Tech Stack & Standards (Hukum Dasar)

> Project: **${s.project_meta?.name ?? "-"}** | Profile: ${j(t.profile)} | Status: **${status}**
> Digenerate: ${now()}

## 1. Decision Log
| # | Area | Keputusan | Status |
|---|---|---|---|
${rows.map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1] ?? "-"} | ${status} |`).join("\n")}

## 2. Clean Code Contract (mengikat semua agen)
- Domain layer **100% murni** (tanpa anotasi JSON/ORM/HTTP): ${t.standards?.domain_purity ? "WAJIB" : "opsional"}.
- Pemisahan model **RemoteDTO <-> DatabaseEntity <-> DomainModel** + Mapper eksplisit: ${t.standards?.strict_mapping ? "WAJIB" : "opsional"}.
- Error handling: ${j(t.standards?.error_handling)} (tanpa try-catch di UI/Controller).
- Naming: DB ${j(t.standards?.naming?.db)} | API ${j(t.standards?.naming?.api)} | Linter ${j(t.standards?.naming?.linter)}.

## 3. Strategi Repo & Modularisasi
- Repo: ${j(t.repo_strategy)} | Modul: ${j(t.module_strategy)}
`;
}

// ---------------------------------------------------------------- doc 01
function render01(s: SharedState): string {
  const p = s.prd_state || { functional_requirements: [], user_flows: [] };
  const actors = p.actors || [];
  const frs = p.functional_requirements || [];
  const flows = p.user_flows || [];

  const flowLines: string[] = ["```mermaid", "graph TD", "  START([Mulai])"];
  flows.forEach((f, i) => {
    const id = `F${i + 1}`;
    flowLines.push(`  START --> ${id}["${f.name} (${f.kind || "happy"})"]`);
    (f.steps || []).forEach((_, j2) => {
      flowLines.push(`  ${id} --> ${id}_${j2 + 1}["${f.steps[j2]}"]`);
      if (j2 > 0) flowLines.push(`  ${id}_${j2} --> ${id}_${j2 + 1}`);
    });
    flowLines.push(`  ${id} --> DONE([Selesai])`);
  });
  if (flows.length === 0) flowLines.push("  START --> DONE([Selesai])");
  flowLines.push("```");

  return `# 01 - PRD & Flow

> Project: **${s.project_meta?.name ?? "-"}** | FR: ${frs.length} | Digenerate: ${now()}

## 1. Tujuan & Aktor
- Goal: ${p.app_goal ?? "-"}
- Aktor: ${actors.length ? actors.map((a) => j(a)).join(", ") : "-"}

## 2. Alur (Mermaid)
${flowLines.join("\n")}

## 3. Functional Requirements (MoSCoW)
| ID | Fitur | Prioritas | Aktor | Acceptance Criteria |
|---|---|---|---|---|
${frs
  .map(
    (f) =>
      `| ${f.id} | ${f.feature} | ${f.priority} | ${(f.actors || []).join(", ") || "-"} | ${
        (f.acceptance_criteria || []).join(" / ") || "-"
      } |`,
  )
  .join("\n")}

## 4. Non-Functional Requirements
- Performance: ${(p.non_functional?.performance || []).join("; ") || "-"}
- Security: ${(p.non_functional?.security || []).join("; ") || "-"}
- Scalability: ${(p.non_functional?.scalability || []).join("; ") || "-"}
- Offline: ${(p.non_functional?.offline || []).join("; ") || "-"}
`;
}

// ---------------------------------------------------------------- doc 02
function render02(s: SharedState): string {
  const f = s.fe_state || { screens: [] };
  return `# 02 - FE Architecture

> Platform: ${(f.platforms || []).join(", ") || "-"} | Stack: ${f.tech_stack || "-"} | Digenerate: ${now()}

## 1. Tech Stack & Pattern
- UI: ${j(s.tech_stack_state?.fe?.ui_framework)} | Pattern: ${j(f.architecture_pattern || s.tech_stack_state?.fe?.presentation_pattern)}
- DI: ${j(s.tech_stack_state?.fe?.di)} | Network: ${j(s.tech_stack_state?.fe?.networking)} | Nav: ${j(s.tech_stack_state?.fe?.navigation)} | LocalDB: ${j(s.tech_stack_state?.fe?.local_db)}

## 2. Kontrak State
- State immutable; Intent terpisah; Effect sekali-jalan.
- Wajib menangani UI state: \`loading, data, empty, error\` (+ \`pagination, filter\` untuk layar list).

## 3. Pemetaan Layar (FE-XX)
| FE ID | Layar | Memenuhi FR | UI States | Endpoint (API) |
|---|---|---|---|---|
${(f.screens || [])
  .map(
    (x) =>
      `| ${x.id} | ${x.name} | ${(x.satisfies_fr || []).join(", ")} | ${(
        x.ui_states || []
      ).join(", ")} | ${(x.consumes_api || []).join(", ")} |`,
  )
  .join("\n")}
`;
}

// ---------------------------------------------------------------- doc 03
function render03(s: SharedState): string {
  const b = s.be_state || { modules: [] };
  const rbac = b.rbac || {};
  const errs = b.error_catalog || [];
  return `# 03 - BE Architecture

> Language: ${b.language || "-"} | Framework: ${b.framework || "-"} | Arch: ${b.architecture || "-"} | Digenerate: ${now()}

## 1. Tech Stack & Paradigma
- System: ${j(b.system_style || s.tech_stack_state?.be?.system_style)}
- Aturan: delivery -> usecase -> domain <- data. Domain **murni** (tanpa framework/ORM/HTTP).

## 2. Keamanan & RBAC
| Role | Scopes |
|---|---|
${Object.entries(rbac)
  .map(([r, sc]) => `| ${r} | ${sc.join(", ")} |`)
  .join("\n") || "| - | - |"}

## 3. Pemetaan Module & Transaksi (BE-XX)
| BE ID | UseCase | Memenuhi FR | Validasi Bisnis | Transaksi | Domain Murni |
|---|---|---|---|---|---|
${(b.modules || [])
  .map(
    (m) =>
      `| ${m.id} | ${m.name} | ${(m.satisfies_fr || []).join(", ")} | ${
        (m.validation_rules || []).join("; ") || "-"
      } | ${m.requires_transaction ? "Ya" : "Tidak"} | ${m.domain_uses_framework ? "TIDAK" : "Ya"} |`,
  )
  .join("\n")}

## 4. Error Catalog
| Code | HTTP | Deskripsi |
|---|---|---|
${errs.map((e) => `| ${e.code} | ${e.http_status} | ${e.description || "-"} |`).join("\n") || "| - | - | - |"}
`;
}

// ---------------------------------------------------------------- doc 04
function render04(s: SharedState): string {
  const d = s.db_state || { engine: "PostgreSQL" as const, tables: [] };
  const tables = d.tables || [];

  const erd: string[] = ["```mermaid", "erDiagram"];
  for (const t of tables) {
    for (const rel of t.relations || []) {
      const sym = rel.type === "1:N" ? "||--o{" : rel.type === "N:1" ? "}o--||" : "||--o{";
      erd.push(`  ${t.name.toUpperCase()} ${sym} ${rel.to.table.toUpperCase()} : ${rel.from}`);
    }
  }
  for (const t of tables) {
    erd.push(`  ${t.name.toUpperCase()} {`);
    for (const c of t.columns) erd.push(`    ${c.type} ${c.name}${c.pk ? " PK" : ""}`);
    erd.push("  }");
  }
  erd.push("```");

  const idxRows = tables
    .flatMap((t) => (t.indexes || []).map((i) => `| ${t.name} (${t.id}) | ${i.columns.join(", ")} | ${i.type || "BTREE"} | ${i.reason || "-"} |`))
    .join("\n");

  return `# 04 - Database Schema

> Engine: ${d.engine} | ID: ${d.id_strategy || "-"} | Tabel: ${tables.length} | Digenerate: ${now()}

## 1. ERD (Mermaid)
${erd.join("\n")}

## 2. Tabel (DB-XX)
${tables
  .map(
    (t) =>
      `### ${t.id} - ${t.name} (FR: ${(t.maps_to_fr || []).join(", ") || "-"})\n| Kolom | Tipe | Nullable | PK | FK |\n|---|---|---|---|---|\n${(t.columns || [])
        .map(
          (c) =>
            `| ${c.name} | ${c.type} | ${c.nullable ? "Ya" : "Tidak"} | ${c.pk ? "Ya" : "-"} | ${
              c.fk ? `${c.fk.table}.${c.fk.column}` : "-"
            } |`,
        )
        .join("\n")}`,
  )
  .join("\n\n")}

## 3. Strategi Indexing & Anti-N+1
| Tabel (DB-ID) | Kolom Index | Tipe | Alasan |
|---|---|---|---|
${idxRows || "| - | - | - | - |"}
`;
}

// ---------------------------------------------------------------- doc 05
function render05(s: SharedState): string {
  const a = s.api_state || { base_url: "/api/v1", endpoints: [] };
  const eps = a.endpoints || [];
  return `# 05 - API Contract

> Base URL: ${a.base_url} | Version: ${a.version || "-"} | Endpoint: ${eps.length} | Digenerate: ${now()}

## 1. Unified JSON Envelope
\`\`\`json
{ "success": true, "code": "OK", "message": "string", "data": {}, "meta": { "request_id": "req_...", "timestamp": "${now()}" }, "errors": [] }
\`\`\`

## 2. Katalog Endpoint (API-XX)
| API ID | Method & Path | Dipakai FE | Dilayani BE | FR | Errors |
|---|---|---|---|---|---|
${eps
  .map(
    (e) =>
      `| ${e.id} | ${e.method} ${a.base_url}${e.path} | ${(e.consumed_by_fe || []).join(", ") || "-"} | ${
        (e.served_by_be || []).join(", ") || "-"
      } | ${(e.maps_to_fr || []).join(", ") || "-"} | ${(e.errors || []).join(", ") || "-"} |`,
  )
  .join("\n")}

## 3. Detail Query Params & Response
${eps
  .map(
    (e) =>
      `### ${e.id} - ${e.method} ${e.path}\n- Query params: ${
        (e.query_params || []).map((p) => `${p.name}${p.required ? "*" : ""}`).join(", ") || "-"
      }\n- Auth roles: ${(e.auth_roles || []).join(", ") || "-"}\n${
        e.response_envelope ? `- Response:\n\`\`\`json\n${JSON.stringify(e.response_envelope)}\n\`\`\`` : "- Response: (single/object)"
      }`,
  )
  .join("\n\n")}
`;
}

// ---------------------------------------------------------------- doc 06
function render06(s: SharedState, issues: ReturnType<CrossValidator["validate"]>): string {
  const matrix = validator.traceabilityMatrix(s);
  const blockers = issues.filter((i) => i.severity === "BLOCKER");
  const gatePassed = blockers.length === 0;
  return `# 06 - Audit & Roadmap

> Digenerate: ${now()} | Issues: ${issues.length} | BLOCKER: ${blockers.length} | Gate: **${
    gatePassed ? "APPROVE_GATE" : "CONTINUE_REVISE"
  }**

## 1. Traceability Matrix
| FR ID | Fitur | Prioritas | Screen FE | Endpoint API | UseCase BE | Tabel DB | Status |
|---|---|---|---|---|---|---|---|
${matrix
  .map(
    (m) =>
      `| ${m.fr} | ${m.feature} | ${m.priority} | ${m.fe.join(", ") || "-"} | ${m.api.join(", ") || "-"} | ${
        m.be.join(", ") || "-"
      } | ${m.db.join(", ") || "-"} | ${m.status} |`,
  )
  .join("\n")}

## 2. Temuan & Patch
${issues.length === 0 ? "_Tidak ada temuan._" : issues
  .map(
    (i, n) =>
      `### ${n + 1}. [${i.severity}] ${i.issue_type} -> ${i.target_agent}\n- ${i.description}\n- Patch: ${i.patch || "-"} | Status: ${i.status}`,
  )
  .join("\n")}

## 3. Urutan Eksekusi (Atomic Tasks)
1. Setup workspace + linter + DB migration.
2. Domain layer (murni) + UseCase BE.
3. Data layer BE (Repository Impl + ORM) + API endpoints.
4. FE core + layar FE-XX.
5. Integrasi FE<->API + offline cache + E2E.

> \`gate_passed: ${gatePassed}\`
`;
}

export function renderAll(
  state: SharedState,
  write = true,
  outDir: string = DOCS_DIR,
): Record<string, string> {
  const issues = validator.validate(state);
  const docs: Record<string, string> = {
    "00-TECH-STACK-AND-STANDARDS.md": render00(state),
    "01-PRD-AND-FLOW.md": render01(state),
    "02-FE-ARCHITECTURE.md": render02(state),
    "03-BE-ARCHITECTURE.md": render03(state),
    "04-DATABASE-SCHEMA.md": render04(state),
    "05-API-CONTRACT.md": render05(state),
    "06-AUDIT-AND-ROADMAP.md": render06(state, issues),
  };
  if (write) {
    mkdirSync(outDir, { recursive: true });
    for (const [name, content] of Object.entries(docs)) {
      writeFileSync(join(outDir, name), content, "utf8");
    }
  }
  return docs;
}

function main() {
  const args = process.argv.slice(2);
  const stdout = args.includes("--stdout");
  const si = args.findIndex((a) => a === "--state");
  const di = args.findIndex((a) => a === "--out-dir");
  const state = loadState(si >= 0 ? args[si + 1] : undefined);
  const outDir = di >= 0 ? resolve(args[di + 1]) : DOCS_DIR;
  const docs = renderAll(state, !stdout, outDir);
  if (stdout) {
    for (const [name, content] of Object.entries(docs)) {
      console.log(`\n===== ${name} =====\n`);
      console.log(content);
    }
  } else {
    console.log(`[render] ${Object.keys(docs).length} dokumen -> ${outDir}`);
    for (const name of Object.keys(docs)) console.log(`  - ${name}`);
  }
}

const invokedDirectly =
  !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly || process.env.MAA_FORCE_MAIN === "1") main();
