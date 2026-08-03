# PTS Product Sales Excel Backfill

## Purpose

Workflow `10 - PTS Product Sales Backfill` loads historical item-level Product
Sales without asking PTS to generate a large report through browser automation.
An operator downloads the Product Sales Excel workbook directly from PTS and
uploads one studio workbook at a time.

## Operator procedure

1. In PTS Product Sales, select one studio and the required historical range.
2. Download the Excel workbook whose columns begin with `Order #`, `Sale Date`,
   `Order Date`, and `Customer`.
3. Open workflow `10 - PTS Product Sales Backfill` from the Operations page.
4. Click **Test workflow** to start the private test-form listener.
5. Select the matching studio and upload the `.xlsx` or `.xls` file.
6. Click **Validate and import** and confirm every workflow node completes.
7. Repeat for each studio workbook.

Do not use the separate non-class Sales workbook whose columns include
`Sale/Order` and `Type`. Product Sales is the authoritative product source used
by the Operations dashboard.

The workflow remains unpublished intentionally. Its temporary test form exists
only while an authenticated n8n operator is actively testing the workflow; a
permanent unauthenticated upload URL is not exposed.

## Validation and loading

The authenticated collector endpoint `POST /pts/product-sales-upload` accepts
one binary workbook and the selected PTS studio code. It removes customer names
and reuses the production Product Sales normalization rules. Empty, invalid, or
incorrect report files fail before warehouse access.

n8n retains the existing production transformation path:

- resolve tenant IDs from the selected studio;
- group items by studio, sale date, category, subcategory, and item name;
- upsert `pts_product_sales_daily` using its existing natural key;
- preserve product mappings, reporting views, and dashboard service contracts.

Re-uploading the same workbook merges the same natural keys rather than
creating duplicates. The operator must select the correct studio because the
PTS workbook does not contain a studio identifier.

## Validation evidence

The July 30 sample Product Sales workbook parsed successfully. After excluding
the workbook's final totals row, 186 detail rows represented 232 units and
$1,825.07 in source net sales. This parser check did not write the sample to
Supabase because its studio was not confirmed.
