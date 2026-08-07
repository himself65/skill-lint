import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { MarketplaceValidationResult } from "./types.js";

const MANIFEST_DIR = ".claude-plugin";
const MANIFEST_NAME = "marketplace.json";

/** Hard cap on how many parent directories to search above the scan root. */
const MAX_ASCEND = 5;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate a plugin marketplace manifest at or above `startDir`.
 *
 * The scan root is often a subdirectory (`skill-lint plugins`) while the
 * manifest lives at the repository root, so we ascend — but never past a
 * directory containing `.git`, so the search cannot escape the repository and
 * pick up an unrelated manifest from a parent checkout or the home directory.
 *
 * Returns `null` when there is no manifest. Repositories that are not plugin
 * marketplaces get no diagnostics and no behavior change.
 */
export async function findMarketplaceManifest(
  startDir: string
): Promise<string | null> {
  let dir = resolve(startDir);
  for (let i = 0; i <= MAX_ASCEND; i++) {
    const candidate = join(dir, MANIFEST_DIR, MANIFEST_NAME);
    if (await exists(candidate)) return candidate;

    // Stop at the repository root — do not look outside it.
    if (await exists(join(dir, ".git"))) return null;

    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return null;
}

interface MarketplacePlugin {
  name?: unknown;
  source?: unknown;
  version?: unknown;
}

/**
 * Compare dotted numeric version strings. Returns > 0 when `a` is newer.
 * Non-numeric segments compare as 0, which is fine for the "pick the highest"
 * use below — exact equality is checked with `!==`, not with this.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".");
  const pb = b.split(".");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number(pa[i] ?? 0) || 0;
    const nb = Number(pb[i] ?? 0) || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * Validate a `.claude-plugin/marketplace.json` against the plugin manifests it
 * points at.
 *
 * This is an internal-consistency check, not a spec-conformance check: a
 * marketplace manifest that declares a version for a plugin must agree with
 * that plugin's own `plugin.json`. The two files are edited by different
 * tools at different times, and nothing else catches the drift — release
 * tarballs typically package only the skill directories, so a stale
 * marketplace manifest ships a wrong version to installers while every check
 * stays green.
 *
 * Versions are only compared when at least one side declares one; a manifest
 * that omits versions entirely is left alone.
 */
export async function validateMarketplace(
  manifestPath: string
): Promise<MarketplaceValidationResult> {
  const result: MarketplaceValidationResult = {
    path: manifestPath,
    diagnostics: [],
  };
  const root = dirname(dirname(manifestPath));

  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  } catch (e) {
    result.diagnostics.push({
      severity: "error",
      field: "marketplace.json",
      message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    });
    return result;
  }

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    result.diagnostics.push({
      severity: "error",
      field: "marketplace.json",
      message: "marketplace.json must be a JSON object.",
    });
    return result;
  }

  const record = manifest as Record<string, unknown>;
  const entries = Array.isArray(record.plugins)
    ? (record.plugins as MarketplacePlugin[])
    : [];

  if (!Array.isArray(record.plugins)) {
    result.diagnostics.push({
      severity: "error",
      field: "plugins",
      message: "marketplace.json is missing a `plugins` array.",
    });
    return result;
  }

  const pluginVersions: string[] = [];

  for (const entry of entries) {
    const name = typeof entry?.name === "string" ? entry.name : "<unnamed>";

    if (typeof entry?.source !== "string" || entry.source.length === 0) {
      result.diagnostics.push({
        severity: "error",
        field: `plugins["${name}"]`,
        message: "Missing `source`.",
      });
      continue;
    }

    // Only local sources are resolvable; skip git/URL sources.
    if (/^[a-z][a-z0-9+.-]*:/i.test(entry.source)) continue;

    const pluginPath = resolve(root, entry.source, "plugin.json");
    let plugin: Record<string, unknown>;
    try {
      plugin = JSON.parse(await readFile(pluginPath, "utf-8"));
    } catch {
      result.diagnostics.push({
        severity: "error",
        field: `plugins["${name}"]`,
        message: `\`source\` '${entry.source}' does not contain a readable plugin.json.`,
      });
      continue;
    }

    const declared = entry.version;
    const actual = plugin.version;

    if (declared !== undefined || actual !== undefined) {
      if (declared !== actual) {
        result.diagnostics.push({
          severity: "error",
          field: `plugins["${name}"].version`,
          message:
            `Version drift: marketplace.json declares ${JSON.stringify(declared)} ` +
            `but ${entry.source}/plugin.json declares ${JSON.stringify(actual)}.`,
        });
      }
    }

    if (typeof actual === "string") pluginVersions.push(actual);
  }

  const metadata =
    record.metadata !== null &&
    typeof record.metadata === "object" &&
    !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : undefined;
  const metaVersion = metadata?.version;

  // Only meaningful when the manifest opts into a top-level version.
  if (typeof metaVersion === "string" && pluginVersions.length > 0) {
    const highest = pluginVersions.reduce((a, b) =>
      compareVersions(a, b) >= 0 ? a : b
    );
    if (metaVersion !== highest) {
      result.diagnostics.push({
        severity: "error",
        field: "metadata.version",
        message:
          `Version drift: metadata.version is ${JSON.stringify(metaVersion)} ` +
          `but the highest plugin version is ${JSON.stringify(highest)}.`,
      });
    }
  }

  return result;
}
