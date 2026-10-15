// orchestrator/tasks.ts
// Generator backlog task ATOMIK dari SharedState.
// Tujuan: AI murah cukup mengeksekusi satu task kecil per waktu, dengan kriteria
// "Done when" dan cara "Verify" yang eksplisit.
//
// Pakai:
//   bun run orchestrator/tasks.ts                 -> cetak ke stdout
//   bun run orchestrator/tasks.ts --out           -> tulis workspace-output/BACKLOG.md + .json
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import type { SharedState } from "./state";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT_DIR = join(ROOT, "workspace-output");

interface Task {
  id: string;
  phase: string;
  title: string;
  done_when: string;
  verify: string;
  depends_on: string[];
  refs?: string[];
}

function loadState(statePath?: string): SharedState {
  const candidates = [
    statePath,
    join(OUT_DIR, "STATE-SNAPSHOT.json"),
    join(OUT_DIR, "STATE-INIT.json"),
  ].filter(Boolean) as string[];
  for (const p of candidates) if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  throw new Error("State tidak ditemukan. Jalankan bootstrap dulu.");
}

export function buildTasks(state: SharedState): Task[] {
  const tasks: Task[] = [];
  let n = 0;
  const id = () => `T-${String(++n).padStart(3, "0")}`;

  const tss = state.tech_stack_state || {};
  const linter = tss.standards?.naming?.linter || "linter default stack";
  const migration = tss.db?.migration_tool || "migration tool";

  // Fase 1 - Setup
  tasks.push({
    id: id(),
    phase: "Fase 1 - Setup",
    title: `Inisialisasi workspace (${tss.be?.language || "BE"} + ${tss.fe?.ui_framework || "FE"}) & linter ${linter}`,
    done_when: "Repo ter-build, linter & formatter jalan tanpa error.",
    verify: `jalankan linter (${linter}) -> 0 error`,
    depends_on: [],
  });
  tasks.push({
    id: id(),
    phase: "Fase 1 - Setup",
    title: `Konfigurasi ${migration} & koneksi DB ${tss.db?.server_engine || "(engine)"}`,
    done_when: "Migration tool siap; koneksi DB sukses.",
    verify: `${migration} status / migrate info`,
    depends_on: [],
  });

  // Fase 2 - Domain & UseCase (BE)
  const frs = state.prd_state?.functional_requirements || [];
  const modules = state.be_state?.modules || [];
  for (const m of modules) {
    tasks.push({
      id: id(),
      phase: "Fase 2 - Domain (BE)",
      title: `[${m.id}] Domain model + rules murni (${m.name})`,
      done_when: "Model & aturan bisnis murni ada; tanpa impor ORM/HTTP/JSON.",
      verify: "unit test domain lulus; grep tidak menemukan impor framework di folder domain",
      depends_on: [],
      refs: [m.id, ...(m.satisfies_fr || [])],
    });
    tasks.push({
      id: id(),
      phase: "Fase 2 - Domain (BE)",
      title: `[${m.id}] UseCase ${m.name}${m.requires_transaction ? " (dalam transaksi)" : ""}`,
      done_when: "UseCase memanggil repository interface & mengembalikan Result<T,E>.",
      verify: "unit test usecase (mock repo) lulus",
      depends_on: [],
      refs: [m.id],
    });
  }

  // Fase 3 - Data & Migrasi (DB)
  for (const t of state.db_state?.tables || []) {
    tasks.push({
      id: id(),
      phase: "Fase 3 - Data & Migrasi",
      title: `[${t.id}] Tabel ${t.name} + index`,
      done_when:
        "DDL/ORM entity dibuat dengan kolom id, created_at, updated_at, deleted_at, version; index dibuat.",
      verify: `migrate up sukses; cek index pada tabel ${t.name}`,
      depends_on: [],
      refs: [t.id],
    });
  }
  for (const m of modules) {
    tasks.push({
      id: id(),
      phase: "Fase 3 - Data & Migrasi",
      title: `[${m.id}] Repository impl + Mapper (Entity<->Domain)`,
      done_when: "RepositoryImpl mengimplementasikan port domain; mapper eksplisit tersedia.",
      verify: "integration test repo terhadap DB lulus",
      depends_on: [],
      refs: [m.id],
    });
  }

  // Fase 4 - API
  for (const e of state.api_state?.endpoints || []) {
    tasks.push({
      id: id(),
      phase: "Fase 4 - API",
      title: `[${e.id}] Endpoint ${e.method} ${e.path}`,
      done_when: "Endpoint mengembalikan Unified Envelope; validasi input & role diterapkan.",
      verify: "contract test / curl mengembalikan envelope sesuai skema",
      depends_on: [],
      refs: [e.id, ...(e.served_by_be || [])],
    });
  }

  // Fase 5 - FE
  for (const s of state.fe_state?.screens || []) {
    tasks.push({
      id: id(),
      phase: "Fase 5 - Frontend",
      title: `[${s.id}] Layar ${s.name}`,
      done_when: "Layar menangani state loading/data/empty/error; memakai domain model.",
      verify: "UI test / manual run: semua state tampil",
      depends_on: [],
      refs: [s.id, ...(s.satisfies_fr || [])],
    });
  }

  // Fase 6 - Integrasi
  tasks.push({
    id: id(),
    phase: "Fase 6 - Integrasi",
    title: "Integrasi FE↔API + offline cache/sync",
    done_when: "Data mengalir end-to-end; mode offline/sync berfungsi sesuai sync_mode.",
    verify: "smoke E2E lulus; uji putus koneksi",
    depends_on: [],
  });
  tasks.push({
    id: id(),
    phase: "Fase 6 - Integrasi",
    title: "Audit akhir (traceability, layer, index)",
    done_when: "Semua FR MUST ter-trace ke FE+BE+DB+API; tidak ada BLOCKER.",
    verify: "bun run orchestrator/validate.ts -> APPROVE_GATE",
    depends_on: [],
    refs: frs.filter((f) => f.priority === "MUST").map((f) => f.id),
  });

  return tasks;
}

