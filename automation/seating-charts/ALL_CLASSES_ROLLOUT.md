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
request fields and unchanged account isolation. Twenty-seven targeted automation
checks passed, including every configured class kind, private forms, holiday
exclusion and unknown-room holds. Sandbox loopback initially denied connections;
isolated fixtures passed with the installed runtime outside the sandbox.
Production deployment, native publication, configuration and actual class pilot
are pending. Do not report the expanded policy live until those steps pass.
