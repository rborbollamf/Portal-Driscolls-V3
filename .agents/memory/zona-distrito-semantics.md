---
name: Zona and distrito semantics
description: Records the unresolved business distinction between producer zona and imported distrito.
---

Producer listings and filters must use `distrito`, because it is the operational value supplied by the producer workbook. Do not infer a macrorregión from it or treat the duplicated `zona` value as an approved mapping.

**Why:** Historical records use `zona` as a macrorregión, while imported records currently copy Distrito into both fields to satisfy the legacy non-null constraint. The official Distrito → Zona relationship has not been defined.

**How to apply:** Keep district-driven filtering and facets. Any normalization, backfill, mapping table, or removal of `zona` requires an explicit business decision first.