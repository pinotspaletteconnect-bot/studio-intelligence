# Authentication, Onboarding, and Tenant Security

## V1 scope

Studio Intelligence uses invite-only Supabase Auth with server-managed cookie
sessions. Public self-registration is intentionally unavailable. Every user is
assigned to an organization with one role: owner, administrator, manager, or
viewer. Owners and administrators inherit all active studios in their
organization; managers and viewers receive explicit studio grants.

New users receive their organization membership, role, and studio grants before
credentials are handed off. SASHA generates a strong temporary password,
displays it once to the owner or administrator, and stores only the Supabase
Auth hash. It expires after 24 hours and is replaced when the user first signs
in. The forced-change flag is enforced by login, the route proxy, protected
server contexts, and the password action; it is not merely a browser redirect.
The membership stays `invited`, so tenant RLS excludes the account from
business data until permanent-password creation and onboarding are complete.

Custom transactional SMTP remains required before public onboarding launch for
password recovery and automated email delivery. Supabase's restricted default
mailer is not a production delivery mechanism.

If an owner invites an email whose Auth identity already exists with an invited
or suspended membership in the same organization, SASHA reactivates that
membership as invited, replaces its role and studio grants with the submitted
permissions, and issues a fresh temporary password. It never creates a duplicate Auth
identity or silently attaches an existing identity from another organization.

The dashboard protects data in three layers:

1. Next.js proxy session refresh and route gating.
2. Server-side membership and studio authorization on every API request.
3. Supabase RLS plus revoked browser grants. Reporting continues through the
   server-only service secret, and every service query receives the caller's
   allowed studio IDs.

The service secret and secret-provider access must never use a `NEXT_PUBLIC_`
environment variable or appear in browser bundles, logs, action results, or
error messages.

## Required deployment configuration

The V1 production dashboard is deployed at
`https://proud-manifestation-production-3f2d.up.railway.app`. Railway service
`studio-intelligence-dashboard` uses `dashboard/` as its root and tracks
`codex/auth-onboarding` during the controlled rollout.

- `APP_URL` (the canonical HTTPS dashboard origin used for invite and recovery links)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or the legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVER_SECRET` (server only)
- Dashboard production URL in Supabase Auth Site URL and redirect allow list
- Custom SMTP for production invitations and password recovery
- `AUTH_CUSTOM_SMTP_CONFIGURED=true` only after custom SMTP and recovery delivery
  have passed production validation; this controls the public-launch readiness
  gate and must not be used to claim readiness before testing
- Strong password policy, leaked-password protection when available, CAPTCHA,
  and appropriate Supabase Auth rate limits
- Password-change and other security-notification emails enabled

For SSR, configure the hosted Supabase Invite and Recovery email links to use
the server confirmation endpoint:

```html
<!-- Invite -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/onboarding">Accept invitation</a>

<!-- Recovery -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a>
```

Disable email-link tracking. If the customer email platform prefetches links,
use an explicit confirmation page or OTP flow so security scanners cannot
consume single-use links.

## Location logins and API credentials

Connection onboarding collects non-sensitive metadata separately from secrets:

- organization, studio, integration type, external account/location ID;
- an operator-friendly account label;
- secret provider and opaque secret reference;
- validation status and last validation timestamp.

The username/password, API key, refresh token, or client secret uses a one-time
TLS server handoff. The server authenticates an owner or administrator,
revalidates their recent session (and later MFA), validates input size, writes
the secret to the approved encrypted provider, and stores only the returned
opaque reference in `integration_secret_references` or the applicable
integration configuration. Secret values are never readable through the UI.

Supabase Vault is the preferred next provider to validate because it uses
authenticated encryption and keeps the project encryption key separate from
the database. Until its permissions, collector retrieval path, rotation, and
audit behavior are tested, credential entry remains disabled. Existing Railway
variables remain the production source for current collectors.

### Existing-account studio onboarding

The first controlled studio-onboarding path may reuse an active PTS credential
reference already owned by the organization. An owner or administrator enters
the studio metadata and non-secret PTS location ID; the server verifies that
the brand and PTS account belong to the caller's organization, rejects duplicate
studio codes and PTS locations, creates the studio, and writes its active
`studio_integrations` mapping. No username or password is collected, returned,
or copied. This path is appropriate for adding a location already accessible to
the organization's existing PTS login. A new organization or a location using
a different login still requires the encrypted one-time secret handoff above.

### Persistent workspace setup

Owners and administrators have a Workspace Setup checklist under Settings. It
derives readiness from existing organization, brand, studio, PTS mapping,
secured account-reference, membership, and warehouse fact records; it does not
duplicate that state in a separate onboarding table. Credential readiness
requires a successful Vault/broker validation timestamp. Mapping readiness
requires every active studio to resolve to a validated account. First-run
readiness reuses the production Data Upload Status freshness contract and
requires current Daily Sales, Product Sales, completed Class Sales, Upcoming
Classes, and Reservations coverage for each studio; merely having an old row no
longer marks a studio ready. The page separately reports controlled-workspace
readiness and the custom-SMTP gate required for public onboarding.

The implemented next-stage handoff uses Supabase Vault and a dedicated
server-to-server broker token. The dashboard alone holds the Supabase
service-role secret. The collector exchanges an opaque PTS account ID for that
account's decrypted credential and mapped studios over TLS; neither the Vault
credential nor the broker token is exposed to n8n or browser code. Production
activation requires migration `20260805190000`, matching
`PTS_SECRET_BROKER_TOKEN` values on the dashboard and collector, and
`PTS_SECRET_BROKER_URL` on the collector.

## Production activation checklist

1. Review and apply migration `20260805110000_auth_tenant_foundation.sql`.
2. Configure Auth URLs, email templates, SMTP, password controls, CAPTCHA, and
   security notifications.
3. Add the publishable key to the dashboard deployment; keep the secret key
   server-only.
4. Invite the first owner through Supabase Auth and insert their owner
   membership through a controlled administrative step.
5. Test unauthenticated route/API denial, cross-organization isolation,
   manager/viewer studio restrictions, logout, expired links, and recovery.
6. Test owner/admin invitations and default-off benchmark consent.
7. Perform a security review before production deployment.

Do not activate login in production before the migration, first-owner
membership, and deployment variables are all in place; otherwise the secure
default is to deny dashboard access.
