import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { lintSkill, lintSkills } from "../src/lint.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("lintSkill", () => {
  it("passes a valid skill", async () => {
    const result = await lintSkill(join(FIXTURES, "valid-skill"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
    expect(result.name).toBe("valid-skill");
  });

  it("reports uppercase name", async () => {
    const result = await lintSkill(join(FIXTURES, "bad-name"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes("lowercase"))).toBe(true);
  });

  it("reports missing description", async () => {
    const result = await lintSkill(join(FIXTURES, "missing-description"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("Missing required field: description"))).toBe(true);
  });

  it("reports description over 1024 chars", async () => {
    const result = await lintSkill(join(FIXTURES, "long-description"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("1024 character limit"))).toBe(true);
  });

  it("does NOT report angle brackets by default (spec compliance)", async () => {
    const result = await lintSkill(join(FIXTURES, "angle-brackets"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("angle brackets"))).toBe(false);
  });

  it("reports angle brackets when --claude is enabled", async () => {
    const result = await lintSkill(join(FIXTURES, "angle-brackets"), { claude: true });
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("angle brackets"))).toBe(true);
  });

  it("reports extra frontmatter fields", async () => {
    const result = await lintSkill(join(FIXTURES, "extra-fields"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("Unexpected fields"))).toBe(true);
  });

  it("does NOT report reserved word in name by default (spec compliance)", async () => {
    const result = await lintSkill(join(FIXTURES, "claude-name"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("reserved word"))).toBe(false);
  });

  it("reports reserved word in name when --claude is enabled", async () => {
    const result = await lintSkill(join(FIXTURES, "claude-name"), { claude: true });
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("reserved word"))).toBe(true);
  });

  it("reports missing frontmatter", async () => {
    const result = await lintSkill(join(FIXTURES, "no-frontmatter"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("must start with YAML frontmatter"))).toBe(true);
  });

  it("reports missing SKILL.md", async () => {
    const result = await lintSkill(join(FIXTURES, "empty-dir"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("Missing required file"))).toBe(true);
  });

  it("warns on deeply nested references", async () => {
    const result = await lintSkill(join(FIXTURES, "deep-references"));
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.some((w) => w.message.includes("more than one directory deep"))).toBe(true);
  });

  it("warns on references that do not exist on disk", async () => {
    const result = await lintSkill(join(FIXTURES, "missing-references"));
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.some((w) => w.message.includes("does not exist"))).toBe(true);
  });

  it("passes a skill whose references exist on disk", async () => {
    const result = await lintSkill(join(FIXTURES, "with-references"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    const refWarnings = result.diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("does not exist")
    );
    expect(errors).toHaveLength(0);
    expect(refWarnings).toHaveLength(0);
  });

  it("reports Claude Code frontmatter extensions by default", async () => {
    const result = await lintSkill(join(FIXTURES, "claude-code-fields"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("Claude Code extension fields"))).toBe(true);
  });

  it("accepts Claude Code frontmatter extensions with --claude-code", async () => {
    const result = await lintSkill(join(FIXTURES, "claude-code-fields"), {
      claudeCode: true,
    });
    expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("warns on a comma-separated allowed-tools list and unbalanced parens", async () => {
    const result = await lintSkill(join(FIXTURES, "comma-tools"));
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.some((w) => w.message.includes("comma-separated"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("unbalanced parentheses"))).toBe(true);
  });

  it("warns when the body has no content", async () => {
    const result = await lintSkill(join(FIXTURES, "empty-body"));
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.some((w) => w.message.includes("no content after the frontmatter"))).toBe(true);
  });

  it("warns on a bundled reference file the body never mentions", async () => {
    const result = await lintSkill(join(FIXTURES, "unreferenced-file"));
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.some((w) => w.message.includes("references/ORPHAN.md"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("references/GUIDE.md"))).toBe(false);
  });

  it("checks plain-text bundled paths for existence", async () => {
    const result = await lintSkill(join(FIXTURES, "bundled-scripts"));
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(
      warnings.some(
        (w) => w.message.includes("scripts/missing.py") && w.message.includes("does not exist")
      )
    ).toBe(true);
    expect(warnings.some((w) => w.message.includes("scripts/extract.py"))).toBe(false);
  });

  it("warns when instructions live in a lowercase skill.md", async () => {
    const result = await lintSkill(join(FIXTURES, "lowercase-filename"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.message.includes("'skill.md'"))).toBe(true);
  });

  it("accepts a non-ASCII skill name matching its directory", async () => {
    const result = await lintSkill(join(FIXTURES, "unicode-name", "数据分析"));
    expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("passes a realistic social source review skill", async () => {
    const result = await lintSkill(join(FIXTURES, "social-source-review"), { claude: true });
    expect(result.name).toBe("social-source-review");
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe("lintSkills", () => {
  it("discovers and validates all fixture skills", async () => {
    const result = await lintSkills(FIXTURES);
    expect(result.skills.length).toBeGreaterThanOrEqual(8);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it("warns when two skills declare the same name", async () => {
    const result = await lintSkills(join(FIXTURES, "duplicate-name"));
    const duplicates = result.skills.flatMap((s) =>
      s.diagnostics.filter((d) => d.message.includes("Duplicate skill name 'dup-skill'"))
    );
    expect(duplicates).toHaveLength(2);
    expect(result.warningCount).toBeGreaterThanOrEqual(2);
  });

  it("does not warn when each duplicate belongs to its own plugin", async () => {
    const result = await lintSkills(join(FIXTURES, "plugin-namespaces"));
    expect(result.skills).toHaveLength(2);
    const duplicates = result.skills.flatMap((s) =>
      s.diagnostics.filter((d) => d.message.includes("Duplicate skill name"))
    );
    expect(duplicates).toHaveLength(0);
  });

  it("does not warn about duplicates for distinct names", async () => {
    const result = await lintSkills(join(FIXTURES, "with-references"));
    const duplicates = result.skills.flatMap((s) =>
      s.diagnostics.filter((d) => d.message.includes("Duplicate skill name"))
    );
    expect(duplicates).toHaveLength(0);
  });
});
