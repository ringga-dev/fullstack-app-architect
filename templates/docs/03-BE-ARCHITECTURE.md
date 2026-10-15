<!--
TEMPLATE: docs/03-BE-ARCHITECTURE.md  (Agen #3)
INSTRUKSI: Setiap module = BE-XX. Setiap BE-XX WAJIB memetakan minimal 1 FR-XX.
Domain layer WAJIB murni: set domain_uses_framework=false, exposes_orm_model=false.
-->
# 03 — BE Architecture

## 1. Tech Stack & Paradigma
- Language: {{...}} | Framework: {{...}} | Arch: Clean/Hexagonal | System: {{...}}

## 2. Struktur Folder & Arah Dependensi
```text
src/
├── core/ (config, errors, security, database)
└── modules/<feature>/ (delivery, usecase, domain, data)
```
Aturan: delivery → usecase → domain ← data. Domain TIDAK boleh impor framework/ORM/HTTP.

## 3. Clean Code Rules
- Controller: ≤ 20 baris/endpoint; validasi schema → panggil UseCase → amplop JSON.
- UseCase: 1 kelas = 1 aksi; batas transaksi `UnitOfWork.executeInTransaction { ... }`.
- Domain: aturan bisnis murni & mudah di-unit test.

## 4. Keamanan & RBAC
| Role | Scopes |
|---|---|
| {{Admin}} | {{*}} |
| {{User}} | {{...}} |

## 5. Pemetaan Module & Transaksi
| BE ID | UseCase | Memenuhi FR | Validasi Bisnis Inti | Transaksi ACID |
|---|---|---|---|---|
| BE-01 | {{...}} | FR-01 | {{...}} | Ya |

## 6. Error Catalog
| Code | HTTP | Deskripsi |
|---|---|---|
| ERR_{{...}} | {{409}} | {{...}} |

## STATE OUTPUT
```json
{
  "be_state": {
    "language": "{{...}}",
    "framework": "{{...}}",
    "architecture": "Clean Architecture",
    "system_style": "{{...}}",
    "rbac": { "{{Admin}}": ["*"], "{{User}}": ["{{scope}}"] },
    "modules": [
      { "id": "BE-01", "name": "{{...}}", "satisfies_fr": ["FR-01"], "validation_rules": ["{{...}}"], "requires_transaction": true, "error_codes": ["ERR_{{...}}"], "exposes_orm_model": false, "domain_uses_framework": false }
    ],
    "error_catalog": [ { "code": "ERR_{{...}}", "http_status": 409 } ]
  }
}
```
