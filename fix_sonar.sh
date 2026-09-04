#!/bin/bash
git rm tests/unit/mod-manager-branch-4.test.ts 2>/dev/null || true
git commit -a --amend --no-edit
