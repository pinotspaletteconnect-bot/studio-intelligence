const { chromium, request: playwrightRequest } = require('playwright');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const BASE_URL = 'https://admin.pinotspalette.com';
const LIST_URL = `${BASE_URL}/Painting/List`;
const DATA_PATH = '/Painting/GetListGridData';
const KIDS_CATEGORY_ID = '1900';
const DEFAULT_OUTPUT = path.join(__dirname, 'output');
const PROFILE_DIR = path.join(__dirname, '.browser-profile');

function parseArgs(argv) {
  const options = {
    limit: null,
    metadataOnly: false,
    headed: false,
    output: DEFAULT_OUTPUT,
    catalog: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--metadata-only') options.metadataOnly = true;
    else if (argument === '--headed') options.headed = true;
    else if (argument === '--limit') options.limit = Number(argv[++index]);
    else if (argument === '--output') options.output = path.resolve(argv[++index]);
    else if (argument === '--catalog') options.catalog = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }
  return options;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(value = '') {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

function absoluteUrl(value) {
  if (!value) return '';
  return new URL(decodeHtml(value), BASE_URL).href;
}

function cellValues(row) {
  if (Array.isArray(row)) return row;
  if (row && typeof row === 'object') {
    const numericKeys = Object.keys(row).filter((key) => /^\d+$/.test(key)).sort((a, b) => Number(a) - Number(b));
    return numericKeys.length ? numericKeys.map((key) => row[key]) : Object.values(row);
  }
  return [];
}

function originalFromSmallUrl(imageUrl) {
  if (!imageUrl) return '';
  const parsed = new URL(imageUrl);
  parsed.pathname = parsed.pathname
    .replace(/-small@2x(?=\.[^.]+$)/i, '')
    .replace(/-small(?=\.[^.]+$)/i, '');
  return parsed.href;
}

function normalizeRow(row) {
  const cells = cellValues(row);
  const titleCell = String(cells.find((cell) => String(cell).includes('/Instruction/Edit/')) || cells[0] || '');
  const idMatch = titleCell.match(/\/Instruction\/Edit\/(\d+)/i);
  const imageMatch = titleCell.match(/<img[^>]+src=["']([^"']+)["']/i);
  const anchorMatch = titleCell.match(/<a[^>]*>([\s\S]*?)<img/i);
  const title = stripHtml(anchorMatch ? anchorMatch[1] : titleCell);
  const thumbnailUrl = absoluteUrl(imageMatch ? imageMatch[1] : '');
  const paintingId = idMatch ? idMatch[1] : '';

  if (!paintingId || !title || !thumbnailUrl) {
    throw new Error(`Could not parse painting row: ${titleCell.slice(0, 240)}`);
  }

  return {
    paintingId,
    title,
    detailUrl: `${BASE_URL}/Instruction/Edit/${paintingId}`,
    thumbnailUrl,
    originalImageUrl: originalFromSmallUrl(thumbnailUrl),
    orientation: stripHtml(cells[1]),
    durationHours: Number.parseFloat(stripHtml(cells[2])) || null,
    classCount: Number.parseInt(stripHtml(cells[3]), 10) || 0,
    dateAdded: stripHtml(cells[4]),
    masterLibraryDate: stripHtml(cells[5]),
    lifecycleStage: stripHtml(cells[6]),
    originalArtist: stripHtml(cells[7]),
    originalLocation: stripHtml(cells[8]),
    categories: stripHtml(cells[9]),
    tags: stripHtml(cells[10]),
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(records, columns) {
  return [
    columns.map((column) => csvEscape(column.label)).join(','),
    ...records.map((record) => columns.map((column) => csvEscape(record[column.key])).join(',')),
  ].join('\r\n');
}

function safeFilename(record) {
  const extension = path.extname(new URL(record.originalImageUrl).pathname) || '.jpg';
  const base = record.title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 90) || `painting-${record.paintingId}`;
  return `${record.paintingId}-${base}${extension.toLowerCase()}`;
}

async function writeAtomic(filePath, content) {
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, content);
  await fs.rename(temporaryPath, filePath);
}

async function ensureAuthenticated(page) {
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/Account/Login') || !(await page.locator('#PaintingLibraryId').count())) {
    console.log('Sign in to PTS in the opened browser window. The export will resume automatically.');
    await page.waitForURL((url) => url.pathname === '/Painting/List', { timeout: 10 * 60 * 1000 });
    await page.locator('#PaintingLibraryId').waitFor({ state: 'visible', timeout: 60_000 });
  }
}

async function captureCatalogRequest(page) {
  await page.selectOption('#PaintingLibraryId', '-1');
  await page.selectOption('#Categories', KIDS_CATEGORY_ID);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(DATA_PATH) && response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await page.click('#searchBtn');
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`PTS catalog request failed with HTTP ${response.status()}`);
  return {
    endpoint: response.url(),
    encodedBody: response.request().postData() || '',
    firstPayload: await response.json(),
  };
}

