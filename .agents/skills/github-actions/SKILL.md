---
name: github-actions
description: Guide for the CI/CD pipeline — how to add/modify workflows, reusable patterns, secret management, and Linear integration.
---

# GitHub Actions Guide

## Pipeline Architecture
```
PR → CI (lint+typecheck+test+build) → OpenCode Review → Linear Sync
develop push → Deploy Staging → Smoke Tests → Linear "In Review"
main push → Regression → Deploy Production (approval gate) → Release → Linear "Deployed"
Weekly → Security Scan (npm audit + CodeQL + Semgrep)
Schema change → Migration Validate → Production Apply (approval gate)
```

## Workflow Files
| File | Trigger | Purpose |
|------|---------|---------|
| `ci.yml` | Push/PR | Matrix tests, lint, typecheck, build |
| `opencode-review.yml` | PR | AI code review + Linear linking |
| `deploy-staging.yml` | Push to `develop` | Staging deployment |
| `deploy-production.yml` | Push to `main` | Production with approval gate |
| `deploy.yml` | Called by above | Reusable deploy logic |
| `security-scan.yml` | Weekly + PR to main | Security scanning |
| `database-migration.yml` | Schema changes | Migration validation |

## Composite Actions
- `.github/actions/setup-node/` — Node.js + pnpm + caching
- `.github/actions/linear-sync/` — Parse commits for LOOM-XXX and update Linear

## Adding a New Workflow
1. Create file in `.github/workflows/`
2. Define triggers, permissions, and jobs
3. Use `setup-node` composite action for consistency
4. Add `linear-sync` if the workflow should update Linear
5. Test on a feature branch before merging

## Required Secrets
Set these in GitHub repo Settings → Secrets:
- `LINEAR_API_KEY`
- `OPENCODE_API_KEY`
- `RENDER_API_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PRODUCTION_DATABASE_URL`
