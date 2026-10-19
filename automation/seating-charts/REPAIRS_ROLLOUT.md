# St. Matthews repairs and additive product perks - October 19, 2026

Owner explicitly approved replacing the blank Spooky Gnome layout, retaining a
backup, fixing update errors, and adding product abbreviations without replacing
existing perks. Seating, attendance and guest-label formulas remain protected.

## Verified repairs

- Friday file1RTRvFZ8FO4a2ndWxpT0KCytd6YHAMoXHZSKin0QMY6o now has KLR tab
  100931961, same live sheet ID, original exact hidden backup200931961 named
  Before KLR move - 931961, and the correct filename. Native readback verified
  the KLR grid and all T:AC cells unchanged. Existing Friday Main was untouched.
- The approved room transaction completed: class931961 maps room22/template
  1955136908, correct KLR tab name, enabled, no lease. Original source/plan/target
  history is retained in roomCorrections. Never replay this one-time SQL.
- Held reservation run stm-pilot-170320 had12 correct guest rows and one missing
  email. A copied master merge W8:X8 discarded that email. Reacquired the same
  immutable run, unmerged only W8:X8, restored only X8, verified all13 rows,
  staff and protected cells, and completed the original run through its RPC.
- Master metadata confirmed Main W8:X8 was the only merge intersecting import
  columns; KLR had none. Fixed that master merge and the same import-only range
  in all12 registered public charts/11 files. Every before/after read verified
  existing import values, seats, formulas, attendance and validation unchanged.
- Source-only HTTP probe identified products-grid-status/timeout. PR100 added
  bounded diagnostics without raw browser data. PR101 keeps verified existing
  location/Reserved selections instead of reopening hidden selected options.
  Railway deploys these from codex/auth-onboarding. A live future-date probe for
  Witchy Blooms931960 subsequently returned200, complete, zero product units.

## Product perks implementation

Configured codes: CAN candle, CP cheese, CPM cheese-and-meat. Mapping and order
scope live in existing studio configuration; no new table or schema is required.
Owner clarified that quantities determine allocation. Exact source order identity
is required. Quantity covering every seat adds the code to every guest on that
order. Otherwise the uniquely named purchaser (or single-seat order) is marked;
partial multi-unit allocations are flagged instead of guessing the remaining
guests. Quantities remain in the six product summary cells. Main and KLR use
perkScope=quantity in the existing configuration; the schedule flag was unchanged.

06 now loads a fresh completed product snapshot by verified run/target identity
before planning guest writes. Its immutable guest plan appends codes to the
current literal perks text, preserves existing source/manual/product codes, and
updates the normal stable guest ledger. Repeat runs do not duplicate codes.
Guest-only refreshes preserve codes already added. Merged imports stop before
new guest writes. Native readback still compares seating T, formulas U and
attendance AB, and verifies mapped staff headers independently.

08 retains its six-anchor-only write boundary and returns a private product-run
reference.09 collects products first, passes that reference to06, and joins their
verification results. A product failure still allows the guest/staff update to
run, then records the combined operation for review. The three compatible helper
versions were published in order06/08/09. The schedule flag remains ON.

Local checks:96 automation tests passed after the final identity repair.
Ten isolated product/event collector checks pass, including hidden
Reserved options and duplicate calendar month controls. Initial sandbox fixture
launch was unavailable; installed-browser fixtures passed outside the sandbox.
No customer contents or credentials logged.

## Current checkpoint

Today's931956 quantity pilot (product170559/guest170561) added CPM to the remaining
two guest rows: all four guests on two two-seat/two-product orders are marked.
Repeat product170567/guest170568 wrote0 guest/product cells, review0 guests,
staff verified and seating/formulas/attendance unchanged. Product box J25/R25
contains a staff-edited two-unit summary although Admin has four vouchers; both
runs preserved it and recorded preserve_staff_product_edit. Do not overwrite it.
The native06 quantity-capable version was published before switching config.
All11 current public class targets passed combined checks, with protected
seating, formulas, attendance and staff verification. The ten-class batch passed
nine immediately; KLR product170572/guest170574 passed with zero guests, writes
or reviews. Friday Main170591 added two more guests (19 ->21), without moving
existing rows. Recovered927728 repeat170582 wrote0 for13 guests.
Ghosty Girly931964 had8 source seats but the seating view repeated the buyer's
name/email twice while the actual order retained one unnamed seat. Source-only
comparison proved all seating fields identical, equal order/seat counts, one
named buyer and one blank guest. The narrow identity reconciliation requires all
of those facts; differing perks or other named guests still fail. Native06 was
republished. First170629 imported8; repeat170633 wrote0/review0 and verified
staff plus protected cells. Connector readback confirmed Olivia's guest in W.
PR102 repairs remembered-month discovery: duplicate header/footer month buttons
caused strict selection errors (source-only probe calendar-before); the regression
fixture navigates October/November successfully. Railway shows successful active
deployment4a680a5c; fresh native source-only discovery returned25 complete events,
zero new groups and only the expected unsupported-room/type931231 review. Friday's
room-plan hold is gone. Scheduled170636 subsequently passed today's T-2h update:
four guests/four product units, zero writes, unchanged seating/formulas/attendance,
staff verified and the same retained manual product-box review. Scheduled
discovery170644 completed with zero copies and only931231's eligibility review.
Native Admin identifies that event as Who Rescued Who?, October21, Main Studio,
Painting It Forward. The owner was asked whether to include that additional type;
it remains outside the verified Regular/Private Party configuration for now.
The bounded repair resolver appended subsequent verified run references to14
historical failure results, preserving their original statuses, results and times.
Both temporary workflows SDIReYv3G3lXbXg9 and g25CgFnjTicTuo8s are archived.
The applied database node cannot be accidentally rerun from the active folder.
Original07 remains unchanged. Routine source probes were read-only.
Other studios remain off/unbound.
