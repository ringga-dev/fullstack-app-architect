# 03 - BE Architecture

> Language: Kotlin | Framework: Ktor | Arch: Clean Architecture | Digenerate: 2026-10-15T06:07:59.708Z

## 1. Tech Stack & Paradigma
- System: `Modular Monolith`
- Aturan: delivery -> usecase -> domain <- data. Domain **murni** (tanpa framework/ORM/HTTP).

## 2. Keamanan & RBAC
| Role | Scopes |
|---|---|
| Admin | product:*, stock:*, user:*, shift:*, sale:*, report:read |
| Kasir | sale:create, sale:read, stock:adjust, shift:open, shift:close, product:read |
| Owner | report:read, product:read, sale:read |
| SuperAdmin | tenant:* |

## 3. Pemetaan Module & Transaksi (BE-XX)
| BE ID | UseCase | Memenuhi FR | Validasi Bisnis | Transaksi | Domain Murni |
|---|---|---|---|---|---|
| BE-01 | AuthenticateCashier | FR-01 | PIN hash Argon2id; lockout 5 percobaan | Tidak | Ya |
| BE-02 | ManageShift | FR-02 | 1 shift OPEN per kasir | Ya | Ya |
| BE-03 | ManageProduct | FR-03 | barcode unik per toko; harga >= 0 | Ya | Ya |
| BE-04 | ManageStock | FR-04 | stok akhir >= 0 | Ya | Ya |
| BE-05 | CreateSale | FR-05 | hitung total/discount/tax di server; idempoten client_reference_id | Ya | Ya |
| BE-06 | ProcessPayment | FR-06 | bayar >= total; kembalian = bayar - total | Ya | Ya |
| BE-07 | SyncOfflineBatch | FR-07 | batch idempoten; last-write-wins per version | Ya | Ya |
| BE-08 | GenerateSalesReport | FR-08 | filter periode & toko | Tidak | Ya |
| BE-09 | ManageUser | FR-09 | role valid; PIN di-hash | Ya | Ya |
| BE-10 | ManageTenant | FR-10 | slug unik; hanya Super Admin; nonaktif ≠ hapus | Ya | Ya |

## 4. Error Catalog
| Code | HTTP | Deskripsi |
|---|---|---|
| ERR_INVALID_CREDENTIALS | 401 | PIN/kredensial salah |
| ERR_ACCOUNT_LOCKED | 423 | Akun terkunci sementara |
| ERR_SHIFT_ALREADY_OPEN | 409 | Shift sudah terbuka |
| ERR_DUPLICATE_BARCODE | 409 | Barcode duplikat |
| ERR_INSUFFICIENT_STOCK | 422 | Stok tidak cukup |
| ERR_PAYMENT_INSUFFICIENT | 422 | Pembayaran kurang dari total |
| ERR_DUPLICATE_REFERENCE | 409 | client_reference_id sudah dipakai |
| ERR_SALE_NOT_FOUND | 404 | Transaksi tidak ditemukan |
| ERR_VALIDATION | 422 | Validasi gagal |
| ERR_SYNC_PARTIAL | 207 | Sebagian operasi sinkron gagal |
| ERR_DUPLICATE_SLUG | 409 | Slug tenant sudah dipakai |
| ERR_TENANT_INACTIVE | 403 | Tenant tidak aktif |
