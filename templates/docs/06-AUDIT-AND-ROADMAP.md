<!--
TEMPLATE: docs/06-AUDIT-AND-ROADMAP.md  (Agen #6)
INSTRUKSI: Isi traceability matrix untuk SEMUA FR. Minimal 3 temuan + patch.
Jangan tandai PASS jika ada ID yang tidak terdefinisi. Cetak APPROVE_GATE hanya jika 0 BLOCKER.
-->
# 06 — Audit & Roadmap

## 1. Traceability Matrix
| FR ID | Fitur | Screen FE | Endpoint API | UseCase BE | Tabel DB | Status |
|---|---|---|---|---|---|---|
| FR-01 | {{...}} | FE-01 | API-01 | BE-01 | DB-01 | {{PASS/REVISI}} |

## 2. Temuan & Patch
| # | Severity | Target Agen | Temuan | Patch |
|---|---|---|---|---|
| 1 | {{BLOCKER}} | {{be-architect}} | {{...}} | {{...}} |

## 3. Urutan Eksekusi Coding Agent (Atomic Tasks)
- [ ] Fase 1: Setup workspace + linter + {{DB migration}}
- [ ] Fase 2: Domain layer (murni) + UseCase BE
- [ ] Fase 3: Data layer BE + API endpoints
- [ ] Fase 4: FE core + layar FE-XX
- [ ] Fase 5: Integrasi FE↔API + offline cache + E2E

## REVIEW LOG OUTPUT
```json
{
  "review_log": [
    { "target_agent": "{{...}}", "issue_type": "{{...}}", "severity": "BLOCKER", "related_fe": [], "related_be": [], "related_db": [], "related_api": [], "description": "{{...}}", "patch": "{{...}}", "status": "OPEN" }
  ],
  "gate_passed": false
}
```
