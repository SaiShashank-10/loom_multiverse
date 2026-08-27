# Git Conventions

## Branching Strategy
- `main` — Production. Protected. Requires PR + approval.
- `develop` — Staging. Integration branch for features.
- `feature/LOOM-123-description` — Feature branches from `develop`
- `fix/LOOM-456-description` — Bug fix branches from `develop`
- `hotfix/LOOM-789-description` — Critical fixes from `main`
- `chore/LOOM-101-description` — Maintenance tasks from `develop`

## Commit Message Format (Conventional Commits)
```
<type>(<scope>): <description>

[optional body]

[optional footer: LOOM-123]
```

### Types
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting (no code change)
- `refactor` — Code restructuring
- `test` — Adding/fixing tests
- `chore` — Build, CI, tooling changes
- `perf` — Performance improvement

### Scopes
- `agents`, `orchestrator`, `mcp`, `database`, `api`, `dashboard`, `feed`, `ci`, `docs`

### Examples
```
feat(agents): implement idea-check agent with market validation

LOOM-42
```
```
fix(database): prevent duplicate ADR entries on retry

LOOM-108
```

## PR Requirements
1. Must link a Linear issue (branch name or description)
2. Must pass CI (lint, typecheck, tests, build)
3. Must have OpenCode AI review (auto-triggered)
4. Must be approved by at least 1 reviewer (CODEOWNERS)
5. Must use squash merge to `develop`, merge commit to `main`
