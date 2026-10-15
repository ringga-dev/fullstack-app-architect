# 00 - Tech Stack & Standards (Hukum Dasar)

> Project: **pos-kasir** | Profile: `pos-kasir-offline` | Status: **LOCKED**
> Digenerate: 2026-10-15T07:14:40.968Z

## 1. Decision Log
| # | Area | Keputusan | Status |
|---|---|---|---|
| 1 | Platform | Android, iOS, Desktop, Web | LOCKED |
| 2 | Sync Mode | offline-first | LOCKED |
| 3 | FE Framework | Compose Multiplatform (CMP) | LOCKED |
| 4 | FE Pattern | MVI (Unidirectional Data Flow) | LOCKED |
| 5 | FE DI | Koin | LOCKED |
| 6 | FE Networking | Ktor Client | LOCKED |
| 7 | FE LocalDB | SQLDelight | LOCKED |
| 8 | BE Language | Kotlin | LOCKED |
| 9 | BE Framework | Ktor | LOCKED |
| 10 | BE Architecture | Clean Architecture | LOCKED |
| 11 | BE System Style | Modular Monolith | LOCKED |
| 12 | Auth | JWT Access + Refresh Rotation | LOCKED |
| 13 | DB Engine | PostgreSQL | LOCKED |
| 14 | ORM | Exposed (Kotlin) | LOCKED |
| 15 | Migration | Flyway | LOCKED |
| 16 | ID Strategy | UUID v7 | LOCKED |
| 17 | Repo Strategy | monorepo | LOCKED |
| 18 | Module Strategy | package-by-feature | LOCKED |

## 2. Clean Code Contract (mengikat semua agen)
- Domain layer **100% murni** (tanpa anotasi JSON/ORM/HTTP): WAJIB.
- Pemisahan model **RemoteDTO <-> DatabaseEntity <-> DomainModel** + Mapper eksplisit: WAJIB.
- Error handling: `Result<T, E>` (tanpa try-catch di UI/Controller).
- Naming: DB `snake_case_plural` | API `snake_case` | Linter `detekt + ktlint`.

## 3. Strategi Repo & Modularisasi
- Repo: `monorepo` | Modul: `package-by-feature`
