#!/bin/bash
# push-portraits.sh
# Commits and pushes any new/untracked portrait images in public/portraits/
# Usage: ./push-portraits.sh

cd "$(dirname "$0")"

new=$(git ls-files --others --exclude-standard public/portraits/)

if [ -z "$new" ]; then
  echo "No new portrait files to push."
  exit 0
fi

echo "New portraits found:"
echo "$new"

git add public/portraits/
git commit -m "chore: add portrait images

$(echo "$new" | sed 's/^/- /')

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin main
echo "Done. Vercel will deploy in ~1-2 minutes."
