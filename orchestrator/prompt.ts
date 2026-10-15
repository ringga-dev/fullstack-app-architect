// orchestrator/prompt.ts
// Prompt generator yang ramah AI murah.
//
// Menghasilkan prompt MANDIRI (self-contained) untuk satu agen: role + aturan
// keras + konteks minimal (context packing) + template output + checklist + kontrak.
// AI murah cukup menyalin template & mengisi {{...}} tanpa berpikir arsitektur.
//
// Pakai:
//   bun run orchestrator/prompt.ts --step 03 --tier cheap --out
//   bun run orchestrator/prompt.ts --all --tier cheap --out
//   bun run orchestrator/prompt.ts --step 02            (ke stdout)
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import type { SharedState } from "./state";
import { catalogSummary, listProfiles } from "./catalog";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT_DIR = join(ROOT, "workspace-output", "prompts");

type Tier = "cheap" | "standard" | "advanced";

interface StepMeta {
  key: string; // 00..06
  agent: string;
  step: string; // runner step name
  title: string;
  outDoc: string;
  template: string;
  schema: string;
  stateKey: string;
  rules: string[];
}

const STEPS: StepMeta[] = [
  {
    key: "00",
    agent: "discovery-interviewer",
    step: "discovery",
    title: "Discovery — Tech Stack & Standards (Hukum Dasar)",
    outDoc: "docs/00-TECH-STACK-AND-STANDARDS.md",
    template: "templates/docs/00-TECH-STACK-AND-STANDARDS.md",
    schema: "schemas/standards.schema.json",
    stateKey: "tech_stack_state",
    rules: [
      "Isi SEMUA field wajib: FE.ui_framework, BE.language, DB.orm, standards.status.",
      "Gunakan pilihan dari config/stack-catalog.json. Jangan mengarang teknologi di luar katalog.",
      "Set standards.status = \"LOCKED\" HANYA bila semua field wajib terisi.",
    ],
  },
  {
    key: "01",
    agent: "flow-prd-specialist",
    step: "flow-prd",
    title: "Flow & PRD",
    outDoc: "docs/01-PRD-AND-FLOW.md",
    template: "templates/docs/01-PRD-AND-FLOW.md",
    schema: "schemas/prd.schema.json",
    stateKey: "prd_state",
    rules: [
      "Minimal 5 FR, ID berurutan mulai FR-01 tanpa melompati nomor.",
      "Setiap FR punya minimal 1 Acceptance Criteria format Given-When-Then.",
      "Minimal 1 FR berprioritas MUST.",
    ],
  },
  {
    key: "02",
    agent: "fe-architect",
    step: "fe-architect",
    title: "Frontend Architecture",
    outDoc: "docs/02-FE-ARCHITECTURE.md",
    template: "templates/docs/02-FE-ARCHITECTURE.md",
    schema: "schemas/fe.schema.json",
    stateKey: "fe_state",
    rules: [
      "Setiap layar = satu ID FE-XX berurutan.",
      "Setiap FR berprioritas MUST harus muncul di kolom satisfies_fr minimal satu layar.",
      "Setiap layar pakai domain model (BUKAN DTO/Entity): uses_orm_in_ui=false.",
      "Sertakan ui_states minimal: loading, data, empty, error.",
    ],
  },
  {
    key: "03",
    agent: "be-architect",
    step: "be-architect",
    title: "Backend Architecture",
    outDoc: "docs/03-BE-ARCHITECTURE.md",
    template: "templates/docs/03-BE-ARCHITECTURE.md",
    schema: "schemas/be.schema.json",
    stateKey: "be_state",
    rules: [
      "Setiap module = satu ID BE-XX berurutan.",
      "Setiap FR berprioritas MUST harus dipenuhi minimal satu module (satisfies_fr).",
      "Domain layer murni: domain_uses_framework=false dan exposes_orm_model=false.",
      "Setiap module transaksional: requires_transaction=true + error_codes.",
    ],
  },
  {
    key: "04",
    agent: "db-architect",
    step: "db-architect",
    title: "Database & ORM",
    outDoc: "docs/04-DATABASE-SCHEMA.md",
    template: "templates/docs/04-DATABASE-SCHEMA.md",
    schema: "schemas/db.schema.json",
    stateKey: "db_state",
    rules: [
      "Setiap tabel = satu ID DB-XX berurutan.",
      "Setiap tabel WAJIB punya kolom: id, created_at, updated_at, deleted_at, version.",
      "Kolom yang dipakai filter/sort di BE WAJIB punya index.",
      "Sertakan ORM code + SQL DDL.",
    ],
  },
  {
    key: "05",
    agent: "api-designer",
    step: "api-designer",
    title: "API Contract",
    outDoc: "docs/05-API-CONTRACT.md",
    template: "templates/docs/05-API-CONTRACT.md",
    schema: "schemas/api.schema.json",
    stateKey: "api_state",
    rules: [
      "Setiap endpoint = satu ID API-XX berurutan.",
      "Setiap endpoint WAJIB mengisi consumed_by_fe (FE-XX) dan served_by_be (BE-XX) yang benar-benar ada.",
      "Gunakan Unified Envelope yang sama untuk semua endpoint.",
      "Mutasi transaksi: sertakan header X-Idempotency-Key.",
    ],
  },
  {
    key: "06",
    agent: "cross-reviewer",
    step: "cross-reviewer",
    title: "Cross-Review & Audit",
    outDoc: "docs/06-AUDIT-AND-ROADMAP.md",
    template: "templates/docs/06-AUDIT-AND-ROADMAP.md",
    schema: "schemas/prd.schema.json",
    stateKey: "review_log",
    rules: [
      "Isi traceability matrix untuk SEMUA FR.",
      "Cetak minimal 3 temuan + patch konkret.",
      "Tandai gate_passed=true HANYA bila tidak ada BLOCKER.",
    ],
  },
];

