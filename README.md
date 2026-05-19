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
      - uses: himself65/skill-lint@v1
        with:
          path: 'skills'  # directory containing skill folders (default: '.')
          claude: 'false' # set to 'true' to enable Claude.ai-specific checks
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
```

## License

MIT
