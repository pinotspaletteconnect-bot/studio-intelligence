# GA4 North America Reporting Contract

## Scope

The dedicated GA4 dashboard reports only traffic where the GA4 `country`
dimension is `United States`, `Canada`, or `Mexico`. This is the supported GA4
Data API definition used for the business's North American reporting scope. The
existing global GA4 daily and source/medium facts remain unchanged and must
never be used as a fallback on this page.

## Collection reports

For each active mapped GA4 property, the ETL runs five reports for the same
completed date window. Every request includes this GA4 Data API filter:

```json
{
  "dimensionFilter": {
    "filter": {
      "fieldName": "country",
      "inListFilter": {
        "values": ["United States", "Canada", "Mexico"]
      }
    }
  }
}
```

1. Daily summary: `date` plus active users, total users, new users, sessions,
   engaged sessions, screen page views, engagement rate, average session
   duration, ecommerce purchases, and purchase revenue.
2. Audience breakdowns: `date` plus one of `country`, `city`,
   `deviceCategory`, or `operatingSystem`.
3. Acquisition: `date`, `sessionSource`, and `sessionMedium`.
4. Content: `date` and `pagePath`.
5. Events: `date` and `eventName`.

## Loading

- Resolve organization, brand, and studio only from the active property
  mapping supplied by `ga4_collection_targets`.
- Normalize GA4 camelCase metrics to the migration's snake_case columns.
- UPSERT on each table's primary key.
- Refresh a rolling completed-date window so late GA4 attribution is retained.
- Reject rows without a mapped studio or valid report date.
- Do not store user identifiers or other user-level dimensions.
- Record retrieval timestamps and integration-run counts.

## Dashboard behavior

`/marketing/ga4` queries only the four `ga4_north_america_*` facts. Empty facts
produce an explicit awaiting-data state. They never cause a fallback to global
GA4 facts because that would silently violate the geographic scope.

Because GA4 active users are non-additive across dates, the summary presents
average daily active users rather than claiming that summed daily users are
unique across an arbitrary selected period. The trend retains exact daily
active-user values; additive tables emphasize sessions, events, and revenue.
