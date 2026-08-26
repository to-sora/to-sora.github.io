(() => {
  'use strict';

  const P = window.Portfolio;

  async function renderBlock(block) {
    const path = block.dataset.markdownSource;
    if (!path) return;

    const rawLinkId = block.dataset.rawLink;
    if (rawLinkId) {
      const rawLink = document.getElementById(rawLinkId);
      if (rawLink) rawLink.href = P.rawUrl(path);
    }

    try {
      const response = await fetch(P.rawUrl(path), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`${path} request failed (${response.status}).`);
      block.classList.remove('loading-block');
      await window.PortfolioMarkdown.renderMarkdownInto(block, await response.text(), path);

      if (document.body.dataset.page === 'home') {
        const heading = block.querySelector('h1');
        if (heading?.textContent?.trim()) document.title = heading.textContent.trim();
      }
    } catch (error) {
      block.classList.remove('loading-block');
      block.classList.add('error-state');
      block.textContent = error.message;
    }
  }

  document.querySelectorAll('[data-markdown-source]').forEach(block => {
    renderBlock(block);
  });
})();
