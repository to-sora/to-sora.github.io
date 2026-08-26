(() => {
  'use strict';

  function stripComments(source) {
    return String(source || '')
      .split('\n')
      .map(line => line.replace(/(^|[^\\])%.*$/, '$1'))
      .join('\n');
  }

  function extractBracedCommand(source, command) {
    const pattern = new RegExp('\\\\' + command + '\\s*\\{([^{}]*)\\}', 'm');
    const match = source.match(pattern);
    return match ? match[1].trim() : '';
  }

  function protectMath(source) {
    const chunks = [];
    const store = value => {
      const token = `@@PORTFOLIO_TEX_MATH_${chunks.length}@@`;
      chunks.push(value);
      return token;
    };

    let text = source;

    text = text.replace(
      /\\begin\{(equation\*?|displaymath|align\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g,
      (_, env, body) => {
        const clean = body.trim();
        if (/^align/.test(env)) return store(`\n$$\n\\begin{aligned}\n${clean}\n\\end{aligned}\n$$\n`);
        if (/^gather/.test(env)) return store(`\n$$\n\\begin{gathered}\n${clean}\n\\end{gathered}\n$$\n`);
        return store(`\n$$\n${clean}\n$$\n`);
      }
    );

    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => store(`\n$$\n${body.trim()}\n$$\n`));
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => store(`\n$$\n${body.trim()}\n$$\n`));
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => store(`$${body.trim()}$`));
    text = text.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, prefix, body) => `${prefix}${store(`$${body}$`)}`);

    return {
      text,
      restore(value) {
        return value.replace(/@@PORTFOLIO_TEX_MATH_(\d+)@@/g, (_, index) => chunks[Number(index)] || '');
      }
    };
  }

  function convertTabular(source) {
    return source.replace(
      /\\begin\{tabular\}\s*(?:\{[^{}]*\})?([\s\S]*?)\\end\{tabular\}/g,
      (_, body) => {
        const rows = body
          .replace(/\\hline/g, '')
          .split(/\\\\(?:\[[^\]]*\])?/)
          .map(row => row.trim())
          .filter(Boolean)
          .map(row => row.split('&').map(cell => cell.trim()));

        if (!rows.length) return '';
        const width = Math.max(...rows.map(row => row.length));
        const normalized = rows.map(row => [...row, ...Array(Math.max(0, width - row.length)).fill('')]);
        const header = normalized[0];
        const divider = Array(width).fill('---');
        const lines = [
          `| ${header.join(' | ')} |`,
          `| ${divider.join(' | ')} |`,
          ...normalized.slice(1).map(row => `| ${row.join(' | ')} |`)
        ];
        return `\n${lines.join('\n')}\n`;
      }
    );
  }

  function convertLists(source) {
    let text = source;
    text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, body) => {
      const items = body.split(/\\item\s+/).map(item => item.trim()).filter(Boolean);
      return `\n${items.map(item => `- ${item}`).join('\n')}\n`;
    });
    text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, body) => {
      const items = body.split(/\\item\s+/).map(item => item.trim()).filter(Boolean);
      return `\n${items.map(item => `1. ${item}`).join('\n')}\n`;
    });
    return text;
  }

  function convertVerbatim(source) {
    return source.replace(
      /\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g,
      (_, body) => `\n\`\`\`\n${body.replace(/^\n|\n$/g, '')}\n\`\`\`\n`
    );
  }

  function replaceSimpleCommands(source) {
    let text = source;
    const replacements = [
      [/\\section\*?\s*\{([^{}]*)\}/g, '\n## $1\n'],
      [/\\subsection\*?\s*\{([^{}]*)\}/g, '\n### $1\n'],
      [/\\subsubsection\*?\s*\{([^{}]*)\}/g, '\n#### $1\n'],
      [/\\paragraph\*?\s*\{([^{}]*)\}/g, '\n**$1.** '],
      [/\\textbf\s*\{([^{}]*)\}/g, '**$1**'],
      [/\\(?:emph|textit)\s*\{([^{}]*)\}/g, '*$1*'],
      [/\\texttt\s*\{([^{}]*)\}/g, '`$1`'],
      [/\\href\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '[$2]($1)'],
      [/\\url\s*\{([^{}]*)\}/g, '<$1>'],
      [/\\includegraphics(?:\s*\[[^\]]*\])?\s*\{([^{}]*)\}/g, '\n![Figure]($1)\n'],
      [/\\caption\s*\{([^{}]*)\}/g, '\n*$1*\n'],
      [/\\label\s*\{[^{}]*\}/g, ''],
      [/\\ref\s*\{([^{}]*)\}/g, '$1'],
      [/\\(?:newline|linebreak)\b/g, '  \n'],
      [/\\(?:noindent|centering)\b/g, ''],
      [/\\(?:begin|end)\{(?:figure\*?|center|flushleft|flushright)\}/g, '']
    ];

    for (let i = 0; i < 4; i += 1) {
      const before = text;
      replacements.forEach(([pattern, replacement]) => {
        text = text.replace(pattern, replacement);
      });
      if (text === before) break;
    }
    return text;
  }

  function buildTitleBlock(source) {
    const title = extractBracedCommand(source, 'title');
    const author = extractBracedCommand(source, 'author');
    const date = extractBracedCommand(source, 'date');
    if (!title && !author && !date) return '';

    const parts = [];
    if (title) parts.push(`# ${title}`);
    if (author) parts.push(`**${author}**`);
    if (date && date !== '\\today') parts.push(date);
    return parts.join('\n\n');
  }

  function removePreambleCommands(source) {
    return source
      .replace(/\\documentclass(?:\[[^\]]*\])?\s*\{[^{}]*\}/g, '')
      .replace(/\\usepackage(?:\[[^\]]*\])?\s*\{[^{}]*\}/g, '')
      .replace(/\\(?:title|author|date)\s*\{[^{}]*\}/g, '')
      .replace(/\\maketitle\b/g, '')
      .replace(/\\tableofcontents\b/g, '');
  }

  function convertLatexToMarkdown(source) {
    let input = stripComments(source);
    const titleBlock = buildTitleBlock(input);
    const bodyMatch = input.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (bodyMatch) input = bodyMatch[1];

    const protectedMath = protectMath(input);
    let text = protectedMath.text;
    text = convertVerbatim(text);
    text = convertTabular(text);
    text = convertLists(text);
    text = replaceSimpleCommands(text);
    text = removePreambleCommands(text);
    text = text
      .replace(/\\begin\{([^{}]+)\}/g, '\n')
      .replace(/\\end\{([^{}]+)\}/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    text = protectedMath.restore(text);
    if (titleBlock && !/^#\s/m.test(text)) text = `${titleBlock}\n\n${text}`;
    return text;
  }

  async function renderLatexInto(element, source, sourcePath) {
    if (!window.PortfolioMarkdown?.renderMarkdownInto) throw new Error('Markdown renderer is unavailable.');
    const markdown = convertLatexToMarkdown(source);
    await window.PortfolioMarkdown.renderMarkdownInto(element, markdown, sourcePath);

    const notice = document.createElement('details');
    notice.className = 'docx-warnings';
    const summary = document.createElement('summary');
    summary.textContent = 'LaTeX renderer notes';
    notice.appendChild(summary);
    const text = document.createElement('p');
    text.textContent = 'This reader supports common article-style LaTeX (sections, emphasis, lists, simple tables, figures, links, and math). Complex packages, TikZ, custom macros, bibliography compilation, and TeX engine features may not render fully; use Open raw for the original source.';
    notice.appendChild(text);
    element.prepend(notice);
  }

  window.PortfolioTex = Object.freeze({ convertLatexToMarkdown, renderLatexInto });
})();
