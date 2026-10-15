// examples/pos-kasir-multitenant/seed.ts
// Turunan multi-tenant dari blueprint POS Kasir: menambah isolasi data per tenant
// (tabel tenants + tenant_id + Row-Level Security + peran Super Admin).
//
// Prasyarat: state dasar sudah ada -> jalankan `bun run examples/pos-kasir/seed.ts` dulu.
// Pakai    : bun run examples/pos-kasir-multitenant/seed.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { SharedState, ColumnDef } from "../../orchestrator/state";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = join(ROOT, "examples", "pos-kasir", "state.json");

if (!existsSync(BASE)) {
  console.error("[seed] Base state tidak ada. Jalankan dulu: bun run examples/pos-kasir/seed.ts");
  process.exit(1);
}

const base = JSON.parse(readFileSync(BASE, "utf8")) as SharedState;
const s: SharedState = structuredClone(base);

// --- Metadata -------------------------------------------------------------
s.project_meta = {
  ...s.project_meta,
  name: "pos-kasir-multitenant",
  description:
    "SaaS kasir/POS multi-tenant offline-first; satu deployment melayani banyak toko dengan isolasi data (RLS).",
};
s.tech_stack_state.profile = "pos-kasir-multitenant";

// --- FR-10 (MUST) ---------------------------------------------------------
s.prd_state.functional_requirements.push({
  id: "FR-10",
  feature: "Manajemen Tenant (Super Admin)",
  description: "Super Admin membuat & mengelola tenant (toko) beserta paket langganannya.",
  business_rules: [
    "Setiap tenant terisolasi (row-level security).",
    "Slug tenant unik.",
    "Menonaktifkan tenant tidak menghapus data.",
  ],
  priority: "MUST",
  actors: ["Super Admin"],
  acceptance_criteria: [
    "Given super admin When buat tenant Then tenant aktif & adminnya dapat login",
    "Given tenant dinonaktifkan When kasir login Then ditolak 403",
  ],
});

// --- tenant_id pada tabel operasional ------------------------------------
const tenantCol = (): ColumnDef => ({
  name: "tenant_id",
  type: "uuid",
  nullable: false,
  fk: { table: "tenants", column: "id" },
});
for (const t of s.db_state.tables) {
  if (["users", "categories", "products", "shifts", "stock_movements", "sales", "sync_log"].includes(t.name)) {
    if (!t.columns.some((c) => c.name === "tenant_id")) t.columns.unshift(tenantCol());
    if (!t.indexes.some((i) => i.columns.includes("tenant_id"))) {
      t.indexes.push({ name: `idx_${t.name}_tenant`, columns: ["tenant_id"], type: "BTREE", reason: "isolasi tenant (RLS)" });
    }
  }
}

// --- DB-11 tenants --------------------------------------------------------
s.db_state.tables.push({
  id: "DB-11",
  name: "tenants",
  maps_to_fr: ["FR-10"],
  columns: [
    { name: "name", type: "text", nullable: false },
    { name: "slug", type: "text", nullable: false, unique: true },
    { name: "plan", type: "text", nullable: false, default: "'FREE'" },
    { name: "status", type: "text", nullable: false, default: "'ACTIVE'" },
    { name: "isolation_policy", type: "text", nullable: false, default: "'RLS'" },
    { name: "id", type: "uuid", nullable: false, pk: true },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
    { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
    { name: "deleted_at", type: "timestamptz", nullable: true },
    { name: "version", type: "int", nullable: false, default: "1" },
  ],
  indexes: [
    { name: "idx_tenants_name", columns: ["name"], type: "BTREE", reason: "pencarian tenant" },
    { name: "uq_tenants_slug", columns: ["slug"], unique: true, type: "BTREE", reason: "slug unik" },
  ],
  relations: [],
  comment: "Isolasi data via Row-Level Security: USING (tenant_id = current_setting('app.tenant_id')::uuid)",
});
s.db_state.notes = [
  ...(s.db_state.notes ?? []),
  "Multi-tenant: aktifkan RLS pada seluruh tabel operasional; set app.tenant_id per request.",
];

// --- FE-11 Pengelolaan Tenant --------------------------------------------
s.fe_state.screens.push({
  id: "FE-11",
  name: "Pengelolaan Tenant",
  route: "/tenants",
  satisfies_fr: ["FR-10"],
  ui_states: ["loading", "data", "empty", "error", "pagination", "filter"],
  consumes_api: ["API-16", "API-17"],
  user_actions: ["tambah tenant", "aktif/nonaktif", "cari tenant"],
});

// --- BE-10 ManageTenant ---------------------------------------------------
s.be_state.modules.push({
  id: "BE-10",
  name: "ManageTenant",
  satisfies_fr: ["FR-10"],
  validation_rules: ["slug unik", "hanya Super Admin", "nonaktif ≠ hapus"],
  requires_transaction: true,
  error_codes: ["ERR_DUPLICATE_SLUG", "ERR_TENANT_INACTIVE"],
});
s.be_state.rbac = {
  ...s.be_state.rbac,
  SuperAdmin: ["tenant:*"],
};
s.be_state.error_catalog = [
  ...(s.be_state.error_catalog ?? []),
  { code: "ERR_DUPLICATE_SLUG", http_status: 409, description: "Slug tenant sudah dipakai" },
  { code: "ERR_TENANT_INACTIVE", http_status: 403, description: "Tenant tidak aktif" },
];

// --- API-16 / API-17 ------------------------------------------------------
s.api_state.endpoints.push(
  {
    id: "API-16",
    method: "GET",
    path: "/tenants",
    maps_to_fr: ["FR-10"],
    consumed_by_fe: ["FE-11"],
    served_by_be: ["BE-10"],
    auth_roles: ["Super Admin"],
    query_params: [
      { name: "name", in: "query", required: false, type: "string", description: "cari nama tenant" },
      { name: "page", in: "query", required: false, type: "int" },
    ],
    response_envelope: { data: [], meta: { page: 1, limit: 20, total: 0 } },
    errors: [401, 403],
  },
  {
    id: "API-17",
    method: "POST",
    path: "/tenants",
    maps_to_fr: ["FR-10"],
    consumed_by_fe: ["FE-11"],
    served_by_be: ["BE-10"],
    auth_roles: ["Super Admin"],
    request_body: { name: "string", slug: "string", plan: "FREE|PRO|ENTERPRISE" },
    response_envelope: { data: { tenant_id: "uuid", slug: "string" }, meta: {} },
    errors: [401, 403, 409, 422],
  },
);

// --- simpan ---------------------------------------------------------------
function write(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  console.log(`[seed] -> ${path}`);
}
write(join(ROOT, "examples", "pos-kasir-multitenant", "state.json"), s);
write(join(ROOT, "workspace-output", "STATE-SNAPSHOT.json"), s);
write(join(ROOT, "workspace-output", "STATE-INIT.json"), s);
console.log(
  `[seed] POS Multi-Tenant: ${s.prd_state.functional_requirements.length} FR, ` +
    `${s.fe_state.screens.length} FE, ${s.be_state.modules.length} BE, ` +
    `${s.db_state.tables.length} DB, ${s.api_state.endpoints.length} API`,
);
