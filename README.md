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
| `--no-marketplace` | Skip the plugin marketplace check (auto-detected, so already a no-op when no manifest exists) |

## What it checks

| Rule | Severity | Description |
|------|----------|-------------|
| Missing `SKILL.md` | error | Skill directory must contain a `SKILL.md` file |
| Invalid frontmatter | error | Must start with `---`, valid YAML mapping, closed with `---` |
| Missing `name` | error | Required field |
| Name format | error | 1-64 chars, lowercase `[a-z0-9-]`, no leading/trailing/consecutive hyphens |
| Name/directory mismatch | error | `name` field must match parent directory name |
| Missing `description` | error | Required field |
| Description length | error | Must be 1-1024 characters |
| `compatibility` length | error | If present, must be 1-500 characters |
| `metadata` format | warning | Must be a mapping of string keys to string values |
| Unknown fields | error | Only `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility` allowed |
| Body line count | warning | `SKILL.md` body should stay under 500 lines (spec recommendation) |
| Body token estimate | warning | `SKILL.md` body should stay under ~5000 tokens (spec recommendation) |
| Reference depth | warning | Relative file references should be at most one directory level deep |
| Missing reference | warning | Relative file references in the body must exist on disk |

### Claude.ai-specific checks (opt-in)

Pass `--claude` (CLI) or set `claude: 'true'` (Action) to enable extra checks specific to Claude.ai web uploads. These are **not part of the agentskills.io spec**:

| Rule | Severity | Description |
|------|----------|-------------|
| Reserved words | error | Name cannot contain `anthropic` or `claude` |
| Angle brackets | error | Description cannot contain `<` or `>` |

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
