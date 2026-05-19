import { access, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { discoverSkills } from "./discovery.js";
import { parseSkillMd } from "./parser.js";
import { extractBodyReferences, validate } from "./validator.js";
import type { LintOptions, LintResult, SkillValidationResult } from "./types.js";

/**
 * Lint all skills found under the given root path.
 */
export async function lintSkills(
  rootPath: string,
  options: LintOptions = {}
): Promise<LintResult> {
  const skillDirs = await discoverSkills(rootPath);
  const skills: SkillValidationResult[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const skillDir of skillDirs) {
    const result = await lintSkill(skillDir, options);
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
export async function lintSkill(
  skillDir: string,
  options: LintOptions = {}
): Promise<SkillValidationResult> {
  const dirName = basename(skillDir);
  const result: SkillValidationResult = { path: skillDir, diagnostics: [] };

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

  const diagnostics = validate(frontmatter, dirName, body, options);
  result.diagnostics.push(...diagnostics);

  await checkReferenceExistence(skillDir, body, result);

  return result;
}

async function checkReferenceExistence(
  skillDir: string,
  body: string,
  result: SkillValidationResult
): Promise<void> {
  const skillRoot = resolve(skillDir);
  const seen = new Set<string>();
  for (const ref of extractBodyReferences(body)) {
    const cleanRef = ref.split("#")[0].split("?")[0];
    if (!cleanRef || seen.has(cleanRef)) continue;
    seen.add(cleanRef);
    if (isAbsolute(cleanRef)) continue;
    const resolved = resolve(skillRoot, cleanRef);
    if (!resolved.startsWith(skillRoot)) continue; // already reported as escape
    try {
      await access(resolved);
    } catch {
      result.diagnostics.push({
        severity: "warning",
        field: "body",
        message: `Reference '${ref}' does not exist in the skill directory.`,
      });
    }
  }
}
