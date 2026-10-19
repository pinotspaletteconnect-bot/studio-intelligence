'use strict';

const express = require('express');
const { requireCollectorAuth } = require('../middleware/collectorAuth');
const { collectClassRoster } = require('../scripts/pts/classRoster.cjs');

// Mount under /pts/class-roster only after deployment approval. resolveSession
// must use the deployed multi-account resolver and verify target ownership;
// accepting browser credentials or arbitrary URLs from the request is forbidden.
function createClassRosterRouter({ resolveSession, collect = collectClassRoster, runQueued = (_accountId, task) => task() }) {
  if (typeof resolveSession !== 'function') throw Error('Account-isolated source session resolver is required');
  const router = express.Router();
  router.post('/', requireCollectorAuth, async (req, res) => {
    if (!/^\d+$/.test(String(req.body?.classId ?? '')) || !Number.isSafeInteger(req.body?.studioId) ||
        !Number.isSafeInteger(req.body?.accountId) || (req.body.roomId!==undefined&&!/^\d+$/.test(req.body.roomId)) || Object.keys(req.body).some(k => !['classId', 'studioId', 'accountId','roomId'].includes(k))) {
      return res.status(400).json({ success: false, error: 'Invalid class source request' });
    }
    return runQueued(req.body.accountId, async () => {
    let session;
    try {
      session = await resolveSession(req.body);
      if (!session?.page || !session.target || session.target.classId !== String(req.body.classId) ||
          session.target.studioId !== req.body.studioId || session.target.accountId !== req.body.accountId) {
        throw Error('Source account mapping could not be verified');
      }
      const source = await collect(session);
      res.json({ success: true, accountId: req.body.accountId, studioId: req.body.studioId, source });
    } catch (error) {
      // Browser errors can include guest text or session URLs; keep response and
      // service logs sanitized. Detailed diagnostics stay inside a private run.
      const allowedStages = new Set(['account-resolve','browser-launch','source-login','class-before','class-validation','seating-before','order-reservations','class-after','seating-after']);
      res.status(502).json({ success: false, error: 'Class roster collection failed; no destination update was authorized',
        ...(allowedStages.has(error?.sourceStage) ? { sourceStage: error.sourceStage } : {}) });
    } finally {
      if (session?.close) { try { await session.close(); } catch { /* Never leak a session URL through cleanup diagnostics. */ } }
    }
    });
  });
  return router;
}

module.exports = { createClassRosterRouter };
