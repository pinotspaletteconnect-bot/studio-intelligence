# Facebook reporting email alerts

Prepared as an unpublished n8n draft; activation is pending production workflow approval. Recipient/sender: jeff.duff@pinotspalette.com through the existing Jeff.Duff Microsoft Outlook connection. No new secrets or authentication changes.

## Behavior

- Immediate alerts when the published Meta Ads or Page import fails, after linking their error-workflow setting to this monitor.
- Daily 06:00 America/New_York check after the 04:30/04:40 imports. Active asset/studio mappings come from configuration.
- Compare yesterday's mapped Facebook source records with the warehouse, catching token/source failures, missing/partial loads, duplicate keys, invalid values, and incomplete query responses. Verified no-ad delivery and explicit zero Page values stay healthy.
- Warn seven days before the Facebook credential expires. One notification for an unchanged incident, a new notice if another feed fails, and one recovery notice after all problems clear.
- Notification state is committed only after Microsoft Graph accepts the mail. No warehouse writes, source reruns that load data, or spending changes.
- Manual/editor or unknown execution modes cannot email or commit notification state; only production mode can send. The daily check performs read-only collector/API requests in addition to warehouse reads.

## Validation and activation

Twelve focused offline tests pass. The live draft was checked against current four-studio source/warehouse data. Its initial preview exposed n8n's test-mode naming; that guard was corrected before publication and the final preview is recorded in the main recovery checkpoint. No emails were sent.

Draft workflow: 7VU8y1CDikjWqvMP, Facebook Reporting Health — Owner Email Alerts.

Before activation, review the saved draft and approve publishing it, assigning it as error workflow for 27 - Meta Paid Vault Daily Import (z5Mww3blBHS89UYu) and 28 - Meta Pages Vault Daily Import (7OMm5L5fprv3Lh5o), and sending one explicitly labeled delivery-test email. Neither import currently has an error workflow in the reviewed exports. Preserve all other workflow settings. No import code or schedules need changing.

After activation, verify 06:00 timezone/next scheduled execution, the two error-workflow references, and the owner's accepted delivery-test message. Alert deduplication uses n8n workflow static data, persisted only by successful active production executions; manual previews intentionally do not persist it. Record alert acceptance before claiming delivery verification.

Rollback: unpublish this monitor and remove only its two error-workflow references; leave imports, warehouse history, and credentials intact. This monitor runs inside n8n and cannot independently alert if the entire n8n service is unavailable.

## Final draft verification

Execution 155422 at 08:00 EDT October 14 succeeded in 15.557 seconds. All four studios/source/warehouse checks returned healthy: action quiet, no issues, dryRun true, preview true, emailSent false. Draft remains unpublished, and neither production import error-workflow setting has changed. Sender connection is connected; end-to-end mail delivery is not yet tested.
