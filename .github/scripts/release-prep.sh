#!/usr/bin/env bash
set -euo pipefail

NEW_TAG="${1:?Usage: $0 <new_tag>}"
NEW_VERSION="${NEW_TAG#v}"

PREVIOUS_TAG=$(git tag --sort=-creatordate | sed -n '2p')

if [ -z "$PREVIOUS_TAG" ]; then
  PREVIOUS_TAG=""
fi

echo "Previous tag: $PREVIOUS_TAG"
echo "Current tag:  $NEW_TAG"

if [ -n "$PREVIOUS_TAG" ]; then
  LOG_RANGE=("$PREVIOUS_TAG..$NEW_TAG")
else
  LOG_RANGE=("$NEW_TAG")
fi

# sha <TAB> author email <TAB> subject
COMMITS=$(git log "${LOG_RANGE[@]}" --no-merges --format='%h%x09%aE%x09%s' 2>/dev/null || true)

# ---------------------------------------------------------------------------
# Contributor attribution
#
# GitHub renders a Contributors section with an avatar list from the @mentions
# in a release body, so crediting each entry with its author is what actually
# surfaces contributors on the release page. Without a mention the section
# simply does not render.
#
# Bots are skipped: a Dependabot bump is not a contribution, and listing one
# avatar next to a human's reads as noise.
# ---------------------------------------------------------------------------

REPO="${GITHUB_REPOSITORY:-$(git config --get remote.origin.url | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+).*#\1#')}"
LOGIN_CACHE=$(mktemp)
trap 'rm -f "$LOGIN_CACHE"' EXIT

# GitHub logins are not in the commit message, so recover them from the author
# email where possible and only fall back to the API for real addresses.
# Results are cached because a release repeats the same author many times.
resolve_login() {
  local email="$1" sha="$2"

  local cached
  cached=$(grep -F "$email" "$LOGIN_CACHE" 2>/dev/null | head -1 | cut -f2)
  if [ -n "$cached" ]; then
    printf '%s' "$cached"
    return
  fi

  local login=""
  if [[ "$email" =~ ^[0-9]+\+([A-Za-z0-9_-]+(\[[a-z]+\])?)@users\.noreply\.github\.com$ ]]; then
    # `12345+login@users.noreply.github.com` carries the login inline. The
    # optional `[bot]` suffix is matched here rather than left to the API so a
    # bot is recognised without a network round-trip.
    login="${BASH_REMATCH[1]}"
  elif [[ "$email" =~ ^([A-Za-z0-9_-]+(\[[a-z]+\])?)@users\.noreply\.github\.com$ ]]; then
    login="${BASH_REMATCH[1]}"
  elif [ -n "$REPO" ]; then
    # `gh api` prints its error body to stdout, so a failed lookup has to clear
    # the variable rather than let the JSON become the login.
    login=$(gh api "repos/$REPO/commits/$sha" --jq '.author.login // empty' 2>/dev/null) || login=""
  fi

  if [ -n "$login" ]; then
    printf '%s\t%s\n' "$email" "$login" >> "$LOGIN_CACHE"
  fi

  printf '%s' "$login"
}

# " by @login", or empty when the author is a bot or unresolvable.
attribution() {
  local email="$1" sha="$2" login

  login=$(resolve_login "$email" "$sha")
  [ -z "$login" ] && return 0

  case "$login" in
  *"[bot]"*) return 0 ;;
  esac

  printf ' by @%s' "$login"
}

