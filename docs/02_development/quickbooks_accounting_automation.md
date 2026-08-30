# QuickBooks Accounting Automation

> **Boundary update — August 30, 2026:** n8n now owns the private accounting
> connections and operating workflow. SASHA QuickBooks setup, OAuth, mapping,
> and broker surfaces were removed. References below to SASHA connection controls
> describe the superseded Phase 1 prototype; the warehouse, approval, audit, and
> safety requirements remain applicable.

**Status:** Phase 1 — approved read-only foundation in development
**Started:** August 24, 2026
**Production writes:** Disabled; no QuickBooks connection or warehouse schema has been deployed

## Objective

Build one governed accounting automation that coordinates four QuickBooks Online
companies, four receipt inboxes, PTS franchise invoices, bank-feed activity, GL
splits, and recurring journals. QuickBooks remains the official ledger. Studio
Intelligence owns orchestration, matching, proposed accounting treatment,
approval, audit history, and learning from approved corrections.

The target integration lifecycle is:

```text
QuickBooks + receipt inboxes + PTS + journal sources
  -> one Financial Operations n8n workflow
  -> one durable accounting work queue
  -> matching, classification, splitting, and validation
  -> approval policy
  -> QuickBooks posting
  -> read-back verification, reconciliation, and learning
```

## Operating Boundary

There is one operator-facing automation named:

`Financial Operations — QuickBooks Accounting Automation`

It has one schedule, queue, approval surface, run history, and exception model.
Internally, processing remains separated into stages so a failure in one source
or company cannot stop unrelated work. Reusable implementation components may be
called by the master workflow, but they are not independently scheduled business
automations.

The master workflow supports these invocation modes:

| Mode | Purpose |
| --- | --- |
| `incremental` | Collect and process newly available records for every active company |
| `receipt_event` | Process a newly received receipt without waiting for the schedule |
| `daily_close` | Retry matches, identify missing documents, and summarize exceptions |
| `journal` | Prepare due journal batches from approved templates and source totals |
| `reconcile` | Compare posted work with QuickBooks and detect direct edits or failures |
| `backfill` | Process an explicitly approved company and date range without auto-posting |

## Source Responsibilities

| Source | Provides | Does not decide |
| --- | --- | --- |
| QuickBooks | Company metadata, chart of accounts, vendors, bank activity, ledger transactions, attachments | Cross-source matching policy or learning rules |
| Receipt inbox | Original email metadata and receipt files | Final vendor, GL account, or posting action |
| PTS | Franchise invoice documents and invoice detail when available | QuickBooks company, GL account, or payment match |
| Payroll/POS/other sources | Journal control totals and source-period evidence | Whether an unbalanced or duplicate journal may post |
| Studio Intelligence | Routing, matching, proposed splits, approvals, audit history, reconciliation | The authoritative general ledger |

## Company and Studio Routing

The shared Intuit login does not collapse the ledgers. Each QuickBooks company is
an independently authorized and configured connection with its own realm ID,
token reference, chart of accounts, vendors, bank accounts, and posting policy.

The intended relationship is:

```text
organization
  -> QuickBooks connection (one per company/realm)
      -> one or more studios
      -> one receipt inbox
      -> source accounts and chart-of-account cache
```

Every collected or proposed accounting record must contain `organization_id` and
`quickbooks_connection_id`. A `studio_id` is required whenever the business event
belongs to one studio. Cross-company posting is prohibited by database and
application validation, not merely by workflow convention.

## Durable Work Queue

All transaction and document types use one queue lifecycle:

```text
collected
  -> waiting_for_document | ready_to_classify | needs_review
  -> classification_proposed
  -> approved
  -> posting
  -> posted
  -> verified
```

Any state may move to `exception`. Recoverable exceptions return to the prior
valid state after resolution. `voided` is terminal and requires a reason and
actor. State changes are append-only audit events even when the work item stores
its current state for efficient processing.

Initial work-item types:

- bank transaction
- receipt
- PTS franchise invoice
- vendor bill or expense candidate
- payroll journal
- tips journal
- sales journal
- COGS journal
- other controlled journal
- reconciliation exception

## Proposed Warehouse Model

These are design names only. No tables exist until a migration is explicitly
approved, reviewed, and applied.

### Configuration

| Proposed object | Grain and purpose |
| --- | --- |
| `quickbooks_connections` | One organization-owned QuickBooks realm with Vault token reference and health metadata |
| `quickbooks_studio_assignments` | One studio assignment to a QuickBooks connection with effective dates |
| `accounting_email_connections` | One Vault-backed Gmail OAuth connection per authenticated mailbox; four separate connections form the initial cohort |
| `accounting_receipt_inboxes` | One Gmail recipient address or alias routed to a QuickBooks connection |
| `accounting_email_messages` | One privacy-minimized immutable Gmail message ID and routing outcome for duplicate prevention |
| `quickbooks_accounts` | Read-only local cache of the connection's chart of accounts |
| `quickbooks_vendors` | Read-only local cache of normalized vendor identities |
| `accounting_classification_rules` | Versioned, scoped conditions and approved accounting outcome |
| `accounting_split_templates` | Versioned collection of percentage, fixed, remainder, or source-line allocations |
| `accounting_journal_templates` | Versioned journal source, schedule, balancing, approval, and reversal policy |

