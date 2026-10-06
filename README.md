# API Response Debugger

A small, local-only tool for testing API endpoints during frontend development —
set method, URL, headers, query params and body, send the request, and inspect
the status, timing, size, and formatted response without switching to Postman
or writing throwaway fetch code.

## Running it

No build step, no dependencies, no server required.

1. Clone the repo
2. Open `index.html` directly in a browser

That's it. Everything runs client-side.

## Project structure

api-debugger/
├── index.html # form markup + layout
├── style.css # dark/amber theme, all component styling
└── app.js # all behavior: requests, rendering, history, favorites


No build tooling, no package.json, no framework. Open `index.html` and it works.

## Architecture

**Single-page, vanilla JS.** All logic lives in `app.js` as a flat set of
functions operating on the DOM directly — no component framework, no state
management library, no bundler.

**Request flow:**
1. Form submit (or Retry button) collects `url`, `method`, `headers`,
   `body`/`query params` from the DOM
2. `sendRequest()` fires the fetch with a 10s timeout via `AbortController`,
   times it with `performance.now()`
3. Response is rendered via `renderResponse()` — JSON is pretty-printed and
   syntax-highlighted; non-JSON falls back to raw text; errors (timeout,
   network/CORS, invalid URL) get a distinct error box instead of crashing

**Persistence:** Request history (last 20) and saved favorites are stored in
the browser's `localStorage`, under separate keys. Nothing is sent to a
server, nothing survives switching browsers or clearing site data.

**Two-way sync:** The query-param builder and the URL field stay in sync in
both directions — editing a param updates the URL's query string, and typing
a URL with `?params` populates the param builder. A `syncingFromUrl` flag
guards against the two update functions triggering each other in a loop.

## Features

- Method, URL, headers, query params, and body input
- Status code, response time, response size, and response headers
- JSON pretty-printing with syntax highlighting
- Search/highlight within a JSON response
- Explicit handling for: invalid URL, timeout, network/CORS failure, invalid
  JSON, empty body, 4xx/5xx (treated as normal responses, not errors)
- Copy the current request as a `curl` command
- Request history (auto-saved, last 20)
- Favorites (manually saved, named, persistent)
- Retry last request, independent of current form state

## Known limitations

- No cross-device sync — history/favorites are local to one browser
- `Copy as cURL` output uses bash-style quoting; won't paste-and-run as-is in
  Windows `cmd.exe` (works in Git Bash, WSL, macOS, Linux)
- Timeout is hardcoded at 10s, not user-configurable

## Deliberately not implemented

- **Request collections/folders** — grouping saved favorites into folders
  or projects. Favorites are a flat list by design; this tool is meant
  for quick one-off checks, not as a full Postman replacement.
- **Environment variables** (e.g. swapping a base URL or token across
  requests) — adds real complexity (variable syntax, scoping) for a
  problem this tool's actual use case doesn't hit often enough to justify.
- **Response diffing** between two requests — useful in theory, but out
  of scope for a tool meant to stay small and single-purpose.
- **Auth flows** (OAuth, token refresh) — headers can be set manually,
  which covers the debugging use case; building real auth flows is a
  different, much bigger tool.