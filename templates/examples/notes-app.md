# Contoh Terisi Lengkap (Few-Shot) — "Notes App"

> Gunakan dokumen ini sebagai **referensi pola** saat mengisi template. Perhatikan:
> ID berurutan, setiap FR `MUST` ter-trace ke FE + BE + DB + API, dan envelope JSON konsisten.
> JANGAN menyalin isi ini mentah-mentah — ganti dengan fitur proyekmu.

---

## docs/00-TECH-STACK-AND-STANDARDS.md
- Platforms: Web | Sync mode: online-only
- FE: UI=Next.js | Pattern=Redux Toolkit | DI=Manual | Network=TanStack Query | Nav=TanStack Router
- BE: Language=TypeScript | Framework=NestJS | Arch=Clean Architecture | Auth=OAuth2/OIDC + JWT
- DB: Engine=PostgreSQL | ORM=Prisma | Migration=Prisma Migrate | PK=UUID v7
- Repo: monorepo | Modul: package-by-feature
- Clean Code: domain murni; strict mapping DTO↔Entity↔Domain; `Result<T,E>`; lint ESLint.

## docs/01-PRD-AND-FLOW.md (ringkas)
| ID | Fitur | Prioritas | Acceptance Criteria |
|---|---|---|---|
| FR-01 | Buat catatan | MUST | Given user login When submit judul+isi Then catatan tersimpan |
| FR-02 | Daftar & cari catatan | MUST | Given ada catatan When buka daftar Then tampil & bisa dicari |
| FR-03 | Ubah catatan | SHOULD | Given catatan ada When edit+simpan Then versi bertambah |
| FR-04 | Hapus catatan (soft) | SHOULD | Given catatan ada When hapus Then deleted_at terisi |
| FR-05 | Tandai tag | COULD | Given catatan ada When tambah tag Then relasi tersimpan |

Edge cases: input kosong (422), catatatan tidak ditemukan (404), konflik versi (409).

## docs/02-FE-ARCHITECTURE.md (ringkas)
| FE ID | Layar | Memenuhi FR | UI States | API |
|---|---|---|---|---|
| FE-01 | Daftar & cari catatan | FR-02 | loading,data,empty,error,pagination,filter | API-02 |
| FE-02 | Editor catatan | FR-01, FR-03, FR-05 | loading,data,empty,error | API-01, API-03 |
| FE-03 | Konfirmasi hapus | FR-04 | loading,empty,error | API-04 |

## docs/03-BE-ARCHITECTURE.md (ringkas)
| BE ID | UseCase | Memenuhi FR | Transaksi |
|---|---|---|---|
| BE-01 | CreateNote | FR-01 | Ya |
| BE-02 | ListNotes | FR-02 | Tidak |
| BE-03 | UpdateNote | FR-03 | Ya |
| BE-04 | DeleteNote | FR-04 | Ya |

RBAC: `User:[note:read, note:write]`. Errors: `ERR_NOT_FOUND(404)`, `ERR_VALIDATION(422)`, `ERR_VERSION_CONFLICT(409)`.

## docs/04-DATABASE-SCHEMA.md (ringkas)
- DB-01 `notes` (FR-01..08): id, owner_id, title, body, version, created_at, updated_at, deleted_at
- DB-02 `tags`: id, owner_id, name, created_at, updated_at, deleted_at, version
- DB-03 `note_tags`: note_id, tag_id (junction)
- Index: `notes(owner_id, created_at DESC)`, `notes(title)` GIN trigram (pencarian judul),
  unique partial `tags(owner_id, name) WHERE deleted_at IS NULL`

## docs/05-API-CONTRACT.md (ringkas)
| API ID | Method & Path | Dipakai FE | Dilayani BE | Errors |
|---|---|---|---|---|
| API-01 | POST /api/v1/notes | FE-02 | BE-01 | 400,401,422 |
| API-02 | GET /api/v1/notes | FE-01 | BE-02 | 401 |
| API-03 | PATCH /api/v1/notes/{id} | FE-02 | BE-03 | 401,404,409,422 |
| API-04 | DELETE /api/v1/notes/{id} | FE-03 | BE-04 | 401,404 |