### Operational and Audit

| Proposed object | Grain and purpose |
| --- | --- |
| `accounting_work_items` | One durable unit of accounting work from collection through verification |
| `accounting_source_records` | One immutable source observation or document reference attached to a work item |
| `accounting_documents` | One stored-document metadata record; binary content remains in governed object storage |
| `accounting_match_candidates` | One scored possible relationship between a document/source record and work item |
| `accounting_proposals` | One versioned proposed vendor, transaction type, memo, and accounting treatment |
| `accounting_proposal_lines` | One proposed GL allocation line with amount, basis, and dimensional references |
| `accounting_approvals` | One actor decision on a proposal, including corrections and reason |
| `accounting_posting_attempts` | One idempotent QuickBooks write attempt and sanitized result |
| `accounting_state_events` | One append-only queue state transition |
| `accounting_reconciliation_results` | One read-back or period-control comparison and its outcome |

Source payloads, OAuth tokens, mailbox credentials, and document binaries must
not be stored in ordinary relational columns. Store only normalized accounting
facts, opaque secret references, governed file references, hashes, and sanitized
errors.

## Idempotency and Duplicate Prevention

Every source record requires a source-system natural key and payload hash. Every
QuickBooks write requires a stable idempotency key derived from the connection,
work item, approved proposal version, and action type.

Before creating an expense, bill, or journal, the automation must check:

1. whether the source record was already ingested;
2. whether a QuickBooks entity is already linked to the work item;
3. whether a likely native QuickBooks match exists;
4. whether the same approved proposal version already posted; and
5. whether a prior attempt may have succeeded before timing out.

After every write, the automation reads the QuickBooks entity back before the
work item can become `verified`.

## Document Matching

Receipt and invoice files are evidence, not independent permission to create an
expense. Candidate matching considers:

- exact and near-exact amount;
- transaction and document date proximity;
- normalized merchant/vendor identity;
- expected bank or card account;
- invoice/order/reference number;
- prior approved matches; and
- conflicting document or transaction links.

An unmatched document remains in review. A missing document receives a governed
status such as `requested`, `not_required`, `unavailable_with_reason`, or
`obtainable_from_source`. The system must never create both a receipt-derived
expense and a bank-derived expense for the same purchase.

## Classification and Learning

Classification is evaluated in this order:

1. exact active approved rule;
2. active vendor split template;
3. governed source-document line mappings;
4. repeated approved historical treatment;
5. configured vendor default;
6. AI-generated suggestion;
7. manual review.

Rules are explicit and versioned. Each rule includes company scope, optional
studio/account scope, merchant aliases or conditions, effective dates, outcome,
confidence policy, approval evidence, and priority. A correction becomes
evidence; it does not silently rewrite a rule. Rule promotion requires repeated
consistent approvals and an authorized actor.

## Splits

Every proposal contains one or more allocation lines. Supported allocation bases
are exact amount, percentage, remainder, receipt line, invoice line, studio, and
configured dimension. Validation requires:

- allocation lines sum exactly to the transaction total;
- all accounts belong to the selected QuickBooks connection;
- inactive accounts cannot be proposed or posted;
- rounding differences follow an explicit template rule; and
- sensitive accounts always require review.

## PTS Franchise Invoices

PTS invoices follow an invoice-first flow:

1. collect and preserve invoice evidence;
2. identify company, studio, invoice number, period, total, and lines;
3. apply approved franchise-fee mappings;
4. propose a QuickBooks bill or expense;
5. attach the invoice after approval; and
6. match the later bank payment to the existing record.

PTS unavailability delays only PTS work. It does not block receipt, QuickBooks,
or journal processing.

## Journal Controls

Payroll, tips, sales, COGS, and other journals use dedicated versioned templates
inside the same automation. A journal cannot be approved unless:

- total debits equal total credits;
- its source period and company are unambiguous;
- required source control totals reconcile;
- the journal-period idempotency key is new;
- all accounts are active and belong to the connection; and
- the configured reviewer approves it.

Journals remain approval-required until a later written control decision changes
that policy. COGS methodology must be explicitly configured; it is not inferred
silently from revenue.

## Automation Policy

Phase 1 is read-only. Later posting is enabled per connection and action type,
not globally.

Always-review items initially include:

- every journal entry;
- owner equity and distributions;
- loans, debt, assets, liabilities, and intercompany activity;
- payroll and sales-tax liabilities;
- unusual or high-value transactions;
- document/amount conflicts; and
- any allocation inferred without sufficient evidence.

