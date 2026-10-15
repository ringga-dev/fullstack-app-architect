// examples/pos-kasir/seed.ts
// Blueprint lengkap "POS Kasir Offline-First" sebagai SharedState.
// Menulis: workspace-output/STATE-SNAPSHOT.json + examples/pos-kasir/state.json
//
// Pakai: bun run examples/pos-kasir/seed.ts
// Lalu : bun run orchestrator/validate.ts  &&  bun run orchestrator/render.ts
import { writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initialState } from "../../orchestrator/state";
import type { SharedState, ColumnDef } from "../../orchestrator/state";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const std = (): ColumnDef[] => [
  { name: "id", type: "uuid", nullable: false, pk: true },
  { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
  { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
  { name: "deleted_at", type: "timestamptz", nullable: true },
  { name: "version", type: "int", nullable: false, default: "1" },
];

const state: SharedState = {
  ...initialState({
    name: "pos-kasir",
    platforms: ["Android", "iOS", "Desktop", "Web"],
    architecture_style: "Clean Architecture",
    description: "Aplikasi kasir/POS offline-first multi-platform (Kotlin fullstack).",
  }),

  tech_stack_state: {
    profile: "pos-kasir-offline",
    platforms: ["Android", "iOS", "Desktop", "Web"],
    sync_mode: "offline-first",
    fe: {
      ui_framework: "Compose Multiplatform (CMP)",
      presentation_pattern: "MVI (Unidirectional Data Flow)",
      di: "Koin",
      networking: "Ktor Client",
      navigation: "Voyager / Decompose",
      local_db: "SQLDelight",
    },
    be: {
      language: "Kotlin",
      framework: "Ktor",
      architecture_style: "Clean Architecture",
      system_style: "Modular Monolith",
      auth: "JWT Access + Refresh Rotation",
    },
    db: {
      server_engine: "PostgreSQL",
      orm: "Exposed (Kotlin)",
      migration_tool: "Flyway",
      primary_key_strategy: "UUID v7",
    },
    repo_strategy: "monorepo",
    module_strategy: "package-by-feature",
    standards: {
      domain_purity: true,
      strict_mapping: true,
      error_handling: "Result<T, E>",
      naming: { db: "snake_case_plural", api: "snake_case", linter: "detekt + ktlint" },
      status: "LOCKED",
    },
  },

  prd_state: {
    app_goal:
      "Kasir/POS yang tetap bisa melayani transaksi saat internet putus, lalu menyinkronkan data ke server saat online.",
    actors: ["Kasir", "Admin", "Owner", "Sistem"],
    assumptions: [
      "Setiap toko (store) punya satu server pusat PostgreSQL.",
      "Perangkat kasir menyimpan katalog & transaksi lokal (SQLDelight).",
    ],
    constraints: [
      "Transaksi wajib idempoten (client_reference_id / X-Idempotency-Key).",
      "Harga & total dihitung di server saat sinkronisasi (anti-manipulasi).",
    ],
    functional_requirements: [
      {
        id: "FR-01",
        feature: "Login Kasir (PIN)",
        description: "Kasir login memakai PIN; sesi memakai JWT.",
        business_rules: ["PIN salah 5x -> akun terkunci sementara 5 menit."],
        priority: "MUST",
        actors: ["Kasir", "Admin"],
        acceptance_criteria: [
          "Given kasir terdaftar When input PIN benar Then masuk & token tersimpan",
          "Given PIN salah 5x When submit Then akun terkunci 5 menit",
        ],
      },
      {
        id: "FR-02",
        feature: "Buka/Tutup Shift",
        description: "Kasir membuka shift dengan kas awal dan menutup dengan kas akhir.",
        business_rules: ["Satu kasir hanya boleh punya 1 shift OPEN."],
        priority: "MUST",
        actors: ["Kasir"],
        acceptance_criteria: [
          "Given belum ada shift When buka shift Then shift OPEN dibuat",
          "Given shift OPEN When tutup shift Then selisih kas dihitung",
        ],
      },
      {
        id: "FR-03",
        feature: "Kelola Produk & Kategori",
        description: "Admin membuat/mengubah produk (harga, barcode, kategori).",
        business_rules: ["Barcode unik per toko.", "Harga >= 0."],
        priority: "MUST",
        actors: ["Admin"],
        acceptance_criteria: [
          "Given admin When simpan produk valid Then produk tersimpan",
          "Given barcode duplikat When simpan Then ditolak 409",
        ],
      },
      {
        id: "FR-04",
        feature: "Kelola Stok (Penyesuaian & Opname)",
        description: "Kasir/Admin menyesuaikan stok dan melakukan stok opname.",
        business_rules: ["Stok tidak boleh negatif.", "Setiap perubahan stok tercatat di stock_movements."],
        priority: "MUST",
        actors: ["Admin", "Kasir"],
        acceptance_criteria: [
          "Given produk stok 10 When jual 3 Then stok jadi 7 & movement tercatat",
          "Given penyesuaian When stok hasil negatif Then ditolak 422",
        ],
      },
      {
        id: "FR-05",
        feature: "Transaksi Penjualan (Checkout)",
        description: "Kasir menyusun keranjang lalu membuat transaksi penjualan.",
        business_rules: [
          "Diskon & pajak dihitung server.",
          "Transaksi memakai client_reference_id idempoten.",
        ],
        priority: "MUST",
        actors: ["Kasir"],
        acceptance_criteria: [
          "Given keranjang valid When checkout Then sale tersimpan & stok berkurang",
          "Given request diulang dengan client_reference_id sama Then tidak dobel",
        ],
      },
      {
        id: "FR-06",
        feature: "Pembayaran & Kembalian",
        description: "Kasir mencatat pembayaran (tunai/QRIS/kartu) dan menghitung kembalian.",
        business_rules: ["Total bayar >= total nota.", "Kembalian = bayar - total."],
        priority: "MUST",
        actors: ["Kasir"],
        acceptance_criteria: [
          "Given total 90rb When bayar 100rb tunai Then kembalian 10rb",
          "Given bayar < total When submit Then ditolak 422",
        ],
      },
      {
        id: "FR-07",
        feature: "Sinkronisasi Offline",
        description: "Perangkat mengirim antrean operasi offline ke server saat online.",
        business_rules: ["Batch idempoten.", "Konflik diselesaikan last-write-wins per version."],
        priority: "MUST",
        actors: ["Sistem"],
        acceptance_criteria: [
          "Given ada antrean When online Then batch terkirim & status tersinkron",
          "Given kirim ulang batch sama Then tidak duplikat",
        ],
      },
      {
        id: "FR-08",
        feature: "Laporan Penjualan",
        description: "Admin/Owner melihat laporan penjualan per periode.",
        priority: "SHOULD",
        actors: ["Admin", "Owner"],
        acceptance_criteria: [
          "Given ada transaksi When buka laporan Then total & jumlah nota sesuai",
        ],
      },
      {
        id: "FR-09",
        feature: "Manajemen Pengguna",
        description: "Admin mengelola pengguna (kasir/admin) dan reset PIN.",
        business_rules: ["Role menentukan akses."],
        priority: "SHOULD",
        actors: ["Admin"],
        acceptance_criteria: [
          "Given admin When tambah kasir Then pengguna baru bisa login",
        ],
      },
    ],
    user_flows: [
      {
        id: "UF-01",
        name: "Checkout penjualan",
        kind: "happy",
        steps: ["Pilih produk", "Atur qty/diskon", "Bayar", "Cetak struk", "Simpan lokal"],
      },
      {
        id: "UF-02",
        name: "Sinkronisasi saat online",
        kind: "alternative",
        steps: ["Deteksi online", "Kirim batch antrean", "Terima hasil", "Tandai tersinkron"],
      },
      {
        id: "UF-03",
        name: "Stok tidak cukup",
        kind: "error",
        steps: ["Checkout", "Validasi stok gagal", "Tampilkan error", "Sesuaikan qty"],
      },
    ],
    non_functional: {
      performance: ["Checkout < 200ms lokal", "Sinkronisasi batch <= 500 operasi/permintaan"],
      security: ["PIN di-hash Argon2id", "JWT rotasi refresh", "HTTPS/TLS 1.3"],
      scalability: ["Modular monolith horizontal-ready", "Index pada kolom filter laporan"],
      offline: ["Operasi penuh saat offline", "Antrean sinkron idempoten", "Konflik per-version"],
    },
  },

  fe_state: {
    tech_stack: "Kotlin + Compose Multiplatform (CMP)",
    architecture_pattern: "Clean Architecture + MVI (Unidirectional Data Flow)",
    platforms: ["Android", "iOS", "Desktop", "Web"],
    data_fetching: "Ktor Client + Repository (offline-first, SQLDelight sebagai sumber lokal)",
    offline_cache: "SQLDelight + antrean sinkronisasi lokal",
    screens: [
      { id: "FE-01", name: "Login PIN", route: "/login", satisfies_fr: ["FR-01"], ui_states: ["loading", "empty", "error"], consumes_api: ["API-01"], user_actions: ["input PIN", "submit"] },
      { id: "FE-02", name: "Buka/Tutup Shift", route: "/shift", satisfies_fr: ["FR-02"], ui_states: ["loading", "data", "empty", "error"], consumes_api: ["API-02", "API-03"], user_actions: ["buka shift", "tutup shift"] },
      { id: "FE-03", name: "Katalog Produk", route: "/products", satisfies_fr: ["FR-03"], ui_states: ["loading", "data", "empty", "error", "pagination", "filter"], consumes_api: ["API-04"], user_actions: ["cari", "pilih produk"] },
      { id: "FE-04", name: "Form Produk", route: "/products/edit", satisfies_fr: ["FR-03"], ui_states: ["loading", "data", "empty", "error"], consumes_api: ["API-05", "API-06", "API-08"], user_actions: ["simpan", "sesuaikan stok"] },
      { id: "FE-05", name: "Layar Kasir (Keranjang)", route: "/pos", satisfies_fr: ["FR-05"], ui_states: ["loading", "data", "empty", "error"], consumes_api: ["API-09"], user_actions: ["tambah item", "checkout"] },
      { id: "FE-06", name: "Pembayaran", route: "/pos/pay", satisfies_fr: ["FR-06"], ui_states: ["loading", "empty", "error"], consumes_api: ["API-10"], user_actions: ["pilih metode", "bayar"] },
      { id: "FE-07", name: "Stok & Opname", route: "/stock", satisfies_fr: ["FR-04"], ui_states: ["loading", "data", "empty", "error", "pagination", "filter"], consumes_api: ["API-07"], user_actions: ["filter produk", "catat penyesuaian"] },
      { id: "FE-08", name: "Status Sinkronisasi & Antrean", route: "/sync", satisfies_fr: ["FR-07"], ui_states: ["loading", "data", "empty", "error", "pagination", "filter"], consumes_api: ["API-11", "API-12"], user_actions: ["sinkron sekarang", "lihat antrean"] },
      { id: "FE-09", name: "Laporan Penjualan", route: "/reports", satisfies_fr: ["FR-08"], ui_states: ["loading", "data", "empty", "error", "pagination", "filter"], consumes_api: ["API-13"], user_actions: ["pilih periode", "ekspor"] },
      { id: "FE-10", name: "Manajemen Pengguna", route: "/users", satisfies_fr: ["FR-09"], ui_states: ["loading", "data", "empty", "error", "pagination", "filter"], consumes_api: ["API-14", "API-15"], user_actions: ["tambah", "reset PIN"] },
    ],
  },

  be_state: {
    language: "Kotlin",
    framework: "Ktor",
    architecture: "Clean Architecture",
    system_style: "Modular Monolith",
    rbac: {
      Admin: ["product:*", "stock:*", "user:*", "shift:*", "sale:*", "report:read"],
      Kasir: ["sale:create", "sale:read", "stock:adjust", "shift:open", "shift:close", "product:read"],
      Owner: ["report:read", "product:read", "sale:read"],
    },
    modules: [
      { id: "BE-01", name: "AuthenticateCashier", satisfies_fr: ["FR-01"], validation_rules: ["PIN hash Argon2id", "lockout 5 percobaan"], requires_transaction: false, error_codes: ["ERR_INVALID_CREDENTIALS", "ERR_ACCOUNT_LOCKED"] },
      { id: "BE-02", name: "ManageShift", satisfies_fr: ["FR-02"], validation_rules: ["1 shift OPEN per kasir"], requires_transaction: true, error_codes: ["ERR_SHIFT_ALREADY_OPEN"] },
      { id: "BE-03", name: "ManageProduct", satisfies_fr: ["FR-03"], validation_rules: ["barcode unik per toko", "harga >= 0"], requires_transaction: true, error_codes: ["ERR_DUPLICATE_BARCODE", "ERR_VALIDATION"] },
      { id: "BE-04", name: "ManageStock", satisfies_fr: ["FR-04"], validation_rules: ["stok akhir >= 0"], requires_transaction: true, error_codes: ["ERR_INSUFFICIENT_STOCK", "ERR_VALIDATION"] },
      { id: "BE-05", name: "CreateSale", satisfies_fr: ["FR-05"], validation_rules: ["hitung total/discount/tax di server", "idempoten client_reference_id"], requires_transaction: true, error_codes: ["ERR_INSUFFICIENT_STOCK", "ERR_DUPLICATE_REFERENCE"] },
      { id: "BE-06", name: "ProcessPayment", satisfies_fr: ["FR-06"], validation_rules: ["bayar >= total", "kembalian = bayar - total"], requires_transaction: true, error_codes: ["ERR_PAYMENT_INSUFFICIENT", "ERR_SALE_NOT_FOUND"] },
      { id: "BE-07", name: "SyncOfflineBatch", satisfies_fr: ["FR-07"], validation_rules: ["batch idempoten", "last-write-wins per version"], requires_transaction: true, error_codes: ["ERR_SYNC_PARTIAL", "ERR_VALIDATION"] },
      { id: "BE-08", name: "GenerateSalesReport", satisfies_fr: ["FR-08"], validation_rules: ["filter periode & toko"], requires_transaction: false, error_codes: ["ERR_VALIDATION"] },
      { id: "BE-09", name: "ManageUser", satisfies_fr: ["FR-09"], validation_rules: ["role valid", "PIN di-hash"], requires_transaction: true, error_codes: ["ERR_DUPLICATE_USER", "ERR_VALIDATION"] },
    ],
    error_catalog: [
      { code: "ERR_INVALID_CREDENTIALS", http_status: 401, description: "PIN/kredensial salah" },
      { code: "ERR_ACCOUNT_LOCKED", http_status: 423, description: "Akun terkunci sementara" },
      { code: "ERR_SHIFT_ALREADY_OPEN", http_status: 409, description: "Shift sudah terbuka" },
      { code: "ERR_DUPLICATE_BARCODE", http_status: 409, description: "Barcode duplikat" },
      { code: "ERR_INSUFFICIENT_STOCK", http_status: 422, description: "Stok tidak cukup" },
      { code: "ERR_PAYMENT_INSUFFICIENT", http_status: 422, description: "Pembayaran kurang dari total" },
      { code: "ERR_DUPLICATE_REFERENCE", http_status: 409, description: "client_reference_id sudah dipakai" },
      { code: "ERR_SALE_NOT_FOUND", http_status: 404, description: "Transaksi tidak ditemukan" },
      { code: "ERR_VALIDATION", http_status: 422, description: "Validasi gagal" },
      { code: "ERR_SYNC_PARTIAL", http_status: 207, description: "Sebagian operasi sinkron gagal" },
    ],
    notes: [
      "Domain layer murni: model bisnis tanpa anotasi Exposed/JSON/HTTP.",
      "Repository interface di domain; implementasi Exposed di data layer.",
    ],
  },

  db_state: {
    engine: "PostgreSQL",
    id_strategy: "UUID v7",
    tables: [
      {
        id: "DB-01", name: "users", maps_to_fr: ["FR-01", "FR-09"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false, fk: { table: "stores", column: "id" } },
          { name: "name", type: "text", nullable: false },
          { name: "role", type: "text", nullable: false },
          { name: "pin_hash", type: "text", nullable: false },
          { name: "status", type: "text", nullable: false, default: "'ACTIVE'" },
          { name: "failed_attempts", type: "int", nullable: false, default: "0" },
          { name: "locked_until", type: "timestamptz", nullable: true },
          ...std(),
        ],
        indexes: [
          { name: "idx_users_name", columns: ["name"], type: "BTREE", reason: "pencarian pengguna" },
          { name: "uq_users_store_name", columns: ["store_id", "name"], unique: true, type: "COMPOSITE", reason: "nama unik per toko" },
        ],
        relations: [{ from: "store_id", to: { table: "stores", column: "id" }, type: "N:1", onDelete: "RESTRICT" }],
      },
      {
        id: "DB-02", name: "shifts", maps_to_fr: ["FR-02"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false },
          { name: "user_id", type: "uuid", nullable: false, fk: { table: "users", column: "id" } },
          { name: "opening_cash", type: "bigint", nullable: false },
          { name: "closing_cash", type: "bigint", nullable: true },
          { name: "opened_at", type: "timestamptz", nullable: false, default: "now()" },
          { name: "closed_at", type: "timestamptz", nullable: true },
          { name: "status", type: "text", nullable: false, default: "'OPEN'" },
          ...std(),
        ],
        indexes: [{ name: "idx_shifts_store_status", columns: ["store_id", "status"], type: "COMPOSITE", reason: "shift aktif per toko" }],
        relations: [{ from: "user_id", to: { table: "users", column: "id" }, type: "N:1", onDelete: "RESTRICT" }],
      },
      {
        id: "DB-03", name: "categories", maps_to_fr: ["FR-03"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false },
          { name: "name", type: "text", nullable: false },
          { name: "parent_id", type: "uuid", nullable: true },
          ...std(),
        ],
        indexes: [{ name: "uq_categories_store_name", columns: ["store_id", "name"], unique: true, type: "COMPOSITE", reason: "nama unik per toko" }],
        relations: [],
      },
      {
        id: "DB-04", name: "products", maps_to_fr: ["FR-03", "FR-05"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false },
          { name: "category_id", type: "uuid", nullable: true, fk: { table: "categories", column: "id" } },
          { name: "sku", type: "text", nullable: true },
          { name: "barcode", type: "text", nullable: true },
          { name: "name", type: "text", nullable: false },
          { name: "price", type: "bigint", nullable: false, default: "0" },
          { name: "cost", type: "bigint", nullable: false, default: "0" },
          { name: "stock_qty", type: "int", nullable: false, default: "0" },
          { name: "unit", type: "text", nullable: false, default: "'pcs'" },
          { name: "is_active", type: "boolean", nullable: false, default: "true" },
          { name: "sync_status", type: "text", nullable: false, default: "'SYNCED'" },
          { name: "client_reference_id", type: "uuid", nullable: true },
          ...std(),
        ],
        indexes: [
          { name: "idx_products_name", columns: ["name"], type: "BTREE", reason: "pencarian katalog" },
          { name: "uq_products_barcode", columns: ["barcode"], unique: true, type: "BTREE", reason: "barcode unik" },
        ],
        relations: [],
      },
      {
        id: "DB-05", name: "stock_movements", maps_to_fr: ["FR-04"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false },
          { name: "product_id", type: "uuid", nullable: false, fk: { table: "products", column: "id" } },
          { name: "type", type: "text", nullable: false },
          { name: "quantity", type: "int", nullable: false },
          { name: "reason", type: "text", nullable: true },
          { name: "ref_id", type: "uuid", nullable: true },
          ...std(),
        ],
        indexes: [{ name: "idx_stock_movements_product", columns: ["product_id"], type: "BTREE", reason: "filter riwayat per produk" }],
        relations: [{ from: "product_id", to: { table: "products", column: "id" }, type: "N:1", onDelete: "RESTRICT" }],
      },
      {
        id: "DB-06", name: "sales", maps_to_fr: ["FR-05", "FR-06", "FR-08"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false },
          { name: "shift_id", type: "uuid", nullable: false, fk: { table: "shifts", column: "id" } },
          { name: "user_id", type: "uuid", nullable: false, fk: { table: "users", column: "id" } },
          { name: "number", type: "text", nullable: false },
          { name: "subtotal", type: "bigint", nullable: false, default: "0" },
          { name: "discount", type: "bigint", nullable: false, default: "0" },
          { name: "tax", type: "bigint", nullable: false, default: "0" },
          { name: "total", type: "bigint", nullable: false, default: "0" },
          { name: "status", type: "text", nullable: false, default: "'PENDING'" },
          { name: "client_reference_id", type: "uuid", nullable: true },
          { name: "sync_status", type: "text", nullable: false, default: "'SYNCED'" },
          ...std(),
        ],
        indexes: [
          { name: "idx_sales_store_created", columns: ["store_id", "created_at"], type: "COMPOSITE", reason: "laporan per periode" },
          { name: "uq_sales_client_ref", columns: ["client_reference_id"], unique: true, type: "BTREE", reason: "idempotensi checkout" },
        ],
        relations: [{ from: "shift_id", to: { table: "shifts", column: "id" }, type: "N:1", onDelete: "RESTRICT" }],
      },
      {
        id: "DB-07", name: "sale_items", maps_to_fr: ["FR-05"],
        columns: [
          { name: "sale_id", type: "uuid", nullable: false, fk: { table: "sales", column: "id" } },
          { name: "product_id", type: "uuid", nullable: false, fk: { table: "products", column: "id" } },
          { name: "name_snapshot", type: "text", nullable: false },
          { name: "price", type: "bigint", nullable: false },
          { name: "quantity", type: "int", nullable: false },
          { name: "discount", type: "bigint", nullable: false, default: "0" },
          { name: "line_total", type: "bigint", nullable: false },
          ...std(),
        ],
        indexes: [{ name: "idx_sale_items_sale", columns: ["sale_id"], type: "BTREE", reason: "ambil item per nota" }],
        relations: [{ from: "sale_id", to: { table: "sales", column: "id" }, type: "N:1", onDelete: "CASCADE" }],
      },
      {
        id: "DB-08", name: "payments", maps_to_fr: ["FR-06"],
        columns: [
          { name: "sale_id", type: "uuid", nullable: false, fk: { table: "sales", column: "id" } },
          { name: "method", type: "text", nullable: false },
          { name: "amount", type: "bigint", nullable: false },
          { name: "change_due", type: "bigint", nullable: false, default: "0" },
          { name: "reference", type: "text", nullable: true },
          { name: "status", type: "text", nullable: false, default: "'PAID'" },
          ...std(),
        ],
        indexes: [{ name: "idx_payments_sale", columns: ["sale_id"], type: "BTREE", reason: "pembayaran per nota" }],
        relations: [{ from: "sale_id", to: { table: "sales", column: "id" }, type: "N:1", onDelete: "CASCADE" }],
      },
      {
        id: "DB-09", name: "sync_log", maps_to_fr: ["FR-07"],
        columns: [
          { name: "store_id", type: "uuid", nullable: false },
          { name: "device_id", type: "text", nullable: false },
          { name: "entity", type: "text", nullable: false },
          { name: "operation", type: "text", nullable: false },
          { name: "payload", type: "jsonb", nullable: false },
          { name: "client_reference_id", type: "uuid", nullable: false },
          { name: "status", type: "text", nullable: false, default: "'PENDING'" },
          { name: "attempts", type: "int", nullable: false, default: "0" },
          { name: "synced_at", type: "timestamptz", nullable: true },
          ...std(),
        ],
        indexes: [
          { name: "idx_sync_log_device_status", columns: ["device_id", "status"], type: "COMPOSITE", reason: "antrean per perangkat" },
          { name: "uq_sync_log_ref", columns: ["client_reference_id"], unique: true, type: "BTREE", reason: "idempotensi batch" },
        ],
        relations: [],
      },
      {
        id: "DB-10", name: "stores", maps_to_fr: ["FR-01"],
        columns: [
          { name: "name", type: "text", nullable: false },
          { name: "address", type: "text", nullable: true },
          { name: "tax_percent", type: "numeric(5,2)", nullable: false, default: "0" },
          ...std(),
        ],
        indexes: [{ name: "uq_stores_name", columns: ["name"], unique: true, type: "BTREE", reason: "nama toko unik" }],
        relations: [],
      },
    ],
    enums: [
      { name: "user_role", values: ["ADMIN", "CASHIER", "OWNER"] },
      { name: "sync_status", values: ["PENDING", "SYNCING", "SYNCED", "CONFLICT", "FAILED"] },
    ],
    notes: ["Semua tabel punya kolom audit: created_at, updated_at, deleted_at, version."],
  },

  api_state: {
    base_url: "/api/v1",
    version: "v1",
    envelope: { success: true, code: "string", message: "string", data: {}, meta: {}, errors: [] },
    conventions: { envelope: true, pagination: { key: "page", type: "offset" } },
    endpoints: [
      {
        id: "API-01", method: "POST", path: "/auth/login", maps_to_fr: ["FR-01"],
        consumed_by_fe: ["FE-01"], served_by_be: ["BE-01"], auth_roles: ["public"],
        request_body: { store_id: "uuid", user_id: "uuid", pin: "string" },
        response_envelope: { data: { access_token: "string", refresh_token: "string", role: "string" }, meta: {} },
        errors: [400, 401, 422, 423],
      },
      {
        id: "API-02", method: "POST", path: "/shifts/open", maps_to_fr: ["FR-02"],
        consumed_by_fe: ["FE-02"], served_by_be: ["BE-02"], auth_roles: ["Kasir"],
        request_body: { opening_cash: "bigint" },
        response_envelope: { data: { shift_id: "uuid", status: "OPEN" }, meta: {} },
        errors: [401, 409, 422],
      },
      {
        id: "API-03", method: "POST", path: "/shifts/close", maps_to_fr: ["FR-02"],
        consumed_by_fe: ["FE-02"], served_by_be: ["BE-02"], auth_roles: ["Kasir"],
        request_body: { closing_cash: "bigint" },
        response_envelope: { data: { shift_id: "uuid", status: "CLOSED", difference: "bigint" }, meta: {} },
        errors: [401, 409, 422],
      },
      {
        id: "API-04", method: "GET", path: "/products", maps_to_fr: ["FR-03"],
        consumed_by_fe: ["FE-03"], served_by_be: ["BE-03"], auth_roles: ["Admin", "Kasir"],
        query_params: [
          { name: "name", in: "query", required: false, type: "string", description: "cari nama produk" },
          { name: "page", in: "query", required: false, type: "int" },
        ],
        response_envelope: { data: [], meta: { page: 1, limit: 20, total: 0 } },
        errors: [401],
      },
      {
        id: "API-05", method: "POST", path: "/products", maps_to_fr: ["FR-03"],
        consumed_by_fe: ["FE-04"], served_by_be: ["BE-03"], auth_roles: ["Admin"],
        request_body: { name: "string", price: "bigint", barcode: "string?", category_id: "uuid?" },
        response_envelope: { data: { product_id: "uuid" }, meta: {} },
        errors: [401, 409, 422],
      },
      {
        id: "API-06", method: "PATCH", path: "/products/{id}", maps_to_fr: ["FR-03"],
        consumed_by_fe: ["FE-04"], served_by_be: ["BE-03"], auth_roles: ["Admin"],
        path_params: [{ name: "id", in: "path", required: true, type: "uuid" }],
        request_body: { name: "string?", price: "bigint?", is_active: "boolean?" },
        response_envelope: { data: { product_id: "uuid" }, meta: {} },
        errors: [401, 404, 409, 422],
      },
      {
        id: "API-07", method: "GET", path: "/stock-movements", maps_to_fr: ["FR-04"],
        consumed_by_fe: ["FE-07"], served_by_be: ["BE-04"], auth_roles: ["Admin", "Kasir"],
        query_params: [
          { name: "product_id", in: "query", required: false, type: "uuid", description: "filter per produk" },
          { name: "page", in: "query", required: false, type: "int" },
        ],
        response_envelope: { data: [], meta: { page: 1, limit: 20, total: 0 } },
        errors: [401],
      },
      {
        id: "API-08", method: "POST", path: "/stock-movements", maps_to_fr: ["FR-04"],
        consumed_by_fe: ["FE-04"], served_by_be: ["BE-04"], auth_roles: ["Admin", "Kasir"],
        request_body: { product_id: "uuid", type: "ADJUSTMENT|OPNAME", quantity: "int", reason: "string?" },
        response_envelope: { data: { movement_id: "uuid", stock_qty: "int" }, meta: {} },
        errors: [401, 422],
      },
      {
        id: "API-09", method: "POST", path: "/sales", maps_to_fr: ["FR-05"],
        consumed_by_fe: ["FE-05"], served_by_be: ["BE-05"], auth_roles: ["Kasir"],
        headers: [{ name: "X-Idempotency-Key", in: "header", required: true, type: "uuid" }],
        request_body: { client_reference_id: "uuid", items: [{ product_id: "uuid", quantity: "int", discount: "bigint?" }] },
        response_envelope: { data: { sale_id: "uuid", number: "string", total: "bigint", status: "string" }, meta: {} },
        errors: [401, 409, 422],
      },
      {
        id: "API-10", method: "POST", path: "/sales/{id}/payments", maps_to_fr: ["FR-06"],
        consumed_by_fe: ["FE-06"], served_by_be: ["BE-06"], auth_roles: ["Kasir"],
        path_params: [{ name: "id", in: "path", required: true, type: "uuid" }],
        headers: [{ name: "X-Idempotency-Key", in: "header", required: true, type: "uuid" }],
        request_body: { method: "CASH|QRIS|CARD", amount: "bigint" },
        response_envelope: { data: { payment_id: "uuid", change_due: "bigint", status: "PAID" }, meta: {} },
        errors: [401, 404, 409, 422],
      },
      {
        id: "API-11", method: "POST", path: "/sync/batch", maps_to_fr: ["FR-07"],
        consumed_by_fe: ["FE-08"], served_by_be: ["BE-07"], auth_roles: ["Kasir", "Admin"],
        headers: [{ name: "X-Idempotency-Key", in: "header", required: true, type: "uuid" }],
        request_body: { device_id: "string", operations: [{ entity: "string", operation: "string", client_reference_id: "uuid", payload: "object" }] },
        response_envelope: { data: { results: [], applied: "int", conflicts: "int" }, meta: {} },
        errors: [207, 401, 422],
      },
      {
        id: "API-12", method: "GET", path: "/sync/status", maps_to_fr: ["FR-07"],
        consumed_by_fe: ["FE-08"], served_by_be: ["BE-07"], auth_roles: ["Kasir", "Admin"],
        response_envelope: { data: { pending: "int", last_sync_at: "timestamp" }, meta: { page: 1, limit: 20, total: 0 } },
        errors: [401],
      },
      {
        id: "API-13", method: "GET", path: "/reports/sales", maps_to_fr: ["FR-08"],
        consumed_by_fe: ["FE-09"], served_by_be: ["BE-08"], auth_roles: ["Admin", "Owner"],
        query_params: [
          { name: "created_at", in: "query", required: false, type: "date", description: "periode (from)" },
          { name: "page", in: "query", required: false, type: "int" },
        ],
        response_envelope: { data: [], meta: { page: 1, limit: 20, total: 0, total_amount: 0 } },
        errors: [401],
      },
      {
        id: "API-14", method: "GET", path: "/users", maps_to_fr: ["FR-09"],
        consumed_by_fe: ["FE-10"], served_by_be: ["BE-09"], auth_roles: ["Admin"],
        query_params: [
          { name: "name", in: "query", required: false, type: "string" },
          { name: "page", in: "query", required: false, type: "int" },
        ],
        response_envelope: { data: [], meta: { page: 1, limit: 20, total: 0 } },
        errors: [401],
      },
      {
        id: "API-15", method: "POST", path: "/users", maps_to_fr: ["FR-09"],
        consumed_by_fe: ["FE-10"], served_by_be: ["BE-09"], auth_roles: ["Admin"],
        request_body: { name: "string", role: "ADMIN|CASHIER|OWNER", pin: "string" },
        response_envelope: { data: { user_id: "uuid" }, meta: {} },
        errors: [401, 409, 422],
      },
    ],
  },

  review_log: [],
  revision_round: 0,
  gate_passed: true,
  handoff_ready: true,
};

function write(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  console.log(`[seed] -> ${path}`);
}

write(join(ROOT, "workspace-output", "STATE-SNAPSHOT.json"), state);
write(join(ROOT, "workspace-output", "STATE-INIT.json"), state);
write(join(ROOT, "examples", "pos-kasir", "state.json"), state);
console.log(
  `[seed] POS Kasir: ${state.prd_state.functional_requirements.length} FR, ` +
    `${state.fe_state.screens.length} FE, ${state.be_state.modules.length} BE, ` +
    `${state.db_state.tables.length} DB, ${state.api_state.endpoints.length} API`,
);
