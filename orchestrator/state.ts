// orchestrator/state.ts
// Shared State contract for the 6-agent architecture engine.
// ID taxonomy: FR-XX (requirement), FE-XX (screen), BE-XX (module),
// DB-XX (table), API-XX (endpoint). Cross-reviewer traces across all of them.

export type Priority = "MUST" | "SHOULD" | "COULD" | "WON'T";

// ---------------------------------------------------------------------------
// Discovery / Tech Stack & Standards (Agent 00) - "Hukum Dasar"
// ---------------------------------------------------------------------------
export interface TechStackState {
  /** Preset profile id (config/profiles/*.json). Opsional; pilihan tetap bebas. */
  profile?: string;
  platforms?: string[];
  sync_mode?:
    | "offline-first"
    | "online-only"
    | "real-time"
    | "hybrid"
    | "local-only"
    | "configurable";
  fe?: {
    ui_framework?: string;
    presentation_pattern?: string;
    di?: string;
    networking?: string;
    navigation?: string;
    local_db?: string;
  };
  be?: {
    language?: string;
    framework?: string;
    architecture_style?: string;
    system_style?: string;
    auth?: string;
  };
  db?: {
    server_engine?: string;
    orm?: string;
    migration_tool?: string;
    primary_key_strategy?: string;
  };
  repo_strategy?: "monorepo" | "multi-repo";
  module_strategy?:
    | "strict-multi-module"
    | "package-by-feature"
    | "package-by-layer";
  standards?: {
    domain_purity?: boolean;
    strict_mapping?: boolean;
    error_handling?: string;
    naming?: { db?: string; api?: string; linter?: string };
    status?: "DRAFT" | "LOCKED";
  };
}

// ---------------------------------------------------------------------------
// PRD (Agent 01)
// ---------------------------------------------------------------------------
export interface FunctionalRequirement {
  id: string; // FR-XX
  feature: string;
  description?: string;
  business_rules?: string[];
  priority: Priority;
  actors: string[];
  acceptance_criteria?: string[];
}

export interface UserFlow {
  id?: string;
  name: string;
  kind?: "happy" | "alternative" | "error";
  steps: string[];
}

export interface NFR {
  performance?: string[];
  security?: string[];
  scalability?: string[];
  offline?: string[];
}

export interface PRDState {
  app_goal?: string;
  actors?: string[];
  functional_requirements: FunctionalRequirement[];
  user_flows: UserFlow[];
  non_functional?: NFR;
  assumptions?: string[];
  constraints?: string[];
}

// ---------------------------------------------------------------------------
// FE (Agent 02)
// ---------------------------------------------------------------------------
export interface FeScreen {
  id: string; // FE-XX
  name: string;
  route?: string;
  satisfies_fr: string[]; // ["FR-01", ...]
  ui_states?: string[]; // loading, data, empty, error, pagination, filter ...
  user_actions?: string[];
  consumes_api?: string[]; // ["API-01", ...]
  state_holders?: string[];
  critical_business_logic?: boolean;
  // clean-code boundary flags (audited by Agent 06)
  uses_orm_in_ui?: boolean; // should be false
  has_domain_layer?: boolean;
}

export interface FEState {
  tech_stack: string;
  architecture_pattern?: string;
  platforms: string[];
  screens: FeScreen[];
  shared_components?: string[];
  data_fetching?: string;
  offline_cache?: string;
  notes?: string[];
}

// ---------------------------------------------------------------------------
// BE (Agent 03)
// ---------------------------------------------------------------------------
export interface BeModule {
  id: string; // BE-XX
  name: string;
  satisfies_fr: string[]; // ["FR-01", ...]
  validation_rules?: string[];
  requires_transaction?: boolean;
  error_codes?: string[];
  // clean-code boundary flags (audited by Agent 06)
  exposes_orm_model?: boolean; // domain/delivery leaking ORM entity (should be false)
  domain_uses_framework?: boolean; // domain importing framework/ORM (should be false)
}

export interface BEState {
  language: string;
  framework?: string;
  architecture: string; // e.g. "Clean Architecture / Hexagonal"
  system_style?: string; // "Modular Monolith" | "Microservices"
  rbac?: Record<string, string[]>; // role -> scopes
  modules: BeModule[];
  error_catalog?: Array<{ code: string; http_status: number; description?: string }>;
  notes?: string[];
}

// ---------------------------------------------------------------------------
// DB (Agent 04)
// ---------------------------------------------------------------------------
export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  pk?: boolean;
  fk?: { table: string; column: string };
  unique?: boolean;
  default?: string;
  comment?: string;
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: "BTREE" | "HASH" | "GIN" | "GIST" | "COMPOSITE";
  reason?: string;
}

