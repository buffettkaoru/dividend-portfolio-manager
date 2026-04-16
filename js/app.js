// ===== アプリケーション =====
(function () {
  "use strict";

  // ----- ストレージ -----
  function loadData(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ----- 状態 -----
  let settings = loadData(STORAGE_KEYS.settings, {
    scope: "both",
    divDisplay: "before_tax",
    basis: "dividend",
    broker: "sbi"
  });

  let industryTypes = loadData(STORAGE_KEYS.industryTypes, { ...DEFAULT_INDUSTRY_TYPES });
  let stockTypes = loadData(STORAGE_KEYS.stockTypes, []);
  let stocks = loadData(STORAGE_KEYS.stocks, []);
  let nisaItems = loadData(STORAGE_KEYS.nisa, []);

  // ----- ナビゲーション -----
  const navLinks = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.page;
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      pages.forEach((p) => p.classList.remove("active"));
      document.getElementById("page-" + target).classList.add("active");
      if (target === "dashboard") renderDashboard();
      if (target === "portfolio") renderPortfolioOverview();
    });
  });

  // ----- 設定ページ -----
  function initSettings() {
    document.getElementById("settingScope").value = settings.scope;
    document.getElementById("settingDivDisplay").value = settings.divDisplay;
    document.getElementById("settingBasis").value = settings.basis;
    document.getElementById("settingBroker").value = settings.broker;

    ["settingScope", "settingDivDisplay", "settingBasis", "settingBroker"].forEach((id) => {
      document.getElementById(id).addEventListener("change", (e) => {
        const key = id.replace("setting", "").charAt(0).toLowerCase() + id.replace("setting", "").slice(1);
        const map = { scope: "scope", divdisplay: "divDisplay", basis: "basis", broker: "broker" };
        const k = map[id.replace("setting", "").toLowerCase()];
        settings[k] = e.target.value;
        saveData(STORAGE_KEYS.settings, settings);
      });
    });

    renderIndustryTypeTable();
    renderStockTypeTable();
  }

  function renderIndustryTypeTable() {
    const tbody = document.querySelector("#industryTypeTable tbody");
    tbody.innerHTML = "";
    INDUSTRIES.forEach((ind) => {
      const tr = document.createElement("tr");
      const type = industryTypes[ind] || "景気敏感";
      tr.innerHTML = `
        <td>${ind}</td>
        <td>
          <select data-industry="${ind}">
            <option value="ディフェンシブ" ${type === "ディフェンシブ" ? "selected" : ""}>ディフェンシブ</option>
            <option value="景気敏感" ${type === "景気敏感" ? "selected" : ""}>景気敏感</option>
          </select>
        </td>
      `;
      tr.querySelector("select").addEventListener("change", (e) => {
        industryTypes[ind] = e.target.value;
        saveData(STORAGE_KEYS.industryTypes, industryTypes);
      });
      tbody.appendChild(tr);
    });
  }

  function renderStockTypeTable() {
    const tbody = document.getElementById("stockTypeBody");
    tbody.innerHTML = "";
    stockTypes.forEach((item, i) => {
      const tr = createStockTypeRow(item, i);
      tbody.appendChild(tr);
    });
  }

  function createStockTypeRow(item, index) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${item.code || ""}" data-idx="${index}" class="st-code" style="width:80px"></td>
      <td>
        <select data-idx="${index}" class="st-type">
          <option value="ディフェンシブ" ${item.type === "ディフェンシブ" ? "selected" : ""}>ディフェンシブ</option>
          <option value="景気敏感" ${item.type === "景気敏感" ? "selected" : ""}>景気敏感</option>
        </select>
      </td>
    `;
    tr.querySelector(".st-code").addEventListener("change", (e) => {
      stockTypes[index].code = e.target.value;
      saveData(STORAGE_KEYS.stockTypes, stockTypes);
    });
    tr.querySelector(".st-type").addEventListener("change", (e) => {
      stockTypes[index].type = e.target.value;
      saveData(STORAGE_KEYS.stockTypes, stockTypes);
    });
    return tr;
  }

  document.getElementById("addStockTypeBtn").addEventListener("click", () => {
    stockTypes.push({ code: "", type: "景気敏感" });
    saveData(STORAGE_KEYS.stockTypes, stockTypes);
    renderStockTypeTable();
  });

  // ----- 銘柄入力ページ -----
  function renderEntryTable() {
    const tbody = document.getElementById("entryBody");
    tbody.innerHTML = "";
    stocks.forEach((s, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="row-check" data-idx="${i}"></td>
        <td><input type="text" value="${s.code || ""}" data-field="code" data-idx="${i}" style="width:80px"></td>
        <td><input type="text" value="${s.name || ""}" data-field="name" data-idx="${i}" style="width:160px"></td>
        <td>
          <select data-field="industry" data-idx="${i}">
            <option value="">選択</option>
            ${INDUSTRIES.map((ind) => `<option value="${ind}" ${s.industry === ind ? "selected" : ""}>${ind}</option>`).join("")}
          </select>
        </td>
        <td><input type="number" value="${s.shares || ""}" data-field="shares" data-idx="${i}" style="width:70px" min="0"></td>
        <td><input type="number" value="${s.purchasePrice || ""}" data-field="purchasePrice" data-idx="${i}" style="width:90px" min="0" step="0.01"></td>
        <td><input type="number" value="${s.currentPrice || ""}" data-field="currentPrice" data-idx="${i}" style="width:90px" min="0" step="0.01"></td>
        <td><input type="number" value="${s.divPerShare || ""}" data-field="divPerShare" data-idx="${i}" style="width:90px" min="0" step="0.01"></td>
        <td><input type="text" value="${s.divMonths || ""}" data-field="divMonths" data-idx="${i}" style="width:100px" placeholder="3,6,9,12"></td>
      `;
      // イベントリスナー
      tr.querySelectorAll("input:not(.row-check), select").forEach((el) => {
        el.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const field = e.target.dataset.field;
          let val = e.target.value;
          if (["shares", "purchasePrice", "currentPrice", "divPerShare"].includes(field)) {
            val = val === "" ? null : parseFloat(val);
          }
          stocks[idx][field] = val;
          saveData(STORAGE_KEYS.stocks, stocks);
        });
      });
      tbody.appendChild(tr);
    });
  }

  document.getElementById("addRowBtn").addEventListener("click", () => {
    stocks.push({
      code: "", name: "", industry: "", shares: null,
      purchasePrice: null, currentPrice: null, divPerShare: null, divMonths: ""
    });
    saveData(STORAGE_KEYS.stocks, stocks);
    renderEntryTable();
  });

  document.getElementById("deleteSelectedBtn").addEventListener("click", () => {
    const checked = document.querySelectorAll("#entryBody .row-check:checked");
    const indices = Array.from(checked).map((c) => parseInt(c.dataset.idx)).sort((a, b) => b - a);
    indices.forEach((i) => stocks.splice(i, 1));
    saveData(STORAGE_KEYS.stocks, stocks);
    renderEntryTable();
  });

  document.getElementById("selectAll").addEventListener("change", (e) => {
    document.querySelectorAll("#entryBody .row-check").forEach((c) => {
      c.checked = e.target.checked;
    });
  });

  // ----- NISA ページ -----
  function renderNisaTable() {
    const tbody = document.getElementById("nisaBody");
    tbody.innerHTML = "";
    nisaItems.forEach((item, i) => {
      const matchedStock = stocks.find((s) => s.code === item.code);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="nisa-check" data-idx="${i}"></td>
        <td><input type="text" value="${item.code || ""}" data-field="code" data-idx="${i}" style="width:120px"></td>
        <td>${matchedStock ? matchedStock.name : ""}</td>
        <td><input type="number" value="${item.shares || ""}" data-field="shares" data-idx="${i}" style="width:100px" min="0"></td>
      `;
      tr.querySelectorAll("input:not(.nisa-check)").forEach((el) => {
        el.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const field = e.target.dataset.field;
          let val = e.target.value;
          if (field === "shares") val = val === "" ? null : parseInt(val);
          nisaItems[idx][field] = val;
          saveData(STORAGE_KEYS.nisa, nisaItems);
          renderNisaTable();
        });
      });
      tbody.appendChild(tr);
    });
  }

  document.getElementById("addNisaRowBtn").addEventListener("click", () => {
    nisaItems.push({ code: "", shares: null });
    saveData(STORAGE_KEYS.nisa, nisaItems);
    renderNisaTable();
  });

  document.getElementById("deleteNisaSelectedBtn").addEventListener("click", () => {
    const checked = document.querySelectorAll("#nisaBody .nisa-check:checked");
    const indices = Array.from(checked).map((c) => parseInt(c.dataset.idx)).sort((a, b) => b - a);
    indices.forEach((i) => nisaItems.splice(i, 1));
    saveData(STORAGE_KEYS.nisa, nisaItems);
    renderNisaTable();
  });

  document.getElementById("nisaSelectAll").addEventListener("change", (e) => {
    document.querySelectorAll("#nisaBody .nisa-check").forEach((c) => {
      c.checked = e.target.checked;
    });
  });

  // ----- ダッシュボード -----
  let industryChartInstance = null;
  let yieldDistChartInstance = null;
  let monthlyDivChartInstance = null;

  function getValidStocks() {
    return stocks.filter((s) => s.code && s.shares && s.shares > 0);
  }

  function formatNum(n) {
    if (n == null || isNaN(n)) return "0";
    return Math.round(n).toLocaleString("ja-JP");
  }

  function renderDashboard() {
    const valid = getValidStocks();

    // 集計
    let totalPurchase = 0;
    let totalValuation = 0;
    let totalDividend = 0;

    const industryDivMap = {};
    const industryValMap = {};
    const yieldBuckets = { "~1.0%": 0, "~1.5%": 0, "~2.0%": 0, "~2.5%": 0, "~3.0%": 0, "~3.5%": 0, "~4.0%": 0, "~4.5%": 0, "~5.0%": 0, "~5.5%": 0, "~6.0%": 0, "6.0%以上": 0 };
    const monthlyDiv = {};
    for (let m = 1; m <= 12; m++) monthlyDiv[m] = 0;

    valid.forEach((s) => {
      const purchase = (s.purchasePrice || 0) * s.shares;
      const valuation = (s.currentPrice || 0) * s.shares;
      const dividend = (s.divPerShare || 0) * s.shares;

      totalPurchase += purchase;
      totalValuation += valuation;
      totalDividend += dividend;

      // 業種別
      const ind = s.industry || "その他";
      industryDivMap[ind] = (industryDivMap[ind] || 0) + dividend;
      industryValMap[ind] = (industryValMap[ind] || 0) + valuation;

      // 利回りバケット
      const yieldPct = purchase > 0 ? (dividend / purchase) * 100 : 0;
      if (yieldPct < 1.0) yieldBuckets["~1.0%"]++;
      else if (yieldPct < 1.5) yieldBuckets["~1.5%"]++;
      else if (yieldPct < 2.0) yieldBuckets["~2.0%"]++;
      else if (yieldPct < 2.5) yieldBuckets["~2.5%"]++;
      else if (yieldPct < 3.0) yieldBuckets["~3.0%"]++;
      else if (yieldPct < 3.5) yieldBuckets["~3.5%"]++;
      else if (yieldPct < 4.0) yieldBuckets["~4.0%"]++;
      else if (yieldPct < 4.5) yieldBuckets["~4.5%"]++;
      else if (yieldPct < 5.0) yieldBuckets["~5.0%"]++;
      else if (yieldPct < 5.5) yieldBuckets["~5.5%"]++;
      else if (yieldPct < 6.0) yieldBuckets["~6.0%"]++;
      else yieldBuckets["6.0%以上"]++;

      // 月別配当（米国ETF・米国個別株は除外）
      if (s.industry !== "米国ETF" && s.industry !== "米国個別株" && s.divMonths) {
        const months = s.divMonths.split(",").map((m) => parseInt(m.trim())).filter((m) => m >= 1 && m <= 12);
        const perMonth = months.length > 0 ? dividend / months.length : 0;
        months.forEach((m) => {
          monthlyDiv[m] += perMonth;
        });
      }
    });

    const totalPL = totalValuation - totalPurchase;
    const totalPLPct = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;
    const divYield = totalPurchase > 0 ? (totalDividend / totalPurchase) * 100 : 0;

    // サマリー更新
    document.getElementById("totalAssets").innerHTML = formatNum(totalValuation) + '<span class="unit">円</span>';
    document.getElementById("totalPurchase").textContent = formatNum(totalPurchase) + "円";
    const plEl = document.getElementById("totalPL");
    plEl.textContent = (totalPL >= 0 ? "+" : "") + formatNum(totalPL) + "円";
    plEl.className = totalPL >= 0 ? "positive" : "negative";
    const plPctEl = document.getElementById("totalPLPct");
    plPctEl.textContent = "(" + (totalPL >= 0 ? "+" : "") + totalPLPct.toFixed(2) + "%)";
    plPctEl.className = totalPL >= 0 ? "positive" : "negative";
    document.getElementById("divYield").innerHTML = divYield.toFixed(2) + '<span class="unit">%</span>';
    document.getElementById("annualDiv").innerHTML = formatNum(totalDividend) + '<span class="unit">円</span>';
    document.getElementById("stockCount").innerHTML = valid.length + '<span class="unit">銘柄</span>';

    // 業種割合チャート
    renderIndustryChart(settings.basis === "dividend" ? industryDivMap : industryValMap);

    // 利回り分布チャート
    renderYieldDistChart(yieldBuckets);

    // 月別配当チャート
    renderMonthlyDivChart(monthlyDiv);

    // 構成比バー
    renderCompositionBar(industryValMap, valid);

    // Top20
    renderTop20(valid, totalDividend);

    // 全銘柄一覧
    renderHoldingsTable(valid, totalValuation, totalDividend);

    // 業種フィルター更新
    updateIndustryFilter(valid);
  }

  function renderIndustryChart(dataMap) {
    const ctx = document.getElementById("industryChart").getContext("2d");
    if (industryChartInstance) industryChartInstance.destroy();

    const sorted = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => v);
    const total = data.reduce((a, b) => a + b, 0);

    industryChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#b0b8c8", font: { size: 11 }, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${pct}%`;
              }
            }
          }
        }
      }
    });
  }

  function renderYieldDistChart(buckets) {
    const ctx = document.getElementById("yieldDistChart").getContext("2d");
    if (yieldDistChartInstance) yieldDistChartInstance.destroy();

    yieldDistChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(buckets),
        datasets: [{
          label: "銘柄数",
          data: Object.values(buckets),
          backgroundColor: "#4472c4",
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: "#b0b8c8", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { beginAtZero: true, ticks: { color: "#b0b8c8", stepSize: 1 }, grid: { color: "rgba(255,255,255,0.08)" } }
        },
        plugins: {
          legend: { display: false },
          title: { display: true, text: "合計 " + Object.values(buckets).reduce((a, b) => a + b, 0), color: "#b0b8c8", font: { size: 12 } }
        }
      }
    });
  }

  function renderMonthlyDivChart(monthlyDiv) {
    const ctx = document.getElementById("monthlyDivChart").getContext("2d");
    if (monthlyDivChartInstance) monthlyDivChartInstance.destroy();

    const labels = [];
    const data = [];
    for (let m = 1; m <= 12; m++) {
      labels.push(m + "月");
      data.push(Math.round(monthlyDiv[m]));
    }

    monthlyDivChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "配当金(円)",
          data,
          backgroundColor: "#4472c4",
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: "#b0b8c8" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { beginAtZero: true, ticks: { color: "#b0b8c8", callback: (v) => v.toLocaleString() }, grid: { color: "rgba(255,255,255,0.08)" } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.parsed.y.toLocaleString() + "円"
            }
          }
        }
      }
    });
  }

  function getStockSensitivity(stock) {
    // 個別設定を優先
    const override = stockTypes.find((st) => st.code === stock.code);
    if (override) return override.type;
    return industryTypes[stock.industry] || "景気敏感";
  }

  function renderCompositionBar(valMap, validStocks) {
    const bar = document.getElementById("compositionBar");
    bar.innerHTML = "";

    if (validStocks.length === 0) {
      bar.innerHTML = '<div class="bar-empty">データなし</div>';
      document.getElementById("defensePct").textContent = "0";
      document.getElementById("cyclicalPct").textContent = "0";
      return;
    }

    const totalVal = validStocks.reduce((sum, s) => sum + (s.currentPrice || 0) * s.shares, 0);
    if (totalVal === 0) {
      bar.innerHTML = '<div class="bar-empty">データなし</div>';
      return;
    }

    // 銘柄ごとの評価額を計算して構成比バーを描画
    const items = validStocks.map((s) => ({
      name: s.name || s.code,
      val: (s.currentPrice || 0) * s.shares,
      type: getStockSensitivity(s)
    })).sort((a, b) => {
      if (a.type === b.type) return b.val - a.val;
      return a.type === "ディフェンシブ" ? -1 : 1;
    });

    let defenseTotal = 0;
    let cyclicalTotal = 0;

    items.forEach((item) => {
      if (item.type === "ディフェンシブ") defenseTotal += item.val;
      else cyclicalTotal += item.val;
    });

    const defPct = ((defenseTotal / totalVal) * 100).toFixed(1);
    const cycPct = ((cyclicalTotal / totalVal) * 100).toFixed(1);
    document.getElementById("defensePct").textContent = defPct;
    document.getElementById("cyclicalPct").textContent = cycPct;

    items.forEach((item) => {
      const pct = (item.val / totalVal) * 100;
      const seg = document.createElement("div");
      seg.className = "bar-segment";
      seg.style.width = pct + "%";
      seg.style.backgroundColor = item.type === "ディフェンシブ" ? "var(--defense-color)" : "var(--cyclical-color)";
      if (pct > 3) seg.textContent = item.name;
      seg.innerHTML += `<span class="seg-tooltip">${item.name}: ${formatNum(item.val)}円 (${pct.toFixed(1)}%)</span>`;
      bar.appendChild(seg);
    });
  }

  function renderTop20(validStocks, totalDiv) {
    const tbody = document.querySelector("#top20Table tbody");
    const filterVal = document.getElementById("industryFilter").value;

    let filtered = validStocks.map((s) => ({
      code: s.code,
      name: s.name,
      industry: s.industry,
      dividend: (s.divPerShare || 0) * s.shares
    }));

    if (filterVal !== "all") {
      filtered = filtered.filter((s) => s.industry === filterVal);
    }

    filtered.sort((a, b) => b.dividend - a.dividend);
    const top20 = filtered.slice(0, 20);

    if (top20.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">銘柄を入力してください</td></tr>';
      return;
    }

    tbody.innerHTML = top20.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.code}</td>
        <td>${s.name}</td>
        <td>${s.industry}</td>
        <td class="num">${formatNum(s.dividend)}</td>
      </tr>
    `).join("");
  }

  function renderHoldingsTable(validStocks, totalVal, totalDiv) {
    const tbody = document.querySelector("#holdingsTable tbody");

    if (validStocks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="16" class="empty-msg">銘柄を入力してください</td></tr>';
      return;
    }

    const rows = validStocks.map((s) => {
      const purchase = (s.purchasePrice || 0) * s.shares;
      const valuation = (s.currentPrice || 0) * s.shares;
      const pl = valuation - purchase;
      const plPct = purchase > 0 ? (pl / purchase) * 100 : 0;
      const dividend = (s.divPerShare || 0) * s.shares;
      const valPct = totalVal > 0 ? (valuation / totalVal) * 100 : 0;
      const divPct = totalDiv > 0 ? (dividend / totalDiv) * 100 : 0;
      const yieldAcq = purchase > 0 ? (dividend / purchase) * 100 : 0;
      const yieldCur = valuation > 0 ? (dividend / valuation) * 100 : 0;
      return { ...s, purchase, valuation, pl, plPct, dividend, valPct, divPct, yieldAcq, yieldCur };
    });

    rows.sort((a, b) => b.dividend - a.dividend);

    tbody.innerHTML = rows.map((s, i) => {
      const plClass = s.pl >= 0 ? "positive" : "negative";
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${s.code}</td>
          <td>${s.name}</td>
          <td>${s.industry}</td>
          <td class="num">${formatNum(s.shares)}</td>
          <td class="num">${formatNum(s.purchasePrice)}</td>
          <td class="num">${formatNum(s.purchase)}</td>
          <td class="num">${formatNum(s.currentPrice)}</td>
          <td class="num">${formatNum(s.valuation)}</td>
          <td class="num">${s.valPct.toFixed(2)}%</td>
          <td class="num ${plClass}">${s.pl >= 0 ? "+" : ""}${formatNum(s.pl)} (${s.pl >= 0 ? "+" : ""}${s.plPct.toFixed(2)}%)</td>
          <td class="num">${s.divPerShare || 0}</td>
          <td class="num">${formatNum(s.dividend)}</td>
          <td class="num">${s.divPct.toFixed(2)}%</td>
          <td class="num">${s.yieldAcq.toFixed(2)}%</td>
          <td class="num">${s.yieldCur.toFixed(2)}%</td>
        </tr>
      `;
    }).join("");
  }

  function updateIndustryFilter(validStocks) {
    const select = document.getElementById("industryFilter");
    const current = select.value;
    const industries = [...new Set(validStocks.map((s) => s.industry).filter(Boolean))].sort();
    select.innerHTML = '<option value="all">全業種</option>';
    industries.forEach((ind) => {
      const opt = document.createElement("option");
      opt.value = ind;
      opt.textContent = ind;
      if (ind === current) opt.selected = true;
      select.appendChild(opt);
    });
  }

  document.getElementById("industryFilter").addEventListener("change", () => {
    const valid = getValidStocks();
    const totalDiv = valid.reduce((sum, s) => sum + (s.divPerShare || 0) * s.shares, 0);
    renderTop20(valid, totalDiv);
  });

  // ----- エクスポート / インポート -----
  document.getElementById("exportBtn").addEventListener("click", () => {
    const exportData = {
      settings,
      industryTypes,
      stockTypes,
      stocks,
      nisaItems,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.settings) { settings = data.settings; saveData(STORAGE_KEYS.settings, settings); }
        if (data.industryTypes) { industryTypes = data.industryTypes; saveData(STORAGE_KEYS.industryTypes, industryTypes); }
        if (data.stockTypes) { stockTypes = data.stockTypes; saveData(STORAGE_KEYS.stockTypes, stockTypes); }
        if (data.stocks) { stocks = data.stocks; saveData(STORAGE_KEYS.stocks, stocks); }
        if (data.nisaItems) { nisaItems = data.nisaItems; saveData(STORAGE_KEYS.nisa, nisaItems); }
        // UIを再描画
        initSettings();
        renderEntryTable();
        renderNisaTable();
        alert("データを読み込みました。");
      } catch {
        alert("ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ----- ポートフォリオ概要ページ -----
  let pfSectorChartInstance = null;

  function buildAllHoldings() {
    const holdings = [];
    PORTFOLIO_TOKUTEI.forEach(s => {
      holdings.push({
        code: s.code, name: s.name, industry: s.industry,
        shares: s.shares, purchasePrice: s.purchasePrice, currentPrice: s.currentPrice,
        costTotal: s.purchasePrice * s.shares,
        evalTotal: s.currentPrice * s.shares,
        pl: (s.currentPrice - s.purchasePrice) * s.shares,
        plPct: ((s.currentPrice - s.purchasePrice) / s.purchasePrice) * 100,
        account: "特定"
      });
    });
    PORTFOLIO_NISA_GROWTH.forEach(s => {
      holdings.push({
        code: s.code, name: s.name, industry: s.industry,
        shares: s.shares, purchasePrice: s.purchasePrice, currentPrice: s.currentPrice,
        costTotal: s.purchasePrice * s.shares,
        evalTotal: s.currentPrice * s.shares,
        pl: (s.currentPrice - s.purchasePrice) * s.shares,
        plPct: ((s.currentPrice - s.purchasePrice) / s.purchasePrice) * 100,
        account: "NISA成長"
      });
    });
    PORTFOLIO_NISA_TSUMITATE.forEach(f => {
      holdings.push({
        code: "-", name: f.name, industry: "投資信託",
        shares: f.units, purchasePrice: f.purchasePrice, currentPrice: f.nav,
        costTotal: f.costTotal, evalTotal: f.evalTotal,
        pl: f.pl, plPct: (f.pl / f.costTotal) * 100,
        account: "NISAつみたて"
      });
    });
    return holdings;
  }

  function pfFormatNum(n) {
    if (n == null || isNaN(n)) return "0";
    return Math.round(n).toLocaleString("ja-JP");
  }

  function pfFormatPrice(n) {
    if (n == null || isNaN(n)) return "0";
    if (n % 1 !== 0) return n.toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return n.toLocaleString("ja-JP");
  }

  function accountBadge(account) {
    if (account === "特定") return '<span class="pf-badge pf-badge-tokutei">特定</span>';
    if (account === "NISA成長") return '<span class="pf-badge pf-badge-nisa">NISA成長</span>';
    return '<span class="pf-badge pf-badge-tsumitate">つみたて</span>';
  }

  function renderPortfolioOverview() {
    const all = buildAllHoldings();
    const totalEval = all.reduce((s, h) => s + h.evalTotal, 0);
    const totalCost = all.reduce((s, h) => s + h.costTotal, 0);
    const totalPL = totalEval - totalCost;
    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    // Unique stock count (by code, excluding "-")
    const uniqueCodes = new Set(all.filter(h => h.code !== "-").map(h => h.code));

    // Summary cards
    document.getElementById("pfTotalAssets").innerHTML = pfFormatNum(totalEval) + '<span class="unit">円</span>';
    const plEl = document.getElementById("pfTotalPL");
    const plSign = totalPL >= 0 ? "+" : "";
    plEl.innerHTML = plSign + pfFormatNum(totalPL) + '<span class="unit">円</span>';
    plEl.className = "big-number " + (totalPL >= 0 ? "positive" : "negative");
    document.getElementById("pfTotalPLPct").textContent = "(" + plSign + totalPLPct.toFixed(2) + "%)";
    document.getElementById("pfTotalPLPct").className = "pf-sub " + (totalPL >= 0 ? "positive" : "negative");
    document.getElementById("pfTotalCost").innerHTML = pfFormatNum(totalCost) + '<span class="unit">円</span>';
    document.getElementById("pfStockCount").innerHTML = uniqueCodes.size + '<span class="unit">銘柄</span>';
    document.getElementById("pfStockCountSub").textContent = "(" + all.length + "エントリ / 3口座)";

    // Account breakdown
    renderAccountTable(all, totalEval);

    // Sector breakdown
    renderSectorAnalysis(all, totalEval);

    // Holdings table
    renderPfHoldings(all, totalEval);

    // Loss table
    renderLossTable(all);

    // Analysis
    renderAnalysis(all, totalEval);
  }

  function renderAccountTable(all, totalEval) {
    const accounts = [
      { label: "特定預り", key: "特定" },
      { label: "NISA成長投資枠", key: "NISA成長" },
      { label: "NISAつみたて投資枠", key: "NISAつみたて" }
    ];
    const tbody = document.querySelector("#pfAccountTable tbody");
    const tfoot = document.querySelector("#pfAccountTable tfoot");
    let totalCostAll = 0, totalEvalAll = 0, totalCount = 0;

    tbody.innerHTML = accounts.map(a => {
      const items = all.filter(h => h.account === a.key);
      const cost = items.reduce((s, h) => s + h.costTotal, 0);
      const ev = items.reduce((s, h) => s + h.evalTotal, 0);
      const pl = ev - cost;
      const pct = totalEval > 0 ? (ev / totalEval) * 100 : 0;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;
      totalCostAll += cost;
      totalEvalAll += ev;
      totalCount += items.length;
      const plClass = pl >= 0 ? "positive" : "negative";
      const plSign = pl >= 0 ? "+" : "";
      return `<tr>
        <td>${a.label}</td>
        <td class="num">${items.length}</td>
        <td class="num">${pfFormatNum(cost)}円</td>
        <td class="num">${pfFormatNum(ev)}円</td>
        <td class="num">${pct.toFixed(1)}%</td>
        <td class="num ${plClass}">${plSign}${pfFormatNum(pl)}円</td>
        <td class="num ${plClass}">${plSign}${plPct.toFixed(2)}%</td>
      </tr>`;
    }).join("");

    const totalPLAll = totalEvalAll - totalCostAll;
    const totalPLPctAll = totalCostAll > 0 ? (totalPLAll / totalCostAll) * 100 : 0;
    const plClassAll = totalPLAll >= 0 ? "positive" : "negative";
    const plSignAll = totalPLAll >= 0 ? "+" : "";
    tfoot.innerHTML = `<tr>
      <td>合計</td>
      <td class="num">${totalCount}</td>
      <td class="num">${pfFormatNum(totalCostAll)}円</td>
      <td class="num">${pfFormatNum(totalEvalAll)}円</td>
      <td class="num">100.0%</td>
      <td class="num ${plClassAll}">${plSignAll}${pfFormatNum(totalPLAll)}円</td>
      <td class="num ${plClassAll}">${plSignAll}${totalPLPctAll.toFixed(2)}%</td>
    </tr>`;
  }

  function renderSectorAnalysis(all, totalEval) {
    // Merge by sector
    const sectorMap = {};
    all.forEach(h => {
      const sec = h.industry || "その他";
      if (!sectorMap[sec]) sectorMap[sec] = { eval: 0, cost: 0, codes: new Set() };
      sectorMap[sec].eval += h.evalTotal;
      sectorMap[sec].cost += h.costTotal;
      sectorMap[sec].codes.add(h.code);
    });

    const sectors = Object.entries(sectorMap)
      .map(([name, d]) => ({
        name,
        eval: d.eval,
        cost: d.cost,
        pl: d.eval - d.cost,
        count: d.codes.size,
        pct: totalEval > 0 ? (d.eval / totalEval) * 100 : 0
      }))
      .sort((a, b) => b.eval - a.eval);

    // Table
    const tbody = document.querySelector("#pfSectorTable tbody");
    tbody.innerHTML = sectors.map(s => {
      const plClass = s.pl >= 0 ? "positive" : "negative";
      const plSign = s.pl >= 0 ? "+" : "";
      return `<tr>
        <td>${s.name}</td>
        <td class="num">${s.count}</td>
        <td class="num">${pfFormatNum(s.eval)}円</td>
        <td class="num">${s.pct.toFixed(1)}%</td>
        <td class="num ${plClass}">${plSign}${pfFormatNum(s.pl)}円</td>
      </tr>`;
    }).join("");

    // Chart
    const ctx = document.getElementById("pfSectorChart").getContext("2d");
    if (pfSectorChartInstance) pfSectorChartInstance.destroy();
    pfSectorChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: sectors.map(s => s.name),
        datasets: [{
          data: sectors.map(s => s.eval),
          backgroundColor: CHART_COLORS.slice(0, sectors.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#b0b8c8", font: { size: 11 }, padding: 6 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = totalEval > 0 ? ((ctx.parsed / totalEval) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${pfFormatNum(ctx.parsed)}円 (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Update sector filter
    const filter = document.getElementById("pfSectorFilter");
    const current = filter.value;
    filter.innerHTML = '<option value="all">全セクター</option>';
    sectors.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name + " (" + s.count + ")";
      if (s.name === current) opt.selected = true;
      filter.appendChild(opt);
    });
  }

  function renderPfHoldings(all, totalEval) {
    const sectorFilter = document.getElementById("pfSectorFilter").value;
    const accountFilter = document.getElementById("pfAccountFilter").value;
    const sortField = document.getElementById("pfSortField").value;

    let filtered = all.slice();
    if (sectorFilter !== "all") filtered = filtered.filter(h => h.industry === sectorFilter);
    if (accountFilter !== "all") filtered = filtered.filter(h => h.account === accountFilter);

    // Sort
    if (sortField === "evalTotal") filtered.sort((a, b) => b.evalTotal - a.evalTotal);
    else if (sortField === "pl") filtered.sort((a, b) => b.pl - a.pl);
    else if (sortField === "plPct") filtered.sort((a, b) => b.plPct - a.plPct);
    else if (sortField === "sector") filtered.sort((a, b) => a.industry.localeCompare(b.industry) || b.evalTotal - a.evalTotal);
    else if (sortField === "code") filtered.sort((a, b) => a.code.localeCompare(b.code));

    const tbody = document.querySelector("#pfHoldingsTable tbody");
    tbody.innerHTML = filtered.map(h => {
      const pct = totalEval > 0 ? (h.evalTotal / totalEval) * 100 : 0;
      const plClass = h.pl >= 0 ? "positive" : "negative";
      const plSign = h.pl >= 0 ? "+" : "";
      return `<tr>
        <td>${h.code}</td>
        <td>${h.name}</td>
        <td>${h.industry}</td>
        <td>${accountBadge(h.account)}</td>
        <td class="num">${pfFormatNum(h.shares)}</td>
        <td class="num">${pfFormatPrice(h.purchasePrice)}</td>
        <td class="num">${pfFormatPrice(h.currentPrice)}</td>
        <td class="num">${pfFormatNum(h.evalTotal)}円</td>
        <td class="num">${pct.toFixed(2)}%</td>
        <td class="num ${plClass}">${plSign}${pfFormatNum(h.pl)}円</td>
        <td class="num ${plClass}">${plSign}${h.plPct.toFixed(1)}%</td>
      </tr>`;
    }).join("");
  }

  function renderLossTable(all) {
    const losses = all.filter(h => h.pl < 0).sort((a, b) => a.pl - b.pl);
    const tbody = document.querySelector("#pfLossTable tbody");
    if (losses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">含み損銘柄なし</td></tr>';
      return;
    }
    tbody.innerHTML = losses.map(h => {
      return `<tr>
        <td>${h.code}</td>
        <td>${h.name}</td>
        <td>${accountBadge(h.account)}</td>
        <td class="num">${pfFormatNum(h.evalTotal)}円</td>
        <td class="num negative">${pfFormatNum(h.pl)}円</td>
        <td class="num negative">${h.plPct.toFixed(1)}%</td>
      </tr>`;
    }).join("");
  }

  function renderAnalysis(all, totalEval) {
    const container = document.getElementById("pfAnalysis");

    // Sector concentration
    const sectorMap = {};
    all.forEach(h => {
      const sec = h.industry || "その他";
      sectorMap[sec] = (sectorMap[sec] || 0) + h.evalTotal;
    });
    const sectorPcts = Object.entries(sectorMap).map(([k, v]) => ({ name: k, pct: (v / totalEval) * 100 })).sort((a, b) => b.pct - a.pct);
    const topConcentrated = sectorPcts.filter(s => s.pct >= 8);

    // Missing sectors
    const presentSectors = new Set(all.map(h => h.industry));
    const majorMissing = [];
    if (!presentSectors.has("医薬品") || sectorMap["医薬品"] / totalEval < 0.03) majorMissing.push("医薬品（ヘルスケア）の比率が低い");
    if (!presentSectors.has("小売業")) majorMissing.push("小売業セクターが未保有");
    if (!presentSectors.has("精密機器")) majorMissing.push("精密機器セクターが未保有");
    if (!presentSectors.has("輸送用機器")) majorMissing.push("輸送用機器（自動車）セクターが未保有");
    if (!presentSectors.has("海運業")) majorMissing.push("海運業セクターが未保有");
    if (!presentSectors.has("空運業")) majorMissing.push("空運業セクターが未保有");
    if (!presentSectors.has("非鉄金属")) majorMissing.push("非鉄金属セクターが未保有");
    if (!presentSectors.has("鉱業")) majorMissing.push("鉱業セクターが未保有");

    // International exposure
    const tsumitateEval = PORTFOLIO_NISA_TSUMITATE.reduce((s, f) => s + f.evalTotal, 0);
    const intlPct = (tsumitateEval / totalEval) * 100;

    // Single stock concentration
    const stockMap = {};
    all.forEach(h => {
      const key = h.code + "_" + h.name;
      stockMap[key] = (stockMap[key] || 0) + h.evalTotal;
    });
    const topStocks = Object.entries(stockMap)
      .map(([k, v]) => ({ name: k.split("_")[1], pct: (v / totalEval) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    // Financial sector heavy
    const financeSectors = ["銀行業", "保険業", "その他金融業"];
    const financeTotal = financeSectors.reduce((s, sec) => s + (sectorMap[sec] || 0), 0);
    const financePct = (financeTotal / totalEval) * 100;

    container.innerHTML = `
      <div class="pf-card pf-card-warn">
        <h4>集中リスク（セクター）</h4>
        <ul>
          ${topConcentrated.map(s => `<li>${s.name}: ${s.pct.toFixed(1)}%</li>`).join("")}
          <li>金融セクター合計（銀行+保険+その他金融）: ${financePct.toFixed(1)}%</li>
        </ul>
      </div>
      <div class="pf-card pf-card-warn">
        <h4>個別銘柄集中 Top5</h4>
        <ul>
          ${topStocks.map(s => `<li>${s.name}: ${s.pct.toFixed(1)}%</li>`).join("")}
        </ul>
      </div>
      <div class="pf-card pf-card-info">
        <h4>不足しているセクター・資産</h4>
        <ul>
          ${majorMissing.map(m => `<li>${m}</li>`).join("")}
          <li>海外資産比率が極めて低い（${intlPct.toFixed(2)}%）。S&P500のつみたて額を増やすか、先進国株式・新興国株式ファンドの追加を検討</li>
          <li>債券（国内債・外国債）への配分がゼロ。年齢やリスク許容度に応じて検討</li>
          <li>REITは保有あるが比率が低め。分散目的なら追加検討</li>
          <li>半導体・AI関連（東京エレクトロン、レーザーテック等）のテクノロジー成長株が不在</li>
        </ul>
      </div>
      <div class="pf-card pf-card-good">
        <h4>ポートフォリオの強み</h4>
        <ul>
          <li>80銘柄と幅広く分散。個別銘柄リスクは比較的低い</li>
          <li>総合商社5社（伊藤忠・丸紅・三井物産・住友商・三菱商事）を全て保有</li>
          <li>メガバンク3行+保険3社で金融セクターを厚く確保</li>
          <li>含み益率 +45.7% と良好なパフォーマンス</li>
          <li>通信セクター（NTT・KDDI・沖縄セルラー）でディフェンシブ配当を確保</li>
          <li>NISA枠を活用して成長投資枠・つみたて投資枠の両方を利用中</li>
        </ul>
      </div>
    `;
  }

  // Portfolio filter/sort event listeners
  ["pfSectorFilter", "pfAccountFilter", "pfSortField"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      const all = buildAllHoldings();
      const totalEval = all.reduce((s, h) => s + h.evalTotal, 0);
      renderPfHoldings(all, totalEval);
    });
  });

  // ----- 初期データ自動読み込み -----
  if (stocks.length === 0) {
    // Merge TOKUTEI + NISA-only stocks into stocks array for other pages
    const allCodes = new Set(PORTFOLIO_TOKUTEI.map(s => s.code));
    const combined = [...PORTFOLIO_TOKUTEI];
    PORTFOLIO_NISA_GROWTH.forEach(s => {
      if (!allCodes.has(s.code)) {
        combined.push(s);
        allCodes.add(s.code);
      }
    });
    stocks = combined.map(s => ({
      code: s.code, name: s.name, industry: s.industry,
      shares: s.shares, purchasePrice: s.purchasePrice,
      currentPrice: s.currentPrice, divPerShare: null, divMonths: ""
    }));
    saveData(STORAGE_KEYS.stocks, stocks);
  }

  if (nisaItems.length === 0) {
    nisaItems = PORTFOLIO_NISA_GROWTH.map(s => ({ code: s.code, shares: s.shares }));
    saveData(STORAGE_KEYS.nisa, nisaItems);
  }

  // ----- 初期化 -----
  initSettings();
  renderEntryTable();
  renderNisaTable();
  renderPortfolioOverview();
})();
