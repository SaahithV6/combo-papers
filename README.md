# Combo Papers — Lifelong Learning Agent

> *An agent-native research mentor that plans curricula, remembers your gaps via EverOS, prefers journal literature through institutional access, and turns papers into interactive, runnable learning experiences.*

Built for the **TAL × Butterbase × EverMind AI Education Hackathon** (July 2026).  
Tracks: **Autonomous Learning Agents** · **Lifelong Learning Agents**

Inspired by UW [Living Papers](https://github.com/uwdata/living-papers) (interactive scholarly articles) — we agentify discovery + mentoring on top of that interaction model.

Repo: https://github.com/SaahithV6/combo-papers  
Butterbase app: `app_wkr61q0xkhs8` (`combo-papers`) — schema applied, not deployed yet.

---

## Why this is not a search product

The previous Combo Papers build was a **service**: query → papers → interactive page.

This build graduates into an **intelligent model** (Beta Fund thesis):

| Service model | Agent model |
|---|---|
| One-shot search | Persistent mentor that plans a multi-step learning path |
| Stateless sessions | EverOS memory of goals, gaps, and trajectories |
| arXiv-first discovery | Institutional email → Unpaywall/journal preference |
| User drives every click | Agent adapts on "I don't understand", checkpoints, skim exits |
| Deploy on Vercel + Convex | Butterbase auth, Postgres, storage, functions, frontend deploy |

Pedagogy + deployment + trust — not just model capability.

---

## Demo (no keys required)

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Try demo: Mechanistic Interpretability**.

---

## Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | Next.js 15 | Living Pages + mentor UI |
| Backend | **Butterbase** | Auth, Postgres, storage, functions, deploy, hackathon submission |
| Memory | **EverOS (EverMind)** | Lifelong learner + agent trajectory memory |
| Parsing | Anthropic Claude | Sections, math, evidence chains, notebooks |
| Discovery | OpenAlex / Semantic Scholar / arXiv / Browser Use | Hybrid search |
| Journals | Unpaywall + optional library proxy | Institutional access beyond preprints |
| Sandboxes | Daytona / Pyodide | Runnable labs |
| Cloud credits | Nebius (optional) | Model / token factory |

---

## Account setup (event day)

Do these once so you build, not configure:

1. **Butterbase** — https://dashboard.butterbase.ai/billing → Launch plan → promo `BUTTER0711`  
   Generate API key (`bb_sk_…`), create an app, put IDs in `.env.local`.  
   Apply schema from `butterbase/schema.json` via Butterbase MCP / dashboard.  
   Submit the project through Butterbase MCP for judging.

2. **EverOS** — https://everos.evermind.ai → create account → `EVEROS_API_KEY`  
   Optional: Raven harness https://raven.evermind.ai

3. **Institutional email** — set `INSTITUTIONAL_EMAIL` / sign up with `.edu` so journal ranking + Unpaywall use your domain. Optional `LIBRARY_PROXY_BASE_URL` for EZProxy-style unlocks.

4. **Anthropic / Browser Use / Daytona / Nebius** — as available from partner desks.

---

## Agent API

| Route | Purpose |
|---|---|
| `POST /api/agent/search` | Hybrid discovery + institutional ranking + mentor learning plan |
| `POST /api/agent/adapt` | Lifelong adaptation on struggle / checkpoint / engagement signals |
| `POST /api/search` | Legacy paper search (still available) |
| `POST /api/process` | Claude Living Page enrichment |
| `POST /api/prerequisite` | Prerequisite concept (feeds adapt) |

---

## Product surface (unchanged strengths)

- Interactive math (blur-to-focus, equation stories)
- Variable hover cards + notation warnings
- Evidence chains, citation graph, rabbit-hole navigation
- Progressive reveal reading modes
- Depth meter + spaced re-exposure
- Embedded notebooks

---

## Pitch for Beta Fund / TAL

**Problem:** Literature review tools are services. Learners forget. Labs cannot scale mentoring.

**Solution:** A lifelong learning agent whose classroom *is* the paper — with memory, curriculum planning, and institutional-grade sources.

**Why now:** Butterbase removes backend friction; EverOS makes memory durable; education buyers care about outcomes and trust, not another chat box.

**Ask:** Pilot with research-methods / grad onboarding cohorts; Fellowship conversation for agent-native expansion (multi-learner classroom orchestration, assessment agents).

---

## License

MIT