export interface RelationDef {
  from: string;
  to: { table: string; column: string };
  type: "1:N" | "N:1" | "1:1" | "N:N";
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT";
}

export interface TableDef {
  id: string; // DB-XX
  name: string;
  maps_to_fr?: string[]; // ["FR-01", ...]
  columns: ColumnDef[];
  indexes: IndexDef[];
  relations: RelationDef[];
  comment?: string;
}

export interface DBState {
  engine: "PostgreSQL" | "MySQL" | "SQLite" | "SQLServer" | "Other";
  id_strategy?: string; // "UUID v7" | "ULID" | "BigInt auto-increment"
  tables: TableDef[];
  enums?: Array<{ name: string; values: string[] }>;
  notes?: string[];
}

// ---------------------------------------------------------------------------
// API (Agent 05)
// ---------------------------------------------------------------------------
export interface EndpointParam {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  type: string;
  description?: string;
}

export interface Endpoint {
  id: string; // API-XX
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  maps_to_fr: string[]; // ["FR-01", ...]
  consumed_by_fe?: string[]; // ["FE-01", ...]
  served_by_be?: string[]; // ["BE-01", ...]
  auth_roles?: string[];
  description?: string;
  query_params?: EndpointParam[];
  path_params?: EndpointParam[];
  headers?: EndpointParam[];
  request_body?: any;
  response_envelope?: any;
  errors?: number[]; // [400, 401, 422, ...]
  notes?: string[];
}

export interface APIState {
  base_url: string;
  version?: string;
  envelope?: any;
  endpoints: Endpoint[];
  conventions?: {
    envelope?: boolean;
    pagination?: { key: string; type: "offset" | "cursor" };
    error_format?: any;
  };
}

// ---------------------------------------------------------------------------
// Review log (Agent 06)
// ---------------------------------------------------------------------------
export interface ReviewIssue {
  id?: string;
  target_agent:
    | "discovery-interviewer"
    | "flow-prd"
    | "fe-architect"
    | "be-architect"
    | "db-architect"
    | "api-designer"
    | "cross-reviewer";
  source?: "cross-reviewer";
  issue_type:
    | "STANDARDS_UNLOCKED"
    | "MISSING_TRACE"
    | "MISSING_FIELD"
    | "PAYLOAD_MISMATCH"
    | "INDEX_MISSING"
    | "N1_RISK"
    | "DESIGN_VIOLATION"
    | "DECOUPLING_VIOLATION"
    | "LAYER_VIOLATION"
    | "DANGLING_REF"
    | "SCHEMA_VIOLATION"
    | "NAMING_CONFLICT"
    | "OTHER";
  related_fr?: string[];
  related_fe?: string[];
  related_be?: string[];
  related_db?: string[];
  related_api?: string[];
  description: string;
  severity: "BLOCKER" | "MAJOR" | "MINOR";
  patch?: string;
  suggestion?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  resolved_by_agent?: string;
  resolved_at?: string;
}

// ---------------------------------------------------------------------------
// Project meta + SharedState
// ---------------------------------------------------------------------------
export interface ProjectMeta {
  name: string;
  platforms: Array<"Android" | "iOS" | "Desktop" | "Web" | string>;
  architecture_style: string;
  description?: string;
  repo_root?: string;
  created_at?: string;
}

export interface SharedState {
  project_meta: ProjectMeta;
  tech_stack_state: TechStackState;
  prd_state: PRDState;
  fe_state: FEState;
  be_state: BEState;
  db_state: DBState;
  api_state: APIState;
  review_log: ReviewIssue[];
  revision_round?: number;
  gate_passed?: boolean;
  handoff_ready?: boolean;
}

export const initialState = (meta: Partial<ProjectMeta> = {}): SharedState => ({
  project_meta: {
    name: "untitled-app",
    platforms: ["Web"],
    architecture_style: "Clean Architecture",
    ...meta,
  },
  tech_stack_state: {},
  prd_state: { functional_requirements: [], user_flows: [] },
  fe_state: {
    tech_stack: "TypeScript + React/Next.js",
    architecture_pattern: "Clean Architecture + MVVM/MVI",
    platforms: ["Web"],
    screens: [],
  },
  be_state: {
    language: "TypeScript",
    architecture: "Clean Architecture / Hexagonal",
    system_style: "Modular Monolith",
    modules: [],
  },
  db_state: { engine: "PostgreSQL", id_strategy: "UUID v7", tables: [] },
  api_state: { base_url: "/api/v1", version: "v1", endpoints: [] },
  review_log: [],
  revision_round: 0,
  gate_passed: false,
  handoff_ready: false,
});
