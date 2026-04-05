const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { URL } = require("node:url");
const config = require("./config");

fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });
const db = new DatabaseSync(config.DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    start_balance REAL NOT NULL,
    cash REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    average_price REAL NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, symbol),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market_type TEXT NOT NULL,
    action TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS research_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    asset TEXT NOT NULL,
    market_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const supportedResearchAssets = {
  stock: [
    { symbol: "AAPL", name: "Apple", yahooSymbol: "AAPL", aliases: ["AAPL", "APPLE"] },
    { symbol: "TSLA", name: "Tesla", yahooSymbol: "TSLA", aliases: ["TSLA", "TESLA"] },
    { symbol: "MSFT", name: "Microsoft", yahooSymbol: "MSFT", aliases: ["MSFT", "MICROSOFT"] }
  ],
  forex: [
    { symbol: "EUR/USD", name: "Euro / US Dollar", yahooSymbol: "EURUSD=X", aliases: ["EURUSD", "EUR/USD", "EUROUSD"] },
    { symbol: "GBP/USD", name: "British Pound / US Dollar", yahooSymbol: "GBPUSD=X", aliases: ["GBPUSD", "GBP/USD", "POUNDUSD"] },
    { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", yahooSymbol: "USDJPY=X", aliases: ["USDJPY", "USD/JPY", "DOLLARYEN"] },
    { symbol: "USD/INR", name: "US Dollar / Indian Rupee", yahooSymbol: "USDINR=X", aliases: ["USDINR", "USD/INR", "DOLLARRUPEE"] }
  ],
  crypto: [
    { symbol: "BTC", name: "Bitcoin", yahooSymbol: "BTC-USD", aliases: ["BTC", "BITCOIN", "BTCUSD"] },
    { symbol: "ETH", name: "Ethereum", yahooSymbol: "ETH-USD", aliases: ["ETH", "ETHEREUM", "ETHUSD"] }
  ]
};

const tradingWatchlistAssets = [
  ...supportedResearchAssets.stock.map((asset) => ({ ...asset, marketType: "stock" })),
  ...supportedResearchAssets.crypto.map((asset) => ({ ...asset, marketType: "crypto" }))
];

const usdToInrCache = {
  value: 83.2,
  fetchedAt: 0
};

const USD_TO_INR_CACHE_MS = 1000 * 60 * 5;
const supportedCurrencyLocales = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "en-AE"
};
const regionalTldCurrencyMap = {
  in: { currency: "INR", locale: "en-IN" },
  uk: { currency: "GBP", locale: "en-GB" },
  gb: { currency: "GBP", locale: "en-GB" },
  ie: { currency: "EUR", locale: "en-IE" },
  de: { currency: "EUR", locale: "de-DE" },
  fr: { currency: "EUR", locale: "fr-FR" },
  es: { currency: "EUR", locale: "es-ES" },
  it: { currency: "EUR", locale: "it-IT" },
  nl: { currency: "EUR", locale: "nl-NL" },
  pt: { currency: "EUR", locale: "pt-PT" },
  jp: { currency: "JPY", locale: "ja-JP" },
  au: { currency: "AUD", locale: "en-AU" },
  ca: { currency: "CAD", locale: "en-CA" },
  sg: { currency: "SGD", locale: "en-SG" },
  ae: { currency: "AED", locale: "en-AE" },
  us: { currency: "USD", locale: "en-US" }
};
const localeCurrencyMap = {
  "en-in": { currency: "INR", locale: "en-IN" },
  "hi-in": { currency: "INR", locale: "hi-IN" },
  "en-us": { currency: "USD", locale: "en-US" },
  "en-gb": { currency: "GBP", locale: "en-GB" },
  "en-ie": { currency: "EUR", locale: "en-IE" },
  "de-de": { currency: "EUR", locale: "de-DE" },
  "fr-fr": { currency: "EUR", locale: "fr-FR" },
  "es-es": { currency: "EUR", locale: "es-ES" },
  "it-it": { currency: "EUR", locale: "it-IT" },
  "ja-jp": { currency: "JPY", locale: "ja-JP" },
  "en-au": { currency: "AUD", locale: "en-AU" },
  "en-ca": { currency: "CAD", locale: "en-CA" },
  "en-sg": { currency: "SGD", locale: "en-SG" },
  "ar-ae": { currency: "AED", locale: "ar-AE" }
};
const timezoneCurrencyMap = [
  { pattern: /^Asia\/Kolkata$/i, currency: "INR", locale: "en-IN" },
  { pattern: /^Europe\/London$/i, currency: "GBP", locale: "en-GB" },
  { pattern: /^Europe\/(Paris|Berlin|Madrid|Rome|Amsterdam|Dublin)/i, currency: "EUR", locale: "en-IE" },
  { pattern: /^Asia\/Tokyo$/i, currency: "JPY", locale: "ja-JP" },
  { pattern: /^Australia\//i, currency: "AUD", locale: "en-AU" },
  { pattern: /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana)/i, currency: "USD", locale: "en-US" },
  { pattern: /^America\/Toronto$/i, currency: "CAD", locale: "en-CA" },
  { pattern: /^Asia\/Singapore$/i, currency: "SGD", locale: "en-SG" },
  { pattern: /^Asia\/Dubai$/i, currency: "AED", locale: "en-AE" }
];
const usdToCurrencyCache = new Map();
const genericEmailProviders = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "ymail.com",
  "proton.me",
  "protonmail.com",
  "aol.com"
]);
const yahooRequestHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://finance.yahoo.com",
  "Referer": "https://finance.yahoo.com/"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(config.PORT, () => {
  console.log(`SeeThrough Brain running on http://localhost:${config.PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/market/watchlist") {
    try {
      const session = getOptionalSession(req);
      const regionalSettings = getRegionalSettingsForRequest({ req, userId: session?.userId });
      const marketData = await getTradingWatchlist(regionalSettings);
      sendJson(res, 200, {
        marketData,
        currency: regionalSettings.currency,
        locale: regionalSettings.locale,
        fetchedAt: isoNow()
      });
    } catch (error) {
      sendJson(res, 502, { error: error.message || "Live market data is unavailable right now." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/market/quote") {
    const symbol = String(url.searchParams.get("symbol") || "").trim();
    const marketType = String(url.searchParams.get("marketType") || "").trim().toLowerCase();
    const name = String(url.searchParams.get("name") || symbol).trim();

    if (!symbol || !marketType) {
      sendJson(res, 400, { error: "Symbol and market type are required." });
      return;
    }

    try {
      const session = getOptionalSession(req);
      const regionalSettings = getRegionalSettingsForRequest({ req, userId: session?.userId });
      const quote = await getLivePaperTradeQuote({ symbol, name, marketType, regionalSettings });
      sendJson(res, 200, quote);
    } catch (error) {
      sendJson(res, /not available for paper trading/i.test(String(error.message || "")) ? 400 : 502, {
        error: error.message || "Live quote data is unavailable right now."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await readJsonBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || password.length < 6) {
      sendJson(res, 400, { error: "Name, email, and a password of at least 6 characters are required." });
      return;
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      sendJson(res, 409, { error: "An account with this email already exists." });
      return;
    }

    const now = isoNow();
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, passwordHash, salt, now);

    const userId = Number(result.lastInsertRowid);
    db.prepare(`
      INSERT INTO accounts (user_id, start_balance, cash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, 100000, 100000, now, now);

    const token = createSession(userId);
    sendJson(res, 201, {
      token,
      user: getUserById(userId, req),
      account: getAccountSnapshot(userId)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || hashPassword(password, user.password_salt) !== user.password_hash) {
      sendJson(res, 401, { error: "Invalid email or password." });
      return;
    }

    db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(isoNow(), user.id);
    const token = createSession(user.id);

    sendJson(res, 200, {
      token,
      user: getUserById(user.id, req),
      account: getAccountSnapshot(user.id)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/google") {
    const body = await readJsonBody(req);
    const idToken = String(body.idToken || "").trim();
    if (!idToken) {
      sendJson(res, 400, { error: "Google ID token is required." });
      return;
    }
    if (!config.GOOGLE_CLIENT_ID) {
      sendJson(res, 400, { error: "Google login is not configured on the server." });
      return;
    }

    let profile;
    try {
      const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      profile = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(profile.error_description || "Google token verification failed.");
      }
      if (String(profile.aud || "") !== String(config.GOOGLE_CLIENT_ID)) {
        throw new Error("Google token audience mismatch.");
      }
      if (!profile.email) {
        throw new Error("Google account email is missing.");
      }
    } catch (error) {
      sendJson(res, 401, { error: error.message || "Google sign-in failed." });
      return;
    }

    const email = String(profile.email).trim().toLowerCase();
    const name = String(profile.name || body.name || "SeeThrough User").trim();
    const now = isoNow();
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword(crypto.randomBytes(32).toString("hex"), salt);
      const created = db.prepare(`
        INSERT INTO users (name, email, password_hash, password_salt, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, email, passwordHash, salt, now, now);
      const userId = Number(created.lastInsertRowid);
      db.prepare(`
        INSERT INTO accounts (user_id, start_balance, cash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 100000, 100000, now, now);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    } else {
      db.prepare("UPDATE users SET name = ?, last_login_at = ? WHERE id = ?").run(name, now, user.id);
    }

    const token = createSession(user.id);
    sendJson(res, 200, {
      token,
      user: getUserById(user.id, req),
      account: getAccountSnapshot(user.id)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(session.token));
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    sendJson(res, 200, {
      user: getUserById(session.userId, req),
      account: getAccountSnapshot(session.userId)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/account") {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    sendJson(res, 200, getAccountSnapshot(session.userId));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    const trades = db.prepare(`
      SELECT id, symbol, name, market_type, action, quantity, price, total, created_at
      FROM trades
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 30
    `).all(session.userId);

    sendJson(res, 200, { trades });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    const body = await readJsonBody(req);
    const symbol = String(body.symbol || "").trim().toUpperCase();
    const name = String(body.name || symbol).trim();
    const marketType = String(body.marketType || "asset").trim().toLowerCase();
    const action = String(body.action || "").trim().toLowerCase();
    const quantity = Number(body.quantity);

    if (!symbol || !name || !["buy", "sell"].includes(action) || !(quantity > 0)) {
      sendJson(res, 400, { error: "Trade request is missing required fields." });
      return;
    }

    let liveQuote;
    try {
      const regionalSettings = getRegionalSettingsForRequest({ req, userId: session.userId });
      liveQuote = await getLivePaperTradeQuote({ symbol, name, marketType, regionalSettings });
    } catch (error) {
      sendJson(res, /not available for paper trading/i.test(String(error.message || "")) ? 400 : 502, {
        error: error.message || "Live trade pricing is unavailable right now."
      });
      return;
    }

    const price = Number(liveQuote.price);
    if (!(price > 0)) {
      sendJson(res, 502, { error: "Live trade pricing is unavailable right now. Please try again." });
      return;
    }

    const account = db.prepare("SELECT * FROM accounts WHERE user_id = ?").get(session.userId);
    const position = db.prepare("SELECT * FROM positions WHERE user_id = ? AND symbol = ?").get(session.userId, symbol);
    const total = roundMoney(quantity * price);
    const now = isoNow();

    if (action === "buy" && account.cash < total) {
      sendJson(res, 400, { error: "Not enough virtual cash for that trade." });
      return;
    }

    if (action === "sell" && (!position || position.quantity < quantity)) {
      sendJson(res, 400, { error: "Not enough quantity to sell." });
      return;
    }

    db.exec("BEGIN");

    try {
      if (action === "buy") {
        const nextCash = roundMoney(account.cash - total);
        db.prepare("UPDATE accounts SET cash = ?, updated_at = ? WHERE user_id = ?").run(nextCash, now, session.userId);

        if (position) {
          const nextQuantity = position.quantity + quantity;
          const nextAverage = roundMoney(((position.average_price * position.quantity) + total) / nextQuantity);
          db.prepare(`
            UPDATE positions
            SET quantity = ?, average_price = ?, name = ?, market_type = ?, updated_at = ?
            WHERE user_id = ? AND symbol = ?
          `).run(nextQuantity, nextAverage, name, marketType, now, session.userId, symbol);
        } else {
          db.prepare(`
            INSERT INTO positions (user_id, symbol, name, market_type, quantity, average_price, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(session.userId, symbol, name, marketType, quantity, price, now);
        }
      } else {
        const nextCash = roundMoney(account.cash + total);
        const nextQuantity = roundMoney(position.quantity - quantity);
        db.prepare("UPDATE accounts SET cash = ?, updated_at = ? WHERE user_id = ?").run(nextCash, now, session.userId);

        if (nextQuantity <= 0) {
          db.prepare("DELETE FROM positions WHERE user_id = ? AND symbol = ?").run(session.userId, symbol);
        } else {
          db.prepare(`
            UPDATE positions
            SET quantity = ?, updated_at = ?
            WHERE user_id = ? AND symbol = ?
          `).run(nextQuantity, now, session.userId, symbol);
        }
      }

      db.prepare(`
        INSERT INTO trades (user_id, symbol, name, market_type, action, quantity, price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(session.userId, symbol, name, marketType, action, quantity, price, total, now);

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    sendJson(res, 200, {
      account: getAccountSnapshot(session.userId),
      executedPrice: price,
      marketTimestamp: liveQuote.fetchedAt,
      quote: liveQuote
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/research/chat") {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    const body = await readJsonBody(req);
    const asset = String(body.asset || "").trim();
    const marketType = String(body.marketType || "stock").trim();
    const prompt = String(body.prompt || "").trim();
    const scope = String(body.scope || "research").trim();
    const requestedSymbol = String(body.symbol || "").trim();
    const requestedName = String(body.assetName || "").trim();
    const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];

    if (!asset) {
      sendJson(res, 400, { error: "Please provide an asset name or symbol." });
      return;
    }

    const normalizedMarketType = String(marketType || "stock").trim().toLowerCase();
    const resolvedAsset = resolveSupportedResearchAsset({
      asset,
      marketType: normalizedMarketType,
      requestedSymbol,
      requestedName
    });
    if (!resolvedAsset) {
      sendJson(res, 400, {
        error: "That asset is not available for the selected market type in AI chat."
      });
      return;
    }

    const conversationalType = classifyConversationalPrompt(prompt);
    if (conversationalType) {
      const answer = buildConversationalReply({
        conversationalType,
        asset: resolvedAsset
      });

      db.prepare(`
        INSERT INTO research_logs (user_id, asset, market_type, prompt, response, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(session.userId, resolvedAsset.symbol, normalizedMarketType, prompt, answer, isoNow());

      sendJson(res, 200, {
        answer,
        model: "conversation-guard"
      });
      return;
    }

    const promptValidationError = validateResearchPrompt({
      asset: resolvedAsset.symbol,
      prompt,
      marketType: normalizedMarketType
    });
    if (promptValidationError) {
      sendJson(res, 400, { error: promptValidationError });
      return;
    }

    const marketSnapshot = await fetchMarketSnapshot({
      resolvedAsset,
      marketType: normalizedMarketType
    }).catch(() => null);
    if (!marketSnapshot) {
      sendJson(res, 502, {
        error: "Live market data could not be fetched for that asset right now. Please try again."
      });
      return;
    }

    const snapshotContext = buildMarketContext(marketSnapshot);
    const historyContext = buildHistoryContext(chatHistory);
    const questionType = classifyResearchQuestion(prompt);
    const responseShape = buildResponseShapeInstructions(questionType, scope);
    const shouldAppendAdviceDisclaimer = needsFinancialAdviceDisclaimer(prompt, questionType);

    const deterministicAnswer = generateStructuredMarketAnswer({
      questionType,
      snapshot: marketSnapshot,
      asset: resolvedAsset.symbol,
      prompt,
      marketType: normalizedMarketType,
      scope
    });

    const composedPrompt = scope === "quick"
      ? [
          `Asset: ${resolvedAsset.name} (${resolvedAsset.symbol})`,
          `Market type: ${normalizedMarketType}`,
          `Current market snapshot:\n${snapshotContext}`,
          historyContext ? `Recent conversation:\n${historyContext}` : "",
          `User question: ${prompt || "Explain what is happening right now in simple language."}`,
          "Instructions:",
          "- Answer the user's question directly, not a generic asset summary.",
          "- Base the answer on the current market snapshot only.",
          "- Treat the quote timestamp as the latest known market moment.",
          "- If the snapshot is incomplete, say what cannot be confirmed live.",
          "- Keep it beginner-friendly and concise.",
          "- Do not include company introductions, bull/bear lists, broad overviews, or a conclusion unless the user explicitly asked for them.",
          "- Do not include a generic disclaimer footer.",
          "- If the user asks about risks, answer only with the current risks visible from this snapshot and the immediate market context.",
          "- If the user asks about winning probability, give only a conditional probability range based on the current live setup and explain what would increase or reduce that probability right now.",
          `Response format:\n${responseShape}`
        ].filter(Boolean).join("\n\n")
      : [
          `Asset: ${resolvedAsset.name} (${resolvedAsset.symbol})`,
          `Market type: ${normalizedMarketType}`,
          `Current market snapshot:\n${snapshotContext}`,
          historyContext ? `Recent conversation:\n${historyContext}` : "",
          `User question: ${prompt || "Provide a detailed research answer."}`,
          "Instructions:",
          "- Answer the user's actual question directly.",
          "- Use the current market snapshot as the primary factual base.",
          "- Do not drift into a generic company or asset description unless it helps answer the user's question.",
          "- Focus on what is happening at the latest available market timestamp and the current intraday trend.",
          "- When discussing levels, momentum, strength, weakness, or risk, tie them to the provided live numbers.",
          "- If something cannot be verified from the current snapshot, say that clearly instead of guessing.",
          "- Structure the answer around the user's question only.",
          "- Do not add sections the user did not ask for.",
          "- Do not include a generic conclusion or disclaimer footer.",
          "- Sound natural and analytical, not like a canned template.",
          "- Do not use fixed headings like 'What to watch now' unless the user explicitly asked for a list or checklist.",
          "- If the user asks about risks, give only the current risks and why they matter right now.",
          "- If the user asks about winning probability, estimate it only as a conditional range based on the live setup, and explain what must happen next for that probability to improve or weaken.",
          `Response format:\n${responseShape}`
        ].filter(Boolean).join("\n\n");

    try {
      const aiResult = await requestOpenRouterWithFallback([
        {
          role: "system",
          content: "You are a calm financial research assistant for learning purposes only. Answer the user's specific market question using only the provided latest market snapshot and immediate market context. Do not give generic asset explainers, broad templates, or extra sections the user did not request. If information is not supported by the snapshot, say so clearly."
        },
        {
          role: "user",
          content: composedPrompt
        }
      ], 0.35);

      db.prepare(`
        INSERT INTO research_logs (user_id, asset, market_type, prompt, response, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        session.userId,
        resolvedAsset.symbol,
        normalizedMarketType,
        prompt || composedPrompt,
        finalizeResearchAnswer(cleanDisplayedResearchAnswer(sanitizeAiResearchResponse(aiResult.content, questionType), questionType, scope), shouldAppendAdviceDisclaimer),
        isoNow()
      );

      sendJson(res, 200, {
        answer: finalizeResearchAnswer(cleanDisplayedResearchAnswer(sanitizeAiResearchResponse(aiResult.content, questionType), questionType, scope), shouldAppendAdviceDisclaimer),
        model: aiResult.model
      });
    } catch (error) {
      if (deterministicAnswer) {
        db.prepare(`
          INSERT INTO research_logs (user_id, asset, market_type, prompt, response, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          session.userId,
          resolvedAsset.symbol,
          normalizedMarketType,
          prompt,
          finalizeResearchAnswer(cleanDisplayedResearchAnswer(deterministicAnswer, questionType, scope), shouldAppendAdviceDisclaimer),
          isoNow()
        );

        sendJson(res, 200, {
          answer: finalizeResearchAnswer(cleanDisplayedResearchAnswer(deterministicAnswer, questionType, scope), shouldAppendAdviceDisclaimer),
          model: "market-snapshot-engine-fallback"
        });
        return;
      }

      sendJson(res, 502, { error: error.message || "Research request failed." });
    }
    return;
  }

  sendJson(res, 404, { error: "Route not found" });
}

function requireAuth(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: "Authentication required." });
    return null;
  }

  const session = db.prepare(`
    SELECT user_id, expires_at
    FROM sessions
    WHERE token_hash = ?
  `).get(hashToken(token));

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    sendJson(res, 401, { error: "Session expired. Please log in again." });
    return null;
  }

  return {
    token,
    userId: session.user_id
  };
}

function getOptionalSession(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const session = db.prepare(`
    SELECT user_id, expires_at
    FROM sessions
    WHERE token_hash = ?
  `).get(hashToken(token));

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return null;
  }

  return {
    token,
    userId: session.user_id
  };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = isoNow();
  const expiresAt = new Date(Date.now() + (1000 * 60 * 60 * 24 * 30)).toISOString();

  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, hashToken(token), expiresAt, now);

  return token;
}

