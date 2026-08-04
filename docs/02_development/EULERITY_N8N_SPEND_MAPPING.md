# Eulerity Spend n8n Mapping

## Problem

`eulerity_daily_spend` is empty even though the Eulerity collector downloads and
parses daily spend CSV files. The collector previously returned `user_email`,
while the warehouse column is `user_name`, and the spend rows were only nested
inside each studio result.

## Collector contract

`POST /eulerity/download` now retains the existing `results` response and also
returns a flat `spendRows` array. Every spend row contains:

- `studioCode`
- `studioName`
- `report_date`
- `campaign_name`
- `business_name`
- `user_name`
- `activation_date`
- `spend`

The response also includes `spendRowCount`. A successful production run should
not continue to the database step when `spendRowCount` is zero.

## Required n8n flow

1. Call `POST /eulerity/download`.
2. Assert `success` is `true`.
3. Assert `spendRowCount` is greater than zero.
4. Split `spendRows` into individual items.
5. Resolve `studioCode` to `studios.id` using the existing configuration mapping.
6. Remove `studioCode` and `studioName` from the database payload.
7. UPSERT into `public.eulerity_daily_spend`.
8. Use the conflict target:
   `studio_id,report_date,campaign_name`.
9. Verify the number of returned/upserted rows equals `spendRowCount`.
10. Record the run and row count in `integration_runs`.

The final database payload must contain:

```json
{
  "studio_id": 1,
  "report_date": "2026-07-27",
  "campaign_name": "Louisville",
  "business_name": "Pinot's Palette",
  "user_name": "owner@example.com",
  "activation_date": "2024-09-22",
  "spend": 44.35
}
```

## Recovery

After updating n8n, run one authorized collection and verify:

```sql
select report_date, studio_id, campaign_name, spend
from public.eulerity_daily_spend
order by report_date desc, studio_id, campaign_name;
```

Then backfill the dates still available from Eulerity. Do not truncate existing
metrics or budget tables.
