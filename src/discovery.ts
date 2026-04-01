import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
]);

const MAX_DEPTH = 5;

/**
 * Discover skill directories (containing SKILL.md) under a root path.
 */
export async function discoverSkills(rootPath: string): Promise<string[]> {
  const skills: string[] = [];
  await walk(rootPath, 0, skills);
  return skills.sort();
}

async function walk(
  dir: string,
  depth: number,
  results: string[]
): Promise<void> {
  if (depth > MAX_DEPTH) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // Check if this directory itself is a skill
  const hasSkillMd = entries.some(
    (e) => e.isFile() && (e.name === "SKILL.md" || e.name === "skill.md")
  );

  if (hasSkillMd) {
    results.push(dir);
    return; // Don't recurse into skill directories
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    await walk(join(dir, entry.name), depth + 1, results);
  }
}