# " in [#123](url)", or empty when the subject names no PR.
pr_credit() {
  local msg="$1"

  [[ "$msg" =~ \(#([0-9]+)\) ]] || return 0
  printf ' in [#%s](https://github.com/%s/pull/%s)' "${BASH_REMATCH[1]}" "$REPO" "${BASH_REMATCH[1]}"
}

DATE=$(date +%Y-%m-%d)

ADDED=""
FIXED=""
CHANGED=""
REMOVED=""
DOCS=""
OTHER=""

while IFS=$'\t' read -r SHA EMAIL MSG; do
  [ -z "$MSG" ] && continue

  CREDITS="$(attribution "$EMAIL" "$SHA")$(pr_credit "$MSG")"

  # The PR is credited once, at the end of the line, so the reference the
  # subject already carries is dropped from the line itself.
  # `[[:space:]]` rather than `\s`, which BSD sed does not support and which
  # would leave a stray leading space on macOS runners.
  CLEAN=$(echo "$MSG" | sed -E 's/^[^:]*:[[:space:]]*//; s/ \(#[0-9]+\)$//')

  if echo "$MSG" | grep -qiE '^(feat|feature)(\(.*\))?:' || echo "$MSG" | grep -qiE '^added'; then
    ADDED="$ADDED\n- $CLEAN$CREDITS"
  elif echo "$MSG" | grep -qiE '^fix(\(.*\))?:' || echo "$MSG" | grep -qiE '^fixed'; then
    FIXED="$FIXED\n- $CLEAN$CREDITS"
  elif echo "$MSG" | grep -qiE '^docs?(\(.*\))?:'; then
    DOCS="$DOCS\n- $CLEAN$CREDITS"
  elif echo "$MSG" | grep -qiE '^(chore|refactor|perf|test|ci|style)(\(.*\))?:'; then
    CHANGED="$CHANGED\n- $CLEAN$CREDITS"
  else
    # Uncategorized entries keep their whole subject rather than dropping the
    # conventional-commit prefix, so the PR reference is stripped here too or
    # the same number ends up on the line twice.
    FULL=$(echo "$MSG" | sed -E 's/ \(#[0-9]+\)$//')
    OTHER="$OTHER\n- $FULL$CREDITS"
  fi
done <<< "$COMMITS"

CONTENT="## [$NEW_TAG] - $DATE"

if [ -n "$ADDED" ]; then
  CONTENT="$CONTENT\n\n### Added"
  CONTENT="$CONTENT$ADDED"
fi

if [ -n "$FIXED" ]; then
  CONTENT="$CONTENT\n\n### Fixed"
  CONTENT="$CONTENT$FIXED"
fi

if [ -n "$CHANGED" ]; then
  CONTENT="$CONTENT\n\n### Changed"
  CONTENT="$CONTENT$CHANGED"
fi

if [ -n "$DOCS" ]; then
  CONTENT="$CONTENT\n\n### Documentation"
  CONTENT="$CONTENT$DOCS"
fi

if [ -n "$REMOVED" ]; then
  CONTENT="$CONTENT\n\n### Removed"
  CONTENT="$CONTENT$REMOVED"
fi

if [ -n "$OTHER" ]; then
  CONTENT="$CONTENT\n\n### Other"
  CONTENT="$CONTENT$OTHER"
fi

if [ -f CHANGELOG.md ]; then
  FIRST_ENTRY_LINE=$(grep -n '^## \[' CHANGELOG.md | head -1 | cut -d: -f1)
  if [ -n "$FIRST_ENTRY_LINE" ]; then
    HEADER=$(head -n $((FIRST_ENTRY_LINE - 1)) CHANGELOG.md)
    REST=$(tail -n +"$FIRST_ENTRY_LINE" CHANGELOG.md)
    echo -e "$HEADER\n\n$CONTENT\n$REST" > CHANGELOG.md
  else
    echo -e "\n$CONTENT" >> CHANGELOG.md
  fi
else
  echo -e "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n$CONTENT" > CHANGELOG.md
fi

if [ -f package.json ]; then
  if command -v jq &>/dev/null; then
    jq --arg ver "$NEW_VERSION" '.version = $ver' package.json > package.json.tmp && mv package.json.tmp package.json
  else
    node -e "
      const pkg = require('./package.json');
      pkg.version = process.argv[1];
      require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
    " "$NEW_VERSION"
  fi
fi

echo "Changelog prepared for $NEW_TAG"
