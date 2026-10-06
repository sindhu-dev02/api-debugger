const headersList = document.getElementById('headers-list');
const addHeaderBtn = document.getElementById('add-header');
const methodSelect = document.getElementById('method');
const bodyTextarea = document.getElementById('request-body');
const urlInput = document.getElementById('url');
const form = document.getElementById('request-form');
const responsePanel = document.getElementById('response-panel');

const TIMEOUT_MS = 10000;

// --- Add header row ---
function createHeaderRow() {
  const row = document.createElement('div');
  row.className = 'header-row';

  row.innerHTML = `
    <input type="text" class="header-key" placeholder="Key">
    <input type="text" class="header-value" placeholder="Value">
    <button type="button" class="remove-header">✕</button>
  `;

  row.querySelector('.remove-header').addEventListener('click', () => {
    row.remove();
  });

  return row;
}

addHeaderBtn.addEventListener('click', () => {
  headersList.appendChild(createHeaderRow());
});

document.querySelectorAll('.header-row').forEach(row => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'remove-header';
  btn.textContent = '✕';
  btn.addEventListener('click', () => row.remove());
  row.appendChild(btn);
});

// --- Query params ---
const paramsList = document.getElementById('params-list');
const addParamBtn = document.getElementById('add-param');
let syncingFromUrl = false; // guard against infinite loop between url <-> params
let lastRequest = null;

function createParamRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'param-row'; // reuse existing header-row styling

  row.innerHTML = `
    <input type="text" class="param-key" placeholder="Key" value="${escapeAttr(key)}">
    <input type="text" class="param-value" placeholder="Value" value="${escapeAttr(value)}">
    <button type="button" class="remove-header">✕</button>
  `;

  row.querySelector('.param-key').addEventListener('input', syncUrlFromParams);
  row.querySelector('.param-value').addEventListener('input', syncUrlFromParams);
  row.querySelector('.remove-header').addEventListener('click', () => {
    row.remove();
    syncUrlFromParams();
  });

  return row;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

addParamBtn.addEventListener('click', () => {
  paramsList.appendChild(createParamRow());
});

// Params -> URL
function syncUrlFromParams() {
  if (syncingFromUrl) return;

  const base = urlInput.value.split('?')[0];
  const pairs = [];

  document.querySelectorAll('#params-list .param-row').forEach(row => {
    const key = row.querySelector('.param-key').value.trim();
    const value = row.querySelector('.param-value').value;
    if (key) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  urlInput.value = pairs.length ? `${base}?${pairs.join('&')}` : base;
}

// URL -> Params
function syncParamsFromUrl() {
  syncingFromUrl = true;

  const [, queryString] = urlInput.value.split('?');
  paramsList.innerHTML = '';

  if (queryString) {
    const usp = new URLSearchParams(queryString);
    usp.forEach((value, key) => {
      paramsList.appendChild(createParamRow(key, value));
    });
  }

  syncingFromUrl = false;
}

urlInput.addEventListener('input', syncParamsFromUrl);

// --- Disable body for methods that don't use one ---
const METHODS_WITHOUT_BODY = ['GET', 'DELETE'];

function syncBodyState() {
  const disabled = METHODS_WITHOUT_BODY.includes(methodSelect.value);
  bodyTextarea.disabled = disabled;
  bodyTextarea.placeholder = disabled
    ? `${methodSelect.value} requests don't send a body`
    : '{ "example": "value" }';
  if (disabled) bodyTextarea.value = '';
}

methodSelect.addEventListener('change', syncBodyState);
syncBodyState();

// --- Request history ---
const HISTORY_KEY = 'api-debugger-history';
const MAX_HISTORY = 20;

const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  const history = getHistory();
  history.unshift(entry); // newest first
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();

  if (history.length === 0) {
    historyList.innerHTML = `<div class="empty-body">(no requests yet)</div>`;
    return;
  }

  historyList.innerHTML = history
    .map((entry, i) => `
      <div class="history-row" data-index="${i}">
        <span class="history-method">${entry.method}</span>
        <span class="history-url">${escapeHtml(entry.url)}</span>
      </div>
    `)
    .join('');

  document.querySelectorAll('.history-row').forEach(row => {
    row.addEventListener('click', () => {
      const entry = getHistory()[Number(row.dataset.index)];
      loadFromHistory(entry);
    });
  });
}

function loadFromHistory(entry) {
  urlInput.value = entry.url;
  methodSelect.value = entry.method;
  syncBodyState();
  bodyTextarea.value = entry.body || '';

  // clear existing header rows, rebuild from saved entry
  headersList.innerHTML = '';
  const savedHeaders = Object.entries(entry.headers || {});
  if (savedHeaders.length === 0) {
    headersList.appendChild(createHeaderRow());
  } else {
    savedHeaders.forEach(([key, value]) => {
      const row = createHeaderRow();
      row.querySelector('.header-key').value = key;
      row.querySelector('.header-value').value = value;
      headersList.appendChild(row);
    });
  }
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

renderHistory(); // populate on page load

// --- Favorites ---
const FAVORITES_KEY = 'api-debugger-favorites';

const favoritesList = document.getElementById('favorites-list');
const saveFavoriteBtn = document.getElementById('save-favorite-btn');

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const favorites = getFavorites();

  if (favorites.length === 0) {
    favoritesList.innerHTML = `<div class="empty-body">(no favorites yet)</div>`;
    return;
  }

  favoritesList.innerHTML = favorites
    .map((fav, i) => `
      <div class="history-row" data-index="${i}">
        <span class="history-method">${fav.method}</span>
        <span class="history-url">${escapeHtml(fav.name)}</span>
        <button type="button" class="remove-favorite" data-index="${i}">✕</button>
      </div>
    `)
    .join('');

  document.querySelectorAll('#favorites-list .history-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-favorite')) return;
      const fav = getFavorites()[Number(row.dataset.index)];
      loadFromHistory(fav);
    });
  });

  document.querySelectorAll('.remove-favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const favorites = getFavorites();
      favorites.splice(Number(btn.dataset.index), 1);
      saveFavorites(favorites);
    });
  });
}

saveFavoriteBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();

  if (!url || !isValidUrl(url)) {
    saveFavoriteBtn.textContent = 'Invalid URL';
    setTimeout(() => (saveFavoriteBtn.textContent = '☆ Save'), 1500);
    return;
  }

  const name = prompt('Name this request:', url);
  if (!name) return; // cancelled

  const method = methodSelect.value;
  const headers = collectHeaders();
  const hasBody = !METHODS_WITHOUT_BODY.includes(method) && bodyTextarea.value.trim();

  const favorites = getFavorites();
  favorites.push({
    name,
    url,
    method,
    headers,
    body: hasBody ? bodyTextarea.value : ''
  });
  saveFavorites(favorites);

  saveFavoriteBtn.textContent = 'Saved!';
  setTimeout(() => (saveFavoriteBtn.textContent = '☆ Save'), 1500);
});

renderFavorites(); // populate on page load

// --- Retry last request ---
const retryBtn = document.getElementById('retry-btn');

retryBtn.addEventListener('click', () => {
  if (!lastRequest) return;
  sendRequest({
    url: lastRequest.url,
    method: lastRequest.method,
    headers: lastRequest.headers,
    body: lastRequest.hasBody ? lastRequest.body : undefined
  });
});

// --- Collect headers from the form ---
function collectHeaders() {
  const headers = {};
  document.querySelectorAll('.header-row').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const value = row.querySelector('.header-value').value.trim();
    if (key) headers[key] = value;
  });
  return headers;
}

