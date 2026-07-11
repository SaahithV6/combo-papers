# Architecture — Combo Papers (Agent Edition)

## Philosophy

1. **Client is a rendering shell** — secrets, PDF fetch, Claude, EverOS, and institutional proxying stay server-side.
2. **Search is a learning plan** — `/api/agent/search` returns papers *and* a mentor curriculum.
3. **Struggle is a signal** — "I don't understand" and checkpoints call `/api/agent/adapt`, which writes EverOS memory, updates Butterbase `learners` gaps/knowns, and revises the path.
4. **Butterbase is the backend** — replaces Convex + Vercel for data, auth, and submission/deploy.
5. **Identity is stable** — signed-in Butterbase `user.id`, or a `guest_*` local id; both key EverOS + `learners.user_id`.

---

## System diagram

```
Learner (institutional email)
    │
    ├─ Butterbase Auth
    ├─ GET /                         Mentor home
    ├─ GET /paper/[id]               Living Page
    └─ GET /thread/[id]              Research thread
         │
         ▼
    Next.js API (server)
         │
    ┌────┴──────────────────────────────────────────┐
    │  /api/agent/search                            │
    │    ├── Hybrid discovery (OpenAlex, S2, arXiv, │
    │    │   Browser Use)                           │
    │    ├── Institutional rank + Unpaywall         │
    │    ├── mentorOrient() → LearningPlan          │
    │    ├── EverOS memory search / write           │
    │    └── Butterbase learning_threads insert     │
    │                                               │
    │  /api/agent/adapt                             │
    │    ├── mentorAdapt()                          │
    │    ├── EverOS learner events                  │
    │    ├── Butterbase learners gap/known update   │
    │    └── Butterbase learning_events             │
    │                                               │
    │  /api/learner                                 │
    │    ├── ensure / patch learners row            │
    │    ├── EverOS memory search                   │
    │    └── list learning_threads for user         │
    │                                               │
    │  /api/process · /api/prerequisite · /api/notebook │
    └───────────────────────────────────────────────┘
         │
    Butterbase Postgres (schema in butterbase/schema.json)
    EverOS Cloud (https://api.evermind.ai)
```

---

## From Convex → Butterbase

| Old (Convex) | New (Butterbase) |
|---|---|
| `threads` | `learning_threads` (+ `plan` JSON) |
| `papers` | `papers` |
| `jobs` | `agent_jobs` |
| — | `learners`, `learning_events`, `saved_papers` |
| Convex subscriptions | Butterbase Realtime (wire next) + sessionStorage for Living Pages |
| Clerk | Butterbase Auth |
| Vercel deploy | Butterbase frontend deployment + MCP submission |

MongoDB/GridFS remains an optional PDF snapshot store until migrated to Butterbase Storage.

---

## Agent model

```
LearnerProfile  → goals, knownConcepts, gapConcepts, institution
LearningPlan    → ordered steps: prerequisite | paper | checkpoint | lab | synthesis
MentorTurn      → mode: orient | teach | probe | plan | adapt
```

`buildLearningPlan()` inserts gap-first prerequisites, interleaves checkpoints, and ends with synthesis. That is the service→agent graduation judges should see in the demo.

---

## Institutional access

1. Parse email domain (`.edu`, `.ac.uk`, … or `INSTITUTION_DOMAIN`).
2. Boost journal / DOI / OpenAlex / PubMed results vs arXiv.
3. For top DOIs, call Unpaywall with the institutional email.
4. Optionally wrap PDF URLs with `LIBRARY_PROXY_BASE_URL` (EZProxy-style).

---

## Design tokens (preserved)

| Token | Value |
|---|---|
| Background | `#0a0e14` |
| Card | `#111827` |
| Text | `#e8e0d0` |
| Teal | `#00d4aa` |
| Amber | `#f5a623` |
| Body | IBM Plex Serif |
| Code | JetBrains Mono |
| Display | Syne |

---

## Security

- API keys only on the server (`EVEROS_API_KEY`, `BUTTERBASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, …)
- Demo mode works with empty `.env.local`
- Institutional proxy URLs never expose proxy credentials to the client beyond the rewritten PDF URL
