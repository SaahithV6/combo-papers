# Getting Started — Combo Papers Agent

## 1. Install

```bash
cd combo-papers
npm install
cp .env.local.example .env.local
npm run dev
```

Demo works with an empty `.env.local`.

## 2. Butterbase (mandatory for submission)

1. Dashboard: https://dashboard.butterbase.ai/billing  
2. Select **Launch**, promo code **`BUTTER0711`** ($20 credits).  
3. Create an app → copy `app_id`.  
4. Generate a service key (`bb_sk_…`).  
5. Put into `.env.local`:

```
NEXT_PUBLIC_BUTTERBASE_APP_ID=app_...
NEXT_PUBLIC_BUTTERBASE_API_URL=https://api.butterbase.ai
NEXT_PUBLIC_BUTTERBASE_ANON_KEY=...
BUTTERBASE_SERVICE_KEY=bb_sk_...
BUTTERBASE_API_KEY=bb_sk_...
```

6. Apply `butterbase/schema.json` via Butterbase MCP (`apply_schema`) or dashboard.  
7. Connect Cursor MCP to `https://api.butterbase.ai/mcp` with your key (for deploy + **judging submission**).

Discord: `#Butterbase-support`

## 3. EverOS memory (high upside for EverMind track)

1. https://everos.evermind.ai — create account, copy API key.  
2. `EVEROS_API_KEY=...` in `.env.local`  
3. Optional Raven: `curl -fsSL https://raven.evermind.ai/install.sh | bash`  
4. EverMind Discord: https://discord.gg/gYep5nQRZJ

## 4. Institutional journals

```
INSTITUTIONAL_EMAIL=you@youruniversity.edu
INSTITUTION_DOMAIN=youruniversity.edu
LIBRARY_PROXY_BASE_URL=https://proxy.library.edu/login?url=
```

Sign up in-app with the same email so the mentor prefers peer-reviewed versions.

## 5. Optional partner keys

| Variable | Unlocks |
|---|---|
| `ANTHROPIC_API_KEY` | Full Living Page processing |
| `BROWSER_USE_API_KEY` | Multi-source web agent search |
| `DAYTONA_API_KEY` | Full sandboxes |
| `NEBIUS_API_KEY` | Nebius Builder credits |
| `MONGODB_URI` | Legacy PDF GridFS snapshots |

## 6. Hackathon demo script (4 min)

1. Sign in with institutional email (or skip for demo).  
2. Query: `mechanistic interpretability` → show mentor plan (prereqs + papers + checkpoints).  
3. Open Living Page — progressive reveal, equation focus, variable hover.  
4. Click **I don't understand** → prerequisite + adapt signal.  
5. Mention EverOS memory + Butterbase persistence for lifelong path.  
6. Close on Beta Fund: service → intelligent agent; TAL: classroom/pilot path.

## 7. Deploy

Prefer Butterbase frontend deployment tools once MCP is authenticated. Do **not** rely on Vercel for the official submission path.
