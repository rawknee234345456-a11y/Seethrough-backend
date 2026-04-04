(function () {
  const config = window.SEE_THROUGH_FRONTEND_CONFIG || {};

  const fallbackMarketData = [
    { id: "AAPL", name: "Apple", type: "stock", price: 15853, previousClose: 15652, changePercent: 1.28, trend: "up" },
    { id: "TSLA", name: "Tesla", type: "stock", price: 14323.71, previousClose: 14456.67, changePercent: -0.92, trend: "down" },
    { id: "MSFT", name: "Microsoft", type: "stock", price: 35679.49, previousClose: 35420.2, changePercent: 0.73, trend: "up" },
    { id: "BTC", name: "Bitcoin", type: "crypto", price: 6395204, previousClose: 6302544, changePercent: 1.47, trend: "up" },
    { id: "ETH", name: "Ethereum", type: "crypto", price: 287410, previousClose: 289900, changePercent: -0.86, trend: "down" }
  ];

  const supportedResearchAssets = {
    stock: [
      { symbol: "AAPL", name: "Apple" },
      { symbol: "TSLA", name: "Tesla" },
      { symbol: "MSFT", name: "Microsoft" }
    ],
    forex: [
      { symbol: "EUR/USD", name: "Euro / US Dollar" },
      { symbol: "GBP/USD", name: "British Pound / US Dollar" },
      { symbol: "USD/JPY", name: "US Dollar / Japanese Yen" },
      { symbol: "USD/INR", name: "US Dollar / Indian Rupee" }
    ],
    crypto: [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" }
    ]
  };

  const pageContent = {
    dashboard: {
      kicker: "Cut through the noise, with SeeThrough",
      title: "A calmer market view that helps you focus on what matters.",
      text: "Cut through the noise, with SeeThrough."
    },
    trade: {
      kicker: "Cut through the noise, with SeeThrough",
      title: "Practice clearly, learn faster, and stay in control.",
      text: "Every practice trade is guided by live market context."
    },
    insights: {
      kicker: "Cut through the noise, with SeeThrough",
      title: "Clear explanations for moves that feel confusing at first glance.",
      text: "Get digestible insight built for learning, not overwhelm."
    },
    news: {
      kicker: "Cut through the noise, with SeeThrough",
      title: "Headlines that support your view, not distract from it.",
      text: "Cut through the noise, with SeeThrough."
    },
    research: {
      kicker: "Cut through the noise, with SeeThrough",
      title: "Ask deeper questions and get clearer market breakdowns.",
      text: "Use the AI chat to explore stock, forex, and crypto setups with current market context behind the answer."
    },
    profile: {
      kicker: "Cut through the noise, with SeeThrough",
      title: "Your progress stays simple, visible, and ready anytime.",
      text: "Pick up where you left off without losing context."
    }
  };

  const state = {
    currentPage: "dashboard",
    authMode: "signup",
    token: localStorage.getItem("seethrough-brain-token") || "",
    user: null,
    account: {
      startBalance: 100000,
      cash: 100000,
      positions: [],
      trades: []
    },
    researchMessages: [
      {
        role: "assistant",
        meta: "SeeThrough AI",
        content: "Pick a market type, enter the asset, ask exactly what you want to know, and I’ll answer from the latest market snapshot available at request time."
      }
    ],
    marketData: fallbackMarketData.map((item) => ({ ...item })),
    previousMarketData: fallbackMarketData.map((item) => ({ ...item })),
    selectedMarketId: "AAPL"
  };
  const browserRegionalDefaults = detectBrowserRegionalDefaults();
  let typingRunId = 0;

  const elements = {
    landingPage: document.getElementById("landingPage"),
    appShell: document.getElementById("appShell"),
    landingLoginBtn: document.getElementById("landingLoginBtn"),
    landingSignupBtn: document.getElementById("landingSignupBtn"),
    landingHeroSignupBtn: document.getElementById("landingHeroSignupBtn"),
    sidebar: document.getElementById("sidebar"),
    navItems: document.querySelectorAll(".nav-item"),
    pages: document.querySelectorAll(".page"),
    heroKicker: document.getElementById("heroKicker"),
    heroTitle: document.getElementById("heroTitle"),
    heroText: document.getElementById("heroText"),
    hero: document.querySelector(".hero"),
    profileName: document.getElementById("profileName"),
    profileEmail: document.getElementById("profileEmail"),
    profileCreated: document.getElementById("profileCreated"),
    profileLastLogin: document.getElementById("profileLastLogin"),
    profileTradesCount: document.getElementById("profileTradesCount"),
    profileAccessName: document.getElementById("profileAccessName"),
    profileAccessEmail: document.getElementById("profileAccessEmail"),
    profileOpenAuthBtn: document.getElementById("profileOpenAuthBtn"),
    profileLogoutBtn: document.getElementById("profileLogoutBtn"),
    authModal: document.getElementById("authModal"),
    closeAuthBtn: document.getElementById("closeAuthBtn"),
    googleAuthBtn: document.getElementById("googleAuthBtn"),
    appleAuthBtn: document.getElementById("appleAuthBtn"),
    authTitle: document.getElementById("authTitle"),
    authModeButtons: document.querySelectorAll(".auth-mode-btn"),
    authNameWrap: document.getElementById("authNameWrap"),
    authForm: document.getElementById("authForm"),
    authName: document.getElementById("authName"),
    authEmail: document.getElementById("authEmail"),
    authPassword: document.getElementById("authPassword"),
    authStatus: document.getElementById("authStatus"),
    authSubmitBtn: document.getElementById("authSubmitBtn"),
    authSwitchText: document.getElementById("authSwitchText"),
    authSwitchBtn: document.getElementById("authSwitchBtn"),
    refreshMarketBtn: document.getElementById("refreshMarketBtn"),
    symbolChips: document.querySelectorAll(".symbol-chip"),
    tradeForm: document.getElementById("tradeForm"),
    tradeSymbol: document.getElementById("tradeSymbol"),
    tradeAction: document.getElementById("tradeAction"),
    tradeQuantity: document.getElementById("tradeQuantity"),
    tradePriceNote: document.getElementById("tradePriceNote"),
    tradeStatus: document.getElementById("tradeStatus"),
    tradeCashDisplay: document.getElementById("tradeCashDisplay"),
    tradeInvestedDisplay: document.getElementById("tradeInvestedDisplay"),
    tradePortfolioValueDisplay: document.getElementById("tradePortfolioValueDisplay"),
    tradeProfitLossDisplay: document.getElementById("tradeProfitLossDisplay"),
    tradeDayChangeDisplay: document.getElementById("tradeDayChangeDisplay"),
    tradeChartTitle: document.getElementById("tradeChartTitle"),
    portfolioTable: document.getElementById("portfolioTable"),
    positionsCount: document.getElementById("positionsCount"),
    balanceDisplay: document.getElementById("balanceDisplay"),
    portfolioValueDisplay: document.getElementById("portfolioValueDisplay"),
    profitLossDisplay: document.getElementById("profitLossDisplay"),
    investedValueDisplay: document.getElementById("investedValueDisplay"),
    dayChangeDisplay: document.getElementById("dayChangeDisplay"),
    recentTrades: document.getElementById("recentTrades"),
    insightSymbol: document.getElementById("insightSymbol"),
    generateInsightBtn: document.getElementById("generateInsightBtn"),
    insightOutput: document.getElementById("insightOutput"),
    selectedNewsTitle: document.getElementById("selectedNewsTitle"),
    researchForm: document.getElementById("researchForm"),
    researchMarketType: document.getElementById("researchMarketType"),
    researchAsset: document.getElementById("researchAsset"),
    researchPrompt: document.getElementById("researchPrompt"),
    researchMessages: document.getElementById("researchMessages")
  };

  initialize();

  async function initialize() {
    bindLanding();
    bindNavigation();
    bindSidebarHover();
    bindAuth();
    bindChartControls();
    bindTradeForm();
    bindInsightActions();
    renderHero();
    renderResearchMessages();
    renderTradingView("NASDAQ:AAPL");
    renderTradeChart("AAPL");
    renderRatesWidget();
    renderNewsWidget("dashboardNewsWidget", "headlines");
    renderNewsWidget("newsWidget", "headlines");
    await loadMarketData();
    await hydrateSession();
    bindResponsiveNewsSizing();
    startAutoRefresh();
  }

  function bindLanding() {
    elements.landingLoginBtn.addEventListener("click", () => {
      if (state.user) {
        enterWorkspace();
        return;
      }
      openAuthModal("login");
    });
    elements.landingSignupBtn.addEventListener("click", () => {
      if (state.user) {
        enterWorkspace();
        return;
      }
      openAuthModal("signup");
    });
    elements.landingHeroSignupBtn.addEventListener("click", () => openAuthModal("signup"));
  }

  function bindNavigation() {
    elements.navItems.forEach((button) => {
      button.addEventListener("click", () => {
        setActivePage(button.dataset.target);
      });
    });
  }

  function bindResponsiveNewsSizing() {
    window.addEventListener("resize", () => {
      renderNewsWidget("newsWidget", "headlines");
      renderInsightNews();
    });
  }

  function bindSidebarHover() {
    // Hover behavior handled in CSS for instant access.
  }

  function bindAuth() {
    elements.profileOpenAuthBtn.addEventListener("click", () => openAuthModal("signup"));
    elements.closeAuthBtn.addEventListener("click", closeAuthModal);
    elements.profileLogoutBtn.addEventListener("click", logout);
    initGoogleAuthButton();

    elements.authModeButtons.forEach((button) => {
      button.addEventListener("click", () => setAuthMode(button.dataset.mode));
    });

    elements.authSwitchBtn.addEventListener("click", () => {
      setAuthMode(state.authMode === "signup" ? "login" : "signup");
    });

    elements.appleAuthBtn.addEventListener("click", () => {
      elements.authStatus.textContent = "Apple sign-in button is ready. Connect your Apple auth flow files here when you want to enable it.";
    });

    elements.authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        name: elements.authName.value.trim(),
        email: elements.authEmail.value.trim(),
        password: elements.authPassword.value
      };

      const isSignup = state.authMode === "signup";
      if (isSignup && !payload.name) {
        elements.authStatus.textContent = "Add your full name to create your account.";
        return;
      }

      const endpoint = isSignup ? "/auth/signup" : "/auth/login";
      elements.authStatus.textContent = state.authMode === "signup" ? "Creating account..." : "Logging in...";
      elements.authSubmitBtn.disabled = true;

      try {
        const response = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(payload)
        }, false);

        await handleAuthSuccess(response);
      } catch (error) {
        elements.authStatus.textContent = error.message;
      } finally {
        elements.authSubmitBtn.disabled = false;
      }
    });
  }

  function bindChartControls() {
    elements.symbolChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        elements.symbolChips.forEach((item) => item.classList.remove("active"));
        chip.classList.add("active");
        state.selectedMarketId = toInternalSymbol(chip.dataset.symbol);
        renderTradingView(chip.dataset.symbol);
        renderInsightFacts();
        renderInsightNews();
      });
    });
  }

  function bindTradeForm() {
    elements.tradeSymbol.addEventListener("change", () => {
      updateTradePriceNote();
      renderTradeChart(elements.tradeSymbol.value);
    });
    elements.tradeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.token) {
        elements.tradeStatus.textContent = "Please log in first so your trades can be saved.";
        openAuthModal("login");
        return;
      }

      const asset = getSelectedAsset(elements.tradeSymbol.value);
      const quantity = Number(elements.tradeQuantity.value);
      if (!asset || !(quantity > 0)) {
        elements.tradeStatus.textContent = "Choose a valid market and quantity.";
        return;
      }

      elements.tradeStatus.textContent = "Submitting trade at the latest live market price...";

      try {
        const response = await apiFetch("/trades", {
          method: "POST",
          body: JSON.stringify({
            symbol: asset.id,
            name: asset.name,
            marketType: asset.type,
            action: elements.tradeAction.value,
            quantity
          })
        });

        state.account = response.account;
        if (response.quote) {
          syncMarketQuote(response.quote);
        }
        updateTradePriceNote();
        await loadMarketData();
        renderAccountViews();
        elements.tradeStatus.textContent = `Saved ${elements.tradeAction.value} trade for ${quantity} ${asset.id} at ${formatCurrency(response.executedPrice)}.`;
      } catch (error) {
        elements.tradeStatus.textContent = error.message;
      }
    });
  }

  function bindInsightActions() {
    elements.refreshMarketBtn.addEventListener("click", loadMarketData);
    elements.researchMarketType.addEventListener("change", () => {
      populateResearchAssets();
      updateResearchPromptHint();
    });
    elements.insightSymbol.addEventListener("change", () => {
      state.selectedMarketId = elements.insightSymbol.value;
      renderInsightFacts();
      renderInsightNews();
    });

    elements.generateInsightBtn.addEventListener("click", async () => {
      const asset = getSelectedAsset(elements.insightSymbol.value || state.selectedMarketId);
      if (!asset) {
        return;
      }
      if (!state.token) {
        setStaticResponse(elements.insightOutput, "Please log in to use AI insight generation.");
        openAuthModal("login");
        return;
      }

      setThinking(elements.insightOutput, "Generating quick AI insight");

      try {
        const response = await apiFetch("/research/chat", {
          method: "POST",
          body: JSON.stringify({
            asset: `${asset.name} (${asset.id})`,
            symbol: asset.id,
            assetName: asset.name,
            marketType: asset.type,
            prompt: `Price: ${formatCurrency(asset.price)}. Change: ${formatSignedPercent(asset.changePercent)}. Trend: ${asset.trend}. Keep it short and beginner-friendly.`,
            scope: "quick"
          })
        });

        await typeAiResponse(elements.insightOutput, response.answer);
      } catch (error) {
        setStaticResponse(elements.insightOutput, error.message);
      }
    });

    elements.researchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.token) {
        pushResearchMessage({
          role: "assistant",
          meta: "SeeThrough AI",
          content: "Please log in to use the research chatbot."
        });
        openAuthModal("login");
        return;
      }

      const selectedAsset = getResearchAssetDefinition();
      const asset = selectedAsset?.symbol || "";
      const question = elements.researchPrompt.value.trim();
      if (!asset) {
        pushResearchMessage({
          role: "assistant",
          meta: "SeeThrough AI",
          content: "Choose a valid asset first."
        });
        return;
      }

      if (!question) {
        pushResearchMessage({
          role: "assistant",
          meta: "SeeThrough AI",
          content: "Ask what you want to know about this asset so I can answer it directly."
        });
        return;
      }

      pushResearchMessage({
        role: "user",
        meta: `${elements.researchMarketType.value.toUpperCase()} • ${selectedAsset.name} (${selectedAsset.symbol})`,
        content: question
      });
      const pendingMessage = pushResearchMessage({
        role: "assistant",
        meta: "SeeThrough AI",
        content: ""
      });
      setThinking(pendingMessage.body, "Analyzing the live market snapshot");
      elements.researchPrompt.value = "";

      try {
        const response = await apiFetch("/research/chat", {
          method: "POST",
          body: JSON.stringify({
            asset: `${selectedAsset.name} (${selectedAsset.symbol})`,
            symbol: selectedAsset.symbol,
            assetName: selectedAsset.name,
            marketType: elements.researchMarketType.value,
            prompt: question,
            scope: "research",
            chatHistory: state.researchMessages
              .slice(-8)
              .map(({ role, content, meta }) => ({ role, content, meta }))
          })
        });

        pendingMessage.body.innerHTML = "";
        await typeAiResponse(pendingMessage.body, response.answer);
        const stored = state.researchMessages[state.researchMessages.length - 1];
        if (stored?.role === "assistant") {
          stored.content = response.answer;
        }
      } catch (error) {
        pendingMessage.body.textContent = error.message;
        const stored = state.researchMessages[state.researchMessages.length - 1];
        if (stored?.role === "assistant") {
          stored.content = error.message;
        }
      }
    });
  }

  async function hydrateSession() {
    renderAuthState();
    populateSymbolInputs();
    populateResearchAssets();
    updateResearchPromptHint();
    renderAccountViews();
    renderInsightFacts();
    renderInsightNews();

    if (!state.token) {
      return;
    }

    try {
      const response = await apiFetch("/auth/me");
      state.user = response.user;
      state.account = response.account;
      await loadMarketData();
    } catch (error) {
      state.token = "";
      localStorage.removeItem("seethrough-brain-token");
    }

    renderAuthState();
    renderAccountViews();
    if (state.user) {
      enterWorkspace({ scroll: false });
    }
  }

  async function loadMarketData() {
    elements.refreshMarketBtn.disabled = true;
    elements.refreshMarketBtn.textContent = "Refreshing...";

    try {
      const response = await apiFetch("/market/watchlist", { method: "GET" }, false);
      state.previousMarketData = state.marketData.map((item) => ({ ...item }));
      state.marketData = Array.isArray(response.marketData) && response.marketData.length
        ? response.marketData.map((item) => ({ ...item }))
        : fallbackMarketData.map((item) => ({ ...item }));
    } catch (error) {
      state.previousMarketData = state.marketData.map((item) => ({ ...item }));
      state.marketData = fallbackMarketData.map((item) => ({ ...item }));
    }

    populateSymbolInputs();
    renderAccountViews();
    renderInsightFacts();
    renderInsightNews();
    elements.refreshMarketBtn.disabled = false;
    elements.refreshMarketBtn.textContent = "Refresh Data";
  }

  async function fetchStockData() {
    const apiKey = (config.ALPHA_VANTAGE_API_KEY || "").trim();
    if (!apiKey) {
      return fallbackMarketData.filter((item) => item.type === "stock");
    }

    const stockSymbols = [
      { id: "AAPL", name: "Apple" },
      { id: "TSLA", name: "Tesla" },
      { id: "MSFT", name: "Microsoft" }
    ];

    return Promise.all(stockSymbols.map(async (stock) => {
      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stock.id}&apikey=${apiKey}`);
      const data = await response.json();
      const quote = data["Global Quote"];
      if (!quote || !quote["05. price"]) {
        throw new Error(`Quote lookup failed for ${stock.id}`);
      }

      const changePercent = Number(String(quote["10. change percent"]).replace("%", ""));
      return {
        id: stock.id,
        name: stock.name,
        type: "stock",
        price: roundMoney(Number(quote["05. price"]) * usdToInrRate),
        previousClose: roundMoney(Number(quote["08. previous close"]) * usdToInrRate),
        changePercent,
        trend: changePercent >= 0 ? "up" : "down"
      };
    }));
  }

  async function fetchCryptoData() {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=inr&include_24hr_change=true");
    const data = await response.json();

    return [
      {
        id: "BTC",
        name: "Bitcoin",
        type: "crypto",
        price: roundMoney(Number(data.bitcoin?.inr || fallbackMarketData[3].price)),
        previousClose: roundMoney((Number(data.bitcoin?.inr || fallbackMarketData[3].price)) / (1 + Number(data.bitcoin?.inr_24h_change || 0) / 100)),
        changePercent: Number(data.bitcoin?.inr_24h_change || fallbackMarketData[3].changePercent),
        trend: Number(data.bitcoin?.inr_24h_change || 0) >= 0 ? "up" : "down"
      },
      {
        id: "ETH",
        name: "Ethereum",
        type: "crypto",
        price: roundMoney(Number(data.ethereum?.inr || fallbackMarketData[4].price)),
        previousClose: roundMoney((Number(data.ethereum?.inr || fallbackMarketData[4].price)) / (1 + Number(data.ethereum?.inr_24h_change || 0) / 100)),
        changePercent: Number(data.ethereum?.inr_24h_change || fallbackMarketData[4].changePercent),
        trend: Number(data.ethereum?.inr_24h_change || 0) >= 0 ? "up" : "down"
      }
    ];
  }

  function renderTradingView(symbol) {
    const target = document.getElementById("tradingview-widget");
    target.innerHTML = "";
    if (!window.TradingView) {
      target.textContent = "TradingView chart could not load.";
      return;
    }

    new window.TradingView.widget({
      width: "100%",
      height: 470,
      symbol,
      interval: "60",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      container_id: "tradingview-widget"
    });
  }

  function renderTradeChart(assetId) {
    const target = document.getElementById("tradeChartWidget");
    if (!target) {
      return;
    }

    const normalizedAssetId = String(assetId || "AAPL").trim().toUpperCase();
    const tradingViewSymbol = toTradingViewSymbol(normalizedAssetId);
    const asset = getSelectedAsset(normalizedAssetId);
    target.innerHTML = "";

    if (elements.tradeChartTitle) {
      elements.tradeChartTitle.textContent = asset
        ? `${asset.name} (${asset.id}) live chart`
        : "Live chart for the selected trade asset";
    }

    if (!window.TradingView) {
      target.textContent = "TradingView chart could not load.";
      return;
    }

    new window.TradingView.widget({
      width: "100%",
      height: 320,
      symbol: tradingViewSymbol,
      interval: "60",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      container_id: "tradeChartWidget"
    });
  }

  function renderRatesWidget() {
    const target = document.getElementById("liveRatesWidget");
    target.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.innerHTML = "<div class='tradingview-widget-container__widget' style='height:100%;width:100%;'></div>";
    target.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      width: "100%",
      height: 420,
      symbolsGroups: [
        {
          name: "Equities",
          originalName: "Equities",
          symbols: [
            { name: "NASDAQ:AAPL", displayName: "Apple" },
            { name: "NASDAQ:TSLA", displayName: "Tesla" },
            { name: "NASDAQ:MSFT", displayName: "Microsoft" }
          ]
        },
        {
          name: "Crypto",
          originalName: "Crypto",
          symbols: [
            { name: "BITSTAMP:BTCUSD", displayName: "Bitcoin" },
            { name: "BITSTAMP:ETHUSD", displayName: "Ethereum" }
          ]
        }
      ],
      colorTheme: "dark",
      isTransparent: true,
      showSymbolLogo: true,
      locale: "en"
    });
    wrapper.appendChild(script);
  }

  function renderNewsWidget(containerId, symbol, height) {
    const target = document.getElementById(containerId);
    const resolvedHeight = Number(height) || resolveNewsHeight(containerId);
    const displayMode = resolveNewsDisplayMode(containerId);
    target.style.height = `${resolvedHeight}px`;
    target.style.minHeight = `${resolvedHeight}px`;
    target.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = `${resolvedHeight}px`;
    wrapper.innerHTML = `<div class='tradingview-widget-container__widget' style='height:${resolvedHeight}px;width:100%;'></div>`;
    target.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      feedMode: symbol === "headlines" ? "all_symbols" : "symbol",
      symbol: symbol === "headlines" ? undefined : symbol,
      isTransparent: true,
      displayMode,
      width: "100%",
      height: resolvedHeight,
      colorTheme: "dark",
      locale: "en"
    });
    wrapper.appendChild(script);
  }

  function resolveNewsHeight(containerId) {
    if (containerId === "dashboardNewsWidget") {
      return 380;
    }
    if (containerId === "insightNewsWidget") {
      return 190;
    }
    if (containerId === "newsWidget") {
      return 240;
    }
    return 420;
  }

  function resolveNewsDisplayMode(containerId) {
    if (containerId === "dashboardNewsWidget") {
      return "adaptive";
    }
    return "compact";
  }

  function populateSymbolInputs() {
    const tradeValue = elements.tradeSymbol.value || state.selectedMarketId;
    const insightValue = elements.insightSymbol.value || state.selectedMarketId;
    elements.tradeSymbol.innerHTML = "";
    elements.insightSymbol.innerHTML = "";

    state.marketData.forEach((asset) => {
      const tradeOption = document.createElement("option");
      tradeOption.value = asset.id;
      tradeOption.textContent = `${asset.id} - ${asset.name}`;
      elements.tradeSymbol.appendChild(tradeOption);

      const insightOption = document.createElement("option");
      insightOption.value = asset.id;
      insightOption.textContent = `${asset.id} - ${asset.name}`;
      elements.insightSymbol.appendChild(insightOption);
    });

    elements.tradeSymbol.value = tradeValue;
    elements.insightSymbol.value = insightValue;
    updateTradePriceNote();
    if (state.currentPage === "trade") {
      renderTradeChart(elements.tradeSymbol.value);
    }
  }

  function populateResearchAssets() {
    const marketType = elements.researchMarketType.value || "stock";
    const options = supportedResearchAssets[marketType] || [];
    const previousValue = elements.researchAsset.value;
    elements.researchAsset.innerHTML = "";

    options.forEach((asset) => {
      const option = document.createElement("option");
      option.value = asset.symbol;
      option.textContent = `${asset.symbol} - ${asset.name}`;
      elements.researchAsset.appendChild(option);
    });

    const hasPrevious = options.some((asset) => asset.symbol === previousValue);
    elements.researchAsset.value = hasPrevious ? previousValue : (options[0]?.symbol || "");
  }

  function getResearchAssetDefinition() {
    const marketType = elements.researchMarketType.value || "stock";
    const assets = supportedResearchAssets[marketType] || [];
    return assets.find((asset) => asset.symbol === elements.researchAsset.value) || null;
  }

  function updateResearchPromptHint() {
    const marketType = elements.researchMarketType.value || "stock";
    const examples = {
      stock: "Ask exactly what you want: what are the current risks, where are the key levels today, or is momentum fading right now?",
      forex: "Ask exactly what you want: is EUR/USD showing strength now, what are the live support and resistance levels, or what is the current risk?",
      crypto: "Ask exactly what you want: is BTC momentum still strong now, what are the immediate risks, or where are the live breakout levels?"
    };
    elements.researchPrompt.placeholder = examples[marketType] || examples.stock;
  }

  function renderInsightFacts() {
    const asset = getSelectedAsset(elements.insightSymbol.value || state.selectedMarketId);
    if (!asset || !elements.selectedNewsTitle) {
      return;
    }

    elements.selectedNewsTitle.textContent = `${asset.name} headlines`;
  }

  function renderInsightNews() {
    const mapping = {
      AAPL: "NASDAQ:AAPL",
      TSLA: "NASDAQ:TSLA",
      MSFT: "NASDAQ:MSFT",
      BTC: "BITSTAMP:BTCUSD",
      ETH: "BITSTAMP:ETHUSD"
    };

    renderNewsWidget("insightNewsWidget", mapping[elements.insightSymbol.value || state.selectedMarketId] || "headlines");
  }

  function refreshWorkspaceWidgets() {
    const activeSymbol = document.querySelector(".symbol-chip.active")?.dataset.symbol || "NASDAQ:AAPL";
    renderTradingView(activeSymbol);
    renderTradeChart(elements.tradeSymbol?.value || "AAPL");
    renderRatesWidget();
    renderNewsWidget("dashboardNewsWidget", "headlines");
    renderNewsWidget("newsWidget", "headlines");
    renderInsightNews();
  }

  function renderHero() {
    const copy = pageContent[state.currentPage] || pageContent.dashboard;
    const showHero = state.currentPage === "dashboard";
    elements.hero.classList.toggle("hidden", !showHero);
    elements.heroKicker.textContent = copy.kicker;
    elements.heroTitle.textContent = copy.title;
    elements.heroText.textContent = copy.text;
  }

  function setActivePage(target) {
    const nextTarget = target || "dashboard";
    state.currentPage = nextTarget;
    elements.navItems.forEach((item) => item.classList.toggle("active", item.dataset.target === nextTarget));
    elements.pages.forEach((page) => page.classList.toggle("active", page.id === nextTarget));
    renderHero();
    if (nextTarget === "news") {
      renderNewsWidget("newsWidget", "headlines");
    }
    if (nextTarget === "insights") {
      renderInsightNews();
    }
    if (nextTarget === "trade") {
      window.setTimeout(() => {
        renderTradeChart(elements.tradeSymbol.value || state.selectedMarketId);
      }, 60);
    }
  }

  function renderAuthState() {
    const user = state.user;
    elements.profileName.textContent = user?.name || "Guest Trader";
    elements.profileEmail.textContent = user?.email || "Not signed in";
    elements.profileCreated.textContent = user?.created_at ? formatDate(user.created_at) : "-";
    elements.profileLastLogin.textContent = user?.last_login_at ? formatDate(user.last_login_at) : "-";
    elements.profileTradesCount.textContent = String((state.account?.trades || []).length);
    elements.profileAccessName.textContent = user?.name || "Guest Trader";
    elements.profileAccessEmail.textContent = user?.email || "Sign in to save trades and research.";
    elements.profileOpenAuthBtn.classList.toggle("hidden", Boolean(user));
    elements.profileLogoutBtn.classList.toggle("hidden", !user);
    elements.landingLoginBtn.textContent = user ? "Dashboard" : "Log In";
    elements.landingSignupBtn.textContent = user ? "Open Workspace" : "Sign Up";
  }

  function renderAccountViews() {
    const account = state.account || { startBalance: 100000, cash: 100000, positions: [], trades: [] };
    const positions = Array.isArray(account.positions) ? account.positions : [];
    const trades = Array.isArray(account.trades) ? account.trades : [];
    const marketMap = new Map(state.marketData.map((item) => [item.id, item]));

    const investedValue = positions.reduce((sum, position) => {
      const livePrice = marketMap.get(position.symbol)?.price || position.averagePrice;
      return sum + (livePrice * position.quantity);
    }, 0);

    const dayChange = positions.reduce((sum, position) => {
      const asset = marketMap.get(position.symbol);
      const livePrice = asset?.price || position.averagePrice;
      const previousClose = asset?.previousClose || position.averagePrice;
      return sum + ((livePrice - previousClose) * position.quantity);
    }, 0);

    const costBasis = positions.reduce((sum, position) => sum + (position.averagePrice * position.quantity), 0);
    const profitLoss = investedValue - costBasis;
    const totalValue = account.cash + investedValue;

    elements.positionsCount.textContent = String(positions.length);
    elements.balanceDisplay.textContent = formatCurrency(account.cash);
    elements.portfolioValueDisplay.textContent = formatCurrency(totalValue);
    elements.profitLossDisplay.textContent = formatSignedCurrency(profitLoss);
    elements.profitLossDisplay.className = profitLoss >= 0 ? "positive" : "negative";
    elements.investedValueDisplay.textContent = formatCurrency(investedValue);
    elements.dayChangeDisplay.textContent = formatSignedCurrency(dayChange);
    elements.dayChangeDisplay.className = dayChange >= 0 ? "positive" : "negative";
    elements.tradeCashDisplay.textContent = formatCurrency(account.cash);
    elements.tradeInvestedDisplay.textContent = formatCurrency(investedValue);
    elements.tradePortfolioValueDisplay.textContent = formatCurrency(totalValue);
    elements.tradeProfitLossDisplay.textContent = formatSignedCurrency(profitLoss);
    elements.tradeProfitLossDisplay.className = profitLoss >= 0 ? "positive" : "negative";
    elements.tradeDayChangeDisplay.textContent = formatSignedCurrency(dayChange);
    elements.tradeDayChangeDisplay.className = dayChange >= 0 ? "positive" : "negative";

    elements.recentTrades.innerHTML = trades.length
      ? trades.slice(0, 4).map((trade) => `
        <article class="mini-item">
          <strong>${trade.action.toUpperCase()} ${trade.symbol}</strong>
          <p class="muted">${trade.quantity} units at ${formatCurrency(trade.price)}</p>
        </article>
      `).join("")
      : "<article class='mini-item'><strong>No trades yet</strong><p class='muted'>Log in and place your first practice trade.</p></article>";

    if (!positions.length) {
      elements.portfolioTable.innerHTML = `
        <div class="table-head">
          <span>Asset</span>
          <span>Qty</span>
          <span>Avg Price</span>
          <span>Live Price</span>
          <span>Total P/L</span>
          <span>Day Change</span>
        </div>
        <div class="table-row">
          <span>No positions yet.</span>
          <span>-</span>
          <span>-</span>
          <span>-</span>
          <span>-</span>
          <span>-</span>
        </div>
      `;
      return;
    }

    elements.portfolioTable.innerHTML = `
      <div class="table-head">
        <span>Asset</span>
        <span>Qty</span>
        <span>Avg Price</span>
        <span>Live Price</span>
        <span>Total P/L</span>
        <span>Day Change</span>
      </div>
      ${positions.map((position) => {
        const asset = marketMap.get(position.symbol);
        const livePrice = asset?.price || position.averagePrice;
        const previousClose = asset?.previousClose || position.averagePrice;
        const pnl = (livePrice - position.averagePrice) * position.quantity;
        const rowDayChange = (livePrice - previousClose) * position.quantity;
        return `
          <div class="table-row">
            <span>${position.name} (${position.symbol})</span>
            <span>${position.quantity}</span>
            <span>${formatCurrency(position.averagePrice)}</span>
            <span>${formatCurrency(livePrice)}</span>
            <span class="${pnl >= 0 ? "positive" : "negative"}">${formatSignedCurrency(pnl)}</span>
            <span class="${rowDayChange >= 0 ? "positive" : "negative"}">${formatSignedCurrency(rowDayChange)}</span>
          </div>
        `;
      }).join("")}
    `;
  }

  function updateTradePriceNote() {
    const asset = getSelectedAsset(elements.tradeSymbol.value);
    elements.tradePriceNote.textContent = asset ? `Current price: ${formatCurrency(asset.price)}` : "Current price: --";
  }

  function syncMarketQuote(quote) {
    if (!quote || !quote.id) {
      return;
    }

    const marketIndex = state.marketData.findIndex((item) => item.id === quote.id);
    if (marketIndex >= 0) {
      state.marketData[marketIndex] = {
        ...state.marketData[marketIndex],
        ...quote
      };
      return;
    }

    state.marketData.push({ ...quote });
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const isSignup = mode === "signup";
    elements.authModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    elements.authTitle.textContent = isSignup ? "Create your account" : "Welcome back";
    elements.authNameWrap.classList.toggle("hidden", !isSignup);
    elements.authSubmitBtn.textContent = isSignup ? "Continue with Email" : "Log In with Email";
    elements.authSwitchText.textContent = isSignup ? "Already have an account?" : "Need a new account?";
    elements.authSwitchBtn.textContent = isSignup ? "Log In" : "Sign Up";
    elements.authStatus.textContent = isSignup
      ? "Use Google or create your account with email and password."
      : "Continue with Google or log in with your email and password.";
  }

  function openAuthModal(mode) {
    setAuthMode(mode);
    elements.authStatus.textContent = mode === "signup"
      ? "Use Google or create your account with email and password."
      : "Continue with Google or log in with your email and password.";
    elements.authPassword.value = "";
    elements.authModal.classList.remove("hidden");
    initGoogleAuthButton();
  }

  function closeAuthModal() {
    elements.authModal.classList.add("hidden");
  }

  function enterWorkspace(options = {}) {
    const { scroll = true, targetPage = "dashboard" } = options;
    setActivePage(targetPage);
    elements.landingPage.classList.add("hidden");
    elements.appShell.classList.remove("hidden");
    document.body.classList.add("workspace-open");
    refreshWorkspaceWidgets();
    if (scroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function showLanding() {
    elements.appShell.classList.add("hidden");
    elements.landingPage.classList.remove("hidden");
    document.body.classList.remove("workspace-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    try {
      if (state.token) {
        await apiFetch("/auth/logout", { method: "POST" });
      }
    } catch (error) {
      // Ignore logout errors and clear locally.
    }

    state.token = "";
    state.user = null;
    state.account = { startBalance: 100000, cash: 100000, positions: [], trades: [] };
    localStorage.removeItem("seethrough-brain-token");
    renderAuthState();
    renderAccountViews();
    elements.tradeStatus.textContent = "You have logged out.";
    showLanding();
  }

  async function handleAuthSuccess(response) {
    state.token = response.token;
    state.user = response.user;
    state.account = response.account;
    localStorage.setItem("seethrough-brain-token", state.token);
    renderAuthState();
    renderAccountViews();
    closeAuthModal();
    enterWorkspace({ scroll: false, targetPage: "dashboard" });

    try {
      await loadMarketData();
      renderAuthState();
      renderAccountViews();
    } catch (error) {
      // Keep the user in the workspace even if live market refresh is slow or unavailable.
    }
  }

  function setThinking(target, label) {
    target.innerHTML = `
      <div class="thinking">
        <span>${label}</span>
        <span class="thinking-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    `;
  }

  function setStaticResponse(target, text) {
    target.textContent = text;
  }

  function renderResearchMessages() {
    elements.researchMessages.innerHTML = "";
    state.researchMessages.forEach((message) => {
      createResearchMessageElement(message);
    });
    scrollResearchToBottom();
  }

  function pushResearchMessage(message) {
    state.researchMessages.push(message);
    const nodes = createResearchMessageElement(message);
    scrollResearchToBottom();
    return nodes;
  }

  function createResearchMessageElement(message) {
    const article = document.createElement("article");
    article.className = `chat-message ${message.role === "user" ? "chat-message-user" : "chat-message-ai"}`;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    const meta = document.createElement("p");
    meta.className = "chat-meta";
    meta.textContent = message.meta || (message.role === "user" ? "You" : "SeeThrough AI");

    const body = document.createElement("div");
    body.className = message.role === "user" ? "chat-plain" : "ai-response-box";
    body.textContent = message.content || "";

    bubble.appendChild(meta);
    bubble.appendChild(body);
    article.appendChild(bubble);
    elements.researchMessages.appendChild(article);
    return { article, body };
  }

  function scrollResearchToBottom() {
    elements.researchMessages.scrollTo({
      top: elements.researchMessages.scrollHeight,
      behavior: "smooth"
    });
  }

  async function typeAiResponse(target, rawText) {
    const runId = ++typingRunId;
    const blocks = parseAiResponse(rawText);
    const root = document.createElement("div");
    root.className = "ai-response";
    target.innerHTML = "";
    target.appendChild(root);

    for (const block of blocks) {
      if (runId !== typingRunId) {
        return;
      }

      if (block.type === "spacer") {
        const spacer = document.createElement("div");
        spacer.className = "ai-response-block";
        spacer.style.height = "2px";
        root.appendChild(spacer);
        continue;
      }

      const element = document.createElement(block.type === "heading" ? "h4" : "p");
      element.className = `ai-response-block ${block.type === "heading" ? "ai-response-heading" : block.type === "item" ? "ai-response-item" : "ai-response-paragraph"} ai-response-cursor`;
      root.appendChild(element);
      await typeTextIntoElement(element, block.text, runId);
      element.classList.remove("ai-response-cursor");
      scrollResearchToBottom();
    }
  }

  async function typeTextIntoElement(element, text, runId) {
    const content = String(text || "");
    for (let index = 0; index < content.length; index += 1) {
      if (runId !== typingRunId) {
        return;
      }
      element.textContent += content[index];
      await delay(content[index] === "\n" ? 0 : 9);
    }
  }

  function parseAiResponse(rawText) {
    const lines = String(rawText || "")
      .replace(/\r/g, "")
      .split("\n");

    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return { type: "spacer", text: "" };
      }

      const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*:?$/);
      if (boldHeadingMatch) {
        return { type: "heading", text: sanitizeAiText(boldHeadingMatch[1]) };
      }

      const markdownHeadingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (markdownHeadingMatch) {
        return { type: "heading", text: sanitizeAiText(markdownHeadingMatch[1]) };
      }

      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        return { type: "item", text: sanitizeAiText(bulletMatch[1]) };
      }

      if (/^[A-Za-z][A-Za-z0-9 /&(),'’-]{2,48}:$/.test(trimmed)) {
        return { type: "heading", text: sanitizeAiText(trimmed.replace(/:$/, "")) };
      }

      return { type: "paragraph", text: sanitizeAiText(trimmed) };
    });
  }

  function sanitizeAiText(text) {
    return String(text || "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function initGoogleAuthButton() {
    const clientId = String(config.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId || typeof window.initializeGoogleAuth !== "function") {
      elements.authStatus.textContent = "Add GOOGLE_CLIENT_ID in config.js to enable direct Google sign-in.";
      return;
    }

    window.initializeGoogleAuth({
      clientId,
      buttonContainerId: "googleAuthBtn",
      onCredential: async ({ idToken, name, email }) => {
        try {
          elements.authStatus.textContent = "Signing in with Google...";
          const response = await apiFetch("/auth/google", {
            method: "POST",
            body: JSON.stringify({ idToken, name, email })
          }, false);
          await handleAuthSuccess(response);
        } catch (error) {
          elements.authStatus.textContent = error.message;
        }
      }
    });
  }

  async function resolveLiveTradePrice(asset) {
    const response = await apiFetch(`/market/quote?symbol=${encodeURIComponent(asset.id)}&marketType=${encodeURIComponent(asset.type)}&name=${encodeURIComponent(asset.name)}`, {
      method: "GET"
    }, false);
    return roundMoney(response.price || asset.price);
  }

  async function fetchSingleStockPrice(symbol, fallbackPrice) {
    return resolveLiveTradePrice({ id: symbol, name: symbol, type: "stock", price: fallbackPrice });
  }

  async function fetchSingleCryptoPrice(symbol, fallbackPrice) {
    return resolveLiveTradePrice({ id: symbol, name: symbol, type: "crypto", price: fallbackPrice });
  }

  function getSelectedAsset(id) {
    return state.marketData.find((item) => item.id === id) || null;
  }

  function toInternalSymbol(value) {
    if (value.includes("BTC")) {
      return "BTC";
    }
    if (value.includes("ETH")) {
      return "ETH";
    }
    return value.split(":").pop();
  }

  function toTradingViewSymbol(value) {
    const normalizedValue = String(value || "").trim().toUpperCase();
    const mapping = {
      AAPL: "NASDAQ:AAPL",
      TSLA: "NASDAQ:TSLA",
      MSFT: "NASDAQ:MSFT",
      BTC: "BITSTAMP:BTCUSD",
      ETH: "BITSTAMP:ETHUSD"
    };

    return mapping[normalizedValue] || "NASDAQ:AAPL";
  }

  async function apiFetch(path, options = {}, requireAuth = true) {
    const headers = {
      "Content-Type": "application/json",
      "X-User-Locale": window.navigator?.language || "en-US",
      "X-User-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      ...(options.headers || {})
    };

    if (state.token && (requireAuth || !String(path).startsWith("/auth/"))) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(`${config.API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function startAutoRefresh() {
    window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMarketData();
      }
    }, 90000);
  }

  function formatCurrency(value) {
    const { locale, currency } = getCurrencyPreferences();
    const isZeroDecimalCurrency = ["JPY"].includes(currency);

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: isZeroDecimalCurrency ? 0 : 2
    }).format(Number(value || 0));
  }

  function formatSignedCurrency(value) {
    return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(Number(value || 0)))}`;
  }

  function formatSignedPercent(value) {
    return `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(2)}%`;
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function getCurrencyPreferences() {
    return {
      locale: state.user?.preferredLocale || browserRegionalDefaults.locale,
      currency: state.user?.preferredCurrency || browserRegionalDefaults.currency
    };
  }

  function detectBrowserRegionalDefaults() {
    const locale = normalizeLocale(window.navigator?.language || "en-US");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

    if (locale === "en-in" || locale === "hi-in" || timezone === "Asia/Kolkata") {
      return { locale: "en-IN", currency: "INR" };
    }
    if (locale === "en-gb" || timezone === "Europe/London") {
      return { locale: "en-GB", currency: "GBP" };
    }
    if (locale === "ja-jp" || timezone === "Asia/Tokyo") {
      return { locale: "ja-JP", currency: "JPY" };
    }
    if (locale === "en-au") {
      return { locale: "en-AU", currency: "AUD" };
    }
    if (locale === "en-ca") {
      return { locale: "en-CA", currency: "CAD" };
    }
    if (locale === "en-sg" || timezone === "Asia/Singapore") {
      return { locale: "en-SG", currency: "SGD" };
    }
    if (locale === "ar-ae" || timezone === "Asia/Dubai") {
      return { locale: "ar-AE", currency: "AED" };
    }
    if (/^(de|fr|es|it|nl|pt)-/i.test(locale)) {
      return { locale: locale.replace(/^([a-z]{2})-([a-z]{2})$/i, (match, language, region) => `${language.toLowerCase()}-${region.toUpperCase()}`), currency: "EUR" };
    }

    return { locale: "en-US", currency: "USD" };
  }

  function normalizeLocale(locale) {
    return String(locale || "en-US").trim().replace(/_/g, "-").toLowerCase();
  }
})();
