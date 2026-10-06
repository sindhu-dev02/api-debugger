# Decision Record

Three decisions for this project that would be expensive to walk back,
what they cost, and what was given up to make them.

---

## 1. No backend — localStorage as the only persistence layer

**Decision:** History and favorites are stored entirely in the browser's
`localStorage`. There is no server, no database, no account system.

**Alternatives considered:**
- A small backend (even something minimal like a local SQLite file via a
  tiny Node server) to persist history/favorites server-side
- A hosted backend, so favorites could sync across devices/browsers

**Why this one:** The entire point of the tool is to be a zero-setup,
open-and-use utility — "a lightweight tool... without switching between
tools." Adding a server means adding a process to start, a port to manage,
and a reason for the tool to stop working. That directly undermines the
stated goal.

**What it costs:**
- Favorites and history don't sync across machines or browsers — they're
  gone if you switch devices
- Clearing browser data silently wipes everything with no warning and no
  recovery
- There's no way to share a saved favorite with a teammate except manually
  (e.g. copy-as-cURL and paste it to them)

This is the decision I'd be most reluctant to reverse later, because
reversing it means introducing a server, which changes "open `index.html`
and go" into "install dependencies, start a process, manage a port" — a
much bigger shift than it looks like from the outside.

---

## 2. Vanilla JS, no framework, no build step

**Decision:** Plain HTML/CSS/JS, no React/Vue/etc., no bundler, no npm
dependencies at all.

**Alternatives considered:**
- React with Vite, for component isolation and more structured state

**Why this one:** This is a small, single-purpose dev tool, not an app
meant to grow a large feature surface. A build step and a framework add
setup friction (`npm install`, a dev server) that works against the "open
it and it just works" goal, and for the actual size of this tool, a
framework's benefits (component isolation, reactive state) weren't worth
that cost up front.

**What it costs:**
- No real state management — the app relies on DOM queries
  (`document.querySelectorAll(...)`) as its source of truth rather than a
  single state object, which gets harder to reason about as features pile up
- No component isolation, so two features can collide if they're not
  careful about shared naming (see decision #3 — this is the direct cause
  of that bug)
- Every new feature means more manual DOM wiring in a single growing
  `app.js` file, rather than self-contained components

This is a reasonable call for the tool's current size, but it's the kind of
decision that gets more expensive to reverse the longer it's deferred —
retrofitting a framework onto an app that already has a dozen features
wired by hand is a much bigger job than starting with one.

---

## 3. Reusing shared DOM/CSS structure (`header-row`) across features

**Decision:** When building the query-param builder, it initially reused
the exact same CSS class (`header-row`) and row structure as the existing
headers UI, to avoid duplicating styling.

**Alternatives considered:**
- Give param rows their own class (`param-row`) from the start, duplicating
  a small amount of CSS
- Build a single shared "key-value row" component/function used by both
  headers and params, parameterized by context

**Why this one (at the time):** It was the fastest path to a visually
consistent UI — one less CSS rule to write, and the rows looked identical,
so reuse seemed harmless.

**What it costs — and this is the one that already proved awkward:**
`collectHeaders()` selected elements by `.header-row`, with no concept of
"which feature does this row belong to." Once query-param rows used the
same class, `collectHeaders()` silently scooped up query params and sent
them to the server as HTTP headers — breaking real requests (e.g.
`?userId=1` turned into a header instead of a query param, and the request
returned nothing). This wasn't caught until manual testing against a live
API, not from reading the code.

The fix (renaming to `.param-row`) was cheap. The actual cost was that
**a styling-reuse decision quietly became a correctness bug**, because
in a framework with scoped/component-level markup this class of bug isn't
reachable — two components can't accidentally share a selector. In
vanilla JS/CSS, "reuse this class for convenience" and "this class is also
a selector other logic depends on" are the same thing, and nothing forces
you to notice when they collide.

This is the clearest example in the project of a decision whose cost
wasn't visible when it was made — it only showed up once real traffic hit
it.

---

## README

See [`README.md`](./README.md) for how to run the project. This document
covers why it's built the way it is; the README covers how to use it.