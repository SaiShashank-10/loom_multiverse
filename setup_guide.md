# Loom Multiverse — 6 Immediate Steps (Detailed Guide)

> Each step has numbered sub-steps. Follow them in order. I'll help execute each one.

---

## Step 1: Create `.env` File ✅ (Doing now)

Since we're using Ollama (free, local), you don't need any API keys for LLMs.

| Sub-step | What to do |
|----------|-----------|
| 1.1 | Copy `.env.example` → `.env` |
| 1.2 | Verify the file was created |
| 1.3 | No API keys needed (Ollama is free!) |

---

## Step 2: Start Ollama + Pull Models

| Sub-step | What to do |
|----------|-----------|
| 2.1 | Start the Ollama server |
| 2.2 | Pull `qwen3:4b` (fast reasoning model) |
| 2.3 | Pull `nomic-embed-text` (embedding model for RAG) |
| 2.4 | Verify models are available |
| 2.5 | Test a quick prompt to confirm it works |

---

## Step 3: Start Docker Containers

| Sub-step | What to do |
|----------|-----------|
| 3.1 | Check Docker Desktop is running |
| 3.2 | Run `pnpm docker:up` |
| 3.3 | Verify PostgreSQL is healthy |
| 3.4 | Verify Redis is healthy |
| 3.5 | Open pgAdmin in browser (http://localhost:5050) |
| 3.6 | Verify pgvector extension is installed |

---

## Step 4: Create GitHub Repository & Push

| Sub-step | What to do |
|----------|-----------|
| 4.1 | Create a new repo on GitHub (via browser or CLI) |
| 4.2 | Add remote origin |
| 4.3 | Push `main` branch |
| 4.4 | Create and push `develop` branch |
| 4.5 | Set branch protection rules |
| 4.6 | Add repository secrets for CI/CD |

---

## Step 5: Set Up Linear Workspace

| Sub-step | What to do |
|----------|-----------|
| 5.1 | Create Linear account (if not already) |
| 5.2 | Create team "Loom Multiverse" with key `LOOM` |
| 5.3 | Configure workflow states |
| 5.4 | Create labels |
| 5.5 | Enable GitHub integration |
| 5.6 | Generate API key |

---

## Step 6: Ready for Phase B

| Sub-step | What to do |
|----------|-----------|
| 6.1 | Verify everything is running |
| 6.2 | Tell me "Build Phase B" |

---

*Detailed execution begins now...*
