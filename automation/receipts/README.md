# Receipt email studio routing

The owner approved the four named Gmail inboxes, shared COA category names and
general product rules on November 7, 2026. Receipt-specific answers and reviewed
source corrections remain within their original studio.

`receipt-studio-mailboxes.json` is the non-secret routing configuration. Credentials
are static n8n bindings; no tokens or client secrets belong in these files.

`build-mailbox-routing.cjs` patches fresh exports of the seven existing receipt-only
workflows. It does not create workflows, change database schemas, or access QBO.
Gilbert keeps its existing ledger identity for compatibility. Other studios receive
mailbox-specific receipt, cache and document identities. The existing extraction
allowance ledger preserves all historical reservations. On November 8 the owner
approved another $5, for a $10 lifetime cap. The 115 historical and 50 original
current tickets plus 166 new tickets reserve at most $9.93. Claims are conditional,
and failed or reserved tickets are not recycled. Actual billed usage is separate.

Inbox reads are bounded to 250 messages and paid extraction to 25 new receipts per
studio pass. This prevents a large inbox from consuming the shared allowance in
one pass. These are batch limits, not proof that the entire inbox has been cleared;
remaining held and older messages require subsequent reconciliation.

The coordinator dispatches one isolated execution per studio through its existing
workflow's sub-workflow entry. The child entry does not redispatch. The original
manual trigger and 6 AM America/New_York schedule dispatch all four studios.
An absent studio result is reported as incomplete, never as successful processing.

Completion requires balanced approved item splits and both independently verified
PDFs before removing INBOX from the source email. Existing file identities and
ledger claims prevent duplicate copies. Clarification replies return to the source
studio inbox and must match the original question and authenticated owner reply.

November 8 owner policy shares confirmed product/service categories across all
four studios. Paint of any color is Paint Inventory; Canvas Depot is Special Class
Products COGS. Authenticated exact-product answers can be reused with their source
provenance; amounts, dates and source identities remain receipt-specific. Conflicting
category answers remain unresolved. Completed Canvas Depot card receipts retain
the printed gross payment without inventing unstated tax. Fish Window Cleaning
payments reconcile their printed total and tax against the saved service category.

Photo-preservation support extends the existing document helper and PDF bundler,
not the workflow inventory. JPEG/PNG originals are retained byte-for-byte inside
the source PDF; readable balanced categorization and both verified PDFs are still
required before archival. Mixed or incomplete extractions remain held.

Validation:

```
node --test automation/receipts/mailbox-scope.test.cjs automation/receipts/route-studio-gmail.test.cjs automation/receipts/scoped-runtime.test.cjs automation/receipts/multistudio-export.test.cjs
```

The export integration tests consume the local fresh-export manifest. They verify
actual generated node code, including category/split outputs for all studios,
receipt-specific isolation, graph validity, sender binding and archive gates.
They do not substitute for live processing, file verification and replay checks.

Rollback: restore the corresponding pre-release workflow JSON or n8n version.
The export manifest is recorded in the receipt-email checkpoint. Preserve the
existing credential bindings and keep completed files/audit history intact.

November 8 repair: the exact 166 additional approved extraction IDs are accepted by both review stages. Previously these completed results were ignored by the legacy cache allowlist. Inbox identity is authoritative for studio routing; printed addresses are retained as evidence only. New clarification mail goes to jeff.duff@pinotspalette.com. Existing authenticated replies from either owner address remain valid. Location questions are suppressed. Saved Autojate phone-service purpose is shared without copying receipt amounts or dates.

November 8 source review repairs: named TD paints and candle stock reuse confirmed categories. The existing TD text reader also accepts authorized studio inbox identity, while retaining vendor marker, known item, exact subtotal/total and zero-shipping checks; unknown items or mismatches remain held. Blick unit/extended amounts and Google One state/local tax are corrected only against unique printed source evidence and reconciled arithmetic. No source-specific owner decision is copied across studios.

The active plain-text summary rendering path now prints COA split lines in large bold type. The document helper uses presentation version bold-instructions-v3; older archived summaries are not silently claimed to have been regenerated. Production renderer deployment7637960987 succeeded November8. Four-studio run321523 verified14new PDF pairs and14source-email archives, with remaining review holds. This is progress evidence, not a claim of a cleared backlog. The next authorized run322196 is monitored separately in the private checkpoint.

November 8 follow-up: TD Premium Canvas and additional named paint colors retain established inventory accounts. Candle measuring cups explicitly use Candle COGS rather than fragrance inventory. Authenticated pest-control and window-cleaning answers map to existing Repairs & maintenance account 68; precise Kahoot software plans use existing Software & apps account 122. Unknown services and conflicting answers remain held. Generated-runtime tests verify these mappings.

November 8 receipt backlog repairs: ignore explicit .ics calendar companions during PDF extraction while retaining unsupported-file guards; apply authenticated saved shipping, printing, special-products, marketing and staff-enrichment purposes to existing chart accounts. Shippo aggregate payment summaries retain the printed invoice amount and owner-approved shipping purpose without inventing per-label itemization. Wrapped evidence quotes are normalized only for source-text comparison. Cintas all-lines approval remains bound to the exact authenticated receipt and vendor. TD paint descriptions accept printed case-price suffixes. Finite $10 guard unchanged; no QBO.

November 8 large-photo repair: a 5.55 MB receipt photo reproduced a V8 stack
failure in the bundle base64 validator. Bounded alphabet validation and canonical
byte round-trip replace the recursive regular expression. SHA-256, size, format
and page limits remain enforced. Three regression tests pass; the actual photo
renders locally with its unmodified original embedded. Deployment pending.
