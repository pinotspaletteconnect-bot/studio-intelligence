# St. Matthews all class types - October 19, 2026

Owner answered "yes all classes" to including Painting It Forward. Exact Admin
options were read from class931231 (Who Rescued Who?, October21 6:30-8:30PM,
Main21, type700, published, five reservations at preflight).

## Policy and rollout

Existing studio configuration now includes every observed class kind: Regular100,
Marketing Event400, Little Brushes600, Painting It Forward700, Virtual Event800,
Little Brushes Virtual Event1000 and Little Brushes In Studio1100. All use class
seating charts when a room layout is mapped. Private Party200 and Mobile Party300
retain information forms, with no seating roster. Holiday500 is a non-class
calendar placeholder and is skipped. Unknown types/rooms still require a layout
or source mapping; never guess a physical room layout. Main21 and KLR22 remain
the verified room mappings. Publication, actual times, assigned painting, overlap
grouping, owner identity and seven-day/final-refresh boundaries stay enforced.

The collector accepts an optional expected classTypeId from the authenticated
n8n request, obtained from the registered warehouse target. It verifies the actual
class against that type and keeps account/studio/room boundaries. Native party
and holiday discriminators still block seating collection. Existing callers
without that field retain their original configured type scope. This is a source
verification expectation, not a class edit, credential or permission change.

Rollout order: deploy collector; publish compatible06/08/10 helpers; apply only
the existing studio class-type settings with optimistic concurrency and a before
snapshot; create/refresh the actual700 class; repeat and verify stable rows,
seating, formulas and attendance. Keep STM schedules ON and other studios OFF.
No schema, RPC, authentication, Railway configuration or paid-service changes.

Rollback: restore the previous creation.classTypes/allowedClassTypeIds fields
from the saved before snapshot and previous helper versions. Retain all native
files, target identities, reservation ledgers and audit history. The collector's
optional expectation remains backward compatible; no credentials need changing.

## Checkpoint

Twenty isolated collector/route/browser tests passed, including non-Regular
classes, explicit party/holiday rejection, expected-type mismatch, malformed
request fields and unchanged account isolation. The full97 automation checks
passed, including every configured class kind, private forms, holiday exclusion
and unknown-room holds. Sandbox loopback initially denied connections; isolated
fixtures passed outside the sandbox.

PR104 merged into codex/auth-onboarding as9ae8f06e. The deployed collector accepted
the actual type700 source-only probe and verified five guests. Native06/08/10 are
published with the expected-type request;09/05 remain compatible and unchanged.
The scoped configuration utility saved the previous fields to the ignored
stm-class-types-before-activation.json snapshot, applied ten class kinds/seven
seating kinds, and verified the schedule flag stayed ON. No schema changes.

Manual creation170760 created ready workbook3889c70e-3c60-4d36-9cba-e793f2e3e434,
file163herFVXLd8N0PJbYWjMHf3XxN9U9PaEsX-msqgnMVY, target
cf8d0127-34b6-401d-9817-eef33a21b3d8, tab100931231 (Main6.30PM-931231).
Guest170763 imported5, review0; product170762 verified0 units. Automatic170764
repeated through guest170767/product170766:5 stable guest rows,0 writes,0 reviews.
Both passes verified seating, attendance, formulas and staff unchanged; no lease
remains. Discovery170768 completed with review[] and0 new groups, resolving the
prior type hold without duplicate files. Native bounded cell reads confirmed
R5=931231, five guest names, blank seats/attendance and retained label formulas.
Visual proof is ignored output/seating-charts/all-class-fundraiser-verified.png.
The temporary manual pilot hET3ATW3UzRweKMB is archived after success.
