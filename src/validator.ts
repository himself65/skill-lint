import type { Diagnostic, SkillFrontmatter } from "./types.js";

const ALLOWED_FIELDS = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "compatibility",
]);

const RESERVED_WORDS = ["anthropic", "claude"];

const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;
const COMPATIBILITY_MAX_LENGTH = 500;
const NAME_PATTERN = /^[a-z0-9-]+$/;

/**
 * Validate a parsed SKILL.md frontmatter and return diagnostics.
 * @param frontmatter - Parsed frontmatter object
 * @param dirName - The parent directory name (to check name match)
 */
export function validate(
  frontmatter: SkillFrontmatter,
  dirName?: string
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Check for unexpected fields
  const unexpectedFields = Object.keys(frontmatter).filter(
    (k) => !ALLOWED_FIELDS.has(k)
  );
  if (unexpectedFields.length > 0) {
    diagnostics.push({
      severity: "error",
      field: "frontmatter",
      message: `Unexpected fields in frontmatter: ${unexpectedFields.join(", ")}. Only ${[...ALLOWED_FIELDS].sort().join(", ")} are allowed.`,
    });
  }

  // Validate name
  validateName(frontmatter.name, dirName, diagnostics);

  // Validate description
  validateDescription(frontmatter.description, diagnostics);

  // Validate compatibility
  if (frontmatter.compatibility !== undefined) {
    validateCompatibility(frontmatter.compatibility, diagnostics);
  }

  // Validate metadata
  if (frontmatter.metadata !== undefined) {
    validateMetadata(frontmatter.metadata, diagnostics);
  }

  return diagnostics;
}

function validateName(
  name: unknown,
  dirName: string | undefined,
  diagnostics: Diagnostic[]
): void {
  if (name === undefined || name === null) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: "Missing required field: name",
    });
    return;
  }

  if (typeof name !== "string" || name.length === 0) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: "Field 'name' must be a non-empty string",
    });
    return;
  }

  if (name.length > NAME_MAX_LENGTH) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: `Skill name '${name}' exceeds ${NAME_MAX_LENGTH} character limit (${name.length} chars)`,
    });
  }

  if (name !== name.toLowerCase()) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: `Skill name '${name}' must be lowercase`,
    });
  }

  if (!NAME_PATTERN.test(name)) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: `Skill name '${name}' contains invalid characters. Only lowercase letters, digits, and hyphens are allowed.`,
    });
  }

  if (name.startsWith("-") || name.endsWith("-")) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: "Skill name cannot start or end with a hyphen",
    });
  }

  if (name.includes("--")) {
    diagnostics.push({
      severity: "error",
      field: "name",
      message: "Skill name cannot contain consecutive hyphens",
    });
  }

  for (const reserved of RESERVED_WORDS) {
    if (name.includes(reserved)) {
      diagnostics.push({
        severity: "error",
        field: "name",
        message: `Skill name cannot contain reserved word '${reserved}'`,
      });
    }
  }

  if (dirName !== undefined && name !== dirName) {
    diagnostics.push({
      severity: "warning",
      field: "name",
      message: `Directory name '${dirName}' does not match skill name '${name}'`,
    });
  }
}

function validateDescription(
  description: unknown,
  diagnostics: Diagnostic[]
): void {
  if (description === undefined || description === null) {
    diagnostics.push({
      severity: "error",
      field: "description",
      message: "Missing required field: description",
    });
    return;
  }

  if (typeof description !== "string" || description.length === 0) {
    diagnostics.push({
      severity: "error",
      field: "description",
      message: "Field 'description' must be a non-empty string",
    });
    return;
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    diagnostics.push({
      severity: "error",
      field: "description",
      message: `Description exceeds ${DESCRIPTION_MAX_LENGTH} character limit (${description.length} chars)`,
    });
  }

  if (/<|>/.test(description)) {
    diagnostics.push({
      severity: "error",
      field: "description",
      message: "Description cannot contain angle brackets (< or >)",
    });
  }
}

function validateCompatibility(
  compatibility: unknown,
  diagnostics: Diagnostic[]
): void {
  if (typeof compatibility !== "string") {
    diagnostics.push({
      severity: "error",
      field: "compatibility",
      message: "Field 'compatibility' must be a string",
    });
    return;
  }

  if (compatibility.length === 0 || compatibility.length > COMPATIBILITY_MAX_LENGTH) {
    diagnostics.push({
      severity: "error",
      field: "compatibility",
      message: `Compatibility must be 1-${COMPATIBILITY_MAX_LENGTH} characters (${compatibility.length} chars)`,
    });
  }
}

function validateMetadata(
  metadata: unknown,
  diagnostics: Diagnostic[]
): void {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    diagnostics.push({
      severity: "error",
      field: "metadata",
      message: "Field 'metadata' must be a mapping of string keys to string values",
    });
    return;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof key !== "string") {
      diagnostics.push({
        severity: "warning",
        field: "metadata",
        message: `Metadata key '${key}' should be a string`,
      });
    }
    if (typeof value !== "string") {
      diagnostics.push({
        severity: "warning",
        field: "metadata",
        message: `Metadata value for key '${key}' is not a string (got ${typeof value})`,
      });
    }
  }
}
