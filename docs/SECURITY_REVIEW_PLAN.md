# Existing-System Security Review and Revision Plan

This plan evaluates the security of the Studio Intelligence system already built, prioritizes risk, and turns findings into verified improvements. It covers the Next.js dashboard, Railway collectors, n8n ETL, Supabase warehouse, integrations, GitHub, CI/CD, and operational access.

## Intended outcomes

- A current architecture and data-flow map
- An inventory of sensitive data, systems, vendors, credentials, and trust boundaries
- A threat model tied to real product behavior
- A prioritized, owned remediation backlog
- Evidence that critical controls work
- A documented decision for every unresolved risk

## Ground rules

- Review deployed services as well as code; configuration drift and vendor settings may not be visible in Git.
- Do not run destructive tests against production.
- Back up essential data and confirm rollback before high-risk changes.
- Put fixes in focused pull requests with tests and rollback notes.
- Do not silently break user workflows. Document migrations when a secure change affects behavior.
- If a likely active compromise is discovered, preserve evidence and switch to the incident-response process in `SECURITY.md`.

## Phase 1: Discovery and scoping

**Goal:** establish what exists and what matters.

Tasks:

- Inventory applications, API routes, collectors, n8n workflows, Supabase projects, databases, storage, domains, Railway services, GitHub workflows, analytics, support tools, and third-party integrations.
- Identify production, staging, and development environments and determine whether production data exists outside production.
- Map end users, administrators, support staff, developers, service accounts, and vendors.
- Map data from collection through processing, storage, reporting, export, backup, retention, and deletion.
- Find authentication, authorization, account recovery, administration, export, webhook, and integration paths.
- Identify applicable contractual, privacy, security, and regulatory obligations with qualified counsel where needed.
- Assign an owner to every system and data store.

Deliverables:

- System inventory
- Architecture and data-flow diagram
- Data classification and retention register
- Access and vendor register

## Phase 2: Immediate exposure check

**Goal:** identify issues that require containment before the full review finishes.

Check for:

- Secrets in current files, Git history, build logs, artifacts, issues, or documentation
- Public Supabase tables, storage buckets, databases, dashboards, admin panels, backups, or debug endpoints
- Missing or overly broad Supabase Row Level Security policies
- Default credentials, shared accounts, missing MFA, or inactive users with access
- Unprotected branches, overly broad CI tokens, and production secrets available to untrusted builds
- Known critical vulnerabilities in internet-facing dependencies or images
- Debug mode, verbose errors, source maps, directory listings, or sensitive status endpoints in production
- Missing authentication or object-level authorization on sensitive actions
- Unrestricted data exports, file uploads, webhooks, password resets, or administrative actions
- Railway, n8n, Supabase, Google, Meta, and Eulerity credentials with unnecessary scope

## Phase 3: Threat modeling

**Goal:** identify credible abuse and failure scenarios.

For each important workflow:

1. Identify assets and trust boundaries.
2. List entry points and privileged operations.
3. Consider spoofing, tampering, repudiation, information disclosure, denial of service, and privilege escalation.
4. Add product-specific abuse cases such as account takeover, data scraping, report manipulation, studio crossover, integration impersonation, webhook replay, prompt injection, and support impersonation.
5. Record existing controls, gaps, likelihood, impact, owner, and validation method.

Prioritize restricted data, administrative access, authentication, public APIs, multi-studio boundaries, exports, AI access, and irreversible actions.

## Phase 4: Code and configuration review

Review:

- Authentication, sessions, MFA, recovery, invitations, and email-change flows
- Authorization at route, service, object, reporting-view, and data-query layers
- Studio isolation and prevention of identifier-based cross-studio access
- Supabase Row Level Security, service-role usage, database grants, and storage policies
- Input validation, output encoding, query construction, redirects, and server-side requests
- File upload/download, archive extraction, media processing, and storage permissions
- API rate limits, pagination, resource limits, idempotency, and error handling
- Secret loading, log redaction, encryption, key management, and credential rotation
- Webhook authentication and replay resistance
- Browser security headers, cookie settings, CORS, CSRF protection, caching, and TLS
- Database migrations, backups, retention, export, and deletion behavior
- Railway and n8n network exposure, IAM, runtime hardening, and patch levels
- GitHub Actions permissions, third-party actions, artifact integrity, and deployment approvals
- Dependency provenance, abandoned packages, install scripts, and known vulnerabilities
- AI tool permissions, prompt-injection boundaries, private data exposure, and output validation

## Phase 5: Verification testing

