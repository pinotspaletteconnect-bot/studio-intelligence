# Eulerity daily import incident — September 30, 2026

The published `24 - Eulerity Vault Daily Import` workflow
(`P3tQUsAYYpL3eEcD`) ran at 5:00 and 9:00 AM America/New_York. Both
executions failed at the Railway collector node. The collector response was
`Invalid date: Aug 28, 2024`, so the workflow never reached its metrics upsert.
The September 29 executions succeeded.

The collector's CSV parser accepted compact and slash-separated numeric dates,
but Eulerity supplied a month-name date. The parser repair adds that format and
validates calendar dates. Focused local tests passed. PR #78 was merged into
Railway's production-connected `codex/auth-onboarding` branch, and the collector
deployment became active on September 30.

The approved manual workflow execution `131024` succeeded at 3:53 PM Eastern.
It processed two Eulerity accounts and five mapped studios, then completed the
metrics upsert with 35 items. A read-only warehouse query confirmed one
September 29 row each for St. Matthews, Short North, Gilbert, Jeffersonville,
and Huntington Beach. Their `updated_at` values were between 19:54:51 and
19:55:00 UTC on September 30; impressions, clicks, and spend were present on
all five rows. The dashboard service also returned to Online after its
automatic build from the same branch.
