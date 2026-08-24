# Portfolio v2

A read-only GitHub Pages portfolio with three permanent navigation targets:

- **Home** — main introduction page.
- **Documents** — client-side discovery, filtering, and sorting of files under `doc-*` directories.
- **Projects** — rendered directly from `projects.md`.

No database, CMS, server, or hand-maintained document index is required.

## First-time TODO values

Edit `site-config.js` and replace the personal values marked `TODO`:

```js
siteTitle: "TODO",
displayName: "TODO",
headline: "TODO",
introduction: "TODO",
location: "TODO",
email: "TODO",
```

Edit `projects.md` and replace its `TODO` content.

The repository/branch discovery values are already set for this branch:

```js
githubOwner: "to-sora",
githubRepo: "to-sora.github.io",
contentBranch: "portfolio-v2",
```

Keep `contentBranch` equal to the branch from which you publish/update documents.

## Minimum-work document upload

For a category named `research`, create/use the directory:

```text
doc-research/
```

Upload the document:

```text
doc-research/research_draft.pdf
```

and its optional-but-recommended metadata sidecar:

```text
doc-research/research_draft.pdf.json
```

Metadata format:

```json
{
  "tags": ["research", "ml"],
  "createdate_show": "2026:08:24"
}
```

That is all. The Documents page requests the repository tree from GitHub, discovers every top-level `doc-<category>` directory, pairs files with `<filename>.<primary_ext>.json`, and builds the list in the visitor's browser.

A formal schema is included at `document-metadata.schema.json`.

### Missing metadata

A document still appears if its sidecar is missing or invalid. It is shown with `Date unknown` and a metadata warning, so a metadata mistake cannot make the document disappear.

## Categories

The directory name is the category:

```text
doc-research/   -> research
doc-travel/     -> travel
doc-notes/      -> notes
```

No category configuration is required. Adding another `doc-*` directory automatically adds another category.

The Documents page supports shareable query parameters:

```text
documents.html?category=research
documents.html?tag=ml
documents.html?category=research&tag=ml&sort=oldest
```

## Supported document behavior

Rendered inside the portfolio reader:

- `.md`, `.markdown` — GitHub-flavored Markdown with sanitized HTML, relative images/links, and KaTeX math.
- `.docx` — converted client-side to HTML with Mammoth.js.

Opened as the original/raw file in a new browser tab:

- `.pdf`
- `.txt`
- `.csv`
- `.json`
- `.jsonl`
- `.yaml`, `.yml`
- images such as `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- browser-supported audio/video such as `.mp3`, `.wav`, `.ogg`, `.mp4`, `.webm`
- any other unrecognized file type

This intentionally avoids lossy conversion for formats the browser can already display or download directly.

## Markdown images and math

Relative image paths are resolved relative to the Markdown document itself.

Example:

```text
doc-research/
├── note.md
├── note.md.json
└── _assets/
    └── result.png
```

Inside `note.md`:

```md
![Result](_assets/result.png)

Inline math: $E = mc^2$

$$
L(\theta) = -\sum_i y_i \log p_\theta(y_i)
$$
```

Nested directories beginning with `_` are treated as support-asset directories and are not shown as documents in the list. This lets Markdown keep nearby images without polluting the document index.

## Client-side discovery and caching

The document page makes one GitHub Trees API request to discover repository paths, then reads metadata sidecars from `raw.githubusercontent.com`. The resulting document index is cached in `localStorage` and shown immediately on later visits while a fresh copy is requested.

If GitHub discovery is temporarily unavailable or rate-limited, the last cached index remains usable when available.

## Read-only design

The site contains no forms that write to GitHub and no authentication/token is shipped to the browser. Visitors can only read files already published in this public repository/branch.

## Deployment

Review this branch first. When ready, either configure GitHub Pages to publish from `portfolio-v2`, or merge it and update `contentBranch` to whichever branch will contain future `doc-*` uploads.
