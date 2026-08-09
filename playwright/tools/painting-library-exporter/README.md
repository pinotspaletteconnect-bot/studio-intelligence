# PTS Kids Painting Library Exporter

This local-only tool exports the **Kids** category from the Pinot's Palette Admin
Painting Library. It does not write to Supabase, n8n, or the production collector.

## Outputs

- Original-resolution painting images in `output/images/`
- `output/catalog.json` for repeatable refreshes
- `output/kids-paintings.csv` for Excel and other table tools
- `output/canva-import.csv` for Canva Bulk Create
- `output/gallery.html`, a searchable visual catalog that opens locally
- `output/run-summary.json`, including counts and failures
- A formatted Excel workbook built after collection

## Run

From `playwright/`:

```powershell
npm run export:kids-paintings
```

The first run opens a browser window. Sign in to PTS if prompted. The exporter
stores the authenticated browser profile only in
`tools/painting-library-exporter/.browser-profile/`, which is ignored by Git.

Later runs reuse the profile and skip images that are already downloaded. To
test the workflow without downloading the full library:

```powershell
node tools/painting-library-exporter/export-kids-paintings.js --limit 10
```

Options:

- `--limit N` exports at most N records.
- `--metadata-only` skips image downloads.
- `--headed` keeps the browser visible after authentication.
- `--output PATH` changes the output directory.
- `--catalog PATH` uses a previously collected catalog and skips PTS sign-in.

Open `output/gallery.html` directly in a browser. Selections are stored locally
in that browser and can be downloaded as a Canva-ready CSV from the gallery.

The Excel workbook is built with the bundled Codex spreadsheet runtime after an
export. It contains an overview, a filterable catalog, curriculum-selection
fields, source URLs, and download-quality checks.
