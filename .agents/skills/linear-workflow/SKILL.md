---
name: linear-workflow
description: Linear project tracking workflow — issue states, label taxonomy, automation rules, and GitHub integration.
---

# Linear Workflow Guide

## Workflow States
```
Backlog → Todo → In Progress → In Review → Done → Deployed
```

## Label Taxonomy
### Phase Labels
- `phase:idea-check`
- `phase:planning`
- `phase:design`
- `phase:building`
- `phase:testing`
- `phase:launch`

### Agent Labels
- `agent:orchestrator`
- `agent:idea-check`
- `agent:planning`
- `agent:design`
- `agent:build`
- `agent:test`
- `agent:launch`
- `agent:feed`

### Type Labels
- `bug`
- `enhancement`
- `documentation`
- `infrastructure`
- `security`

## Automation Rules
1. **Branch created** → Issue moves to "In Progress"
2. **PR opened** → Issue moves to "In Review"
3. **PR merged to develop** → Issue stays "In Review" (staging deploy)
4. **PR merged to main** → Issue moves to "Done"
5. **Deploy to production succeeds** → Issue moves to "Deployed"

## Branch Naming Convention
`feature/LOOM-123-short-description`
`fix/LOOM-456-bug-description`
`chore/LOOM-789-maintenance-task`

## Setup Steps
1. Create Linear workspace
2. Create team "Loom Multiverse" with key prefix `LOOM`
3. Configure workflow states as above
4. Create labels as listed
5. Enable GitHub integration in Linear Settings → Integrations
6. Generate API key in Settings → API → Personal API Keys
7. Add `LINEAR_API_KEY` to GitHub repository secrets
