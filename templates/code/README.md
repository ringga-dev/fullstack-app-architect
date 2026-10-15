# Code Templates — Clean Architecture Kit

Tujuan: memberi **contoh konkret** tiap layer agar agen (terutama AI murah) cukup menyalin pola,
bukan mengarang arsitektur. Semua contoh mematuhi aturan:

- **Domain murni**: tanpa anotasi JSON/ORM/HTTP.
- **Strict mapping**: `RemoteDTO ↔ DatabaseEntity ↔ DomainModel` via `Mapper` eksplisit.
- **Result wrapper**: `Result<T, E>` / `Either<Failure, Success>`; tanpa `try-catch` di UI/Controller.

## File
- `backend-kotlin.md` — Ktor + Exposed + Exposed DAO + Result.
- `backend-typescript.md` — NestJS/Fastify + Prisma/Drizzle + Result.
- `backend-go.md` — Fiber/Gin + sqlc/GORM + Result.
- `backend-python.md` — FastAPI + SQLAlchemy 2.0 + Result/Exception.
- `backend-rust.md` — Axum + SQLx + trait error.
- `backend-csharp.md` — ASP.NET Core Minimal API + EF Core.
- `backend-php.md` — Laravel/Symfony + Eloquent + DomainError.
- `frontend.md` — MVI/MVVM state contract (Compose / React / Flutter).
- `fe-compose.md` — Compose Multiplatform (MVI + Koin + Ktor + SQLDelight).
- `fe-react.md` — React (Redux Toolkit + TanStack Query + Zod).
- `fe-flutter.md` — Flutter (Riverpod + go_router + Drift).

## Cara pakai (AI murah)
1. Pilih file sesuai stack dari `config/profiles/*.json`.
2. Salin blok kode, ganti nama entitas (`Order` → `{{Entity}}` proyekmu).
3. Jangan mengubah struktur layer; hanya isi bisnisnya.
