(function () {
  const config = window.SEE_THROUGH_CONFIG || {};
  const storageKeys = {
    profile: "seethrough-fresh-profile",
    streak: "seethrough-fresh-streak",
    portfolio: "seethrough-fresh-portfolio"
  };

  const initialCash = 100000;
  const usdToInrRate = 83.2;

  const staticNews = [
    {
      title: "Tech momentum stays constructive",
      source: "SeeThrough Desk",
      summary: "Large-cap technology names remain firm as traders react to stable earnings expectations and resilient sentiment.",
      tag: "Equities"
    },
    {
      title: "Bitcoin movement stays active",
      source: "Crypto Research",
      summary: "Volatility remains meaningful, but the latest sessions suggest a more controlled rhythm than earlier sharp swings.",
      tag: "Crypto"
    },
    {
      title: "Trend note for beginners",
      source: "Learning Guide",
      summary: "A trend becomes more credible when price direction repeats over time instead of appearing in one isolated spike.",
      tag: "Education"
    }
  ];

  const fallbackMarketData = [
    { id: "AAPL", name: "Apple", type: "stock", price: 15853.0, changePercent: 1.28, trend: "up" },
    { id: "TSLA", name: "Tesla", type: "stock", price: 14323.71, changePercent: -0.92, trend: "down" },
    { id: "MSFT", name: "Microsoft", type: "stock", price: 35679.49, changePercent: 0.73, trend: "up" },
    { id: "BTC", name: "Bitcoin", type: "crypto", price: 6395204.0, changePercent: 1.47, trend: "up" },
    { id: "ETH", name: "Ethereum", type: "crypto", price: 287410.0, changePercent: -0.86, trend: "down" }
  ];

  const state = {
    selectedMarketId: "AAPL",
    currentPage: "dashboard",
    marketData: [],
    previousMarketData: [],
    profile: loadProfile(),
    streak: loadStreak(),
    portfolio: loadPortfolio()
  };

  const elements = {
    navItems: document.querySelectorAll(".nav-item"),
    pages: document.querySelectorAll(".page"),
    authForm: document.getElementById("authForm"),
    authName: document.getElementById("authName"),
    authStatus: document.getElementById("authStatus"),
    heroKicker: document.getElementById("heroKicker"),
    welcomeTitle: document.getElementById("welcomeTitle"),
    heroText: document.getElementById("heroText"),
    profileName: document.getElementById("profileName"),
    profileStreak: document.getElementById("profileStreak"),
    streakCount: document.getElementById("streakCount"),
    streakMessage: document.getElementById("streakMessage"),
    balanceDisplay: document.getElementById("balanceDisplay"),
    portfolioValueDisplay: document.getElementById("portfolioValueDisplay"),
    profitLossDisplay: document.getElementById("profitLossDisplay"),
    positionsCount: document.getElementById("positionsCount"),
    cashLeftDisplay: document.getElementById("cashLeftDisplay"),
    investedValueDisplay: document.getElementById("investedValueDisplay"),
    dayChangeSideDisplay: document.getElementById("dayChangeSideDisplay"),
    heroStage: document.getElementById("heroStage"),
    liveRatesList: document.getElementById("liveRatesList"),
    marketGrid: document.getElementById("marketGrid"),
    dashboardNewsWidget: document.getElementById("dashboardNewsWidget"),
    newsList: document.getElementById("newsList"),
    refreshMarketBtn: document.getElementById("refreshMarketBtn"),
    tradeSymbol: document.getElementById("tradeSymbol"),
    tradeAction: document.getElementById("tradeAction"),
    tradeQuantity: document.getElementById("tradeQuantity"),
    tradeForm: document.getElementById("tradeForm"),
    tradePriceNote: document.getElementById("tradePriceNote"),
    tradeStatus: document.getElementById("tradeStatus"),
    portfolioTable: document.getElementById("portfolioTable"),
    insightSymbol: document.getElementById("insightSymbol"),
    generateInsightBtn: document.getElementById("generateInsightBtn"),
    insightOutput: document.getElementById("insightOutput"),
    insightFacts: document.getElementById("insightFacts"),
    insightNewsWidget: document.getElementById("insightNewsWidget"),
    symbolChips: document.querySelectorAll(".symbol-chip")
  };

  const pageContent = {
    dashboard: {
      kicker: "Beginner-friendly market simulator",
      title: (name) => `Welcome back, ${name}. Start with the chart and read the market clearly.`,
      text: "The main chart comes first, followed by live rates, your market watchlist, quick research notes, and a practical paper-trading snapshot."
    },
    trade: {
      kicker: "Paper trading workspace",
      title: (name) => `${name}, place practice trades with more confidence.`,
      text: "Use live-looking prices, test entries and exits safely, and watch your cash, holdings, and running profit or loss update instantly."
    },
    insights: {
      kicker: "AI explanation layer",
      title: (name) => `${name}, turn price movement into plain-language insight.`,
      text: "Generate short beginner-friendly explanations from the latest market snapshot so the dashboard teaches while you explore."
    },
    news: {
      kicker: "Research without overload",
      title: (name) => `${name}, scan the headlines that actually matter.`,
      text: "Read concise, readable market notes that support the chart instead of burying you in noisy information."
    },
    profile: {
      kicker: "Your learning identity",
      title: (name) => `${name}, this is your personal practice base.`,
      text: "Track your streak, keep your local profile, and build a calmer routine around learning markets step by step."
    }
  };

  initialize();

  function initialize() {
    bindNavigation();
    bindProfile();
    bindTrading();
    bindChartControls();
    bindInsightControls();
    updateStreak();
    renderProfile();
    renderNews();
    renderTradingView("NASDAQ:AAPL");
    renderTradingViewRates();
    renderNewsWidget("dashboardNewsWidget", "headlines", 480);
    loadMarketData();
    startAutoRefresh();
  }

  function bindNavigation() {
    elements.navItems.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target;
        state.currentPage = target;
        elements.navItems.forEach((item) => item.classList.remove("active"));
        elements.pages.forEach((page) => page.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(target).classList.add("active");
        renderHero();
      });
    });
  }

  function bindProfile() {
    elements.authName.value = state.profile.name;
    elements.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = elements.authName.value.trim() || "Guest Trader";
      state.profile.name = name;
      localStorage.setItem(storageKeys.profile, JSON.stringify(state.profile));
      renderProfile();
      elements.authStatus.textContent = `Saved locally for ${name}.`;
      setActivePage("dashboard");
    });
  }

  function bindTrading() {
    elements.tradeSymbol.addEventListener("change", updateTradePriceNote);

    elements.tradeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const symbol = elements.tradeSymbol.value;
      const action = elements.tradeAction.value;
      const quantity = Number(elements.tradeQuantity.value);
      const asset = state.marketData.find((item) => item.id === symbol);

      if (!asset || quantity <= 0) {
        elements.tradeStatus.textContent = "Enter a valid symbol and quantity.";
        return;
      }

      const totalCost = asset.price * quantity;
      const holding = state.portfolio.positions[symbol] || {
        id: asset.id,
        name: asset.name,
        quantity: 0,
        averagePrice: 0
      };

      if (action === "buy") {
        if (state.portfolio.cash < totalCost) {
          elements.tradeStatus.textContent = "Not enough virtual cash for that trade.";
          return;
        }

        const nextQuantity = holding.quantity + quantity;
        const combinedCost = (holding.averagePrice * holding.quantity) + totalCost;
        holding.quantity = nextQuantity;
        holding.averagePrice = combinedCost / nextQuantity;
        state.portfolio.cash -= totalCost;
        state.portfolio.positions[symbol] = holding;
        elements.tradeStatus.textContent = `Bought ${quantity} ${asset.id} at ${formatCurrency(asset.price)}.`;
      } else {
        if (holding.quantity < quantity) {
          elements.tradeStatus.textContent = "You do not own enough units to sell that amount.";
          return;
        }

        holding.quantity -= quantity;
        state.portfolio.cash += totalCost;

        if (holding.quantity === 0) {
          delete state.portfolio.positions[symbol];
        } else {
          state.portfolio.positions[symbol] = holding;
        }

        elements.tradeStatus.textContent = `Sold ${quantity} ${asset.id} at ${formatCurrency(asset.price)}.`;
      }

      savePortfolio();
      renderPortfolio();
    });
  }

  function bindChartControls() {
    elements.symbolChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        elements.symbolChips.forEach((item) => item.classList.remove("active"));
        chip.classList.add("active");
        renderTradingView(chip.dataset.symbol);
      });
    });
  }

  function bindInsightControls() {
    elements.refreshMarketBtn.addEventListener("click", loadMarketData);
    elements.generateInsightBtn.addEventListener("click", generateInsight);
    elements.insightSymbol.addEventListener("change", () => {
      state.selectedMarketId = elements.insightSymbol.value;
      renderInsightFacts();
      renderInsightNews();
    });
  }

  async function loadMarketData() {
    elements.refreshMarketBtn.disabled = true;
    elements.refreshMarketBtn.textContent = "Refreshing...";

    try {
      const [stockData, cryptoData] = await Promise.all([fetchStockData(), fetchCryptoData()]);
      state.previousMarketData = state.marketData.length ? state.marketData.map((item) => ({ ...item })) : fallbackMarketData.map((item) => ({ ...item }));
      state.marketData = applySimulatedMovement([...stockData, ...cryptoData], state.previousMarketData);
      if (!state.marketData.length) {
        state.marketData = applySimulatedMovement(fallbackMarketData.map((item) => ({ ...item })), state.previousMarketData);
      }
    } catch (error) {
      state.previousMarketData = state.marketData.length ? state.marketData.map((item) => ({ ...item })) : fallbackMarketData.map((item) => ({ ...item }));
      state.marketData = applySimulatedMovement(fallbackMarketData.map((item) => ({ ...item })), state.previousMarketData);
    }

    renderMarketCards();
    renderTradingViewRates();
    renderNewsWidget("dashboardNewsWidget", "headlines", 480);
    populateTradeSymbols();
    populateInsightSymbols();
    renderPortfolio();
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

    const requests = stockSymbols.map(async (stock) => {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stock.id}&apikey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      const quote = data["Global Quote"];

      if (!quote || !quote["05. price"]) {
        throw new Error(`Alpha Vantage failed for ${stock.id}`);
      }

      const changePercent = Number(String(quote["10. change percent"]).replace("%", ""));

      return {
        id: stock.id,
        name: stock.name,
        type: "stock",
        price: Number(quote["05. price"]) * usdToInrRate,
        previousClose: Number(quote["08. previous close"]) * usdToInrRate,
        changePercent,
        trend: changePercent >= 0 ? "up" : "down"
      };
    });

    return Promise.all(requests);
  }

  async function fetchCryptoData() {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=inr&include_24hr_change=true";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("CoinGecko request failed");
    }

    const data = await response.json();
    return [
      {
        id: "BTC",
        name: "Bitcoin",
        type: "crypto",
        price: Number(data.bitcoin.inr),
        previousClose: Number(data.bitcoin.inr) / (1 + Number(data.bitcoin.inr_24h_change || 0) / 100),
        changePercent: Number(data.bitcoin.inr_24h_change || 0),
        trend: (data.bitcoin.inr_24h_change || 0) >= 0 ? "up" : "down"
      },
      {
        id: "ETH",
        name: "Ethereum",
        type: "crypto",
        price: Number(data.ethereum.inr),
        previousClose: Number(data.ethereum.inr) / (1 + Number(data.ethereum.inr_24h_change || 0) / 100),
        changePercent: Number(data.ethereum.inr_24h_change || 0),
        trend: (data.ethereum.inr_24h_change || 0) >= 0 ? "up" : "down"
      }
    ];
  }

  function renderMarketCards() {
    if (!elements.marketGrid) {
      return;
    }

    elements.marketGrid.innerHTML = "";

    state.marketData.slice(0, 4).forEach((item) => {
      const card = document.createElement("article");
      card.className = `market-card ${state.selectedMarketId === item.id ? "selected" : ""}`;
      card.innerHTML = `
        <div class="market-top">
          <div>
            <p class="micro">${item.type}</p>
            <h4>${item.name}</h4>
          </div>
          <strong class="${item.trend === "up" ? "positive" : "negative"}">${item.trend === "up" ? "Uptrend" : "Downtrend"}</strong>
        </div>
        <div class="market-bottom">
          <div>
            <div class="price">${formatCurrency(item.price)}</div>
            <p class="muted">${item.id}</p>
          </div>
          <strong class="${item.changePercent >= 0 ? "positive" : "negative"}">${formatSignedPercent(item.changePercent)}</strong>
        </div>
      `;

      card.addEventListener("click", () => {
        state.selectedMarketId = item.id;
        if (elements.insightSymbol) {
          elements.insightSymbol.value = item.id;
        }
        renderMarketCards();
        updateTradePriceNote();
        renderInsightFacts();
        renderInsightNews();
      });

      elements.marketGrid.appendChild(card);
    });
  }

  function renderNews() {
    renderNewsWidget("newsList", "headlines", 720);
  }

  function populateTradeSymbols() {
    const currentValue = elements.tradeSymbol.value;
    elements.tradeSymbol.innerHTML = "";

    state.marketData.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id} - ${item.name}`;
      elements.tradeSymbol.appendChild(option);
    });

    elements.tradeSymbol.value = currentValue || state.selectedMarketId;
    updateTradePriceNote();
  }

  function populateInsightSymbols() {
    const currentValue = elements.insightSymbol.value;
    elements.insightSymbol.innerHTML = "";

    state.marketData.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id} - ${item.name}`;
      elements.insightSymbol.appendChild(option);
    });

    elements.insightSymbol.value = currentValue || state.selectedMarketId;
  }

  function updateTradePriceNote() {
    const symbol = elements.tradeSymbol.value;
    const asset = state.marketData.find((item) => item.id === symbol);
    elements.tradePriceNote.textContent = asset ? `Current price: ${formatCurrency(asset.price)}` : "Current price: --";
  }

  function renderPortfolio() {
    const positions = Object.values(state.portfolio.positions);
    const marketMap = new Map(state.marketData.map((item) => [item.id, item]));

    const investedValue = positions.reduce((sum, position) => {
      const livePrice = marketMap.get(position.id)?.price || position.averagePrice;
      return sum + (livePrice * position.quantity);
    }, 0);

    const dayChange = positions.reduce((sum, position) => {
      const asset = marketMap.get(position.id);
      const livePrice = asset?.price || position.averagePrice;
      const previousClose = asset?.previousClose || position.averagePrice;
      return sum + ((livePrice - previousClose) * position.quantity);
    }, 0);

    const costBasis = positions.reduce((sum, position) => sum + (position.averagePrice * position.quantity), 0);
    const profitLoss = investedValue - costBasis;
    const totalValue = state.portfolio.cash + investedValue;

    elements.balanceDisplay.textContent = formatCurrency(state.portfolio.cash);
    elements.cashLeftDisplay.textContent = formatCurrency(state.portfolio.cash);
    elements.investedValueDisplay.textContent = formatCurrency(investedValue);
    elements.portfolioValueDisplay.textContent = formatCurrency(totalValue);
    elements.profitLossDisplay.textContent = formatSignedCurrency(profitLoss);
    elements.dayChangeSideDisplay.textContent = formatSignedCurrency(dayChange);
    elements.dayChangeSideDisplay.className = dayChange >= 0 ? "positive" : "negative";
    elements.positionsCount.textContent = String(positions.length);

    if (!positions.length) {
      elements.portfolioTable.innerHTML = `
        <div class="portfolio-head">
          <span>Asset</span>
          <span>Qty</span>
          <span>Avg Price</span>
          <span>Live Price</span>
          <span>Total P/L</span>
          <span>Day Change</span>
        </div>
        <div class="portfolio-row">
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

    const rows = positions.map((position) => {
      const asset = marketMap.get(position.id);
      const livePrice = asset?.price || position.averagePrice;
      const previousClose = asset?.previousClose || position.averagePrice;
      const pnl = (livePrice - position.averagePrice) * position.quantity;
      const rowDayChange = (livePrice - previousClose) * position.quantity;
      return `
        <div class="portfolio-row">
          <span>${position.name} (${position.id})</span>
          <span>${position.quantity}</span>
          <span>${formatCurrency(position.averagePrice)}</span>
          <span>${formatCurrency(livePrice)}</span>
          <span class="${pnl >= 0 ? "positive" : "negative"}">${formatSignedCurrency(pnl)}</span>
          <span class="${rowDayChange >= 0 ? "positive" : "negative"}">${formatSignedCurrency(rowDayChange)}</span>
        </div>
      `;
    }).join("");

    elements.portfolioTable.innerHTML = `
      <div class="portfolio-head">
        <span>Asset</span>
        <span>Qty</span>
        <span>Avg Price</span>
        <span>Live Price</span>
        <span>Total P/L</span>
        <span>Day Change</span>
      </div>
      ${rows}
    `;
  }

  function applySimulatedMovement(nextData, previousData) {
    const previousMap = new Map((previousData || []).map((item) => [item.id, item]));

    return nextData.map((item) => {
      const previous = previousMap.get(item.id);
      const previousClose = item.previousClose || previous?.price || item.price;
      const noMeaningfulMove = !previous || Math.abs(item.price - previous.price) < (previous.price * 0.0005);

      if (!noMeaningfulMove) {
        return {
          ...item,
          previousClose
        };
      }

      const driftSeed = pseudoRandomFromString(`${item.id}-${new Date().toDateString()}`);
      const driftPercent = ((driftSeed * 2) - 1) * 0.0075;
      const simulatedPrice = Math.max(1, previousClose * (1 + driftPercent));
      const simulatedChangePercent = ((simulatedPrice - previousClose) / previousClose) * 100;

      return {
        ...item,
        price: roundMoney(simulatedPrice),
        previousClose: roundMoney(previousClose),
        changePercent: simulatedChangePercent,
        trend: simulatedChangePercent >= 0 ? "up" : "down"
      };
    });
  }

  function pseudoRandomFromString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
  }

  function roundMoney(value) {
    return Math.round(value * 100) / 100;
  }

  async function generateInsight() {
    const selectedId = elements.insightSymbol.value || state.selectedMarketId;
    state.selectedMarketId = selectedId;
    const asset = state.marketData.find((item) => item.id === selectedId) || fallbackMarketData[0];
    const fallbackInsight = buildFallbackInsight(asset);
    elements.insightOutput.classList.add("loading");
    elements.insightOutput.innerHTML = `
      <div class="thinking">
        <span>Generating live insight</span>
        <span class="thinking-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    `;

    try {
      const apiKey = (config.OPENROUTER_API_KEY || "").trim();
      if (!apiKey) {
        throw new Error("No OpenRouter key");
      }

      const content = await requestLiveInsight(asset, apiKey);
      elements.insightOutput.classList.remove("loading");
      elements.insightOutput.textContent = content;
    } catch (error) {
      elements.insightOutput.classList.remove("loading");
      elements.insightOutput.textContent = `${fallbackInsight}\n\nFallback mode: live AI was unavailable, so this explanation was generated locally.\n\nReason: ${error.message}`;
    }
  }

  async function requestLiveInsight(asset, apiKey) {
    const models = [
      "deepseek/deepseek-r1:free",
      "deepseek/deepseek-chat:free",
      "openrouter/auto"
    ];

    let lastError = new Error("No AI response");

    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "SeeThrough Fresh"
          },
          body: JSON.stringify({
            model,
            temperature: 0.35,
            messages: [
              {
                role: "system",
                content: "You are a calm beginner-friendly trading explainer. Explain market movement simply, avoid hype, and keep it under 90 words."
              },
              {
                role: "user",
                content: `Explain this market snapshot for a beginner.\nName: ${asset.name}\nSymbol: ${asset.id}\nPrice: ${asset.price}\nChange: ${asset.changePercent}\nTrend: ${asset.trend}`
              }
            ]
          })
        });

        const data = await response.json().catch(() => ({}));
        const content = data?.choices?.[0]?.message?.content?.trim();

        if (response.ok && content) {
          return content;
        }

        const errorMessage = data?.error?.message || `OpenRouter rejected model ${model}`;
        lastError = new Error(errorMessage);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  function renderInsightFacts() {
    const asset = state.marketData.find((item) => item.id === state.selectedMarketId) || fallbackMarketData[0];
    const facts = [
      {
        title: "Selected Symbol",
        body: `${asset.name} (${asset.id})`
      },
      {
        title: "Current Price",
        body: formatCurrency(asset.price)
      },
      {
        title: "Latest Move",
        body: formatSignedPercent(asset.changePercent)
      },
      {
        title: "Trend Reading",
        body: asset.trend === "up" ? "Upward momentum with buyers still in control." : "Downward pressure is leading the current move."
      },
      {
        title: "Insight Engine",
        body: "OpenRouter live response with DeepSeek-first routing and local fallback."
      }
    ];

    elements.insightFacts.innerHTML = facts.map((fact) => `
      <article class="context-row">
        <strong>${fact.title}</strong>
        <p>${fact.body}</p>
      </article>
    `).join("");
  }

  function renderInsightNews() {
    const asset = state.marketData.find((item) => item.id === state.selectedMarketId) || fallbackMarketData[0];
    const symbolMap = {
      AAPL: "NASDAQ:AAPL",
      TSLA: "NASDAQ:TSLA",
      MSFT: "NASDAQ:MSFT",
      BTC: "BITSTAMP:BTCUSD",
      ETH: "BITSTAMP:ETHUSD"
    };

    renderNewsWidget("insightNewsWidget", symbolMap[asset.id] || "headlines", 520);
  }

  function buildFallbackInsight(asset) {
    const strength = Math.abs(asset.changePercent);
    const intensity = strength > 2 ? "strong" : strength > 1 ? "steady" : "mild";
    const direction = asset.changePercent >= 0 ? "upward" : "downward";

    return `${asset.name} is showing a ${intensity} ${direction} move right now. The latest price is ${formatCurrency(asset.price)} with a change of ${formatSignedPercent(asset.changePercent)}. For a beginner, that suggests price has been leaning in one direction recently, but it is still important to watch for pauses or reversals rather than chasing a single move.`;
  }

  function renderTradingView(symbol) {
    const target = document.getElementById("tradingview-widget");
    target.innerHTML = "";

    if (!window.TradingView) {
      target.innerHTML = "<p class='muted'>TradingView widget could not load.</p>";
      return;
    }

    new window.TradingView.widget({
      width: "100%",
      height: 430,
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

  function renderProfile() {
    const name = state.profile.name || "Guest Trader";
    elements.profileName.textContent = name;
    renderHero();
  }

  function renderHero() {
    const name = state.profile.name || "Guest Trader";
    const active = pageContent[state.currentPage] || pageContent.dashboard;
    elements.heroKicker.textContent = active.kicker;
    elements.welcomeTitle.textContent = active.title(name);
    elements.heroText.textContent = active.text;
    document.body.classList.toggle("dashboard-mode", state.currentPage === "dashboard");
  }

  function renderTradingViewRates() {
    const target = elements.liveRatesList;
    if (!target) {
      return;
    }

    target.innerHTML = `
      <div class="tv-rates-frame">
        <div class="tradingview-widget-container" style="height:100%;width:100%;">
          <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%;"></div>
        </div>
      </div>
      <p class="rates-note">TradingView live market board for the symbols used across your dashboard.</p>
    `;

    const container = target.querySelector(".tradingview-widget-container");
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
      showSymbolLogo: true,
      isTransparent: true,
      colorTheme: "dark",
      locale: "en"
    });
    container.appendChild(script);
  }

  function renderNewsWidget(containerId, symbol, explicitHeight) {
    const target = document.getElementById(containerId);
    if (!target) {
      return;
    }

    const height = explicitHeight || (containerId === "insightNewsWidget" ? 520 : containerId === "newsList" ? 720 : 480);
    target.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.innerHTML = "<div class='tradingview-widget-container__widget' style='height:100%;width:100%;'></div>";
    target.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      feedMode: symbol === "headlines" ? "all_symbols" : "symbol",
      symbol: symbol === "headlines" ? undefined : symbol,
      isTransparent: true,
      displayMode: "adaptive",
      width: "100%",
      height,
      colorTheme: "dark",
      locale: "en"
    });
    wrapper.appendChild(script);
  }

  function setActivePage(target) {
    state.currentPage = target;
    elements.navItems.forEach((item) => item.classList.toggle("active", item.dataset.target === target));
    elements.pages.forEach((page) => page.classList.toggle("active", page.id === target));
    renderHero();
  }

  function startAutoRefresh() {
    window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMarketData();
        renderNews();
      }
    }, 90000);
  }

  function updateStreak() {
    const today = new Date().toDateString();
    const previous = state.streak.lastVisit;

    if (!previous) {
      state.streak.count = 1;
      state.streak.lastVisit = today;
    } else if (previous !== today) {
      const diff = Math.round((new Date(today) - new Date(previous)) / 86400000);
      state.streak.count = diff === 1 ? state.streak.count + 1 : 1;
      state.streak.lastVisit = today;
    }

    localStorage.setItem(storageKeys.streak, JSON.stringify(state.streak));
    const streakLabel = `${state.streak.count} day${state.streak.count === 1 ? "" : "s"}`;
    elements.streakCount.textContent = streakLabel;
    elements.profileStreak.textContent = streakLabel;
    elements.streakMessage.textContent = state.streak.count > 1
      ? "Consistency is building. Keep the streak moving."
      : "You started a fresh streak today. Come back tomorrow to extend it.";
  }

  function loadProfile() {
    return JSON.parse(localStorage.getItem(storageKeys.profile) || "{\"name\":\"Guest Trader\"}");
  }

  function loadStreak() {
    return JSON.parse(localStorage.getItem(storageKeys.streak) || "{\"count\":0,\"lastVisit\":\"\"}");
  }

  function loadPortfolio() {
    return JSON.parse(localStorage.getItem(storageKeys.portfolio) || `{"cash":${initialCash},"positions":{}}`);
  }

  function savePortfolio() {
    localStorage.setItem(storageKeys.portfolio, JSON.stringify(state.portfolio));
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatSignedCurrency(value) {
    return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
  }

  function formatSignedPercent(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

})();
