# Dataset refresh alert expansion — October 14, 2026

## Prepared scope

13 production imports: Daily Sales; Product Sales; Class Sales; Upcoming Classes;
Reservations; Order Geography/Discounts; Third-party Class Credits; GA4 Daily;
GA4 Source/Medium; GA4 North America reporting (daily, breakdowns, content,
events); Eulerity; MNTN; Homebase labor. Facebook's existing monitor remains
active and handles its separate source/warehouse checks.

The shared supplementary monitor reads n8n execution metadata with
`includeData=false`. It accepts successful empty imports, ignores editor tests,
alerts on failed production executions or missing completion after the scheduled
run plus 90 minutes, suppresses repeated incidents, and sends recovery notices.
Hourly checks run at :15 in America/New_York. Immediate errors use the same
monitor. Email goes through the existing Jeff Duff Outlook credential to
jeff.duff@pinotspalette.com. State changes only after Microsoft accepts the
notice (202); previews never email or commit notification state.

No collector or dashboard deployment, schema change, source collection hooks,
or source import schedule/logic change is needed. Each source's existing empty
result and completeness validation remains its own responsibility. This monitor
checks completed imports; Facebook additionally compares source to warehouse.

## Verification and current checkpoint

- 27 focused offline checks pass, covering completion/deadline, empty source,
  manual exclusion, failure/recovery/deduplication, malformed/incomplete history,
  metadata-only API requests, production-only mail, and provider acceptance.
- Current production exports for all 13 imports are saved locally under
  tmp/dataset-monitor/before-<workflow-id>.json; they are not source commits.
- Existing integration_runs completion storage was checked with audit record 6,
  report_type=freshness_monitor_validation. It is explicitly NOT an import
  completion or healthy-dataset marker. This preparation approach was replaced
  by execution history after finding legitimate empty source branches.
- API key creation form prepared: label Dataset Reporting Health, only
  execution:list, no expiration. No key has been created. Separate owner
  confirmation requested because it creates a persistent API credential.
- Waiting for that confirmation before creating the key, saving it in n8n's
  encrypted Header Auth credential, importing the monitor once into a blank
  workflow, verifying live metadata preview, publishing, and assigning it as
  the error workflow for each source.
- Production monitor expansion is NOT active yet. Existing Facebook alert is
  unchanged and active. No source import was run or altered during preparation.

## Activation and rollback

After key approval: save header name X-N8N-API-KEY in an encrypted n8n credential;
never put the value in files/Git/workflow JSON. Set credential-ref.json locally
with ONLY its id/name, regenerate the template, import once into a blank n8n
workflow, explicitly select America/New_York in workflow settings, run a manual
preview, publish, then save the new error-workflow selection on all 13 sources.
Export each source afterward and verify nodes/connections/schedules unchanged.

Rollback: unpublish the supplemental monitor, restore each source's previous
error-workflow setting (all 13 preparation exports currently have no handler),
and revoke the dedicated monitoring API key. Preserve execution/audit history.
Do not alter or unpublish Facebook monitor K0OJ1cak3dwlKyiI.
