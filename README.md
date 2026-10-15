# Fullstack App Architect — Multi-Agent Architecture Engine

Sistem Orchestrator + Multi-Agent Architecture Engine untuk menghasilkan blueprint arsitektur fullstack yang ter-traceable, lintas-validasi, dan siap dieksekusi AI Coding Agent.

Dirancang untuk **OpenCode** (integrasi agen sudah disesuaikan dengan format V2) dengan format ekspor untuk **Antigraviti**, **Hermes**, **Cursor**, dan **Cline/Roo** (format disediakan, belum diverifikasi resmi per-platform).

> **Status: `v0.1.0` (alpha).** Mesin berjalan end-to-end dan dua blueprint contoh lolos `APPROVE_GATE`. API/skema JSON masih dapat berubah sebelum `1.0`.

## Tujuan

Mengurangi halusinasi dengan membagi konteks ke **7 sub-agen spesialis (Agen #0 – #6)** yang terhubung lewat **Shared State**, mematuhi **Clean Architecture**, serta melewati **3 Gerbang** (Discovery/Locking → Design → Cross-Review) sebelum kode dieksekusi.

Dua keunggulan utama:
- **Cakupan teknologi luas** — katalog `config/stack-catalog.json` mencakup FE/BE/DB/ORM, AI/ML, IoT, game, blockchain, integrasi, keamanan, dan DevOps. Semua kombinasi bebas dipilih (configurable).
- **Ramah "AI murah"** — generator prompt mandiri + template siap-salin + backlog task atomik dengan kriteria `Done when`/`Verify`, sehingga model kecil pun bisa mengikuti langkah demi langkah.

## Struktur

```text
.
├── agents/                # 7 sub-agent (#0..#6) + YAML frontmatter
├── config/
│   ├── stack-catalog.json # KATALOG teknologi (FE/BE/DB/ORM/AI/IoT/dll) — semua bebas dipilih
│   └── profiles/          # preset tech stack (8 preset: pos-kasir-offline, pos-kasir-multitenant, ai-saas-python, ...)
├── templates/
│   ├── docs/              # scaffold 00..06 (siap salin, ramah AI murah)
│   ├── code/              # kit clean architecture (Kotlin/TS/Go/Python/Rust/C#/PHP/FE)
│   └── examples/          # contoh TERISI lengkap (few-shot, lolos audit 0 issue)
├── examples/
│   ├── pos-kasir/         # blueprint POS Kasir lengkap (state.json + docs/ + BACKLOG) + seed.ts
│   └── pos-kasir-multitenant/  # varian multi-tenant (isolasi RLS + Super Admin)
├── schemas/               # JSON Schema (prd/fe/be/db/api/standards)
├── orchestrator/          # state, validator, runner, index, validate, export,
│                          # catalog (loader profile), prompt (generator),
│                          # tasks (backlog), render (dokumen dari state)
├── adapters/              # export ke OpenCode / Antigraviti / Hermes / Cursor / Cline-Roo / Claude Code
├── bin/                   # CLI executable: multi-agent-architect
├── workspace-output/      # state + prompts + BACKLOG (STATE-INIT/SNAPSHOT, RUN-LOG.md)
├── docs/                  # 7 dokumen arsitektur final (00..06)
├── RUNBOOK.md             # panduan langkah-demi-langkah (ramah AI murah)
├── run.sh                 # one-click runner (Linux/macOS/WSL)
└── run.ps1                # one-click runner (Windows PowerShell)
```

## Sub-Agen (7) & 3 Gerbang

| Gerbang | Agent | File | Output |
|---|---|---|---|
| 1 | #0 Discovery Interviewer | `00-discovery-interviewer.agent.md` | `docs/00-TECH-STACK-AND-STANDARDS.md` |
| 2 | #1 Flow & PRD | `01-flow-prd.agent.md` | `docs/01-PRD-AND-FLOW.md` |
| 2 | #2 FE Architect | `02-fe-architect.agent.md` | `docs/02-FE-ARCHITECTURE.md` |
| 2 | #3 BE Architect | `03-be-architect.agent.md` | `docs/03-BE-ARCHITECTURE.md` |
| 2 | #4 DB & ORM Architect | `04-db-architect.agent.md` | `docs/04-DATABASE-SCHEMA.md` |
| 2 | #5 API Designer | `05-api-designer.agent.md` | `docs/05-API-CONTRACT.md` |
| 3 | #6 Cross-Reviewer & Auditor | `06-cross-reviewer.agent.md` | `docs/06-AUDIT-AND-ROADMAP.md` |

Setiap agent punya **YAML frontmatter** (`name`, `role`, `output_file`, `input_dependencies`) sehingga bisa dipanggil sebagai subagent.

## Cross-Review Gates (Agent 06)

0. **Standards Locked (Gerbang 1)** – `tech_stack_state.standards.status === "LOCKED"` beserta keputusan FE/BE/DB wajib terisi
1. **Traceability** – Setiap `FR-XX` ber-prioritas `MUST` wajib ter-trace ke `FE-XX` + `BE-XX` + `DB-XX` + `API-XX`
2. **Payload Sync** – UI state FE (`loading`/`error`/`empty`/`pagination`/`filter`) terwakili di API
3. **Schema & Performance** – GET + filter/sort wajib punya index DB; waspada N+1
4. **Decoupling** – Logika bisnis krusial tidak boleh eksklusif di FE
5. **Clean Code & Layer Boundary** – Domain wajib murni (tak ada ORM/DTO/framework bocor ke Domain/UI); strict mapping DTO ↔ Entity ↔ Domain
6. **Reference Integrity** – Tidak ada ID menganggur (`FE-XX`/`BE-XX`/`DB-XX`/`API-XX` yang tidak terdefinisi)

## Konvensi ID (Traceability)

- `FR-XX` – Functional Requirement (PRD)
- `FE-XX` – Frontend Screen
- `BE-XX` – Backend Module / Use Case
- `DB-XX` – Database Table
- `API-XX` – API Endpoint
- Severity: `BLOCKER` | `MAJOR` | `MINOR`
- Status Review: `OPEN` | `IN_PROGRESS` | `RESOLVED` | `REJECTED`

## Requirement Runtime

Mesin bersifat **portable** (tidak memakai API khusus Bun seperti `import.meta.dir`). Pilih salah satu:

| Runtime | Versi | Cara menjalankan |
| --- | --- | --- |
| **Bun** (disarankan) | `>= 1.1` | `bun run orchestrator/<file>.ts` — tercepat, tanpa dependensi. |
| **Node.js + tsx** | Node `>= 20.11` | `npx tsx orchestrator/<file>.ts` (ganti `bun run` → `npx tsx`). |

```bash
bun --version     # disarankan
node --version    # alternatif (>= 20.11 bila tidak memakai Bun)
```

> Belum ada Bun? Pasang dari https://bun.sh — atau `npm i -g tsx` lalu gunakan `npx tsx`.

## Cara Pakai

### A) One-Click (paling cepat)

**Linux/macOS/WSL/Git Bash**

```bash
chmod +x run.sh
./run.sh --name my-app --idea "Buat aplikasi todo dengan auth + CRUD"
```

**Windows (PowerShell)**

```powershell
.\run.ps1 -Name my-app -Idea "Buat aplikasi todo dengan auth + CRUD"
```

Script ini otomatis export agents ke `.opencode/`, `.antigraviti/`, `.hermes/` lalu menjalankan orchestrator.

### B) Pakai Binary CLI Langsung

Butuh `bun` atau `tsx`.

```bash
# via bun
bun run orchestrator/index.ts --name my-app --idea "..."

# via bin
./bin/multi-agent-architect --name my-app --idea "..."

# global (opsional)
npm link   # lalu: multi-agent-architect --name my-app --idea "..."
```

### C) Integrasi ke OpenCode / Antigraviti / Hermes

**Cara utama (cross-platform, tanpa bash)** — pakai exporter TypeScript:

```bash
bun run orchestrator/export.ts opencode
bun run orchestrator/export.ts antigraviti
bun run orchestrator/export.ts hermes
# atau semua target sekaligus:
bun run orchestrator/export.ts all
```

Atau lewat npm script (tetap memakai bun di balik layar):

```bash
npm run export:opencode
npm run export:antigraviti
npm run export:hermes
npm run export:all
```

**Cara alternatif (Linux/macOS/WSL/Git Bash)** — pakai script shell:

```bash
bash adapters/opencode.sh
bash adapters/antigraviti.sh
bash adapters/hermes.sh
```

Hasil export:
- OpenCode: `.opencode/agents/*.agent.md` (auto-detected), `.opencode/skills/multi-agent-architect/`
- Antigraviti: `.antigraviti/agents/*.agent.md` + `~/.config/antigraviti/agents/`
- Hermes: `.hermes/agents/*.agent.md` + `~/.config/hermes/agents/`

Di OpenCode kamu bisa langsung invoke subagent: `flow-prd-specialist`, `fe-architect`, `be-architect`, `db-architect`, `api-designer`, `cross-reviewer`.

### D) Export Semua Sekaligus

```bash
bun run orchestrator/export.ts all   # atau: npm run export:all
```

### E) IDE Lain (Cursor/Claude Code/Cline-Roo)

```bash
bun run orchestrator/export.ts cursor
bun run orchestrator/export.ts claude
bun run orchestrator/export.ts cline
```

Atau via script shell (Linux/macOS): `bash adapters/cursor-rules.sh`, dst.

## Workflow Rekomendasi (Pipeline 7 Agen – 3 Gerbang)

```
GERBANG 1 (Discovery & Locking)
00-discovery-interviewer  → docs/00-TECH-STACK-AND-STANDARDS.md   [LOCKED]
     │
GERBANG 2 (Isolated Specialist Design)
01-flow-prd
     ├── 02-fe-architect   (paralel)
     └── 03-be-architect   (paralel)
04-db-architect   (butuh PRD + BE)
05-api-designer   (butuh PRD + FE + BE + DB)
     │
GERBANG 3 (Quality Gate & Cross-Review)
06-cross-reviewer → jika ada BLOCKER, ulangi agen terkait (loop) → APPROVE_GATE
```

Prompt pemicu (langsung ke Coding Agent):

> "Bertindaklah sebagai Orchestrator. Baca seluruh instruksi sub-agen di folder `agents/` (`00` sampai `06`). Mulai dari Agen #0 untuk mewawancarai saya soal Tech Stack & Standar Clean Code, lalu jalankan Agen #1–#6 secara berurutan dan hasilkan 7 dokumen di folder `docs/`."

Verifikasi hasil audit secara offline:

```bash
bun run orchestrator/validate.ts            # baca workspace-output/STATE-SNAPSHOT.json
bun run orchestrator/validate.ts path/to/state.json
```

## Katalog Teknologi & Profile (Semua Bebas Dipilih)

Semua stack tersedia di `config/stack-catalog.json`: platform, sync mode, FE (web/mobile/desktop),
BE (bahasa/framework), DB (relasional/dokumen/vektor/…), ORM, migration, AI/ML, IoT, game,
blockchain, integrasi (payment/auth/email), messaging, keamanan, DevOps, dan tier pembaca AI.

```bash
bun run orchestrator/catalog.ts summary       # ringkasan seluruh katalog
bun run orchestrator/catalog.ts list          # daftar profile preset
bun run orchestrator/catalog.ts state <id>    # tech_stack_state dari sebuah profile
bun run orchestrator/index.ts --name my-app --profile pos-kasir-offline --idea "..."
```

Profile = **preset**, bukan pengunci. Kamu bebas mengubah setiap field. Buat preset sendiri
dengan menyalin file di `config/profiles/`.

## Mode AI Murah (Prompt Generator + Task Atomik)

Agar model kecil/murah bisa mengikuti, engine menyediakan:

1. **Prompt mandiri per agen** — berisi role + aturan keras + konteks minimal (_context packing_)
   + template siap-salin + checklist + kontrak output.

   ```bash
   bun run orchestrator/prompt.ts --step 03 --tier cheap --out
   # -> workspace-output/prompts/03-be-architect.prompt.md  (berikan isinya ke AI)
   bun run orchestrator/prompt.ts --all --tier cheap --out   # 7 prompt sekaligus
   ```

2. **Backlog task atomik** — tiap task punya `Done when` & `Verify`; kerjakan satu per waktu.

   ```bash
   bun run orchestrator/tasks.ts --out
   # -> workspace-output/BACKLOG.md + BACKLOG.json
   ```

3. **Tier** menyesuaikan tingkat scaffolding:

   | Tier | Untuk | Perilaku |
   |---|---|---|
   | `cheap` | model kecil/murah | salin template persis, isi `{{...}}`, 1 keputusan/step |
   | `standard` | model menengah | ikuti kontrak, sedikit penyesuaian |
   | `advanced` | model besar | boleh optimasi & usul perbaikan |

Panduan lengkap: lihat **[`RUNBOOK.md`](RUNBOOK.md)**.

## Render Dokumen dari State (Deterministik)

AI cukup mengisi **STATE OUTPUT (JSON)**; markdown `docs/00..06` di-render otomatis — dijamin
konsisten & traceable (tanpa halusinasi format).

```bash
bun run orchestrator/render.ts                        # -> docs/00..06
bun run orchestrator/render.ts --state <file> --out-dir <dir>
```

## Contoh Blueprint Lengkap (POS Kasir)

Dua blueprint utuh yang **lolos audit (0 issue, APPROVE_GATE)**:

```bash
# 1) POS Kasir offline-first (9 FR, 10 FE, 9 BE, 10 DB, 15 API)
bun run examples/pos-kasir/seed.ts
bun run orchestrator/ci.ts

# 2) POS Kasir MULTI-TENANT / SaaS (10 FR, 11 FE, 10 BE, 11 DB, 17 API)
#    (butuh langkah 1 dulu) -> menambah isolasi RLS + peran Super Admin
bun run examples/pos-kasir-multitenant/seed.ts
bun run orchestrator/ci.ts --state examples/pos-kasir-multitenant/state.json \
  --out-dir examples/pos-kasir-multitenant/docs
```

Hasil tersimpan di `examples/<nama>/` (`state.json`, `docs/00..06`, `BACKLOG.md`).
Stack: Kotlin + Ktor + PostgreSQL/Exposed + Compose Multiplatform (MVI) + SQLDelight, offline-first.

## CI Otomatis (GitHub Actions)

`orchestrator/ci.ts` menjalankan **validate → render → backlog** sekaligus, dan **gagal (exit 2)**
bila ada BLOCKER. Cocok untuk gerbang PR.

```bash
bun run orchestrator/ci.ts                      # state default (workspace-output)
bun run orchestrator/ci.ts --state <file> --out-dir <dir>
```

Workflow siap pakai: **`.github/workflows/architecture-check.yml`** (regenerate contoh → gate →
unggah artefak `docs/` + `workspace-output/CI-REPORT.json`).

## Tips

- Jangan edit `workspace-output/` manual kecuali debug
- Fokus perbaiki `review_log`, bukan rewrite total blueprint
- Cross-Reviewer harus tetap independen
- Pertahankan ID `FR-XX`, `FE-XX`, `BE-XX`, `DB-XX`, `API-XX` persis seperti yang didefinisikan
- Gunakan `SharedState` (`workspace-output/STATE-*.json`) sebagai **single source of truth**

## Dokumentasi

- [Quick Start](docs/QUICKSTART.md) — satu halaman untuk langsung pakai
- [Panduan Lengkap](docs/GUIDE.md) — detail alur, validator, renderer, prompt, tasks, CI, ekspor
- [OpenCode](docs/OPENCODE.md) — cara pakai di OpenCode (agen V2)
- [Changelog](CHANGELOG.md) — riwayat perubahan

## Lisensi

Dirilis di bawah [MIT License](LICENSE) © 2026 Fullstack App Architect contributors.

Riwayat perubahan ada di [`CHANGELOG.md`](CHANGELOG.md). Ganti URL `CHANGE_ME` di
`package.json` (repository/homepage/bugs) dengan repo Anda sebelum publikasi.
