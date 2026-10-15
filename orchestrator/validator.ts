// orchestrator/validator.ts
import type { SharedState, ReviewIssue } from "./state";

/**
 * CrossValidator implements the 4 mandatory cross-audit rules of Agent 06:
 *
 *  GATE 1  Traceability        (FR-MUST -> FE + BE + DB + API)
 *  GATE 2  Payload Sync        (FE <-> API)
 *  GATE 3  Schema & Performance (BE <-> DB, index / N+1)
 *  GATE 4  Decoupling          (FE != server-side business logic)
 *
 * Plus reference integrity checks (FE-XX / BE-XX / DB-XX / API-XX must exist).
 */
export class CrossValidator {
  validate(state: SharedState): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    const frs = state.prd_state.functional_requirements;
    const mustFr = frs.filter((f) => f.priority === "MUST");

    const feIds = new Set(state.fe_state.screens.map((s) => s.id));
    const beIds = new Set(state.be_state.modules.map((m) => m.id));
    const dbIds = new Set(state.db_state.tables.map((t) => t.id));
    const apiIds = new Set(state.api_state.endpoints.map((e) => e.id));

    // -----------------------------------------------------------------
    // GATE 0: Standards Locked (Agent 00 - Discovery) -> Hukum Dasar
    // -----------------------------------------------------------------
    const tss = state.tech_stack_state || {};
    const standardsLocked = tss.standards?.status === "LOCKED";
    const hasCoreDecisions = !!(
      tss.fe?.ui_framework &&
      tss.be?.language &&
      tss.db?.orm
    );
    if (!standardsLocked || !hasCoreDecisions) {
      const missing: string[] = [];
      if (!tss.fe?.ui_framework) missing.push("FE ui_framework");
      if (!tss.be?.language) missing.push("BE language");
      if (!tss.db?.orm) missing.push("DB orm");
      issues.push({
        target_agent: "discovery-interviewer",
        source: "cross-reviewer",
        issue_type: "STANDARDS_UNLOCKED",
        description:
          "Gerbang 1 belum terkunci: keputusan Tech Stack & Clean Code Contract belum lengkap " +
          `(status: ${tss.standards?.status ?? "NONE"}${missing.length ? ", kurang: " + missing.join(", ") : ""}).`,
        severity: "BLOCKER",
        patch:
          "Jalankan Agen #0 (Discovery Interviewer) dan set standards.status = LOCKED beserta FE/BE/DB.",
        status: "OPEN",
      });
    }

    // -----------------------------------------------------------------
    // GATE 1: Traceability (FR-MUST -> FE + BE + DB + API)
    // -----------------------------------------------------------------
    for (const fr of mustFr) {
      const hasFE = state.fe_state.screens.some((s) =>
        (s.satisfies_fr || []).includes(fr.id)
      );
      const hasBE = state.be_state.modules.some((m) =>
        (m.satisfies_fr || []).includes(fr.id)
      );
      const hasDB = state.db_state.tables.some((t) =>
        (t.maps_to_fr || []).includes(fr.id)
      );
      const hasAPI = state.api_state.endpoints.some((e) =>
        (e.maps_to_fr || []).includes(fr.id)
      );

      const missing: string[] = [];
      if (!hasFE) missing.push("FE");
      if (!hasBE) missing.push("BE");
      if (!hasDB) missing.push("DB");
      if (!hasAPI) missing.push("API");

      if (missing.length) {
        issues.push({
          target_agent: "cross-reviewer",
          source: "cross-reviewer",
          issue_type: "MISSING_TRACE",
          related_fr: [fr.id],
          description: `FR-MUST ${fr.id} (${fr.feature}) belum ter-trace ke: ${missing.join(
            ", "
          )}.`,
          severity: "BLOCKER",
          patch: `Lengkapi ${missing.join(
            ", "
          )} agar ${fr.id} terhubung end-to-end.`,
          status: "OPEN",
        });
      }
    }

