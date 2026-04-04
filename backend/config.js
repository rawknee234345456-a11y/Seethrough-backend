const path = require("node:path");
const os = require("node:os");

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DB_PATH: path.join(os.tmpdir(), "seethrough-brain", "seethrough.sqlite"),
  SESSION_SECRET: process.env.SESSION_SECRET || "seethrough-local-secret",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "711598903530-dtqqnad7i35vcpnlq3fufs7mioh009jt.apps.googleusercontent.com",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "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",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
  FRONTEND_DIR: path.join(__dirname, "..", "frontend")
};
