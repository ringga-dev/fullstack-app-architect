# RUNBOOK — Cara Menjalankan (Ramah AI Murah)

Panduan ini dibuat agar **AI model kecil/murah** (atau manusia) bisa mengikuti tanpa menebak.
Aturan emas: **satu langkah, satu agen, satu file.**

---

## 0. Prasyarat

- **Bun** terpasang: cek dengan `bun --version`.
  Jika belum: https://bun.sh  (atau pakai `npx tsx` untuk mengganti `bun run`).
- Tidak butuh bash/Node. Semua lewat Bun.

---

## 1. Quick Start (3 langkah)

```bash
# 1) Lihat profile teknologi yang tersedia
bun run orchestrator/catalog.ts list

# 2) Bootstrap proyek dengan profile (mengunci tech stack jadi STATE-INIT.json)
bun run orchestrator/index.ts --name pos-kasir --profile pos-kasir-offline --idea "Aplikasi kasir/POS offline-first"

# 3) Cek pilihan teknologimu (opsional)
bun run orchestrator/catalog.ts show pos-kasir-offline
```

Hasil:
```text
workspace-output/STATE-INIT.json      # state awal (tech stack terkunci)
workspace-output/STATE-SNAPSHOT.json  # state kerja (diperbarui tiap agen)
workspace-output/RUN-LOG.md           # progres
docs/                                 # 7 dokumen arsitektur (diisi agen)
```

---

## 2. Alur Menjalankan 7 Agen (untuk AI murah)

Untuk tiap agen `NN`, lakukan **5 langkah** berikut. Jangan lompat.

```bash
# Langkah A — buat prompt mandiri untuk agen ke-NN (template sudah disisipkan)
bun run orchestrator/prompt.ts --step NN --tier cheap --out
#   -> workspace-output/prompts/NN-<agen>.prompt.md
```

**Langkah B — berikan isi file prompt itu ke AI kamu** (copy-paste seluruh isinya).
AI akan membalas DUA bagian: (1) markdown dokumen, (2) blok ```json STATE OUTPUT.

**Langkah C — simpan markdown-nya** ke `docs/NN-...md` (nama file sudah tertera di prompt).

**Langkah D — gabungkan blok JSON STATE OUTPUT** ke `workspace-output/STATE-SNAPSHOT.json`
(lihat contoh di bagian 4).

**Langkah E — audit:**
```bash
bun run orchestrator/validate.ts
```
Jika `RESULT: APPROVE_GATE` -> lanjut agen berikutnya. Jika ada `BLOCKER`, perbaiki dulu.

Urutan agen: `00 -> 01 -> 02 & 03 -> 04 -> 05 -> 06`.

> **Contoh terisi (few-shot):** `templates/examples/notes-app.md` berisi dokumen 00..06 yang
> sudah lengkap dan **lolos audit (0 issue)**. Minta AI meniru POLA-nya (bukan menyalin isinya).

### Sekali jalan (generate semua prompt + backlog)
```bash
bun run orchestrator/prompt.ts --all --tier cheap --out   # 7 prompt ke workspace-output/prompts/
bun run orchestrator/tasks.ts --out                        # backlog atomik ke workspace-output/BACKLOG.md
```

---

## 3. Memilih Teknologi (bebas / configurable)

Semua kombinasi teknologi diizinkan — ambil dari `config/stack-catalog.json`.

```bash
bun run orchestrator/catalog.ts summary     # ringkasan semua kategori
bun run orchestrator/catalog.ts list        # daftar profile preset
bun run orchestrator/catalog.ts state <id>  # tech_stack_state dari sebuah profile
```

Profile hanyalah **preset**; kamu bebas mengubah field apa pun di `STATE-INIT.json`.

Membuat profile sendiri: salin `config/profiles/pos-kasir-offline.json`, ubah isinya,
simpan sebagai `config/profiles/<id>.json`, lalu pakai `--profile <id>`.

---

## 4. Menggabungkan STATE OUTPUT

`STATE-SNAPSHOT.json` berbentuk objek berisi beberapa bagian. Setelah agen mengembalikan
blok JSON, salin isinya ke bagian yang sesuai (nama bagian = `state key` di prompt):

```json
{
  "project_meta": { "...": "..." },
  "tech_stack_state": { "...": "dari Agen #0" },
  "prd_state":        { "...": "dari Agen #1" },
  "fe_state":         { "...": "dari Agen #2" },
  "be_state":         { "...": "dari Agen #3" },
  "db_state":         { "...": "dari Agen #4" },
  "api_state":        { "...": "dari Agen #5" },
  "review_log":       [ "...", "dari Agen #6" ],
  "revision_round": 0,
  "gate_passed": false,
  "handoff_ready": false
}
```

> Tips AI murah: jangan mengarang ID. FR-XX/FE-XX/BE-XX/DB-XX/API-XX harus berurutan
> dan saling merujuk dengan benar.

---

## 5. Backlog Task Atomik

```bash
bun run orchestrator/tasks.ts --out
```
Menghasilkan `workspace-output/BACKLOG.md` (+ `.json`): daftar task berurutan,
tiap task punya **Done when** dan **Verify**. AI murah: kerjakan **satu task per waktu**.

---

## 5b. Render Dokumen dari State (opsional, deterministik)

Kalau AI kamu kesulitan menulis markdown rapi: cukup isi JSON, lalu render otomatis.

```bash
bun run orchestrator/render.ts        # -> docs/00..06
```

Hasil dijamin konsisten dengan state & lulus struktur audit.

---

## 5c. Contoh Blueprint Terisi (POS Kasir)

```bash
bun run examples/pos-kasir/seed.ts
bun run orchestrator/validate.ts      # APPROVE_GATE (0 issue)
bun run orchestrator/render.ts
bun run orchestrator/tasks.ts --out
```

Lihat `examples/pos-kasir/` untuk `state.json`, `docs/`, dan `BACKLOG.md` sebagai referensi.

**Varian multi-tenant (SaaS):**
```bash
bun run examples/pos-kasir-multitenant/seed.ts   # butuh langkah di atas
bun run orchestrator/ci.ts --state examples/pos-kasir-multitenant/state.json \
  --out-dir examples/pos-kasir-multitenant/docs
