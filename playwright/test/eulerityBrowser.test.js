const test = require("node:test");
const assert = require("node:assert/strict");

const { bestLocationLabel, fallbackSourceKey, normalizeLocationLabel, sourceKeyForOption } = require("../services/eulerityBrowser");

test("normalizes location labels without hardcoded studio names", () => {
    assert.equal(normalizeLocationLabel("  Pinot's   Palette\nShort North "), "Pinot's Palette Short North");
});

test("prefers a source value over a label", () => {
    assert.equal(sourceKeyForOption({ dataValue: "location-42", displayName: "Short North" }), "location-42");
});

test("falls back to a normalized label when Eulerity exposes no stable value", () => {
    assert.equal(fallbackSourceKey("  Short   North "), "label:short north");
    assert.equal(sourceKeyForOption({ id: "react-select-9-option-1", displayName: "Short North" }), "label:short north");
});

test("uses the clean location leaf instead of address and account text", () => {
    assert.equal(bestLocationLabel({
        displayName: "Pinot's PalettePinot's Palette - Louisville291 N Hubbards Ln, Louisville, KYuser@example.com",
        candidates: ["Pinot's Palette", "Pinot's Palette - Louisville", "291 N Hubbards Ln, Louisville, KY", "user@example.com"]
    }), "Pinot's Palette - Louisville");
});
const { chromium } = require('playwright');
const { discoverLocations, selectLocation, validateLocations } = require('../services/eulerityBrowser');

async function campaignPage(t, campaigns, { count = campaigns.length, extraChooser = '', search = '' } = {}) {
    const browser = await chromium.launch({ headless: true });
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.setContent(`<div role="combobox" onclick="document.querySelector('#bulk').hidden=false">Select...</div>
      <div id="bulk" role="listbox"><div role="option">Bulk Delete</div><div role="option">Bulk Clone</div></div>
      <section><div><p>Select a campaign</p><p>${count}</p></div>
      <div><div aria-disabled="false" onclick="const m=document.querySelector('#menu');m.hidden=!m.hidden"><p id="selected">${campaigns[0]?.label || 'Choose'}</p></div>
      <div id="menu" hidden><input placeholder="Search campaigns, labels or owners" value="${search}">
      <p>${count} of ${count}</p><div>${campaigns.map(c => `<div><div ${c.key ? `data-value="${c.key}"` : ''} onclick="document.querySelector('#selected').textContent=this.querySelectorAll('p')[1].textContent.split('·')[0].trim();document.querySelector('#menu').hidden=true"><span></span><div><p>Business</p><p>${c.label} · 100 Main St, City</p><p color="accentColor2">owner@example.test</p></div><p>ACTIVE</p></div></div>`).join('')}</div>
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
});

test('selection confirmation rejects a different campaign with a shared name prefix', async t => {
    const page = await campaignPage(t, [{ label: 'Studio Alpha Extended' }, { label: 'Studio Alpha' }]);
    await page.locator('#menu div[onclick]').evaluateAll(elements => elements.forEach(element => element.removeAttribute('onclick')));
    await assert.rejects(selectLocation(page, { selector_key: 'label:studio alpha', selector_label: 'Studio Alpha' }), /did not confirm/);
});
