# Code Style Rules

## TypeScript
- Use strict TypeScript (`strict: true` in tsconfig)
- Always use `import type { ... }` for type-only imports
- Prefer `const` over `let`, never use `var`
- Use `===` for all equality checks
- No explicit `any` — use `unknown` and narrow the type
- Functions must have explicit return types for public APIs
- Use template literals over string concatenation

## Naming
- **Files:** `kebab-case.ts` (e.g., `idea-check.ts`)
- **Classes:** `PascalCase` (e.g., `IdeaCheckAgent`)
- **Functions/Variables:** `camelCase` (e.g., `executePhase()`)
- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `MAX_CONTEXT_TOKENS`)
- **Types/Interfaces:** `PascalCase` (e.g., `PhaseResult`)
- **Database columns:** `snake_case` (e.g., `created_at`)

## Imports
Order imports in this sequence (separated by blank lines):
1. Node.js built-ins (`node:fs`, `node:path`)
2. External packages (`zod`, `hono`, `drizzle-orm`)
3. Internal workspace packages (`@loom/shared`, `@loom/database`)
4. Relative imports (`./utils.js`, `../types.js`)

## ESLint + Prettier
- ESLint config: `eslint.config.mjs` (flat config)
- Prettier config: `.prettierrc`
- Run before commit: `pnpm format && pnpm lint:fix`
