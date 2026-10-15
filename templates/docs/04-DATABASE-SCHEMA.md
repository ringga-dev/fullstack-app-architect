<!--
TEMPLATE: docs/04-DATABASE-SCHEMA.md  (Agen #4)
INSTRUKSI: Setiap tabel = DB-XX. WAJIB punya kolom standar: id, created_at, updated_at,
deleted_at, version. Jika offline-first: tambah sync_status + client_reference_id.
Setiap kolom yang di-FILTER/SORT di BE WAJIB punya index.
-->
# 04 — Database Schema

## 1. Engine & ID Strategy
- Engine: {{...}} | ID: {{...}} | Migration: {{...}}

## 2. ERD (Mermaid erDiagram)
```mermaid
erDiagram
  {{ORDERS}} ||--o{ {{ORDER_ITEMS}} : has
```

## 3. Skema ORM + SQL DDL
**ORM ({{Exposed|Prisma|...}}):**
```{{kotlin|prisma|ts}}
{{...}}
```
**SQL DDL:**
```sql
CREATE TABLE {{orders}} (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1
  {{, sync_status TEXT, client_reference_id TEXT}}
);
```

## 4. Strategi Indexing & Anti-N+1
| Tabel (DB-ID) | Kolom Index | Tipe | Alasan |
|---|---|---|---|
| {{orders}} (DB-01) | {{store_id, created_at}} | COMPOSITE | {{laporan harian}} |

## STATE OUTPUT
```json
{
  "db_state": {
    "engine": "PostgreSQL",
    "id_strategy": "{{...}}",
    "tables": [
      { "id": "DB-01", "name": "{{orders}}", "maps_to_fr": ["FR-01"],
        "columns": [ {"name":"id","type":"uuid","nullable":false,"pk":true}, {"name":"created_at","type":"timestamptz","nullable":false}, {"name":"deleted_at","type":"timestamptz","nullable":true}, {"name":"version","type":"int","nullable":false,"default":"1"} ],
        "indexes": [ {"name":"idx_{{...}}","columns":["{{...}}"],"type":"COMPOSITE"} ],
        "relations": [] }
    ]
  }
}
```
