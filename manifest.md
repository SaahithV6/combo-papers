# Combo Papers — Hackathon Design Manifest (v3)

### *From research service to lifelong learning agent*

---

## One-sentence pitch

Combo Papers is a **persistent research mentor** that plans curricula, remembers learner gaps (EverOS), unlocks journal-grade literature via institutional identity, and turns papers into interactive Living Pages — built and submitted on Butterbase.

---

## Focus tracks

- **Autonomous Learning Agents** — plans, adapts, guides over a multi-step path
- **Lifelong Learning Agents** — EverOS memory across sessions/career stages
- **Open Frontier** — Living Page as the classroom substrate

---

## What we kept from v2 (Browser Use × YC)

The Living Page interaction layer is battle-tested and demo-ready:
progressive reveal, equation slow-burn, variable cards, evidence chains,
citation rabbit holes, notebooks, depth meter, spaced re-exposure.

## What changed for this hackathon

| Before | After |
|---|---|
| Convex real-time | Butterbase Postgres + auth + deploy + MCP submission |
| Clerk | Butterbase Auth |
| Vercel | Butterbase frontend deploy |
| Stateless search API | `/api/agent/search` → LearningPlan + MentorTurn |
| No memory OS | EverOS learner + agent trajectories |
| arXiv-biased | Institutional Unpaywall / library proxy preference |
| Service narrative | Agent-native / Beta Fund narrative |

---

## Beta Fund thesis (service → intelligent)

Judges should see three agent behaviors live:

1. **Orient** — query becomes a curriculum, not a list  
2. **Adapt** — struggle events rewrite the path  
3. **Remember** — EverOS makes the next session smarter  

Deployment and trust: Butterbase RLS-ready schema, institutional identity for journals, pedagogy that goes deeper not shallower ("I don't understand" → original prerequisite source).

---

## TAL / classroom path

Same agent can sit beside a research-methods course:
instructor sets goals → agent assigns Living Pages → depth meters + checkpoints as formative signals → pilot conversation with TAL product team.

---

## Sponsors wiring

| Sponsor | Integration point |
|---|---|
| Butterbase | Backend, auth, schema, deploy, **submission** |
| EverMind / EverOS | Lifelong memory |
| TAL | Domain mentor / pilot pathway (narrative + demo) |
| Nebius | Optional model credits |
| Beta Fund | Agent-native company framing |

---

## Build plan (event day)

### Morning
- [ ] Butterbase promo + app + schema apply  
- [ ] EverOS key  
- [ ] Institutional email in env / signup  
- [ ] Confirm demo Living Page loads  

### Afternoon
- [ ] Wire realtime subscriptions if time  
- [ ] Migrate PDF snapshots to Butterbase Storage  
- [ ] Raven harness showcase if EverMind booth available  
- [ ] Practice 4-minute demo  
- [ ] Submit via Butterbase MCP  

---

## Why this wins

**Pedagogy:** Living Pages preserve granularity; agent adds curriculum + memory.  
**Deployment:** Butterbase is the mandated path — we're native, not bolted on.  
**Trust:** Institutional identity + original-source prerequisites, not dumbed-down summaries.  
**Scale:** One mentor agent → many learners; TAL pilot language already in the pitch.
