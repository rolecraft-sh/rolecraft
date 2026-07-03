# Changelog

All notable changes to this project will be documented in this file.

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

## [v0.1.0] - 2025-01-01

### Added

- Initial release with core CLI functionality
- Version command (`version`, `--version`, `-v`)
- List command with project-scoped skills support
- Zero-dependency CLI for opencode, claude-code, cursor, and more
