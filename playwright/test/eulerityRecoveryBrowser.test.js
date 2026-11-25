const test = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { fallbackSourceKey, discoverLocations, selectLocation, validateLocations } = require("../services/eulerityRecoveryBrowser");

async function switchCampaignPage(t, { advertisedCount=2, menuCount=2, disabled=false, extra='', labels=['Studio Alpha','Studio Beta'] }={}) {
    const browser=await chromium.launch({headless:true}); t.after(()=>browser.close());const page=await browser.newPage();
    await page.setContent(`<div role="combobox">Select...</div><div role="listbox"><div role="option">Bulk Delete</div><div role="option">Bulk Clone</div></div>
    <div id="modern-root"><div aria-disabled="${disabled}" onclick="if(this.getAttribute('aria-disabled')==='false')document.querySelector('#modern-menu').hidden=!document.querySelector('#modern-menu').hidden">
      <div><p id="modern-selected">${labels[0]}</p><p>Business \u00b7 Address</p></div><p>ACTIVE</p><div><p color="accentColor2">Switch Campaign (${advertisedCount})</p><span aria-label="Expand"></span></div>
    </div><div id="modern-menu" hidden><input placeholder="Search campaigns, labels or owners"><p>${menuCount} of ${menuCount}</p>
      ${labels.map(label=>`<div><div onclick="document.querySelector('#modern-selected').textContent=this.querySelectorAll('p')[1].textContent.split('\u00b7')[0].trim();document.querySelector('#modern-menu').hidden=true"><span></span><div><p>Business</p><p>${label} \u00b7 Address</p><p color="accentColor2">synthetic@example.test</p></div><p>ACTIVE</p></div></div>`).join('')}
    </div></div>${extra}`); return page;
}

test('current Switch Campaign chooser discovers historical labels and selects only scoped campaign rows',async t=>{
    const page=await switchCampaignPage(t);assert.deepEqual(await discoverLocations(page),[{sourceKey:'label:studio alpha',displayName:'Studio Alpha'},{sourceKey:'label:studio beta',displayName:'Studio Beta'}]);
    await selectLocation(page,{selector_key:'label:studio beta',selector_label:'Studio Beta'});assert.equal(await page.locator('#modern-selected').textContent(),'Studio Beta');
});

test('current chooser rejects disabled, header-menu count mismatch and two visible chooser variants',async t=>{
    for(const options of [{disabled:true},{advertisedCount:4},{extra:'<p>Select a campaign</p>'}]){const page=await switchCampaignPage(t,options);await assert.rejects(discoverLocations(page),/Eulerity/);}
});

test('current multi-campaign chooser never accepts __single__ through a matching label',async t=>{
    const page=await switchCampaignPage(t);await assert.rejects(selectLocation(page,{selector_key:'__single__',selector_label:'Studio Alpha'}),/single-location/);
});

async function campaignPage(t, campaigns, { count = campaigns.length, extraChooser = '', search = '' } = {}) {
    const browser = await chromium.launch({ headless: true });
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.setContent(`<div role="combobox" onclick="document.querySelector('#bulk').hidden=false">Select...</div>
      <div id="bulk" role="listbox"><div role="option">Bulk Delete</div><div role="option">Bulk Clone</div></div>
      <section><div><p>Select a campaign</p><p>${count}</p></div>
      <div><div aria-disabled="false" onclick="const m=document.querySelector('#menu');m.hidden=!m.hidden"><p id="selected">${campaigns[0]?.label || 'Choose'}</p></div>
      <div id="menu" hidden><input placeholder="Search campaigns, labels or owners" value="${search}">
      <p>${count} of ${count}</p><div>${campaigns.map(c => `<div><div ${c.key ? `data-value="${c.key}"` : ''} onclick="document.querySelector('#selected').textContent=this.querySelectorAll('p')[1].textContent.split('�')[0].trim();document.querySelector('#menu').hidden=true"><span></span><div><p>Business</p><p>${c.label} � 100 Main St, City</p><p color="accentColor2">owner@example.test</p></div><p>ACTIVE</p></div></div>`).join('')}</div>
      <p>Create New Campaign</p></div></div></section>${extraChooser}`);
    return page;
}

test('discovers only campaigns despite unrelated first combobox and global options', async t => {
    const page = await campaignPage(t, [{ label: 'Studio Alpha' }, { label: 'Studio Beta' }]);
    assert.deepEqual(await discoverLocations(page), [
        { sourceKey: 'label:studio alpha', displayName: 'Studio Alpha' },
        { sourceKey: 'label:studio beta', displayName: 'Studio Beta' }
    ]);
    await selectLocation(page, { selector_key: 'label:studio beta', selector_label: 'Studio Beta' });
    assert.equal(await page.locator('#selected').textContent(), 'Studio Beta');
});

test('single campaign is positively discovered and legacy single key is constrained', async t => {
    const page = await campaignPage(t, [{ label: 'Studio Alpha', key: 'source-42' }]);
    assert.deepEqual(await discoverLocations(page), [{ sourceKey: 'source-42', displayName: 'Studio Alpha' }]);
    await selectLocation(page, { selector_key: '__single__', selector_label: 'Single location' });
});

test('rejects empty, incomplete, duplicate, unrelated and filtered menus', async t => {
    for (const [campaigns, options] of [
        [[], {}], [[{ label: 'Studio Alpha' }], { count: 2 }],
        [[{ label: 'Studio Alpha' }, { label: 'Studio Alpha' }], {}],
        [[{ label: 'Bulk Delete' }], {}], [[{ label: 'Studio Alpha' }], { search: 'Alpha' }]
    ]) {
        const page = await campaignPage(t, campaigns, options);
        await assert.rejects(discoverLocations(page), /Eulerity/);
    }
});

