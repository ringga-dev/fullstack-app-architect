# 04 - Database Schema

> Engine: PostgreSQL | ID: UUID v7 | Tabel: 10 | Digenerate: 2026-10-15T06:07:59.595Z

## 1. ERD (Mermaid)
```mermaid
erDiagram
  USERS }o--|| STORES : store_id
  SHIFTS }o--|| USERS : user_id
  STOCK_MOVEMENTS }o--|| PRODUCTS : product_id
  SALES }o--|| SHIFTS : shift_id
  SALE_ITEMS }o--|| SALES : sale_id
  PAYMENTS }o--|| SALES : sale_id
  USERS {
    uuid store_id
    text name
    text role
    text pin_hash
    text status
    int failed_attempts
    timestamptz locked_until
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  SHIFTS {
    uuid store_id
    uuid user_id
    bigint opening_cash
    bigint closing_cash
    timestamptz opened_at
    timestamptz closed_at
    text status
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  CATEGORIES {
    uuid store_id
    text name
    uuid parent_id
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  PRODUCTS {
    uuid store_id
    uuid category_id
    text sku
    text barcode
    text name
    bigint price
    bigint cost
    int stock_qty
    text unit
    boolean is_active
    text sync_status
    uuid client_reference_id
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  STOCK_MOVEMENTS {
    uuid store_id
    uuid product_id
    text type
    int quantity
    text reason
    uuid ref_id
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  SALES {
    uuid store_id
    uuid shift_id
    uuid user_id
    text number
    bigint subtotal
    bigint discount
    bigint tax
    bigint total
    text status
    uuid client_reference_id
    text sync_status
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  SALE_ITEMS {
    uuid sale_id
    uuid product_id
    text name_snapshot
    bigint price
    int quantity
    bigint discount
    bigint line_total
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  PAYMENTS {
    uuid sale_id
    text method
    bigint amount
    bigint change_due
    text reference
    text status
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  SYNC_LOG {
    uuid store_id
    text device_id
    text entity
    text operation
    jsonb payload
    uuid client_reference_id
    text status
    int attempts
    timestamptz synced_at
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
  STORES {
    text name
    text address
    numeric(5,2) tax_percent
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
    int version
  }
```

## 2. Tabel (DB-XX)
### DB-01 - users (FR: FR-01, FR-09)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | stores.id |
| name | text | Tidak | - | - |
| role | text | Tidak | - | - |
| pin_hash | text | Tidak | - | - |
| status | text | Tidak | - | - |
| failed_attempts | int | Tidak | - | - |
| locked_until | timestamptz | Ya | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-02 - shifts (FR: FR-02)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | - |
| user_id | uuid | Tidak | - | users.id |
| opening_cash | bigint | Tidak | - | - |
| closing_cash | bigint | Ya | - | - |
| opened_at | timestamptz | Tidak | - | - |
| closed_at | timestamptz | Ya | - | - |
| status | text | Tidak | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-03 - categories (FR: FR-03)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | - |
| name | text | Tidak | - | - |
| parent_id | uuid | Ya | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-04 - products (FR: FR-03, FR-05)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | - |
| category_id | uuid | Ya | - | categories.id |
| sku | text | Ya | - | - |
| barcode | text | Ya | - | - |
| name | text | Tidak | - | - |
| price | bigint | Tidak | - | - |
| cost | bigint | Tidak | - | - |
| stock_qty | int | Tidak | - | - |
| unit | text | Tidak | - | - |
| is_active | boolean | Tidak | - | - |
| sync_status | text | Tidak | - | - |
| client_reference_id | uuid | Ya | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-05 - stock_movements (FR: FR-04)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | - |
| product_id | uuid | Tidak | - | products.id |
| type | text | Tidak | - | - |
| quantity | int | Tidak | - | - |
| reason | text | Ya | - | - |
| ref_id | uuid | Ya | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-06 - sales (FR: FR-05, FR-06, FR-08)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | - |
| shift_id | uuid | Tidak | - | shifts.id |
| user_id | uuid | Tidak | - | users.id |
| number | text | Tidak | - | - |
| subtotal | bigint | Tidak | - | - |
| discount | bigint | Tidak | - | - |
| tax | bigint | Tidak | - | - |
| total | bigint | Tidak | - | - |
| status | text | Tidak | - | - |
| client_reference_id | uuid | Ya | - | - |
| sync_status | text | Tidak | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-07 - sale_items (FR: FR-05)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| sale_id | uuid | Tidak | - | sales.id |
| product_id | uuid | Tidak | - | products.id |
| name_snapshot | text | Tidak | - | - |
| price | bigint | Tidak | - | - |
| quantity | int | Tidak | - | - |
| discount | bigint | Tidak | - | - |
| line_total | bigint | Tidak | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-08 - payments (FR: FR-06)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| sale_id | uuid | Tidak | - | sales.id |
| method | text | Tidak | - | - |
| amount | bigint | Tidak | - | - |
| change_due | bigint | Tidak | - | - |
| reference | text | Ya | - | - |
| status | text | Tidak | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-09 - sync_log (FR: FR-07)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| store_id | uuid | Tidak | - | - |
| device_id | text | Tidak | - | - |
| entity | text | Tidak | - | - |
| operation | text | Tidak | - | - |
| payload | jsonb | Tidak | - | - |
| client_reference_id | uuid | Tidak | - | - |
| status | text | Tidak | - | - |
| attempts | int | Tidak | - | - |
| synced_at | timestamptz | Ya | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

### DB-10 - stores (FR: FR-01)
| Kolom | Tipe | Nullable | PK | FK |
|---|---|---|---|---|
| name | text | Tidak | - | - |
| address | text | Ya | - | - |
| tax_percent | numeric(5,2) | Tidak | - | - |
| id | uuid | Tidak | Ya | - |
| created_at | timestamptz | Tidak | - | - |
| updated_at | timestamptz | Tidak | - | - |
| deleted_at | timestamptz | Ya | - | - |
| version | int | Tidak | - | - |

## 3. Strategi Indexing & Anti-N+1
| Tabel (DB-ID) | Kolom Index | Tipe | Alasan |
|---|---|---|---|
| users (DB-01) | name | BTREE | pencarian pengguna |
| users (DB-01) | store_id, name | COMPOSITE | nama unik per toko |
| shifts (DB-02) | store_id, status | COMPOSITE | shift aktif per toko |
| categories (DB-03) | store_id, name | COMPOSITE | nama unik per toko |
| products (DB-04) | name | BTREE | pencarian katalog |
| products (DB-04) | barcode | BTREE | barcode unik |
| stock_movements (DB-05) | product_id | BTREE | filter riwayat per produk |
| sales (DB-06) | store_id, created_at | COMPOSITE | laporan per periode |
| sales (DB-06) | client_reference_id | BTREE | idempotensi checkout |
| sale_items (DB-07) | sale_id | BTREE | ambil item per nota |
| payments (DB-08) | sale_id | BTREE | pembayaran per nota |
| sync_log (DB-09) | device_id, status | COMPOSITE | antrean per perangkat |
| sync_log (DB-09) | client_reference_id | BTREE | idempotensi batch |
| stores (DB-10) | name | BTREE | nama toko unik |
