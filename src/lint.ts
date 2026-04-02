import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { discoverSkills } from "./discovery.js";
import { parseSkillMd } from "./parser.js";
import { validate } from "./validator.js";
import type { LintResult, SkillValidationResult } from "./types.js";

/**
 * Lint all skills found under the given root path.
 */
export async function lintSkills(rootPath: string): Promise<LintResult> {
  const skillDirs = await discoverSkills(rootPath);
  const skills: SkillValidationResult[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const skillDir of skillDirs) {
    const result = await lintSkill(skillDir);
    skills.push(result);
    for (const d of result.diagnostics) {
      if (d.severity === "error") errorCount++;
      else warningCount++;
    }
  }

  return { skills, errorCount, warningCount };
}

/**
 * Lint a single skill directory.
 */
export async function lintSkill(skillDir: string): Promise<SkillValidationResult> {
  const dirName = basename(skillDir);
  const result: SkillValidationResult = { path: skillDir, diagnostics: [] };

  // Try SKILL.md first, then skill.md
  let content: string;
  try {
    content = await readFile(join(skillDir, "SKILL.md"), "utf-8");
  } catch {
    try {
      content = await readFile(join(skillDir, "skill.md"), "utf-8");
    } catch {
      result.diagnostics.push({
        severity: "error",
        message: "Missing required file: SKILL.md",
      });
      return result;
    }
  }

  // Parse
  let frontmatter;
  let body: string;
  try {
    const parsed = parseSkillMd(content);
    frontmatter = parsed.frontmatter;
    body = parsed.body;
  } catch (e) {
    result.diagnostics.push({
      severity: "error",
      message: e instanceof Error ? e.message : String(e),
    });
    return result;
  }

  if (typeof frontmatter.name === "string") {
    result.name = frontmatter.name;
  }

  // Validate
  const diagnostics = validate(frontmatter, dirName, body);
  result.diagnostics.push(...diagnostics);

  return result;
}
