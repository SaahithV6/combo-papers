# What I need from you (revoked keys + UCSC library reality)

## Already working

| Item | Status |
|---|---|
| Butterbase app + schema | OK (`app_wkr61q0xkhs8`) |
| EverOS memory | OK (seeded `sarveera@ucsc.edu`) |
| **Nebius Token Factory** | OK (chat smoke-tested; model `meta-llama/Llama-3.3-70B-Instruct`) |
| Demo Living Page (no LLM) | OK |

## Do NOT bother wiring right now

| Item | Why |
|---|---|
| **Pyodide** | You’ve hit too many failures; treat as broken for demo |
| **Daytona** | Assume revoked / unreliable for today |
| Anthropic | Optional only; Nebius is primary |
| Browser Use / Mongo / Laminar / Supermemory / old Convex / Clerk | Likely revoked; not required for core demo |

## Feasible path chosen: OpenAthens (1)

Discovery + ranking + UC Library Search (articles **and books**) are automatic.  
Closed full-text = one CruzID click on OpenAthens links. No VPN/Browser Use required for demo.

## Product intent (Combo Papers role)

General onboarding / research learning tool:
- Multi-paper paths from one query
- Conflict pros/cons when approaches disagree → user chooses
- Living Pages + rabbit holes + **in-page notebooks** (Pyodide base viz set; .ipynb / Colab backup)
- Save & share experiences (`/thread/[id]`)
- EverOS memory so learning compounds

## Sandboxes

- **Pyodide**: fixed missing `init` message; keep numpy/matplotlib/scipy/pandas/sklearn only
- **Daytona**: optional if key appears; not required
- **Colab / .ipynb download**: always available from notebook footer


UCSC **retired EZProxy** (`oca.ucsc.edu`) Dec 2024. Full-text for IEEE, ACM, Springer, JSTOR, Safari/O’Reilly ebooks, etc. is **OpenAthens + CruzID SSO**.

What an `@ucsc.edu` email gives the agent alone:
- Unpaywall contact compliance + OA PDFs
- Ranking that prefers journals over arXiv
- Minted **OpenAthens redirector links** + **UC Library Search** deep links (articles **and books**)

What it does **not** give silently:
- Automated download of every paywalled PDF/ebook without you authenticating

### To unlock “everything my UCSC online library can see”

Pick **one** of these (tell me which):

1. **Hackathon-realistic (recommended)**  
   You click OpenAthens once with CruzID when opening a paper/book link. Agent discovers + ranks; you unlock full text.  
   *I need nothing else from you.*

2. **Campus VPN / on-campus Wi‑Fi while building**  
   Many publishers allow IP-based access on the UC network.  
   *I need: you connect to UCSC VPN (or build on campus) and confirm a DOI PDF opens without login.*

3. **Browser agent with your logged-in session** (fragile, high upside)  
   Browser Use Cloud + a profile that already has OpenAthens cookies.  
   *I need: a fresh `BROWSER_USE_API_KEY` from the hackathon desk, and we accept flaky auth.*

4. **Library IT Primo API key** (discovery only, not full-text)  
   Ex Libris Primo API for richer book/article metadata from UC Library Search.  
   *I need: ask library@ucsc.edu / SILS for a Primo API key for `vid=01CDL_SCR_INST:USCS` — unlikely same-day.*

## Keys checklist — reply with values or “skip”

### Required for a strong demo
- [x] `NEBIUS_API_KEY` — **you gave this; saved locally**
- [x] `EVEROS_API_KEY` — have it
- [x] Butterbase `bb_sk_…` — have it
- [ ] Confirm you’ll use **OpenAthens click-through** (option 1) **or** VPN (option 2)

### Nice if the booth gives them today
- [ ] `BROWSER_USE_API_KEY` — only if we pursue option 3
- [ ] Nothing else mandatory

### Explicitly skip unless you insist
- [ ] Daytona
- [ ] Anthropic personal key
- [ ] MongoDB Atlas
- [ ] Laminar / Supermemory

## Sandbox strategy without Pyodide/Daytona

For the Living Papers “interactive simulation” moment:
1. Nebius generates a **small numpy/matplotlib script** shown as code
2. Primary CTA: **“Open in Google Colab”** (or download `.ipynb`) — no local sandbox
3. Optional static SVG / precomputed figure from Nebius if Colab is too slow for stage

## Env vars currently expected in `.env.local`

```
NEXT_PUBLIC_BUTTERBASE_APP_ID=app_wkr61q0xkhs8
BUTTERBASE_SERVICE_KEY=…          # have
EVEROS_API_KEY=…                  # have
NEBIUS_API_KEY=…                  # have
NEBIUS_MODEL=meta-llama/Llama-3.3-70B-Instruct
INSTITUTIONAL_EMAIL=sarveera@ucsc.edu
INSTITUTION_DOMAIN=ucsc.edu
OPENATHENS_DOMAIN=ucsc.edu
```

## What I need you to answer next (short)

1. Library path: **1 OpenAthens clicks** / **2 VPN** / **3 Browser Use**?  
2. Do you have (or can you get today) a **Browser Use** key? yes/no  
3. For the live demo, is **Colab open** acceptable instead of in-browser Pyodide? yes/no
