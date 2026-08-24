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

A document template is provided at:

```text
templates/document.md
templates/document.md.json
```

Copy both into any `doc-<category-name>/` directory, rename them, and replace the `TODO` values.

## Working category example

This branch contains a real example category:

```text
doc-openai-deep-research/
├── example-research.md
├── example-research.md.json
└── _assets/
    └── example-pipeline.svg
```

The example Markdown demonstrates tables, fenced code, relative images, inline math, and display math.

## Minimum-work upload

To add a document to the `openai-deep-research` category, upload:

```text
doc-openai-deep-research/research_draft.pdf
doc-openai-deep-research/research_draft.pdf.json
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
- `.docx` — browser-side conversion with Mammoth.js.

Opened as the original file in a new tab: `.pdf`, `.txt`, `.csv`, `.json`, `.jsonl`, `.yaml`, `.yml`, images, browser-supported audio/video, and other unrecognized formats.

## Markdown relative assets

Put support files under an underscore-prefixed directory so they are not listed as documents:

```text
doc-openai-deep-research/
├── note.md
├── note.md.json
└── _assets/
    └── figure.png
```

Then write `![Figure](_assets/figure.png)`. The reader resolves that path relative to `note.md`.

Math works as `$E = mc^2$` and display blocks delimited by `$$`.

## Metadata schema

The sidecar schema remains:

```json
{
  "tags": ["tag1", "tag2"],
  "createdate_show": "YYYY:MM:DD"
}
```

A formal schema is available at `document-metadata.schema.json`.

## Read-only design

The site contains no write forms, no authentication token, and no backend. Visitors only read files already committed to the public repository branch.
