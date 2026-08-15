# skill-lint

Validate [Agent Skills](https://agentskills.io) (`SKILL.md`) for Claude.ai, Claude Code, and other agents.

Catches errors **before** uploading to Claude.ai Web — name format, description length, angle brackets, disallowed frontmatter fields, and more.

## Usage

### GitHub Action

```yaml
# .github/workflows/skill-lint.yml
name: Skill Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: himself65/skill-lint@v3
        with:
          path: 'skills'       # directory containing skill folders (default: '.')
          claude: 'false'      # set to 'true' to enable Claude.ai-specific checks
          claude-code: 'false' # set to 'true' to allow Claude Code frontmatter extensions
          marketplace: 'true'  # check .claude-plugin/marketplace.json (default: 'true')
```

### CLI

```bash
npx skill-lint ./skills
```

Or install globally:

```bash
npm install -g skill-lint
skill-lint ./skills
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON |
| `--quiet`, `-q` | Only show errors (suppress warnings) |
| `--claude` | Enable Claude.ai-specific checks (reserved-word names, angle brackets in description) |
| `--claude-code` | Accept Claude Code frontmatter extensions (`context`, `model`, `paths`, …) instead of reporting them |
| `--no-marketplace` | Skip the plugin marketplace check (auto-detected, so already a no-op when no manifest exists) |

## What it checks

| Rule | Severity | Description |
|------|----------|-------------|
| Missing `SKILL.md` | error | Skill directory must contain a `SKILL.md` file |
| `SKILL.md` filename casing | warning | A `skill.md` (or other casing) is read, but clients matching the name exactly will not find it |
| Invalid frontmatter | error | Must start with `---`, valid YAML mapping, closed with `---` |
| Missing `name` | error | Required field |
| Name format | error | 1-64 chars, lowercase letters (including non-ASCII), digits and hyphens, no leading/trailing/consecutive hyphens |
| Name/directory mismatch | error | `name` field must match parent directory name (compared Unicode-normalized) |
| Duplicate name | warning | Two skills in the same namespace declare the same `name`; skills in different plugins are namespaced and exempt |
| Missing `description` | error | Required field |
| Description length | error | Must be 1-1024 characters |
| `compatibility` length | error | If present, must be 1-500 characters |
| `allowed-tools` format | warning | Must be space-separated with balanced parentheses; a comma-separated list is flagged |
| `metadata` format | warning | Must be a mapping of string keys to string values |
| Unknown fields | error | Only `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility` allowed |
| Claude Code extension fields | error | Frontmatter fields Claude Code adds to the spec; suppressed by `--claude-code` |
| Empty body | warning | `SKILL.md` has no instructions after the frontmatter |
| Body line count | warning | `SKILL.md` body should stay under 500 lines (spec recommendation) |
| Body token estimate | warning | `SKILL.md` body should stay under ~5000 tokens (spec recommendation) |
| Reference depth | warning | Relative file references should be at most one directory level deep |
| Missing reference | warning | File references in the body must exist on disk — Markdown links, plus plain-text paths such as `scripts/extract.py` when the skill has that directory |
| Unreferenced reference file | warning | A file in `references/` that neither `SKILL.md` nor another reference file mentions never loads |

### Claude.ai-specific checks (opt-in)

Pass `--claude` (CLI) or set `claude: 'true'` (Action) to enable extra checks specific to Claude.ai web uploads. These are **not part of the agentskills.io spec**:

| Rule | Severity | Description |
|------|----------|-------------|
| Reserved words | error | Name cannot contain `anthropic` or `claude` |
| Angle brackets | error | Description cannot contain `<` or `>` |

### Claude Code frontmatter extensions (opt-out)

Claude Code accepts frontmatter fields the spec does not define — `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`, `hooks`, `paths`, and `shell`. They load fine in Claude Code, but claude.ai uploads and the Skills API reject them, so they are reported as errors with a message naming the tradeoff rather than lumped in with typos.

Pass `--claude-code` (CLI) or set `claude-code: 'true'` (Action) when Claude Code is the only target. Fields outside both lists still error, and the field values themselves are not validated.

### Plugin marketplace checks (automatic)

If a `.claude-plugin/marketplace.json` exists at or above the scan root, its version fields are checked against the `plugin.json` of every plugin it points at. The search stops at the repository root (a directory containing `.git`), so it never picks up a manifest from a parent checkout. Repositories without a manifest are unaffected — no diagnostics, no output change.

This is an **internal-consistency** check, not a spec-conformance one. The two files are edited by different tools at different times, and nothing else catches the drift: release archives typically package only the skill directories, so a stale marketplace manifest ships the wrong version to anyone running `npx plugins add` while every check stays green.

| Rule | Severity | Description |
|------|----------|-------------|
| Invalid marketplace JSON | error | `marketplace.json` must parse and be a JSON object |
| Missing `plugins` | error | `marketplace.json` must contain a `plugins` array |
| Missing `source` | error | Each `plugins[]` entry needs a `source` |
| Unresolvable `source` | error | A local `source` must contain a readable `plugin.json` (non-local sources are skipped) |
| Plugin version drift | error | `plugins[].version` must equal that plugin's `plugin.json` version |
| Metadata version drift | error | `metadata.version`, when present, must equal the highest plugin version |

Versions are only compared when at least one side declares one, so a manifest that omits versions entirely is left alone.

## Programmatic API

```typescript
import { lintSkills, lintSkill } from 'skill-lint';

const result = await lintSkills('./skills', { claude: false });
console.log(result.errorCount);   // number of errors
console.log(result.warningCount); // number of warnings

for (const skill of result.skills) {
  for (const d of skill.diagnostics) {
    console.log(`${d.severity}: ${d.message}`);
  }
}

// Present only when a .claude-plugin/marketplace.json was found
for (const d of result.marketplace?.diagnostics ?? []) {
  console.log(`${d.severity}: ${d.message}`);
}
```

## License

MIT
