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
- Manual workflow04 uses inline sub-workflows for one group at a time and one
  class refresh at a time. All triggers are manual/called-only; no schedule or
  webhook. The first test selects class931957 but keeps its entire overlap group.
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

86 local checks passed:72 automation and14 collector/route/browser-fixture tests.
The rollback-only SQL trial passed duplicate copy, ownership/folder, protected
cells, overlap membership, native tab operations and completion/readback guards.
Post-rollback checks confirmed the new tables absent and original revision4/nine
guest pilot unchanged. Repaired a CASE-expression delimiter and an ambiguous SQL
alias found by that trial. Migration003 and manual STM settings are now applied;
browser access denied and schedule_enabled=false verified. No new files or
production collector deployment is yet verified. Original pilot remains separate.

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
4. Save04 in the separate n8n Seating Charts folder. Configure authorized manual
   execution and select the complete Oct20 group (public931957/private936089).
   Verify native file ownership/folder/title, one class tab and one party form,
   mapped facts, formulas/validation, unchanged seating/attendance and stable rows.
5. Repeat the same manual request; verify one file/mapping, unchanged row IDs,
   zero unnecessary writes. Also exercise a two-public-class overlap and a
   private-only group before declaring those paths live-verified.
6. Restore03 to a read-only audit and save evidence/checkpoint. Leave04 and all
   other seating workflows unpublished/manual-only. Scheduled updates stay OFF.

Rollback disables only the creation setting/workflow and the new collector
route if necessary. Preserve files, source snapshots, targets and history;
do not drop tables or delete charts automatically. Unknown copy/write outcomes
require inspecting existing state rather than blindly retrying them.
