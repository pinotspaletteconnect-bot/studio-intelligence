# Eulerity comparison release — September 19, 2026

Release from `codex/eulerity-production` into Railway's existing
`codex/auth-onboarding` branch. The user authorized production deployment in
this task. This supersedes `codex/eulerity-studio-comparison`, which was based
on the older root checkout and must not be merged into production directly.

The page at `/marketing/eulerity` compares spend, spend share, impressions,
clicks, CTR, and CPC across authorized active studios for shared dates.
Same-channel peer CPC excludes the current studio and uses combined peer
spend divided by combined clicks. Only complete periods with known spend and
positive clicks qualify. Peer costs are references, not agreed targets.
Studio totals also show GA4 revenue attributed to Eulerity paid traffic over
the selected dates, and ROAS as total attributed revenue divided by total spend.
No attribution is allocated to channels. Missing attribution stays unavailable;
ROAS requires positive spend and complete spend-date coverage. This is
attributed revenue, not all studio sales or a claim of incremental sales.

The new read-only endpoint uses existing authenticated organization/studio
access, scopes both queries, paginates results, and returns private/no-store.
No authentication, schema, collector, workflow, or infrastructure changes.

Validation: 36 automated tests; lint and full production build; opt-in live
30-day reconciliation of total and channel spend with the existing report.
Production verification pending release.

Rollback: revert this feature's merge commit on `codex/auth-onboarding`; no
database rollback is required. Prior dashboard revision: `3bbdf7c`.