Envelope (semua endpoint):
```json
{ "success": true, "code": "OK", "data": {}, "meta": { "request_id": "req_...", "timestamp": "2026-01-01T00:00:00Z" }, "errors": [] }
```

## docs/06-AUDIT-AND-ROADMAP.md (ringkas)
| FR | FE | API | BE | DB | Status |
|---|---|---|---|---|---|
| FR-01 | FE-02 | API-01 | BE-01 | DB-01 | PASS |
| FR-02 | FE-01 | API-02 | BE-02 | DB-01 | PASS |
| FR-03 | FE-02 | API-03 | BE-03 | DB-01 | PASS |
| FR-04 | FE-03 | API-04 | BE-04 | DB-01 | PASS |
| FR-05 | FE-02 | API-01 | BE-01 | DB-02, DB-03 | PASS |
Temuan contoh: (1) tambahkan index `owner_id`; (2) tambah `X-Idempotency-Key` pada POST; (3) FE-02 belum mendeklarasikan state `empty`.
`gate_passed: true` (tidak ada BLOCKER).

---

## STATE-SNAPSHOT.json (contoh)
```json
{
  "project_meta": { "name": "notes-app", "platforms": ["Web"], "architecture_style": "Clean Architecture" },
  "tech_stack_state": {
    "profile": "ts-web-saas", "platforms": ["Web"], "sync_mode": "online-only",
    "fe": { "ui_framework": "Next.js", "presentation_pattern": "Redux Toolkit", "di": "Manual DI / Composition Root", "networking": "TanStack Query (React Query)", "navigation": "TanStack Router" },
    "be": { "language": "TypeScript / Node.js", "framework": "NestJS", "architecture_style": "Clean Architecture", "system_style": "Modular Monolith", "auth": "OAuth2 / OIDC + JWT" },
    "db": { "server_engine": "PostgreSQL", "orm": "Prisma", "migration_tool": "Prisma Migrate", "primary_key_strategy": "UUID v7" },
    "repo_strategy": "monorepo", "module_strategy": "package-by-feature",
    "standards": { "domain_purity": true, "strict_mapping": true, "error_handling": "Result<T, E>", "naming": { "db": "snake_case_plural", "api": "camelCase", "linter": "ESLint + Prettier" }, "status": "LOCKED" }
  },
  "prd_state": {
    "app_goal": "Aplikasi catatan sederhana",
    "actors": ["User"],
    "functional_requirements": [
      { "id": "FR-01", "feature": "Buat catatan", "priority": "MUST", "actors": ["User"], "acceptance_criteria": ["Given user login When submit Then tersimpan"] },
      { "id": "FR-02", "feature": "Daftar & cari", "priority": "MUST", "actors": ["User"] },
      { "id": "FR-03", "feature": "Ubah catatan", "priority": "SHOULD", "actors": ["User"] },
      { "id": "FR-04", "feature": "Hapus catatan", "priority": "SHOULD", "actors": ["User"] },
      { "id": "FR-05", "feature": "Tag", "priority": "COULD", "actors": ["User"] }
    ],
    "user_flows": [ { "name": "Buat catatan", "kind": "happy", "steps": ["Buka editor", "Isi judul+isi", "Simpan"] } ]
  },
  "fe_state": {
    "tech_stack": "Next.js + Redux Toolkit", "architecture_pattern": "Clean Architecture + UDF", "platforms": ["Web"],
    "screens": [
      { "id": "FE-01", "name": "Daftar & cari catatan", "satisfies_fr": ["FR-02"], "ui_states": ["loading","data","empty","error","pagination","filter"], "consumes_api": ["API-02"] },
      { "id": "FE-02", "name": "Editor catatan", "satisfies_fr": ["FR-01","FR-03","FR-05"], "ui_states": ["loading","data","empty","error"], "consumes_api": ["API-01","API-03"] },
      { "id": "FE-03", "name": "Konfirmasi hapus", "satisfies_fr": ["FR-04"], "ui_states": ["loading","empty","error"], "consumes_api": ["API-04"] }
    ]
  },
  "be_state": {
    "language": "TypeScript / Node.js", "framework": "NestJS", "architecture": "Clean Architecture", "system_style": "Modular Monolith",
    "rbac": { "User": ["note:read", "note:write"] },
    "modules": [
      { "id": "BE-01", "name": "CreateNote", "satisfies_fr": ["FR-01"], "requires_transaction": true },
      { "id": "BE-02", "name": "ListNotes", "satisfies_fr": ["FR-02"] },
      { "id": "BE-03", "name": "UpdateNote", "satisfies_fr": ["FR-03"], "requires_transaction": true },
      { "id": "BE-04", "name": "DeleteNote", "satisfies_fr": ["FR-04"], "requires_transaction": true }
    ],
    "error_catalog": [ { "code": "ERR_NOT_FOUND", "http_status": 404 }, { "code": "ERR_VERSION_CONFLICT", "http_status": 409 } ]
  },
  "db_state": {
    "engine": "PostgreSQL", "id_strategy": "UUID v7",
    "tables": [
      { "id": "DB-01", "name": "notes", "maps_to_fr": ["FR-01","FR-02","FR-03","FR-04"],
        "columns": [ {"name":"id","type":"uuid","nullable":false,"pk":true}, {"name":"owner_id","type":"uuid","nullable":false}, {"name":"title","type":"text","nullable":false}, {"name":"body","type":"text","nullable":true}, {"name":"created_at","type":"timestamptz","nullable":false}, {"name":"updated_at","type":"timestamptz","nullable":false}, {"name":"deleted_at","type":"timestamptz","nullable":true}, {"name":"version","type":"int","nullable":false,"default":"1"} ],
        "indexes": [ {"name":"idx_notes_owner_created","columns":["owner_id","created_at"],"type":"COMPOSITE"}, {"name":"idx_notes_title_trgm","columns":["title"],"type":"GIN","reason":"pencarian judul"} ], "relations": [] },
      { "id": "DB-02", "name": "tags", "maps_to_fr": ["FR-05"], "columns": [ {"name":"id","type":"uuid","nullable":false,"pk":true}, {"name":"owner_id","type":"uuid","nullable":false}, {"name":"name","type":"text","nullable":false}, {"name":"created_at","type":"timestamptz","nullable":false}, {"name":"deleted_at","type":"timestamptz","nullable":true}, {"name":"version","type":"int","nullable":false,"default":"1"} ], "indexes": [], "relations": [] },
      { "id": "DB-03", "name": "note_tags", "maps_to_fr": ["FR-05"], "columns": [ {"name":"note_id","type":"uuid","nullable":false,"pk":true}, {"name":"tag_id","type":"uuid","nullable":false,"pk":true} ], "indexes": [], "relations": [] }
    ]
  },
  "api_state": {
    "base_url": "/api/v1", "version": "v1",
    "envelope": { "success": true, "code": "string", "message": "string", "data": {}, "meta": {}, "errors": [] },
    "endpoints": [
      { "id": "API-01", "method": "POST", "path": "/notes", "maps_to_fr": ["FR-01"], "consumed_by_fe": ["FE-02"], "served_by_be": ["BE-01"], "errors": [400,401,422] },
      { "id": "API-02", "method": "GET", "path": "/notes", "maps_to_fr": ["FR-02"], "consumed_by_fe": ["FE-01"], "served_by_be": ["BE-02"], "query_params": [ {"name":"title","in":"query","required":false,"type":"string"}, {"name":"page","in":"query","required":false,"type":"int"} ], "response_envelope": { "data": [], "meta": { "page": 1, "limit": 20, "total": 0 } }, "errors": [401] },
      { "id": "API-03", "method": "PATCH", "path": "/notes/{id}", "maps_to_fr": ["FR-03"], "consumed_by_fe": ["FE-02"], "served_by_be": ["BE-03"], "errors": [401,404,409,422] },
      { "id": "API-04", "method": "DELETE", "path": "/notes/{id}", "maps_to_fr": ["FR-04"], "consumed_by_fe": ["FE-03"], "served_by_be": ["BE-04"], "errors": [401,404] }
    ]
  },
  "review_log": [],
  "revision_round": 0,
  "gate_passed": true,
  "handoff_ready": true
}
```
