# Connect your studio to SASHA

September 19, 2026 · Assisted test-user guide

This guide takes you from your first sign-in to verified studio reporting in Studio Intelligence, called SASHA in the application. Your private workspace must be prepared before you begin. Some connection screens exist but still need a first import verified for your account. A saved password or green connection badge alone does not mean your reports are ready. You can check your own setup in SASHA; another studio owner cannot open your workspace from their SASHA login.

**Current pilot checkpoint (September 24):** the Huntington Beach workspace and studio exist, and its owner can use an existing SASHA login. Jennifer saved her PTS login, and Huntington Beach is mapped to PTS location 194. A read-only PTS sign-in and September 23 Sales Report check succeeded. Supervised account-scoped imports saved September 23 Daily Sales ($532.03 net sales, 15 seats sold), three Product Sales rows, 27 Class Sales rows, 187 Upcoming Classes snapshots, and 20 Reservations rows. Each feed has organization 3 and studio 5 keys and is present in its live reporting view. Jennifer should confirm the visible figures and studio scope from her own SASHA login before onboarding is considered complete.

## 1. Get your workspace invitation

Agree with the onboarding operator on your studio name, business name, preferred email address, and the systems you want to connect. They will provide the current SASHA website address and your initial access details through the agreed private channel.

**If you already used SASHA in another workspace:** your existing login can be assigned to your new business without issuing another invitation. Sign in with your current email and SASHA password. Check that you see only your new business and studios. The onboarding operator checks the membership change in the backend because another workspace owner cannot inspect it in SASHA. You may be asked to accept the current legal documents for the new business.

Your business should have its own workspace. Do not continue if you see another owner's studio or business name. Your role must be Owner or Administrator to connect accounts.

If you receive a temporary password, use it within 24 hours. If it expires, ask the onboarding operator to issue a replacement. Do not create a second account to work around a sign-in problem.

**Finished when:** you have the correct website address and access to your own workspace.

## 2. Gather what you need

Start with PTS for operations reporting. Connect other systems only if your studio uses them and they are included in your agreed test. You do not need to purchase another service to finish onboarding.

| System | Have ready | Where you enter it |
| --- | --- | --- |
| Your studio | Studio name, short studio code, city, state, time zone, PTS location ID | SASHA studio setup |
| PTS | PTS username and password with access to your studio and its reports | SASHA's secured PTS form |
| Google Analytics 4 | Google account that can view your studio's Analytics property; property name and numeric property ID for comparison | Sign in on Google's screen; select the property in SASHA |
| Meta | Facebook account with access to your business portfolio, ad account and Page | Sign in on Meta's screen; select the assets in SASHA |
| Eulerity | Eulerity email/login and password; expected location names | SASHA's secured Eulerity form |
| MNTN | Advertiser ID and Reporting API key | SASHA's secured MNTN form |
| Homebase | Owner login email and password, read-only API key, and location UUID | SASHA's secured Homebase form |
| Textellent | API authentication code and sending number with country code | SASHA's secured Textellent form, if included in the test |

Keep passwords and keys in your password manager until you enter them into the secured form. Do not put them in this checklist, email, chat, screenshots, or a shared spreadsheet. Your SASHA password and each vendor's password are different fields.

For Google and Meta, SASHA obtains the token through their authorization screens. You do not need to create a developer app, copy a token, or give the onboarding operator your Google or Facebook password.

**Finished when:** you can sign in to each selected vendor and see the correct studio or account.

## 3. Secure your SASHA account

1. Open the SASHA address provided by the onboarding operator and sign in.
2. If prompted, replace your temporary password with a unique password of at least 12 characters. Save it in your password manager.
3. Enter your name.
4. Read the Terms of Service and Privacy Policy and complete the required acknowledgments.
5. Decide whether to participate in reciprocal benchmarks. This is optional and starts off; it is not required for your own studio reporting.
6. Complete account setup.
7. Open **Settings → Workspace Setup**. The current application may first send you to the dashboard; account setup does not finish your studio connections.

**Finished when:** you can return to Settings under your own permanent login.

## 4. Save your PTS connection

The current setup requires a PTS account before you can add a studio.

1. In a separate private browser window, sign in to your normal PTS administration site.
2. Confirm that your studio appears in the location selector and that you can open its sales and class reports.
3. Return to SASHA and open **Settings → Integration setup → PTS** (`/settings#pts-connections`). The PTS section opens by default. If you do not have a saved PTS account, the new-account form appears there. You can also use **Workspace Setup → Enter PTS login** (`/settings/onboarding#pts-account-setup`).
4. Enter a recognizable account label, your PTS username, and your PTS password.
5. Enter **your SASHA password** in the separate confirmation field.
6. Select **Save encrypted PTS account**.

