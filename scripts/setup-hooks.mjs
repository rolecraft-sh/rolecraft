#!/usr/bin/env node
// scripts/setup-hooks.mjs — point git core.hooksPath at the repo-tracked hooks/ dir
// Runs automatically via npm postinstall so every clone gets the hook without
// any manual setup. Zero-dependency, no husky needed.
import { execSync } from 'node:child_process'
import { chmodSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const hooksDir = join(__dirname, '..', 'hooks')

if (!existsSync(hooksDir)) {
  console.error('hooks/ directory not found:', hooksDir)
  process.exit(1)
}

// Make all hooks executable so they actually run
for (const entry of readdirSync(hooksDir)) {
  chmodSync(join(hooksDir, entry), 0o755)
}

// Tell git to use the repo-tracked hooks/ folder instead of .git/hooks
const inGitRepo = (() => {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

if (!inGitRepo) {
  // npm install runs before git init in some workflows; skip silently
  process.exit(0)
}

execSync('git config core.hooksPath hooks', { stdio: 'inherit' })
console.log(
  'git hooks configured: core.hooksPath = hooks (pre-commit runs lint before commit)',
)
