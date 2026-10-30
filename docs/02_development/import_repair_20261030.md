# October 30 import repair and recovery

## Verified failures

Homebase scheduled execution255153 failed at browser launch, before collection:
Chromium crash-handler posix_spawn returned Operation not permitted. Current
collector deployment fffcebad-d93a-4696-b0c3-4c3a420405d8 (PR122) was restarted.
Diagnostic console then connected:58/1000 tasks, PID1 npm start,11 zombies all
parented to PID1, no tini executable. This confirms continuing unreaped-child
accumulation; no pre-restart PID count was available, so exhaustion on Oct30 is
not independently proven. Earlier October12 exhaustion was established separately.

After restart, original-workflow retry256295 reached Homebase but failed waiting
for a password field. All4 saved inputs were independently inspected: account1
organization1, studio2; account2 studio3; account3 studio1; account4 studio4,
October16-29. Public Homebase sign-in now defaults to email-code authentication;
the existing password option remains available. No credential rotation is needed.

## Narrow production change

- Select the visible Sign in with email and password option before entering the
  existing configured credentials. Require password field visibility before any
  submission. Existing signed-in sessions and legacy password form still work.
- Add Ubuntu tini to the existing apt install and set it as PID1 with group
  signal forwarding. Preserve npm start, application root, Railway root, port,
  Xvfb, HOMEBASE_HEADLESS and current Playwright version.
- No database schema, permissions, credential values or recurring workflow edits.

Four regression checks pass against the actual login function: email-code mode,
legacy form, existing session and failed-toggle/no-code-submission behavior.
Full Linux child-reaping and live source acceptance remain deployment checks;
Docker is not installed in the local environment. Migration: build existing
collector Docker image with these two changes and verify PID1, process counts,
login and imports. Rollback: revert the repair PR and redeploy previous image;
preserve all warehouse/import history and original workflow definitions.

## Authorized recovery scope

Keep both PTS owners isolated and all5 configured studios covered. Recover missing
Daily Sales October21/24/29; refresh Class Sales October16-29; recover product
October20/21/23/24/29, validating legitimate empty slices. Homebase rolling
October16-29 restores missing October26-29 for all4 configured studios; Huntington
Beach has no configured Homebase target and must remain unavailable, not zero.
Reconcile fresh source totals with load acknowledgements, reporting views and
duplicate natural-key checks. Do not claim recovery from a job start or empty rows.

Live workflow definitions are exported before recovery. Temporary manual-only
recovery copies must retain source validation, tenant mapping, natural-key loads,
acknowledgement guards and original workflow history. Existing schedules and
unpublished drafts are not to be published as part of backfill.
