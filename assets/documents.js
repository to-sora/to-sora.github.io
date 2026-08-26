(() => {
  'use strict';

  const P = window.Portfolio;
  const cacheKey = `portfolio-documents:v2:${P.config.githubOwner}/${P.config.githubRepo}@${P.config.contentBranch}`;
  const elements = {
    category: document.getElementById('category-filter'),
    tag: document.getElementById('tag-filter'),
    sort: document.getElementById('sort-order'),
    search: document.getElementById('search-filter'),
    jump: document.getElementById('category-jump'),
    status: document.getElementById('documents-status'),
    list: document.getElementById('documents-list')
  };

  const state = { documents: [], categoryDescriptions: {}, source: 'network' };

  function isDocumentPath(path) {
    const prefix = P.config.documentDirectoryPrefix || 'doc-';
    const parts = path.split('/');
    if (parts.length < 2 || !parts[0].startsWith(prefix)) return false;
    return !parts.slice(1, -1).some(part => part.startsWith('_'));
  }

  function normalizeMetadata(value) {
    const meta = value && typeof value === 'object' ? value : {};
    const tags = Array.isArray(meta.tags)
      ? [...new Set(meta.tags.filter(tag => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean))]
      : [];
    const summary = Array.isArray(meta.summary)
      ? meta.summary.filter(line => typeof line === 'string').map(line => line.trim()).filter(Boolean)
      : [];
    const hasSummary = Object.prototype.hasOwnProperty.call(meta, 'summary');
    const validSummary = !hasSummary || (Array.isArray(meta.summary) && meta.summary.length === 4 && summary.length === 4);
    const date = typeof meta.createdate_show === 'string' ? meta.createdate_show.trim() : '';
    const validDate = /^\d{4}:\d{2}:\d{2}$/.test(date);
    return { tags, summary, createdate_show: validDate ? date : '', metadataValid: Array.isArray(meta.tags) && validDate && validSummary };
  }

  function dateValue(doc) {
    if (!doc.createdate_show) return Number.NEGATIVE_INFINITY;
    const [year, month, day] = doc.createdate_show.split(':').map(Number);
    const date = Date.UTC(year, month - 1, day);
    return Number.isFinite(date) ? date : Number.NEGATIVE_INFINITY;
  }

  async function fetchJson(path) {
    const response = await fetch(P.rawUrl(path), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path} request failed (${response.status}).`);
    return response.json();
  }

  async function loadCategoryDescriptions() {
    try {
      const value = await fetchJson(P.config.categoryDescriptionsPath || 'categories.json');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(Object.entries(value).filter(([, description]) => typeof description === 'string'));
    } catch {
      return {};
    }
  }

  async function fetchMetadata(path) {
    return normalizeMetadata(await fetchJson(path));
  }

  async function discoverDocuments() {
    const response = await fetch(P.apiTreeUrl(), { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-cache' });
    if (!response.ok) throw new Error(`GitHub tree request failed (${response.status}).`);
    const payload = await response.json();
    const blobs = (payload.tree || []).filter(item => item.type === 'blob' && isDocumentPath(item.path));
    const blobPaths = new Set(blobs.map(item => item.path));
    const sidecars = new Map();

    for (const path of blobPaths) {
      if (!path.endsWith('.json')) continue;
      const candidate = path.slice(0, -'.json'.length);
      if (blobPaths.has(candidate)) sidecars.set(candidate, path);
    }

    const sidecarPaths = new Set(sidecars.values());
    const docPaths = [...blobPaths].filter(path => !sidecarPaths.has(path)).sort((a, b) => a.localeCompare(b));
    const documents = await Promise.all(docPaths.map(async path => {
      const sidecar = sidecars.get(path);
      let metadata = { tags: [], summary: [], createdate_show: '', metadataValid: false };
      let metadataState = sidecar ? 'invalid' : 'missing';
      if (sidecar) {
        try {
          metadata = await fetchMetadata(sidecar);
          metadataState = metadata.metadataValid ? 'ok' : 'invalid';
        } catch {
          metadataState = 'invalid';
        }
      }
      return {
        path,
        sidecar: sidecar || '',
        filename: P.fileName(path),
        extension: P.extension(path),
        category: P.categoryFromPath(path),
        categoryDirectory: P.categoryDirectoryFromPath(path),
        tags: metadata.tags,
        summary: metadata.summary,
        createdate_show: metadata.createdate_show,
        metadataState
      };
    }));
    return { documents, truncated: Boolean(payload.truncated) };
  }

  function loadCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!parsed || !Array.isArray(parsed.documents)) return null;
      return parsed;
    } catch { return null; }
  }

  function saveCache() {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ documents: state.documents, categoryDescriptions: state.categoryDescriptions, savedAt: Date.now() }));
    } catch { }
  }

  function queryState() {
    const params = new URLSearchParams(location.search);
    return { category: params.get('category') || '', tag: params.get('tag') || '', sort: params.get('sort') || 'newest', q: params.get('q') || '' };
  }

  function setQuery(next) {
    const params = new URLSearchParams();
    if (next.category) params.set('category', next.category);
    if (next.tag) params.set('tag', next.tag);
    if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
    if (next.q) params.set('q', next.q);
    const search = params.toString();
    history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}`);
  }

  function currentFilters() {
    return { category: elements.category.value, tag: elements.tag.value, sort: elements.sort.value, q: elements.search.value.trim() };
  }

  function option(select, value, label) {
    const node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    select.appendChild(node);
  }

  function categories() {
    return [...new Set(state.documents.map(doc => doc.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function renderFilters() {
    const wanted = queryState();
    const categoryValues = categories();
    const tags = [...new Set(state.documents.flatMap(doc => doc.tags))].sort((a, b) => a.localeCompare(b));
    elements.category.innerHTML = '<option value="">All categories</option>';
    categoryValues.forEach(category => option(elements.category, category, category));
    elements.tag.innerHTML = '<option value="">All tags</option>';
    tags.forEach(tag => option(elements.tag, tag, tag));
    elements.category.value = categoryValues.includes(wanted.category) ? wanted.category : '';
    elements.tag.value = tags.includes(wanted.tag) ? wanted.tag : '';
    elements.sort.value = ['newest', 'oldest', 'tag-asc', 'name-asc', 'name-desc'].includes(wanted.sort) ? wanted.sort : 'newest';
    elements.search.value = wanted.q;
    elements.jump.replaceChildren();

    const allLink = document.createElement('a');
    allLink.className = 'chip-button';
    allLink.href = '#documents-status';
    allLink.textContent = 'All';
    allLink.addEventListener('click', event => {
      event.preventDefault();
      elements.category.value = '';
      renderList();
      document.getElementById('documents-status')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    elements.jump.appendChild(allLink);

    categoryValues.forEach(category => {
      const link = document.createElement('a');
      link.className = 'chip-button';
      link.href = `#category-${category}`;
      link.textContent = category;
      link.addEventListener('click', event => {
        event.preventDefault();
        elements.category.value = category;
        renderList();
        requestAnimationFrame(() => document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      });
      elements.jump.appendChild(link);
    });
  }

  function sortDocuments(documents, sort) {
    const docs = [...documents];
    if (sort === 'oldest') {
      docs.sort((a, b) => {
        const av = dateValue(a), bv = dateValue(b);
        if (av === Number.NEGATIVE_INFINITY && bv !== Number.NEGATIVE_INFINITY) return 1;
        if (bv === Number.NEGATIVE_INFINITY && av !== Number.NEGATIVE_INFINITY) return -1;
        return av - bv || a.filename.localeCompare(b.filename);
      });
    } else if (sort === 'tag-asc') {
      docs.sort((a, b) => (a.tags[0] || '\uffff').localeCompare(b.tags[0] || '\uffff') || a.filename.localeCompare(b.filename));
    } else if (sort === 'name-asc') docs.sort((a, b) => a.filename.localeCompare(b.filename));
    else if (sort === 'name-desc') docs.sort((a, b) => b.filename.localeCompare(a.filename));
    else docs.sort((a, b) => dateValue(b) - dateValue(a) || a.filename.localeCompare(b.filename));
    return docs;
  }

  function matches(doc, filters) {
    if (filters.category && doc.category !== filters.category) return false;
    if (filters.tag && !doc.tags.includes(filters.tag)) return false;
    if (filters.q) {
      const needle = filters.q.toLowerCase();
      const description = state.categoryDescriptions[doc.categoryDirectory] || '';
      const haystack = [doc.filename, doc.category, description, ...doc.tags, ...(doc.summary || [])].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  function makeTag(tag) {
    const link = document.createElement('a');
    link.className = 'tag';
    link.href = `documents.html?tag=${encodeURIComponent(tag)}`;
    link.textContent = `#${tag}`;
    return link;
  }

  function documentDestination(doc) {
    if (P.isInlineRenderable(doc.path)) {
      return { href: `read.html?doc=${encodeURIComponent(doc.path)}`, label: 'Read →', newTab: false };
    }
    if (doc.extension === 'pdf') {
      return { href: doc.path, label: 'View PDF ↗', newTab: true };
    }
    return { href: P.rawUrl(doc.path), label: 'Open raw ↗', newTab: true };
  }

  function applyDocumentDestination(link, destination) {
    link.href = destination.href;
    if (destination.newTab) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  function documentAction(destination) {
    const link = document.createElement('a');
    link.className = 'document-action';
    applyDocumentDestination(link, destination);
    link.textContent = destination.label;
    return link;
  }

  function makeDocumentRow(doc) {
    const destination = documentDestination(doc);
    const row = document.createElement('article');
    row.className = 'document-row';
    const main = document.createElement('div');
    main.className = 'document-main';
    const heading = document.createElement('div');
    heading.className = 'document-heading-line';
    const title = document.createElement('h3');
    const titleLink = document.createElement('a');
    titleLink.className = 'document-title-link';
    titleLink.textContent = doc.filename;
    applyDocumentDestination(titleLink, destination);
    title.appendChild(titleLink);
    heading.appendChild(title);
    const ext = document.createElement('span');
    ext.className = 'extension-badge';
    ext.textContent = doc.extension || 'file';
    heading.appendChild(ext);
    main.appendChild(heading);
    const detail = document.createElement('div');
    detail.className = 'document-detail';
    const date = document.createElement('span');
    date.textContent = doc.createdate_show || 'Date unknown';
    detail.appendChild(date);
    if (doc.metadataState !== 'ok') {
      const metadata = document.createElement('span');
      metadata.className = 'metadata-warning';
      metadata.textContent = doc.metadataState === 'missing' ? 'metadata missing' : 'metadata invalid';
      detail.appendChild(metadata);
    }
    main.appendChild(detail);
    if (doc.summary?.length) {
      const summary = document.createElement('ul');
      summary.className = 'document-summary';
      doc.summary.forEach(line => {
        const item = document.createElement('li');
        item.textContent = line;
        summary.appendChild(item);
      });
      main.appendChild(summary);
    }
    if (doc.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'tag-row';
      doc.tags.forEach(tag => tags.appendChild(makeTag(tag)));
      main.appendChild(tags);
    }
    row.appendChild(main);
    row.appendChild(documentAction(destination));
    return row;
  }

  function renderCategoryGroup(category, docs) {
    const section = document.createElement('section');
    section.id = `category-${category}`;
    section.className = 'document-category-group';
    const heading = document.createElement('h2');
    heading.textContent = category;
    section.appendChild(heading);
    const directory = `${P.config.documentDirectoryPrefix || 'doc-'}${category}`;
    const description = state.categoryDescriptions[directory];
    if (description) {
      const descriptionNode = document.createElement('p');
      descriptionNode.className = 'category-description';
      descriptionNode.textContent = description;
      section.appendChild(descriptionNode);
    }
    docs.forEach(doc => section.appendChild(makeDocumentRow(doc)));
    return section;
  }

  function renderList() {
    const filters = currentFilters();
    setQuery(filters);
    const filtered = sortDocuments(state.documents.filter(doc => matches(doc, filters)), filters.sort);
    elements.list.replaceChildren();
    const grouped = new Map();
    filtered.forEach(doc => {
      if (!grouped.has(doc.category)) grouped.set(doc.category, []);
      grouped.get(doc.category).push(doc);
    });
    [...grouped.keys()].sort((a, b) => a.localeCompare(b)).forEach(category => elements.list.appendChild(renderCategoryGroup(category, grouped.get(category))));
    const noun = filtered.length === 1 ? 'document' : 'documents';
    elements.status.textContent = `${filtered.length} ${noun}${state.source === 'cache' ? ' · cached index' : ''}`;
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<strong>No matching documents.</strong><span>Change the filters or upload files under a doc-&lt;category&gt; directory.</span>';
      elements.list.appendChild(empty);
    }
  }

  function bindControls() {
    [elements.category, elements.tag, elements.sort].forEach(control => control.addEventListener('change', renderList));
    elements.search.addEventListener('input', renderList);
  }

  async function start() {
    bindControls();
    const cached = loadCache();
    if (cached) {
      state.documents = cached.documents;
      state.categoryDescriptions = cached.categoryDescriptions || {};
      state.source = 'cache';
      renderFilters();
      renderList();
      elements.status.textContent += ' · refreshing…';
    }
    try {
      const [result, descriptions] = await Promise.all([discoverDocuments(), loadCategoryDescriptions()]);
      state.documents = result.documents;
      state.categoryDescriptions = descriptions;
      state.source = 'network';
      saveCache();
      renderFilters();
      renderList();
      if (result.truncated) elements.status.textContent += ' · GitHub returned a truncated repository tree';
    } catch (error) {
      if (cached) {
        state.source = 'cache';
        renderList();
        elements.status.textContent += ' · refresh failed; showing cached index';
      } else {
        elements.status.textContent = 'Could not load the repository document index.';
        const errorBox = document.createElement('div');
        errorBox.className = 'error-state';
        errorBox.textContent = error.message;
        elements.list.replaceChildren(errorBox);
      }
    }
  }

  start();
})();
