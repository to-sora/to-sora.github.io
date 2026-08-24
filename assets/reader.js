(() => {
  'use strict';

  const P = window.Portfolio;
  const elements = {
    categoryLink: document.getElementById('reader-category-link'),
    filename: document.getElementById('reader-filename'),
    category: document.getElementById('reader-category'),
    title: document.getElementById('reader-title'),
    raw: document.getElementById('reader-raw-link'),
    meta: document.getElementById('reader-meta'),
    status: document.getElementById('reader-status'),
    content: document.getElementById('reader-content')
  };

  function safeDocumentPath() {
    const path = new URLSearchParams(location.search).get('doc') || '';
    const prefix = P.config.documentDirectoryPrefix || 'doc-';
    if (!path || path.startsWith('/') || path.includes('..') || !path.split('/')[0].startsWith(prefix)) {
      return '';
    }
    return path;
  }

  async function fetchSidecar(path) {
    const response = await fetch(P.rawUrl(`${path}.json`), { cache: 'no-cache' });
    if (!response.ok) return null;
    try {
      const meta = await response.json();
      return {
        tags: Array.isArray(meta.tags) ? meta.tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim()) : [],
        date: typeof meta.createdate_show === 'string' ? meta.createdate_show : ''
      };
    } catch {
      return null;
    }
  }

  function renderMeta(meta, ext) {
    elements.meta.replaceChildren();

    const type = document.createElement('span');
    type.className = 'extension-badge';
    type.textContent = ext || 'file';
    elements.meta.appendChild(type);

    if (meta?.date) {
      const date = document.createElement('span');
      date.textContent = meta.date;
      elements.meta.appendChild(date);
    }

    (meta?.tags || []).forEach(tag => {
      const link = document.createElement('a');
      link.className = 'tag';
      link.href = `documents.html?tag=${encodeURIComponent(tag)}`;
      link.textContent = `#${tag}`;
      elements.meta.appendChild(link);
    });
  }

  async function renderMarkdown(path) {
    const response = await fetch(P.rawUrl(path), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Document request failed (${response.status}).`);
    await window.PortfolioMarkdown.renderMarkdownInto(elements.content, await response.text(), path);
  }

  async function renderDocx(path) {
    if (!window.mammoth) throw new Error('DOCX renderer failed to load.');
    if (!window.DOMPurify) throw new Error('HTML sanitizer failed to load.');

    const response = await fetch(P.rawUrl(path), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Document request failed (${response.status}).`);
    const arrayBuffer = await response.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer });
    elements.content.innerHTML = window.DOMPurify.sanitize(result.value, { USE_PROFILES: { html: true } });

    if (result.messages?.length) {
      const note = document.createElement('details');
      note.className = 'docx-warnings';
      const summary = document.createElement('summary');
      summary.textContent = `${result.messages.length} DOCX conversion note${result.messages.length === 1 ? '' : 's'}`;
      note.appendChild(summary);
      const list = document.createElement('ul');
      result.messages.forEach(message => {
        const item = document.createElement('li');
        item.textContent = message.message;
        list.appendChild(item);
      });
      note.appendChild(list);
      elements.content.prepend(note);
    }
  }

  function showRawFallback(path) {
    const panel = document.createElement('div');
    panel.className = 'raw-fallback';
    panel.innerHTML = '<h2>Browser-native file</h2><p>This format is intentionally served as the original file rather than converted inside the portfolio.</p>';
    const link = document.createElement('a');
    link.className = 'button-link';
    link.href = P.rawUrl(path);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open original file ↗';
    panel.appendChild(link);
    elements.content.appendChild(panel);
  }

  async function start() {
    const path = safeDocumentPath();
    if (!path) {
      elements.title.textContent = 'Invalid document path';
      elements.status.textContent = 'The reader only accepts files inside doc-* directories.';
      return;
    }

    const filename = P.fileName(path);
    const category = P.categoryFromPath(path);
    const ext = P.extension(path);
    const raw = P.rawUrl(path);

    elements.filename.textContent = filename;
    elements.category.textContent = P.humanize(category);
    elements.categoryLink.textContent = P.humanize(category);
    elements.categoryLink.href = `documents.html?category=${encodeURIComponent(category)}`;
    elements.title.textContent = filename;
    elements.raw.href = raw;
    document.title = `${filename} · ${P.config.siteTitle || 'TODO'}`;

    const meta = await fetchSidecar(path);
    renderMeta(meta, ext);

    try {
      if (ext === 'md' || ext === 'markdown') {
        await renderMarkdown(path);
      } else if (ext === 'docx') {
        await renderDocx(path);
      } else {
        showRawFallback(path);
      }
      elements.status.textContent = '';
    } catch (error) {
      elements.status.textContent = 'Could not render this document.';
      const box = document.createElement('div');
      box.className = 'error-state';
      box.textContent = error.message;
      elements.content.appendChild(box);
    }
  }

  start();
})();
