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
| Depth meter | Done (merged into ReadingStatusBar) |
| Spaced re-exposure strip | Done |
| Did you follow that? checkpoints | Done |
| Research threads multi-paper | Done (+ conflicts pros/cons + path hub) |
| Thread timeline / what changed | Done |
| Glossary sidebar | Done (responsive drawer) |
| Keyboard shortcuts | Done (wired E/F/D/`/` + help modal) |
| TL;DR → jump to source sentence | Done |
| Social presence (“N others reading”) | Removed — credibility over gimmick |
| One-more next paper transition | Done |
| Save & share experiences | Done (`/thread/[id]` + Butterbase upsert/PATCH) |
| Per-user memory (Butterbase + EverOS) | Done — profile, gaps/knowns, guest→account migrate |
| App shell + design system | Done — shared nav, tokens, focus/skip/reduced-motion |
| Spatial Living Page workspace | Done — path rail, reading column, tool dock, status bar |
| Google OAuth | UI + callback ready — needs Google client ID/secret in Butterbase |
| OpenAthens / UCSC library books+articles | Done (click-through; no hardcoded personal email) |
| Side-by-side figure compare across papers | Not yet |
| Daytona full sandbox | Dropped for demo — not required |

## What you still paste

1. **Google OAuth** client ID + secret → see `docs/GOOGLE_OAUTH_SETUP.md`  
2. Nothing else required for the Living Page feature set above
