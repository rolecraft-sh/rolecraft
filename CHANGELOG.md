# Changelog

All notable changes to this project will be documented in this file.

## [v1.6.0] - 2026-07-20

### Added
- add --json flag to list command (#120)
- add git and npm availability checks
- add skills.sh search with --skills-sh flag (experimental) (#101)
- add convert command for SKILL.md <-> .mdc format conversion (#100)
- add droid, chatgpt, codearts-agent, universal agents (86 total)

### Fixed
- log reinstall failure in watch command
- document install yes flag in help
- resolve CodeQL alerts and flaky ENOTEMPTY tests
- enable docs deployment after release

### Changed
- update changelog and version for v1.6.0
- update changelog and version for v1.6.0
- bump github/codeql-action/analyze from 4.37.0 to 4.37.1 (#115)
- bump github/codeql-action/init from 4.37.0 to 4.37.1
- bump actions/setup-node from 6.4.0 to 7.0.0
- add star CTA to README (#102)
- update changelog and version for v1.5.0 [skip ci] (#97)

### Documentation
- add Benjamin Ayivoh to contributors, convert to grid layout
- add star request to CONTRIBUTING.md
- add Gaohar Imran and Ajay Krishnan to contributors table
- add Yurii201811 to contributors table
- add getting-started, use-cases, and CLI reference pages (#103)
- streamline README for Show HN launch
## [v1.6.0] - 2026-07-20

### Added
- add --json flag to list command (#120)
- add git and npm availability checks
- add skills.sh search with --skills-sh flag (experimental) (#101)
- add convert command for SKILL.md <-> .mdc format conversion (#100)
- add droid, chatgpt, codearts-agent, universal agents (86 total)

### Fixed
- log reinstall failure in watch command
- document install yes flag in help
- resolve CodeQL alerts and flaky ENOTEMPTY tests
- enable docs deployment after release

### Changed
- update changelog and version for v1.6.0
- bump github/codeql-action/analyze from 4.37.0 to 4.37.1 (#115)
- bump github/codeql-action/init from 4.37.0 to 4.37.1
- bump actions/setup-node from 6.4.0 to 7.0.0
- add star CTA to README (#102)
- update changelog and version for v1.5.0 [skip ci] (#97)

### Documentation
- add Benjamin Ayivoh to contributors, convert to grid layout
- add star request to CONTRIBUTING.md
- add Gaohar Imran and Ajay Krishnan to contributors table
- add Yurii201811 to contributors table
- add getting-started, use-cases, and CLI reference pages (#103)
- streamline README for Show HN launch
## [v1.6.0] - 2026-07-20

### Added
- add --json flag to list command (#120)
- add git and npm availability checks
- add skills.sh search with --skills-sh flag (experimental) (#101)
- add convert command for SKILL.md <-> .mdc format conversion (#100)
- add droid, chatgpt, codearts-agent, universal agents (86 total)

### Fixed
- log reinstall failure in watch command
- document install yes flag in help
- resolve CodeQL alerts and flaky ENOTEMPTY tests
- enable docs deployment after release

### Changed
- bump github/codeql-action/analyze from 4.37.0 to 4.37.1 (#115)
- bump github/codeql-action/init from 4.37.0 to 4.37.1
- bump actions/setup-node from 6.4.0 to 7.0.0
- add star CTA to README (#102)
- update changelog and version for v1.5.0 [skip ci] (#97)

### Documentation
- add Benjamin Ayivoh to contributors, convert to grid layout
- add star request to CONTRIBUTING.md
- add Gaohar Imran and Ajay Krishnan to contributors table
- add Yurii201811 to contributors table
- add getting-started, use-cases, and CLI reference pages (#103)
- streamline README for Show HN launch
## [v1.5.0] - 2026-07-15

### Added
- improve UX with dry-run consistency, spinner, and error formatting (#96)
- agent profile system (save, apply, diff, edit, export, import, link) (#89)
- add demo GIF to hero section and show version in site title (#88)
- add benchmark comparison SVG visual with color contrast fixes (#87)

### Fixed
- use full URL for benchmark SVG to prevent VitePress build failure

### Changed
- bump actions/upload-pages-artifact from 3.0.1 to 5.0.0 (#86)
- bump actions/configure-pages from 5.0.0 to 6.0.0 (#85)
- bump actions/deploy-pages from 4.0.5 to 5.0.0 (#84)
- bump github/codeql-action/init from 4.36.3 to 4.37.0 (#83)
- bump github/codeql-action/analyze from 4.36.3 to 4.37.0 (#82)
- update changelog and version for v1.4.0 [skip ci] (#81)

### Documentation
- simplify CONTRIBUTING, move release process to RELEASE.md, add good first issues
- onboarding guide + profile guide + fix dry-run priority and flag ordering (#90)
- update architecture.md with missing commands and utils
- add profile command to sidebar and fix formatting
## [v1.4.0] - 2026-07-10

### Added
- improve README, add GitHub templates, fix CodeQL alert, resolve Dependabot CVEs, 100% watch.js coverage (#74)
- add watch command for auto-syncing skills on file change
- add benchmark to docs site, remove ANALYSIS from sidebar (#72)
- add VitePress docs site with GitHub Pages deploy (#71)
- highlight MCP + Skills as key differentiator in README
- MCP server management for AI agents

### Fixed
- use real user identity for tag signing in release-prep workflow
- use web streams pipeTo for downloadFile to resolve CodeQL http-to-file-access (#79)
- use web streams pipeTo for downloadFile to resolve CodeQL http-to-file-access
- resolve CodeQL alerts — http-to-file-access and log-injection (#78)
- close security vulnerabilities and add watch to comparison (#75)

### Changed
- async/sync cleanup, process.exit removal, magic string dedup (#77)
- centralize agent list into src/agents.js and extend MCP to all 82 agents
- update changelog and version for v1.3.0 [skip ci] (#68)

### Documentation
- deduplicate nav links and add benchmark reference

### Other
- Revert "fix: use web streams pipeTo for downloadFile to resolve CodeQL http-to-file-access"
## [v1.3.0] - 2026-07-07

### Added
- add agents-xml command for AGENTS.md XML generation (#63)
- add 16 new agent targets, surpass Vercel (82 vs 72 agents) (#61)
- add rolecraft doctor command for system health checks (#60)
- add security scoring for installed skills (0-100 static analysis) (#57)
- add npm package source support (npm:package) (#53)

### Fixed
- add missing return after process.exit in frozenLockfile, update, and remove blocks (#66)
- stop after blocked installs (#62)
- support SSH signing in release-prep workflow + update docs (#59)
- preserve GPG signature when release-prep moves tag to changelog commit (#58)
- remove unused mkdirSync import (CodeQL #42) + AGENTS.md merge rule
- use mkdtempSync for npm temp dir (CodeQL insecure-temporary-file)
- resolve CodeQL audit findings and improve test hygiene

### Changed
- release v1.2.0

### Documentation
- improve repo quality - code of conduct, support, benchmark, migration guide (#67)
- reorganize Contributing and Contributors sections in README
- add contributors section to README (#65)
## [v1.2.0] - 2026-07-06

### Added
- add SKILL.md for skills.sh leaderboard visibility (#50)
- add --yes flag, check command, GitLab/SSH URL support, and 20 new agents

### Fixed
- remaining 5 code scanning alerts (unused vars, file-system-race)
- resolve remaining CodeQL alerts
- allow workflow_dispatch in publish job condition
- add workflow_dispatch to release-publish workflow (#43)

### Changed
- improve coverage to 95% - add missing tests, fix coverage config (#46)
- upgrade Node to 24, migrate CodeQL to v4, fix code scanning alerts
- update changelog and version for v1.1.0 [skip ci] (#42)

### Documentation
- add startup checklist to AGENTS.md (#51)
- update AGENTS.md workflow instructions
- add AGENTS.md with development guidelines
## [v1.1.0] - 2026-07-03

### Added
- security hardening - provenance, CodeQL, Dependabot, action pinning, npm audit (#36)
- add rolecraft upgrade self-update command (#35)
- add 13 new agent targets (43 total), update analysis and docs (#34)
- shell completions + interactive TUI search (#32)
- improve repo visibility with demo GIF, badges, and enhanced metadata (#31)

### Fixed
- rolecraft install --help shows help instead of installing; --copy clears previous symlinks (#41)
- copilot path now uses .github/copilot/skills/ + docs update

### Changed
- bump github/codeql-action/init
- bump actions/setup-node from 5.0.0 to 6.4.0
- bump actions/checkout from 5.0.1 to 7.0.0 (#37)
- bump github/codeql-action/analyze
- update changelog and version for v1.0.0 [skip ci] (#30)

### Documentation
- add Product Hunt badge, Node version badge
## [v1.0.0] - 2026-06-27

### Added

- add bundle command with inline sources and bundle create (#26)
- add interactive search mode (--interactive) (#25)
- add --dry-run mode for install and setup commands (#24)
- add 9 new agent targets (roo, trae, hermes, kiro, augment, kilo, openhands, junie, factory) (#23)
- add verify, ci, content hash, symlink mode (#22)
- add init, search, 20 agent targets, frozen-lockfile (#21)

### Changed

- update changelog and version for v0.2.0 [skip ci] (#19)

### Documentation

- restructure README into modular documentation hub (#28)
- update ANALYSIS.md and README.md with accurate competitive data (#27)
- remove test coverage metrics from analysis and update roadmap

### Other

- Bug fixes and improvements for stable release (#29)
- add devin (Devin Desktop) agent target with windsurf backward compat (#20)

## [v0.2.0] - 2026-06-25

### Added

- make project scope default install target
- add rolecraft setup command to detect agents and install
- add rolecraft use command to preview skills without installing
- add windsurf, codex, copilot, aider, cline agent targets

### Changed

- enable npm provenance and add SECURITY.md
- add coverage improvements for install, update, resolver (#13)
- release v0.1.4

### Documentation

- add competitive analysis and roadmap

## [v0.1.4] - 2026-06-25

### Added

- cursor target, update command, project-scoped remove, and more (#11)

### Changed

- release v0.1.3

### Documentation

- add contributing guide and CODEOWNERS (#10)

## [v0.1.3] - 2026-06-21

### Fixed

- remove unnecessary npm install step

### Changed

- release v0.1.2

## [v0.1.2] - 2026-06-20

### Added

- add changelog automation with GitHub Actions
- add version command (version, --version, -v) (#4)

### Fixed

- use pull_request_target and npm install for release-publish
- use echo -e instead of printf for newlines; skip merge commits in changelog
- delete existing branch before creating new one
- restructure release-prep workflow YAML and use PAT_TOKEN
- resolve YAML syntax error in release-prep workflow and fix script for Linux compatibility
- list command now includes project-scoped skills (#3)

### Changed

- release v0.1.1

### Other

- Update README

## [v0.1.1] - 2026-06-20

### Added

- add changelog automation with GitHub Actions
- add version command (version, --version, -v) (#4)

### Fixed

- use echo -e instead of printf for newlines; skip merge commits in changelog
- delete existing branch before creating new one
- restructure release-prep workflow YAML and use PAT_TOKEN
- resolve YAML syntax error in release-prep workflow and fix script for Linux compatibility
- list command now includes project-scoped skills (#3)

### Other

- Update README

## [v0.1.0] - 2026-06-14

### Added

- Initial release with core CLI functionality
- Version command (`version`, `--version`, `-v`)
- List command with project-scoped skills support
- Zero-dependency CLI for opencode, claude-code, cursor, and more
