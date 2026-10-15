// orchestrator/catalog.ts
// Loader untuk katalog stack (`config/stack-catalog.json`) dan profile preset
// (`config/profiles/*.json`). Semua opsi bebas dipilih per proyek; profile
// hanyalah preset yang bisa di-override.
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import type { SharedState, TechStackState, ProjectMeta } from "./state";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CONFIG_DIR = join(ROOT, "config");
const CATALOG_PATH = join(CONFIG_DIR, "stack-catalog.json");
const PROFILES_DIR = join(CONFIG_DIR, "profiles");

export interface StackCatalog {
  version: string;
  description?: string;
  principles?: string[];
  [key: string]: any;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  project_meta?: Partial<ProjectMeta>;
  tech_stack_state?: TechStackState;
  notes?: string[];
}

function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadCatalog(): StackCatalog {
  if (!existsSync(CATALOG_PATH)) {
    throw new Error(`Stack catalog tidak ditemukan: ${CATALOG_PATH}`);
  }
  return readJSON<StackCatalog>(CATALOG_PATH);
}

export function catalogPath(): string {
  return CATALOG_PATH;
}

export function listProfiles(): Profile[] {
  if (!existsSync(PROFILES_DIR)) return [];
  return readdirSync(PROFILES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJSON<Profile>(join(PROFILES_DIR, f)));
}

export function loadProfile(idOrPath: string): Profile {
  if (!idOrPath) throw new Error("Nama profile wajib diisi.");
  // 1) path langsung
  if (existsSync(idOrPath) && idOrPath.endsWith(".json")) {
    return readJSON<Profile>(resolve(idOrPath));
  }
  // 2) id di config/profiles
  const direct = join(PROFILES_DIR, `${idOrPath}.json`);
  if (existsSync(direct)) return readJSON<Profile>(direct);
  const match = listProfiles().find((p) => p.id === idOrPath);
  if (match) return match;
  throw new Error(
    `Profile "${idOrPath}" tidak ditemukan. Tersedia: ${listProfiles()
      .map((p) => p.id)
      .join(", ")}`,
  );
}

/**
 * Terapkan profile ke SharedState (project_meta + tech_stack_state).
 * Field yang sudah ada di state tidak ditimpa jika `override=false`.
 */
export function applyProfile(
  state: SharedState,
  profile: Profile,
  override = true,
): SharedState {
  const nextProject: Partial<ProjectMeta> = { ...profile.project_meta };
  const nextStack: TechStackState = { ...profile.tech_stack_state };

  const mergedProject = override
    ? { ...state.project_meta, ...nextProject }
    : { ...nextProject, ...state.project_meta };

  const mergedStack: TechStackState = override
    ? { ...state.tech_stack_state, ...nextStack }
    : { ...nextStack, ...state.tech_stack_state };

  return {
    ...state,
    project_meta: mergedProject as ProjectMeta,
    tech_stack_state: mergedStack,
  };
}

/** Ringkasan opsi katalog untuk ditampilkan ke user (Agen #0). */
export function catalogSummary(catalog = loadCatalog()): string {
  const out: string[] = [];
  const push = (label: string, value: unknown) => {
    if (Array.isArray(value)) out.push(`- ${label}: ${value.join(", ")}`);
    else if (value && typeof value === "object")
      out.push(`- ${label}: ${Object.keys(value).join(", ")}`);
    else if (value) out.push(`- ${label}: ${String(value)}`);
  };
  push("Platforms", catalog.platforms);
  push("Sync modes", catalog.sync_modes?.values);
  push("FE web", catalog.frontend?.web_frameworks);
  push("FE mobile cross-platform", catalog.frontend?.mobile_cross_platform);
  push("FE desktop", catalog.frontend?.desktop);
  push("FE presentation", catalog.frontend?.presentation_patterns);
  push("FE local DB", catalog.frontend?.local_db);
  push("BE languages", catalog.backend?.languages);
  push("BE frameworks", catalog.backend?.frameworks);
  push("DB relational", catalog.databases?.relational);
  push("ORM", catalog.orms);
  push("Module strategies", (catalog.module_strategies || []).map((m: any) => m.id));
  return out.join("\n");
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "list": {
      const profiles = listProfiles();
      console.log("Profiles tersedia:");
      for (const p of profiles) {
        console.log(`  ${p.id.padEnd(24)} ${p.name}`);
        if (p.tags?.length) console.log(`  ${" ".repeat(24)} tags: ${p.tags.join(", ")}`);
      }
      break;
    }
    case "show": {
      const p = loadProfile(arg);
      console.log(JSON.stringify(p, null, 2));
      break;
    }
    case "state": {
      const p = loadProfile(arg);
      console.log(JSON.stringify(p.tech_stack_state, null, 2));
      break;
    }
    case "summary": {
      console.log(catalogSummary());
      break;
    }
    default: {
      console.log("Usage: bun run orchestrator/catalog.ts <list|show|state|summary> [profile-id]");
      console.log(`Catalog: ${CATALOG_PATH} (${Object.keys(loadCatalog()).length} top-level keys)`);
      console.log(`Profiles: ${listProfiles().map((p) => p.id).join(", ") || "(none)"}`);
    }
  }
}

const invokedDirectly =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly || process.env.MAA_FORCE_MAIN === "1") {
  main();
}
