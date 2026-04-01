#!/usr/bin/env node

import { resolve } from "node:path";
import { lintSkills } from "./lint.js";
import type { Diagnostic } from "./types.js";

const COLORS = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function formatDiagnostic(d: Diagnostic): string {
  const icon = d.severity === "error" ? `${COLORS.red}error` : `${COLORS.yellow}warning`;
  const field = d.field ? ` ${COLORS.dim}(${d.field})${COLORS.reset}` : "";
  return `  ${icon}${COLORS.reset}${field} ${d.message}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: skill-lint [path] [options]

Validate Agent Skills (SKILL.md) files.

Arguments:
  path          Directory to scan for skills (default: current directory)

Options:
  --help, -h    Show this help message
  --json        Output results as JSON
  --quiet, -q   Only show errors, suppress warnings`);
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const quiet = args.includes("--quiet") || args.includes("-q");
  const pathArg = args.find((a) => !a.startsWith("-"));
  const rootPath = resolve(pathArg || ".");

  const result = await lintSkills(rootPath);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.skills.length === 0) {
      console.log(`${COLORS.yellow}No skills found in ${rootPath}${COLORS.reset}`);
      process.exit(0);
    }

    for (const skill of result.skills) {
      const label = skill.name || skill.path;
      const filtered = quiet
        ? skill.diagnostics.filter((d) => d.severity === "error")
        : skill.diagnostics;

      if (filtered.length === 0) {
        if (!quiet) {
          console.log(`${COLORS.green}pass${COLORS.reset} ${label}`);
        }
        continue;
      }

      console.log(`${COLORS.bold}${label}${COLORS.reset} ${COLORS.dim}(${skill.path})${COLORS.reset}`);
      for (const d of filtered) {
        console.log(formatDiagnostic(d));
      }
      console.log();
    }

    // Summary
    const parts: string[] = [];
    if (result.errorCount > 0) {
      parts.push(`${COLORS.red}${result.errorCount} error${result.errorCount === 1 ? "" : "s"}${COLORS.reset}`);
    }
    if (!quiet && result.warningCount > 0) {
      parts.push(`${COLORS.yellow}${result.warningCount} warning${result.warningCount === 1 ? "" : "s"}${COLORS.reset}`);
    }
    if (parts.length > 0) {
      console.log(parts.join(", "));
    } else {
      console.log(
        `${COLORS.green}All ${result.skills.length} skill${result.skills.length === 1 ? "" : "s"} passed${COLORS.reset}`
      );
    }
  }

  process.exit(result.errorCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
