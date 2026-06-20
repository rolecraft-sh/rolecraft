#!/usr/bin/env bash
set -euo pipefail

# Usage: ./release-prep.sh <new_tag>
# Example: ./release-prep.sh v0.2.0

NEW_TAG="${1:?Usage: $0 <new_tag>}"
NEW_VERSION="${NEW_TAG#v}" # Remove leading 'v' for package.json

# Get the previous tag (second latest)
PREVIOUS_TAG=$(git tag --sort=-creatordate | sed -n '2p')

if [ -z "$PREVIOUS_TAG" ]; then
  echo "No previous tag found. Using initial state."
  PREVIOUS_TAG=""
fi

echo "Previous tag: $PREVIOUS_TAG"
echo "Current tag:  $NEW_TAG"

# Extract commits between tags
if [ -n "$PREVIOUS_TAG" ]; then
  COMMITS=$(git log "$PREVIOUS_TAG..$NEW_TAG" --oneline --no-decorate 2>/dev/null || true)
else
  COMMITS=$(git log --oneline --no-decorate "$NEW_TAG" 2>/dev/null || true)
fi

if [ -z "$COMMITS" ]; then
  echo "No commits found between $PREVIOUS_TAG and $NEW_TAG"
  COMMITS=""
fi

# Generate changelog entry date
DATE=$(date +%Y-%m-%d)

# Build the new changelog section
CHANGELOG_ENTRY="## [$NEW_TAG] - $DATE"

# Categorize commits
ADDED=""
FIXED=""
CHANGED=""
REMOVED=""
DOCS=""
OTHER=""

while IFS= read -r line; do
  [ -z "$line" ] && continue
  # Remove the leading hash (commit hash) and space
  MSG=$(echo "$line" | sed 's/^[a-f0-9]\{7,\} //')

  if echo "$MSG" | grep -qiE '^(feat|feature)(\(.*\))?:' || echo "$MSG" | grep -qiE '^added'; then
    CLEAN=$(echo "$MSG" | sed -E 's/^[^:]*:\s*//')
    ADDED="$ADDED\n- $CLEAN"
  elif echo "$MSG" | grep -qiE '^fix(\(.*\))?:' || echo "$MSG" | grep -qiE '^fixed'; then
    CLEAN=$(echo "$MSG" | sed -E 's/^[^:]*:\s*//')
    FIXED="$FIXED\n- $CLEAN"
  elif echo "$MSG" | grep -qiE '^docs?(\(.*\))?:'; then
    CLEAN=$(echo "$MSG" | sed -E 's/^[^:]*:\s*//')
    DOCS="$DOCS\n- $CLEAN"
  elif echo "$MSG" | grep -qiE '^(chore|refactor|perf|test|ci|style)(\(.*\))?:'; then
    CLEAN=$(echo "$MSG" | sed -E 's/^[^:]*:\s*//')
    CHANGED="$CHANGED\n- $CLEAN"
  else
    OTHER="$OTHER\n- $MSG"
  fi
done <<< "$COMMITS"

# Build the entry content
CONTENT="$CHANGELOG_ENTRY"

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

CONTENT="$CONTENT\n"

# Prepend to CHANGELOG.md
if [ -f CHANGELOG.md ]; then
  # Find the line number of the first occurrence of "## [" or "# Changelog"
  # Insert after the header (after the first line that starts with "# ")
  HEADER_LINE=$(grep -n '^# ' CHANGELOG.md | head -1 | cut -d: -f1)
  if [ -n "$HEADER_LINE" ]; then
    # Insert after the header line
    sed -i '' "${HEADER_LINE}a\\
\\
${CONTENT}" CHANGELOG.md
  else
    # No header found, prepend
    TEMP=$(mktemp)
    printf "%s\n\n%s" "$CONTENT" "$(cat CHANGELOG.md)" > "$TEMP"
    mv "$TEMP" CHANGELOG.md
  fi
else
  echo -e "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n$CONTENT" > CHANGELOG.md
fi

# Update version in package.json
if [ -f package.json ]; then
  if command -v jq &>/dev/null; then
    jq --arg ver "$NEW_VERSION" '.version = $ver' package.json > package.json.tmp && mv package.json.tmp package.json
  else
    # Fallback: use sed
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
  fi
  echo "Updated package.json version to $NEW_VERSION"
else
  echo "Warning: package.json not found"
fi

echo "Changelog prepared for $NEW_TAG"
