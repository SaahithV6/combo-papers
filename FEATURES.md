# YCBU feature checklist → Combo Papers

Status vs original [YCBU README](https://github.com/SaahithV6/YCBU-3-2026) / Living Papers design doc.

| Feature | Status |
|---|---|
| Web agent / hybrid search | Done (OpenAlex/S2/arXiv + optional Browser Use) |
| Relevance ranking | Done (scores + Nebius when keyed) |
| Interactive math / equation stories | Done |
| Variable hover cards | Done + **seen-before** amber underline across papers |
| Notation consistency checker | Done (UI wired into sections) |
| Figure viewer | Done |
| Reading modes Skim/Read/Deep Dive | Done |
| Progressive reveal | Done |
| I don't understand | Done (+ EverOS adapt) |
| Evidence chains | Done (deep-dive) |
| Citation graph + foundational/recent filter | Done |
| Rabbit hole stack/panel | Done |
| Live notebooks in-page | Done (Pyodide primary; Colab via download+upload, no OAuth) |
| Ambient audio + action chimes | Done (Sound toggle on Living Page; Web Audio) |
| Daytona full sandbox | Dropped for demo — not required |
| Depth meter | Done |
| Spaced re-exposure strip | **Wired** |
| Did you follow that? checkpoints | **Wired** |
| Research threads multi-paper | Done (+ conflicts pros/cons) |
| Thread timeline / what changed | **Wired** (lightweight) |
| Glossary sidebar | Done |
| Keyboard shortcuts | Done |
| TL;DR → jump to source sentence | **Wired** |
| Social presence (“N others reading”) | **Wired** (ambient) |
| One-more next paper transition | **Wired** |
| Save & share experiences | Done (`/thread/[id]`) |
| Per-user memory (Butterbase + EverOS) | **Done** — `learners` profile, gaps/knowns, EverOS episodes, Memory panel |
| Google OAuth | **UI + callback ready** — needs Google client ID/secret in Butterbase |
| OpenAthens / UCSC library books+articles | Done (click-through) |
| Side-by-side figure compare across papers | Not yet |
| Daytona full sandbox | Dropped for demo — not required |

## What you still paste

1. **Google OAuth** client ID + secret → see `docs/GOOGLE_OAUTH_SETUP.md`  
2. Nothing else required for the Living Page feature set above