async function fetchPage(page, endpoint, encodedBody, start, length, draw) {
  const parameters = new URLSearchParams(encodedBody);
  parameters.set('start', String(start));
  parameters.set('length', String(length));
  parameters.set('draw', String(draw));
  parameters.set('PaintingLibrarySelect', '-1');
  parameters.set('PaintingCategoryFilter', KIDS_CATEGORY_ID);

  return page.evaluate(async ({ requestUrl, body }) => {
    const response = await fetch(requestUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    });
    if (!response.ok) throw new Error(`Catalog page request failed with HTTP ${response.status}`);
    return response.json();
  }, { requestUrl: endpoint, body: parameters.toString() });
}

function payloadRows(payload) {
  return payload.data || payload.aaData || [];
}

function payloadTotal(payload) {
  return Number(payload.recordsFiltered ?? payload.iTotalDisplayRecords ?? payload.recordsTotal ?? payload.iTotalRecords ?? 0);
}

async function collectCatalog(page, request, limit) {
  const firstRows = payloadRows(request.firstPayload);
  const available = payloadTotal(request.firstPayload);
  const target = limit ? Math.min(limit, available) : available;
  const batchSize = Math.min(250, target || 250);
  const records = [];
  let draw = 2;

  for (let start = 0; start < target; start += batchSize) {
    const payload = start === 0 && firstRows.length >= Math.min(batchSize, target)
      ? request.firstPayload
      : await fetchPage(page, request.endpoint, request.encodedBody, start, Math.min(batchSize, target - start), draw++);
    const rows = payloadRows(payload);
    for (const row of rows) {
      if (records.length >= target) break;
      records.push(normalizeRow(row));
    }
    console.log(`Collected ${records.length.toLocaleString()} of ${target.toLocaleString()} Kids records`);
    if (!rows.length) break;
  }

  const unique = Array.from(new Map(records.map((record) => [record.paintingId, record])).values());
  if (unique.length !== target) {
    console.warn(`Expected ${target} records but collected ${unique.length}. The run summary will record the difference.`);
  }
  return { records: unique, available };
}

async function downloadOne(request, record, imageDirectory) {
  const filename = safeFilename(record);
  const destination = path.join(imageDirectory, filename);
  try {
    const existing = await fs.stat(destination);
    if (existing.size > 0) return { ...record, localImage: `images/${filename}`, downloadStatus: 'existing' };
  } catch {}

  const xlargeUrl = new URL(record.originalImageUrl);
  xlargeUrl.pathname = xlargeUrl.pathname.replace(/(?=\.[^.]+$)/, '-xlarge');
  const candidates = [record.originalImageUrl, xlargeUrl.href];
  let lastError;
  for (const candidate of candidates) {
    try {
      const response = await request.get(candidate, { timeout: 60_000 });
      if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
      const body = await response.body();
      if (!body.length) throw new Error('empty response');
      await fs.writeFile(destination, body);
      return {
        ...record,
        originalImageUrl: candidate,
        localImage: `images/${filename}`,
        imageBytes: body.length,
        imageSha256: crypto.createHash('sha256').update(body).digest('hex'),
        downloadStatus: 'downloaded',
      };
    } catch (error) {
      lastError = error;
    }
  }
  return { ...record, localImage: '', downloadStatus: 'failed', downloadError: lastError?.message || 'unknown error' };
}

async function downloadImages(request, records, imageDirectory) {
  await fs.mkdir(imageDirectory, { recursive: true });
  const output = new Array(records.length);
  let cursor = 0;
  let completed = 0;
  const workerCount = Math.min(6, records.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < records.length) {
      const index = cursor++;
      output[index] = await downloadOne(request, records[index], imageDirectory);
      completed += 1;
      if (completed % 25 === 0 || completed === records.length) {
        console.log(`Processed ${completed.toLocaleString()} of ${records.length.toLocaleString()} images`);
      }
    }
  }));
  return output;
}

