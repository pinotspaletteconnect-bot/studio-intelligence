# QuickBooks Online Read-Only Contract

> **Boundary update — August 30, 2026:** this contract records the validated
> Phase 1 prototype. n8n now owns QuickBooks credentials and collection, and the
> SASHA OAuth and broker routes described below no longer exist. Reuse the data
> contract and safety gates, not the superseded dashboard connection boundary.

**Phase:** 1 — foundation
**Status:** Migration deployed August 24, 2026; connection and source validation pending
**Date:** August 24, 2026

## Purpose

Define the read-only collector-to-warehouse boundary for QuickBooks Online before
OAuth is connected or any production data is requested. This contract supports
any future number of QuickBooks companies and studios. The current four companies
are the first validation cohort, not an architectural limit.

## Confirmed API Boundary

The QuickBooks Online Accounting API exposes company accounting entities such as
CompanyInfo, Account, Vendor, Purchase, Bill, BillPayment, Deposit,
JournalEntry, Transfer, and Attachable. These entities support a read-only source
cache and later controlled writes.

The pending transactions displayed in the QuickBooks Banking `For review` queue
are not represented as a standard public Accounting API entity in the documented
entity model. Phase 1 must not label posted Purchase or other ledger entities as
pending bank-feed records.

The pending-feed source remains an explicit discovery gate:

1. confirm behavior in an Intuit sandbox and one controlled company;
2. ask Intuit developer support to confirm current supported access;
3. evaluate a direct bank-data source only if needed and separately approved; and
4. do not use browser automation against QuickBooks without a security and terms
   review.

This limitation does not block chart-of-accounts review, vendor normalization,
posted-ledger analysis, receipt capture, journal design, or the shared accounting
queue.

## Authentication and Company Identity

Each OAuth authorization is stored as one `quickbooks_connections` row keyed by
organization and QuickBooks `realm_id`. Multiple realms may be authorized by the
same Intuit user, but they remain independent ledger connections.

Only an opaque Supabase Vault UUID is stored in the connection row. The Vault
secret contains the per-connection refresh credential. The Intuit application
client ID and secret belong in the authorized server environment and must not be
repeated in each warehouse record.

Every Phase 1 connection is forced to:

```text
write_enabled = false
write_pause_reason = "Phase 1 read-only foundation"
```

There is no database posting RPC in the Phase 1 migration.

The dashboard OAuth scaffold requires these server-only environment variables:

- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_OAUTH_STATE_SECRET`
- `QUICKBOOKS_ENVIRONMENT` set to `sandbox` or `production`; it defaults to
  `sandbox` so an omitted value cannot accidentally target production

The registered Intuit redirect URI must end with
`/api/integrations/quickbooks/callback` on the trusted dashboard origin. No
credential value belongs in Git or ordinary warehouse tables.

Accounting Gmail OAuth requires these server-only environment variables:

- `ACCOUNTING_GMAIL_CLIENT_ID`
- `ACCOUNTING_GMAIL_CLIENT_SECRET`
- `ACCOUNTING_GMAIL_OAUTH_STATE_SECRET`

Its registered Google redirect URI must end with
`/api/integrations/accounting-gmail/callback`. The dashboard initiates one OAuth
flow per mailbox and requires explicit Google account selection so the four
separate logins cannot be accidentally represented as one connection.

## Collection Target

The service-only `quickbooks_collection_targets` view returns:

- organization and connection IDs;
- connection label and realm ID;
- company name and connection health;
- explicit active studio assignments;
- studio code, name, and timezone; and
- the write-disabled state.

The view never returns OAuth credentials. A connection may map to multiple
studios. A studio may have only one current active QuickBooks connection, while
effective-dated history is preserved.

## Gmail Receipt Routing

Receipt intake uses Vault-backed Gmail OAuth connections. The initial deployment
has four separate Gmail addresses with four separate Google logins, so each
mailbox is authorized independently and routed to its corresponding QuickBooks
company:

```text
Gmail login / OAuth connection
  -> receipt address
      -> configured QuickBooks connection
          -> assigned studio or studios
