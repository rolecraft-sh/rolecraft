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
  COMMITS=$(git log "$PREVIOUS_TAG..$NEW_TAG" --oneline --no-decorate --no-merges 2>/dev/null || true)
else
  COMMITS=$(git log --oneline --no-decorate --no-merges "$NEW_TAG" 2>/dev/null || true)
fi

DATE=$(date +%Y-%m-%d)

ADDED=""
FIXED=""
CHANGED=""
REMOVED=""
DOCS=""
OTHER=""

while IFS= read -r line; do
  [ -z "$line" ] && continue
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
      pkg.version = '$NEW_VERSION';
      require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
  fi
fi

echo "Changelog prepared for $NEW_TAG"
