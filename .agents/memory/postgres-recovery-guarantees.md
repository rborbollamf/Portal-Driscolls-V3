---
name: PostgreSQL recovery guarantees
description: Consistency and safety rules for the portal's PostgreSQL migrations, backups, and recovery tools.
---

Database backups must be read from a single repeatable-read transaction, and a restored backup must be validated against its full canonical content rather than record counts alone.

**Why:** Independent reads can mix committed states during concurrent writes; equal counts do not prove the restored records are the intended ones.

**How to apply:** Keep any future collection added to the backup in the same consistent snapshot and include it in canonical restore verification.

Migration execution and every destructive import or restore must be serialized or explicitly safeguarded.

**Why:** Concurrent migration workers can race on migration state, while an unguarded restore or seed can replace durable records with historical data.

**How to apply:** Use the database migration lock for schema changes; require affirmative confirmation and reject direct data replacement in production.