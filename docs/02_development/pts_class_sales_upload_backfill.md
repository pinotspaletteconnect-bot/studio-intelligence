# PTS Class Sales Excel Backfill

## Purpose

Workflow `11 - PTS Class Sales Backfill` loads historical Class Sales without
asking PTS to generate a large report through browser automation. An operator
downloads the Class Sales Excel workbook directly from PTS and uploads one
studio workbook at a time.

## Operator procedure

1. In PTS, select one studio and the required historical range.
2. Download the Class Sales Summary Excel workbook.
3. Open workflow `11 - PTS Class Sales Backfill` in n8n.
4. Click **Test workflow** to start the private test-form listener.
5. Select the matching studio code and upload the `.xlsx` or `.xls` file.
6. Submit the form and confirm that every workflow node completes.
7. Repeat for each studio workbook.

The workflow remains unpublished intentionally. Its temporary test form exists
only while an authenticated n8n operator is actively testing the workflow; a
permanent unauthenticated file-upload URL is not exposed.

## Validation and loading

The authenticated collector endpoint `POST /pts/class-sales-upload` accepts a
single binary workbook and the selected PTS studio code. It reuses the same
Class Sales parser as automated collection and requires the source headers
`Painting`, `Time`, `Seats`, and `Net Sales`. Empty or invalid workbooks fail
before warehouse access.

n8n retains the existing production transformation path:

- resolve tenant IDs from the selected studio;
- group source events by studio, event date, and raw class type;
- upsert `pts_class_type_sales_daily` using
  `(studio_id, report_date, source_class_type)`;
- preserve the reporting views and dashboard service contracts.

Re-uploading the same workbook merges the same natural keys rather than
creating duplicates. The operator must select the correct studio because the
PTS workbook does not contain a studio identifier.

## Validation evidence

The August 3, 2026 sample workbook parsed successfully with 402 class rows
covering January 1 through July 1, 2026. This parser check did not write the
sample to Supabase because its studio was not confirmed.
