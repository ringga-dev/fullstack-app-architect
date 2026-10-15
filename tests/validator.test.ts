// tests/validator.test.ts
// Smoke test gerbang: dua blueprint contoh WAJIB lolos tanpa BLOCKER.
// Jalankan: bun test
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { CrossValidator } from "../orchestrator/validator";
import type { SharedState } from "../orchestrator/state";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel: string): SharedState =>
  JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as SharedState;

const EXAMPLES = [
  "examples/pos-kasir/state.json",
  "examples/pos-kasir-multitenant/state.json",
];

describe("CrossValidator gates", () => {
  for (const rel of EXAMPLES) {
    test(`${rel} -> APPROVE_GATE (0 BLOCKER)`, () => {
      const v = new CrossValidator();
      const issues = v.validate(load(rel));
      const blockers = issues.filter((i) => i.severity === "BLOCKER" && i.status === "OPEN");
      expect(blockers).toEqual([]);
      expect(v.hasBlocker(issues)).toBe(false);
    });
  }

  test("traceability matrix menandai SEMUA FR MUST sebagai VALID", () => {
    const v = new CrossValidator();
    const state = load(EXAMPLES[0]);
    const must = state.prd_state.functional_requirements.filter((f) => f.priority === "MUST");
    const rows = v.traceabilityMatrix(state);
    for (const fr of must) {
      const row = rows.find((r) => r.fr === fr.id);
      expect(row?.status).toBe("VALID");
    }
  });
});
