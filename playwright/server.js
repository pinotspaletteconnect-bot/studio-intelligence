const path = require("path");

require("dotenv").config();

console.log("dotenv path:", path.join(__dirname, ".env"));
console.log("META token loaded:", !!process.env.META_ACCESS_TOKEN);

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