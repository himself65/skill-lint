export interface SkillFrontmatter {
  name?: unknown;
  description?: unknown;
  license?: unknown;
  compatibility?: unknown;
  metadata?: unknown;
  "allowed-tools"?: unknown;
  [key: string]: unknown;
}

export type Severity = "error" | "warning";

export interface Diagnostic {
  severity: Severity;
  message: string;
  field?: string;
}

export interface SkillValidationResult {
  /** Path to the skill directory */
  path: string;
  /** Parsed name (if available) */
  name?: string;
  /** List of diagnostics (errors and warnings) */
  diagnostics: Diagnostic[];
}

export interface LintResult {
  skills: SkillValidationResult[];
  /** Total error count across all skills */
  errorCount: number;
  /** Total warning count across all skills */
  warningCount: number;
}
