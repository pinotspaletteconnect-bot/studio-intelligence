# Security Policy and Plan

This document defines how Studio Intelligence protects its systems and data. It applies to the Next.js dashboard, Railway collection services, n8n workflows, Supabase warehouse, third-party integrations, CI/CD, logs, backups, and operational processes.

Security is a shared responsibility. No system can be guaranteed impossible to breach; this project uses layered controls to reduce the likelihood and impact of an incident.

## Security objectives

- Protect the confidentiality, integrity, and availability of business and customer data.
- Collect and retain only the data necessary for the product.
- Apply least privilege to people, applications, services, and automation.
- Build security checks into development and deployment.
- Detect, contain, recover from, and learn from security incidents.

## Ownership

| Responsibility | Owner |
| --- | --- |
| Security program and risk acceptance | Project owner |
| Secure implementation and remediation | Engineering lead |
| Production access and infrastructure | Operations owner |
| Privacy, retention, and data requests | Data/privacy owner |
| Incident coordination and communication | Incident commander |

Named owners and backups must be recorded before production launch.

## Data protection

1. Maintain an inventory of data collected, generated, stored, transmitted, logged, and shared with vendors.
2. Classify data as public, internal, confidential, or restricted. Credentials, authentication data, financial data, government identifiers, and sensitive personal data are restricted.
3. Document every data flow, storage location, processor, retention period, deletion path, and business purpose.
4. Minimize collection. Never place secrets or unnecessary personal data in source code, URLs, analytics, logs, error messages, test fixtures, or support tools.
5. Encrypt traffic with modern TLS and encrypt confidential or restricted data at rest.
6. Use synthetic or de-identified data in development and testing unless an exception is approved.
7. Define automated retention and deletion, including backups and vendor-held copies.
8. Encrypt backups, restrict access, and test restoration at least quarterly.

## Identity and access

- Require multi-factor authentication for GitHub, Supabase, Railway, n8n, production administration, and other high-impact systems.
- Prefer phishing-resistant MFA for privileged accounts.
- Prohibit shared human accounts and use single sign-on where practical.
- Grant the minimum access needed and separate production from non-production.
- Review privileged access quarterly and whenever a person changes role or leaves.
- Use narrowly scoped service identities; automation must not use personal credentials.
- Rate-limit and monitor login, account recovery, password reset, and administrative actions.
- Use short-lived secure sessions and rotate sessions after login or privilege changes.

## Application security

- Validate input on the server and encode output for its context.
- Use parameterized queries or safe ORM APIs; never construct database queries from untrusted input.
- Enforce authorization on every protected server-side action and object. Deny by default.
- Verify studio and tenant boundaries at the service and data-query layers.
- Protect cookie-authenticated state-changing requests against cross-site request forgery.
- Apply a restrictive Content Security Policy and appropriate browser security headers.
- Restrict file types, sizes, and storage behavior for uploads; isolate untrusted files where needed.
- Never place secrets or privileged decisions in client-side code.
- Avoid exposing internal errors, stack traces, tokens, personal data, or infrastructure details.
- Apply request limits, timeouts, quotas, and rate limits to abuse-prone operations.
- Authenticate webhooks and protect them against replay.
- Treat AI input and output as untrusted, isolate tools, restrict data access, and enforce authorization outside the model.

Use the OWASP Application Security Verification Standard as the verification baseline and the OWASP Top 10 as an awareness aid.

## Secrets and cryptographic keys

- Store secrets in approved secrets managers or protected deployment environments, never in Git.
- Keep `.env` files, private keys, tokens, database dumps, cookies, and session files out of version control.
- Scan commits and build artifacts for secrets and enable GitHub push protection where available.
- Rotate exposed credentials immediately. Removing a secret from the latest commit is not sufficient.
- Assign an owner, purpose, scope, creation date, and rotation approach to each production secret.
- Use maintained cryptographic libraries and provider primitives; do not design custom cryptography.

## Dependencies and software supply chain

- Commit lockfiles and use reproducible, reviewed builds.
- Enable automated dependency alerts and security update pull requests.
- Scan dependencies, containers, and deployment artifacts for known vulnerabilities.
- Pin CI/CD actions and high-risk build dependencies to trusted immutable versions where feasible.
- Review new dependencies for necessity, maintenance, ownership, permissions, and install scripts.
- Generate a software bill of materials for releases where practical.
- Protect releases from unreviewed changes and sign or attest artifacts where feasible.

