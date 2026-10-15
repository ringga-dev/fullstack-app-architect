# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/) dan
[Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-10-15

Rilis publik pertama (alpha). Mesin arsitektur multi-agen yang menghasilkan
blueprint fullstack ter-traceable dan siap dieksekusi AI coding agent.

### Added
- Orkestrator 7 sub-agen (#0 Discovery s.d. #6 Cross-Reviewer) dengan Shared State JSON dan 3 Gerbang.
- Validator lintas-dokumen (`orchestrator/validator.ts`) + traceability matrix (FR/FE/BE/DB/API).
- Renderer dokumen deterministik `docs/00..06` (`orchestrator/render.ts`).
- Generator prompt mandiri bertingkat `cheap | standard | advanced` (`orchestrator/prompt.ts`).
- Generator backlog task atomik 6 fase dengan `Done when` + `Verify` (`orchestrator/tasks.ts`).
- CI satu-perintah `validate → render → backlog` (`orchestrator/ci.ts`) + workflow GitHub Actions.
- Katalog teknologi luas (`config/stack-catalog.json`) + 8 profil preset.
- Template dokumen (`templates/docs/`) dan kit kode 8 stack (`templates/code/`, termasuk FE Compose/React/Flutter).
- Dua contoh blueprint terverifikasi `APPROVE_GATE`: `pos-kasir` (single-tenant) dan `pos-kasir-multitenant` (SaaS + Row-Level Security).
- Ekspor multi-platform ke OpenCode, Antigraviti, Hermes, Cursor, Cline/Roo (`orchestrator/export.ts`).

### Fixed
- Frontmatter agen kini sesuai OpenCode V2 (`description` + `mode: subagent`); agen diekspor sebagai `NN-nama.md`.
- Adapter shell (`adapters/*.sh`) diubah menjadi wrapper tipis ke satu eksporter (menghapus agen `handoff-compiler` yang usang dan pipeline yang keliru).
- Mesin kini portable: `import.meta.dir` (khusus Bun) diganti `fileURLToPath(import.meta.url)` sehingga jalan di Node.js >= 20.11 via `tsx`.
- Ditambahkan `LICENSE` (MIT) dan metadata paket lengkap.