Auto-posting requires an active approved rule, complete validation, sufficient
evidence, a configured amount ceiling, no sensitive account, and successful
read-back verification. A global emergency stop must disable all writes without
disabling read-only collection and reconciliation.

## Failure Isolation and Observability

The master workflow processes companies and work items independently. One failed
connection, malformed receipt, or unavailable PTS report becomes a scoped
exception while other work continues.

Each run reports at least:

- companies attempted and succeeded;
- source records and documents collected;
- matches accepted and awaiting review;
- proposed, approved, posted, and verified work items;
- missing-document counts and age;
- exceptions grouped by source/company; and
- reconciliation differences.

No operational log may contain OAuth tokens, mailbox credentials, document
contents, full card numbers, or unsanitized source errors.

## Delivery Phases and Gates

### Phase 0 — Architecture and controls

- [x] Confirm one master accounting automation and one work queue.
- [x] Define source responsibilities and ledger boundary.
- [x] Define queue lifecycle, learning model, and posting safeguards.
- [x] Draft the proposed warehouse objects and delivery gates.
- [ ] Confirm the four QuickBooks company-to-studio and receipt-inbox mappings.
- [x] Confirm receipt authentication shape: four separate Gmail addresses with four separate Google logins.
- [ ] Confirm accountant-approved chart, journal, and review policies.

### Phase 1 — Read-only QuickBooks foundation

- [x] Approve the schema and migration plan.
- [x] Prepare tenant-scoped QuickBooks connection configuration and Vault OAuth storage migration.
- [x] Prepare owner/admin OAuth connection and callback flow; keep unavailable until migration and Intuit configuration are deployed.
- [x] Prepare four independent Gmail OAuth connection flows and Settings visibility; keep unavailable until migration and Google configuration are deployed.
- [x] Prepare QuickBooks company visibility, expandable studio assignments, and chart-of-accounts review UI.
- [x] Implement the read-only QuickBooks collector and Vault credential-broker boundary.
- [x] Prepare one inactive, configuration-driven n8n workflow for company, account, vendor, posted-transaction, line, and cursor loading.
- [ ] Discover and explicitly map all four QuickBooks realms to studios.
- [ ] Import company metadata, chart of accounts, vendors, and transaction metadata read-only.
- [ ] Validate tenant isolation, token rotation, idempotency, and four-company coverage.

**Gate:** No expense, bill, attachment, match, or journal write is permitted.

### Phase 2 — Queue, receipts, and proposal-only classification

- [ ] Implement the durable work queue and state audit.
- [ ] Connect the four receipt inboxes and governed document storage.
- [ ] Match receipts to imported transaction metadata.
- [ ] Implement explicit rules, split templates, proposals, and corrections.
- [ ] Run proposal-only parity review for at least four normal accounting weeks.

**Gate:** Compare proposals with the accountant-approved outcome; no automatic
posting until accuracy and exception behavior are accepted.

### Phase 3 — PTS invoices and journal preparation

- [ ] Confirm the PTS franchise-invoice collection method and source contract.
- [ ] Implement invoice-first bill proposals and later bank-payment matching.
- [ ] Implement payroll, tips, sales, and COGS journal templates individually.
- [ ] Reconcile every journal type to documented source control totals.

**Gate:** Journals and new PTS bills remain approval-required.

### Phase 4 — Controlled QuickBooks writes

- [ ] Approve write scopes and rollback/recovery plan.
- [ ] Enable one action type for one company with amount ceilings.
- [ ] Attach documents and read back every posted entity.
- [ ] Reconcile the controlled sample with QuickBooks and source evidence.
- [ ] Expand company/action coverage only after each prior gate passes.

### Phase 5 — Governed learning and selective auto-post

- [ ] Promote repeated approved outcomes into versioned rules.
- [ ] Enable auto-post only for explicitly approved low-risk patterns.
- [ ] Monitor corrections, overrides, missing documents, and reconciliation drift.
- [ ] Provide an emergency stop and rule rollback.

## Current Checkpoint

Phase 1 was approved August 24, 2026. Migration
`20260824120000_quickbooks_read_only_foundation.sql` and the read-only source
contract and inactive workflow `32 - QuickBooks Read-Only Accounting Foundation`
are prepared. The warehouse migration was deployed August 24, 2026, and all 13
service-only tables/views were verified. The model is not limited to four
locations, and formal chart-of-accounts review is part of the Phase 1 validation
gate. No OAuth app, active n8n production workflow, QuickBooks company, or
accounting record has been changed in production. The next technical action is
Intuit sandbox and Google OAuth configuration, followed by inactive workflow
import. The QuickBooks and four-mailbox
Gmail OAuth/settings scaffolds compile but cannot be used before that deployment.
Workflow 32 is deliberately inactive and has not contacted the collector or
Supabase.