export function toMarkdown(tasks: Task[], state: SharedState): string {
  const lines: string[] = [];
  lines.push(`# BACKLOG - Atomic Tasks`);
  lines.push("");
  lines.push(`> Project: **${state.project_meta?.name ?? "untitled"}** | Sync: ${state.tech_stack_state?.sync_mode ?? "-"} | Total task: ${tasks.length}`);
  lines.push("> Aturan AI murah: kerjakan SATU task per waktu. Jangan lanjut sebelum `Verify` lulus.");
  lines.push("");
  let currentPhase = "";
  for (const t of tasks) {
    if (t.phase !== currentPhase) {
      currentPhase = t.phase;
      lines.push(`## ${currentPhase}`);
      lines.push("");
    }
    lines.push(`- [ ] **${t.id}** ${t.title}`);
    if (t.refs?.length) lines.push(`      - refs: ${t.refs.join(", ")}`);
    lines.push(`      - Done when: ${t.done_when}`);
    lines.push(`      - Verify: ${t.verify}`);
    if (t.depends_on.length) lines.push(`      - Depends on: ${t.depends_on.join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out") || args.includes("-o");
  const stateArgIdx = args.findIndex((a) => a === "--state");
  const state = loadState(stateArgIdx >= 0 ? args[stateArgIdx + 1] : undefined);
  const tasks = buildTasks(state);
  const md = toMarkdown(tasks, state);

  if (write) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "BACKLOG.md"), md, "utf8");
    writeFileSync(join(OUT_DIR, "BACKLOG.json"), JSON.stringify({ tasks }, null, 2), "utf8");
    console.log(`[tasks] ${tasks.length} task -> ${join(OUT_DIR, "BACKLOG.md")} & BACKLOG.json`);
  } else {
    console.log(md);
  }
}

const invokedDirectly =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly || process.env.MAA_FORCE_MAIN === "1") {
  main();
}