## Source control and CI/CD

- Protect default and release branches.
- Require pull requests, independent review, passing security and quality checks, and resolution of review comments.
- Require code-owner review for authentication, authorization, infrastructure, workflow, and security-policy changes.
- Restrict direct pushes, force pushes, branch deletion, and administrative bypass.
- Give CI jobs minimum token permissions and never expose production secrets to untrusted pull requests.
- Separate build and deployment duties and require explicit production approval when risk warrants it.
- Retain audit logs and protect build artifacts from replacement.

Recommended automated checks include secret scanning, dependency scanning, static analysis, infrastructure and container scanning where applicable, and authentication/authorization tests.

## Infrastructure and operations

- Define infrastructure as code and review changes through pull requests.
- Separate production and non-production accounts, data, networks, and credentials.
- Default network access to private or denied and expose only required services.
- Patch supported operating systems, runtimes, databases, and services on a documented schedule.
- Harden Railway, Supabase, n8n, storage, and related services against vendor guidance and suitable benchmarks.
- Use managed DDoS protection, web application firewalling, and database safeguards where justified.
- Maintain tested rollback, disaster recovery, and business continuity procedures.

## Logging, monitoring, and detection

Log security-relevant events including authentication results, account recovery, MFA or credential changes, permission changes, administrative actions, access to restricted data, secret/configuration changes, deployments, and CI/CD policy bypasses.

Logs must be structured, access-controlled, protected from alteration, time-synchronized, and retained according to policy. Never log passwords, session tokens, API keys, full payment data, or unnecessary personal data. Alert on meaningful patterns and test alert delivery.

## Vulnerability management

| Severity | Target response |
| --- | --- |
| Critical, known or likely exploitation | Triage immediately; contain or mitigate within 24 hours |
| High | Triage within 2 business days; remediate within 14 days |
| Medium | Remediate within 60 days |
| Low | Remediate within 120 days or document acceptance |

Targets may be shortened based on exposure, exploitability, and data impact. Exceptions require a documented owner, compensating controls, expiration date, and approval.

## Incident response

1. **Prepare:** maintain contacts, access, backups, logging, procedures, and communication templates.
2. **Detect and assess:** preserve evidence, start an incident record, classify severity, and identify affected systems and data.
3. **Contain:** revoke or rotate affected credentials, isolate systems, block malicious activity, and preserve evidence.
4. **Eradicate and recover:** remove the cause, patch weaknesses, restore trusted systems, validate integrity, and increase monitoring.
5. **Communicate:** notify affected parties, customers, insurers, regulators, or law enforcement when required. Legal deadlines must be evaluated by qualified counsel.
6. **Learn:** complete a blameless review, assign corrective actions, and verify completion.

Do not destroy evidence or make public attribution without appropriate technical and legal review.

## Security testing cadence

| Activity | Minimum cadence |
| --- | --- |
| Automated checks | Every pull request and default-branch build |
| Dependency and vulnerability triage | Weekly |
| Privileged access review | Quarterly |
| Backup restoration test | Quarterly |
| Threat-model review | At major design changes and at least annually |
| Incident-response exercise | At least annually |
| Independent penetration test | Before a high-risk launch and annually thereafter, based on risk |
| Policy review | Annually and after material incidents or architecture changes |

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities.

Until a dedicated private reporting channel is configured, contact the project owner privately. The repository owner must replace this statement with a monitored security email or GitHub private vulnerability reporting instructions before the project is publicized further.

Reports should include the affected component, reproduction steps, impact, and suggested mitigation. The team will acknowledge receipt, coordinate validation and remediation, and avoid retaliation for good-faith research that respects privacy and does not disrupt service.

## Production launch gate

Production launch or a major expansion requires:

- Named security and incident owners
- Completed data inventory and threat model
- No unresolved critical or high vulnerabilities without approved, time-limited exceptions
- MFA and least-privilege access for critical systems
- Protected branches and required security checks
- Validated secrets handling and rotation
- Tested backup restoration and incident contacts
- Monitoring for authentication, authorization, administrative, and data-access events
- Privacy notice, retention rules, and vendor agreements appropriate to collected data

## Related review plan

See [`docs/SECURITY_REVIEW_PLAN.md`](docs/SECURITY_REVIEW_PLAN.md) for the staged review and revision process for the existing system.