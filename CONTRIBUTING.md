# Contributing to RoleCraft

Thanks for your interest in contributing! Here's how you can help.

## Quick Start

```bash
git clone https://github.com/rolecraft-sh/rolecraft.git
cd rolecraft
npm install              # also installs the pre-commit hook automatically
npm link                 # now `rolecraft` runs from your local checkout
npm test                 # 1004+ tests should pass
```

**Requirements:** Node.js >= 20. Dev dependencies (Biome, VitePress) install locally but never ship to users — the runtime stays zero-dependency.

## Git Hooks

A `pre-commit` hook runs `npm run lint` before every commit and rejects the commit on lint errors. It is set up **automatically** by `npm install` via the `postinstall` script — no manual `setup-hooks` step is required.

To reinstall or repair the hook manually:

```bash
npm run setup-hooks
```

To bypass the hook once (e.g. for a work-in-progress commit), use `git commit --no-verify` — but CI will still fail the PR if lint errors remain.

## Find Something to Work On

Start with issues labeled [`good first issue`](https://github.com/rolecraft-sh/rolecraft/labels/good%20first%20issue) — they are small, self-contained, and perfect for new contributors.

Don't see anything you like? Open a [feature request](https://github.com/rolecraft-sh/rolecraft/issues/new?template=feature_request.md) or ask in [Discussions](https://github.com/rolecraft-sh/rolecraft/discussions).

## Make Changes

- Keep changes focused on a single concern
- Follow existing code style (no semicolons, ES modules, zero-dependency runtime)
- **Business logic** goes in `src/api/`, **CLI output** goes in `src/commands/`
- Add or update tests for any new functionality
- Run `npm run lint` and `npm test` before submitting — both must pass
- To auto-fix formatting and unused imports, run `npm run lint:fix`

## Error Handling

Use `UserError` (from `src/utils/errors.js`) for user-facing errors. It automatically provides helpful suggestions alongside the error message:

```js
import { UserError } from '../utils/errors.js'

// Instead of:
//   throw new Error('Failed to fetch npm package')

// Do:
//   throw new UserError('Could not fetch npm package "foo"', {
//     suggestion: 'Check the package name and your internet connection.',
//     detail: error.message, // shown with --verbose
//     code: 'NPM_FETCH_FAILED',
//   })
```

| Field | Required | Shown | Purpose |
|-------|----------|-------|---------|
| `message` | yes | always | What went wrong, user-friendly |
| `suggestion` | no | always | What the user should do next |
| `detail` | no | `--verbose` | Technical details for debugging |
| `code` | no | `--verbose` | Machine-readable error code |

Reserve plain `throw new Error(...)` for programming errors (bugs, invariants) that should never reach the user. All user-facing error paths should use `UserError`.

> **Tip:** When adding a new command, always use `UserError` for argument validation errors (missing slug, invalid source, etc.).

## Commit

Use [conventional commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: correct bug in parser
docs: update installation guide
chore: bump dependencies
```

## Open a Pull Request

1. Push your branch and open a PR against `main`
2. Write a clear title and description explaining what and why
3. Link any related issues
4. Wait for CI checks to pass (Tests + CodeQL)
5. The repository owner will review and merge

## Need Help?

- Open a [Discussion](https://github.com/rolecraft-sh/rolecraft/discussions)
- Check the [docs site](https://rolecraft-sh.github.io/rolecraft/)

## Code of Conduct

Be respectful and constructive. Keep discussions focused on the code.

## What Contributors Say

<table width="100%">
  <tr>
    <td width="120" align="center">
      <a href="https://github.com/yukidev630">
        <img src="https://github.com/yukidev630.png?size=100" alt="yukidev630" height="80" width="80">
      </a>
      <br>
      <strong>yukidev630</strong>
    </td>
    <td valign="middle">
      <em>Contributing was straightforward, and it was easy to understand where to make the change. I had a great experience contributing to RoleCraft.</em>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://github.com/BenjaminAyivoh1">
        <img src="https://github.com/BenjaminAyivoh1.png?size=100" alt="BenjaminAyivoh1" height="80" width="80">
      </a>
      <br>
      <strong>BenjaminAyivoh1</strong>
    </td>
    <td valign="middle">
      <em>Contributing to RoleCraft was a great experience, especially as one of my first open-source contributions. The issue was clearly defined, and the maintainers were responsive throughout the process, which made it easy to understand the project and contribute confidently</em>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://github.com/linhaixin45-cmyk">
        <img src="https://github.com/linhaixin45-cmyk.png?size=100" alt="linhaixin45-cmyk" height="80" width="80">
      </a>
      <br>
      <strong>linhaixin45-cmyk</strong>
    </td>
    <td valign="middle">
      <em>Contributing to RoleCraft was straightforward because the issue clearly explained the problem, expected behavior, and relevant code paths, and the test suite made the fix easy to verify. The maintainer's quick, thoughtful review also made the experience welcoming.</em>
    </td>
  </tr>
</table>

---

## Show Your Support

If rolecraft makes your workflow easier, consider [starring the repo](https://github.com/rolecraft-sh/rolecraft). It helps others discover the project.
