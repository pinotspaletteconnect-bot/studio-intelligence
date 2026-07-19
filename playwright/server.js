const path = require("path");

require("dotenv").config();

const express = require("express");

const eulerityRoutes = require("./routes/eulerity");
const metaRoutes = require("./routes/meta");

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

app.listen(PORT, () => {
    console.log(`🚀 Browser Automation Service listening on port ${PORT}`);
});