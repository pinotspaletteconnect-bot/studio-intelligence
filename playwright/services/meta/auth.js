const axios = require("axios");

const GRAPH_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Returns the Meta access token stored in .env
 */
function getAccessToken() {

    console.log("AUTH sees META_ACCESS_TOKEN:", !!process.env.META_ACCESS_TOKEN);
    console.log("AUTH env keys:", Object.keys(process.env).filter(k => k.includes("META")));

    const token = process.env.META_ACCESS_TOKEN;

    if (!token) {
        throw new Error("META_ACCESS_TOKEN not found in environment variables.");
    }

    return token;
}
/**
 * Generic helper for all Graph API requests.
 */
async function graphRequest(endpoint, params = {}) {

    const response = await axios.get(`${BASE_URL}${endpoint}`, {
        params: {
            access_token: getAccessToken(),
            ...params
        }
    });

    return response.data;

}

/**
 * Returns every ad account available to this token.
 */
async function getAdAccounts() {

    const result = await graphRequest("/me/adaccounts", {
        fields: "id,name,account_status,currency,timezone_name"
    });

    return result.data.map(account => ({
        id: account.id,
        name: account.name,
        accountStatus: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name
    }));

}

/**
 * Returns every Facebook Page this user manages.
 */
async function getPages() {

    const result = await graphRequest("/me/accounts", {
        fields: "id,name,access_token"
    });

    return result.data;

}

module.exports = {
    getAccessToken,
    graphRequest,
    getAdAccounts,
    getPages
};