If this section is unavailable, contact the onboarding operator. If you already have a PTS account listed, use **Settings → Integration setup → PTS → Update PTS login** to enter the updated username and password instead of adding a duplicate.

PTS uses a login in the current integration, not an API key. SASHA's implemented form stores the login in encrypted server-side storage and does not display it again. Saving the account is followed by mapping and collection verification.

**Finished when:** your named PTS account appears and SASHA confirms that it was saved.

## 5. Add your studio and match its PTS location

If an operator has already created your studio, confirm its name, city, state, and time zone in the studio selector and Workspace Setup. Do not add it again. Use **Workspace Setup → Connect an existing studio to PTS** to select your saved PTS account and enter the PTS location ID. Jennifer should follow this path for Huntington Beach.

If your studio has not been created yet, add it using these steps:

1. Open **Settings → Add studio** (`/settings#add-studio`).
2. Enter your studio name, short code, city, state and time zone. Choose Arizona for an Arizona studio; do not assume the default Eastern time zone is correct.
3. Select your business's brand and the PTS account you just saved.
4. Enter the numeric PTS location ID. This is not your SASHA studio code. The current form points to the PTS location selector or location-specific URL; if you cannot identify the number confidently, ask the onboarding operator for help. Do not guess.
5. Select **Add test studio**.
6. Confirm the resulting studio and PTS location are yours. Repeat for additional studios only if included in your test.

If the brand or PTS dropdown is empty, the onboarding operator needs to complete the missing workspace preparation or help save the account. If a duplicate error appears, review the existing studio instead of creating a differently named duplicate.

**Finished when:** your studio appears in the selector and Workspace Setup shows its PTS account and location mapping.

## 6. Connect your selected reporting systems

Open **Settings → Integration setup** (`/settings#integrations`) and expand the relevant system. Complete only the sections you agreed to test. Keep a simple list of systems you skipped; the current app does not provide a complete saved checklist of optional choices.

### Google Analytics 4

