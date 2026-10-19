# St. Matthews workbook creation - verified manual rollout

Owner approved PR93 merge/deployment, Main/KLR binding, database changes and
manual creation tests for today, Tuesday's staggered class/private party, and
Friday's two classes. Scheduled updates remain OFF. Other studios are unbound.

## Verified native files

| Date | Actual events | Imported class reservations | Native file |
| --- | --- | --- | --- |
| Oct19 | 931956 Thicc Boo-ty, Main6:30-8:30PM | 4 | https://docs.google.com/spreadsheets/d/1UQzMpm6XIHbU7A41V31RDNOA_jiB5Te8Eq1ITbAUXVY/edit |
| Oct20 | 936089 Strolling with My Boo PP, KLR6-8PM;931957 Bitten, Main6:30-8:30PM | 5; party form only | https://docs.google.com/spreadsheets/d/1vkA2BaSFy3yx5UPZ_PB_3wEB4K5HsEPKohmgDVAQJ3Q/edit |
| Oct23 | 931961 Spooky Gnome and931962 Van Gogh's Starry Night-Halloween, both7-9PM | 0 /17 | https://docs.google.com/spreadsheets/d/1RTRvFZ8FO4a2ndWxpT0KCytd6YHAMoXHZSKin0QMY6o/edit |

All native IDs/URLs/tabs were read back through Google metadata. Both Friday
classes currently have Main room21 in Pinot Admin; use those actual source room
labels, never infer KLR. Each event has its own deterministic class-ID tab even
when room/start time match. Tuesday's party has only an information form and no
seating/refresh target. All seven mapped facts passed readback, including its
actual14-18 expected headcount and payment arrangement; no agreements guessed.

Warehouse verification: 3 ready workbooks,5 unique event mappings,4 public
refresh targets, no private target, all revision2/no leases. Complete/repeat
source counts4/5/0/17, stable reservation rows, no reviews, verified staff and
unchanged T seating, U formulas, AB attendance. Latest runs170060/170062/170097/
170096 respectively wrote0 ranges. The original Oct18 pilot remains revision4,
nine guests/no lease. No master or existing seating/attendance values were changed.

## Deployment and native workflow references

- PR93 merged as eae6fe18b987cfa7def766d36e8587e19ee1a689; collector deployment
  31844371-6472-481c-bd7e-92f8d4217aa4 verified active. Only the existing nonsecret
  STM binding gained Main21/KLR22 sourceRoomIds. Root/auth/broker/queue unchanged.
- Migration003 applied after rollback/access/duplicate/protected-write checks.
  Creation config enabled for manual STM; schedule_enabled=false is constrained.
- Dedicated n8n Seating Charts folder qTZHROLCyM8hRNob contains00-06 only.
  03 read-only audit: hVfq61G6UAg7udZU;04 manual entry:32VYzTjZNo1cY6Zj;
  05 workbook helper:MCK8as1xFrAc8SaN;06 refresh helper:2T7XR2idkCmpE5dc.
- 06 is published solely for nested Execute Workflow calls. It has no scheduler
  or webhook. All other entries are manual/called-only and unpublished. Native06
  failed/success/manual execution retention is disabled;04/05 manual test
  execution data uses private instance defaults. No public reporting grants.
- Clean native canvases verified:04 has8 nodes,05 has32,06 has20,03 has2.
  Final04 saved selector was reloaded/read back as931956/931957/931961. An extra
  combined rerun was stopped by automatic input review when old Friday-only
  output remained visible. Saved inputs were subsequently verified; no extra
  combined execution was needed after all four repeat checks passed.
- Runtime fixes/source artifacts and evidence are recorded in follow-up PR94.
  `stm-creation-workflows.json` stores nonsecret IDs. Generate with
  `node automation/seating-charts/creation-workflow.cjs --authorized 931956 931957 931961`.
  Paste into an EMPTY canvas only; verify native node counts after save. A canvas
  paste adds nodes rather than replacing a workflow and does not apply settings.

## Source, grouping and write boundaries