// --- Copy as cURL ---
function buildCurlCommand() {
  const url = urlInput.value.trim();
  const method = methodSelect.value;
  const headers = collectHeaders();
  const hasBody = !METHODS_WITHOUT_BODY.includes(method) && bodyTextarea.value.trim();

  let parts = [`curl -X ${method}`];

  parts.push(`'${url}'`);

  Object.entries(headers).forEach(([key, value]) => {
    parts.push(`-H '${key}: ${value}'`);
  });

  if (hasBody) {
    const escapedBody = bodyTextarea.value.replace(/'/g, `'\\''`);
    parts.push(`-d '${escapedBody}'`);
  }

  return parts.join(' \\\n  ');
}

const copyCurlBtn = document.getElementById('copy-curl');

copyCurlBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();

  if (!url) {
    copyCurlBtn.textContent = 'No URL set';
    setTimeout(() => (copyCurlBtn.textContent = 'Copy as cURL'), 1500);
    return;
  }

  if (!isValidUrl(url)) {
    copyCurlBtn.textContent = 'Invalid URL';
    setTimeout(() => (copyCurlBtn.textContent = 'Copy as cURL'), 1500);
    return;
  }

  const curl = buildCurlCommand();

  try {
    await navigator.clipboard.writeText(curl);
    copyCurlBtn.textContent = 'Copied!';
  } catch {
    copyCurlBtn.textContent = 'Copy failed';
  }

  setTimeout(() => (copyCurlBtn.textContent = 'Copy as cURL'), 1500);
});

// --- URL validation ---
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// --- Rendering ---
function renderError(title, detail) {
  responsePanel.innerHTML = `
    <div class="error-box">
      <div class="error-title">${title}</div>
      <div class="error-detail">${detail}</div>
    </div>
  `;
}

function statusClass(status) {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 300 && status < 400) return 'status-3xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  return 'status-5xx';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderResponse({ status, statusText, timeMs, bodyText, headers, sizeBytes }) {
  let bodyHtml;
  let parsedOk = false;
  let searchBarHtml = '';
  const sizeLabel = formatBytes(sizeBytes);

  if (!bodyText) {
    bodyHtml = `<div class="empty-body">(empty response body)</div>`;
  } else {
    try {
      const parsed = JSON.parse(bodyText);
      const prettyJson = JSON.stringify(parsed, null, 2);
      bodyHtml = `<pre id="response-pre">${syntaxHighlight(prettyJson)}</pre>`;
      parsedOk = true;
      searchBarHtml = `
        <div class="search-bar">
          <input type="text" id="response-search" placeholder="Search in response...">
          <span id="search-count"></span>
        </div>
      `;
    } catch {
      bodyHtml = `<div class="parse-warning">Response is not valid JSON — showing raw text</div><pre>${escapeHtml(bodyText)}</pre>`;
    }
  }

  const headersHtml = [...headers.entries()]
    .map(([k, v]) => `<div class="header-line"><span class="h-key">${k}</span>: <span class="h-val">${v}</span></div>`)
    .join('');

  responsePanel.innerHTML = `
    <div class="response-meta">
      <span class="status-pill ${statusClass(status)}">${status} ${statusText}</span>
      <span class="time-pill">${timeMs}ms</span>
      <span class="time-pill">${sizeLabel}</span>
    </div>
    <div class="section">
      <div class="section-label">Body ${parsedOk ? '(JSON)' : ''}</div>
      ${searchBarHtml}
      ${bodyHtml}
    </div>
    <details class="section">
      <summary class="section-label">Response Headers</summary>
      ${headersHtml || '<div class="empty-body">(no headers)</div>'}
    </details>
  `;

  if (parsedOk) {
    const searchInput = document.getElementById('response-search');
    searchInput.addEventListener('input', () => highlightMatches(searchInput.value));
  }
}

// --- Response search/highlight ---
function highlightMatches(query) {
  const pre = document.getElementById('response-pre');
  const countEl = document.getElementById('search-count');
  if (!pre) return;

  // reset to the stored clean HTML before re-highlighting
  if (!pre.dataset.original) {
    pre.dataset.original = pre.innerHTML;
  }
  pre.innerHTML = pre.dataset.original;

  if (!query.trim()) {
    countEl.textContent = '';
    return;
  }

  const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  let matchCount = 0;

  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    if (!regex.test(text)) return;
    regex.lastIndex = 0;

    const matches = text.match(regex);
    if (matches) matchCount += matches.length;

    const span = document.createElement('span');
    span.innerHTML = text.replace(regex, '<mark class="search-hit">$1</mark>');
    textNode.replaceWith(span);
  });

  countEl.textContent = matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'no matches';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- JSON syntax highlighting ---
function syntaxHighlight(jsonString) {
  const escaped = jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// --- Main submit handler ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  const method = methodSelect.value;

  if (!url) {
    renderError('No URL', 'Enter a URL before sending.');
    return;
  }

  if (!isValidUrl(url)) {
    renderError('Invalid URL', `"${url}" isn't a valid http/https URL.`);
    return;
  }

  const headers = collectHeaders();
  const hasBody = !METHODS_WITHOUT_BODY.includes(method) && bodyTextarea.value.trim();
  lastRequest = { url, method, headers, hasBody, body: bodyTextarea.value };
  document.getElementById('retry-btn').disabled = false;

  await sendRequest({ url, method, headers, body: hasBody ? bodyTextarea.value : undefined });
});

// --- Shared send logic (used by both Send and Retry) ---
async function sendRequest({ url, method, headers, body }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const startTime = performance.now();

  responsePanel.innerHTML = `<div class="loading">Sending...</div>`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const timeMs = Math.round(performance.now() - startTime);
    const bodyText = await res.text();
    const sizeBytes = new Blob([bodyText]).size;

    renderResponse({
      status: res.status,
      statusText: res.statusText,
      timeMs,
      bodyText,
      headers: res.headers,
      sizeBytes
    });

    saveToHistory({ url, method, headers, body: body || '' });

  } catch (err) {
    clearTimeout(timeoutId);
    const timeMs = Math.round(performance.now() - startTime);

    if (err.name === 'AbortError') {
      renderError('Timeout', `No response after ${TIMEOUT_MS / 1000}s. The server may be slow or unreachable.`);
    } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      renderError('Network / CORS error', `The request couldn't be completed after ${timeMs}ms. This usually means either the server is unreachable, or it's a CORS failure — the browser blocks the response but hides the details for security reasons. Check the browser console and the target API's CORS headers.`);
    } else {
      renderError('Unexpected error', err.message);
    }
  }
}