1. Sign in to Google Analytics separately and confirm that your studio's property is visible. If not, ask its administrator or the person managing your website to grant your Google account access. [Google's access guide](https://support.google.com/analytics/answer/9305788).
2. In SASHA's Google Analytics 4 section, enter a connection label and continue to Google.
3. Select the Google account with access to that property. Read and approve the requested access on Google's screen.
4. After returning to SASHA, find your property's name and numeric ID in the discovered list.
5. Select your SASHA studio and choose **Map**. Map only properties belonging to the studios you are onboarding.
6. Check your studio's first traffic and attribution data in SASHA against the Google Analytics property. If the data is missing or mismatched, report the dates and property name to the onboarding operator for a backend import check.

If Google blocks access or the expected property is absent, tell the onboarding operator the message and account email without sharing tokens. The application may need test-user eligibility configured; repeated sign-ins will not fix that setting.

### Meta Business

1. Confirm you can open the intended business portfolio, ad account and Facebook Page with your Facebook login.
2. In SASHA, enter a connection label and choose **Continue with Meta**.
3. On Meta's screen, use the correct account and review the requested permissions and selected assets.
4. Return to SASHA and check the discovered account and Page names and IDs.
5. Map your ad account and Page to your SASHA studio. Map a linked Instagram account only when it is yours and relevant to the agreed test.
6. Check the first Ads and Page Insights dates in your SASHA reports against the Meta accounts and Page you selected. If either report is absent, ask the onboarding operator to inspect that import in the backend. Asset discovery alone does not establish complete Instagram reporting.

If your agency or franchisor controls access, ask them to grant the appropriate access to your account. If Meta blocks the app, ask the onboarding operator to check app availability and permissions; do not create a personal token as a workaround.

### Eulerity

1. Sign in to Eulerity separately and confirm the expected locations are visible.
2. In SASHA, enter the connection label and the requested Eulerity login credentials, then confirm with your SASHA password.
3. For a login covering only one location, select your SASHA studio. For multiple locations, follow the form's multi-location discovery path.
4. Save the connection and wait for discovery. Refresh Settings to check for discovered locations. If none appear after the agreed check-in time, ask the onboarding operator to inspect the backend discovery run.
5. Match each intended Eulerity location to its SASHA studio and save the mappings.
6. Compare the first spend and performance dates in your SASHA report with Eulerity. If no locations or report data appear, report that state instead of repeatedly adding accounts; the onboarding operator can check the backend run.

### MNTN

1. Sign in to MNTN and select the correct advertiser. Note its Advertiser ID; ask MNTN support if you cannot identify it confidently.
2. Open the upper-right account menu → **My Account → API**.
3. Copy the key beside **Reporting API**. [MNTN's official instructions](https://help.mountain.com/en/articles/6511970-access-your-reporting-api-key).
4. In SASHA, enter a connection label, Advertiser ID and API key; select the studio and confirm with your SASHA password.
5. Save, then compare the imported advertiser and report dates with your MNTN account. If they are absent or wrong, ask the onboarding operator to check the backend run.

### Homebase

1. Sign in to Homebase as the owner and confirm access to the intended location.
2. Look for the read-only API access settings. Obtain the API key and the location UUID. If these are unavailable, ask Homebase support or the onboarding operator for assisted setup; do not extract session cookies or guess a location ID. Homebase publishes [API documentation](https://app.joinhomebase.com/api-docs), but availability and account menus need confirmation for your account.
3. In SASHA, enter a connection label, the API key, and the Homebase login email and password requested by the current form.
4. Match the location UUID to your SASHA studio, then confirm with your SASHA password and save.
5. Compare a completed day's hours in SASHA with Homebase. If the import is absent, ask the onboarding operator to inspect the backend run. Review discovered labor roles before relying on cost categories.

The current form requests both an API key and a web login. If your account uses a sign-in method the form cannot support, ask for help instead of disabling account protections.

### Textellent — optional assisted setup

1. Confirm that Textellent is included in your agreed test and what it will be used for.
2. Sign in to Textellent and obtain the API authentication code and full sending number. If the API setting is unavailable, request help from Textellent support; the exact menu has not been independently verified for your account.
3. Enter a connection label, sending number, description of the studios using it, authentication code, and your SASHA password in the secured SASHA form.
4. Save and check the account and sender configuration shown in your workspace. If it is absent or wrong, ask the onboarding operator to inspect the backend record.

Do not send a customer test message or enable an automation as part of credential setup. Any live messaging test needs a separately agreed recipient and authorization.

### Services to leave out of the initial test

Accounting Gmail is not required for studio reporting; its current instructions assume four mailboxes and need adaptation for new businesses. QuickBooks is not part of the reviewed SASHA setup. ClassPop is a PTS setting for studios that actually use it, not a separate login to collect here. Enable it only after the onboarding operator confirms the associated import is available for your studio.

## 7. Verify your first data

1. Return to **Workspace Setup**, then open **Data Upload Status** (`/data-status`).
2. Review Daily Sales, Product Sales, completed Class Sales, Upcoming Classes and Reservations for your studio. Note the latest business date and any missing feed in **Data Upload Status**.
3. Confirm the first collection date and next expected update. Initial imports are not guaranteed to start immediately after saving credentials.
4. Check Operations against a completed day in PTS, using the same dates and metric definitions. Confirm upcoming classes belong to your studio.
5. For each optional integration, compare a representative date in its report with the source account. Record the history available and the date reporting begins; older history may require a separately arranged backfill.

A studio with no product sales, bookings or classes on a day may have a successful empty report. The current readiness screen can still flag it as missing. Ask the onboarding operator to check the collection result in the backend; do not create transactions to turn a badge green.

**Finished when:** the intended sources have verified imports or documented successful empty results, the reports show only your studios, and you know which historical dates are available.

## 8. Finish and know how to get help

- Confirm that your permanent login works after signing out and back in.
- Confirm with the onboarding operator how password recovery works for this test. Automated recovery depends on email delivery being configured and tested.
- Record which systems are ready, which were skipped, and which still need help. Record no secret values.
- Know where to return: Settings for connections, Workspace Setup for progress, and Data Upload Status for PTS feed dates.
- Tell the onboarding operator when you change a connected vendor password, revoke access, or see a reconnect request. Credentials must be updated through the secured form or provider sign-in flow.
- Agree the contact method for problems and how to request disconnection or end the test.

When requesting help, include the system name, step, studio name, time and visible error text. Remove passwords, keys and personal customer information from screenshots.

**How the operator verifies a separate workspace:** SASHA currently has no cross-business support view. With authorized access to the project's Supabase dashboard, the operator can check the Huntington Beach organization, Jennifer's active membership, studio record, PTS account metadata, studio-to-PTS mapping, and import status in `integration_runs` and **Data Upload Status** data. They should compare IDs and timestamps, not open or request secret values. Jennifer confirms the visible studio, source account names, report dates, and representative totals from her own SASHA login. The operator's SASHA login to another business cannot perform this check.

**Completion checklist:** own workspace · permanent login · correct studio and time zone · PTS mapped · selected sources verified · first reports checked · history understood · recovery/support confirmed.
