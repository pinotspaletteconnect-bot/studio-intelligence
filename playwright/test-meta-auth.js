const path = require("path");

// Load .env from the playwright folder
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const fs = require("fs");

console.log("====================================");
console.log("Meta Authentication Test");
console.log("====================================");
console.log("Working Directory :", process.cwd());
console.log("Script Directory  :", __dirname);
console.log("Playwright .env   :", fs.existsSync(path.join(__dirname, ".env")));
console.log("Token Loaded      :", process.env.META_ACCESS_TOKEN ? "YES" : "NO");
console.log("");

const auth = require("./services/meta/auth");

async function main() {

    console.log("=== AD ACCOUNTS ===\n");

    const accounts = await auth.getAdAccounts();

    console.table(accounts);

    console.log("");

    console.log("=== FACEBOOK PAGES ===\n");

    const pages = await auth.getPages();

    console.table(
        pages.map(page => ({
            id: page.id,
            name: page.name
        }))
    );

    console.log("\nMeta authentication successful.");

}

main().catch(error => {

    console.error("\nMeta authentication failed.\n");
    console.error(error);

});