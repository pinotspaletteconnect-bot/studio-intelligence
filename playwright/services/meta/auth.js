const axios = require("axios");
const fs = require("fs");
const path = require("path");

class MetaAuthService {

    constructor() {

        this.graphVersion = "v25.0";
        this.baseUrl = `https://graph.facebook.com/${this.graphVersion}`;

    }

    /**
     * Returns Meta App credentials
     */
    getAppCredentials() {

        return {
            appId: process.env.META_APP_ID,
            appSecret: process.env.META_APP_SECRET
        };

    }

    /**
     * Returns the current stored access token
     */
    getAccessToken() {

    const token = process.env.META_ACCESS_TOKEN;

    console.log("META token prefix:", token?.substring(0, 20));
    console.log("META token suffix:", token?.slice(-10));
console.log("Length:", token.length);
console.log("Bytes :", Buffer.byteLength(token, "utf8"));
console.log("First :", token.substring(0,20));
console.log("Last  :", token.slice(-20));
console.log("Last char code:", token.charCodeAt(token.length - 1));

    if (!token) {
        throw new Error("META_ACCESS_TOKEN not found.");
    }

    return token;
}

    /**
     * Saves the latest access token.
     *
     * TEMP:
     * Writes to .env.
     *
     * FUTURE:
     * Save to Supabase studio_integrations table.
     */
    saveAccessToken(token) {

        const envPath = path.join(__dirname, "../../.env");

        let env = fs.readFileSync(envPath, "utf8");

        if (env.match(/^META_ACCESS_TOKEN=.*$/m)) {

            env = env.replace(
                /^META_ACCESS_TOKEN=.*$/m,
                `META_ACCESS_TOKEN=${token}`
            );

        } else {

            env += `\nMETA_ACCESS_TOKEN=${token}\n`;

        }

        fs.writeFileSync(envPath, env);

        //
        // Update running process immediately
        //

        process.env.META_ACCESS_TOKEN = token;

        console.log("✅ Meta access token updated.");

    }

    /**
     * Completes OAuth authorization.
     *
     * Authorization Code
     *      ↓
     * User Token
     *      ↓
     * Long-lived Token
     *      ↓
     * Save Token
     */
    async completeOAuth(code) {

        if (!code) {
            throw new Error("Missing authorization code.");
        }

        const { appId, appSecret } = this.getAppCredentials();

        const redirectUri =
            "http://localhost:3000/meta/callback";

        //
        // Exchange authorization code
        //

        const response = await axios.get(
            `${this.baseUrl}/oauth/access_token`,
            {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code
                }
            }
        );

        //
        // Exchange for long-lived token
        //

        const longLived = await axios.get(
            `${this.baseUrl}/oauth/access_token`,
            {
                params: {
                    grant_type: "fb_exchange_token",
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: response.data.access_token
                }
            }
        );

        //
        // Save token
        //

        this.saveAccessToken(
            longLived.data.access_token
        );

        return {
            accessToken: longLived.data.access_token,
            expiresIn: longLived.data.expires_in,
            tokenType: longLived.data.token_type
        };

    }

    /**
 * Generic Graph API helper
 */
async graphRequest(endpoint, params = {}) {

    const token = this.getAccessToken();

    console.log("==================================");
    console.log("Meta Endpoint:", endpoint);
    console.log("Token Length:", token.length);
    console.log("Token Start :", token.substring(0, 20));
    console.log("Token End   :", token.slice(-20));
    console.log("==================================");

    try {

        const response = await axios.get(
            `${this.baseUrl}${endpoint}`,
            {
                params: {
                    access_token: token,
                    ...params
                }
            }
        );

        return response.data;

    } catch (error) {

        console.error("Graph API Error:");

        if (error.response?.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }

        throw error;
    }
}
    /**
     * Returns every Business Manager
     * available to this user.
     */
    async getBusinesses() {

        const result = await this.graphRequest(
            "/me/businesses",
            {
                fields: "id,name"
            }
        );

        return result.data.map(business => ({
            id: business.id,
            name: business.name
        }));

    }

    /**
     * Returns every Ad Account
     * available to this user.
     */
    async getAdAccounts() {

        const result = await this.graphRequest(
            "/me/adaccounts",
            {
                fields:
                    "id,name,account_status,currency,timezone_name"
            }
        );

        return result.data.map(account => ({

            id: account.id,
            name: account.name,
            accountStatus: account.account_status,
            currency: account.currency,
            timezone: account.timezone_name

        }));

    }

    /**
     * Returns every Facebook Page
     * managed by this user.
     */
    async getPages() {

        const result = await this.graphRequest(
            "/me/accounts",
            {
                fields: "id,name,access_token"
            }
        );

        return result.data.map(page => ({

            id: page.id,
            name: page.name,
            accessToken: page.access_token

        }));

    }

    /**
     * Returns a single Ad Account.
     */
    async getAdAccount(accountId) {

        return this.graphRequest(
            `/${accountId}`,
            {
                fields:
                    "id,name,account_status,currency,timezone_name"
            }
        );

    }

    /**
     * Tests whether the current
     * access token is valid.
     */
    async validateToken() {

        try {

            await this.graphRequest(
                "/me",
                {
                    fields: "id,name"
                }
            );

            return true;

        } catch (error) {

            return false;

        }

    }

}

module.exports = new MetaAuthService();