Use a safe test environment representative of production.

Required tests:

- Negative authorization tests for every sensitive action
- Cross-user and cross-studio access attempts
- Login, logout, session expiry, revocation, MFA, reset, and recovery tests
- Supabase Row Level Security tests using anonymous, authenticated, and service roles
- Injection and unsafe-input tests appropriate to each interpreter
- Upload, download, path, content-type, size, and malware-handling tests where uploads exist
- Rate-limit and resource-exhaustion tests on abuse-sensitive endpoints
- Webhook forgery and replay tests
- Secret scanning across repository history and build artifacts
- Dependency, static code, infrastructure, container, and dynamic scans appropriate to the stack
- Backup restoration and credential-revocation tests
- Alerting tests for representative security events

High-risk or public systems should receive an independent penetration test after internal remediation and before launch or a major expansion.

## Phase 6: Prioritization and remediation

Score each finding using:

- Impact on confidentiality, integrity, availability, privacy, and business decisions
- Exploitability and required access
- Internet exposure and number of affected studios, users, or records
- Evidence of active exploitation
- Availability of compensating controls

Track every finding with:

| Field | Required value |
| --- | --- |
| ID and title | Unique, non-sensitive description |
| Affected asset | Component and environment |
| Risk | Scenario, likelihood, and impact |
| Evidence | Reproduction evidence, stored privately if sensitive |
| Severity | Critical, high, medium, or low |
| Owner | One accountable person |
| Due date | Based on `SECURITY.md` |
| Fix plan | Code/configuration change and migration |
| Verification | Test proving the fix |
| Status | Open, mitigating, fixed, accepted, or duplicate |

Order of work:

1. Contain active exposures and rotate compromised credentials.
2. Fix authentication, authorization, studio isolation, secrets, and public-data issues.
3. Reduce production, service-role, integration, and CI/CD privilege.
4. Patch exploitable dependencies and exposed infrastructure.
5. Improve monitoring, recovery, hardening, and lower-severity issues.

## Phase 7: Secure revision workflow

For each material fix:

1. Create a narrowly scoped private issue if details would enable exploitation.
2. Add a regression test that fails before the fix when practical.
3. Implement the smallest complete correction.
4. Obtain review from a second qualified person for security-sensitive changes.
5. Validate in a production-like environment.
6. Prepare rollout, migration, monitoring, and rollback.
7. Deploy gradually where possible and watch security and reliability signals.
8. Close the finding only after independent verification.

## Phase 8: Completion and ongoing assurance

The initial review is complete when:

- The inventory, data map, access list, and threat model reflect the deployed system.
- All critical findings are fixed and verified.
- High findings are fixed or have time-limited, explicitly approved mitigation.
- Security checks run in pull requests and deployments.
- Backup restoration, incident contacts, and priority alerts have been tested.
- Residual risks have named owners, expiration dates, and review dates.
- `SECURITY.md` reflects the actual system and includes a monitored reporting channel.

Afterward:

- Review new designs before implementation.
- Revisit the threat model for material features and integrations.
- Triage automated findings weekly.
- Review privileged access and restore backups quarterly.
- Exercise incident response and obtain risk-appropriate independent testing at least annually.
- Track security work alongside product work, with visible ownership and deadlines.

## Suggested first 30 days

| Time | Focus |
| --- | --- |
| Days 1–3 | Assign owners, inventory systems/data, enable MFA, check public exposure and leaked secrets |
| Days 4–7 | Map architecture and trust boundaries; review production, GitHub, CI/CD, Supabase, Railway, n8n, and vendor access |
| Week 2 | Threat-model critical workflows; review authentication, authorization, studio isolation, exports, and recovery |
| Week 3 | Run code/configuration/dependency scans; add negative security tests; begin critical/high fixes |
| Week 4 | Verify fixes, test backups and alerts, finalize residual risks, and approve or postpone launch |

## Project details to validate during the review

- Exact authentication and authorization design
- Data types, locations, retention periods, exports, and third-party processors
- Supabase projects, schemas, grants, service-role usage, Row Level Security, storage, and backups
- Railway services, public routes, secrets, networking, and deployment controls
- n8n hosting, workflow credentials, access controls, error data, and execution retention
- GitHub branch protections, Actions permissions, secret scanning, dependency tools, and environments
- Google Analytics, Eulerity, Meta, and future integration scopes and token lifecycles
- Current security tests, findings, incident contacts, reporting channel, and regulatory commitments

These details must be captured as evidence rather than inferred from documentation alone.