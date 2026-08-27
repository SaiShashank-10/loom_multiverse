# Contributing to Loom Multiverse

## Getting Started

1. Clone the repo and follow [README.md](./README.md) for setup
2. Create a Linear issue for your work
3. Create a branch following the naming convention

## Branching Strategy

| Branch | Purpose | Merges Into |
|--------|---------|-------------|
| `main` | Production | — |
| `develop` | Staging/Integration | `main` |
| `feature/LOOM-XXX-desc` | New features | `develop` |
| `fix/LOOM-XXX-desc` | Bug fixes | `develop` |
| `hotfix/LOOM-XXX-desc` | Critical fixes | `main` |

## Workflow

1. **Pick a Linear issue** — Move it to "In Progress"
2. **Create a branch** — `git checkout -b feature/LOOM-123-my-feature develop`
3. **Write code** — Follow the conventions in `.agents/rules/`
4. **Write tests** — Maintain or improve coverage
5. **Commit** — Use [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push & open PR** — Against `develop`
7. **Wait for CI** — Must pass lint, typecheck, tests, build
8. **Wait for OpenCode** — AI review will post comments automatically
9. **Address feedback** — From both human and AI reviewers
10. **Merge** — Squash merge to `develop`

## Commit Message Format

```
feat(agents): implement idea-check agent with market validation

- Add IdeaCheckAgent extending BaseAgent
- Integrate Founder Feed for competitor cross-reference
- Write unit tests for validation logic

LOOM-42
```

## Code Style

See `.agents/rules/code-style.md` for full details.

**Key points:**
- TypeScript strict mode
- `import type` for type-only imports
- ESLint + Prettier (auto-fixed on commit via Husky + lint-staged)
- File names: `kebab-case.ts`

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm turbo run test --filter=@loom/agents

# Watch mode (useful during development)
cd packages/agents && pnpm vitest
```

## Linear Integration

- Every PR must reference a Linear issue
- Use `LOOM-XXX` in branch names or commit messages
- CI automatically syncs issue status to Linear

## Questions?

Open a discussion or reach out to the team.