```

---

## 5d. CI Otomatis (sekali jalan)

```bash
bun run orchestrator/ci.ts
```

Menjalankan **validate + render + backlog** dan menulis `workspace-output/CI-REPORT.json`.
Exit `0` = APPROVE_GATE, `2` = ada BLOCKER, `1` = error. Sudah terpasang di
`.github/workflows/architecture-check.yml`.

---

## 6. Tier Prompt

| Tier | Untuk siapa | Perilaku |
|---|---|---|
| `cheap` | model kecil/murah | Salin template persis, isi `{{...}}`, 1 keputusan/step |
| `standard` | model menengah | Ikuti kontrak, sedikit penyesuaian |
| `advanced` | model besar | Boleh optimasi & usul perbaikan |

```bash
bun run orchestrator/prompt.ts --step 03 --tier cheap --out
bun run orchestrator/prompt.ts --step 03 --tier advanced
```

---

## 7. Export ke Platform AI Coding Agent

```bash
bun run orchestrator/export.ts all
```
Menyalin agen + `config/` + `templates/` + skema ke:
`.opencode/`, `.antigraviti/`, `.hermes/`, `.cursor/`, `.roo/`, `.clinerules/`.

---

## 8. Troubleshooting

| Masalah | Solusi |
|---|---|
| `State tidak ditemukan` | Jalankan bootstrap: `bun run orchestrator/index.ts --profile <id>` |
| `Profile "x" tidak ditemukan` | Lihat daftar: `bun run orchestrator/catalog.ts list` |
| Prompt kosong/tidak lengkap | Pastikan `templates/docs/NN-*.md` ada |
| `RESULT: CONTINUE_REVISE` | Ada BLOCKER; lihat bagian yang dilaporkan `validate.ts` |
| Tulisan aneh di PowerShell | File tetap UTF-8; buka dengan editor yang mendukung UTF-8 |
