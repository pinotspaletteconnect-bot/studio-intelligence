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

Photo archive verification (November 8): the existing archive helper accepts PDF, JPEG and PNG originals only after matching filename, MIME and byte length to the preserved source manifest. Unsupported or changed attachments remain in Inbox. Thirty-eight targeted routing/source/photo tests pass. Live four-studio backlog processing is ongoing; not yet fully cleared.

Document handoff recovery (November 8): coordinator uses one-item Loop Over Items around the existing document helper, whose call mode is once. This avoids the observed n8n each-mode aggregation error and preserves per-receipt outputs. Missing helper results become document issues; run reports distinguish holds from completion. 41 targeted tests pass; live validation pending. No new workflow or QBO access.

Live validation: Short North execution323819 completed both Fish Window Cleaning receipts with two verified PDFs each and archived=true. Other document attempts reported busy leases; all-four completion is not established. A context-only parent return is now reported as incomplete. A precisely identified Michaels saved-search promotion is excluded from receipt extraction without archiving it; transactional messages remain eligible. 32 targeted reporting/routing/nonreceipt tests pass.

Follow-up validation: raw Gmail labels/snippet are absent after intake normalization. The saved-search guard now also recognizes the exact marketing subject, body opening and Michaels link domain; replay of the real Short North input excludes the advertisement. Target source photo independently corrects its printed receipt number and subtotal while retaining the unresolved product category. The next coordinator draft isolates each studio call as well as each document call; live validation remains required.

Further November 8 validation: coordinator execution324199 returned all four actual
studio outcomes and correctly reported needs_attention. Short North's Canvas Depot
payment completed with both PDFs and archive confirmation. The document helper now
recognizes the visually inspected Short North signature logo using inline metadata,
exact size, signature HTML and display dimensions; unknown inline images still fail
the receipt coverage check. No actual receipt attachment is removed by this rule.

Budget reconciliation retains all historical allowance rows. Unknown historical
usage remains fully reserved; only recorded settled input/output usage releases a
reservation. A bounded supplemental set can use the existing $10 cap, never a new
spending limit. The extraction helper counts the exact model input before consuming
an allowance, checks context and worst-case output cost, and makes no paid request
when the count is missing or exceeds the reservation. This draft requires live
validation before reporting further extraction capacity as operational.

November 8 large-photo repair: a 5.55 MB receipt photo reproduced a V8 stack
failure in the bundle's repeated-group base64 validator. Validation now uses a
bounded alphabet check and canonical byte round-trip, retaining SHA-256, size,
format and page limits. Three regression tests pass, including a synthetic
multi-megabyte PDF and malformed-data rejection. The real photo renders locally
as an 11.08 MB PDF preserving the original. Deployment 7641039452 succeeded on November 8; the live Short North source PDF now opens with the original photo. Its restaurant-purpose question remains separate from the repaired rendering path.

November 8 receipt handoff repairs: the coordinator now skips document calls for rows without ready evidence while retaining their clarification context. Exact-source supporting bank evidence retains its printed date through final verification. A reviewed Arena inline charge-reference image is preserved with its receipt; the archive guard checks explicitly included inline files and rejects missing or changed evidence. These fixes do not access QBO. The backlog remains incomplete; published workflows must be checked against actual PDF-pair and archive outcomes.

November 8 evening validation: parent execution 326720 completed all four studio
calls with empty document/completion issue lists. Its result is
`processed_with_holds`, not a cleared backlog. New Cintas, Sam's Club and Uber
completions have source/summary file IDs plus archive confirmation in the private
completion index. Existing mixed-receipt scans, incomplete headers and genuinely
unresolved classifications remain held. No QBO calls are part of this operation.

The owner confirmed Rockbot's content license and streaming service as
Memberships & subscriptions. Its reviewed tax correction and scoped category
rule are published; live archival is tracked separately from offline replay.
The saved answer `repair` now maps to the existing maintenance account while
conflicting alternatives still require review.

Deployment lesson: large CodeMirror `fill` operations produced concatenated code
despite a Published badge. Use focused select-all/paste, copy the full editor
content back, compare it to the tested code, and compile it before publishing.
Click outside the code editor to commit its value; Tab can insert indentation.
Verify a real execution after publishing. A badge alone is not code-integrity
or end-to-end evidence. The duplicated review code was replaced and execution
326720 verified recovery across all studios.

November 9 review repairs: the owner-confirmed Keg1 scan now retains an unknown purchase date rather than using its scanner filename; it remains held. Heidelberg invoice90023044 is corrected from the original September2 photo: five discounted extended amounts total373.33, so the printed176.00 discount must not be deducted again. BWC confirmations are parsed as a single workers-compensation policy payment with a scheduled date; the summary does not claim bank settlement. These changes use existing categories and source guards.49 targeted tests pass; live PDF/archive results remain a separate verification step.

November 9 Keg 1 follow-up: original photo 20261015_123830.jpg supports invoice539896, October15,2026, Angry Orchard32.00, Blue Moon30.60 and Yuengling24.80 plus6.00 fuel surcharge. Corrected extraction had used a license expiry as purchase date, invented tax, and misidentified products. Scoped correction retains original photo and allocates the surcharge under the existing delivery policy; saved Beer Inventory covers all three products.58 targeted tests pass and replay preserves original evidence. Review versionabe85e0d published; live archival verification pending.

November 9 Sam’s receipt follow-up: exact source TC654014593427635654926 uses two paper-plate packs (44.68 extended, not22.34) and printed7.50 savings. Proportional allocation reconciles145.01 net plus8.76 tax to153.77. Saved answers5/129/132 cover abbreviated paper products, caramels and sodas; candy and lemon-juice purposes remain unresolved.59 targeted tests pass; review1bc9f242 published. Parent332891 completed all four studios without new archive/document failures; a new pass tests the published changes. A second Target photo was manually matched to its previously verified original/summary by receipt reference, timestamp, amount and payment authorization, labeled Completed and archived without generating a duplicate purchase. Private evidence records both source IDs and PDF IDs.