function loadState(statePath?: string): SharedState {
  const candidates = [
    statePath,
    join(ROOT, "workspace-output", "STATE-SNAPSHOT.json"),
    join(ROOT, "workspace-output", "STATE-INIT.json"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8")) as SharedState;
  }
  throw new Error(
    "State tidak ditemukan. Jalankan dulu: bun run orchestrator/index.ts --profile <id>",
  );
}

// --- Context packing: kirim HANYA yang dibutuhkan agen ini --------------
function compactContext(state: SharedState, key: string): string {
  const frs = (state.prd_state?.functional_requirements || []).map((f) => ({
    id: f.id,
    feature: f.feature,
    priority: f.priority,
  }));

  switch (key) {
    case "00":
      return JSON.stringify({ project_meta: state.project_meta }, null, 2);
    case "01":
      return JSON.stringify(
        { project_meta: state.project_meta, tech_stack_state: state.tech_stack_state },
        null,
        2,
      );
    case "02":
    case "03":
      return JSON.stringify(
        {
          tech_stack_state: state.tech_stack_state,
          functional_requirements: frs,
        },
        null,
        2,
      );
    case "04":
      return JSON.stringify(
        {
          tech_stack_state_db: state.tech_stack_state?.db,
          functional_requirements: frs,
          be_modules: state.be_state?.modules?.map((m) => ({
            id: m.id,
            name: m.name,
            satisfies_fr: m.satisfies_fr,
            validation_rules: m.validation_rules,
            requires_transaction: m.requires_transaction,
          })),
        },
        null,
        2,
      );
    case "05":
      return JSON.stringify(
        {
          api_base: state.api_state?.base_url,
          functional_requirements: frs,
          fe_screens: state.fe_state?.screens?.map((s) => ({
            id: s.id,
            name: s.name,
            satisfies_fr: s.satisfies_fr,
            consumes_api: s.consumes_api,
          })),
          be_modules: state.be_state?.modules?.map((m) => ({
            id: m.id,
            name: m.name,
            satisfies_fr: m.satisfies_fr,
          })),
          db_tables: state.db_state?.tables?.map((t) => ({ id: t.id, name: t.name })),
        },
        null,
        2,
      );
    case "06":
      return JSON.stringify(
        {
          prd: state.prd_state,
          fe: state.fe_state?.screens,
          be: state.be_state?.modules,
          db: state.db_state?.tables?.map((t) => ({ id: t.id, name: t.name, maps_to_fr: t.maps_to_fr })),
          api: state.api_state?.endpoints,
        },
        null,
        2,
      );
    default:
      return "{}";
  }
}

function tierRules(tier: Tier): string {
  switch (tier) {
    case "cheap":
      return [
        "- Kerjakan SATU agen ini saja. Jangan mengerjakan agen lain.",
        "- SALIN template di bawah PERSIS. Ganti hanya {{...}}.",
        "- JANGAN menambah/menghapus heading atau kolom tabel.",
        "- JANGAN mengarang ID yang belum ada sebelumnya.",
        "- Jika ragu, gunakan nilai default/katalog. Jangan bertanya, langsung isi.",
      ].join("\n");
    case "standard":
      return [
        "- Kerjakan satu agen ini. Ikuti kontrak output & checklist.",
        "- Boleh menyesuaikan isi selama struktur & traceability tetap.",
        "- Jangan mengarang ID di luar pola FR-XX/FE-XX/BE-XX/DB-XX/API-XX.",
      ].join("\n");
    case "advanced":
      return [
        "- Kerjakan satu agen ini secara optimal (boleh usul perbaikan).",
        "- Jaga kontrak output, traceability, dan kebersihan layer.",
      ].join("\n");
  }
}

function buildPrompt(meta: StepMeta, state: SharedState, tier: Tier): string {
  const context = compactContext(state, meta.key);
  const templatePath = join(ROOT, meta.template);
  const template = existsSync(templatePath) ? readFileSync(templatePath, "utf8") : "(template tidak ditemukan)";
  const agentsDir = join(ROOT, "agents");
  const agentFile =
    existsSync(agentsDir)
      ? readdirSync(agentsDir).find((f) => f.startsWith(meta.key + "-") && f.endsWith(".agent.md"))
      : undefined;
  const agentPath = agentFile
    ? join(agentsDir, agentFile)
    : join(agentsDir, `${meta.key}-${meta.agent}.agent.md`);

  const parts: string[] = [];
  parts.push(`# PROMPT — Agen #${meta.key} (${meta.agent})`);
  parts.push("");
  parts.push(`> Tier: ${tier} | Output dokumen: \`${meta.outDoc}\` | State key: \`${meta.stateKey}\``);
  parts.push("");
  parts.push(`## 1. PERAN`);
  parts.push(`Kamu adalah **${meta.agent}** — ${meta.title}.`);
  if (existsSync(agentPath)) {
    parts.push(`Instruksi lengkap peran: \`agents/${agentFile ?? meta.agent + ".agent.md"}\`.`);
  }
  parts.push("");
  parts.push(`## 2. ATURAN KERAS`);
  parts.push(tierRules(tier));
  meta.rules.forEach((r) => parts.push(`- ${r}`));
  parts.push("");
  parts.push(`## 3. KONTEKS (hanya yang kamu butuhkan)`);
  parts.push("```json");
  parts.push(context);
  parts.push("```");
  parts.push("");

  if (meta.key === "00") {
    parts.push(`## 3b. KATALOG TEKNOLOGI (PILIH DARI SINI — jangan mengarang)`);
    try {
      parts.push("```text");
      parts.push(catalogSummary());
      parts.push("```");
    } catch {
      parts.push("(katalog tidak terbaca; lihat config/stack-catalog.json)");
    }
    const profiles = listProfiles();
    if (profiles.length) {
      parts.push("");
      parts.push(`Preset tersedia: ${profiles.map((p) => `\`${p.id}\``).join(", ")}.`);
      parts.push("Jika user tidak memilih, gunakan preset terdekat.");
    }
    parts.push("");
  }
  if (tier !== "advanced") {
    parts.push(`## 3c. CONTOH TERISI (few-shot)`);
    parts.push("Lihat `templates/examples/notes-app.md` — contoh LENGKAP 00..06 yang lolos audit");
    parts.push("(0 issue). Tiru POLA/strukturnya, jangan salin isinya mentah.");
    parts.push("");
    parts.push(`## 4. TEMPLATE OUTPUT (salin persis, isi {{...}})`);
    parts.push("````markdown");
    parts.push(template);
    parts.push("````");
    parts.push("");
  }
  parts.push(`## 5. CHECKLIST`);
  parts.push("- [ ] Semua heading/kolom template ada.");
  parts.push("- [ ] Semua field wajib terisi (tidak ada {{...}} tersisa).");
  parts.push("- [ ] ID berurutan & konsisten (tidak ada ID menganggur).");
  parts.push(`- [ ] Blok \`STATE OUTPUT\` (JSON) valid & sesuai \`${meta.schema}\`.`);
  parts.push("");
  parts.push(`## 6. FORMAT BALASAN (WAJIB)`);
  parts.push("Balas dengan DUA bagian, tanpa penjelasan tambahan:");
  parts.push("1. Isi markdown dokumen (lengkap).");
  parts.push("2. Blok ```json berisi STATE OUTPUT.");
  return parts.join("\n");
}

// --- CLI ----------------------------------------------------------------
function parseArgs(argv: string[]) {
  const out: { steps: string[]; tier: Tier; write: boolean; all: boolean; state?: string } = {
    steps: [],
    tier: "standard",
    write: false,
    all: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--step" || a === "-s") out.steps.push(argv[++i]);
    else if (a === "--tier" || a === "-t") out.tier = (argv[++i] as Tier) || "standard";
    else if (a === "--out" || a === "-o") out.write = true;
    else if (a === "--all") out.all = true;
    else if (a === "--state") out.state = argv[++i];
    else if (a === "--list") out.all = false;
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list") || args.length === 0) {
    console.log("Agen yang tersedia:");
    for (const s of STEPS) console.log(`  ${s.key}  ${s.agent.padEnd(24)} -> ${s.outDoc}`);
    console.log("\nContoh: bun run orchestrator/prompt.ts --step 03 --tier cheap --out");
    return;
  }
  const { steps, tier, write, all, state: statePath } = parseArgs(args);
  const state = loadState(statePath);

  const targets = all ? STEPS : STEPS.filter((s) => steps.includes(s.key) || steps.includes(s.agent));
  if (targets.length === 0) {
    console.error("Tidak ada step cocok. Gunakan --list untuk melihat daftar.");
    process.exit(1);
  }

  for (const meta of targets) {
    const prompt = buildPrompt(meta, state, tier);
    if (write) {
      mkdirSync(OUT_DIR, { recursive: true });
      const file = join(OUT_DIR, `${meta.key}-${meta.agent}.prompt.md`);
      writeFileSync(file, prompt, "utf8");
      console.log(`[prompt] tulis -> ${file} (${prompt.length} chars, tier=${tier})`);
    } else {
      console.log(prompt);
      console.log("\n" + "=".repeat(70) + "\n");
    }
  }
}

const invokedDirectly =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly || process.env.MAA_FORCE_MAIN === "1") {
  main();
}