    // -----------------------------------------------------------------
    // GATE 2: Payload Sync (FE <-> API)
    // -----------------------------------------------------------------
    for (const s of state.fe_state.screens) {
      // a) UI states completeness
      const declared = (s.ui_states || []).map((x) => x.toLowerCase());
      const need = ["loading", "error", "empty"];
      const isListScreen =
        (s.consumes_api || []).some((id) =>
          state.api_state.endpoints.find(
            (e) => e.id === id && e.method === "GET"
          )
        ) || declared.includes("pagination");
      if (isListScreen) need.push("pagination", "filter");

      const missingStates = need.filter((n) => !declared.includes(n));
      if (missingStates.length) {
        issues.push({
          target_agent: "fe-architect",
          source: "cross-reviewer",
          issue_type: "PAYLOAD_MISMATCH",
          related_fe: [s.id],
          related_api: s.consumes_api || [],
          description: `Screen ${s.id} "${s.name}" belum mendeklarasikan UI state: ${missingStates.join(
            ", "
          )}.`,
          severity: "MAJOR",
          patch: `Tambahkan state ${missingStates.join(
            ", "
          )} pada ${s.id} dan pastikan API menyediakan data pendukungnya.`,
          status: "OPEN",
        });
      }

      // b) dangling API reference
      for (const apiId of s.consumes_api || []) {
        if (!apiIds.has(apiId)) {
          issues.push({
            target_agent: "api-designer",
            source: "cross-reviewer",
            issue_type: "DANGLING_REF",
            related_fe: [s.id],
            related_api: [apiId],
            description: `Screen ${s.id} mengonsumsi ${apiId} yang tidak ada di API contract.`,
            severity: "BLOCKER",
            patch: `Definisikan endpoint ${apiId} atau perbaiki referensi di ${s.id}.`,
            status: "OPEN",
          });
        }
      }

      // c) list screen must have pagination meta in API response
      if (isListScreen) {
        for (const apiId of s.consumes_api || []) {
          const ep = state.api_state.endpoints.find((e) => e.id === apiId);
          if (ep && ep.method === "GET" && !ep.response_envelope) {
            issues.push({
              target_agent: "api-designer",
              source: "cross-reviewer",
              issue_type: "MISSING_FIELD",
              related_fe: [s.id],
              related_api: [apiId],
              description: `List screen ${s.id} butuh meta pagination, namun response ${apiId} belum didefinisikan.`,
              severity: "MAJOR",
              patch: `Tambahkan response_envelope (data + meta{page,limit,total}) pada ${apiId}.`,
              status: "OPEN",
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // GATE 3: Schema & Performance Sync (BE <-> DB)
    // -----------------------------------------------------------------
    const idxCols = new Set(
      state.db_state.tables.flatMap((t) => t.indexes.flatMap((i) => i.columns))
    );
    for (const e of state.api_state.endpoints) {
      // GET with filter/sort needs an index
      if (e.method === "GET" && (e.query_params?.length || 0) > 0) {
        const qp = (e.query_params || []).map((p) => p.name.toLowerCase());
        const covered = qp.some((q) => idxCols.has(q));
        if (!covered && state.db_state.tables.length > 0) {
          issues.push({
            target_agent: "db-architect",
            source: "cross-reviewer",
            issue_type: "INDEX_MISSING",
            related_api: [e.id],
            description: `GET ${e.path} (${e.id}) memfilter/mengurutkan data tanpa index pendukung -> potensi Full Table Scan.`,
            severity: "MAJOR",
            patch: `Tambahkan B-Tree/composite index pada kolom filter (${qp.join(
              ", "
            )}).`,
            status: "OPEN",
          });
        }
      }

      // dangling BE reference
      for (const beId of e.served_by_be || []) {
        if (!beIds.has(beId)) {
          issues.push({
            target_agent: "be-architect",
            source: "cross-reviewer",
            issue_type: "DANGLING_REF",
            related_api: [e.id],
            related_be: [beId],
            description: `Endpoint ${e.id} diklaim dilayani ${beId} yang tidak ada di BE architecture.`,
            severity: "BLOCKER",
            patch: `Definisikan modul ${beId} atau perbaiki served_by_be pada ${e.id}.`,
            status: "OPEN",
          });
        }
      }
    }

    // BE modules referencing missing tables (best-effort via FR mapping)
    for (const m of state.be_state.modules) {
      if (m.requires_transaction && state.db_state.tables.length === 0) {
        issues.push({
          target_agent: "db-architect",
          source: "cross-reviewer",
          issue_type: "N1_RISK",
          related_be: [m.id],
          description: `Modul ${m.id} butuh transaksi ACID namun belum ada tabel DB yang mendukung.`,
          severity: "MAJOR",
          patch: `Lengkapi skema tabel untuk transaksi ${m.id}.`,
          status: "OPEN",
        });
      }
    }

    // -----------------------------------------------------------------
    // GATE 4: Decoupling (FE != server-side business logic)
    // -----------------------------------------------------------------
    for (const s of state.fe_state.screens) {
      if (s.critical_business_logic) {
        issues.push({
          target_agent: "fe-architect",
          source: "cross-reviewer",
          issue_type: "DECOUPLING_VIOLATION",
          related_fe: [s.id],
          description: `Screen ${s.id} "${s.name}" menandai critical_business_logic=true. Logika bisnis krusial harus di BE.`,
          severity: "BLOCKER",
          patch: `Pindahkan perhitungan/validasi krusial dari ${s.id} ke modul BE (idempotent) dan expose via API.`,
          status: "OPEN",
        });
      }
    }

    // -----------------------------------------------------------------
    // GATE: Clean Code & Layer Boundary (Agent 00 guardrails)
    // -----------------------------------------------------------------
    for (const m of state.be_state.modules) {
      if (m.domain_uses_framework) {
        issues.push({
          target_agent: "be-architect",
          source: "cross-reviewer",
          issue_type: "LAYER_VIOLATION",
          related_be: [m.id],
          description: `Modul ${m.id} mengimpor framework/ORM ke Domain Layer. Domain wajib 100% murni.`,
          severity: "BLOCKER",
          patch: `Pisahkan Domain model dari ORM/DTO di ${m.id}; gunakan Mapper eksplisit.`,
          status: "OPEN",
        });
      }
      if (m.exposes_orm_model) {
        issues.push({
          target_agent: "be-architect",
          source: "cross-reviewer",
          issue_type: "LAYER_VIOLATION",
          related_be: [m.id],
          description: `Modul ${m.id} mengekspos ORM Entity keluar layer (bocor ke Delivery/API).`,
          severity: "MAJOR",
          patch: `Petakan ORM Entity -> Domain Model -> Response DTO pada ${m.id}.`,
          status: "OPEN",
        });
      }
    }
    for (const s of state.fe_state.screens) {
      if (s.uses_orm_in_ui) {
        issues.push({
          target_agent: "fe-architect",
          source: "cross-reviewer",
          issue_type: "LAYER_VIOLATION",
          related_fe: [s.id],
          description: `Screen ${s.id} memakai ORM/DB Entity langsung di UI layer.`,
          severity: "BLOCKER",
          patch: `Akses data lewat Repository/UseCase dan gunakan Domain Model di ${s.id}.`,
          status: "OPEN",
        });
      }
    }

    // -----------------------------------------------------------------
    // Reference integrity: FE ids referenced by API must exist
    // -----------------------------------------------------------------
    for (const e of state.api_state.endpoints) {
      for (const feId of e.consumed_by_fe || []) {
        if (!feIds.has(feId)) {
          issues.push({
            target_agent: "fe-architect",
            source: "cross-reviewer",
            issue_type: "DANGLING_REF",
            related_api: [e.id],
            related_fe: [feId],
            description: `Endpoint ${e.id} mengklaim dipakai ${feId} yang tidak ada di FE architecture.`,
            severity: "MAJOR",
            patch: `Definisikan screen ${feId} atau perbaiki consumed_by_fe pada ${e.id}.`,
            status: "OPEN",
          });
        }
      }
    }

    // (dbIds kept for future DB-level reference checks)
    void dbIds;

    return issues;
  }

  hasBlocker(issues: ReviewIssue[]): boolean {
    return issues.some((i) => i.severity === "BLOCKER" && i.status === "OPEN");
  }

  /** Builds the FR -> FE/API/BE/DB traceability matrix used by Agent 06. */
  traceabilityMatrix(state: SharedState) {
    return state.prd_state.functional_requirements.map((fr) => {
      const fe = state.fe_state.screens
        .filter((s) => (s.satisfies_fr || []).includes(fr.id))
        .map((s) => s.id);
      const be = state.be_state.modules
        .filter((m) => (m.satisfies_fr || []).includes(fr.id))
        .map((m) => m.id);
      const db = state.db_state.tables
        .filter((t) => (t.maps_to_fr || []).includes(fr.id))
        .map((t) => t.id);
      const api = state.api_state.endpoints
        .filter((e) => (e.maps_to_fr || []).includes(fr.id))
        .map((e) => e.id);

      const valid =
        fr.priority !== "MUST" ||
        (fe.length && be.length && db.length && api.length);
      return {
        fr: fr.id,
        feature: fr.feature,
        priority: fr.priority,
        fe,
        api,
        be,
        db,
        status: valid ? "VALID" : "PERLU REVISI",
      };
    });
  }
}
