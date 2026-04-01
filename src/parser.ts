import { parse as parseYaml } from "yaml";
import type { SkillFrontmatter } from "./types.js";

export interface ParseResult {
  frontmatter: SkillFrontmatter;
  body: string;
}

/**
 * Parse a SKILL.md file into frontmatter and body.
 * Throws if the file doesn't have valid YAML frontmatter.
 */
export function parseSkillMd(content: string): ParseResult {
  if (!content.startsWith("---")) {
    throw new Error("SKILL.md must start with YAML frontmatter (---)");
  }

  const secondDelimiter = content.indexOf("\n---", 3);
  if (secondDelimiter === -1) {
    throw new Error("SKILL.md frontmatter not properly closed with ---");
  }

  const yamlString = content.slice(4, secondDelimiter);
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlString);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid YAML in frontmatter: ${msg}`);
  }

  if (parsed === null || parsed === undefined || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SKILL.md frontmatter must be a YAML mapping");
  }

  const body = content.slice(secondDelimiter + 4);
  return { frontmatter: parsed as SkillFrontmatter, body };
}