The protected collector discovers actual all-room calendar IDs and independently
reads class dates/times/room/type/painting/assigned staff and party facts. It has
no Google or warehouse writes. n8n normalizes studio-local instants (DST guards),
combines connected overlaps even with different starts, and creates groups whose
first event is within7 days. Endpoint-touching events stay separate. Requested
party dates/unpublished public drafts are excluded; unsupported overlapping
events hold their group for review. Current types100/200 and rooms21/22 only.

Each group gets one native studio master copy in its studio-owned folder. Public
classes duplicate their mapped seating base, private parties only the party form.
Three base templates are hidden; Bar/Opening/Closing tabs and native dependencies
remain. RAW initialization is restricted to mapped headers/party anchors. Whole
T:AC1000 is verified unchanged before reservation import; subsequent imports
allow only V:AA/AC and five protected-by-ledger staff labels. No U/T/AB writes.

Private configuration/workbook/event tables and service-only RPCs enforce studio
ownership, immutable connected membership/plan, unique class mappings, copy-issued
state before Drive copy, one tagged-copy recovery, allowed tab operations and
write/readback gates. Changed existing membership/time/title needs review; never
move/delete staff work or blindly issue another copy. Public reservations keep
stable actual seat-ID row ledgers; blank guest names use purchaser-first-name +
"'s guest". No private party reservation collection/target is created.

Actual class931961 has three Scheduled On-Call staff. Additional Floor/On-Call
names share the second existing field, retaining every person and role/status.
Native readback confirmed Haleigh plus Sara/Kit in On-Call, and Rachael on Floor;
no scheduled Stage instructor is invented. Manual staff edits/formulas survive.

## Test and recovery audit

88 local checks pass:74 automation and14 collector/route/browser-fixture checks.
The live rollback trial covered ownership/folder, copy/lease/replay/membership,
native structure, mapped write allowlists, T/U/AB rejection and completion gates.
Native files and all four actual class refreshes additionally passed repeat
checks. Isolated synthetic tests from the original pilot exercise changed/new
reservations and guest labels without touching staff seating/attendance.

Early attempts stopped before Drive copy on adjacent JSON object braces colliding
with n8n expression delimiters. Fixed expressions and added regression coverage.
Guarded planned/no-file lease recovery preserved source/mapping/history. A later
Friday attempt stopped before header writes on the three-on-call limit; recovered
only the exact structured/file-matched/no-values-plan lease after fixing display.

An older published06 draft still contained the prior limit. Replaced workflows
with clean canvases and archived retired03/04/05/06 drafts (EQAXEtyVz6PdtSsD,
Rf2H0au3hRWenZvh,sHhijJbugRZtvVtv,7bM6CPBwnpu9estC). Failed zero-class run170065
had no staged plan/writes. The failure RPC first cleared its lease; after review,
a guarded transition restored claimed status. A one-time21-node manual recovery
compared fresh normalized source facts to the unchanged stored snapshot using
recursive key ordering, then resumed/staged/read back/completed that same run.
Both JSON-key reorder and actual-fact-change guards were tested. Native recovery
qSbkzl79mpY3uKRb passed in23.13s. The earlier comparison-only draft GgemNKmHBBq6fsCZ
and completed recovery are archived, preserving history. No data/files deleted.

Contact-free proof is saved under the main workspace output/seating-charts/:
`stm-creation-final-audit.json`, `stm-shared-class-party-created.png`, and the
rollback proof `stm-creation-database-rollback.png`.

## Remaining rollout and rollback

Owner review of these files comes next. Overnight/relative dispatch scheduling,
private-only live-file testing and other studios remain future work; local
private-only tests pass but no standalone private-party file was live-tested.
No recurring trigger exists. Agree the overnight time and approve the scheduler
rollout/migration before activation. Do not reapply migration003.

Rollback disables only creation/manual invocation and unpublishes called-only06
if needed. Preserve files, source snapshots, targets and history. Uncertain
copy/write outcomes require inspecting existing state, never blind retry or
schema/file deletion. Database03 remains a read-only audit.