function getUserById(userId, req) {
  const user = db.prepare(`
    SELECT id, name, email, created_at, last_login_at
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    return null;
  }

  const regionalSettings = inferRegionalSettings({
    email: user.email,
    locale: getClientLocale(req),
    timezone: getClientTimezone(req)
  });

  return {
    ...user,
    preferredCurrency: regionalSettings.currency,
    preferredLocale: regionalSettings.locale
  };
}

function getAccountSnapshot(userId) {
  const account = db.prepare(`
    SELECT start_balance, cash, created_at, updated_at
    FROM accounts
    WHERE user_id = ?
  `).get(userId);

  const positions = db.prepare(`
    SELECT symbol, name, market_type AS marketType, quantity, average_price AS averagePrice, updated_at AS updatedAt
    FROM positions
    WHERE user_id = ?
    ORDER BY symbol
  `).all(userId);

  const trades = db.prepare(`
    SELECT id, symbol, name, market_type AS marketType, action, quantity, price, total, created_at AS createdAt
    FROM trades
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 12
  `).all(userId);

  return {
    startBalance: account.start_balance,
    cash: account.cash,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    positions,
    trades
  };
}

function getRegionalSettingsForRequest({ req, userId }) {
  let email = "";
  if (userId) {
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId);
    email = String(user?.email || "").trim().toLowerCase();
  }

  return inferRegionalSettings({
    email,
    locale: getClientLocale(req),
    timezone: getClientTimezone(req)
  });
}

function inferRegionalSettings({ email, locale, timezone }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedLocale = normalizeLocale(locale);
  const normalizedTimezone = String(timezone || "").trim();

  const byEmail = inferRegionalSettingsFromEmail(normalizedEmail);
  if (byEmail) {
    return byEmail;
  }

  const byLocale = localeCurrencyMap[normalizedLocale];
  if (byLocale) {
    return byLocale;
  }

  const byTimezone = timezoneCurrencyMap.find((entry) => entry.pattern.test(normalizedTimezone));
  if (byTimezone) {
    return {
      currency: byTimezone.currency,
      locale: byTimezone.locale
    };
  }

  return {
    currency: "USD",
    locale: "en-US"
  };
}

function inferRegionalSettingsFromEmail(email) {
  if (!email.includes("@")) {
    return null;
  }

  const domain = email.split("@")[1] || "";
  if (!domain || genericEmailProviders.has(domain)) {
    return null;
  }

  const segments = domain.split(".").filter(Boolean);
  const tld = segments[segments.length - 1]?.toLowerCase() || "";
  const secondLevel = segments.length > 1 ? segments[segments.length - 2].toLowerCase() : "";
  const regionKey = tld === "uk" ? "uk" : secondLevel === "co" && tld === "uk" ? "uk" : tld;

  return regionalTldCurrencyMap[regionKey] || null;
}

function getClientLocale(req) {
  const headerLocale = String(req?.headers?.["x-user-locale"] || "").trim();
  if (headerLocale) {
    return headerLocale;
  }

  const acceptLanguage = String(req?.headers?.["accept-language"] || "").trim();
  if (!acceptLanguage) {
    return "en-US";
  }

  return acceptLanguage.split(",")[0].trim() || "en-US";
}

function getClientTimezone(req) {
  return String(req?.headers?.["x-user-timezone"] || "").trim();
}

function normalizeLocale(locale) {
  return String(locale || "en-US").trim().replace(/_/g, "-").toLowerCase();
}

function serveStatic(res, pathname) {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(config.FRONTEND_DIR, safePath);

  if (!filePath.startsWith(config.FRONTEND_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  let resolvedPath = filePath;
  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    resolvedPath = path.join(config.FRONTEND_DIR, "index.html");
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";
  const content = fs.readFileSync(resolvedPath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate"
  });
  res.end(content);
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid JSON body.");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Locale, X-User-Timezone",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Locale, X-User-Timezone",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end();
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

async function fetchMarketSnapshot({ resolvedAsset, marketType }) {
  const normalizedMarketType = String(marketType || "stock").trim().toLowerCase();
  if (!resolvedAsset) {
    throw new Error("A valid supported asset is required.");
  }

  if (normalizedMarketType === "crypto") {
    return fetchYahooSnapshot({
      yahooSymbol: resolvedAsset.yahooSymbol,
      marketType: normalizedMarketType,
      symbol: resolvedAsset.symbol,
      name: resolvedAsset.name
    });
  }

  if (normalizedMarketType === "forex") {
    return fetchYahooSnapshot({
      yahooSymbol: resolvedAsset.yahooSymbol,
      marketType: normalizedMarketType,
      symbol: resolvedAsset.symbol,
      name: resolvedAsset.name
    });
  }

  return fetchYahooSnapshot({
    yahooSymbol: resolvedAsset.yahooSymbol,
    marketType: normalizedMarketType,
    symbol: resolvedAsset.symbol,
    name: resolvedAsset.name
  });
}

async function getTradingWatchlist(regionalSettings) {
  const settledQuotes = await Promise.allSettled(
    tradingWatchlistAssets.map(async (asset) => {
      const snapshot = await fetchMarketSnapshot({
        resolvedAsset: asset,
        marketType: asset.marketType
      });

      return convertSnapshotToTradingQuote({
        snapshot,
        marketType: asset.marketType,
        regionalSettings,
        fallbackName: asset.name,
        fallbackSymbol: asset.symbol
      });
    })
  );

  const marketData = settledQuotes
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (!marketData.length) {
    throw new Error("Live market data is unavailable right now.");
  }

  return marketData;
}

async function getLivePaperTradeQuote({ symbol, name, marketType, regionalSettings }) {
  const normalizedMarketType = String(marketType || "").trim().toLowerCase();
  const resolvedAsset = resolveSupportedResearchAsset({
    asset: `${name} (${symbol})`,
    marketType: normalizedMarketType,
    requestedSymbol: symbol,
    requestedName: name
  });

  if (!resolvedAsset || !["stock", "crypto"].includes(normalizedMarketType)) {
    throw new Error("That asset is not available for paper trading.");
  }

  const snapshot = await fetchMarketSnapshot({
    resolvedAsset,
    marketType: normalizedMarketType
  });

  return convertSnapshotToTradingQuote({
    snapshot,
    marketType: normalizedMarketType,
    regionalSettings,
    fallbackName: resolvedAsset.name,
    fallbackSymbol: resolvedAsset.symbol
  });
}

async function getUsdToCurrencyRate(targetCurrency) {
  const normalizedCurrency = String(targetCurrency || "USD").trim().toUpperCase();
  if (normalizedCurrency === "USD") {
    return 1;
  }

  if (normalizedCurrency === "INR" && usdToInrCache.fetchedAt && (Date.now() - usdToInrCache.fetchedAt) < USD_TO_INR_CACHE_MS) {
    return usdToInrCache.value;
  }

  const cachedRate = usdToCurrencyCache.get(normalizedCurrency);
  if (cachedRate && (Date.now() - cachedRate.fetchedAt) < USD_TO_INR_CACHE_MS) {
    return cachedRate.value;
  }

  try {
    const snapshot = await fetchYahooSnapshot({
      yahooSymbol: `USD${normalizedCurrency}=X`,
      marketType: "forex",
      symbol: `USD/${normalizedCurrency}`,
      name: `US Dollar / ${normalizedCurrency}`
    });

    if (Number(snapshot.price) > 0) {
      const nextRate = Number(snapshot.price);
      usdToCurrencyCache.set(normalizedCurrency, {
        value: nextRate,
        fetchedAt: Date.now()
      });
      if (normalizedCurrency === "INR") {
        usdToInrCache.value = nextRate;
        usdToInrCache.fetchedAt = Date.now();
      }
      return nextRate;
    }
  } catch (error) {
    // Keep the last known conversion rate if the live forex conversion is unavailable.
  }

  if (normalizedCurrency === "INR") {
    return usdToInrCache.value;
  }

  return cachedRate?.value || 1;
}

async function convertSnapshotToTradingQuote({ snapshot, marketType, regionalSettings, fallbackName, fallbackSymbol }) {
  const rawCurrency = String(snapshot?.currency || "").trim().toUpperCase();
  const preferredCurrency = String(regionalSettings?.currency || "USD").trim().toUpperCase();
  const preferredLocale = regionalSettings?.locale || supportedCurrencyLocales[preferredCurrency] || "en-US";
  const conversionRate = rawCurrency === preferredCurrency
    ? 1
    : rawCurrency === "USD"
      ? Number(await getUsdToCurrencyRate(preferredCurrency))
      : 1;
  const rawPrice = Number(snapshot?.price || 0);
  const rawPreviousClose = Number(snapshot?.previousClose || snapshot?.sessionOpen || rawPrice);
  const rawChange = Number(snapshot?.change || (rawPrice - rawPreviousClose));
  const rawChangePercent = Number.isFinite(Number(snapshot?.changePercent))
    ? Number(snapshot.changePercent)
    : (rawPreviousClose ? (rawChange / rawPreviousClose) * 100 : 0);
  const price = roundMoney(rawPrice * conversionRate);
  const previousClose = roundMoney(rawPreviousClose * conversionRate);
  const change = roundMoney(rawChange * conversionRate);
  const changePercent = roundMoney(rawChangePercent);

  return {
    id: String(snapshot?.symbol || fallbackSymbol || "").trim().toUpperCase(),
    symbol: String(snapshot?.symbol || fallbackSymbol || "").trim().toUpperCase(),
    name: String(snapshot?.name || fallbackName || fallbackSymbol || "Unknown asset").trim(),
    type: marketType,
    marketType,
    price,
    previousClose,
    change,
    changePercent,
    trend: changePercent >= 0 ? "up" : "down",
    currency: preferredCurrency,
    locale: preferredLocale,
    rawCurrency: rawCurrency || "USD",
    exchange: snapshot?.exchange || "",
    fetchedAt: snapshot?.fetchedAt || isoNow()
  };
}

function resolveSupportedResearchAsset({ asset, marketType, requestedSymbol, requestedName }) {
  const normalizedMarketType = String(marketType || "").trim().toLowerCase();
  const allowedAssets = supportedResearchAssets[normalizedMarketType];
  if (!Array.isArray(allowedAssets) || !allowedAssets.length) {
    return null;
  }

  const candidates = [
    String(requestedSymbol || "").trim().toUpperCase(),
    String(requestedName || "").trim().toUpperCase(),
    String(asset || "").trim().toUpperCase(),
    extractSymbolFromText(String(asset || "").trim().toUpperCase()),
    String(asset || "").trim().toUpperCase().replace(/[()]/g, "")
  ]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const flattenedCandidates = candidates.flatMap((candidate) => {
    const compact = candidate.replace(/[^A-Z0-9/]/g, "");
    return compact && compact !== candidate ? [candidate, compact] : [candidate];
  });

  return allowedAssets.find((entry) => {
    const names = [
      entry.symbol.toUpperCase(),
      entry.name.toUpperCase(),
      ...entry.aliases.map((alias) => alias.toUpperCase())
    ];
    return flattenedCandidates.some((candidate) => names.includes(candidate));
  }) || null;
}

function extractSymbolFromText(text) {
  const bracketMatch = text.match(/\(([A-Z0-9./=-]+)\)/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1];
  }

  const slashMatch = text.match(/\b[A-Z]{3}\/[A-Z]{3}\b/);
  if (slashMatch?.[0]) {
    return slashMatch[0];
  }

  const tickerMatch = text.match(/\b[A-Z]{2,10}(?:[-=][A-Z]{1,10})?\b/);
  return tickerMatch?.[0] || "";
}

async function fetchYahooSnapshot({ yahooSymbol, marketType, symbol, name }) {
  const [quoteResponse, chartResponse] = await Promise.all([
    fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}`, {
      headers: yahooRequestHeaders
    }),
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=1d&includePrePost=true`, {
      headers: yahooRequestHeaders
    })
  ]);

  const quotePayload = await quoteResponse.json().catch(() => ({}));
  const chartPayload = await chartResponse.json().catch(() => ({}));
  const quoteResult = quotePayload?.quoteResponse?.result?.[0];
  const chartResult = chartPayload?.chart?.result?.[0];
  const chartMeta = chartResult?.meta;
  const timestamps = Array.isArray(chartResult?.timestamp) ? chartResult.timestamp : [];
  const chartQuote = chartResult?.indicators?.quote?.[0];
  const closes = Array.isArray(chartQuote?.close) ? chartQuote.close : [];
  const volumes = Array.isArray(chartQuote?.volume) ? chartQuote.volume : [];

  if ((!quoteResponse.ok || !quoteResult) && (!chartResponse.ok || !chartMeta)) {
    throw new Error(`Unable to fetch market snapshot for ${symbol}.`);
  }

  const intradayPoints = timestamps
    .map((timestamp, index) => ({
      timestamp: Number(timestamp),
      close: Number(closes[index]),
      volume: Number(volumes[index])
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.close));

  const latestPoint = intradayPoints[intradayPoints.length - 1];
  const latestPrice = Number(
    quoteResult?.regularMarketPrice
    || chartMeta?.regularMarketPrice
    || latestPoint?.close
    || chartMeta?.previousClose
    || 0
  );
  const previousClose = Number(
    quoteResult?.regularMarketPreviousClose
    || chartMeta?.previousClose
    || chartMeta?.chartPreviousClose
    || latestPrice
  );
  const sessionOpen = Number(
    quoteResult?.regularMarketOpen
    || intradayPoints[0]?.close
    || chartMeta?.chartPreviousClose
    || latestPrice
  );
  const change = latestPrice - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  const intradayChange = latestPrice - sessionOpen;
  const intradayChangePercent = sessionOpen ? (intradayChange / sessionOpen) * 100 : 0;
  const oneHourCutoff = (latestPoint?.timestamp || 0) - (60 * 60);
  const oneHourBasePoint = [...intradayPoints].reverse().find((point) => point.timestamp <= oneHourCutoff) || intradayPoints[0];
  const oneHourChange = oneHourBasePoint ? latestPrice - oneHourBasePoint.close : 0;
  const oneHourChangePercent = oneHourBasePoint?.close ? (oneHourChange / oneHourBasePoint.close) * 100 : 0;
  const dayHigh = Number(quoteResult?.regularMarketDayHigh || chartMeta?.regularMarketDayHigh || latestPrice);
  const dayLow = Number(quoteResult?.regularMarketDayLow || chartMeta?.regularMarketDayLow || latestPrice);
  const latestTimestampSeconds = Number(quoteResult?.regularMarketTime || latestPoint?.timestamp || 0);
  const marketTimestamp = latestTimestampSeconds ? new Date(latestTimestampSeconds * 1000).toISOString() : isoNow();
  const intradayDirection = intradayChange >= 0 ? "upward" : "downward";
  const shortTermDirection = oneHourChange >= 0 ? "upward" : "downward";
  const recentWindow = intradayPoints.slice(-8).map((point) => roundMoney(point.close));
  const latestVolume = Number(quoteResult?.regularMarketVolume || latestPoint?.volume || 0);

  return {
    symbol,
    name: String(quoteResult?.shortName || quoteResult?.longName || name).trim(),
    marketType,
    source: "live market snapshot",
    currency: quoteResult?.currency || chartMeta?.currency || (marketType === "forex" ? "quote currency" : "USD"),
    exchange: quoteResult?.fullExchangeName || quoteResult?.exchange || chartMeta?.exchangeName || "Unknown exchange",
    price: latestPrice,
    previousClose,
    change,
    changePercent,
    sessionOpen,
    intradayChange,
    intradayChangePercent,
    oneHourChange,
    oneHourChangePercent,
    dayHigh,
    dayLow,
    latestVolume: Number.isFinite(latestVolume) && latestVolume > 0 ? latestVolume : null,
    intradayDirection,
    shortTermDirection,
    recentCloses: recentWindow,
    fetchedAt: marketTimestamp
  };
}

function buildMarketContext(snapshot) {
  if (!snapshot) {
    return "Current market snapshot could not be fetched right now. Use general market reasoning and clearly note uncertainty.";
  }

  const parts = [
    `Asset: ${snapshot.name} (${snapshot.symbol})`,
    `Market type: ${snapshot.marketType}`,
    `Exchange: ${snapshot.exchange}`,
    `Latest price: ${formatMarketNumber(snapshot.price)} ${snapshot.currency}`,
    `Session open: ${formatMarketNumber(snapshot.sessionOpen)} ${snapshot.currency}`,
    `Current intraday move: ${formatSignedMarketNumber(snapshot.intradayChange)} ${snapshot.currency} (${formatSignedPercent(snapshot.intradayChangePercent)})`,
    `Last hour move: ${formatSignedMarketNumber(snapshot.oneHourChange)} ${snapshot.currency} (${formatSignedPercent(snapshot.oneHourChangePercent)})`,
    `Day range: ${formatMarketNumber(snapshot.dayLow)} to ${formatMarketNumber(snapshot.dayHigh)} ${snapshot.currency}`,
    `Intraday direction since session open: ${snapshot.intradayDirection}`,
    `Short-term direction over the last hour: ${snapshot.shortTermDirection}`,
    `Recent intraday closes: ${snapshot.recentCloses.map((value) => formatMarketNumber(value)).join(", ")} ${snapshot.currency}`
  ];

  if (snapshot.latestVolume) {
    parts.push(`Latest known volume: ${Intl.NumberFormat("en-US").format(snapshot.latestVolume)}`);
  }

  parts.push(`Exact market timestamp for this snapshot: ${snapshot.fetchedAt}`);
  return parts.join("\n");
}

function buildHistoryContext(chatHistory) {
  return chatHistory
    .slice(-6)
    .filter((entry) => entry && ["user", "assistant"].includes(entry.role) && String(entry.content || "").trim())
    .map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${String(entry.content).trim()}`)
    .join("\n");
}

