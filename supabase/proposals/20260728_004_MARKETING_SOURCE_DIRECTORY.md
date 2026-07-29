# Marketing source directory rollout

## Purpose

Keep complete GA4 source/medium history while presenting a useful marketing
dashboard across hundreds of studios.

## Reporting behavior

- Paid traffic, Google Organic, Direct, and all recognized social platforms are
  featured.
- Facebook Organic and Instagram Organic are reported separately.
- Meta Paid and Eulerity are reported separately.
- Approved tourism and community partners are featured.
- Unapproved referral traffic is retained but combined into `Other Referrals`.
- Other unknown traffic is retained in the warehouse and hidden from the main
  dashboard until it is classified.

## Scope precedence

The directory supports global, organization, brand, and studio entries. The
most specific active entry wins:

`studio → brand → organization → global → automatic fallback`

## Migration

Apply `20260728213000_marketing_reporting_directory.sql`.

The migration is additive. It creates `marketing_reporting_sources`, seeds
known global classifications, and replaces the existing reporting view without
changing `marketing_attribution_daily`.

Applied successfully on July 28, 2026.

## Validation

1. Confirm raw attribution row counts are unchanged.
2. Confirm every reporting-view row has a visibility and reporting group.
3. Confirm Facebook Organic and Instagram Organic are separate.
4. Confirm all paid rows are featured.
5. Confirm unknown referrals roll into `Other Referrals`.
6. Test global, brand, and studio precedence with temporary transaction-scoped
   records.
7. Verify a studio-scoped dashboard query returns no other studio's facts.

Production verification for Studio 1 found 156 raw fact rows and 156 reporting
view rows, 23 Facebook Organic rows, 5 Instagram Organic rows, zero paid rows
outside `Featured`, and zero rows missing governance fields.

## Rollback

Drop `marketing_reporting_sources`, then reapply
`20260728200000_ga4_source_medium_reporting.sql` to restore the earlier view.
Raw attribution facts require no rollback.
