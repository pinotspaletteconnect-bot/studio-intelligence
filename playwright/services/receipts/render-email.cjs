'use strict';
const {prepareEmailDocument} = require('./email-document.cjs');

// Inject the installed Chromium launcher; this module opens no service or port.
// One request per renderer instance. Caller owns authentication and tenant routing.
function createEmailRenderer(chromium) {
  let busy = false;
  return async function renderEmail(message, context) {
    const prepared = prepareEmailDocument(message, context);
    if (prepared.status !== 'ready_for_pdf_render') return prepared;
    if (busy) throw new Error('Renderer busy; queue this receipt');
    busy = true;
    let browser;
    try {
      browser = await chromium.launch({headless:true, timeout:15000});
      const isolated = await browser.newContext({javaScriptEnabled:false, serviceWorkers:'block', offline:true});
      await isolated.route('**/*', route => route.abort());
      const page = await isolated.newPage();
      page.setDefaultTimeout(10000);
      let timer;
      const work = async () => {
        await page.setContent(prepared.html, {waitUntil:'domcontentloaded', timeout:10000});
        const pdf = await page.pdf({format:'Letter', preferCSSPageSize:true, printBackground:true});
        if (pdf.length > 10000000 || pdf.subarray(0,5).toString() !== '%PDF-') throw new Error('Invalid PDF output');
        return {status:'pdf_ready_for_review', pdf, fileName:prepared.fileName.replace(/\.html$/,'.pdf'),
          sourceMessageId:prepared.sourceMessageId, companyId:prepared.companyId,
          postingAllowed:false, archiveAllowed:false, aiUsed:false};
      };
      try {
        return await Promise.race([work(), new Promise((_,reject) => {
          timer = setTimeout(() => reject(new Error('PDF rendering timed out')),15000);
        })]);
      } finally { clearTimeout(timer); }
    } finally {
      try { if (browser) await browser.close(); } finally { busy = false; }
    }
  };
}
module.exports = {createEmailRenderer};
