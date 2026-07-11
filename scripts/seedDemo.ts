#!/usr/bin/env npx ts-node
/**
 * Demo seed script - populates demo data.
 * Run with: npx ts-node scripts/seedDemo.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const demoData = {
  query: 'mechanistic interpretability in large language models',
  papers: [
    {
      id: 'arxiv:2209.11895',
      title: 'Toy Models of Superposition',
      authors: ['Nelson Elhage', 'Tristan Hume', 'Catherine Olsson', 'Nicholas Schiefer', 'Tom Henighan'],
      arxivId: '2209.11895',
      venue: 'Anthropic',
      year: 2022,
      pdfUrl: 'https://arxiv.org/pdf/2209.11895',
      sourceUrl: 'https://arxiv.org/abs/2209.11895',
      sourceName: 'arXiv',
      relevanceScore: 98,
      relevanceReason: 'Foundational paper on superposition directly relevant to LLM mechanistic interpretability',
      status: 'ready',
      tldr: [
        { sentence: 'Neural networks represent more features than dimensions by using superposition, packing multiple features into shared directions.', sourceSentenceId: 'blk-intro-1' },
        { sentence: 'Toy model experiments reveal superposition emerges with sparse features and forms geometric configurations like antipodal pairs.', sourceSentenceId: 'blk-intro-2' },
        { sentence: 'Superposition may be a primary obstacle to neural network interpretability.', sourceSentenceId: 'blk-intro-3' },
      ],
      sections: [
        {
          id: 'sec-intro',
          title: 'Introduction',
          level: 1,
          isAppendix: false,
          content: [
            { id: 'blk-intro-1', type: 'paragraph', raw: 'One of the most fundamental questions in mechanistic interpretability is how neural networks represent information internally. The linear representation hypothesis suggests that features correspond to directions in activation space.' },
            { id: 'blk-intro-2', type: 'paragraph', raw: 'Neural networks often pack many features into a small number of dimensions through superposition—representing more features than there are dimensions.' },
            { id: 'blk-intro-3', type: 'paragraph', raw: 'We find that superposition may be linked to neural network interpretability challenges, providing a mechanism for why networks are hard to interpret.' },
          ],
          marginNotes: [],
        },
        {
          id: 'sec-method',
          title: 'Toy Model Setup',
          level: 1,
          isAppendix: false,
          content: [
            { id: 'blk-method-1', type: 'paragraph', raw: 'We use a simple linear encoder-decoder model to study superposition. The encoder compresses input to a lower-dimensional hidden state, then a ReLU decoder reconstructs the input.' },
            { id: 'blk-eq-1', type: 'equation', raw: 'h = Wx + b, \\quad x\' = \\text{ReLU}(W^T h + b\')' },
          ],
          marginNotes: [],
        },
      ],
      variables: [
        { symbol: 'h', name: 'hidden state', definition: 'Compressed representation of input', firstSeenSectionId: 'sec-method', allOccurrences: ['blk-method-1', 'blk-eq-1'] },
        { symbol: 'W', name: 'weight matrix', definition: 'Encoder weight matrix mapping input to hidden', firstSeenSectionId: 'sec-method', allOccurrences: ['blk-eq-1'] },
      ],
      equations: [
        { id: 'eq-1', latex: 'h = Wx + b', label: 'Eq. 1', storySteps: ['Input x is compressed by W', 'Bias b is added', 'Result h has fewer dimensions than x'], relatedVariables: ['h', 'W', 'x', 'b'], blockId: 'blk-eq-1' },
      ],
      figures: [
        { id: 'fig-1', url: '', caption: 'Superposition: features (arrows) packed into fewer dimensions', label: 'Figure 1', referencedByBlockIds: ['blk-intro-1'] },
      ],
      citations: [
        { id: 'cite-1', title: 'Attention is All You Need', authors: ['Vaswani et al.'], year: 2017, arxivId: '1706.03762', isFoundational: true },
        { id: 'cite-2', title: 'Zoom In: An Introduction to Circuits', authors: ['Olah et al.'], year: 2020, url: 'https://distill.pub/2020/circuits/zoom-in/', isFoundational: true },
        { id: 'cite-3', title: 'Towards Monosemanticity: Decomposing Language Models With Dictionary Learning', authors: ['Bricken et al.'], year: 2023, url: 'https://transformer-circuits.pub/2023/monosemantic-features', isFoundational: false },
        { id: 'cite-4', title: 'Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 small', authors: ['Wang et al.'], year: 2023, arxivId: '2211.00593', isFoundational: false },
        { id: 'cite-5', title: 'A Mathematical Framework for Transformer Circuits', authors: ['Elhage et al.'], year: 2021, url: 'https://transformer-circuits.pub/2021/framework/index.html', isFoundational: true },
      ],
      notationWarnings: [],
      evidenceChains: [
        { claim: 'Superposition occurs when features are sparse', experiment: 'Vary feature sparsity in toy model and measure reconstruction loss', figureId: 'fig-1', statisticalResult: 'Superposition increases monotonically with sparsity (p < 0.001)', conclusion: 'Sparse features drive superposition formation', blockId: 'blk-method-1' },
      ],
      notebookCells: [
        {
          id: 'nb-concept-map',
          type: 'code',
          content: `import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Concept map for Toy Models of Superposition
fig, ax = plt.subplots(figsize=(8, 5))
ax.set_facecolor('#0a0e14')
fig.patch.set_facecolor('#0a0e14')

nodes = {
    'superposition': (0.5, 0.5),
    'sparsity': (0.2, 0.7),
    'features': (0.8, 0.7),
    'hidden state': (0.5, 0.15),
    'encoder W': (0.2, 0.3),
    'ReLU decoder': (0.8, 0.3),
    'interpretability': (0.5, 0.85),
}
edges = [
    ('sparsity', 'superposition'),
    ('features', 'superposition'),
    ('encoder W', 'hidden state'),
    ('hidden state', 'ReLU decoder'),
    ('superposition', 'interpretability'),
    ('features', 'encoder W'),
]

for (a, b) in edges:
    x1, y1 = nodes[a]
    x2, y2 = nodes[b]
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle='->', color='#00d4aa44', lw=1.2))

for label, (x, y) in nodes.items():
    color = '#00d4aa' if label == 'superposition' else '#f5a623' if label in ('sparsity', 'features') else '#9ca3af'
    ax.text(x, y, label, ha='center', va='center', fontsize=9,
            color=color, bbox=dict(boxstyle='round,pad=0.35', fc='#1a2235', ec=color, lw=0.8))

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis('off')
ax.set_title('Key Concepts: Toy Models of Superposition', color='#9ca3af', fontsize=10, pad=10)
plt.tight_layout()
plt.show()`,
          sectionId: 'sec-intro',
          isEditable: false,
        },
        {
          id: 'nb-1',
          type: 'markdown',
          content: '# Toy Models of Superposition\n\nThis notebook provides an interactive exploration of Elhage et al. (2022). **Superposition** is the phenomenon where a neural network represents *more features than it has dimensions*, by packing features into non-orthogonal directions.\n\nThe key insight: as features become **sparser** (less frequently active), the model can afford to overlap them in weight space without much interference—trading off reconstruction accuracy for representational capacity.',
          sectionId: 'sec-intro',
          isEditable: false,
        },
        {
          id: 'nb-2',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ── Toy model parameters (try changing these!) ──
n_features = 5   # number of input features
n_hidden = 2     # hidden dimension (bottleneck)
sparsity = 0.8   # probability a feature is zero on any given input

np.random.seed(42)

# ── Model: h = ReLU(Wx),  x_hat = W^T h ──
# W shape: (n_hidden, n_features)
W = np.random.randn(n_hidden, n_features) * 0.3

def forward(x):
    h = np.maximum(0, W @ x)       # encoder + ReLU
    return W.T @ h                 # linear decoder

# ── Loss: mean squared reconstruction error ──
def loss(W_candidate, samples):
    total = 0.0
    for x in samples:
        h = np.maximum(0, W_candidate @ x)
        x_hat = W_candidate.T @ h
        total += np.mean((x - x_hat) ** 2)
    return total / len(samples)

# ── Generate sparse inputs ──
def make_samples(n=500):
    X = np.random.randn(n, n_features)
    mask = np.random.rand(n, n_features) > sparsity
    return X * mask

samples = make_samples()
print(f"Toy model ready — W shape: {W.shape}")
print(f"Baseline reconstruction loss: {loss(W, samples):.4f}")`,
          sectionId: 'sec-method',
          isEditable: true,
        },
        {
          id: 'nb-3',
          type: 'markdown',
          content: '## Phase Transition: Sparsity vs Superposition\n\nThe key insight from Elhage et al. is that as feature **sparsity increases** (features are active less often), the model transitions from *dedicated* (orthogonal) to *superposed* representations.\n\nBelow we sweep sparsity from 0 (dense, every feature active) to 0.99 (very sparse) and measure how much the model uses superposition (features sharing directions in the hidden space).',
          sectionId: 'sec-method',
          isEditable: false,
        },
        {
          id: 'nb-4',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

np.random.seed(0)
n_features, n_hidden = 5, 2
sparsity_values = np.linspace(0.0, 0.99, 20)
losses = []

for sp in sparsity_values:
    W = np.random.randn(n_hidden, n_features) * 0.3
    # Simple gradient descent for 200 steps
    lr = 0.05
    for _ in range(200):
        X = np.random.randn(64, n_features) * (np.random.rand(64, n_features) > sp)
        H = np.maximum(0, X @ W.T)           # (batch, hidden)
        X_hat = H @ W                         # (batch, features)
        err = X_hat - X
        grad = (2 / 64) * (H.T @ err)        # dL/dW
        W -= lr * grad
    # Evaluate
    X_test = np.random.randn(200, n_features) * (np.random.rand(200, n_features) > sp)
    H_test = np.maximum(0, X_test @ W.T)
    X_hat_test = H_test @ W
    losses.append(np.mean((X_hat_test - X_test) ** 2))

fig, ax = plt.subplots(figsize=(7, 4))
ax.set_facecolor('#0a0e14')
fig.patch.set_facecolor('#0a0e14')
ax.plot(sparsity_values, losses, color='#00d4aa', lw=2)
ax.set_xlabel('Sparsity', color='#9ca3af')
ax.set_ylabel('Reconstruction Loss', color='#9ca3af')
ax.set_title('Reconstruction Loss vs Feature Sparsity', color='#e2e8f0', fontsize=12)
ax.tick_params(colors='#9ca3af')
for spine in ax.spines.values():
    spine.set_edgecolor('#1a2235')
ax.grid(True, color='#1a2235', linestyle='--', alpha=0.6)
plt.tight_layout()
plt.show()
print("Higher sparsity → model learns to superpose features, reducing loss at the cost of interference")`,
          sectionId: 'sec-method',
          isEditable: true,
        },
        {
          id: 'nb-5',
          type: 'markdown',
          content: '## Geometric Structure of Superposition\n\nFeatures in superposition arrange themselves into specific **geometric configurations** — antipodal pairs, equilateral triangles, pentagons — depending on the number of features vs hidden dimensions.\n\nFor `n_features=5, n_hidden=2` the learned weight columns (features vectors) form a regular **pentagon** in the 2D hidden space.',
          sectionId: 'sec-method',
          isEditable: false,
        },
        {
          id: 'nb-6',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

np.random.seed(1)
n_features, n_hidden = 5, 2
sparsity = 0.9

W = np.random.randn(n_hidden, n_features) * 0.3
lr = 0.05
for _ in range(500):
    X = np.random.randn(128, n_features) * (np.random.rand(128, n_features) > sparsity)
    H = np.maximum(0, X @ W.T)
    X_hat = H @ W
    err = X_hat - X
    W -= lr * (2 / 128) * (H.T @ err)

# W columns are the feature directions in hidden space
colors = ['#00d4aa', '#f5a623', '#a78bfa', '#f87171', '#34d399']
labels = [f'Feature {i+1}' for i in range(n_features)]

fig, ax = plt.subplots(figsize=(5, 5))
ax.set_facecolor('#0a0e14')
fig.patch.set_facecolor('#0a0e14')
ax.set_aspect('equal')
ax.axhline(0, color='#1a2235', lw=0.8)
ax.axvline(0, color='#1a2235', lw=0.8)

for i in range(n_features):
    dx, dy = W[:, i]
    ax.annotate('', xy=(dx, dy), xytext=(0, 0),
        arrowprops=dict(arrowstyle='->', color=colors[i], lw=2))
    ax.text(dx * 1.15, dy * 1.15, labels[i], color=colors[i], fontsize=9, ha='center')

ax.set_xlim(-1.4, 1.4)
ax.set_ylim(-1.4, 1.4)
ax.set_title(f'Feature directions (W columns) — sparsity={sparsity}', color='#e2e8f0', fontsize=11)
ax.tick_params(colors='#9ca3af')
for spine in ax.spines.values():
    spine.set_edgecolor('#1a2235')
plt.tight_layout()
plt.show()
print("Notice: 5 features fit into 2D by forming a near-regular pentagon — superposition geometry!")`,
          sectionId: 'sec-method',
          isEditable: true,
        },
        {
          id: 'nb-7',
          type: 'markdown',
          content: '## Try It Yourself\n\nExperiment with the cells above by changing these parameters:\n\n- **`n_features`** — more features → more superposition needed\n- **`n_hidden`** — fewer hidden dims → more compression, more superposition\n- **`sparsity`** — closer to 1.0 → sparser features, less interference → more superposition tolerated\n- **`lr` / steps** — watch the model converge to the geometric configurations described in the paper',
          sectionId: 'sec-method',
          isEditable: false,
        },
        {
          id: 'nb-8',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ── Knobs: change these to explore ──
n_features = 6    # try 2, 3, 5, 6, 10
n_hidden   = 2    # try 1, 2, 3
sparsity   = 0.9  # try 0.0, 0.5, 0.9, 0.99

np.random.seed(42)
W = np.random.randn(n_hidden, n_features) * 0.3
lr = 0.05
for _ in range(600):
    X = np.random.randn(128, n_features) * (np.random.rand(128, n_features) > sparsity)
    H = np.maximum(0, X @ W.T)
    X_hat = H @ W
    err = X_hat - X
    W -= lr * (2 / 128) * (H.T @ err)

if n_hidden == 2:
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.set_facecolor('#0a0e14'); fig.patch.set_facecolor('#0a0e14')
    ax.set_aspect('equal')
    ax.axhline(0, color='#1a2235', lw=0.8); ax.axvline(0, color='#1a2235', lw=0.8)
    cmap = plt.get_cmap('tab10')
    for i in range(n_features):
        dx, dy = W[:, i]
        ax.annotate('', xy=(dx, dy), xytext=(0, 0),
            arrowprops=dict(arrowstyle='->', color=cmap(i / n_features), lw=2))
        ax.text(dx * 1.18, dy * 1.18, f'F{i+1}', color=cmap(i / n_features), fontsize=9, ha='center')
    ax.set_xlim(-1.5, 1.5); ax.set_ylim(-1.5, 1.5)
    ax.set_title(f'{n_features} features / {n_hidden}D — sparsity={sparsity}', color='#e2e8f0', fontsize=11)
    ax.tick_params(colors='#9ca3af')
    for spine in ax.spines.values(): spine.set_edgecolor('#1a2235')
    plt.tight_layout()
    plt.show()
else:
    print(f"W (shape {W.shape}):")
    print(np.round(W, 3))
    X_test = np.random.randn(500, n_features) * (np.random.rand(500, n_features) > sparsity)
    H_test = np.maximum(0, X_test @ W.T)
    X_hat_test = H_test @ W
    print(f"Reconstruction loss: {np.mean((X_hat_test - X_test)**2):.4f}")`,
          sectionId: 'sec-method',
          isEditable: true,
        },
      ],
      readersOnline: 0,
    },
    {
      id: 'arxiv:2211.00593',
      title: 'Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 small',
      authors: ['Kevin Wang', 'Alexandre Variengien', 'Arthur Conmy', 'Buck Shlegeris', 'Jacob Steinhardt'],
      arxivId: '2211.00593',
      venue: 'ICLR 2023',
      year: 2023,
      pdfUrl: 'https://arxiv.org/pdf/2211.00593',
      sourceUrl: 'https://arxiv.org/abs/2211.00593',
      sourceName: 'arXiv',
      relevanceScore: 95,
      relevanceReason: 'Directly demonstrates circuit-level mechanistic interpretability in a production LLM',
      status: 'ready',
      tldr: [
        { sentence: 'The authors identify and characterize a complete circuit implementing indirect object identification in GPT-2 small.', sourceSentenceId: 'blk-ioi-intro-1' },
        { sentence: 'This circuit involves 26 attention heads across 9 distinct head types performing specific computations.', sourceSentenceId: 'blk-ioi-intro-2' },
        { sentence: 'The findings demonstrate that circuits can be faithfully reverse-engineered in real language models.', sourceSentenceId: 'blk-ioi-intro-3' },
      ],
      sections: [
        {
          id: 'sec-ioi-intro',
          title: 'Introduction',
          level: 1,
          isAppendix: false,
          content: [
            { id: 'blk-ioi-intro-1', type: 'paragraph', raw: 'We study indirect object identification (IOI), a well-studied NLP task, and identify a complete circuit implementing it in GPT-2 small.' },
            { id: 'blk-ioi-intro-2', type: 'paragraph', raw: 'The circuit involves 26 attention heads performing 9 distinct functions, from duplicate token detection to name mover heads.' },
            { id: 'blk-ioi-intro-3', type: 'paragraph', raw: 'Our work demonstrates that mechanistic interpretability can reverse-engineer real neural network behavior.' },
          ],
          marginNotes: [],
        },
      ],
      variables: [],
      equations: [],
      figures: [],
      citations: [
        { id: 'cite-ioi-1', title: 'Toy Models of Superposition', authors: ['Elhage et al.'], year: 2022, arxivId: '2209.11895', isFoundational: true },
        { id: 'cite-ioi-2', title: 'In-context Learning and Induction Heads', authors: ['Olsson et al.'], year: 2022, url: 'https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html', isFoundational: true },
        { id: 'cite-ioi-3', title: 'Towards Automated Circuit Discovery for Mechanistic Interpretability', authors: ['Conmy et al.'], year: 2023, arxivId: '2304.14997', isFoundational: false },
        { id: 'cite-ioi-4', title: 'A Mathematical Framework for Transformer Circuits', authors: ['Elhage et al.'], year: 2021, url: 'https://transformer-circuits.pub/2021/framework/index.html', isFoundational: true },
        { id: 'cite-ioi-5', title: 'Attention is All You Need', authors: ['Vaswani et al.'], year: 2017, arxivId: '1706.03762', isFoundational: true },
      ],
      notationWarnings: [],
      evidenceChains: [],
      notebookCells: [
        {
          id: 'nb-ioi-concept',
          type: 'code',
          content: `import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 5))
ax.set_facecolor('#0a0e14'); fig.patch.set_facecolor('#0a0e14')

nodes = {
    'IOI Task': (0.5, 0.5),
    'Duplicate Token Heads': (0.15, 0.75),
    'S-Inhibition Heads': (0.5, 0.85),
    'Name Mover Heads': (0.85, 0.75),
    'Backup Name Movers': (0.85, 0.3),
    'Negative Name Movers': (0.15, 0.3),
    'Attention Pattern': (0.5, 0.15),
}
edges = [
    ('Duplicate Token Heads', 'S-Inhibition Heads'),
    ('S-Inhibition Heads', 'Name Mover Heads'),
    ('Name Mover Heads', 'IOI Task'),
    ('Negative Name Movers', 'IOI Task'),
    ('Backup Name Movers', 'IOI Task'),
    ('Attention Pattern', 'IOI Task'),
]
colors = {
    'IOI Task': '#00d4aa',
    'Duplicate Token Heads': '#f5a623',
    'S-Inhibition Heads': '#a78bfa',
    'Name Mover Heads': '#34d399',
    'Backup Name Movers': '#34d399',
    'Negative Name Movers': '#f87171',
    'Attention Pattern': '#9ca3af',
}
for (a, b) in edges:
    x1, y1 = nodes[a]; x2, y2 = nodes[b]
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle='->', color='#ffffff22', lw=1.2))
for label, (x, y) in nodes.items():
    c = colors.get(label, '#9ca3af')
    ax.text(x, y, label, ha='center', va='center', fontsize=8.5, color=c,
            bbox=dict(boxstyle='round,pad=0.35', fc='#1a2235', ec=c, lw=0.8))
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis('off')
ax.set_title('IOI Circuit — 26 heads, 9 head types', color='#9ca3af', fontsize=10, pad=8)
plt.tight_layout(); plt.show()`,
          sectionId: 'sec-ioi-intro',
          isEditable: false,
        },
        {
          id: 'nb-ioi-1',
          type: 'markdown',
          content: '# IOI Circuit: Interactive Demo\n\n**Indirect Object Identification (IOI)** is the task of completing sentences like:\n\n> *When Mary and John went to the store, John gave a drink to ___*\n\nThe correct answer is "Mary". Wang et al. (2023) reverse-engineer the exact circuit of 26 attention heads in GPT-2 small that implements this task.',
          sectionId: 'sec-ioi-intro',
          isEditable: false,
        },
        {
          id: 'nb-ioi-2',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Simulate simplified attention patterns for the 3 main head types in the IOI circuit
np.random.seed(7)
seq_len = 10
tokens = ['When', 'Mary', 'and', 'John', 'went', 'to', 'store', ',', 'John', 'gave']

def make_attn(peak_positions, seq_len=10):
    """Create a peaked attention pattern."""
    w = np.zeros(seq_len)
    for p in peak_positions:
        w[p] = 1.0
    w += np.random.rand(seq_len) * 0.05
    return w / w.sum()

head_types = {
    'Duplicate Token Head\\n(spots repeated "John")': make_attn([3, 8]),
    'S-Inhibition Head\\n(suppresses subject "John")': make_attn([3]),
    'Name Mover Head\\n(moves "Mary" to output)': make_attn([1]),
}

fig, axes = plt.subplots(1, 3, figsize=(12, 4))
fig.patch.set_facecolor('#0a0e14')
fig.suptitle('Simplified attention patterns — IOI circuit head types', color='#e2e8f0', fontsize=11)
colors = ['#f5a623', '#a78bfa', '#00d4aa']

for ax, (title, attn), color in zip(axes, head_types.items(), colors):
    ax.set_facecolor('#0a0e14')
    ax.bar(range(seq_len), attn, color=color, alpha=0.85, width=0.7)
    ax.set_xticks(range(seq_len))
    ax.set_xticklabels(tokens, rotation=45, ha='right', fontsize=8, color='#9ca3af')
    ax.set_title(title, color=color, fontsize=9, pad=6)
    ax.set_ylabel('Attention weight', color='#9ca3af', fontsize=8)
    ax.tick_params(colors='#9ca3af')
    for spine in ax.spines.values(): spine.set_edgecolor('#1a2235')

plt.tight_layout(); plt.show()
print("Duplicate token head attends to both 'John' tokens; Name mover head focuses on 'Mary'")`,
          sectionId: 'sec-ioi-intro',
          isEditable: true,
        },
        {
          id: 'nb-ioi-3',
          type: 'markdown',
          content: '## The Circuit Structure\n\nThe IOI circuit has three stages:\n1. **Duplicate Token Heads** (layers 0-3): detect that "John" appears twice\n2. **S-Inhibition Heads** (layers 7-8): suppress the subject name at the output position\n3. **Name Mover Heads** (layers 9-10): copy "Mary" to the output\n\nThis is the first complete reverse-engineering of a non-trivial behavior in a production LLM.',
          sectionId: 'sec-ioi-intro',
          isEditable: false,
        },
        {
          id: 'nb-ioi-4',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Visualize the 26-head circuit as a layered diagram
layers = list(range(12))
# Which layers have which head types (simplified from the paper)
duplicate_token = [0, 1, 2, 3]
s_inhibition    = [7, 8]
name_mover      = [9, 10]
backup_nm       = [10, 11]
negative_nm     = [10, 11]

fig, ax = plt.subplots(figsize=(10, 4))
ax.set_facecolor('#0a0e14'); fig.patch.set_facecolor('#0a0e14')

bar_height = 0.3
for l in layers:
    color = '#1a2235'
    if l in duplicate_token: color = '#f5a623'
    if l in s_inhibition:    color = '#a78bfa'
    if l in name_mover:      color = '#00d4aa'
    ax.barh(0, 1, left=l, height=bar_height, color=color, edgecolor='#0a0e14', lw=0.5)

# Legend
legend_items = [
    mpatches.Patch(color='#f5a623', label='Duplicate Token Heads (0-3)'),
    mpatches.Patch(color='#a78bfa', label='S-Inhibition Heads (7-8)'),
    mpatches.Patch(color='#00d4aa', label='Name Mover Heads (9-10)'),
    mpatches.Patch(color='#1a2235', label='Other layers'),
]
import matplotlib.patches as mpatches
ax.legend(handles=legend_items, loc='upper left', fontsize=8,
          facecolor='#0a0e14', edgecolor='#1a2235', labelcolor='#9ca3af')
ax.set_xlim(-0.5, 12); ax.set_ylim(-0.5, 0.8)
ax.set_xticks(range(12)); ax.set_xticklabels([f'L{i}' for i in range(12)], color='#9ca3af', fontsize=9)
ax.set_yticks([]); ax.set_title('GPT-2 small: layers involved in IOI circuit', color='#e2e8f0', fontsize=11)
for spine in ax.spines.values(): spine.set_edgecolor('#1a2235')
plt.tight_layout(); plt.show()`,
          sectionId: 'sec-ioi-intro',
          isEditable: false,
        },
        {
          id: 'nb-ioi-5',
          type: 'markdown',
          content: '## Try It Yourself\n\nTry modifying the attention pattern simulation above:\n- Change the `peak_positions` for each head type to see how different circuits would behave\n- Add noise (`* 0.2` instead of `* 0.05`) to simulate less precise attention heads\n- Extend the token sequence to longer IOI sentences',
          sectionId: 'sec-ioi-intro',
          isEditable: false,
        },
      ],
      readersOnline: 0,
    },
    {
      id: 'pmc:PMC9890000',
      title: 'Sparse Autoencoders Find Highly Interpretable Features in Language Models',
      authors: ['Hoagy Cunningham', 'Aidan Ewart', 'Logan Riggs', 'Robert Huben', 'Lee Sharkey'],
      venue: 'ICLR 2024',
      year: 2024,
      pdfUrl: 'https://arxiv.org/pdf/2309.08600',
      sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9890000',
      sourceName: 'PubMed Central',
      relevanceScore: 92,
      relevanceReason: 'Introduces sparse autoencoders as a scalable method for extracting interpretable features from LLMs',
      status: 'ready',
      tldr: [
        { sentence: 'Sparse autoencoders trained on LLM activations learn highly interpretable monosemantic features.', sourceSentenceId: 'blk-sae-intro-1' },
        { sentence: 'The method scales to large models and finds features corresponding to specific concepts, entities, and syntax.', sourceSentenceId: 'blk-sae-intro-2' },
        { sentence: 'SAEs represent a promising scalable approach to mechanistic interpretability.', sourceSentenceId: 'blk-sae-intro-3' },
      ],
      sections: [
        {
          id: 'sec-sae-intro',
          title: 'Introduction',
          level: 1,
          isAppendix: false,
          content: [
            { id: 'blk-sae-intro-1', type: 'paragraph', raw: 'We train sparse autoencoders on intermediate activations of language models to extract interpretable features.' },
            { id: 'blk-sae-intro-2', type: 'paragraph', raw: 'The learned features are highly monosemantic and correspond to interpretable concepts across diverse domains.' },
            { id: 'blk-sae-intro-3', type: 'paragraph', raw: 'Sparse autoencoders provide a scalable dictionary learning approach to mechanistic interpretability.' },
          ],
          marginNotes: [],
        },
      ],
      variables: [
        { symbol: 'z', name: 'sparse code', definition: 'Sparse latent representation from autoencoder', firstSeenSectionId: 'sec-sae-intro', allOccurrences: ['blk-sae-intro-1'] },
      ],
      equations: [],
      figures: [],
      citations: [
        { id: 'cite-sae-1', title: 'Toy Models of Superposition', authors: ['Elhage et al.'], year: 2022, arxivId: '2209.11895', isFoundational: true },
        { id: 'cite-sae-2', title: 'Towards Monosemanticity: Decomposing Language Models With Dictionary Learning', authors: ['Bricken et al.'], year: 2023, url: 'https://transformer-circuits.pub/2023/monosemantic-features', isFoundational: true },
        { id: 'cite-sae-3', title: 'Sparse coding with an overcomplete basis set: A strategy employed by V1?', authors: ['Olshausen', 'Field'], year: 1997, url: 'https://doi.org/10.1016/S0042-6989(97)00169-7', isFoundational: true },
        { id: 'cite-sae-4', title: 'Scaling and evaluating sparse autoencoders', authors: ['Gao et al.'], year: 2024, arxivId: '2406.04093', isFoundational: false },
        { id: 'cite-sae-5', title: 'Scaling and evaluating sparse autoencoders', authors: ['Gao et al.'], year: 2024, arxivId: '2406.04093', isFoundational: false },
      ],
      notationWarnings: [],
      evidenceChains: [],
      notebookCells: [
        {
          id: 'nb-sae-concept',
          type: 'code',
          content: `import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 5))
ax.set_facecolor('#0a0e14'); fig.patch.set_facecolor('#0a0e14')

nodes = {
    'LLM Activations': (0.5, 0.85),
    'Sparse Autoencoder': (0.5, 0.55),
    'Sparse Code z': (0.5, 0.25),
    'Encoder W_enc': (0.2, 0.55),
    'Decoder W_dec': (0.8, 0.55),
    'Monosemantic Features': (0.5, 0.05),
    'Sparsity Penalty': (0.15, 0.25),
}
edges = [
    ('LLM Activations', 'Sparse Autoencoder'),
    ('Sparse Autoencoder', 'Sparse Code z'),
    ('Encoder W_enc', 'Sparse Autoencoder'),
    ('Decoder W_dec', 'Sparse Autoencoder'),
    ('Sparse Code z', 'Monosemantic Features'),
    ('Sparsity Penalty', 'Sparse Code z'),
]
colors = {
    'LLM Activations': '#f5a623',
    'Sparse Autoencoder': '#00d4aa',
    'Sparse Code z': '#a78bfa',
    'Encoder W_enc': '#9ca3af',
    'Decoder W_dec': '#9ca3af',
    'Monosemantic Features': '#34d399',
    'Sparsity Penalty': '#f87171',
}
for (a, b) in edges:
    x1, y1 = nodes[a]; x2, y2 = nodes[b]
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle='->', color='#ffffff22', lw=1.2))
for label, (x, y) in nodes.items():
    c = colors.get(label, '#9ca3af')
    ax.text(x, y, label, ha='center', va='center', fontsize=8.5, color=c,
            bbox=dict(boxstyle='round,pad=0.35', fc='#1a2235', ec=c, lw=0.8))
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis('off')
ax.set_title('Sparse Autoencoder Architecture', color='#9ca3af', fontsize=10, pad=8)
plt.tight_layout(); plt.show()`,
          sectionId: 'sec-sae-intro',
          isEditable: false,
        },
        {
          id: 'nb-sae-1',
          type: 'markdown',
          content: '# Sparse Autoencoders: Interactive Demo\n\n**Sparse Autoencoders (SAEs)** address superposition by training a larger autoencoder with a sparsity penalty on the latent code. The idea: if the LLM has packed many features into few directions (superposition), an overcomplete sparse basis can *unpack* them into interpretable, monosemantic directions.\n\n**Architecture:** `x → z = ReLU(W_enc x + b_enc) → x̂ = W_dec z + b_dec`\n\n**Loss:** MSE reconstruction + λ·L1 sparsity penalty on z',
          sectionId: 'sec-sae-intro',
          isEditable: false,
        },
        {
          id: 'nb-sae-2',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

np.random.seed(42)

# ── Generate synthetic "superposed" activations ──
# True features: 8 sparse features packed into 4 dimensions
n_true_features = 8
n_hidden_dim    = 4
n_dict_features = 16  # SAE learns an overcomplete dictionary
sparsity        = 0.85
n_samples       = 800

# Ground truth sparse features
true_directions = np.random.randn(n_hidden_dim, n_true_features)
true_directions /= np.linalg.norm(true_directions, axis=0, keepdims=True)

# Simulate activations as sparse combinations
codes = np.random.randn(n_samples, n_true_features) * (np.random.rand(n_samples, n_true_features) > sparsity)
activations = codes @ true_directions.T  # shape: (n_samples, n_hidden_dim)
activations += np.random.randn(*activations.shape) * 0.05

# ── Minimal SAE: one-layer encoder/decoder with L1 sparsity ──
W_enc = np.random.randn(n_hidden_dim, n_dict_features) * 0.1
b_enc = np.zeros(n_dict_features)
W_dec = W_enc.copy().T
b_dec = np.zeros(n_hidden_dim)
lam   = 0.1   # sparsity coefficient
lr    = 0.005

losses = []
for step in range(400):
    idx = np.random.choice(n_samples, 64)
    x = activations[idx]                       # (64, n_hidden_dim)
    z = np.maximum(0, x @ W_enc + b_enc)       # (64, n_dict_features) — sparse code
    x_hat = z @ W_dec.T + b_dec               # (64, n_hidden_dim)
    mse = np.mean((x_hat - x) ** 2)
    l1  = np.mean(np.abs(z))
    loss_val = mse + lam * l1
    losses.append(loss_val)
    # Gradients
    dL_dx_hat = 2 * (x_hat - x) / 64
    dL_dWdec  = z.T @ dL_dx_hat
    dL_dz     = dL_dx_hat @ W_dec + lam * np.sign(z)
    dL_dz    *= (z > 0)
    dL_dWenc  = x.T @ dL_dz
    W_enc -= lr * dL_dWenc;  W_dec -= lr * dL_dWdec.T
    b_enc -= lr * dL_dz.mean(0); b_dec -= lr * dL_dx_hat.mean(0)

# ── Plot training loss and feature sparsity ──
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
fig.patch.set_facecolor('#0a0e14')

ax = axes[0]
ax.set_facecolor('#0a0e14')
ax.plot(losses, color='#00d4aa', lw=1.5)
ax.set_title('SAE Training Loss (MSE + λ·L1)', color='#e2e8f0', fontsize=10)
ax.set_xlabel('Step', color='#9ca3af'); ax.set_ylabel('Loss', color='#9ca3af')
ax.tick_params(colors='#9ca3af')
for sp in ax.spines.values(): sp.set_edgecolor('#1a2235')

# Feature activation histograms — should be sparse (mostly zero)
z_all = np.maximum(0, activations @ W_enc + b_enc)
ax2 = axes[1]
ax2.set_facecolor('#0a0e14')
ax2.hist(z_all.flatten(), bins=40, color='#a78bfa', alpha=0.8, density=True)
ax2.set_title('Learned feature activations (should be sparse)', color='#e2e8f0', fontsize=10)
ax2.set_xlabel('Activation value', color='#9ca3af'); ax2.set_ylabel('Density', color='#9ca3af')
ax2.tick_params(colors='#9ca3af')
for sp in ax2.spines.values(): sp.set_edgecolor('#1a2235')

plt.tight_layout(); plt.show()
sparsity_frac = np.mean(z_all == 0)
print(f"Feature sparsity: {sparsity_frac:.1%} of activations are exactly zero")
print(f"Mean L1 of sparse code: {np.mean(np.abs(z_all)):.3f}")`,
          sectionId: 'sec-sae-intro',
          isEditable: true,
        },
        {
          id: 'nb-sae-3',
          type: 'markdown',
          content: '## Monosemanticity\n\nA feature is **monosemantic** if it activates for a single, coherent concept. A feature is **polysemantic** if it activates for unrelated concepts (a sign of superposition).\n\nSAEs trained on LLM residual stream activations produce features that can be labelled by humans with high agreement — far more monosemantic than individual neurons.',
          sectionId: 'sec-sae-intro',
          isEditable: false,
        },
        {
          id: 'nb-sae-4',
          type: 'code',
          content: `import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

np.random.seed(0)

# Simulate "polysemantic" neurons vs "monosemantic" SAE features
# Each row = one unit, columns = 8 token categories (e.g. verbs, nouns, punctuation...)
token_categories = ['verbs', 'nouns', 'punct', 'numbers', 'names', 'adj', 'adverbs', 'code']
n_categories = len(token_categories)
n_neurons    = 8
n_sae_feats  = 8

# Neurons: polysemantic — high response to multiple categories
neuron_resp = np.abs(np.random.randn(n_neurons, n_categories))
neuron_resp /= neuron_resp.max(axis=1, keepdims=True)

# SAE features: monosemantic — each responds strongly to 1-2 categories
sae_resp = np.zeros((n_sae_feats, n_categories))
for i in range(n_sae_feats):
    primary = i % n_categories
    sae_resp[i, primary] = np.random.uniform(0.85, 1.0)
    # small bleed
    secondary = (i + 1) % n_categories
    sae_resp[i, secondary] = np.random.uniform(0.0, 0.15)

fig, axes = plt.subplots(1, 2, figsize=(12, 4))
fig.patch.set_facecolor('#0a0e14')
fig.suptitle('Polysemantic neurons vs Monosemantic SAE features', color='#e2e8f0', fontsize=11)

for ax, data, title in zip(axes,
        [neuron_resp, sae_resp],
        ['MLP Neurons (polysemantic)', 'SAE Features (monosemantic)']):
    ax.set_facecolor('#0a0e14')
    im = ax.imshow(data, cmap='magma', vmin=0, vmax=1, aspect='auto')
    ax.set_xticks(range(n_categories))
    ax.set_xticklabels(token_categories, rotation=35, ha='right', fontsize=8, color='#9ca3af')
    ax.set_yticks(range(n_neurons))
    ax.set_yticklabels([f'Unit {i}' for i in range(n_neurons)], fontsize=8, color='#9ca3af')
    ax.set_title(title, color='#e2e8f0', fontsize=10)
    plt.colorbar(im, ax=ax, fraction=0.035)

plt.tight_layout(); plt.show()
print("Brighter = stronger response to that token category")
print("SAE features respond to mostly ONE category → monosemantic")`,
          sectionId: 'sec-sae-intro',
          isEditable: true,
        },
        {
          id: 'nb-sae-5',
          type: 'markdown',
          content: '## Try It Yourself\n\nExplore the SAE code above:\n- Change `lam` (the sparsity coefficient) between 0 (no sparsity) and 0.5 (very sparse) and observe the trade-off between reconstruction quality and sparsity\n- Change `n_dict_features` (dictionary size) — larger dictionaries can better disentangle features\n- Reduce `n_true_features` to 2 and `n_hidden_dim` to 2 and visualize the learned directions',
          sectionId: 'sec-sae-intro',
          isEditable: false,
        },
      ],
      readersOnline: 0,
    },
  ],
}

const outputPath = path.join(__dirname, '..', 'src', 'data', 'demo-fallback.json')
fs.writeFileSync(outputPath, JSON.stringify(demoData, null, 2))
console.log(`Demo data written to ${outputPath}`)
console.log(`Papers: ${demoData.papers.length}`)
demoData.papers.forEach(p => {
  console.log(`  [${p.id}] ${p.title}`)
  console.log(`    citations: ${p.citations.length}, notebookCells: ${p.notebookCells.length}`)
})
