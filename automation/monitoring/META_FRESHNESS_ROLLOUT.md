# Facebook reporting email alerts — active

Owner approved activation, both error-handler assignments, and one test email on October 14, 2026. Production workflow K0OJ1cak3dwlKyiI (Facebook Reporting Health — Production Email Alerts) is published. The older preparation draft 7VU8y1CDikjWqvMP remains unpublished and is not used by either import.

## Verified behavior

- One daily schedule, 06:00 America/New_York. Next scheduled check: October 15, 2026, 06:00 Eastern. This future automatic execution is not yet observed.
- Immediate import-failure routing from 27 - Meta Paid Vault Daily Import (z5Mww3blBHS89UYu) and 28 - Meta Pages Vault Daily Import (7OMm5L5fprv3Lh5o). Fresh exports confirm both settings.errorWorkflow references point to K0OJ1cak3dwlKyiI. Both imports remain published; their nodes, connections, and schedules match the prior backups exactly.
- Configuration-derived active asset/studio mappings. Previous-day source records are checked against warehouse records, including missing/partial loads, source/token failures, duplicates, invalid values, and incomplete query results. Verified zero-ad delivery and explicit zero Page values remain healthy.
- Warning seven days before credential expiration; deduplicated unchanged incidents and one recovery notification after problems clear. Notification state changes only after Microsoft accepts the email. Manual/editor/unknown modes cannot email or persist notification state.
- Existing Jeff.Duff Microsoft Outlook connection sends to jeff.duff@pinotspalette.com. No new credentials, warehouse/schema changes, source spending changes, or collector/dashboard deployment.

## Verification

Twelve focused offline checks pass. The clean production definition contains exactly 17 unique nodes, one schedule, and both production-only mail guards; its timezone is explicitly configured. Its pre-publication live preview found all four studios healthy, action quiet, preview true, and emailSent false.

The old draft import had duplicated branches, so activation used a clean blank workflow imported once. The duplicate draft remains unpublished. No bulk deletion occurred. Production source backup is meta-freshness-workflow.json, with active false intentionally retained for safe import into a blank draft.

Exactly one approved delivery-test POST was sent at 14:35:58 Eastern. Microsoft returned HTTP 202 Accepted. All subsequent receipt checks were GET-only. The exact-subject mailbox lookup found a sent copy and a distinct received copy at 14:36:00 Eastern addressed to Jeff.Duff@pinotspalette.com; a folder-ID lookup confirmed that received copy resides in Inbox. Initial well-known Inbox queries returned no match, so receipt was verified through the exact message's parentFolderId instead. Test subject: SASHA Facebook alert delivery test 20261014.

Alert decision branches and deduplication are covered by offline tests; no real Facebook import was deliberately failed to test the handler. n8n static data persists on successful active production executions. The daily check is read-only apart from notification state and owner emails. This monitor cannot independently alert if all of n8n is unavailable.

## Rollback

Unpublish K0OJ1cak3dwlKyiI and remove only its two error-workflow references. Preserve import logic, schedules, historical data, and credentials. No database migration is required.
