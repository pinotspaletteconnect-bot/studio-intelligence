# Explicit account1 recovery dates (draft, not deployed)

The deployed PR134 collector remains at b4c46f2. This candidate changes only its account1 recovery module and routes. Existing generic Eulerity endpoints, legacy browser/parser source and account2/HB behavior are unchanged. No production deployment, n8n edits, mappings, source reactivation or warehouse writes are performed by this draft.

## Request and source verification

Discovery keeps its existing account1-only contract; it does not download dated metrics. Download now requires:

`POST /eulerity/account1-recovery/download` with JSON `{ "accountId": 1, "fromDate": "2026-11-09", "toDate": "2026-11-15" }`.

Dates must be real ISO calendar dates, an inclusive1–31-day range, and completed days relative to the collector's current UTC calendar date. Missing, reversed, invalid, current-day/future or excessive ranges return400 before credential resolution/browser launch. Source dates remain calendar dates; no midnight timezone conversion, current-total relabeling or interpolation is used. Browser calendar navigation is bounded to60 month steps; unavailable dates fail closed.

Broker targets must be exactly the four approved studio IDs1–4 in account1/org1, with unique configured source keys and safe unique studio codes. Keys and labels come from configuration; no studio/key assignment is guessed. Missing, duplicate, __single__ or cross-scope targets stop before collection. Caller-supplied targets are ignored.

For each campaign, the browser selects by the configured source key, verifies the exact displayed campaign and waits for its export link to refresh after a campaign change. It opens Ads Displayed/BY CHANNEL, explicitly clicks BOTH requested dates even if defaults already match, waits for in-flight report requests and visible chart loading to finish, verifies displayed dates/report identity/campaign and then downloads metrics. An unresolved loading state fails rather than exporting. It separately repeats both date selections and checks on Advertising Budget before downloading spend. It never opens Budget Distribution. The selectors use the observed react-datepicker wrappers, current-month heading, and exact accessible day names; live read-only DOM inspection confirmed them without changing source date values.

Both raw CSVs must contain exactly one row for every requested day, with no extra, missing or duplicate dates. Every metric channel/count/CTR column must exist and have valid nonnegative numeric source values; count fields must be integral. Spend requires the source export columns and exact selected campaign name. Metrics Date is source YYYYMMDD; spend Date is source M/D/YYYY. Activation Date remains metadata. Parsed rows must retain their raw source dates AND numeric values. All four studio files must validate before any success response; a bad later studio produces no partial result. Temporary files are removed on success or failure.

## Unsupported historical costs: explicit hold

Success is a verified SOURCE collection response, not warehouse-write approval. Schema version2 returns `sourceDatesVerified: true`, but `warehouseReady: false` and `costAllocationStatus: "unverified"`. Each studio has `budget: null` and `historicalChannelSpend: null`, alongside verified metrics, dated total spend and per-report source range evidence. The response drops the spend export's user email. It does not scrape current budget percentages or derive historical channel costs from them.

The existing full-row ETL uses current budget percentages to allocate daily spend, defaulting missing budget values to zero. It MUST NOT consume schema2 through those transformations. The draft validate-results.js guard explicitly stops unverified schema2 data BEFORE Expand Daily Metrics/Attach Studio ID/upsert. The draft builder adds fixed fromDate/toDate fields to its gated download request and preserves both disconnected write nodes; the existing dry-run graph is expected to HOLD at that guard until a truthful historical-cost load contract is separately reviewed. The collector itself already validates7dates ×4studios in BOTH source CSVs and provides verified rows for reconciliation.

Do not replace unsupported historical channel spend, CPC or budget percentages with zeros, current percentages or interpolated values. No warehouse schema or existing transformations are changed here. A later decision may authorize a partial-column load that preserves unsupported fields, or establish verified historical cost evidence; this draft does neither. Existing imported workflows need an independently reviewed request/guard update after deployment because their old body lacks the now-required dates. They are not modified by this work.

## Validation and rollout hold

Local tests cover explicit calendar clicks before BOTH downloads, month navigation, unavailable dates, report/campaign/range mismatch, stale exported dates despite correct labels, all-four scope, raw/parsed value identity, malformed/missing/duplicate dates, CSV schema/number checks, invalid request rejection before broker access, cleanup and historical-cost hold. Legacy module and generic route hashes still match their deployed sources, including the HB __single__ regression.

Independent review must approve the date contract, source selectors, CSV validation and truthful unavailable-cost fields before any deployment. After a separately approved candidate deployment, run the coordinator's authenticated no-write account1 request with explicit Nov9–15 dates, inspect all four sourceEvidence records/eight CSV date sets and exact source values (two sets perstudio;28 metric rows and28 spend rows), reconcile totals against Eulerity, and confirm warehouseReady remains false. Keep warehouse writes disconnected. No live candidate validation or historical cost readiness is claimed by local fixtures.

Alert and source-reactivation drafts in adjacent folders are separate, uncommitted local preparation and are not included in this PR or overwritten. Their previously supplied deployment artifact hashes remain unchanged.