```

The four current receipt addresses therefore have four independent Vault secret
references. No Google refresh credential is shared across mailboxes. Future
locations add another Gmail connection, routed address, and company/studio
assignment without changing code. The schema still permits aliases or multiple
routes per Gmail connection if a future operating model uses them.

Collection uses the least-privileged practical Gmail scope,
`https://www.googleapis.com/auth/gmail.readonly`, to read message headers and
receipt attachments. This is a Google restricted scope and may require OAuth app
verification and additional security review before production use. The system
does not request send, compose, label-modification, trash, or permanent-delete
permissions during receipt ingestion.

The immutable Gmail message ID is the ingestion natural key. Routing examines
the delivered recipient headers and configured Gmail label when present. A
message matching no address becomes `unmatched`; a message matching conflicting
routes becomes `ambiguous`; neither may create accounting work automatically.

The relational collection ledger stores message ID, thread/history IDs, Gmail
internal date, sender domain, attachment count, and routing outcome. It does not
store message bodies or subjects. Receipt binary files remain deferred to the
Phase 2 governed document-storage design.

## Collector Response Envelope

Every read-only collector response uses this envelope:

```json
{
  "connectionId": 123,
  "realmId": "opaque-numeric-realm-id",
  "entityType": "accounts",
  "retrievedAt": "2026-08-24T12:00:00.000Z",
  "sourceMaxUpdatedAt": "2026-08-24T11:57:00.000Z",
  "nextCursor": null,
  "records": [],
  "warnings": []
}
```

The collector authenticates and queries Intuit, paginates source responses, and
returns structured source data. It does not select studios, write Supabase rows,
standardize account names, assign GL categories, or decide approval policy.

### Collector routes

All collection routes require the existing `COLLECTOR_API_TOKEN` bearer token.

| Route | Purpose |
| --- | --- |
| `GET /quickbooks/health` | Non-secret readiness and sandbox/production mode |
| `POST /quickbooks/company-info` | CompanyInfo for one configured connection ID |
| `POST /quickbooks/accounts` | Paginated Account entities |
| `POST /quickbooks/vendors` | Paginated Vendor entities |
| `POST /quickbooks/transactions` | One allowlisted posted transaction entity type per call |

The initial posted-transaction allowlist is Bill, BillPayment,
CreditCardPayment, Deposit, JournalEntry, Purchase, Transfer, and VendorCredit.
QuickBooks represents checks as `Purchase` records with `PaymentType = Check`;
they are not queried as a separate `Check` entity. The route does not accept
arbitrary entity names or SQL fragments.

The collector requires these server-only values:

- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_ENVIRONMENT`, defaulting to `sandbox`
- `QUICKBOOKS_SECRET_BROKER_URL`
- `QUICKBOOKS_SECRET_BROKER_TOKEN`
- `COLLECTOR_API_TOKEN`

The dashboard secret broker resolves a connection by opaque internal ID, returns
the Vault refresh credential only to the authenticated collector, and sets
`Cache-Control: no-store, private`. Short-lived Intuit access tokens exist only
in collector memory and are never returned in a collection response.

## Entity Contracts

### Company information

Required normalized fields:

- realm ID
- company name
- country code
- home currency
- fiscal-year start month when available
- source retrieval timestamp

Company discovery updates only connection metadata and health timestamps.

### Accounts

One record per QuickBooks account ID:

- source account ID
- account name and fully qualified name
- account number
- account type, subtype, and classification
- parent account ID and subaccount flag
- currency
- active status
- current balances when returned
- sync token and source modification timestamps
- retrieval timestamp

The source chart is never rewritten during collection. Accountant review lives
in `quickbooks_account_reviews` and preserves the original QuickBooks fields.

### Vendors

One record per QuickBooks vendor ID:

- source vendor ID
- display and company names
- vendor account number when present
- deterministic normalized matching name
- 1099 flag
- currency and active status
- sync token and source modification timestamps
- retrieval timestamp

Do not collect vendor tax identifiers, bank details, personal email addresses,
phone numbers, or street addresses for this accounting-classification use case.

### Posted transactions

One header per QuickBooks transaction entity ID and type, with zero or more
normalized lines. Initial permitted types are retrieved from the documented API
entity set and may expand without a schema redesign.

Header fields include:

- transaction ID and type
- transaction date and document number
- counterparty type, ID, and display name
- bank or accounts-payable account reference
- total, currency, and exchange rate
- posted, voided, or deleted source status
- sync token and source timestamps
- SHA-256 hash of the normalized source representation
- retrieval timestamp

Line fields include amount, posting type, account reference, class, department,
customer, vendor, item, and tax-code references when applicable. Private notes are
not stored; only a boolean indicating their presence is retained. When Intuit
does not provide a usable source line ID, ETL creates a deterministic ID from the
transaction type, transaction ID, line position, and normalized line content.

### Attachments

Attachment metadata and binary collection remain disabled until receipt storage,
retention, malware scanning, and file-access policy are approved in Phase 2.

## ETL and Idempotency

n8n owns validation, normalization, UPSERT behavior, cursor maintenance, retry,
and integration-run auditing.

Natural keys:

| Destination | Natural key |
| --- | --- |
| `quickbooks_connections` | organization + realm ID |
| `quickbooks_studio_assignments` | connection + studio + effective-from date |
| `accounting_email_connections` | organization + provider + Gmail account email |
| `accounting_receipt_inboxes` | Gmail connection + recipient address |
| `accounting_email_messages` | Gmail connection + immutable message ID |
| `quickbooks_accounts` | connection + source account ID |
| `quickbooks_vendors` | connection + source vendor ID |
| `quickbooks_transactions` | connection + transaction type + source transaction ID |
| `quickbooks_transaction_lines` | connection + transaction type + source transaction ID + source line ID |
| `quickbooks_sync_cursors` | connection + entity type |

A retry must retain warehouse IDs. A full directory refresh marks missing source
accounts or vendors inactive only after all pages finish successfully. A partial
or failed run must never deactivate unseen records.

## Chart-of-Accounts Review

The initial review covers all active and inactive accounts from every connected
company. The service-only `quickbooks_chart_of_accounts_review` view places source
account fields and governed review metadata in one comparison directory.

Review sequence:

1. inventory each company's full chart and account hierarchy;
2. compare account numbers, types, subtypes, names, and active status;
3. identify accounts that are aligned across all companies;
4. identify naming differences that can share a canonical reporting key;
5. flag duplicates, unused accounts, type/subtype conflicts, and missing accounts;
6. obtain accountant decisions before changing any QuickBooks account; and
7. create later classification rules against source account IDs and approved
   canonical keys, never against account names alone.

Review statuses are `pending`, `aligned`, `rename_recommended`,
`merge_recommended`, `inactive_recommended`, `mapping_required`, and
`accountant_review`.

No chart change is made through Phase 1. Recommendations and accountant decisions
are recorded separately from the source cache.

## Phase 1 Validation Gates

- [x] Migration reviewed and applied to the linked Supabase project.
- [x] Owner/admin OAuth route scaffold compiled; it remains unavailable until configuration and migration deployment.
- [x] QuickBooks Settings controls compile for company connection, multi-studio assignment, and per-company chart review.
- [x] Read-only collector, credential broker, pagination, and posted-entity allowlist implemented and covered by automated tests.
- [x] One inactive n8n workflow prepared for all configured companies, read-only collection routes, normalized warehouse UPSERTs, and sync-cursor maintenance.
- [ ] Intuit development app and redirect URIs configured.
- [x] Four-mailbox Gmail OAuth and Settings scaffolding compiled with read-only scope.
- [ ] Gmail OAuth app verification/security requirements confirmed.
- [ ] All four Gmail accounts independently connected with read-only scope and each recipient route configured.
- [ ] OAuth validated with an Intuit sandbox.
- [ ] One controlled company connected read-only.
- [ ] Company, account, and vendor counts reconciled with QuickBooks exports.
- [ ] Posted transaction sample reconciled by type, count, and total.
- [ ] All four current companies authorized independently.
- [ ] Every current studio explicitly assigned; no orphan or cross-tenant mapping.
- [ ] Full four-company chart-of-accounts comparison completed.
- [ ] Refresh-token rotation and reconnect behavior validated.
- [ ] Repeated syncs retain IDs and create no duplicate natural keys.
- [ ] Import workflow validated against fixture data, then one Intuit sandbox company.
- [ ] Pending bank-feed access decision recorded with evidence.

Only after these gates pass may Phase 2 receipt and proposal work begin. None of
these gates authorizes QuickBooks writes.
