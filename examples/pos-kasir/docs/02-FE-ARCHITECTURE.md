# 02 - FE Architecture

> Platform: Android, iOS, Desktop, Web | Stack: Kotlin + Compose Multiplatform (CMP) | Digenerate: 2026-10-15T06:07:59.594Z

## 1. Tech Stack & Pattern
- UI: `Compose Multiplatform (CMP)` | Pattern: `Clean Architecture + MVI (Unidirectional Data Flow)`
- DI: `Koin` | Network: `Ktor Client` | Nav: `Voyager / Decompose` | LocalDB: `SQLDelight`

## 2. Kontrak State
- State immutable; Intent terpisah; Effect sekali-jalan.
- Wajib menangani UI state: `loading, data, empty, error` (+ `pagination, filter` untuk layar list).

## 3. Pemetaan Layar (FE-XX)
| FE ID | Layar | Memenuhi FR | UI States | Endpoint (API) |
|---|---|---|---|---|
| FE-01 | Login PIN | FR-01 | loading, empty, error | API-01 |
| FE-02 | Buka/Tutup Shift | FR-02 | loading, data, empty, error | API-02, API-03 |
| FE-03 | Katalog Produk | FR-03 | loading, data, empty, error, pagination, filter | API-04 |
| FE-04 | Form Produk | FR-03 | loading, data, empty, error | API-05, API-06, API-08 |
| FE-05 | Layar Kasir (Keranjang) | FR-05 | loading, data, empty, error | API-09 |
| FE-06 | Pembayaran | FR-06 | loading, empty, error | API-10 |
| FE-07 | Stok & Opname | FR-04 | loading, data, empty, error, pagination, filter | API-07 |
| FE-08 | Status Sinkronisasi & Antrean | FR-07 | loading, data, empty, error, pagination, filter | API-11, API-12 |
| FE-09 | Laporan Penjualan | FR-08 | loading, data, empty, error, pagination, filter | API-13 |
| FE-10 | Manajemen Pengguna | FR-09 | loading, data, empty, error, pagination, filter | API-14, API-15 |
