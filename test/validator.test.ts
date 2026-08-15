import { describe, it, expect } from "vitest";
import {
  extractBodyReferences,
  extractBundledPaths,
  validate,
} from "../src/validator.js";
import type { SkillFrontmatter, ValidateOptions } from "../src/types.js";

function diagnostics(
  fm: SkillFrontmatter,
  dirName?: string,
  body?: string,
  options?: ValidateOptions
) {
  return validate(fm, dirName, body, options);
}

function errors(
  fm: SkillFrontmatter,
  dirName?: string,
  body?: string,
  options?: ValidateOptions
) {
  return diagnostics(fm, dirName, body, options).filter((d) => d.severity === "error");
}

function warnings(
  fm: SkillFrontmatter,
  dirName?: string,
  body?: string,
  options?: ValidateOptions
) {
  return diagnostics(fm, dirName, body, options).filter((d) => d.severity === "warning");
}

describe("validate", () => {
  describe("name", () => {
    it("accepts a valid name", () => {
      const d = errors({ name: "my-skill", description: "A skill." });
      expect(d).toHaveLength(0);
    });

    it("rejects missing name", () => {
      const d = errors({ description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "name", message: expect.stringContaining("Missing") })
      );
    });

    it("rejects empty string name", () => {
      const d = errors({ name: "", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "name", message: expect.stringContaining("non-empty") })
      );
    });

    it("rejects uppercase name", () => {
      const d = errors({ name: "My-Skill", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("lowercase") })
      );
    });

    it("rejects name with invalid characters", () => {
      const d = errors({ name: "my_skill", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("invalid characters") })
      );
    });

    it("rejects name starting with hyphen", () => {
      const d = errors({ name: "-my-skill", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("start or end with a hyphen") })
      );
    });

    it("rejects name ending with hyphen", () => {
      const d = errors({ name: "my-skill-", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("start or end with a hyphen") })
      );
    });

    it("rejects consecutive hyphens", () => {
      const d = errors({ name: "my--skill", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("consecutive hyphens") })
      );
    });

    it("rejects name exceeding 64 chars", () => {
      const longName = "a".repeat(65);
      const d = errors({ name: longName, description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("exceeds 64") })
      );
    });

    it("errors when name does not match directory", () => {
      const d = errors({ name: "my-skill", description: "A skill." }, "other-dir");
      expect(d).toContainEqual(
        expect.objectContaining({
          severity: "error",
          field: "name",
          message: expect.stringContaining("must match parent directory"),
        })
      );
    });

    it("does not flag reserved words 'claude'/'anthropic' by default (spec compliance)", () => {
      const d = errors({ name: "my-claude-tool", description: "A skill." });
      expect(d.some((e) => e.message.includes("reserved word"))).toBe(false);
    });

    it("flags reserved word 'claude' when --claude is enabled", () => {
      const d = errors(
        { name: "my-claude-tool", description: "A skill." },
        undefined,
        undefined,
        { claude: true }
      );
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("reserved word 'claude'") })
      );
    });

    it("flags reserved word 'anthropic' when --claude is enabled", () => {
      const d = errors(
        { name: "anthropic-helper", description: "A skill." },
        undefined,
        undefined,
        { claude: true }
      );
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("reserved word 'anthropic'") })
      );
    });
  });

  describe("description", () => {
    it("accepts a valid description", () => {
      const d = errors({ name: "test", description: "A valid description." });
      expect(d).toHaveLength(0);
    });

    it("rejects missing description", () => {
      const d = errors({ name: "test" });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "description", message: expect.stringContaining("Missing") })
      );
    });

    it("rejects empty description", () => {
      const d = errors({ name: "test", description: "" });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "description", message: expect.stringContaining("non-empty") })
      );
    });

    it("rejects description over 1024 chars", () => {
      const longDesc = "x".repeat(1025);
      const d = errors({ name: "test", description: longDesc });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("1024 character limit") })
      );
    });

    it("does not flag angle brackets by default (spec compliance)", () => {
      const d = errors({ name: "test", description: "Uses <html> tags." });
      expect(d.some((e) => e.message.includes("angle brackets"))).toBe(false);
    });

    it("flags angle brackets when --claude is enabled", () => {
      const d = errors(
        { name: "test", description: "Uses <html> tags." },
        undefined,
        undefined,
        { claude: true }
      );
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("angle brackets") })
      );
    });
  });

  describe("frontmatter fields", () => {
    it("rejects unexpected fields", () => {
      const d = errors({
        name: "test",
        description: "A skill.",
        author: "someone",
        version: "1.0.0",
      });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("Unexpected fields") })
      );
    });

    it("accepts all allowed fields", () => {
      const d = errors({
        name: "test",
        description: "A skill.",
        license: "MIT",
        compatibility: "CLI only",
        metadata: { key: "value" },
        "allowed-tools": "Bash Read",
      });
      expect(d).toHaveLength(0);
    });
  });

  describe("compatibility", () => {
    it("rejects non-string compatibility", () => {
      const d = errors({ name: "test", description: "A skill.", compatibility: 123 });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("must be a string") })
      );
    });

    it("rejects empty compatibility", () => {
      const d = errors({ name: "test", description: "A skill.", compatibility: "" });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("1-500 characters") })
      );
    });

    it("rejects compatibility over 500 chars", () => {
      const d = errors({ name: "test", description: "A skill.", compatibility: "x".repeat(501) });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("1-500 characters") })
      );
    });
  });

  describe("license", () => {
    it("accepts a valid license string", () => {
      const d = errors({ name: "test", description: "A skill.", license: "MIT" });
      expect(d).toHaveLength(0);
    });

    it("rejects non-string license", () => {
      const d = errors({ name: "test", description: "A skill.", license: 123 });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "license", message: expect.stringContaining("must be a string") })
      );
    });

    it("rejects empty license", () => {
      const d = errors({ name: "test", description: "A skill.", license: "" });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "license", message: expect.stringContaining("non-empty") })
      );
    });
  });

  describe("allowed-tools", () => {
    it("accepts a valid allowed-tools string", () => {
      const d = errors({ name: "test", description: "A skill.", "allowed-tools": "Bash Read" });
      expect(d).toHaveLength(0);
    });

    it("rejects non-string allowed-tools", () => {
      const d = errors({ name: "test", description: "A skill.", "allowed-tools": ["Bash"] });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "allowed-tools", message: expect.stringContaining("space-delimited string") })
      );
    });

    it("rejects empty allowed-tools", () => {
      const d = errors({ name: "test", description: "A skill.", "allowed-tools": "" });
      expect(d).toContainEqual(
        expect.objectContaining({ field: "allowed-tools", message: expect.stringContaining("non-empty") })
      );
    });
  });

  describe("body", () => {
    it("warns when body exceeds 500 lines", () => {
      const longBody = "step\n".repeat(501);
      const d = diagnostics({ name: "test", description: "A skill." }, undefined, longBody);
      const bodyWarnings = d.filter((dd) => dd.field === "body");
      expect(bodyWarnings).toContainEqual(
        expect.objectContaining({ severity: "warning", message: expect.stringContaining("exceeds the recommended 500 line limit") })
      );
    });

    it("warns when estimated tokens exceed 5000 even on few lines", () => {
      // ~21000 chars on a single line ≈ ~5250 tokens, but only one line
      const tokenHeavy = "x".repeat(21000);
      const d = diagnostics({ name: "test", description: "A skill." }, undefined, tokenHeavy);
      const bodyWarnings = d.filter((dd) => dd.field === "body");
      expect(bodyWarnings).toContainEqual(
        expect.objectContaining({ severity: "warning", message: expect.stringContaining("token") })
      );
    });

    it("does not warn when body is small", () => {
      const shortBody = "Some content\n".repeat(100);
      const d = diagnostics({ name: "test", description: "A skill." }, undefined, shortBody);
      const bodyWarnings = d.filter((dd) => dd.field === "body");
      expect(bodyWarnings).toHaveLength(0);
    });

    it("warns when a reference is more than one directory deep", () => {
      const body = "See [deep](references/sub/deep.md) for more.";
      const w = warnings({ name: "test", description: "A skill." }, undefined, body);
      expect(w).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("more than one directory deep") })
      );
    });

    it("does not warn for one-level-deep references", () => {
      const body = "See [guide](references/GUIDE.md) for more.";
      const w = warnings({ name: "test", description: "A skill." }, undefined, body);
      expect(w.some((d) => d.message.includes("directory deep"))).toBe(false);
    });

    it("warns when reference escapes the skill directory", () => {
      const body = "See [escape](../outside.md) for more.";
      const w = warnings({ name: "test", description: "A skill." }, undefined, body);
      expect(w).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("escapes the skill directory") })
      );
    });
  });

  describe("metadata", () => {
    it("warns on non-string metadata values", () => {
      const d = warnings({ name: "test", description: "A skill.", metadata: { count: 42 } });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("not a string") })
      );
    });

    it("rejects non-object metadata", () => {
      const d = errors({ name: "test", description: "A skill.", metadata: "not-a-map" });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("must be a mapping") })
      );
    });
  });
});

