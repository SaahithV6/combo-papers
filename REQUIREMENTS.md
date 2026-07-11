# Requirements to make the vision work

Vision (aligned with [UW Living Papers](https://github.com/uwdata/living-papers)):  
**Agentic literature review** that turns papers into interactive, simulatable, visual Living Pages — then a mentor agent remembers you (EverOS), plans curricula, and prefers institutional journal access (UCSC) over preprint-only discovery.

---

## Done already

- [x] Butterbase app `combo-papers` (`app_wkr61q0xkhs8`) + schema applied
- [x] EverOS key working; seeded memory for `sarveera@ucsc.edu`
- [x] Nebius-first LLM client (`src/lib/llm.ts`) with Anthropic optional fallback
- [x] Agent search / adapt APIs + institutional Unpaywall ranking
- [x] GitHub repo push (this codebase)

## Must do for a credible hackathon demo

1. **Nebius Token Factory key**  
   Create at https://tokenfactory.nebius.com → put in `.env.local` as `NEBIUS_API_KEY`.  
   Without this, paper processing / prerequisites fall back to demo JSON only (or Anthropic if you set it).

2. **Sign up once in-app with `sarveera@ucsc.edu`**  
   Butterbase Auth → institutional domain unlocks journal ranking.  
   Optional: set UCSC EZProxy `LIBRARY_PROXY_BASE_URL` if you have it.

3. **Flush EverOS after a learning session**  
   Call flush (already exposed in `src/lib/everos.ts`) so MemCells consolidate into profile / skills — this is the lifelong-learning proof for EverMind judges.

4. **One interactive simulation moment** (Living Papers DNA)  
   Demo must show more than reading: a Pyodide / notebook cell that *runs* a figure or toy model from the paper. That’s the UW Living Papers differentiator vs a summarizer.

5. **Submit via Butterbase MCP** (event requirement) — deploy when you’re ready; not done yet per instruction.

## Strongly recommended (afternoon stretch)

| Gap | Why |
|---|---|
| Butterbase Realtime on `learning_threads` / `agent_jobs` | Replace Convex-style live “paper 1 of 5 ready” |
| Butterbase Storage for PDF snapshots | Drop Mongo/GridFS |
| RLS `secure` on user-owned tables | Trust story for Beta Fund / TAL |
| Raven harness (EverMind) | Fastest memory-native agent showcase |
| Browser Use key | Multi-source discovery beyond OpenAlex/S2/arXiv |
| Daytona key | Full sandboxes when Pyodide isn’t enough |

## Product framing (don’t lose this)

| UW Living Papers | Combo Papers agent |
|---|---|
| Authoring toolkit for interactive articles | **Agent** that *finds + transforms* existing literature into Living Pages |
| Executable figures / reactive runtime | Notebooks + progressive reveal + evidence chains |
| Static PDF + web dual output | Web-native mentor path with EverOS memory |
| Researcher authors the augmentations | Mentor plans curriculum; learner struggle adapts the path |

Beta Fund one-liner: **not a search API — a persistent research mentor whose classroom is the paper.**

## Keys checklist

| Key | Status |
|---|---|
| Butterbase `bb_sk_…` | Set |
| EverOS | Set |
| Nebius Token Factory | **You need to add** |
| Anthropic | Optional fallback only |
| Browser Use / Daytona | Optional |
| UCSC library proxy | Optional |
