# St. Matthews product reservations - manual rollout checkpoint

Owner requested product reservations from Products / Merchandise / Reservations
and updates to the matching seating chart. Schedules remain OFF. Only Reserved
units are imported, never Received/Refunded/Voided or unassigned products. No
source fulfillment or payment state is changed.

## Verified source and master layout

Actual October19 class931956 Thicc Boo-ty has four reserved salami/cheese plates:
two units per purchaser, each with its own voucher code. Exact source order links
were verified. Counts are voucher units, not payment amounts or guest seats.
Names/quantities group by source customer name; source spelling is retained.
Unknown product names stop before a lease/write rather than silently undercount.

Main boxes: J23/R23 candles, J24/R24 cheese, J25/R25 cheese+meat. Owner explicitly
requested equivalent boxes in the KLR MASTER. Its former empty G19:R29 notes
placeholder was unmerged; native Main G23:S25 was copied to KLR G19:S21, and the
original note placeholder retained in merged G22:S29. KLR anchors are J19/R19,
J20/R20,J21/R21. Main master and all KLR seating/header A1:S18 plus T:AC1000
values, validation and formats compared exactly before/after. No event data was
copied into the master. Master ID1ktf-zV74f--JWaaPlrrtYgmbLVGI6ZJI9JdArrYootA.

## Boundaries and deployment plan

Protected account-broker collector /pts/class-products reads actual class facts,
applies studio/date/Reserved filters and walks complete product grid pages.
Voucher/order keys replace volatile DOM row IDs. The source API's ClassId, when
exposed, is joined by voucher; otherwise the order's exact class link must uniquely
verify the class ID. Product-only orders without an authoritative class ID are
held for review. Before/after source grids and class identity must be stable.

n8n owns exact-name product mapping, customer quantity grouping, updates and
readback. Product mapping is private studio configuration. Migration005 adds one
RLS-protected product-run audit table and three service-only RPCs; existing guest
and staff state/functions are unchanged. Sources and immutable six-cell RAW plans
are staged before Sheets. Concurrent/unfinished runs stop for recovery. A paired
name/count staff edit or formula is preserved for review. Repeat updates write
nothing; cancellations remove only unchanged automation-owned summary values.

07 provides a manual product test,08 a called-only product helper,09 a combined
class helper calling existing06 then08.05 calls09 for created-class refreshes.
Original02/06 guest/staff workflows remain intact. A transactional migration
rollback/column-denial/access trial precedes application. Rollback disables
productReservations.enabled and restores05's prior06 reference, retaining history.

## Live verification - October 19, 2026

Collector PR97 is merged/deployed (production merge1c3cb4b). Migration005 and
private product settings were applied after transactional rollback, protected-cell
denial and anon/authenticated access checks. Trial rows were rolled back.

Native08 BLcMG5WWcf5huXpi and09 ZPw3ki2KECR6kFRM are published for nested calls
only;07 Iba10OfIOBdwmdx1 is unpublished/manual. Existing05 MCK8as1xFrAc8SaN
now calls09;09 waits for existing06 then08.07 is restored to08 after the combined
test. No timer/webhook was added. Native child input discovery must finish before
saving a changed workflow ID; explicit empty resource-mapper value/schema are
now generated to avoid transient undefined-mapper failures.

Today chart1UQzMpm6XIHbU7A41V31RDNOA_jiB5Te8Eq1ITbAUXVY, tab Main 6.30 PM -
931956: four cheese/meat units grouped two per customer in J25, total4 in R25.
First product run170238 wrote exactly J25/R25. Repeat170241 wrote0. Combined
execution170249 verified four active guests, actual staff, no guest/staff changes,
unchanged seating/formulas/attendance, and product count4/write0/review0. Product
readback compared every other A1:AC1000 value/validation unchanged.

KLR master native visual review confirmed matching boxes on rows19-21 and notes
below. Main master and KLR seating/import/formula/attendance regions unchanged.
No live public KLR product class has been tested; existing ready files are not
retrofitted or reinitialized. New copies inherit the corrected master. Unknown
product names stop for mapping review. Scheduled dispatch and other studios are
still OFF. Current private-party deposit/minimum remain intact.

Local six product unit/workflow checks pass; source collector has three targeted
checks in addition to14 existing route/class/browser checks. Evidence screenshots
and read-only private audit are stored outside Git under output/seating-charts.
