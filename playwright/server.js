const path = require("path");

require("dotenv").config();

const express = require("express");

const eulerityRoutes = require("./routes/eulerity");
const metaRoutes = require("./routes/meta");
const ptsRoutes = require("./routes/pts");
const mntnRoutes = require("./routes/mntn");
const ga4Routes = require("./routes/ga4");

const app = express();

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

app.listen(PORT, () => {
    console.log(`🚀 Browser Automation Service listening on port ${PORT}`);
});
