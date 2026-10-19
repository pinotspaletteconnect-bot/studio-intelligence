# Seating chart automation

October 19, 2026. St. Matthews schedules are ON after deployment and a successful
combined pilot. Automatic refreshes added two new Friday Main guests while
preserving seats, formulas and attendance. See [SCHEDULE_ROLLOUT.md](SCHEDULE_ROLLOUT.md)
for timing, audit evidence, the isolated room-change hold and discovery status.
Other studios remain off and unbound pending separate connections/layout tests.

The separate n8n **Seating Charts** folder contains the dedicated workflows:
https://primary-production-a88c.up.railway.app/projects/YRdV58D9glyGcjK9/folders/qTZHROLCyM8hRNob/workflows

- 00: read-only Google connection check; 01: isolated preservation test.
- 02: original manual reservation/staff pilot; 03: read-only creation audit.
- 04: manual discovery/group creation; 05: saved single-workbook helper;
  06: saved registered-class reservation/staff helper.
- 07: manual product refresh;08: called-only product helper;09: combined class
  refresh (06 then08), now called by05 and10.
- 10: published STM minute dispatcher; seven-day discovery, overnight and class
  milestones. Only private due work can call the protected helpers.

The original [Autumn Mountain Evening pilot](https://docs.google.com/spreadsheets/d/1h0X3zNWCxkG3p7x71LPeFBE-FbC5dLLVj0swto8KwiQ/edit)
passed two reservation-only and two full staff refreshes. Nine stable guest rows,
seating T, label formulas U and attendance AB were preserved. Changed/new guest
writes and repeat zero-write behavior passed separately in an isolated test copy.
See [PILOT_ROLLOUT.md](PILOT_ROLLOUT.md) for that historical evidence.

The protected all-room collector, private workbook state/migration003, and
Main21/KLR22 source binding are deployed after explicit owner approval. Manual
creation tests select today's931956, Tuesday's931957/private936089, and Friday's
931961/931962. Saved helper IDs and generation steps are in
[CREATION_ROLLOUT.md](CREATION_ROLLOUT.md). That checkpoint records the verified native files, repeat
results and safe recovery; do not reapply the migration or blindly repeat a copy.

88 local checks pass (74 automation,14 collector/route/browser-fixture checks).
Live readback additionally verified 3 files/5 events, 4 public targets, one private
form, 4/5/0/17 guests, stable rows and zero repeat writes. Seating/attendance and
formulas are unchanged; no private-party seating target exists.

Reserved product imports and Main/KLR product boxes are live-tested for today's
Main class: four units, two initial cell writes, repeat zero writes, combined
refresh verified with seating/attendance/formulas unchanged. See
[PRODUCTS_ROLLOUT.md](PRODUCTS_ROLLOUT.md) for IDs, boundaries and recovery.

## Owner-confirmed behavior

Assigned Staff mapping: Scheduled Instructor -> Stage, Scheduled Assistant ->
Floor, Scheduled On-Call Instructor/Assistant -> On Call. Pending/requested and
inactive shifts are excluded. The STM Main header cells are D5, D6/D7 and G6/G7;
names stay in the existing label cell and manual edits/formulas are preserved.
Collector/ETL and migration002 are deployed;71 local checks pass. A manual
native Sheet preview populated two verified staff names and preserved T:AC across
1000 rows; repeat plan writes0. October19: after the owner approved closing the
two older editor tabs, the manual runner recovered. Staff updates are enabled
only for this manual target. Two native full runs (170008/170010) passed with
staffVerified=true, nine stable reservation rows, no review items or writes,
and unchanged seating/attendance/formulas. Warehouse revision4, five staff-ledger
entries, no lease. All schedules remain OFF. See the checkpoint for evidence.

- Create charts starting seven days before class; refresh overnight daily,
  at T-24h, then T-6h, T-5h, T-4h, T-3h, T-2h and finally T-75m. No T-1h update.
- Overlapping classes/private events in the same studio share one workbook,
  including different start times. Classes receive seating tabs; private
  parties receive only a Private Party information form, never a seating chart.
- A class held in KLR uses the same seating layout as Main. Room name does not
  determine whether an event is a private party; use verified source class type.
- Name: `YYYYMMDD Painting (Main), Other Painting PP (KLR)`. `PP` denotes a
  private event. St. Matthews King Louie Private Room is `KLR`.
- St. Matthews source-data import starts with the first guest at V1, without
  headers. Import map below is grounded in the owner's filled example.
- Owner explicitly excludes setting attendance and seating assignments. Never
  import Checked In into AB, set seat numbers in T, or overwrite U formulas.
- Owner additionally requested automatic Private Party information on October
  18. Fill verified event facts and preserve staff edits; unresolved details
  need review. This request does not authorize guessing financial agreements.
- Four studio Google accounts; resolve credential, template, and output folder
  from configuration, never by painting name or an assumed default account.
- Owner confirmed each location has its own seating-chart master. The St.
  Matthews master is authorized only for STM; never use it as a fallback for
  Jeffersonville, Gilbert or Short North. Missing studio masters stay pending.

Owner supplied account identities (not passwords or verified OAuth connections):
St. Matthews `pinotsstmatthews@gmail.com`, Jeffersonville
`pinotsjeffersonville@gmail.com`, Gilbert `pinotsgilbert@gmail.com`.
Short North email remains pending. These are recorded in the draft studio
configuration. STM's studio-owned destination folder and separate credential
are verified and recorded; the other studio credentials remain unbound.
Read-only n8n identity checks found existing Google Sheets/Drive connections
belonging to different accounts. Do not bind
or reconnect them by generic label, or alter credentials used by other workflows.

Grouping: sort by actual start/end time, combine connected
overlap chains; back-to-back endpoints form separate files. Date is the earliest
event's studio-local date. These chain/boundary conventions are implementation
assumptions for review. Each event keeps its own T-75m cutoff even when sharing
a workbook. The later event's refresh must not rewrite an already-final tab.

## Read-only source inspection

### Jeffersonville master registered October 18

https://docs.google.com/spreadsheets/d/1P9Nk0-y4Tqjn4GBkvZGQ636qbUGuPNIBeYgBCMNGt8I/edit

Native title `Jeff Master Seating Chart`. Google connector metadata returned
permission denied; the authorized studio browser opened it successfully under
`pinotsjeffersonville@gmail.com`, with Private to only me shown in the UI.
Do not broaden sharing to resolve this. Bind the correct studio n8n credential
and verify its access later. No source edits or permission changes were made.

Verified tabs: `1_SC_Main` (gid 0), `2_SC_Riverside Room` (gid 114549077),
`3_Private P.` (gid 735735840), plus `4_BAR SHEET`, `5_Open Checklist`,
`6_Close Checklist` (IDs not inspected). The first three IDs were observed in
the loaded URLs after selecting each tab, not inferred from other masters.

Main is materially different: its merged title covers A1:X1; **V1 must not be
used here**. A bounded read of Y1:AN8 showed Z1 seat #, AA1 Guest label, AC1 Guest,
AD1 Guest Email, AE1 Purchaser, AF1 Purchaser Email, AG1 Checked In, AH1 Comments.
AA2's observed formula uses AC2 guest and AB2 perks. The header arrangement does
not include a purchaser-phone header between purchaser email and Checked In.
Do not paste the standard source rectangle blindly or shift attendance/comments.
Owner confirmed Jeffersonville's Perks data starts at **AB2**, preserving row 1
headers. The draft config now records that anchor and Perks column. Remaining
columns still require reconciliation with the differing phone/Checked In
headers before any live writes; do not reuse STM's fixed V:AA/AC writer.
The Riverside Y1:AN2 read was blank; its import position is not established.
The Private Party form also has a different merged layout. Other JEF import/form
destinations remain pending exact mapping; no STM/GIL fallback is allowed.

The Main sheet visibly has an existing #REF! total-seats formula. Investigate
its dependency in a future working copy; do not alter the master or assume a
whole-workbook copy repairs an already-broken formula. No customer data from
this inspection is stored in source files.

### Gilbert master registered October 18

https://docs.google.com/spreadsheets/d/1Hpgv8oU-6BpLntdB0eiSh9WW-iY8dLyopBS6AOcQC30/edit

Verified native title `Gilbert Master: Seating Chart`, timezone
`America/Phoenix`; associated only with GIL / `pinotsgilbert@gmail.com`.
No edits to the master, copies or credentials were made.

| Tab | Numeric sheet ID |
| --- | --- |
| 1. SC_Main | 0 |
| 2. SC_Reserva | 517262747 |
| 3. SC_Private Party | 735735840 |
| 4. Bar Sheet | 912489362 |
| Opening Checklist | 1630393717 |
| Closing Checklist | 1963754726 |

Main and Reserva have imported Guest through Comments headers in W1:AC1;
V remains the Perks position. Confirm whether Gilbert follows the earlier V1
first-guest instruction (replacing the header row in a copy) or preserves its
headers and starts at V2. Its importStartCell is deliberately unset pending
that answer. The initial source-room-to-template mapping also needs verification.
Do not reuse St. Matthews room IDs or labels.

Main/Reserva U contains guest/perk formulas. Their F5 totals refer to each
other, and Reserva D6/F6 refers to Main's update cells. Preserve references
when handling tabs. The master retains sample contact/check-in data and update
values; initial copy cleanup must reconcile these without modifying the master
or writing attendance. Never treat copied sample data as current reservations.

Gilbert's Private Party form differs from STM: labels place date/time on row 4,
host on row 5 (phone placeholder E5), painting on row 6, event name on row 9,
event type on row 10, price on row 14, payment method on row 16 and expected
headcount on row 23. C15 is a formula, not the STM payment-method destination.
Its basic form mapping remains unset until exact merged input anchors are
verified. The STM-only form writer must never run against Gilbert by tab-name
substitution. Private parties still receive only the information form.

### St. Matthews master

Master: https://docs.google.com/spreadsheets/d/1ktf-zV74f--JWaaPlrrtYgmbLVGI6ZJI9JdArrYootA/edit

| Existing tab | Sheet ID | Initial inspection |
| --- | --- | --- |
| Seating Chart Main | 0 | A1:U10 is chart/header content; V1:AN14 empty |
| Private Party | 1452226892 | Verified basic event-field anchors below; additional agreements need review |
| Seating Chart KLR | 1955136908 | V1:AN14 empty |
| Bar Sheet | 1231623648 | Preserve; contents not mapped |
| Opening Checklist | 679380508 | Preserve; contents not mapped |
| Closing Checklist | 1446798643 | Preserve; contents not mapped |

Whole-workbook native copy is required to retain existing tabs, formulas,
formatting, validations, and checklists. Inspect formula dependencies before
renaming, copying, or removing tabs. Copy another room template within the new
workbook only when another event needs it. Never rebuild through XLSX or edit
the master. The Private Party form is the sole event document for a private
party. An overlapping class uses its own room seating tab in that workbook.
Only the explicitly mapped basic party facts below are prepared for automation.

### Filled example inspected October 18

Reference only (no edits):
https://docs.google.com/spreadsheets/d/1oPkUC4VTy-SVZ0TKtbysf2lHzu9XJ9LOeWdtBVo_v8s/edit

| Column | Source / ownership |
| --- | --- |
| T | Manual seat numbers; never write |
| U | Existing formula combines W guest and V perks; never write |
| V | Perks |
| W | Guest name |
| X | Guest email |
| Y | Purchaser name |
| Z | Purchaser email |
| AA | Purchaser phone |
| AB | Checked In; excluded by owner instruction, never write/clear |
| AC | Source reservation comments |

The sample has no imported header row or imported Order Id column. Keep source
order/reservation IDs in the private row ledger, not in U. Requests must
write V:AA and AC separately so AB is never included, even as a blank cell.
Do not clear/rewrite a single V:AC rectangle. Contact columns are evidenced by
the supplied layout; no customer values from the example are stored here.

The owner subsequently confirmed the source selection in screenshots of the
October 18, 2026, 5–7 PM Autumn Mountain Evening class: start with **Perks**,
exclude Order Id, and paste the first data row at V1. Blank Guest/Guest Email
cells are legitimate reserved seats, not empty rows. Preserve each such row,
including identical blank-name rows within one order; do not deduplicate them.
Owner update: display unnamed guests as the purchaser's first name plus
`'s guest` (for example `Linda's guest`) in W. Preserve the original blank source
name for identity matching; this is only a display fallback. A later actual
guest name replaces the fallback on the same reservation row. Keep Comments at AC while excluding the
Checked In source column from writes under the attendance restriction.
`seating-source.cjs` normalizes a verified complete table, validates its columns
and row count, and keeps Order Id internally as context. It does not assign
durable guest IDs; source-row positions must never become refresh identity.

Main and KLR retain the same template seating-tab names in the example. The
Main roster is populated; the inspected KLR import area is blank. The separate
Private Party form has event-specific details; its basic mapping is below.
The owner confirmed private parties have no seating charts. KLR seating tabs
are used only for classes held in that room. Do not collect private-party guest
rosters for seating or populate the form's painter/registration list. No
attendance count/header or other header cell is mapped yet.

Preserve guest row positions on refresh: sorting/replacing a roster could attach
manual T seat numbers to different guests even without writing T. Append new
guests only to verified unused rows; reconcile removals, duplicate names and
manual additions using durable reservation IDs. `source-identity.cjs` now maps
the order grid's `reservationCheckbox` ID to each seating row; all nine real
pilot IDs were verified. `refresh.cjs` keeps those rows stable, appends only into
unused rows and holds removed guests for review. Collector code and the guarded
n8n path are prepared, with deployment pending. Do not use guest name,
order ID alone, or transient row order as a unique guest ID. Stop for review if
ownership/identity is ambiguous rather than overwriting manually added guests.

`roster-writes.cjs` builds RAW requests for already-verified row mappings only.
It does not perform collection, reconciliation, deletions, or Sheet writes.

### Private Party form bonus — mapped, not connected

Matched the filled example to Pinot private class **933042**, October 14,
2026, 7–9 PM, King Louie Private Room. The related public class is 930835,
6:30–8:30 PM. Read-only live inspection confirms their overlap and source fields.
No personal contact details or form contents are persisted in source files.

| Form cell | Verified mapping / normalization contract |
| --- | --- |
| C3 | ClassDate + ClassStartTime + ClassEndTime in studio-local display format |
| C4 | PrivatePartyOrganizer.FirstName/LastName + PrimaryPhone |
| C5 | Assigned painting name; verified duration/size only when available; do not use unselected painting requests |
| C8 | PartyName (display/event name) |
| C9 | One explicit linked Deposit Information amount, verbatim; HasDeposit alone is insufficient |
| C12 | Price (source per-seat price, not deposit/payment total) |
| C15 | CollectionMethodTypeId selected text, verbatim; Paying All Together does not identify the payer |
| C22 | PrivatePartyExpectedHeadcount (expected guests, not attended count or minimum paid seats) |
| H4 | Explicit minimum paid painter/seat count from POS staff comments; otherwise owner-confirmed defaults: adult8, kids10, using configured source party types; never expected headcount |
| C13 | Full minimum statement and explicit seat notes |
| C7 / C10 | Explicit door times / deposit application instructions from POS staff comments |
| C16 / C17 | Explicit music / food instructions from POS staff comments |
| C18 / C19 / C20 | Explicit bar order / currency charge / payment instructions |
| C21 / C23 | Explicit extra-time instructions / complete POS staff comments for context |

`private-party-writes.cjs` plans these individual RAW cell writes only.
It rejects non-private events; `roster-writes.cjs` rejects private parties and
unknown event types. Planner output routes each event to its document type.
Source values must be verified and destination cells freshly read. Fill empty
cells and refresh previously written values only if staff have not changed
them. Preserve conflicts for review. Record the last-written values only after
successful write/readback. Do not auto-clear fields when source facts disappear.

Additional fields remain manual pending authoritative source mapping: assigned
artists (and status/role filtering), TV/physical master, door access window,
total charges and details not explicitly stated in POS staff comments. The
HasDeposit checkbox proves no received amount. A missing/multiple/malformed linked
deposit is reviewed without inventing a zero or financial total. Notes use
conservative explicit-label matching; the complete original comment is retained
in C23. Ambiguous minimums stay in notes and leave H4 for review. A minimum count
does not determine a dollar charge or an attended count.
Blank POS comments add no specific instructions. Defaults live in STM private
form configuration; the collector returns the selected raw party type. Explicit
note minimums take precedence, including ambiguous exceptions that need review.
Unmapped/blank party types do not silently choose an adult or kids minimum.
Do not calculate total charges from expected headcount. Do not copy template
sample dates, preparer, door-time or $XXX.XX placeholders as event facts; show
these for review during initial-copy cleanup. The payment/registration list
G7:I30 and paid totals are outside this writer; H4 is the sole newly authorized
minimum field. Attendance/seating remain manual.

If more than one private event shares a workbook, use a separately mapped copy
of the Private Party form for each event, with its numeric sheet ID associated
to that class. Never combine two hosts' details into the same form cells.

Live Pinot admin inspection on October 18 confirmed:

- Calendar `/Class/CalendarView` exposes links `/Class/Edit/{classId}`, actual
  displayed time ranges, public/private classes, and painting names. Changing
  location requires Search; verify loaded class location independently.
- Class edit exposes `RoomId`, `ClassTypeId`, `ClassDate`, `ClassStartTime`,
  `ClassEndTime`; private classes also expose party details and staff comments.
- `/Class/SeatingChart/{classId}` is linked from each inspected class and has
  **Export to Excel** / **Export to PDF** controls. Its displayed table columns
  are Order Id, Perks, Guest, Guest Email, Purchaser, Purchaser Email, Purchaser
  Phone, Checked In, Comments. The inspected public example displayed 22 rows,
  matching its 22 reserved seats. Export download itself is not yet tested.
- Historical public class 927724 and private class 934281 were read only to
  inspect structure. No source customer contents are saved in this directory.

Prefer the reliable supported export/API after validation; otherwise use the
established authenticated collector pattern for the displayed table. Do not
invent an undocumented API or assume the Excel button returns current data.
Need a current eligible class and private event to validate freshness, empty
classes, refunded/held reservations, pagination, and reservation identity.

## Architecture and minimal runtime plan

Reuse n8n for orchestration and Supabase for scoped configuration, source
refreshes, durable class-to-workbook/tab mappings and refresh audit history.
Collector only returns structured source data. Existing privacy-safe reporting
imports stay unchanged. Reporting snapshots lack true end times and their
event key changes with painting/time/room edits (see
`../../staffing-app/CALENDAR_SYNC_PLAN.md`). They can seed discovery but cannot
serve as durable class identity or the hourly seating roster source.

The applied private operational store holds studio configuration, source/run
history, immutable workbook plans/copy stages, unique class-to-tab mappings, and
reservation-ID-to-row/staff ledgers. Migration003 passed rollback/access checks;
browser access remains denied. No guest data is exposed in public BI views.
See the current inventory in ../../docs/01_architecture/schema.md. Retention policy
and other-studio rollout remain future work.

One shared workflow with four credential-bound studio branches is preferable
to four separately maintained automations. A small recurring dispatcher plus
an overnight trigger can service all events. Decide exact local overnight time
with the owner; dispatch frequency must support T-75m, not just top-of-hour.
`refreshMilestones` returns creation and relative deadlines only; the overnight
dispatcher, persisted deduplication, catch-up/failure policy and live executor
are not implemented. Never mark a milestone successful before source/write
verification. Coalesce coincident refreshes; honor studio IANA timezones.

For each due event: determine source class type first. For classes, collect the
seating roster and use the appropriate room seating template. For private
parties, collect event/form details only; do not request a seating export or
create/populate a seating tab. Preserve unused master room tabs on native copy
until copy-only tab cleanup/dependency checks are implemented; a blank preserved
template tab must not be presented as a generated private-party seating chart.
Both event types still participate in overlap grouping, file naming and their
own refresh cutoffs. Refresh authoritative source, validate completeness and
class/studio ownership, load the approved private source slice, resolve existing
workbook/tab, then update only the mapped imported cells and verify readback.
Use RAW writes for source text. Blank trailing old import rows only within
the previously tracked owned extent after a complete successful refresh.
Preserve seating assignments, notes, formulas and other tabs. A source error is
not an empty roster. Failed writes retain the previous successful timestamp.

Store the numeric class ID as durable identity. Titles are display names only.
If changed event times combine or split already-created files, flag for review;
do not silently move/delete staff work or create duplicate charts. Look ahead
beyond the seven-day creation boundary enough to resolve overlapping sessions.
STM creation currently permits verified Regular100/PrivateParty200 in configured
Main21/KLR22 rooms. Inquiry placeholders and unpublished public drafts are excluded;
unsupported overlapping events hold their group for review. Mobile/virtual events
and other uncertain types require an explicit eligibility rule. Do not infer
cancellation just because a class disappears from an incomplete feed.

## Verification and next action

Run `node --test automation/seating-charts/planner.test.cjs automation/seating-charts/roster-writes.test.cjs automation/seating-charts/private-party-writes.test.cjs automation/seating-charts/seating-source.test.cjs automation/seating-charts/connection-check.test.cjs`
from repository root. Tests use synthetic events and guests only. They cover shifted-start overlap, overlap
chains, boundaries, long/overnight events, owner/studio isolation, identity,
invalid durations/timezones and individual final-refresh deadlines including
DST and Arizona date handling, attendance/seating write exclusion, fixed guest
rows, literal source text, verified party-field mapping and staff-edit
preservation, GET-only connection checks and studio account/ownership guards.
They do not prove production synchronization.

Next: owner review of the three native files in CREATION_ROLLOUT.md, then a
separate scheduling rollout and remaining-studio mapping. Agree the overnight
time before activation. Scheduled updates remain OFF.