describe("validate (added rules)", () => {
  describe("name", () => {
    it("accepts a non-ASCII name, as the spec allows", () => {
      const d = errors({ name: "数据分析", description: "A skill." }, "数据分析");
      expect(d).toHaveLength(0);
    });

    it("matches a name against a differently normalized directory name", () => {
      // "café" composed (NFC) in frontmatter vs decomposed (NFD) on disk.
      const d = errors({ name: "café", description: "A skill." }, "café");
      expect(d).toHaveLength(0);
    });
  });

  describe("claude code extension fields", () => {
    it("reports extension fields separately from unknown ones", () => {
      const d = errors({
        name: "test",
        description: "A skill.",
        context: "fork",
        nonsense: true,
      });
      expect(d).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining("Claude Code extension fields"),
        })
      );
      expect(d).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining("Unexpected fields in frontmatter: nonsense"),
        })
      );
    });

    it("accepts extension fields with claudeCode enabled", () => {
      const d = errors(
        { name: "test", description: "A skill.", context: "fork", model: "opus" },
        undefined,
        undefined,
        { claudeCode: true }
      );
      expect(d).toHaveLength(0);
    });

    it("still rejects unknown fields with claudeCode enabled", () => {
      const d = errors(
        { name: "test", description: "A skill.", nonsense: true },
        undefined,
        undefined,
        { claudeCode: true }
      );
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("Unexpected fields") })
      );
    });
  });

  describe("allowed-tools", () => {
    it("warns on a comma-separated list", () => {
      const w = warnings({
        name: "test",
        description: "A skill.",
        "allowed-tools": "Read, Grep",
      });
      expect(w).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("comma-separated") })
      );
    });

    it("does not warn about commas inside a tool pattern", () => {
      const w = warnings({
        name: "test",
        description: "A skill.",
        "allowed-tools": "WebFetch(domain:a.com,b.com) Read",
      });
      expect(w).toHaveLength(0);
    });

    it("warns on unbalanced parentheses", () => {
      const w = warnings({
        name: "test",
        description: "A skill.",
        "allowed-tools": "Bash(git status Read",
      });
      expect(w).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("unbalanced parentheses") })
      );
    });
  });

  describe("body", () => {
    it("warns when the body is empty", () => {
      const w = warnings({ name: "test", description: "A skill." }, undefined, "\n  \n");
      expect(w).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("no content after the frontmatter") })
      );
    });
  });
});

describe("extractBundledPaths", () => {
  it("extracts plain-text and code-span paths under the spec directories", () => {
    const body =
      "Run `scripts/extract.py`, read references/GUIDE.md, apply ./assets/template.docx.";
    expect(extractBundledPaths(body).sort()).toEqual([
      "assets/template.docx",
      "references/GUIDE.md",
      "scripts/extract.py",
    ]);
  });

  it("ignores paths outside the spec directories and bare directory names", () => {
    const body = "Edit src/app.ts, then look at scripts/ and https://x.dev/scripts/a.py.";
    expect(extractBundledPaths(body)).toEqual([]);
  });
});

describe("extractBodyReferences", () => {
  it("extracts relative markdown link targets", () => {
    const body = "See [guide](references/GUIDE.md) and [script](scripts/run.py).";
    expect(extractBodyReferences(body)).toEqual([
      "references/GUIDE.md",
      "scripts/run.py",
    ]);
  });

  it("ignores absolute URLs, anchors, and mailto links", () => {
    const body = `[home](https://agentskills.io) [anchor](#section) [mail](mailto:x@y.z) [abs](/etc/hosts)`;
    expect(extractBodyReferences(body)).toEqual([]);
  });
});
