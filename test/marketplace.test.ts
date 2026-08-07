import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { findMarketplaceManifest, validateMarketplace } from "../src/marketplace.js";
import { lintSkills } from "../src/lint.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

function manifest(fixture: string) {
  return join(FIXTURES, fixture, ".claude-plugin", "marketplace.json");
}

async function diagnostics(fixture: string) {
  const result = await validateMarketplace(manifest(fixture));
  return result.diagnostics;
}

async function errors(fixture: string) {
  return (await diagnostics(fixture)).filter((d) => d.severity === "error");
}

describe("validateMarketplace", () => {
  it("passes when marketplace.json and plugin.json agree", async () => {
    expect(await diagnostics("marketplace-valid")).toHaveLength(0);
  });

  it("reports drift between marketplace.json and plugin.json", async () => {
    const found = await errors("marketplace-drift");
    expect(found.some((e) => e.field === 'plugins["demo"].version')).toBe(true);
    expect(found.some((e) => e.message.includes('"1.0.0"'))).toBe(true);
    expect(found.some((e) => e.message.includes('"1.2.0"'))).toBe(true);
  });

  it("reports drift between metadata.version and the highest plugin version", async () => {
    const found = await errors("marketplace-drift");
    expect(found.some((e) => e.field === "metadata.version")).toBe(true);
  });

  it("stays quiet when neither side declares a version", async () => {
    expect(await diagnostics("marketplace-no-versions")).toHaveLength(0);
  });

  it("reports a source that has no readable plugin.json", async () => {
    const found = await errors("marketplace-missing-plugin");
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("plugin.json");
  });

  it("reports malformed JSON", async () => {
    const found = await errors("marketplace-bad-json");
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("Invalid JSON");
  });

  it("skips non-local sources instead of failing to resolve them", async () => {
    expect(await diagnostics("marketplace-remote-source")).toHaveLength(0);
  });
});

describe("findMarketplaceManifest", () => {
  it("finds a manifest in the directory itself", async () => {
    const found = await findMarketplaceManifest(join(FIXTURES, "marketplace-valid"));
    expect(found).toBe(manifest("marketplace-valid"));
  });

  it("ascends from a subdirectory to the manifest", async () => {
    const found = await findMarketplaceManifest(
      join(FIXTURES, "marketplace-valid", "plugins")
    );
    expect(found).toBe(manifest("marketplace-valid"));
  });

  it("returns null when there is no manifest", async () => {
    expect(await findMarketplaceManifest(join(FIXTURES, "valid-skill"))).toBeNull();
  });
});

describe("lintSkills marketplace integration", () => {
  it("attaches a marketplace result and counts its errors", async () => {
    const result = await lintSkills(join(FIXTURES, "marketplace-drift"));
    expect(result.marketplace).toBeDefined();
    expect(result.marketplace!.path).toBe(manifest("marketplace-drift"));
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it("omits the marketplace result when the check is disabled", async () => {
    const result = await lintSkills(join(FIXTURES, "marketplace-drift"), {
      marketplace: false,
    });
    expect(result.marketplace).toBeUndefined();
    expect(result.errorCount).toBe(0);
  });

  it("omits the marketplace result for a repository without a manifest", async () => {
    const result = await lintSkills(join(FIXTURES, "valid-skill"));
    expect(result.marketplace).toBeUndefined();
  });
});
