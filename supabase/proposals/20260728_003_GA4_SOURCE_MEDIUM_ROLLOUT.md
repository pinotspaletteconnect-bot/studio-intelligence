# GA4 source/medium rollout

## Existing assets

- Warehouse fact: `marketing_attribution_daily`
- n8n workflow: `03 - GA4 Source Medium Daily Import`
- Workflow ID: `uIrET0Q76YTIhTw7`
- Governed classification: `marketing_source_mapping`

The workflow requests GA4 `date`, `sessionSource`, and `sessionMedium`
dimensions plus traffic, engagement, key-event, and revenue metrics.

## Production result

- Reporting view applied July 28, 2026.
- Exposed secret sticky note removed.
- Tenant ownership now derives from the selected studio.
- Date handling normalized.
- Studio 1 controlled run completed for July 21–28.
- 131 unique attribution rows, zero duplicate keys, and zero null source/medium
  values were verified.
- Daily sessions, key events, and revenue reconciled with the aggregate GA4
  table, excluding expected freshness differences on the newest dates.
- All active GA4 studio integrations were restored and the workflow published.

## Required production sequence

1. Apply `20260728_003_ga4_source_medium_reporting.sql`. **Complete**
2. Remove the exposed Google client secret from the workflow sticky note and
   rotate that secret before publishing.
3. Replace the workflow's hardcoded organization and brand IDs with values
   derived from the selected studio record.
4. Verify the SQL date parameter uses the normalized `YYYY-MM-DD` value as a
   date, without applying a conflicting `YYYYMMDD` format.
5. Publish the workflow. **Complete**
6. Run a manual seven-day import for one studio and validate:
   - row count and uniqueness;
   - source/medium values;
   - daily source totals against GA4;
   - revenue totals against `ga4_daily_metrics`;
   - tenant ownership.
7. Backfill the desired attribution history.
8. Enable the schedule and verify all studios.
9. Deploy the dashboard only after the reporting view returns validated rows.

## Rollback

```sql
begin;
drop view if exists public.ga4_source_medium_performance;
commit;
```

Dropping the view does not delete attribution history. If a workflow validation
run is incorrect, disable the workflow and remove only the explicitly
identified test rows after preserving an export for diagnosis.