function galleryHtml(records) {
  const safeJson = JSON.stringify(records).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PTS Kids Painting Library</title>
<style>
:root{color-scheme:light;--ink:#14213d;--muted:#64748b;--accent:#e76f51;--paper:#f8fafc;--card:#fff;--line:#e2e8f0}*{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:var(--paper);color:var(--ink)}header{position:sticky;top:0;z-index:2;background:rgba(248,250,252,.96);border-bottom:1px solid var(--line);padding:18px 24px}h1{margin:0 0 12px;font-size:24px}.controls{display:grid;grid-template-columns:minmax(220px,2fr) repeat(3,minmax(140px,1fr)) auto;gap:10px}input,select,button{font:inherit;padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;background:#fff}button{cursor:pointer;background:var(--ink);color:#fff;border-color:var(--ink)}.summary{margin-top:10px;color:var(--muted);font-size:14px}.grid{padding:22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 3px 14px rgba(15,23,42,.06)}.image{aspect-ratio:4/3;background:#e2e8f0;display:flex;align-items:center;justify-content:center}.image img{width:100%;height:100%;object-fit:contain}.body{padding:13px}.title{font-weight:700;font-size:16px;margin:0 0 8px}.meta,.tags{color:var(--muted);font-size:13px;line-height:1.45}.tags{margin-top:7px}.row{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:11px}.select{display:flex;align-items:center;gap:6px;font-size:13px}.select input{accent-color:var(--accent)}a{color:#0f5d8c}.empty{padding:50px;text-align:center;color:var(--muted)}@media(max-width:850px){.controls{grid-template-columns:1fr 1fr}.controls input{grid-column:1/-1}}@media(max-width:520px){.controls{grid-template-columns:1fr}.controls input{grid-column:auto}.grid{padding:12px}}
</style>
</head>
<body>
<header><h1>PTS Kids Painting Library</h1><div class="controls"><input id="query" type="search" placeholder="Search titles, tags, artists, locations…"><select id="orientation"><option value="">All orientations</option></select><select id="duration"><option value="">All durations</option></select><select id="stage"><option value="">All lifecycle stages</option></select><button id="export">Export selected</button></div><div class="summary" id="summary"></div></header>
<main id="grid" class="grid"></main>
<script>
const records=${safeJson};const selected=new Set(JSON.parse(localStorage.getItem('pts-kids-selected')||'[]'));
const els={grid:document.querySelector('#grid'),query:document.querySelector('#query'),orientation:document.querySelector('#orientation'),duration:document.querySelector('#duration'),stage:document.querySelector('#stage'),summary:document.querySelector('#summary')};
function options(key,el,format=x=>x){[...new Set(records.map(r=>r[key]).filter(x=>x!==''&&x!=null))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=format(v);el.append(o)})}options('orientation',els.orientation);options('durationHours',els.duration,x=>x+' hours');options('lifecycleStage',els.stage);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){const q=els.query.value.trim().toLowerCase();const shown=records.filter(r=>(!q||[r.title,r.tags,r.originalArtist,r.originalLocation,r.categories].join(' ').toLowerCase().includes(q))&&(!els.orientation.value||r.orientation===els.orientation.value)&&(!els.duration.value||String(r.durationHours)===els.duration.value)&&(!els.stage.value||r.lifecycleStage===els.stage.value));els.summary.textContent=shown.length.toLocaleString()+' shown · '+selected.size.toLocaleString()+' selected · '+records.length.toLocaleString()+' total';els.grid.innerHTML=shown.length?shown.map(r=>\`<article class="card"><div class="image"><img loading="lazy" src="\${esc(r.localImage||r.thumbnailUrl)}" alt="\${esc(r.title)}"></div><div class="body"><p class="title">\${esc(r.title)}</p><div class="meta">\${esc(r.orientation||'Unknown orientation')} · \${esc(r.durationHours||'?')} hours<br>\${esc(r.originalArtist||'Artist not listed')} · \${esc(r.originalLocation||'Location not listed')}</div><div class="tags">\${esc(r.tags)}</div><div class="row"><a href="\${esc(r.detailUrl)}" target="_blank" rel="noreferrer">PTS record</a><label class="select"><input type="checkbox" data-id="\${esc(r.paintingId)}" \${selected.has(r.paintingId)?'checked':''}> Curriculum</label></div></div></article>\`).join(''):'<div class="empty">No paintings match these filters.</div>';document.querySelectorAll('[data-id]').forEach(el=>el.addEventListener('change',()=>{el.checked?selected.add(el.dataset.id):selected.delete(el.dataset.id);localStorage.setItem('pts-kids-selected',JSON.stringify([...selected]));render()}))}
Object.values(els).filter(el=>el&&['INPUT','SELECT'].includes(el.tagName)).forEach(el=>el.addEventListener('input',render));
document.querySelector('#export').addEventListener('click',()=>{const rows=records.filter(r=>selected.has(r.paintingId));const cols=[['Title','title'],['Image URL','originalImageUrl'],['PTS Record','detailUrl'],['Orientation','orientation'],['Duration Hours','durationHours'],['Artist','originalArtist'],['Location','originalLocation'],['Categories','categories'],['Tags','tags']];const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>r[c[1]]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\\r\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='selected-kids-paintings-canva.csv';a.click();URL.revokeObjectURL(a.href)});render();
</script></body></html>`;
}

async function writeOutputs(outputDirectory, records, summary) {
  const catalogColumns = [
    ['paintingId', 'Painting ID'], ['title', 'Title'], ['localImage', 'Local Image'],
    ['thumbnailUrl', 'Thumbnail URL'], ['originalImageUrl', 'Original Image URL'], ['detailUrl', 'PTS Record'],
    ['orientation', 'Orientation'], ['durationHours', 'Duration Hours'], ['classCount', 'Class Count'],
    ['dateAdded', 'Date Added'], ['masterLibraryDate', 'Master Library Date'], ['lifecycleStage', 'Lifecycle Stage'],
    ['originalArtist', 'Original Artist'], ['originalLocation', 'Original Location'], ['categories', 'Categories'],
    ['tags', 'Tags'], ['downloadStatus', 'Download Status'], ['imageBytes', 'Image Bytes'], ['imageSha256', 'Image SHA-256'],
  ].map(([key, label]) => ({ key, label }));
  const canvaColumns = [
    ['title', 'Title'], ['originalImageUrl', 'Image URL'], ['detailUrl', 'PTS Record'],
    ['orientation', 'Orientation'], ['durationHours', 'Duration Hours'], ['originalArtist', 'Artist'],
    ['originalLocation', 'Location'], ['categories', 'Categories'], ['tags', 'Tags'],
  ].map(([key, label]) => ({ key, label }));

  await Promise.all([
    writeAtomic(path.join(outputDirectory, 'catalog.json'), JSON.stringify(records, null, 2)),
    writeAtomic(path.join(outputDirectory, 'kids-paintings.csv'), toCsv(records, catalogColumns)),
    writeAtomic(path.join(outputDirectory, 'canva-import.csv'), toCsv(records, canvaColumns)),
    writeAtomic(path.join(outputDirectory, 'gallery.html'), galleryHtml(records)),
    writeAtomic(path.join(outputDirectory, 'run-summary.json'), JSON.stringify(summary, null, 2)),
  ]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(options.output, { recursive: true });
  if (options.catalog) {
    const catalogRecords = JSON.parse(await fs.readFile(options.catalog, 'utf8'));
    if (!Array.isArray(catalogRecords) || !catalogRecords.length) throw new Error('Catalog file contains no records');
    const limitedRecords = options.limit ? catalogRecords.slice(0, options.limit) : catalogRecords;
    const request = await playwrightRequest.newContext();
    try {
      const records = options.metadataOnly
        ? limitedRecords.map((record) => ({ ...record, localImage: '', downloadStatus: 'skipped' }))
        : await downloadImages(request, limitedRecords, path.join(options.output, 'images'));
      const summary = {
        generatedAt: new Date().toISOString(), source: LIST_URL, category: 'Kids', categoryId: KIDS_CATEGORY_ID,
        availableRecords: catalogRecords.length, exportedRecords: records.length,
        downloaded: records.filter((record) => record.downloadStatus === 'downloaded').length,
        existing: records.filter((record) => record.downloadStatus === 'existing').length,
        failed: records.filter((record) => record.downloadStatus === 'failed').length,
        metadataOnly: options.metadataOnly,
      };
      await writeOutputs(options.output, records, summary);
      console.log(`Export complete: ${options.output}`);
      console.log(summary);
    } finally {
      await request.dispose();
    }
    return;
  }
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1440, height: 960 },
  });

  try {
    const pages = context.pages();
    const page = pages[0] || await context.newPage();
    await ensureAuthenticated(page);
    const capturedRequest = await captureCatalogRequest(page);
    const { records: catalogRecords, available } = await collectCatalog(page, capturedRequest, options.limit);
    const records = options.metadataOnly
      ? catalogRecords.map((record) => ({ ...record, localImage: '', downloadStatus: 'skipped' }))
      : await downloadImages(context.request, catalogRecords, path.join(options.output, 'images'));
    const summary = {
      generatedAt: new Date().toISOString(),
      source: LIST_URL,
      category: 'Kids',
      categoryId: KIDS_CATEGORY_ID,
      availableRecords: available,
      exportedRecords: records.length,
      downloaded: records.filter((record) => record.downloadStatus === 'downloaded').length,
      existing: records.filter((record) => record.downloadStatus === 'existing').length,
      failed: records.filter((record) => record.downloadStatus === 'failed').length,
      metadataOnly: options.metadataOnly,
    };
    await writeOutputs(options.output, records, summary);
    console.log(`Export complete: ${options.output}`);
    console.log(summary);
    if (options.headed) await new Promise(() => {});
  } finally {
    if (!options.headed) await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
