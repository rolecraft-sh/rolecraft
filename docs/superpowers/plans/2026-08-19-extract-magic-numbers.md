# Extract Magic Numbers (resolver.js, lockfile.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two remaining hardcoded magic numbers (scanner max depth in `resolver.js`, lockfile version in `lockfile.js`) with named constants, with no behavior change.

**Architecture:** Pure refactor. Add a module-level `const` near the top of each file and reference it at the existing call site(s). No new files, no API changes.

**Tech Stack:** Node.js (ESM), Vitest (existing test suite in `test/`).

**Spec:** Issue "Extract hardcoded magic numbers to named constants in watch.js and resolver.js" (the 300ms watch debounce part is already done via `src/utils/debounce.js`; only the scanner depth and lockfile version remain).

## Global Constraints

- No behavior change — output of `scanForSkill` and `readLock` must be identical before/after.
- Constant names: `SCAN_MAX_DEPTH` in `resolver.js`, `LOCKFILE_VERSION` in `lockfile.js` (per issue).
- Keep existing default-parameter semantics in `scanForSkill` (callers may still not pass `maxDepth`).

---

### Task 1: Extract `SCAN_MAX_DEPTH` in resolver.js

**Files:**
- Modify: `src/utils/resolver.js:134` (default param) — add constant near top of file (after imports, ~line 12)
- Test: `test/resolver.test.js` (or wherever existing resolver tests live — verify exact path before writing)

**Interfaces:**
- Produces: `SCAN_MAX_DEPTH` module-level constant, value `3`, used as the default for `scanForSkill(dir, maxDepth = SCAN_MAX_DEPTH)`.

- [ ] **Step 1: Locate existing resolver tests**

Run: `git grep -l "scanForSkill\|resolveSource\|resolveSkills" test/`

Confirm there's existing coverage that exercises `scanForSkill`'s default depth (e.g. via `resolveSource` on a local nested directory). If none covers depth behavior specifically, skip adding a new test — this is a pure rename with no behavior change, and the existing suite acts as the regression check.

- [ ] **Step 2: Add the constant**

In `src/utils/resolver.js`, after the existing imports (after line 11, before line 13 `let _runExec = ...`):

```js
const SCAN_MAX_DEPTH = 3
```

- [ ] **Step 3: Use the constant at the call site**

Change line 134 from:

```js
async function scanForSkill(dir, maxDepth = 3) {
```

to:

```js
async function scanForSkill(dir, maxDepth = SCAN_MAX_DEPTH) {
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: All existing tests pass, no new failures.

- [ ] **Step 5: Commit**

```bash
git add src/utils/resolver.js
git commit -m "refactor: extract SCAN_MAX_DEPTH constant in resolver.js"
```

---

### Task 2: Extract `LOCKFILE_VERSION` in lockfile.js

**Files:**
- Modify: `src/utils/lockfile.js:43` (default lock object returned by `readLock`) — add constant near top of file (after imports, ~line 6)
- Test: `test/lockfile.test.js` (verify exact path before writing)

**Interfaces:**
- Produces: `LOCKFILE_VERSION` module-level constant, value `3`, used as the `version` field in the default object `readLock()` returns when no lockfile exists yet.

- [ ] **Step 1: Locate existing lockfile tests**

Run: `git grep -l "readLock\|version" test/ | grep -i lock`

Confirm there's a test asserting the default `readLock()` result includes `version: 3`. If one exists, no new test is needed (pure rename, value unchanged). If none exists, add one:

```js
import { describe, it, expect } from 'vitest'
import { readLock } from '../src/utils/lockfile.js'

describe('readLock', () => {
  it('returns version 3 in the default lock when no file exists', async () => {
    const result = await readLock('/nonexistent/path/.skill-lock.json')
    expect(result.version).toBe(3)
  })
})
```

- [ ] **Step 2: Add the constant**

In `src/utils/lockfile.js`, after the existing imports (after line 5, before line 7 `export function normalizeSlug`):

```js
const LOCKFILE_VERSION = 3
```

- [ ] **Step 3: Use the constant at the call site**

Change lines 46-51 from:

```js
    return {
      version: 3,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }
```

to:

```js
    return {
      version: LOCKFILE_VERSION,
      skills: {},
      dismissed: {},
      lastSelectedAgents: [],
    }
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: All existing tests pass (including any new test from Step 1).

- [ ] **Step 5: Commit**

```bash
git add src/utils/lockfile.js test/lockfile.test.js
git commit -m "refactor: extract LOCKFILE_VERSION constant in lockfile.js"
```
