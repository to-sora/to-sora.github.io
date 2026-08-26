# Portfolio v2

A read-only GitHub Pages portfolio designed so normal content maintenance does **not** require editing HTML, JavaScript, or CSS.

## Files you edit

For normal use, edit only:

- `home.md` — Home / main introduction page.
- `projects.md` — Projects page.
- `documents.md` — short introduction above the document browser.
- `categories.json` — optional map from a `doc-*` directory name to its category description.
- `doc-*/...` — your documents and their metadata sidecars.

The `.html` files and `assets/*.js` / `assets/*.css` are renderer implementation files. You should not need to edit them.

## Ready-to-copy templates

Markdown templates:

```text
templates/document.md
templates/document.md.json
```

LaTeX templates:

```text
templates/document.tex
templates/document.tex.json
```

Copy a document plus its matching `.json` sidecar into any `doc-<category-name>/` directory, rename both, replace the `TODO` values, and commit.

## Minimum-work upload

To add a document to the `openai-deep-research` category, upload:

```text
doc-openai-deep-research/research_draft.pdf
doc-openai-deep-research/research_draft.pdf.json
```

or:

```text
doc-openai-deep-research/research_draft.tex
doc-openai-deep-research/research_draft.tex.json
```

Metadata:

```json
{
  "tags": ["research", "openai"],
  "createdate_show": "2026:08:24"
}
```

Then stop. There is no document manifest to update.

The browser discovers all top-level directories whose names start with `doc-`, pairs each file with `<filename>.<ext>.json` when present, and builds the list automatically.

## Category descriptions

`categories.json` is a direct directory-name -> description map:

```json
{
  "doc-openai-deep-research": "Notes and reports related to OpenAI Deep Research.",
  "doc-travel": "Travel plans, trip reports, and references."
}
```

The category itself is still auto-discovered from the directory. The JSON entry is only for the human-readable description. If you create a new `doc-*` directory and do not add it to `categories.json`, it still appears normally.

## Sorting and navigation

The Documents page supports category jump links, category filtering, tag filtering, search, newest/oldest sorting using `createdate_show`, tag A-Z sorting, filename sorting, and shareable query parameters such as `documents.html?category=openai-deep-research&tag=openai`.

## Rendering behavior

Rendered inside the portfolio:

- `.md`, `.markdown` — GitHub-flavored Markdown, sanitized HTML, relative images/links, and KaTeX math.
- `.tex` — common article-style LaTeX converted client-side into the same safe Markdown/KaTeX reader.
- `.docx` — browser-side conversion with Mammoth.js.

Opened as the original file in a new tab: `.pdf`, `.txt`, `.csv`, `.json`, `.jsonl`, `.yaml`, `.yml`, images, browser-supported audio/video, and other unrecognized formats.

### LaTeX support

The `.tex` reader is intentionally lightweight and read-only. It supports the common content needed for notes and papers:

- `\section`, `\subsection`, `\subsubsection`, `\paragraph`
- `\textbf`, `\emph`, `\textit`, `\texttt`
- `itemize` and `enumerate`
- simple `tabular`
- `\includegraphics` with paths relative to the `.tex` file
- `\href` and `\url`
- `$...$`, `$$...$$`, `\[...\]`, `equation`, `align`, and related display-math environments
- basic `\title`, `\author`, `\date`, and `\maketitle`

The original `.tex` file is always available through **Open raw**. Complex package behavior, TikZ, custom macro expansion, bibliography compilation, `\input`/`\include`, and features requiring a real TeX engine may not render fully in the browser.

## Relative assets

Put support files under an underscore-prefixed directory so they are not listed as documents:

```text
doc-openai-deep-research/
├── note.md
├── paper.tex
└── _assets/
    └── figure.png
```

Markdown:

```md
![Figure](_assets/figure.png)
```

LaTeX:

```tex
\includegraphics[width=0.8\textwidth]{_assets/figure.png}
```

Both are resolved relative to the source document.

## Metadata schema

The sidecar schema remains:

```json
{
  "tags": ["tag1", "tag2", "tag3"],
  "summary": [
    "Short summary line 1.",
    "Short summary line 2.",
    "Short summary line 3.",
    "Short summary line 4."
  ],
  "createdate_show": "YYYY:MM:DD"
}
```

`summary` is optional for existing documents. When present, it must contain exactly four non-empty strings; the document library displays them on the document card and includes them in search.

A formal schema is available at `document-metadata.schema.json`.

## Read-only design

The site contains no write forms, no authentication token, and no backend. Visitors only read files already committed to the public repository branch.
