# GoHighLevel GA4 breakout - October 23, 2026

Dedicated panel in the existing GA4 North America dashboard, shared by
Operations and Marketing. Uses authorized studio/date filters, totals sessions,
new users, key events and revenue, and lists every medium for exact
case-insensitive source `gohighlevel`. Explicit no-data-yet state for the new
source. Source breakdowns paginate fully so low-volume traffic is not lost to
the API row cap or top-15 acquisition list.

No schema, workflow, authentication, or infrastructure changes. Nine GA4 tests
and lint passed. User authorized production deployment on October 23.
Release base: production branch codex/auth-onboarding at 4672160.
Previous active dashboard deployment: 1bf6bf19-f08f-41bb-94c7-c532b456d185.
Rollback: revert this release on the same branch or restore that deployment.
