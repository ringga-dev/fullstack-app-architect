<!--
TEMPLATE: docs/00-TECH-STACK-AND-STANDARDS.md  (Agen #0)
INSTRUKSI: Ganti setiap {{...}}. JANGAN tambah/hapus heading. JANGAN mengarang ID.
Isi hanya dari jawaban user + katalog (config/stack-catalog.json). Jika ragu, pakai default profile.
-->
# 00 — Tech Stack & Standards (Hukum Dasar)

> Status: {{DRAFT | LOCKED}}

## 1. Decision Log
| # | Area | Keputusan | Alternatif | Alasan | Status |
|---|---|---|---|---|---|
| 1 | Platform | {{...}} | {{...}} | {{...}} | LOCKED |
| 2 | Sync Mode | {{...}} | {{...}} | {{...}} | LOCKED |
| 3 | FE Framework | {{...}} | {{...}} | {{...}} | LOCKED |
| 4 | FE Pattern | {{...}} | {{...}} | {{...}} | LOCKED |
| 5 | BE Language/Framework | {{...}} | {{...}} | {{...}} | LOCKED |
| 6 | DB Engine | {{...}} | {{...}} | {{...}} | LOCKED |
| 7 | ORM / Query | {{...}} | {{...}} | {{...}} | LOCKED |
| 8 | Migration | {{...}} | {{...}} | {{...}} | LOCKED |
| 9 | ID Strategy | {{...}} | {{...}} | {{...}} | LOCKED |
| 10 | Repo / Modul | {{...}} | {{...}} | {{...}} | LOCKED |

## 2. Ringkasan Tech Stack
- Platforms: {{...}}
- Sync mode: {{offline-first | online-only | real-time | hybrid | local-only | configurable}}
- FE: UI={{...}} | Pattern={{...}} | DI={{...}} | Network={{...}} | Nav={{...}} | LocalDB={{...}}
- BE: Language={{...}} | Framework={{...}} | Arch={{...}} | System={{...}} | Auth={{...}}
- DB: Engine={{...}} | ORM={{...}} | Migration={{...}} | PK={{...}}

## 3. Strategi Repo & Modularisasi
- Repo: {{monorepo | multi-repo}}
- Modul: {{strict-multi-module | package-by-feature | package-by-layer | ...}}
- Contoh pohon folder (3 tingkat): 
```text
{{...}}
```

## 4. Clean Code Contract (WAJIB, mengikat semua agen)
- [ ] Domain layer 100% murni (tanpa anotasi JSON/ORM/HTTP).
- [ ] Pemisahan model: RemoteDTO ↔ DatabaseEntity ↔ DomainModel + Mapper eksplisit.
- [ ] Error handling: `Result<T, E>` / `Either<Failure, Success>`; tanpa try-catch di UI/Controller.
- [ ] Naming: DB `snake_case` plural; API `{{snake_case | camelCase}}`; Linter `{{...}}`.

## 5. Risiko & Catatan
- {{...}}

## STATE OUTPUT
```json
{
  "tech_stack_state": {
    "profile": "{{id-atau-null}}",
    "platforms": ["{{...}}"],
    "sync_mode": "{{...}}",
    "fe": { "ui_framework": "{{...}}", "presentation_pattern": "{{...}}", "di": "{{...}}", "networking": "{{...}}", "navigation": "{{...}}", "local_db": "{{...}}" },
    "be": { "language": "{{...}}", "framework": "{{...}}", "architecture_style": "Clean Architecture", "system_style": "Modular Monolith", "auth": "{{...}}" },
    "db": { "server_engine": "{{...}}", "orm": "{{...}}", "migration_tool": "{{...}}", "primary_key_strategy": "{{...}}" },
    "repo_strategy": "{{monorepo|multi-repo}}",
    "module_strategy": "{{...}}",
    "standards": {
      "domain_purity": true,
      "strict_mapping": true,
      "error_handling": "Result<T, E>",
      "naming": { "db": "snake_case_plural", "api": "{{...}}", "linter": "{{...}}" },
      "status": "LOCKED"
    }
  }
}
```
