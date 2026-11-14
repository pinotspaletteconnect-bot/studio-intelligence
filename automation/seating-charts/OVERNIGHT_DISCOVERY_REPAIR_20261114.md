# Overnight event discovery repair, November 14, 2026

## Verified fault
Railway deployment 8cbafba1 uses commit bcad6f28f341ddbd424d0ae3f741fb51abebfd16. Gilbert discovery execution 366284 failed at calendar-before on November 14 at 09:00 UTC. The live Admin calendar renders unpublished private party 948344 on November 14 and 15; its detail page identifies November 14, 10:30 PM to 12:30 AM. Existing readCalendar rejects the second segment with Class dates conflict. No future Gilbert workbook events were registered when audited at 15:33 UTC. The source calendar contained 24 segments in the November 14-20 window.

## Scope and migration
Only shared read-only event-discovery code changes. Group rendered segments by stable class ID; independently verify actual class date and overnight times before accepting adjacent-date duplicates. Continue rejecting inconsistent dates, identities, metadata, and incomplete source reads. Exclude yesterday's continuation from today's creation window. No changes to source events, database schema, saved credentials, chart writers, seating, roster ownership, or manual cells. All studios use this collector.

Deploy through the existing codex/auth-onboarding branch and Railway pipeline. Confirm the expected commit is active. Run bounded read-only discovery first via existing n8n credential if needed, then one Gilbert discovery recovery using normal new-only planning, checking existing workbook identities first. Never delete/recreate or overwrite staff-edited charts. Verify fresh target registrations and roster/product readbacks, then compare other studio discovery outcomes.

## Rollback
Revert only this repair commit on the deployed branch and allow the existing Railway pipeline to deploy the revert. No data migration to roll back. If discovery or identity checks fail, stop recovery; leave existing charts and uncertain runs untouched. Rollback does not remove any safely-created chart or registration.

## Verification
Focused helper tests and browser-backed discovery regressions must pass before deployment. Test overnight, ordinary, empty, duplicate, conflicting, date-boundary and all-studio cases. Production verification remains pending until separately recorded.
