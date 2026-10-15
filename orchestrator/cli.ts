#!/usr/bin/env tsx
// orchestrator/cli.ts
// Thin wrapper that keeps backwards-compatible arg parsing and delegates to
// the universal bootstrap in index.ts.
import { bootstrap } from "./index";

const args = process.argv.slice(2);
let projectName = "multi-agent-project";
let idea: string | undefined;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--name" || a === "-n") {
    projectName = args[i + 1] || projectName;
    i++;
    continue;
  }
  if (a === "--idea" || a === "-i") {
    idea = args.slice(i + 1).join(" ");
    break;
  }
  if (!a.startsWith("-")) {
    idea = idea ? idea + " " + a : a;
  }
}

bootstrap(projectName, idea);
