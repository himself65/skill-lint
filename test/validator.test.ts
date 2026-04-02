import { describe, it, expect } from "vitest";
import { validate } from "../src/validator.js";
import type { SkillFrontmatter } from "../src/types.js";

function errors(fm: SkillFrontmatter, dirName?: string) {
  return validate(fm, dirName).filter((d) => d.severity === "error");
}

function warnings(fm: SkillFrontmatter, dirName?: string) {
  return validate(fm, dirName).filter((d) => d.severity === "warning");
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

    it("rejects reserved word 'claude'", () => {
      const d = errors({ name: "my-claude-tool", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("reserved word 'claude'") })
      );
    });

    it("rejects reserved word 'anthropic'", () => {
      const d = errors({ name: "anthropic-helper", description: "A skill." });
      expect(d).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("reserved word 'anthropic'") })
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

    it("rejects description with angle brackets", () => {
      const d = errors({ name: "test", description: "Uses <html> tags." });
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
      const longBody = "\n".repeat(501);
      const d = validate({ name: "test", description: "A skill." }, undefined, longBody);
      const bodyWarnings = d.filter((dd) => dd.field === "body");
      expect(bodyWarnings).toContainEqual(
        expect.objectContaining({ severity: "warning", message: expect.stringContaining("exceeds the recommended 500 line limit") })
      );
    });

    it("does not warn when body is under 500 lines", () => {
      const shortBody = "Some content\n".repeat(100);
      const d = validate({ name: "test", description: "A skill." }, undefined, shortBody);
      const bodyWarnings = d.filter((dd) => dd.field === "body");
      expect(bodyWarnings).toHaveLength(0);
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
