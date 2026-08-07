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

export interface MarketplaceValidationResult {
  /** Path to the `.claude-plugin/marketplace.json` that was checked */
  path: string;
  /** List of diagnostics (errors and warnings) */
  diagnostics: Diagnostic[];
}

export interface LintResult {
  skills: SkillValidationResult[];
  /**
   * Result of the plugin marketplace check, present only when a
   * `.claude-plugin/marketplace.json` was found at or above the scan root.
   * Absent for repositories that are not plugin marketplaces.
   */
  marketplace?: MarketplaceValidationResult;
  /** Total error count across all skills and the marketplace manifest */
  errorCount: number;
  /** Total warning count across all skills and the marketplace manifest */
  warningCount: number;
}

export interface ValidateOptions {
  /**
   * Enable Claude.ai-specific checks (reserved-word names, angle brackets in description).
   * These are NOT part of the agentskills.io spec.
   * @default false
   */
  claude?: boolean;
}

export interface LintOptions extends ValidateOptions {
  /**
   * Check `.claude-plugin/marketplace.json` (when one exists at or above the
   * scan root) for version drift against the plugin manifests it points at.
   * Auto-detected, so repositories without a manifest are unaffected.
   * @default true
   */
  marketplace?: boolean;
}