test('rejects ambiguous chooser and missing selector instead of inventing single location', async t => {
    const page = await campaignPage(t, [{ label: 'Studio Alpha' }], { extraChooser: '<p>Select a campaign</p>' });
    await assert.rejects(discoverLocations(page), /ambiguous/);
    await page.setContent('<div role="combobox">Select...</div>');
    page.setDefaultTimeout(50);
    // Missing chooser fails rather than returning __single__.
    await assert.rejects(discoverLocations(page));
});

test('validation preserves source keys and rejects duplicate keys', () => {
    const records = [{ sourceKey: 'old-source-id', displayName: 'New label' }];
    assert.equal(validateLocations(records, 1)[0].sourceKey, 'old-source-id');
    assert.throws(() => validateLocations([...records, { sourceKey: 'old-source-id', displayName: 'Other' }], 2), /ambiguous/);
});

test('observed campaign labels retain the historical normalized source keys', async t => {
    const labels = ["Pinot's - Gilbert Primary Campaign", "Pinot's Palette - Louisville", "Pinot's Palette Jeffersonville", "Pinot's Palette Short North - Primary Campaign"];
    const page = await campaignPage(t, labels.map(label => ({ label })));
    assert.deepEqual((await discoverLocations(page)).map(row => row.sourceKey), labels.map(fallbackSourceKey));
    await assert.rejects(selectLocation(page, { selector_key: '__single__', selector_label: 'Single location' }), /unavailable or ambiguous/);
    await assert.rejects(selectLocation(page, { selector_key: '__single__', selector_label: labels[0] }), /unavailable or ambiguous/);
});

test('selection confirmation rejects a different campaign with a shared name prefix', async t => {
    const page = await campaignPage(t, [{ label: 'Studio Alpha Extended' }, { label: 'Studio Alpha' }]);
    await page.locator('#menu div[onclick]').evaluateAll(elements => elements.forEach(element => element.removeAttribute('onclick')));
    await assert.rejects(selectLocation(page, { selector_key: 'label:studio alpha', selector_label: 'Studio Alpha' }), /did not confirm/);
});
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {selectReportRange,assertReportContext,collectTarget,calendarParts}=require('../services/eulerityRecoveryBrowser');
const {recoveryRange,validatedRecoveryReports}=require('../services/eulerityRecoveryDates');
const reportParser=require('../services/eulerityParser');
async function reportPage(t){const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage({acceptDownloads:true});await page.setContent(fs.readFileSync(path.join(__dirname,'fixtures/eulerity-recovery-report.html'),'utf8'));return page;}
const explicitRange=recoveryRange('2026-11-09','2026-11-15','2026-11-16');
test('explicitly selects both dates before both downloads and validates genuine source rows',async t=>{
 const page=await reportPage(t);const folder=fs.mkdtempSync(path.join(os.tmpdir(),'eulerity-ui-dates-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const target={selector_key:'source-2',selector_label:'Studio Beta',studio_code:'BETA'};
 const item=await collectTarget(page,target,folder,explicitRange);const parsed=await validatedRecoveryReports(item,target,explicitRange,reportParser);
 assert.equal(parsed.metrics.length,7);assert.equal(parsed.spend.length,7);assert.equal(parsed.budget,null);assert.deepEqual(parsed.sourceEvidence.metricsRange,{fromDate:'2026-11-09',toDate:'2026-11-15'});
 assert.deepEqual(await page.evaluate(()=>fixture.dateClicks),[{report:'metrics',side:0,date:'2026-11-09'},{report:'metrics',side:1,date:'2026-11-15'},{report:'spend',side:0,date:'2026-11-09'},{report:'spend',side:1,date:'2026-11-15'}]);assert.equal(await page.evaluate(()=>fixture.budgetRead),false);assert.equal(await page.locator('#selected').textContent(),'Studio Beta');
});
test('calendar selection navigates months with exact accessible day names',async t=>{
 const page=await reportPage(t);const range=recoveryRange('2026-10-30','2026-11-02','2026-11-16');await selectReportRange(page,range);assert.deepEqual(await assertReportContext(page,'metrics',{displayName:'Studio Alpha'},range),{fromDate:'2026-10-30',toDate:'2026-11-02'});assert.equal(calendarParts('2026-11-11').optionLabel,'Choose Wednesday, November 11th, 2026');assert.equal(calendarParts('2026-11-21').optionLabel,'Choose Saturday, November 21st, 2026');
});
test('unavailable source dates, changed campaign and mismatched displayed ranges fail closed',async t=>{
 const page=await reportPage(t);await assert.rejects(assertReportContext(page,'metrics',{displayName:'Studio Alpha'},explicitRange),/displayed report range/);
 await assert.rejects(assertReportContext(page,'metrics',{displayName:'Another Campaign'},explicitRange),/campaign changed/);
 await assert.rejects(selectReportRange(page,recoveryRange('2026-11-16','2026-11-16','2026-11-17')),/unavailable/);
});
test('source CSV dates still fail validation when UI labels match but CSV content is stale',async t=>{
 const page=await reportPage(t);await page.evaluate(()=>fixture.sourceDateShift=1);const folder=fs.mkdtempSync(path.join(os.tmpdir(),'eulerity-ui-stale-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const target={selector_key:'source-1',selector_label:'Studio Alpha',studio_code:'ALPHA'};const item=await collectTarget(page,target,folder,explicitRange);await assert.rejects(validatedRecoveryReports(item,target,explicitRange,reportParser),/unexpected source dates/);
});
