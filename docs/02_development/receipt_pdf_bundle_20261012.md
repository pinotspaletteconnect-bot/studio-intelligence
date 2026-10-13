# Receipt PDF service extension — October 12, 2026

Owner approved extending and deploying the existing PDF service for receipt
workflow02. No workflow01 or QBO writes. Baseline d4ae735 / Railway collector
deployment1e53b284-eb75-4373-8b21-7d04b4e7cf41 verified before implementation.

Add authenticated POST /receipt-pdf/bundle under the existing receipt token.
No access changes, new service, Docker changes, or schema changes. Inputs carry
stable company/message identity and2–8 complete PDF attachments with exact
size and SHA256. Total input <=20MB, <=100 pages; output <=45MB. Worker thread
has15s timeout and192MB old-generation limit. Same one-request gate as rendering.
Authentication precedes body parsing. Errors retain sources and fail closed.

Manifest lists every filename, length, page count and SHA256. All pages copied
in supplied order, and unmodified original PDF bytes embedded as files. This
preserves signed originals separately; the bundle itself is not a signed invoice.
No network requests, classification, posting, or archival in the bundler.

Existing /email rendering is unchanged except fixed-phase diagnostic logging
without receipt content. Live logs show browser startup SIGTRAP; underlying
runtime cause remains unverified. Deployment renews the service runtime, but
does not establish a permanent fix for the shared collector's startup problem.

Release: test synthetic documents + original-byte round trip, deploy this
isolated branch through a PR to the existing production source branch; verify
Railway active version, then authenticated n8n render/bundle checks before
connecting02d. Original single-PDF route remains available. Rollback: revert
this scoped release and restore02d export; multi-PDF jobs remain held.

Security audit: no reported pdf-lib dependency advisories. Existing axios,
proxy-addr and qs advisories are outside this receipt-only change; not upgraded
silently. Twelve focused route/bundle/collector-auth tests passed. Synthetic
manifest/page geometry visually checked; originals verified byte-for-byte.
