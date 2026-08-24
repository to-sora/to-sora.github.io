(() => {
  'use strict';

  const P = window.Portfolio;
  const content = document.getElementById('project-content');
  const rawLink = document.getElementById('projects-raw-link');
  const path = P.config.projectMarkdownPath || 'projects.md';

  async function start() {
    rawLink.href = P.rawUrl(path);
    try {
      const response = await fetch(P.rawUrl(path), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Project Markdown request failed (${response.status}).`);
      content.classList.remove('loading-block');
      await window.PortfolioMarkdown.renderMarkdownInto(content, await response.text(), path);
    } catch (error) {
      content.classList.remove('loading-block');
      content.classList.add('error-state');
      content.textContent = error.message;
    }
  }

  start();
})();
