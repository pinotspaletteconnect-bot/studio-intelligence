const crypto = require("crypto");
const pending = new Map();
const TTL_MS = 10 * 60 * 1000;
const COOKIE = "meta_oauth_state";
const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/meta/callback" };

function beginMetaOAuth(res) {
    const now = Date.now();
    for (const [key, expires] of pending) if (expires <= now) pending.delete(key);
    if (pending.size >= 32) throw new Error("Too many pending account connections");
    const state = crypto.randomBytes(32).toString("hex");
    pending.set(state, now + TTL_MS);
    res.cookie(COOKIE, state, { ...cookieOptions, maxAge: TTL_MS });
    return state;
}

function requireMetaOAuthState(req, res, next) {
    const state = req.query.state;
    const cookie = (req.get("cookie") || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const expires = typeof state === "string" ? pending.get(state) : undefined;
    if (!expires || expires <= Date.now() || cookie !== state) {
        return res.status(400).json({ success: false, error: "Account connection expired or is invalid. Start again." });
    }
    pending.delete(state);
    res.clearCookie(COOKIE, cookieOptions);
    res.set("Cache-Control", "no-store");
    next();
}

module.exports = { beginMetaOAuth, requireMetaOAuthState };
