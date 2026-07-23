# Contributing to RoleCraft

Thanks for your interest in contributing! Here's how you can help.

## Quick Start

```bash
git clone https://github.com/rolecraft-sh/rolecraft.git
cd rolecraft
npm install              # also installs the pre-commit hook automatically
npm link                 # now `rolecraft` runs from your local checkout
npm test                 # 828+ tests should pass
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

## Show Your Support

If rolecraft makes your workflow easier, consider [starring the repo](https://github.com/rolecraft-sh/rolecraft). It helps others discover the project.
