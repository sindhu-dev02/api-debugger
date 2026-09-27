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

function renderResponse({ status, statusText, timeMs, bodyText, headers }) {
  let bodyHtml;
  let parsedOk = false;

  if (!bodyText) {
    bodyHtml = `<div class="empty-body">(empty response body)</div>`;
  } else {
    try {
      const parsed = JSON.parse(bodyText);
      bodyHtml = `<pre>${JSON.stringify(parsed, null, 2)}</pre>`;
      parsedOk = true;
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
    </div>
    <div class="section">
      <div class="section-label">Body ${parsedOk ? '(JSON)' : ''}</div>
      ${bodyHtml}
    </div>
    <details class="section">
      <summary class="section-label">Response Headers</summary>
      ${headersHtml || '<div class="empty-body">(no headers)</div>'}
    </details>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const startTime = performance.now();

  responsePanel.innerHTML = `<div class="loading">Sending...</div>`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: hasBody ? bodyTextarea.value : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const timeMs = Math.round(performance.now() - startTime);
    const bodyText = await res.text();

    renderResponse({
      status: res.status,
      statusText: res.statusText,
      timeMs,
      bodyText,
      headers: res.headers
    });

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
});