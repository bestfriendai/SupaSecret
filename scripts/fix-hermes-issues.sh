#!/usr/bin/env bash
set -euo pipefail

cat <<'MSG'
[fix-hermes-issues] This helper currently runs no automatic fixes.
Run the following steps manually if you encounter Hermes issues:
  1. Clear caches: rm -rf ios/build android/app/build .expo .expo-shared
  2. Reinstall node modules: rm -rf node_modules && npm install
  3. Regenerate native projects: npx expo prebuild --clean
MSG
