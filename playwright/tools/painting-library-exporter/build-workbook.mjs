import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

function parseArgs(argv) {
  const options = {
    catalog: path.join(import.meta.dirname, 'output', 'catalog.json'),
    summary: path.join(import.meta.dirname, 'output', 'run-summary.json'),
    output: path.join(import.meta.dirname, 'output', 'kids-painting-library.xlsx'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--catalog') options.catalog = path.resolve(argv[++index]);
    else if (argument === '--summary') options.summary = path.resolve(argv[++index]);
    else if (argument === '--output') options.output = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const records = JSON.parse(await fs.readFile(options.catalog, 'utf8'));
const runSummary = JSON.parse(await fs.readFile(options.summary, 'utf8'));
if (!Array.isArray(records) || records.length === 0) throw new Error('Catalog contains no painting records');

const workbook = Workbook.create();
const overview = workbook.worksheets.add('Overview');
const catalog = workbook.worksheets.add('Kids Catalog');
overview.showGridLines = false;
catalog.showGridLines = false;

overview.getRange('A1:B2').merge();
overview.getRange('A1').values = [['PTS Kids Painting Library']];
overview.getRange('A1:B2').format = {
  fill: '#14213D',
  font: { bold: true, color: '#FFFFFF', size: 22 },
  verticalAlignment: 'center',
};
overview.getRange('A4:B4').values = [['Catalog Summary', 'Value']];
overview.getRange('A5:A10').values = [
  ['Paintings exported'],
  ['Selected for curriculum'],
  ['Downloaded or existing'],
  ['Download failures'],
  ['Average duration (hours)'],
  ['Generated'],
];
const endRow = records.length + 6;
overview.getRange('B5:B9').formulas = [[
  `=COUNTA('Kids Catalog'!$B$7:$B$${endRow})`,
], [
  `=COUNTIF('Kids Catalog'!$A$7:$A$${endRow},"Yes")`,
], [
  `=COUNTIF('Kids Catalog'!$O$7:$O$${endRow},"downloaded")+COUNTIF('Kids Catalog'!$O$7:$O$${endRow},"existing")`,
], [
  `=COUNTIF('Kids Catalog'!$O$7:$O$${endRow},"failed")`,
], [
  `=IFERROR(AVERAGE('Kids Catalog'!$G$7:$G$${endRow}),0)`,
]];
overview.getRange('B10').values = [[new Date(runSummary.generatedAt)]];
overview.getRange('B10').format.numberFormat = 'yyyy-mm-dd hh:mm';
overview.getRange('A4:B4').format = {
  fill: '#E76F51',
  font: { bold: true, color: '#FFFFFF' },
};
overview.getRange('A5:B10').format.borders = { preset: 'inside', style: 'thin', color: '#E2E8F0' };
overview.getRange('A5:A10').format.font = { bold: true, color: '#334155' };
overview.getRange('B5:B9').format.numberFormat = '#,##0.0';
overview.getRange('B5:B8').format.numberFormat = '#,##0';
overview.getRange('A12:B15').values = [
  ['Source', runSummary.source],
  ['Category', `${runSummary.category} (${runSummary.categoryId})`],
  ['Visual gallery', path.resolve(path.dirname(options.catalog), 'gallery.html')],
  ['Instructions', 'Set “Selected for Curriculum” to Yes, then filter the catalog table.'],
];
overview.getRange('A12:A15').format.font = { bold: true, color: '#334155' };
overview.getRange('B12:B15').format.wrapText = true;
overview.getRange('14:15').format.rowHeight = 34;
overview.getRange('A1:H15').format.font.name = 'Aptos';
overview.getRange('A:A').format.columnWidth = 27;
overview.getRange('B:B').format.columnWidth = 72;

const headers = [
  'Selected for Curriculum', 'Painting ID', 'Title', 'Image URL', 'PTS Record',
  'Orientation', 'Duration Hours', 'Class Count', 'Date Added', 'Lifecycle Stage',
  'Original Artist', 'Original Location', 'Categories', 'Tags', 'Download Status',
  'Local Image', 'Image SHA-256',
];
catalog.getRange('A1:Q2').merge();
catalog.getRange('A1').values = [['Kids Painting Catalog']];
catalog.getRange('A1:Q2').format = {
  fill: '#14213D',
  font: { bold: true, color: '#FFFFFF', size: 20 },
  verticalAlignment: 'center',
};
catalog.getRange('A4:Q4').merge();
catalog.getRange('A4').values = [[`${records.length.toLocaleString()} Kids-category paintings. Use the gallery for visual review; use this sheet to record curriculum selections and notes.`]];
catalog.getRange('A4:Q4').format = { fill: '#FFF3E8', font: { color: '#7C2D12' }, wrapText: true };
catalog.getRange('A6:Q6').values = [headers];
catalog.getRange('A6:Q6').format = {
  fill: '#E76F51',
  font: { bold: true, color: '#FFFFFF' },
  wrapText: true,
  verticalAlignment: 'center',
};
catalog.getRange(`A7:Q${endRow}`).values = records.map((record) => [
  'No', record.paintingId, record.title, record.originalImageUrl, record.detailUrl,
  record.orientation, record.durationHours, record.classCount, record.dateAdded,
  record.lifecycleStage, record.originalArtist, record.originalLocation, record.categories,
  record.tags, record.downloadStatus, record.localImage, record.imageSha256 || '',
]);
catalog.getRange(`A7:A${endRow}`).dataValidation = { rule: { type: 'list', values: ['No', 'Yes'] } };
catalog.getRange(`G7:H${endRow}`).format.numberFormat = '0.0';
catalog.getRange(`H7:H${endRow}`).format.numberFormat = '#,##0';
catalog.getRange(`A6:Q${endRow}`).format.font.name = 'Aptos';
catalog.getRange(`A7:Q${endRow}`).format.verticalAlignment = 'top';
catalog.getRange(`C7:Q${endRow}`).format.wrapText = true;
catalog.getRange(`A6:Q${endRow}`).format.borders = {
  insideHorizontal: { style: 'thin', color: '#E2E8F0' },
  bottom: { style: 'thin', color: '#CBD5E1' },
};
catalog.getRange(`A7:A${endRow}`).conditionalFormats.add('cellIs', {
  operator: 'equal',
  formula: '"Yes"',
  format: { fill: '#DCFCE7', font: { bold: true, color: '#166534' } },
});
catalog.getRange(`O7:O${endRow}`).conditionalFormats.add('cellIs', {
  operator: 'equal',
  formula: '"failed"',
  format: { fill: '#FEE2E2', font: { color: '#991B1B' } },
});
catalog.tables.add(`A6:Q${endRow}`, true, 'KidsPaintingCatalog');
catalog.freezePanes.freezeRows(6);
catalog.freezePanes.freezeColumns(3);

const widths = [22, 12, 34, 48, 44, 14, 14, 12, 14, 18, 24, 22, 38, 52, 16, 42, 38];
widths.forEach((width, index) => {
  catalog.getRangeByIndexes(0, index, endRow, 1).format.columnWidth = width;
});
catalog.getRange('1:2').format.rowHeight = 30;
catalog.getRange('4:4').format.rowHeight = 32;
catalog.getRange('6:6').format.rowHeight = 34;

const summaryCheck = await workbook.inspect({
  kind: 'table',
  range: 'Overview!A1:B15',
  include: 'values,formulas',
  tableMaxRows: 15,
  tableMaxCols: 2,
});
console.log(summaryCheck.ndjson);
const errorScan = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
console.log(errorScan.ndjson);

await fs.mkdir(path.dirname(options.output), { recursive: true });
const preview = await workbook.render({ sheetName: 'Overview', range: 'A1:B15', scale: 1.5, format: 'png' });
await fs.writeFile(path.join(path.dirname(options.output), 'kids-painting-library-preview.png'), new Uint8Array(await preview.arrayBuffer()));
const catalogPreview = await workbook.render({ sheetName: 'Kids Catalog', range: 'A1:Q18', scale: 1, format: 'png' });
await fs.writeFile(path.join(path.dirname(options.output), 'kids-painting-catalog-preview.png'), new Uint8Array(await catalogPreview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(options.output);
console.log(`Workbook saved: ${options.output}`);
