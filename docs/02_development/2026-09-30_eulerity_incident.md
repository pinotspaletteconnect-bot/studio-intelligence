# Eulerity daily import incident — September 30, 2026

The published `24 - Eulerity Vault Daily Import` workflow
(`P3tQUsAYYpL3eEcD`) ran at 5:00 and 9:00 AM America/New_York. Both
executions failed at the Railway collector node. The collector response was
`Invalid date: Aug 28, 2024`, so the workflow never reached its metrics upsert.
The September 29 executions succeeded.

The collector's CSV parser accepted compact and slash-separated numeric dates,
but Eulerity supplied a month-name date. The parser repair adds that format and
validates calendar dates. Focused local tests pass. Production deployment and a
controlled rerun remain pending approval. September 29 warehouse row freshness
has not yet been independently verified.
