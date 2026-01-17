const isProd = true; // VPS is production

// Centralized cookie options for session cookie
// Note: secure remains false because we are serving over http://IP
// and SameSite/path/maxAge mirror previous behavior.
module.exports = {
  COOKIE_NAME: "sid",
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge:
      process.env.SESSION_MAX_AGE
        ? Number(process.env.SESSION_MAX_AGE)
        : 365 * 24 * 60 * 60 * 1000, // default 1 year like before
  },
};
