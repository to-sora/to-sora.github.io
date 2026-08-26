(() => {
  'use strict';

  function waitForMathRenderer(timeoutMs = 4000) {
    if (typeof window.renderMathInElement === 'function') return Promise.resolve();
    const started = Date.now();
    return new Promise(resolve => {
      const timer = setInterval(() => {
        if (typeof window.renderMathInElement === 'function' || Date.now() - started > timeoutMs) {
          clearInterval(timer);
          resolve();
        }
      }, 30);
    });
  }

  function isAbsoluteLike(value) {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
  }

  function resolveRepositoryUrl(value, sourcePath) {
    const rawSource = window.Portfolio.rawUrl(sourcePath);
    if (!value || isAbsoluteLike(value)) return value;
    if (value.startsWith('/')) {
      return window.Portfolio.rawUrl(value.slice(1));
    }
    try {
      return new URL(value, rawSource).href;
    } catch {
      return value;
    }
  }

  function cleanMarkdownSource(value) {
    return String(value || '').replace(/\uE200cite\uE202[^\uE201]*\uE201/g, '');
  }

  async function renderMarkdownInto(element, markdown, sourcePath) {
    if (!window.marked || !window.DOMPurify) {
      throw new Error('Markdown renderer dependencies failed to load.');
    }

    const html = window.marked.parse(cleanMarkdownSource(markdown), {
      gfm: true,
      breaks: false
    });

    element.innerHTML = window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true }
    });

    element.querySelectorAll('img[src]').forEach(img => {
      const original = img.getAttribute('src');
      img.src = resolveRepositoryUrl(original, sourcePath);
      img.loading = 'lazy';
      img.decoding = 'async';
    });

    element.querySelectorAll('a[href]').forEach(link => {
      const original = link.getAttribute('href');
      if (!original || original.startsWith('#')) return;
      const resolved = resolveRepositoryUrl(original, sourcePath);
      link.href = resolved;
      if (/^https?:/i.test(resolved)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });

    await waitForMathRenderer();
    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      });
    }
  }

  window.PortfolioMarkdown = Object.freeze({ renderMarkdownInto });
})();
