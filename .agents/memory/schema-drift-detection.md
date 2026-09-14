---
name: Schema drift detection
description: Why db/schema.sql is versioned and why every phase must regenerate it from the live database.
---

`db/schema.sql` is the schema produced by running every migration against an empty database, versioned so it can be diffed. **Regenerating it from the live database and committing it is a delivery requirement of every phase.**

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges \
  | grep -vE '^\\(restrict|unrestrict)' > db/schema.sql
```

**Why:** `schema_migrations` records only the migration filename, with no checksum, so editing an already-applied migration is skipped in silence and databases diverge without warning. Worse, a change made directly against the database without writing a migration leaves no trace in the repository at all. The failure mode runs in the dangerous direction: the running database carries a column the migrations never create, the application works, the tests pass, and a clean deployment to AWS breaks. The symptom surfaces last.

**How to apply:** the `grep` filter is not optional — `pg_dump` emits a `\restrict` line carrying a fresh random token on every run, which would add noise to every diff. With it the dump is deterministic. If regenerating produces no diff, the live database is exactly what the migrations build. If it produces a diff, that is an out-of-band change, and the missing migration has to be written. Never reconcile it by editing an applied migration; add a new numbered one.

Related: [[fase-1-estado-auditoria]]
