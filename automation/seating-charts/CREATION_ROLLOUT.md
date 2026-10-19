# St. Matthews workbook creation - manual rollout

Owner requested creation of St. Matthews files, grouping overlapping classes and
private parties, with scheduled updates OFF until manual testing is complete.
The earlier scoped St. Matthews deployment/database/manual-test approval remains
in effect. No credential changes, paid services or shared scheduler changes.

## Implementation

- Protected `/pts/seating-events` collector reads the all-room/all-party-stage
  monthly calendar, bounded to yesterday through nine days ahead. It resolves
  stable class IDs and independently reads actual class dates, start/end times,
  rooms, type, painting, assigned staff and mapped party fields. Source has no
  warehouse/Google writes. Existing account broker/queue is reused.
- n8n normalizes studio-local timestamps, rejects ambiguous DST times, forms
  connected overlap groups, and creates groups whose first event is within seven
  days. Touching endpoints stay separate. Requested party dates and unpublished
  public drafts are excluded. Unsupported overlapping events hold their group
  for review rather than silently splitting it.
- Manual workflow04 calls saved helper05 for one group at a time;05 calls saved
  helper06 for one class refresh at a time. IDs are recorded in
  `stm-creation-workflows.json`. All triggers are manual/called-only; no schedule or
  webhook. Current test selects931956(today),931957(Tuesday) and931961(Friday),
  retaining the entire overlap group around each selected class.
- Each group gets one native whole-master copy in the studio-owned Seating
  Charts folder. Each public class duplicates its mapped room seating tab; each
  private party duplicates only the party form. Three unused base template tabs
  are hidden, preserving native dependencies, and operational Bar/Checklists stay.
  Additional classes/parties get distinct class-ID tab names/IDs even in one room.
- Only mapped headers/verified party facts are initialized; known template
  sample dates, preparer and two placeholders are replaced/cleared on new forms.
  Private party registration/payment lists, seating, attendance and agreements
  remain manual. Whole-copy formatting, formulas and validation are preserved.
- Three private RLS tables hold studio creation configuration, immutable group
  source/plan/copy state, and unique class-to-workbook/tab mappings. Two service-
  only RPCs guard ownership, leases, connected membership, duplicate copies,
  allowed native tab operations and mapped header writes/readback. Existing
  refresh targets gain a workbook FK and permit only registered creation tabs;
  the original pilot guard remains valid. No existing guest state is rewritten.
- Before `files.copy`, copy-issued state is saved. A lost acknowledgement is
  recovered only through one matching tagged, studio-owned file in the correct
  folder. An uncertain/missing/duplicate copy stops for review. A repeat ready
  group reuses its file. Changed overlap membership/time/title stops for review;
  it never moves/deletes staff work or silently makes another file.
- After verified initialization, public class targets are registered and the
  existing stable-row reservation/staff path fills them. Private parties never
  get reservation targets. Existing source rows, seats, attendance and formulas
  remain protected. The collector room override is allowed only by configured
  studio room IDs; retain Main21 and add KLR22 in the existing nonsecret binding.

## Verification state

88 local checks passed:74 automation and14 collector/route/browser-fixture tests.
The rollback-only SQL trial passed duplicate copy, ownership/folder, protected
cells, overlap membership, native tab operations and completion/readback guards.
Post-rollback checks confirmed the new tables absent and original revision4/nine
guest pilot unchanged. Repaired a CASE-expression delimiter and an ambiguous SQL
alias found by that trial. Migration003 and manual STM settings are now applied;
browser access denied and schedule_enabled=false verified. Original pilot remains separate.

Explicit subsequent owner approval: merge/deploy PR93, apply the staged Main/KLR
room binding and run the manual creation tests; owner also asked for today's
files. PR93 merged as eae6fe18b987cfa7def766d36e8587e19ee1a689. The single
nonsecret room change deployed successfully in31844371-6472-481c-bd7e-92f8d4217aa4.
Native04 created in Seating Charts as Rf2H0au3hRWenZvh, helper05 as
sHhijJbugRZtvVtv, helper06 as7bM6CPBwnpu9estC. 04/05 remain unpublished.
06 is published with only an Execute Workflow input trigger so nested calls are
allowed by n8n2.36.7. It has no schedule/webhook; publication creates no timer.
Live calendar discovery verified the three selected complete groups. Two attempts
stopped at `Record copy request`, before any Drive copy, due to adjacent object
braces colliding with n8n expression delimiters. Corrected those expressions and
added a regression check. Each stopped attempt's exact planned/no-file lease was
released with a guarded SQL update; source/mapping/history were preserved.
The next attempt completed today's native file/header readback, then stopped
because nested helper06 needed publication. No reservation write had started;
the ready workbook had no lease. After enabling the called-only helper, the
manual request was resumed using the existing file. Today and Tuesday then
completed creation plus reservation/staff readback (4/5 guests, no reviews,
T/U/AB unchanged). Friday copied/duplicated its two Main templates, then safely
stopped before header writes because actual class931961 has three Scheduled
On-Call staff. Verified those rows in the actual Pinot class. The second existing
Floor/On-Call label now joins additional names instead of rejecting/truncating
them; roles/statuses and five allowed cells remain unchanged. Targeted19 checks
and all74 automation checks pass. Guarded recovery releases only Friday's exact
structured/file-matched/no-values-plan lease; no file is copied again.
Creation/reservation and repeat-run verification are still in progress.
03 is restored/saved as the read-only creation audit. Do not reapply migration003.

## Rollout and rollback

1. Repair/run `build-creation-rollback-trial.cjs` through the existing03 helper.
   Verify private access, structure/write guards, one public target/no private
   target, duplicate/lease/membership checks, rollback and prior pilot unchanged.
2. Apply migration003 after that trial. Seed `stm-creation-settings.json` with
   manual creation disabled, then enable only the approved manual scope. No
   schema/data deletion; grants for browsers remain denied.
3. Deploy additive collector changes from the actual production branch, retaining
   Railway root/authentication and existing routes. Add nonsecret sourceRoomIds
  21/22 to the existing STM binding. Existing Main requests remain compatible.
4. Save06 and05 in the separate n8n Seating Charts folder, then record their IDs
   in `stm-creation-workflows.json`. Publish only called-only06 for nested calls.
   Generate04 with `node automation/seating-charts/creation-workflow.cjs
   --authorized 931956 931957 931961`, save04 and configure authorized manual
   execution and select the complete Oct20 group (public931957/private936089).
   Verify native file ownership/folder/title, one class tab and one party form,
   mapped facts, formulas/validation, unchanged seating/attendance and stable rows.
5. Repeat the same manual request; verify one file/mapping, unchanged row IDs,
   zero unnecessary writes. Also exercise a two-public-class overlap and a
   private-only group before declaring those paths live-verified.
6. Restore03 to a read-only audit and save evidence/checkpoint. Leave04 and all
   other seating workflows manual/called-only. Scheduled updates stay OFF.

Rollback disables only the creation setting/workflow and the new collector
route if necessary. Preserve files, source snapshots, targets and history;
do not drop tables or delete charts automatically. Unknown copy/write outcomes
require inspecting existing state rather than blindly retrying them.
