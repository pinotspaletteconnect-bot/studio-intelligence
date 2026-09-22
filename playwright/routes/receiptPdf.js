'use strict';
const express = require('express');
const {timingSafeEqual} = require('node:crypto');
function createReceiptPdfRouter({render, env = process.env}) {
  const router = express.Router();
  let busy = false;
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const secret = env.RECEIPT_PDF_TOKEN;
    if (env.RECEIPT_PDF_ENABLED !== 'true' || typeof secret !== 'string' || secret.length < 32)
      return res.status(503).json({error:'PDF pilot disabled'});
    const supplied = Buffer.from(req.get('authorization') || '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return res.status(401).json({error:'Unauthorized'});
    next();
  });
  router.post('/email', express.json({limit:'1mb', inflate:false}), async (req, res) => {
    if (busy) return res.status(429).set('Retry-After','5').json({error:'Renderer busy'});
    if (!req.body || typeof req.body.message !== 'object' || !req.body.message ||
        !req.body.context || typeof req.body.context.companyId !== 'string')
      return res.status(400).json({error:'Invalid source document'});
    busy = true;
    try {
      const result = await render(req.body.message, req.body.context);
      if (result.status !== 'pdf_ready_for_review')
        return res.status(422).json({error:'Source requires review', postingAllowed:false, archiveAllowed:false});
      res.set('X-Content-Type-Options','nosniff');
      res.set('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.type('application/pdf').send(result.pdf);
    } catch {
      res.status(503).json({error:'PDF rendering failed; source retained for review'});
    } finally { busy = false; }
  });
  router.use((err, req, res, next) => {
    res.status(err.type === 'entity.too.large' ? 413 : 400).json({error:'Invalid request body'});
  });
  return router;
}
module.exports = {createReceiptPdfRouter};
