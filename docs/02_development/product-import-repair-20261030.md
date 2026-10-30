# Product import collision repair — October 30, 2026

Saved source execution256460, report October23, contains two identical minimized Gilbert preorder rows, each quantity1/net0. Current parser hashes only row contents; both rows therefore conflict in one PostgreSQL upsert, rejecting account1's entire batch (115 product rows). Do not deduplicate: source multiplicity must be preserved even when lines share all non-personal fields.

Change: retain the existing content hash for the first occurrence; assign deterministic hashes using content hash plus occurrence number for second/later identical lines. Existing unique rows and first occurrences retain their identities. Every source line and all revenue/quantity values are retained. Reruns and unrelated row reordering produce the same key multiset. Customer names remain excluded. No schema, credentials, workflow or schedule changes.

Four parser regression checks pass: repeated zero-price lines, legacy identity, repeat/reorder stability, and repeated paid lines with exact totals. Deploy through the existing collector Railway root. Then retry only incomplete product dates23/24/29 and reconcile source rows/totals to warehouse.

Rollback: revert the parser PR and redeploy the prior image. Preserve source execution evidence and warehouse history. Additional occurrence rows loaded after the fix represent source lines; reverting code does not delete them. No destructive migration required.
