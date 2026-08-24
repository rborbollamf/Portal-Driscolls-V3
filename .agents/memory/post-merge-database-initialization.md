---
name: Post-merge database initialization
description: Durable operating rules for the portal’s automatic setup after task merges.
---

The post-merge setup must install the locked dependencies, apply transactional migrations, and initialize the local development dataset only when the database is completely empty. It must never import or replace data in production.

**Why:** A database schema without the initial development records makes the portal unusable (including authentication), while repeated imports or imports against production can overwrite durable data. Package security policy can reject outdated locked dependencies, so dependency upgrades should fix the direct parents instead of bypassing installation.

**How to apply:** Keep the hook idempotent: migrations may run every time; the development import must be gated by a complete-record-count check and `NODE_ENV`; use the ordinary package registry path after keeping direct dependencies current.