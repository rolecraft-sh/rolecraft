# Changelog

All notable changes to this project will be documented in this file.

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
