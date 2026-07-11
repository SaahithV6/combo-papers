# Opening notebooks in Colab (no OAuth required)

You **do not** need Google OAuth in Combo Papers to use Colab.

Colab cannot be embedded in our page (Google blocks iframes). The seamless-enough path:

## One-click from Combo Papers

1. Open a Living Page → press **N** (or Notebook).
2. Click **Open in Colab ↗**
3. Combo Papers:
   - downloads a `.ipynb` to your machine
   - opens a blank Colab tab
4. In Colab: **File → Upload notebook** → select the downloaded file.
5. Run cells (GPU optional).

That’s it — works with a normal Google login **inside Colab’s tab**, not via our Butterbase OAuth.

## Alternatives

| Method | Needs our OAuth? | Notes |
|---|---|---|
| In-page **Pyodide** | No | Primary for viz (numpy/matplotlib/…) |
| Download `.ipynb` only | No | Open later in Colab / Jupyter / VS Code |
| Open in Colab (download + upload) | No | Recommended escape hatch |
| Public GitHub → `colab.research.google.com/github/...` | No | Only if notebook is in a public repo |
| Drive upload via API | Yes (Google) | Optional later; not needed for demo |

## Google OAuth in Combo Papers is separate

Butterbase **Continue with Google** is only for signing into *our* app (save/share identity).  
See `docs/GOOGLE_OAUTH_SETUP.md` if you want that — **not a Colab blocker**.
