(() => {
  'use strict';

  const config = window.PORTFOLIO_CONFIG || {};

  function encodePath(path) {
    return String(path || '')
      .split('/')
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment))
      .join('/');
  }

  function rawUrl(path) {
    return `https://raw.githubusercontent.com/${encodeURIComponent(config.githubOwner)}/${encodeURIComponent(config.githubRepo)}/${encodeURIComponent(config.contentBranch)}/${encodePath(path)}`;
  }

  function repoUrl(path = '') {
    const base = `https://github.com/${encodeURIComponent(config.githubOwner)}/${encodeURIComponent(config.githubRepo)}`;
    if (!path) return base;
    return `${base}/blob/${encodeURIComponent(config.contentBranch)}/${encodePath(path)}`;
  }

  function apiTreeUrl() {
    return `https://api.github.com/repos/${encodeURIComponent(config.githubOwner)}/${encodeURIComponent(config.githubRepo)}/git/trees/${encodeURIComponent(config.contentBranch)}?recursive=1`;
  }

  function fileName(path) {
    return String(path || '').split('/').pop() || '';
  }

  function extension(path) {
    const name = fileName(path);
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function categoryDirectoryFromPath(path) {
    return String(path || '').split('/')[0] || '';
  }

  function categoryFromPath(path) {
    const first = categoryDirectoryFromPath(path);
    const prefix = config.documentDirectoryPrefix || 'doc-';
    return first.startsWith(prefix) ? first.slice(prefix.length) : '';
  }

  function humanize(value) {
    return String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function readableTitle(path) {
    const name = fileName(path);
    const ext = extension(path);
    const base = ext ? name.slice(0, -(ext.length + 1)) : name;
    return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || name;
  }

  function isInlineRenderable(path) {
    return ['md', 'markdown', 'docx'].includes(extension(path));
  }

  function applyShell() {
    document.querySelectorAll('[data-github-repo]').forEach(node => {
      node.href = repoUrl();
    });
  }

  window.Portfolio = Object.freeze({
    config,
    rawUrl,
    repoUrl,
    apiTreeUrl,
    fileName,
    extension,
    categoryDirectoryFromPath,
    categoryFromPath,
    humanize,
    readableTitle,
    isInlineRenderable
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyShell, { once: true });
  } else {
    applyShell();
  }
})();
