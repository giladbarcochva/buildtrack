# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BuildTrack (Hebrew: "פסגת הגלעד" / G&E Construction) is a Hebrew, RTL, mobile-first PWA for managing
a construction company: projects, worker daily-report timesheets, payroll, a scheduling calendar,
equipment shopping lists, and AI-assisted invoice scanning. It's a React + Vite single-page app with
no backend of its own — all persistence goes straight to Supabase's REST API from the browser.

## Commands

```
npm install       # install deps
npm run dev        # start Vite dev server
npm run build       # production build
npm run preview      # serve the production build locally
```

There is no lint, typecheck, or test setup in this repo (no ESLint/Prettier config, no test runner,
no `.gitignore`). Don't assume `npm run lint` / `npm test` exist.

## Architecture

**Everything lives in one file.** `src/construction-manager.jsx` (~2100 lines) contains the entire
application as a single `export default function App()` component. `src/main.jsx` just mounts it.
There is no router, no component-per-file split, and no CSS files — all styling is inline `style={}`
objects, and the Google Font (Heebo) and a large base64-encoded logo (`LOGO_URL`, near the top of the
file) are embedded directly in the source. When making changes, expect to navigate this one large file
rather than looking for separate components/pages.

**Navigation is two nested state machines, not routing:**
- Top-level `screen` state: `"home" → "wLogin"/"fLogin"/"mLogin" → "worker"/"foreman"/"mgr"`.
  These correspond to the three login flows (worker, foreman/"מנהל עבודה", manager/admin) and their
  resulting dashboards. Each screen is rendered via an early `if (screen === "...") return (...)` in
  `App()` rather than a switch or separate components.
- Within the foreman/manager dashboard, `mgTab` selects a sub-tab: `reports`, `projects`, `workers`,
  `payroll`, `calendar`, `equipment`, `foremen`, `settings`. Foremen only see a subset
  (`foremanTabs = ["reports","projects","workers","calendar"]`); managers see all of them.

**Auth is code-based, not real authentication.** There are three login types, all comparing a
plaintext code typed on the login screen against data loaded from Supabase — no passwords, sessions,
or hashing:
- Workers log in with a personal `code` matched against the `workers` table.
- Foremen log in with a `foremanCode` on a worker record that also has `isForeman: true`.
- The manager/admin login compares against a single shared `adminCode` (default `"1234"`), itself
  stored as a special row in the `workers` table flagged `_isConfig: true` (see `adminConfigDbid`).
  Manager Settings can change this code, which rewrites that row.
- Foremen are scoped to specific projects via `foremanProjects` (an array of project ids on their
  worker record); `canSeeProject`/`visibleProjects`/`visibleReports` filter data down to that scope.

**Persistence: direct Supabase REST calls, no ORM/client SDK.** `dbGet/dbInsert/dbUpdate/dbDelete`
near the top of the file wrap `fetch()` calls to `${SUPABASE_URL}/rest/v1/<table>` using a hardcoded
`SUPABASE_URL`/`SUPABASE_KEY` (anon key). Every table (`projects`, `workers`, `reports`, `calendar`,
`equipment`) stores one JSON blob per row in a `data` column; `dbGet` flattens that into
`{...row.data, _dbid: row.id}` so app code works with plain JS objects and a synthetic `_dbid` for
DB operations, while a separate app-level `id` (usually `Date.now()`) is used for JS-side matching/refs.
`calendar` and `equipment` are loaded inside try/catch in `loadAll()` since those tables may not exist
in an older DB — don't remove that guard without confirming the schema.

There's no realtime subscription; instead `loadAll()` is polled every 60s via `setInterval` while
`screen` is `"mgr"` or `"foreman"` (see the `useEffect` after `loadAll`).

**The `reports` table is overloaded for three distinct purposes** — this is the most important
non-obvious thing to know before touching it:
1. Normal daily work reports submitted by workers (`pendingApproval` absent/false).
2. Reports awaiting foreman/manager approval (`pendingApproval: true`), split into `pendingReports`
   state on load.
3. Payroll payment records (`_paymentRecord: true`), used to mark a worker's month as paid/partially
   paid (`paid`, `partial`, `paidAmt`, `paidAt`). These are filtered out of `reports`/`pendingReports`
   and reduced into a separate `paidMonths` map keyed by `` `${workerId}_${month}` ``.

`loadAll()` in `App()` is where all three are split apart on every load — when adding new report-like
data, follow that same filtering convention rather than introducing a new table.

**Payroll math** lives in the free functions above `App()`: `uniqueWorkDaysForProject`,
`workerDaysForProject`, and `calcWorkerPayroll` (daily rate × days, with half-day (`dayType`) and a
flat fuel bonus (`repFuel`, 50 ₪) factored in). Reuse these rather than recomputing pay elsewhere.

**AI invoice scanning** (`analyzeInvoice`, manager Projects tab) calls the Anthropic Messages API
directly from the browser with `anthropic-dangerous-direct-browser-access: true`, sending a photographed
invoice as base64 image content and asking the model to return strict JSON (`{items:[{desc,qty,price}],
total}`), which is then merged into the project's `expenses[]`. This requires
`ANTHROPIC_API_KEY` (top of file) to be manually filled in — it ships as the literal placeholder
`"PASTE_YOUR_KEY_HERE"` and the feature no-ops with an alert until a real key is pasted in. There is no
env var wiring for this or for the Supabase credentials; both are plain top-of-file constants.

**Project shape** (see `emptyProj`): `name, status, progress, startDate, endDate, plannedDays,
materialCost, totalCost, projectManager, plannedWorkers, highlights, phases[], workers[]` (assigned
worker ids), `expenses[]` (including AI-scanned invoice lines, flagged `fromInvoice: true`).
`STATUS_COLORS` maps the four Hebrew status strings (`בביצוע/ממתין/הושלם/מושהה`) to their badge colors.

**Calendar** (`calEvents`) is a map keyed by `YYYY-MM-DD` date strings to
`{assignments: [{projectId, workers:[]}], tasks: string}`; it's loaded from the `calendar` table and
written back per-day on edit.

**Equipment** (`equipList`) is a simple shared shopping/to-do list: `{name, qty, done}` items.

## Conventions to follow

- UI text, statuses, and comments are in Hebrew; the app is RTL (`dir="rtl"` set in `index.html`).
  Keep new user-facing strings in Hebrew and consistent with the existing tone/terminology
  (e.g. "מנהל עבודה" for foreman, "עובד" for worker).
- New persisted fields should be added as plain keys inside a table row's `data` object via the
  existing `dbInsert`/`dbUpdate` helpers — don't introduce a new fetch/client pattern.
- Screens/tabs are added by extending the `screen`/`mgTab` string enums and the corresponding
  `if (screen === ...)` block or `mgTab === "..."` conditional render inside `App()`, matching the
  existing style rather than introducing routing.