function validateResearchPrompt({ asset, prompt, marketType }) {
  const assetText = String(asset || "").trim();
  const promptText = String(prompt || "").trim();

  if (!assetText) {
    return "Please provide an asset name or symbol.";
  }

  if (!promptText) {
    return "Please ask a market-related question.";
  }

  const combined = `${assetText} ${promptText}`.toLowerCase();
  const marketKeywords = [
    "price", "trend", "risk", "support", "resistance", "momentum", "breakout",
    "breakdown", "entry", "exit", "volume", "volatility", "intraday", "today",
    "now", "current", "setup", "outlook", "levels", "technical", "fundamental",
    "bullish", "bearish", "catalyst", "earnings", "valuation", "strength",
    "weakness", "weak", "weakening", "strong", "holding", "fade", "fading",
    "hold", "buy", "sell", "overbought", "oversold", "moving average",
    "rsi", "macd", "liquidity", "consolidation", "range", "target", "stop loss",
    "market", "stock", "forex", "crypto", "pair", "coin", "token", "chart",
    "watch", "move", "moving", "levels", "next"
  ];
  const offTopicPatterns = [
    /\b(poem|story|essay|lyrics|joke|recipe|movie|song|code|program|homework|translate|biography)\b/i,
    /\b(weather|holiday|travel|politics|football|cricket|basketball|relationship|fitness)\b/i
  ];

  if (classifyConversationalPrompt(promptText)) {
    return "";
  }

  if (offTopicPatterns.some((pattern) => pattern.test(promptText))) {
    return "Please ask only stock, forex, or crypto market questions in this chat.";
  }

  const hasMarketSignal = marketKeywords.some((keyword) => combined.includes(keyword));
  const allowedMarketTypes = ["stock", "forex", "crypto"];
  if (!allowedMarketTypes.includes(String(marketType || "").toLowerCase())) {
    return "Please choose stock, forex, or crypto before sending your question.";
  }

  if (!hasMarketSignal) {
    return "Please ask a market-focused question about the selected stock, forex pair, or crypto asset.";
  }

  return "";
}

