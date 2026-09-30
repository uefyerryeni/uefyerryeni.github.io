(function () {
  const DATA = window.PAINEL_DATA;
  const docs = DATA.documents;
  let currentCoverage = "all";
  let selectedDocId = null;
  const pdfUrlCache = new Map();

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, query) {
    const escaped = escapeHtml(text);
    if (!query.trim()) return escaped;
    const direct = query.trim();
    if (!direct) return escaped;
    try {
      return escaped.replace(new RegExp(`(${safeRegex(escapeHtml(direct))})`, "giu"), "<mark>$1</mark>");
    } catch {
      return escaped;
    }
  }

  function snippet(text, query) {
    const source = String(text || "");
    const normalizedSource = normalize(source);
    const normalizedQuery = normalize(query);
    const index = normalizedSource.indexOf(normalizedQuery);
    if (index < 0 || source.length <= 360) return source.slice(0, 420);
    const start = Math.max(0, index - 150);
    const end = Math.min(source.length, index + normalizedQuery.length + 230);
    return `${start > 0 ? "..." : ""}${source.slice(start, end)}${end < source.length ? "..." : ""}`;
  }

  function scoreChunk(chunk, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return 0;
    const normalizedText = normalize(chunk.text);
    let score = normalizedText.includes(normalizedQuery) ? 10 : 0;
    const terms = normalizedQuery.split(" ").filter((term) => term.length > 2);
    if (terms.length) {
      const matches = terms.filter((term) => normalizedText.includes(term)).length;
      if (matches === terms.length) score += matches * 2;
    }
    return score;
  }

  function searchDocument(doc, query) {
    const matches = [];
    for (const chunk of doc.chunks) {
      const score = scoreChunk(chunk, query);
      if (score > 0) matches.push({ ...chunk, score });
    }
    matches.sort((a, b) => b.score - a.score || a.page - b.page);
    return matches;
  }

  function renderStats(query, results) {
    const totalHits = results.reduce((sum, item) => sum + item.matches.length, 0);
    const docsWithHits = results.filter((item) => item.matches.length > 0).length;
    $("#stats-strip").innerHTML = [
      ["Documentos", docs.length],
      ["Trechos encontrados", query ? totalHits : "0"],
      ["Chapas com ocorrência", query ? docsWithHits : "0"],
    ]
      .map(([label, value]) => `<div class="stat-box"><strong>${value}</strong><span>${label}</span></div>`)
      .join("");
  }

  function renderSearch(query = "") {
    const trimmed = query.trim();
    const results = docs.map((doc) => ({ doc, matches: trimmed ? searchDocument(doc, trimmed) : [] }));
    renderStats(trimmed, results);

    if (!trimmed) {
      $("#results-grid").innerHTML = `<div class="empty-state"><h3>Comece por uma palavra do debate universitário.</h3><p>Exemplos úteis: circular, transporte, permanência, orçamento, inclusão, pesquisa, sustentabilidade.</p></div>`;
      return;
    }

    $("#results-grid").innerHTML = results
      .map(({ doc, matches }) => {
        const hits = matches.slice(0, 6);
        const body = hits.length
          ? hits
              .map(
                (hit) => `
                  <article class="hit-card">
                    <div class="hit-meta">
                      <span class="pill">Página ${hit.page}</span>
                      <span class="pill present">Ocorrência textual</span>
                    </div>
                    <p>${highlight(snippet(hit.text, trimmed), trimmed)}</p>
                  </article>
                `
              )
              .join("")
          : `<article class="hit-card"><div class="hit-meta"><span class="pill missing">Sem ocorrência</span></div><p>O termo não foi localizado nos trechos extraídos deste programa.</p></article>`;
        return `
          <section class="result-column">
            <div class="column-head">
              <h3>${escapeHtml(doc.number)}</h3>
              <p>${escapeHtml(doc.title)} · ${matches.length} trecho(s)</p>
            </div>
            <div class="hit-list">${body}</div>
          </section>
        `;
      })
      .join("");
  }

  function topicCoverage(topic) {
    return docs.filter((doc) => topic.documents[doc.id]?.count > 0).length;
  }

  function renderTopics() {
    const topics = DATA.topics
      .map((topic) => ({ ...topic, coverage: topicCoverage(topic) }))
      .filter((topic) => currentCoverage === "all" || String(topic.coverage) === currentCoverage)
      .sort((a, b) => b.coverage - a.coverage || a.title.localeCompare(b.title, "pt-BR"));

    if (!topics.length) {
      $("#topic-board").innerHTML = `<div class="empty-state"><h3>Nenhum tema neste filtro.</h3><p>Escolha outra faixa de presença.</p></div>`;
      return;
    }

    $("#topic-board").innerHTML = topics
      .map((topic) => {
        const docCards = docs
          .map((doc) => {
            const info = topic.documents[doc.id];
            const match = info.matches[0];
            return `
              <article class="topic-doc ${match ? "has-match" : ""}">
                <strong>${escapeHtml(doc.number)}</strong>
                <span class="pill ${match ? "present" : "missing"}">${match ? `${info.count} ocorrência(s)` : "Não localizado"}</span>
                <p>${match ? escapeHtml(match.text.slice(0, 360)) : "Sem trecho correspondente para as palavras-chave deste tema."}</p>
                ${match ? `<p class="source-note">Página ${match.page}</p>` : ""}
              </article>
            `;
          })
          .join("");
        return `
          <article class="topic-card">
            <div class="topic-top">
              <div>
                <h3>${escapeHtml(topic.title)}</h3>
                <p>${escapeHtml(topic.description)}</p>
              </div>
              <div class="coverage-count">${topic.coverage}<small>chapa(s)</small></div>
            </div>
            <div class="coverage-list">
              ${docs
                .map((doc) => `<span class="pill ${topic.documents[doc.id].count > 0 ? "present" : "missing"}">${escapeHtml(doc.number)}</span>`)
                .join("")}
            </div>
            <div class="topic-docs">${docCards}</div>
          </article>
        `;
      })
      .join("");
  }


  async function getDocumentUrl(doc) {
    if (!doc.parts || !doc.parts.length) return doc.download;
    if (pdfUrlCache.has(doc.id)) return pdfUrlCache.get(doc.id);

    const byteChunks = [];
    for (const part of doc.parts) {
      const response = await fetch(part);
      if (!response.ok) throw new Error(`Falha ao carregar ${part}`);
      const base64 = (await response.text()).trim();
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      byteChunks.push(bytes);
    }

    const url = URL.createObjectURL(new Blob(byteChunks, { type: "application/pdf" }));
    pdfUrlCache.set(doc.id, url);
    return url;
  }

  function showDocumentError(error) {
    console.error(error);
    window.alert("Não foi possível abrir este PDF agora. Tente novamente em instantes.");
  }

  async function openDocumentInNewTab(doc) {
    const tab = window.open("about:blank", "_blank");
    try {
      const url = await getDocumentUrl(doc);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (error) {
      if (tab) tab.close();
      showDocumentError(error);
    }
  }

  async function downloadDocument(doc) {
    try {
      const url = await getDocumentUrl(doc);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.download.split("/").pop() || `${doc.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      showDocumentError(error);
    }
  }

  async function renderDocuments() {
    $("#document-list").innerHTML = docs
      .map(
        (doc) => `
          <article class="document-card ${doc.id === selectedDocId ? "is-selected" : ""}">
            <h3>${escapeHtml(doc.number)}</h3>
            <p><strong>${escapeHtml(doc.title)}</strong><br>${escapeHtml(doc.subtitle)}</p>
            <p>${escapeHtml(doc.composition)}</p>
            <p>${doc.pages} páginas no PDF${doc.searchPages && doc.searchPages !== doc.pages ? ` · ${doc.searchPages} páginas na base de busca` : ""} · ${Math.round(doc.textLength / 1000)} mil caracteres extraídos</p>
            <div class="doc-actions">
              <a href="${doc.download}" target="_blank" rel="noopener noreferrer" data-open-doc="${doc.id}">Ver PDF</a>
              <a href="${doc.download}" download data-download-doc="${doc.id}">Baixar</a>
            </div>
          </article>
        `
      )
      .join("");

    $$("#document-list [data-open-doc]").forEach((link) => {
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        const doc = docs.find((item) => item.id === link.dataset.openDoc);
        if (!doc) return;
        if (window.matchMedia("(max-width: 760px)").matches) {
          await openDocumentInNewTab(doc);
          return;
        }
        selectedDocId = doc.id;
        await renderDocuments();
      });
    });

    $$("#document-list [data-download-doc]").forEach((link) => {
      link.addEventListener("click", async (event) => {
        const doc = docs.find((item) => item.id === link.dataset.downloadDoc);
        if (!doc || !doc.parts || !doc.parts.length) return;
        event.preventDefault();
        await downloadDocument(doc);
      });
    });

    const selected = docs.find((doc) => doc.id === selectedDocId);
    if (!selected) {
      $("#pdf-title").textContent = "Selecione um documento";
      $("#pdf-download").removeAttribute("href");
      $("#pdf-download").onclick = null;
      $("#pdf-frame").removeAttribute("src");
      return;
    }
    $("#pdf-title").textContent = `${selected.number}: ${selected.title}`;
    try {
      const url = await getDocumentUrl(selected);
      $("#pdf-frame").src = url;
      $("#pdf-download").href = url;
      $("#pdf-download").download = selected.download.split("/").pop() || `${selected.id}.pdf`;
      $("#pdf-download").onclick = selected.parts && selected.parts.length
        ? async (event) => { event.preventDefault(); await downloadDocument(selected); }
        : null;
    } catch (error) {
      showDocumentError(error);
    }
  }

  function renderProfiles() {
    $("#profiles-grid").innerHTML = docs
      .map((doc) => {
        const links = doc.links.length
          ? doc.links.map((link) => `<a class="pill" href="${link.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")
          : `<span class="pill missing">Lattes não informado no PDF</span>`;
        return `
          <article class="profile-card">
            <h3>${escapeHtml(doc.number)}</h3>
            <p><strong>${escapeHtml(doc.title)}</strong></p>
            <p><strong>Reitor(a):</strong> ${escapeHtml(doc.reitor)}<br><strong>Vice:</strong> ${escapeHtml(doc.vice)}</p>
            <ul>${doc.profile.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            <div class="coverage-list">${links}</div>
            <p class="source-note">${escapeHtml(doc.profileSource)}</p>
          </article>
        `;
      })
      .join("");
  }

  function switchView(view) {
    $$(".view").forEach((node) => node.classList.toggle("is-active", node.id === `view-${view}`));
    $$(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
    if (view === "propostas") renderTopics();
    if (view === "documentos") renderDocuments();
    if (view === "perfis") renderProfiles();
  }

  function bindEvents() {
    $$(".nav-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    $("#search-form").addEventListener("submit", (event) => {
      event.preventDefault();
      renderSearch($("#search-input").value);
    });

    $("#search-input").addEventListener("input", (event) => {
      window.clearTimeout(window.__searchTimer);
      window.__searchTimer = window.setTimeout(() => renderSearch(event.target.value), 120);
    });

    $("#suggestions").innerHTML = DATA.suggestions
      .map((term) => `<button type="button" data-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
      .join("");
    $$("#suggestions button").forEach((button) => {
      button.addEventListener("click", () => {
        $("#search-input").value = button.dataset.term;
        renderSearch(button.dataset.term);
      });
    });

    $$(".filter-button").forEach((button) => {
      button.addEventListener("click", () => {
        currentCoverage = button.dataset.coverage;
        $$(".filter-button").forEach((item) => item.classList.toggle("is-active", item === button));
        renderTopics();
      });
    });
  }

  function init() {
    bindEvents();
    renderSearch("");
    renderDocuments();
    renderProfiles();
    renderTopics();
  }

  init();
})();