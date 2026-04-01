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

  it("reports angle brackets in description", async () => {
    const result = await lintSkill(join(FIXTURES, "angle-brackets"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("angle brackets"))).toBe(true);
  });

  it("reports extra frontmatter fields", async () => {
    const result = await lintSkill(join(FIXTURES, "extra-fields"));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.some((e) => e.message.includes("Unexpected fields"))).toBe(true);
  });

  it("reports reserved word in name", async () => {
    const result = await lintSkill(join(FIXTURES, "reserved-name"));
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
});

describe("lintSkills", () => {
  it("discovers and validates all fixture skills", async () => {
    const result = await lintSkills(FIXTURES);
    expect(result.skills.length).toBeGreaterThanOrEqual(8);
    expect(result.errorCount).toBeGreaterThan(0);
  });
});