function classifyConversationalPrompt(prompt) {
  const text = String(prompt || "").trim().toLowerCase();
  if (!text) {
    return "";
  }

  if (/^(hi|hello|hey|yo|hola|sup|good morning|good evening|how are you|hlo|helo|hii+|heyy+|what's up|wassup)\b/.test(text)) {
    return "greeting";
  }

  if (/^(thanks|thank you|thx|ty|appreciate it|got it thanks|cool thanks|nice thanks)\b/.test(text)) {
    return "gratitude";
  }

  return "";
}

function buildConversationalReply({ conversationalType, asset }) {
  const assetLabel = `${asset.name} (${asset.symbol})`;

  if (conversationalType === "gratitude") {
    return `You're welcome. When you're ready, ask me something specific about ${assetLabel}, like current risks, key levels, momentum, or trade probability right now.`;
  }

  return `Hi. I can help with ${assetLabel}. Ask me about current risks, important levels, momentum, trade setup, or probability based on the latest market snapshot.`;
}

function classifyResearchQuestion(prompt) {
  const text = String(prompt || "").toLowerCase();
  if (/\b(next few hours|next hour|coming hours|rest of the session|where .* go|where can .* go|where do you think .* go|where do u think .* go|likely move from here|path from here)\b/.test(text)) {
    return "forecast";
  }
  if (/\bprobability|chance|odds|winning trade|win rate|success rate\b/.test(text)) {
    return "probability";
  }
  if (/\brisk|downside|danger|concern|threat|headwind\b/.test(text)) {
    return "risks";
  }
  if (/\bsupport|resistance|level|zone\b/.test(text)) {
    return "levels";
  }
  if (/\btrend|momentum|direction|bullish|bearish|weak|weakening|fade|fading|strong|strength|holding\b/.test(text)) {
    return "trend";
  }
  if (/\bentry|exit|buy|sell|stop|target\b/.test(text)) {
    return "trade-plan";
  }
  if (/\bwatch|next|matters|focus\b/.test(text)) {
    return "watch";
  }
  if (/\bprice|trading at|where is it|current price\b/.test(text)) {
    return "price";
  }
  return "direct";
}

function buildResponseShapeInstructions(questionType, scope) {
  const normalizedScope = String(scope || "research").trim().toLowerCase();

  if (normalizedScope !== "quick") {
    switch (questionType) {
      case "probability":
        return [
          "Answer naturally in plain language.",
          "Give a conditional probability range based on the live setup right now.",
          "Explain the current factors that would improve or weaken that probability.",
          "Do not use canned headings or numbered sections."
        ].join("\n");
      case "risks":
        return [
          "Answer only with the current risks that matter right now.",
          "Use a short paragraph or a few bullets if helpful.",
          "Do not use canned headings or numbered sections."
        ].join("\n");
      case "levels":
        return [
          "Answer naturally and focus on the most relevant live levels right now.",
          "Explain what matters if price holds, breaks, or rejects those levels.",
          "Do not use canned headings or numbered sections."
        ].join("\n");
      case "trend":
      case "watch":
      case "forecast":
      case "price":
      case "trade-plan":
      default:
        return [
          "Answer naturally in plain language.",
          "You may use one short paragraph and a few brief bullets only if that improves clarity.",
          "Do not use canned headings or numbered sections."
        ].join("\n");
    }
  }

  switch (questionType) {
    case "forecast":
      return [
        "Start immediately with the heading: Near-term path",
        "Then explain where price could go over the next few hours based on the live setup.",
        "Use short bullets only if helpful.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "probability":
      return [
        "Start immediately with the heading: Probability read now",
        "Then give 3 to 5 bullet points only.",
        "The first bullet must give a conditional probability range for the setup right now.",
        "Then explain what current live factors support or weaken that probability.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "risks":
      return [
        "Start immediately with the heading: Current risks now",
        "Then give 3 to 6 bullet points only.",
        "Each bullet must explain one current risk and why it matters right now.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "levels":
      return [
        "Start immediately with the heading: Key levels now",
        "Then give short bullets for support, resistance, and what a break of each level would imply.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "trend":
      return [
        "Start immediately with the heading: Trend read now",
        "Then give short bullets on direction, momentum, weakness/strength, and what to watch next.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "trade-plan":
      return [
        "Start immediately with the heading: Trade setup now",
        "Then give short bullets on current bias, important levels, invalidation, and what needs confirmation.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "watch":
      return [
        "Start immediately with the heading: What to watch now",
        "Then give short bullets only.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    case "price":
      return [
        "Start immediately with the heading: Price read now",
        "Then give short bullets only.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
    default:
      return [
        "Start directly with the answer.",
        "Use only the sections needed to answer the user's exact question.",
        "Do not include any intro, asset description, conclusion, or disclaimer."
      ].join("\n");
  }
}

function sanitizeAiResearchResponse(rawText, questionType) {
  const text = String(rawText || "").replace(/\r/g, "").trim();
  if (!text) {
    return "";
  }

  const withoutIntro = text
    .replace(/^(okay[,! ]*|sure[,! ]*|here(?:'s| is)\s+.*?:\s*)/i, "")
    .replace(/^.*?beginner-friendly.*?:\s*/i, "")
    .replace(/^.*?overview of .*?:\s*/i, "");

  const lines = withoutIntro
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^#+\s*/, ""))
    .map((line) => line.replace(/^\*\s+/, "- "))
    .map((line) => line.replace(/^[-*•]\s*/, "- "))
    .filter(Boolean)
    .filter((line) => !/^disclaimer:?/i.test(line))
    .filter((line) => !/not financial advice/i.test(line))
    .filter((line) => !/^investing in/i.test(line));

  const bannedSectionPatterns = [
    /^1\.\s*what is /i,
    /^2\.\s*current market behavior/i,
    /^3\.\s*key bull and bear arguments/i,
    /^4\.\s*important risk factors/i,
    /^5\.\s*beginner-friendly watch points/i,
    /^6\.\s*conclusion/i
  ];

  const cleaned = [];
  let skipGenericSection = false;
  for (const line of lines) {
    if (bannedSectionPatterns.some((pattern) => pattern.test(line))) {
      skipGenericSection = true;
      continue;
    }

    if (skipGenericSection && (/^\d+\./.test(line) || /^#+\s/.test(line))) {
      skipGenericSection = false;
    }

    if (!skipGenericSection) {
      cleaned.push(line.replace(/^\*\*(.*?)\*\*$/g, "$1"));
    }
  }

  const normalized = cleaned.join("\n");
  if (questionType === "risks") {
    const bullets = normalized
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean)
      .filter((line) => !/^current risks now$/i.test(line))
      .slice(0, 6);

    if (!bullets.length) {
      return "Current risks now\n- The live response did not return clean current-risk bullets. Please ask again.";
    }

    return ["Current risks now", ...bullets.map((line) => `- ${line}`)].join("\n");
  }

  return normalized.trim();
}

function needsFinancialAdviceDisclaimer(prompt, questionType) {
  if (questionType === "probability") {
    return true;
  }

  const text = String(prompt || "").toLowerCase();
  return /\b(should i|should we|buy now|sell now|invest now|will i win|winning trade|good trade|worth buying|worth selling|take this trade|enter now)\b/.test(text);
}

function finalizeResearchAnswer(answer, shouldAppendAdviceDisclaimer) {
  const cleanAnswer = String(answer || "").trim();
  if (!cleanAnswer) {
    return cleanAnswer;
  }

  if (!shouldAppendAdviceDisclaimer) {
    return cleanAnswer;
  }

  const disclaimer = "AI may make mistakes and should not be relied on as financial advice.";
  if (cleanAnswer.toLowerCase().includes(disclaimer.toLowerCase())) {
    return cleanAnswer;
  }

  return `${cleanAnswer}\n\n${disclaimer}`;
}

function cleanDisplayedResearchAnswer(answer, questionType, scope) {
  const text = String(answer || "").replace(/\r/g, "").trim();
  if (!text) {
    return text;
  }

  const headingMap = {
    probability: "Probability read now",
    risks: "Current risks now",
    levels: "Key levels now",
    trend: "Trend read now",
    "trade-plan": "Trade setup now",
    watch: "What to watch now",
    price: "Price read now"
  };
  const canonicalHeading = headingMap[questionType] || "";

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^#+\s*/, ""))
    .map((line) => line.replace(/^\*\s+/, "- "))
    .map((line) => line.replace(/^[-*•]\s*/, "- "))
    .map((line) => line.replace(/\*\*(.*?)\*\*/g, "$1"))
    .filter(Boolean);

  if (String(scope || "research").trim().toLowerCase() !== "quick") {
    const normalizedLines = lines.map((line, index, array) => {
      if (index === 0 && /^(what to watch now|trend read now|key levels now|price read now|trade setup now|current risks now|probability read now|near-term path)$/i.test(line)) {
        return "";
      }
      return line;
    }).filter(Boolean);

    return normalizedLines.join("\n");
  }

  const deduped = lines.filter((line, index) => !canonicalHeading || index === 0 || line.toLowerCase() !== canonicalHeading.toLowerCase());

  if (questionType === "risks") {
    const bullets = deduped
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter((line) => line && line.toLowerCase() !== canonicalHeading.toLowerCase())
      .slice(0, 6);

    if (!bullets.length) {
      return "Current risks now\n- The live response did not return clean current-risk bullets. Please ask again.";
    }

    return ["Current risks now", ...bullets.map((line) => `- ${line}`)].join("\n");
  }

  return deduped.join("\n").trim();
}

function generateStructuredMarketAnswer({ questionType, snapshot, asset, prompt, marketType, scope }) {
  if (!snapshot) {
    return "";
  }

  const normalizedScope = String(scope || "research").trim().toLowerCase();
  if (normalizedScope !== "quick") {
    return buildNaturalFallbackAnswer({ questionType, snapshot, prompt });
  }

  switch (questionType) {
    case "forecast":
      return buildForecastAnswer(snapshot);
    case "probability":
      return buildProbabilityAnswer(snapshot);
    case "risks":
      return buildRiskAnswer(snapshot);
    case "trend":
      return buildTrendAnswer(snapshot);
    case "levels":
      return buildLevelsAnswer(snapshot);
    case "trade-plan":
      return buildTradePlanAnswer(snapshot);
    case "watch":
      return buildWatchAnswer(snapshot);
    case "price":
      return buildPriceAnswer(snapshot);
    default:
      return buildDirectMarketAnswer(snapshot, prompt);
  }
}

function buildNaturalFallbackAnswer({ questionType, snapshot, prompt }) {
  switch (questionType) {
    case "forecast":
      return buildNaturalForecastAnswer(snapshot);
    case "watch":
      return buildNaturalWatchAnswer(snapshot);
    case "trend":
      return buildNaturalTrendAnswer(snapshot);
    case "levels":
      return buildNaturalLevelsAnswer(snapshot);
    case "trade-plan":
      return buildNaturalTradePlanAnswer(snapshot);
    case "price":
      return buildNaturalPriceAnswer(snapshot);
    case "probability":
      return buildNaturalProbabilityAnswer(snapshot);
    case "risks":
      return buildNaturalRiskAnswer(snapshot);
    default:
      return buildDirectMarketAnswer(snapshot, prompt);
  }
}

function buildRiskAnswer(snapshot) {
  const bullets = [];
  const dayRangePercent = snapshot.price ? Math.abs((snapshot.dayHigh - snapshot.dayLow) / snapshot.price) * 100 : 0;

  if (Math.abs(snapshot.intradayChangePercent) >= 2) {
    bullets.push(`Strong intraday move is already in play at ${formatSignedPercent(snapshot.intradayChangePercent)}, so chase risk is elevated if the move extends without a pause.`);
  }

  if (Math.abs(snapshot.oneHourChangePercent) >= 1) {
    bullets.push(`Short-term momentum over the last hour is ${formatSignedPercent(snapshot.oneHourChangePercent)}, which means late entries can get caught if momentum fades quickly.`);
  }

  if (snapshot.price && snapshot.dayHigh && ((snapshot.dayHigh - snapshot.price) / snapshot.price) * 100 <= 0.4) {
    bullets.push(`Price is sitting close to the session high, so rejection risk is higher if buyers fail to push through that area cleanly.`);
  }

  if (snapshot.price && snapshot.dayLow && ((snapshot.price - snapshot.dayLow) / snapshot.price) * 100 <= 0.4) {
    bullets.push(`Price is hovering close to the session low, which raises breakdown risk if selling pressure continues.`);
  }

  if (dayRangePercent >= 2) {
    bullets.push(`The current day range is wide at about ${dayRangePercent.toFixed(2)}%, so volatility risk is active right now and stops can get swept more easily.`);
  }

  if (snapshot.intradayDirection !== snapshot.shortTermDirection) {
    bullets.push(`The session direction and the last-hour direction are not fully aligned, which suggests mixed short-term control and raises reversal risk.`);
  }

  if (!bullets.length) {
    bullets.push(`The move is relatively contained right now, so the main risk is a false breakout or false breakdown around today’s range rather than a confirmed directional move.`);
    bullets.push(`Without a strong intraday extension, the market can stay choppy and punish overconfident entries near the middle of the range.`);
    bullets.push(`The closest practical risk is a shift in momentum away from the current direction if price fails to hold near recent intraday closes.`);
  }

  return [
    "Current risks now",
    ...bullets.slice(0, 5).map((line) => `- ${line}`)
  ].join("\n");
}

function buildProbabilityAnswer(snapshot) {
  const positiveSignals = [
    snapshot.intradayChangePercent > 0,
    snapshot.oneHourChangePercent > 0,
    snapshot.price > snapshot.sessionOpen,
    snapshot.price > ((snapshot.dayHigh + snapshot.dayLow) / 2)
  ].filter(Boolean).length;

  const probabilityRange = positiveSignals >= 4
    ? "58% to 64%"
    : positiveSignals === 3
      ? "53% to 58%"
      : positiveSignals === 2
        ? "47% to 53%"
        : "38% to 47%";

  const directionLine = snapshot.intradayDirection === "upward"
    ? `- The live setup currently leans positive because price is above the session open by ${formatSignedPercent(snapshot.intradayChangePercent)}.`
    : `- The live setup is under pressure because price is below the session open by ${formatSignedPercent(snapshot.intradayChangePercent)}.`;

  const momentumLine = snapshot.oneHourChangePercent > 0
    ? `- Last-hour momentum is still positive at ${formatSignedPercent(snapshot.oneHourChangePercent)}, which helps the setup hold together for now.`
    : `- Last-hour momentum is ${formatSignedPercent(snapshot.oneHourChangePercent)}, which lowers the chance of a clean winning follow-through right now.`;

  const locationLine = snapshot.price >= ((snapshot.dayHigh + snapshot.dayLow) / 2)
    ? `- Price is trading in the upper half of today's range, which supports buyers more than sellers at this moment.`
    : `- Price is trading in the lower half of today's range, which weakens the immediate long-side probability.`;

  const watchLine = `- That probability improves if price can hold above ${formatMarketNumber(snapshot.sessionOpen)} ${snapshot.currency} and keep last-hour momentum from slipping.`;

  return [
    "Probability read now",
    `- Based on the current live setup only, the rough winning-trade probability is around ${probabilityRange}, not a certainty.`,
    directionLine,
    momentumLine,
    locationLine,
    watchLine
  ].join("\n");
}

function buildTrendAnswer(snapshot) {
  const biasLine = snapshot.intradayDirection === "upward"
    ? `Bias is still upward from the session open with an intraday move of ${formatSignedPercent(snapshot.intradayChangePercent)}.`
    : `Bias is still downward from the session open with an intraday move of ${formatSignedPercent(snapshot.intradayChangePercent)}.`;

  const momentumLine = Math.abs(snapshot.oneHourChangePercent) >= 0.4
    ? `Last-hour momentum is ${snapshot.shortTermDirection} at ${formatSignedPercent(snapshot.oneHourChangePercent)}, so the short-term push is still active.`
    : `Last-hour momentum is relatively soft at ${formatSignedPercent(snapshot.oneHourChangePercent)}, so the move currently lacks strong short-term expansion.`;

  const rangeLine = `Price is trading inside today’s range of ${formatMarketNumber(snapshot.dayLow)} to ${formatMarketNumber(snapshot.dayHigh)} ${snapshot.currency}.`;
  const watchLine = snapshot.price > snapshot.sessionOpen
    ? `What matters next is whether buyers can keep price away from the session open and hold near recent intraday closes.`
    : `What matters next is whether sellers can keep price below the session open and continue pressing the lower part of today’s range.`;

  return [
    "Trend read now",
    `- ${biasLine}`,
    `- ${momentumLine}`,
    `- ${rangeLine}`,
    `- ${watchLine}`
  ].join("\n");
}

function buildLevelsAnswer(snapshot) {
  const support = formatMarketNumber(snapshot.dayLow);
  const resistance = formatMarketNumber(snapshot.dayHigh);
  const pivot = formatMarketNumber(snapshot.sessionOpen);

  return [
    "Key levels now",
    `- Support is near ${support} ${snapshot.currency}, which is the session low from the current live range.`,
    `- Resistance is near ${resistance} ${snapshot.currency}, which is the session high from the current live range.`,
    `- The session open around ${pivot} ${snapshot.currency} is the nearest balance level to watch for acceptance or rejection.`,
    `- A clean break above resistance would suggest buyers are extending the current move.`,
    `- A loss of support would suggest sellers are taking control of the session.`
  ].join("\n");
}

function buildTradePlanAnswer(snapshot) {
  const bias = snapshot.intradayDirection === "upward" ? "long bias" : "short bias";
  return [
    "Trade setup now",
    `- Current bias is ${bias} based on the move from session open to current price.`,
    `- Session open near ${formatMarketNumber(snapshot.sessionOpen)} ${snapshot.currency} is the nearest line that can act as a decision zone.`,
    `- Session high near ${formatMarketNumber(snapshot.dayHigh)} ${snapshot.currency} is the breakout area to watch.`,
    `- Session low near ${formatMarketNumber(snapshot.dayLow)} ${snapshot.currency} is the invalidation area to watch.`,
    `- The next useful confirmation is whether the last-hour move continues in the same direction at the current timestamp.`
  ].join("\n");
}

function buildWatchAnswer(snapshot) {
  return [
    "What to watch now",
    `- Watch the session open near ${formatMarketNumber(snapshot.sessionOpen)} ${snapshot.currency} because it is the clearest balance line in the current move.`,
    `- Watch the session high near ${formatMarketNumber(snapshot.dayHigh)} ${snapshot.currency} for continuation pressure.`,
    `- Watch the session low near ${formatMarketNumber(snapshot.dayLow)} ${snapshot.currency} for breakdown pressure.`,
    `- The latest one-hour move is ${formatSignedPercent(snapshot.oneHourChangePercent)}, so a slowdown there would be the first sign that momentum is cooling.`
  ].join("\n");
}

function buildPriceAnswer(snapshot) {
  return [
    "Price read now",
    `- Current price is ${formatMarketNumber(snapshot.price)} ${snapshot.currency}.`,
    `- The move versus the previous close is ${formatSignedPercent(snapshot.changePercent)}.`,
    `- The move from the session open is ${formatSignedPercent(snapshot.intradayChangePercent)}.`,
    `- Today's live range is ${formatMarketNumber(snapshot.dayLow)} to ${formatMarketNumber(snapshot.dayHigh)} ${snapshot.currency}.`
  ].join("\n");
}

function buildDirectMarketAnswer(snapshot, prompt) {
  const promptText = String(prompt || "").toLowerCase();

  if (/\brisk|danger|concern|headwind\b/.test(promptText)) {
    return buildRiskAnswer(snapshot);
  }
  if (/\bsupport|resistance|level|zone\b/.test(promptText)) {
    return buildLevelsAnswer(snapshot);
  }
  if (/\bentry|exit|buy|sell|stop|target|setup\b/.test(promptText)) {
    return buildTradePlanAnswer(snapshot);
  }
  if (/\bwatch|next|matters|focus\b/.test(promptText)) {
    return buildWatchAnswer(snapshot);
  }

  const bullets = [
    `- Current price is ${formatMarketNumber(snapshot.price)} ${snapshot.currency}, with a move of ${formatSignedPercent(snapshot.changePercent)} versus the previous close.`,
    `- From the session open, price is ${snapshot.intradayDirection} by ${formatSignedPercent(snapshot.intradayChangePercent)}.`,
    `- Over the last hour, momentum is ${snapshot.shortTermDirection} by ${formatSignedPercent(snapshot.oneHourChangePercent)}.`,
    `- Today's live range is ${formatMarketNumber(snapshot.dayLow)} to ${formatMarketNumber(snapshot.dayHigh)} ${snapshot.currency}.`
  ];

  if (/\bweak|weakening|fade|fading\b/.test(promptText)) {
    bullets.push(snapshot.oneHourChangePercent < 0
      ? "- The latest hour is leaning weaker, so fading momentum is visible in the most recent live move."
      : "- The latest hour is not clearly fading yet, so weakness is not confirmed by the most recent live move.");
  } else if (/\bstrong|strength|holding\b/.test(promptText)) {
    bullets.push(snapshot.oneHourChangePercent > 0
      ? "- The latest hour is still holding positive pressure, so short-term strength is still present right now."
      : "- The latest hour is no longer pushing strongly higher, so strength looks less secure right now.");
  } else {
    bullets.push("- Based on the live snapshot, the cleanest read is the current direction, the last-hour momentum, and how price is behaving inside today's range.");
  }

  return [
    "Current market read",
    ...bullets
  ].join("\n");
}

async function requestOpenRouterWithFallback(messages, temperature) {
  const preferredModel = String(config.OPENROUTER_MODEL || "").trim();
  const candidateModels = [
    preferredModel,
    "google/gemini-2.0-flash-001",
    "google/gemini-2.0-flash-lite-001",
    "openrouter/auto",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-chat-v3-0324:free"
  ].filter(Boolean);
  const uniqueModels = [...new Set(candidateModels)];
  let lastError = new Error("OpenRouter request failed.");

  for (const model of uniqueModels) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
          "HTTP-Referer": `http://localhost:${config.PORT}`,
          "X-Title": "SeeThrough Brain"
        },
        body: JSON.stringify({
          model,
          temperature,
          messages
        })
      });
      const data = await response.json().catch(() => ({}));
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (response.ok && content) {
        return { content, model };
      }
      lastError = new Error(data?.error?.message || `OpenRouter failed for ${model}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function hashToken(token) {
  return crypto
    .createHmac("sha256", config.SESSION_SECRET)
    .update(token)
    .digest("hex");
}

function isoNow() {
  return new Date().toISOString();
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function formatMarketNumber(value) {
  return Number.isFinite(Number(value))
    ? Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value))
    : "n/a";
}

function formatSignedMarketNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "n/a";
  }

  const prefix = numeric >= 0 ? "+" : "-";
  return `${prefix}${formatMarketNumber(Math.abs(numeric))}`;
}

function formatSignedPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "n/a";
  }

  return `${numeric >= 0 ? "+" : "-"}${Math.abs(numeric).toFixed(2)}%`;
}
