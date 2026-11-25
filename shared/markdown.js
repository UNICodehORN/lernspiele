/*
 * Sehr kleiner Markdown-Renderer für die mitgelieferte README.
 * Keine externen Bibliotheken, kein Netzwerkzugriff.
 */
(function (root) {
  "use strict";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(value) {
    const url = String(value).trim();
    if (/^https?:\/\//i.test(url)) return true;
    if (/^(?:javascript|data|vbscript|file):/i.test(url)) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
    return url.indexOf("..") === -1;
  }

  function inline(value) {
    let text = escapeHtml(value);
    text = text.replace(/`([^`]+)`/g, (match, code) => "<code>" + code + "</code>");
    text = text.replace(/\*\*([^*]+)\*\*/g, (match, strong) => "<strong>" + strong + "</strong>");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      if (!safeUrl(url)) return label;
      const external = /^https?:\/\//i.test(url);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return '<a href="' + escapeHtml(url) + '"' + attrs + ">" + label + "</a>";
    });
    return text;
  }

  function isTableSeparator(line) {
    return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.indexOf("-") !== -1;
  }

  function cells(line) {
    return line.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
  }

  function isSpecial(line) {
    return /^```/.test(line.trim()) ||
      /^#{1,6}\s/.test(line) ||
      /^\s*[-*]\s+/.test(line) ||
      /^\s*\d+\.\s+/.test(line) ||
      /^\s*\|/.test(line) ||
      /^---+\s*$/.test(line.trim());
  }

  function render(source) {
    const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }

      if (/^```/.test(line.trim())) {
        const code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          code.push(lines[i]);
          i++;
        }
        i++; // schließende ``` überspringen
        html.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(cells(lines[i]));
          i++;
        }
        html.push("<table><thead><tr>" + head.map(cell => "<th>" + inline(cell) + "</th>").join("") + "</tr></thead>");
        html.push("<tbody>" + rows.map(row => "<tr>" + row.map(cell => "<td>" + inline(cell) + "</td>").join("") + "</tr>").join("") + "</tbody></table>");
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(inline(lines[i].replace(/^\s*[-*]\s+/, "")));
          i++;
        }
        html.push("<ul>" + items.map(item => "<li>" + item + "</li>").join("") + "</ul>");
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(inline(lines[i].replace(/^\s*\d+\.\s+/, "")));
          i++;
        }
        html.push("<ol>" + items.map(item => "<li>" + item + "</li>").join("") + "</ol>");
        continue;
      }

      if (/^---+\s*$/.test(line.trim())) {
        html.push("<hr>");
        i++;
        continue;
      }

      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) {
        paragraph.push(lines[i].trim());
        i++;
      }
      if (paragraph.length) {
        html.push("<p>" + paragraph.map(inline).join("<br>") + "</p>");
      } else {
        i++;
      }
    }

    return html.join("\n");
  }

  const api = { render };
  root.Markdown = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
