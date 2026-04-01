import { describe, it, expect } from "vitest";
import { parseSkillMd } from "../src/parser.js";

describe("parseSkillMd", () => {
  it("parses valid frontmatter and body", () => {
    const content = `---
name: my-skill
description: A test skill.
---

# My Skill

Body content here.`;

    const result = parseSkillMd(content);
    expect(result.frontmatter.name).toBe("my-skill");
    expect(result.frontmatter.description).toBe("A test skill.");
    expect(result.body).toContain("# My Skill");
  });

  it("throws if file does not start with ---", () => {
    expect(() => parseSkillMd("# No frontmatter")).toThrow(
      "SKILL.md must start with YAML frontmatter"
    );
  });

  it("throws if frontmatter is not closed", () => {
    expect(() => parseSkillMd("---\nname: test\n")).toThrow(
      "frontmatter not properly closed"
    );
  });

  it("throws on invalid YAML", () => {
    expect(() => parseSkillMd("---\n: :\n  bad:\n---\n")).toThrow(
      "Invalid YAML"
    );
  });

  it("throws if frontmatter is a scalar", () => {
    expect(() => parseSkillMd("---\njust a string\n---\n")).toThrow(
      "must be a YAML mapping"
    );
  });

  it("throws if frontmatter is a list", () => {
    expect(() => parseSkillMd("---\n- item1\n- item2\n---\n")).toThrow(
      "must be a YAML mapping"
    );
  });

  it("handles multiline description with YAML folded scalar", () => {
    const content = `---
name: my-skill
description: >
  This is a long
  description that spans
  multiple lines.
---

# Body`;

    const result = parseSkillMd(content);
    expect(result.frontmatter.description).toContain("This is a long");
    expect(result.frontmatter.description).toContain("multiple lines.");
  });
});
