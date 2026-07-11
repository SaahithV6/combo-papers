# Browser Use — Article Discovery Agent

## What it does

`browser_use_agent.py` automatically discovers relevant academic articles from multiple
sources (arXiv, Semantic Scholar, PubMed, and optionally Google Scholar via the
`browser-use` library).

### Output

Structured JSON array written to **stdout**:

```json
[
  {
    "source": "arXiv",
    "title": "Attention Is All You Need",
    "abstract": "...",
    "authors": ["Vaswani, A.", "..."],
    "url": "https://arxiv.org/abs/1706.03762",
    "pdf_url": "https://arxiv.org/pdf/1706.03762.pdf",
    "arxiv_id": "1706.03762",
    "year": "2017",
    "citation_count": 90000
  }
]
```

---

## Setup

### 1. Install Python dependencies

```bash
cd browser-use
pip install -r requirements.txt
```

### 2. Install Playwright browsers (only needed for `browser-use` Google Scholar)

```bash
playwright install chromium
```

### 3. Set environment variables (optional)

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required by `browser-use` for the LLM backend |
| `ANTHROPIC_API_KEY` | Alternative LLM backend for `browser-use` |

The free API sources (arXiv, Semantic Scholar, PubMed) work without any API key.

---

## Usage

```bash
# Basic search
python browser_use_agent.py --query "transformer attention mechanism" --max-results 20

# Pipe output to a file
python browser_use_agent.py --query "diffusion models image generation" > results.json
```

---

## Integration with Next.js

The `/api/browser-use` route in this project calls this script as a subprocess and
streams results back to the browser. See `src/app/api/browser-use/route.ts`.
