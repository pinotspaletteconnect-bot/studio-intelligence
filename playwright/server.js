const path = require("path");

require("dotenv").config();

const express = require("express");

const eulerityRoutes = require("./routes/eulerity");
const metaRoutes = require("./routes/meta");
const ptsRoutes = require("./routes/pts");
const mntnRoutes = require("./routes/mntn");
const ga4Routes = require("./routes/ga4");
const homebaseRoutes = require("./routes/homebase");
const quickbooksRoutes = require("./routes/quickbooks");

const app = express();

// Optional, protected document utility; preserve all existing collectors.
const {createReceiptPdfRouter} = require('./routes/receiptPdf');
const {createEmailRenderer} = require('./services/receipts/render-email.cjs');
app.use('/receipt-pdf', createReceiptPdfRouter({
    render: createEmailRenderer(require('playwright').chromium)
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        service: "Studio Intelligence Browser Automation",
        status: "online",
        version: "1.0"
    });
});

app.use("/eulerity", eulerityRoutes);
app.use("/meta", metaRoutes);
app.use("/pts", ptsRoutes);
app.use("/mntn", mntnRoutes);
app.use("/ga4", ga4Routes);
app.use("/homebase", homebaseRoutes);
app.use("/quickbooks", quickbooksRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Browser Automation Service listening on port ${PORT}`);
});
