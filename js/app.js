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
  let funds = loadData(STORAGE_KEYS.funds, []);

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

  // ----- 投資信託ページ -----
  function renderFundTable() {
    const tbody = document.getElementById("fundBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    funds.forEach((f, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="fund-check" data-idx="${i}"></td>
        <td><input type="text" value="${escapeHtml(f.name || '')}" data-field="name" data-idx="${i}" style="width:200px"></td>
        <td><input type="number" value="${f.units || ''}" data-field="units" data-idx="${i}" style="width:100px" min="0"></td>
        <td><input type="number" value="${f.purchasePrice || ''}" data-field="purchasePrice" data-idx="${i}" style="width:80px" min="0" step="0.01"></td>
        <td><input type="number" value="${f.currentPrice || ''}" data-field="currentPrice" data-idx="${i}" style="width:80px" min="0" step="0.01"></td>
        <td><input type="number" value="${f.distPerUnit || ''}" data-field="distPerUnit" data-idx="${i}" style="width:100px" min="0" step="0.01"></td>
        <td><input type="text" value="${f.distMonths || ''}" data-field="distMonths" data-idx="${i}" style="width:100px" placeholder="1,2,3,...12"></td>
        <td><select data-field="account" data-idx="${i}">
          <option value="特定" ${f.account === "特定" ? "selected" : ""}>特定</option>
          <option value="NISA" ${f.account === "NISA" ? "selected" : ""}>NISA</option>
        </select></td>
      `;
      tr.querySelectorAll("input, select").forEach((el) => {
        if (el.type === "checkbox") return;
        el.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const field = e.target.dataset.field;
          let val = e.target.value;
          if (["units", "purchasePrice", "currentPrice", "distPerUnit"].includes(field)) {
            val = val === "" ? null : parseFloat(val);
          }
          funds[idx][field] = val;
          saveData(STORAGE_KEYS.funds, funds);
        });
      });
      tbody.appendChild(tr);
    });
  }

  document.getElementById("addFundBtn").addEventListener("click", () => {
    funds.push({ name: "", units: null, purchasePrice: null, currentPrice: null, distPerUnit: null, distMonths: "", account: "特定" });
    saveData(STORAGE_KEYS.funds, funds);
    renderFundTable();
  });

  document.getElementById("deleteFundSelectedBtn").addEventListener("click", () => {
    const checked = document.querySelectorAll("#fundBody .fund-check:checked");
    const indices = Array.from(checked).map((c) => parseInt(c.dataset.idx)).sort((a, b) => b - a);
    indices.forEach((i) => funds.splice(i, 1));
    saveData(STORAGE_KEYS.funds, funds);
    renderFundTable();
  });

  document.getElementById("fundSelectAll").addEventListener("change", (e) => {
    document.querySelectorAll("#fundBody .fund-check").forEach((c) => {
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

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function(c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
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

    // 投資信託の分配金を加算
    let totalFundDist = 0;
    let totalFundDistAfterTax = 0;
    let totalFundValuation = 0;
    let totalFundPurchase = 0;
    const TAX_RATE = 0.20315;
    funds.forEach((f) => {
      if (!f.units || !f.distPerUnit) return;
      const dist = (f.distPerUnit / 10000) * f.units; // 万口あたり→実際の分配金
      totalFundDist += dist;
      if (f.account === "NISA") {
        totalFundDistAfterTax += dist;
      } else {
        totalFundDistAfterTax += dist * (1 - TAX_RATE);
      }
      if (f.currentPrice && f.units) totalFundValuation += (f.currentPrice / 10000) * f.units;
      if (f.purchasePrice && f.units) totalFundPurchase += (f.purchasePrice / 10000) * f.units;

      // 月別配当に加算
      if (f.distMonths) {
        const fMonths = f.distMonths.split(",").map((m) => parseInt(m.trim())).filter((m) => m >= 1 && m <= 12);
        const perMonth = fMonths.length > 0 ? dist / fMonths.length : 0;
        fMonths.forEach((m) => { monthlyDiv[m] += perMonth; });
      }
    });

    totalDividend += totalFundDist;
    totalValuation += totalFundValuation;
    totalPurchase += totalFundPurchase;

    // 税引後配当金の計算（NISA分は非課税、特定口座は20.315%課税）
    let totalDivAfterTax = totalFundDistAfterTax;
    valid.forEach((s) => {
      const dividend = (s.divPerShare || 0) * s.shares;
      const nisaItem = nisaItems.find((n) => n.code === s.code);
      if (nisaItem && nisaItem.shares > 0) {
        const nisaShares = Math.min(nisaItem.shares, s.shares);
        const tokuteiShares = s.shares - nisaShares;
        const nisaDiv = (s.divPerShare || 0) * nisaShares;
        const tokuteiDiv = (s.divPerShare || 0) * tokuteiShares;
        totalDivAfterTax += nisaDiv + tokuteiDiv * (1 - TAX_RATE);
      } else {
        totalDivAfterTax += dividend * (1 - TAX_RATE);
      }
    });

    const totalPL = totalValuation - totalPurchase;
    const totalPLPct = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;
    const divYieldCost = totalPurchase > 0 ? (totalDividend / totalPurchase) * 100 : 0;
    const divYieldMarket = totalValuation > 0 ? (totalDividend / totalValuation) * 100 : 0;

    // サマリー更新
    document.getElementById("totalAssets").innerHTML = formatNum(totalValuation) + '<span class="unit">円</span>';
    document.getElementById("totalPurchase").textContent = formatNum(totalPurchase) + "円";
    const plEl = document.getElementById("totalPL");
    plEl.textContent = (totalPL >= 0 ? "+" : "") + formatNum(totalPL) + "円";
    plEl.className = totalPL >= 0 ? "positive" : "negative";
    const plPctEl = document.getElementById("totalPLPct");
    plPctEl.textContent = "(" + (totalPL >= 0 ? "+" : "") + totalPLPct.toFixed(2) + "%)";
    plPctEl.className = totalPL >= 0 ? "positive" : "negative";
    document.getElementById("divYield").innerHTML = divYieldMarket.toFixed(2) + '<span class="unit">%</span>';
    document.getElementById("divYieldYoc").innerHTML = divYieldCost.toFixed(2) + '<span class="unit">%</span>';
    document.getElementById("annualDiv").innerHTML = formatNum(totalDividend) + '<span class="unit">円</span>';
    document.getElementById("annualDivAfterTax").innerHTML = formatNum(totalDivAfterTax) + '<span class="unit">円</span>';
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
      seg.innerHTML += `<span class="seg-tooltip">${escapeHtml(item.name)}: ${formatNum(item.val)}円 (${pct.toFixed(1)}%)</span>`;
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
        <td>${escapeHtml(s.code)}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.industry)}</td>
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
          <td>${escapeHtml(s.code)}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.industry)}</td>
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

  // ----- CSV読込（SBI証券） -----
  document.getElementById("csvImportBtn").addEventListener("click", () => {
    document.getElementById("csvFile").click();
  });

  document.getElementById("updatePriceBtn").addEventListener("click", async () => {
    const btn = document.getElementById("updatePriceBtn");
    btn.textContent = "取得中...";
    btn.disabled = true;
    await updateStockPrices();
    btn.textContent = "株価を最新に更新";
    btn.disabled = false;
    showCsvMessage("株価を最新データに更新しました", false);
  });

  function showCsvMessage(text, isError) {
    const el = document.getElementById("csvMessage");
    el.style.display = "block";
    el.style.background = isError ? "rgba(229,57,53,0.2)" : "rgba(76,175,80,0.2)";
    el.style.border = isError ? "1px solid #e53935" : "1px solid #4caf50";
    el.style.color = isError ? "#ff8a80" : "#a5d6a7";
    el.textContent = text;
    setTimeout(() => { el.style.display = "none"; }, 5000);
  }

  function parseSbiCsv(text) {
    const lines = text.split(/\r?\n/);
    const allStocks = [];   // 全銘柄（特定+NISA合算用）
    const nisaList = [];    // NISA銘柄
    const fundList = [];    // 投資信託
    let currentSection = ""; // 現在のセクション

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();

      // セクション判定
      if (line.includes("特定預り")) {
        currentSection = "tokutei";
      } else if (line.includes("NISA預り") && line.includes("成長投資枠")) {
        currentSection = "nisa";
      } else if (line.includes("つみたて投資枠")) {
        currentSection = "tsumitate";
      } else if (line.includes("投資信託") && !line.includes("つみたて")) {
        currentSection = "fund";
      }

      // 投資信託ヘッダーを見つけたらパース
      if (line.includes("ファンド名") && currentSection !== "skip") {
        const fHeaders = line.split(",").map((h) => h.replace(/"/g, "").trim());
        const fCol = {};
        fHeaders.forEach((h, idx) => {
          if (h === "ファンド名") fCol.name = idx;
          else if (h.includes("保有口数")) fCol.units = idx;
          else if (h.includes("取得単価")) fCol.purchasePrice = idx;
          else if (h.includes("基準価額")) fCol.currentPrice = idx;
          else if (h.includes("分配金受取方法")) fCol.distMethod = idx;
        });

        i++;
        while (i < lines.length) {
          const dataLine = lines[i].trim();
          if (!dataLine || dataLine.includes("合計") || dataLine.includes("評価額")
              || dataLine.includes("投資信託") || dataLine.includes("株式")) {
            break;
          }
          const cols = dataLine.split(",").map((c) => c.replace(/"/g, "").trim());
          const fname = fCol.name != null ? (cols[fCol.name] || "") : "";
          if (!fname) { i++; continue; }

          const unitsStr = fCol.units != null ? cols[fCol.units] : "0";
          const funits = parseFloat(unitsStr.replace(/[口,+]/g, ""));
          const fpp = fCol.purchasePrice != null ? parseFloat(cols[fCol.purchasePrice].replace(/[,+]/g, "")) : null;
          const fcp = fCol.currentPrice != null ? parseFloat(cols[fCol.currentPrice].replace(/[,+]/g, "")) : null;
          const method = fCol.distMethod != null ? cols[fCol.distMethod] : "";

          // 再投資型はスキップ（分配金を出さないため）
          if (method.includes("再投資")) { i++; continue; }

          if (!isNaN(funits) && funits > 0) {
            fundList.push({
              name: fname,
              units: funits,
              purchasePrice: isNaN(fpp) ? null : fpp,
              currentPrice: isNaN(fcp) ? null : fcp,
              distPerUnit: null,
              distMonths: "",
              account: currentSection === "nisa" ? "NISA" : "特定"
            });
          }
          i++;
        }
        continue;
      }

      // 株式ヘッダー行を見つけたらデータを読む
      if (line.includes("銘柄コード") && line.includes("銘柄名称")) {
        const headers = line.split(",").map((h) => h.replace(/"/g, "").trim());
        const col = {};
        headers.forEach((h, idx) => {
          if (h === "銘柄コード") col.code = idx;
          else if (h === "銘柄名称") col.name = idx;
          else if (h === "保有株数") col.shares = idx;
          else if (h === "取得単価") col.purchasePrice = idx;
          else if (h === "現在値") col.currentPrice = idx;
        });

        i++;
        // データ行を読む
        while (i < lines.length) {
          const dataLine = lines[i].trim();
          if (!dataLine || dataLine.includes("合計") || dataLine.includes("評価額")
              || (dataLine.includes("株式") && dataLine.includes("預り"))
              || dataLine.includes("投資信託") || dataLine.includes("ファンド名")) {
            break;
          }

          const cols = dataLine.split(",").map((c) => c.replace(/"/g, "").trim());
          const code = col.code != null ? cols[col.code] : "";
          if (!code || !/^(\d{4}|[A-Z]{1,5})$/.test(code)) { i++; continue; }

          const name = col.name != null ? (cols[col.name] || "") : "";
          const shares = col.shares != null ? parseFloat(cols[col.shares].replace(/[,+]/g, "")) : 0;
          const purchasePrice = col.purchasePrice != null ? parseFloat(cols[col.purchasePrice].replace(/[,+]/g, "")) : null;
          const currentPrice = col.currentPrice != null ? parseFloat(cols[col.currentPrice].replace(/[,+]/g, "")) : null;

          if (!isNaN(shares) && shares > 0) {
            allStocks.push({
              code, name,
              shares,
              purchasePrice: isNaN(purchasePrice) ? null : purchasePrice,
              currentPrice: isNaN(currentPrice) ? null : currentPrice,
              section: currentSection
            });

            if (currentSection === "nisa") {
              nisaList.push({ code, shares });
            }
          }
          i++;
        }
        continue;
      }
      i++;
    }

    // 同一銘柄を合算（特定+NISAの合計保有数、取得単価は加重平均）
    const merged = {};
    allStocks.forEach((s) => {
      if (merged[s.code]) {
        const m = merged[s.code];
        const oldTotal = (m.purchasePrice || 0) * m.shares;
        const newTotal = (s.purchasePrice || 0) * s.shares;
        m.shares += s.shares;
        m.purchasePrice = m.shares > 0 ? (oldTotal + newTotal) / m.shares : null;
        if (s.currentPrice != null) m.currentPrice = s.currentPrice;
        if (s.name && !m.name) m.name = s.name;
      } else {
        const divData = STOCK_DIVIDEND_MAP[s.code];
        merged[s.code] = {
          code: s.code,
          name: s.name,
          industry: STOCK_INDUSTRY_MAP[s.code] || "",
          shares: s.shares,
          purchasePrice: s.purchasePrice,
          currentPrice: s.currentPrice,
          divPerShare: divData ? divData.div : null,
          divMonths: divData ? divData.months : ""
        };
      }
    });

    return {
      stocks: Object.values(merged),
      nisa: nisaList
    };
  }

  document.getElementById("csvFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = ev.target.result;
      const result = parseSbiCsv(text);
      if (result.stocks.length === 0) {
        // Shift_JISで再読込を試す
        const reader2 = new FileReader();
        reader2.onload = (ev2) => {
          const result2 = parseSbiCsv(ev2.target.result);
          if (result2.stocks.length === 0) {
            showCsvMessage("CSVから銘柄を読み取れませんでした。SBI証券の「保有証券」CSVか確認してください。", true);
            return;
          }
          mergeImportedStocks(result2);
        };
        reader2.readAsText(file, "Shift_JIS");
        return;
      }
      mergeImportedStocks(result);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  });

  function mergeImportedStocks(result) {
    let added = 0;
    let updated = 0;

    // 銘柄データの統合
    result.stocks.forEach((imp) => {
      const existing = stocks.find((s) => s.code === imp.code);
      if (existing) {
        existing.shares = imp.shares;
        if (imp.purchasePrice != null) existing.purchasePrice = imp.purchasePrice;
        if (imp.currentPrice != null) existing.currentPrice = imp.currentPrice;
        if (imp.name && !existing.name) existing.name = imp.name;
        if (!existing.industry && STOCK_INDUSTRY_MAP[imp.code]) existing.industry = STOCK_INDUSTRY_MAP[imp.code];
        updated++;
      } else {
        stocks.push(imp);
        added++;
      }
    });
    saveData(STORAGE_KEYS.stocks, stocks);
    renderEntryTable();

    // NISAデータの統合
    let nisaAdded = 0;
    result.nisa.forEach((n) => {
      const existing = nisaItems.find((ni) => ni.code === n.code);
      if (existing) {
        existing.shares = n.shares;
      } else {
        nisaItems.push(n);
        nisaAdded++;
      }
    });
    if (result.nisa.length > 0) {
      saveData(STORAGE_KEYS.nisa, nisaItems);
      renderNisaTable();
    }

    // 投資信託データの統合
    let fundAdded = 0;
    if (result.funds && result.funds.length > 0) {
      result.funds.forEach((f) => {
        const existing = funds.find((ef) => ef.name === f.name);
        if (existing) {
          existing.units = f.units;
          if (f.purchasePrice != null) existing.purchasePrice = f.purchasePrice;
          if (f.currentPrice != null) existing.currentPrice = f.currentPrice;
          if (f.account) existing.account = f.account;
        } else {
          funds.push(f);
          fundAdded++;
        }
      });
      saveData(STORAGE_KEYS.funds, funds);
      renderFundTable();
    }

    let msg = `CSV読込完了: ${added}件追加、${updated}件更新`;
    if (result.nisa.length > 0) msg += `、NISA ${result.nisa.length}件反映`;
    if (fundAdded > 0) msg += `、投資信託 ${fundAdded}件追加`;
    showCsvMessage(msg, false);
  }

  // ----- CSV読込（楽天証券） -----
  document.getElementById("csvImportRakutenBtn").addEventListener("click", () => {
    document.getElementById("csvFileRakuten").click();
  });

  // ダブルクォート対応CSVパーサー（カンマ入り数値を正しく処理）
  function parseCsvLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseRakutenCsv(text) {
    const lines = text.split(/\r?\n/);
    const allStocks = [];
    const nisaList = [];
    const fundList = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // ヘッダー行を探す（複数パターンに対応）
      if ((line.includes("銘柄") && (line.includes("数量") || line.includes("保有") || line.includes("口座") || line.includes("取得") || line.includes("評価")))
          || (line.includes("コード") && (line.includes("数量") || line.includes("取得")))
          || (line.includes("銘柄名") && line.includes("保有"))) {
        const headers = parseCsvLine(line);
        const col = {};
        headers.forEach((h, idx) => {
          if (h.includes("銘柄コード") || h === "コード" || h.includes("ティッカー") || h.includes("コード/ティッカー")) col.code = idx;
          else if ((h.includes("銘柄") || h.includes("ファンド")) && !h.includes("コード")) col.name = idx;
          else if (h.includes("保有数量") || h.includes("数量") || h.includes("保有株数") || h.includes("残高")) col.shares = idx;
          else if (h === "[単位]" && col.sharesUnit == null) col.sharesUnit = idx;
          else if (h.includes("平均取得") || h.includes("取得単価") || h.includes("買付単価") || h.includes("取得価格")) col.purchasePrice = idx;
          else if (h.includes("現在値") || h.includes("基準価額") || h.includes("時価")) col.currentPrice = idx;
          else if (h.includes("口座") || h.includes("預り区分")) col.account = idx;
        });

        // 銘柄列からコードを抽出する場合
        if (col.code == null && col.name != null) col.codeFromName = true;

        // ヘッダーの前の行からNISA/特定を判定
        let sectionForBlock = "tokutei";
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (lines[j] && lines[j].includes("NISA")) { sectionForBlock = "nisa"; break; }
        }

        i++;
        while (i < lines.length) {
          const dataLine = lines[i].trim();
          if (!dataLine) { i++; continue; }
          // 合計行ならスキップ
          if (dataLine.includes("合計")) { i++; continue; }
          // 新しいセクションヘッダーなら中断
          if (dataLine.includes("サマリー") || dataLine.includes("(サマリ")) break;
          // 新しいヘッダー行なら中断
          if ((dataLine.includes("銘柄") || dataLine.includes("コード")) && (dataLine.includes("数量") || dataLine.includes("取得"))) break;

          const cols = parseCsvLine(dataLine);

          let code = "";
          let name = "";
          if (col.code != null) {
            code = cols[col.code] || "";
          }
          if (col.name != null) {
            name = cols[col.name] || "";
          }
          // 「8591 オリックス」形式からコードを抽出
          if (!code && col.codeFromName && name) {
            const m = name.match(/^(\d{4})\s+/);
            if (m) { code = m[1]; name = name.replace(/^\d{4}\s+/, ""); }
          }

          code = code.replace(/\s/g, "");

          // 口座種別の判定（列があれば列から、なければセクションヘッダーから）
          let section = sectionForBlock;
          if (col.account != null) {
            const acct = cols[col.account] || "";
            if (acct.includes("NISA") || acct.includes("ニーサ")) section = "nisa";
            else if (acct.includes("特定")) section = "tokutei";
          }

          const sharesStr = col.shares != null ? cols[col.shares] : "0";
          const sharesClean = sharesStr.replace(/[口,+\s]/g, "");
          const sharesVal = parseFloat(sharesClean);
          const purchasePrice = col.purchasePrice != null ? parseFloat(cols[col.purchasePrice].replace(/[,+]/g, "")) : null;
          const currentPrice = col.currentPrice != null ? parseFloat(cols[col.currentPrice].replace(/[,+]/g, "")) : null;

          // [単位]列で株式/投資信託を判定
          const unitStr = col.sharesUnit != null ? (cols[col.sharesUnit] || "") : "";
          const isFund = unitStr.includes("口") || sharesStr.includes("口");

          if (code && /^(\d{4}|[A-Z]{1,5})$/.test(code) && !isFund) {
            if (!isNaN(sharesVal) && sharesVal > 0) {
              allStocks.push({ code, name, shares: sharesVal, purchasePrice, currentPrice, section });
              if (section === "nisa") nisaList.push({ code, shares: sharesVal });
            }
          } else if (name && !isNaN(sharesVal) && sharesVal > 0 && isFund) {
            // 「口」単位 → 投資信託として扱う
            fundList.push({
              name: name,
              units: sharesVal,
              purchasePrice: purchasePrice,
              currentPrice: currentPrice,
              distPerUnit: null,
              distMonths: "",
              account: section === "nisa" ? "NISA" : "特定"
            });
          }
          i++;
        }
        continue;
      }
      i++;
    }

    // 同一銘柄を合算
    const merged = {};
    allStocks.forEach((s) => {
      if (merged[s.code]) {
        const m = merged[s.code];
        const oldTotal = (m.purchasePrice || 0) * m.shares;
        const newTotal = (s.purchasePrice || 0) * s.shares;
        m.shares += s.shares;
        m.purchasePrice = m.shares > 0 ? (oldTotal + newTotal) / m.shares : null;
        if (s.currentPrice != null) m.currentPrice = s.currentPrice;
      } else {
        const divData = STOCK_DIVIDEND_MAP[s.code];
        merged[s.code] = {
          code: s.code, name: s.name,
          industry: STOCK_INDUSTRY_MAP[s.code] || "",
          shares: s.shares, purchasePrice: s.purchasePrice, currentPrice: s.currentPrice,
          divPerShare: divData ? divData.div : null,
          divMonths: divData ? divData.months : ""
        };
      }
    });
    return { stocks: Object.values(merged), nisa: nisaList, funds: fundList };
  }

  document.getElementById("csvFileRakuten").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = ev.target.result;
      const result = parseRakutenCsv(text);
      const hasData = result.stocks.length > 0 || (result.funds && result.funds.length > 0);
      if (!hasData) {
        const reader2 = new FileReader();
        reader2.onload = (ev2) => {
          const result2 = parseRakutenCsv(ev2.target.result);
          const hasData2 = result2.stocks.length > 0 || (result2.funds && result2.funds.length > 0);
          if (!hasData2) {
            showCsvMessage("CSVから銘柄を読み取れませんでした。楽天証券サイトの「保有商品一覧」→「CSVで保存」からダウンロードしたファイルをお使いください。Excelで開いて保存し直したファイルは使えません。", true);
            return;
          }
          mergeImportedStocks(result2);
        };
        reader2.readAsText(file, "Shift_JIS");
        return;
      }
      mergeImportedStocks(result);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  });

  // ----- エクスポート / インポート -----
  document.getElementById("exportBtn").addEventListener("click", () => {
    const exportData = {
      settings,
      industryTypes,
      stockTypes,
      stocks,
      nisaItems,
      funds,
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
        if (data.funds) { funds = data.funds; saveData(STORAGE_KEYS.funds, funds); }
        // UIを再描画
        initSettings();
        renderEntryTable();
        renderNisaTable();
        renderFundTable();
        alert("データを読み込みました。");
      } catch {
        alert("ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ----- 株価自動取得 -----
  async function fetchLatestPrices() {
    try {
      const resp = await fetch("https://stock-kabu3.com/api/stocks/index.json");
      if (!resp.ok) return null;
      const data = await resp.json();
      const priceMap = {};
      // data.stocks が配列の場合
      const items = data.stocks || (Array.isArray(data) ? data : []);
      items.forEach((item) => {
        if (!item.symbol || !item.price) return;
        // "7203.T" → "7203", "AAPL" → "AAPL"
        const code = item.symbol.replace(/\.T$/, "");
        priceMap[code] = item.price;
      });
      // オブジェクト形式の場合のフォールバック
      if (items.length === 0 && typeof data === "object") {
        Object.values(data).forEach((item) => {
          if (!item || !item.symbol || !item.price) return;
          const code = item.symbol.replace(/\.T$/, "");
          priceMap[code] = item.price;
        });
      }
      return Object.keys(priceMap).length > 0 ? priceMap : null;
    } catch (e) {
      console.log("株価取得スキップ:", e.message);
      return null;
    }
  }

  async function updateStockPrices() {
    const priceMap = await fetchLatestPrices();
    if (!priceMap) return;
    let updated = false;
    stocks.forEach((s) => {
      if (/^\d{4}$/.test(s.code) && priceMap[s.code]) {
        s.currentPrice = priceMap[s.code];
        updated = true;
      }
    });
    if (updated) {
      saveData(STORAGE_KEYS.stocks, stocks);
      const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      localStorage.setItem("lastPriceUpdate", now);
      updatePriceInfo();
      renderEntryTable();
      // ダッシュボードが表示中なら再描画
      const dashPage = document.getElementById("page-dashboard");
      if (dashPage && dashPage.classList.contains("active")) renderDashboard();
    }
  }

  function updatePriceInfo() {
    const el = document.getElementById("priceUpdateInfo");
    const last = localStorage.getItem("lastPriceUpdate");
    if (el) el.textContent = last ? "株価最終更新: " + last : "";
  }

  // ----- 初期化 -----
  // 業種・配当金が未設定の銘柄に自動補完
  let dataUpdated = false;
  stocks.forEach((s) => {
    if (STOCK_INDUSTRY_MAP[s.code] && !s.industry) {
      s.industry = STOCK_INDUSTRY_MAP[s.code];
      dataUpdated = true;
    }
    const divData = STOCK_DIVIDEND_MAP[s.code];
    if (divData) {
      if ((s.divPerShare == null || s.divPerShare === 0) && divData.div > 0) {
        s.divPerShare = divData.div;
        dataUpdated = true;
      }
      if (!s.divMonths && divData.months) {
        s.divMonths = divData.months;
        dataUpdated = true;
      }
    }
  });
  if (dataUpdated) saveData(STORAGE_KEYS.stocks, stocks);

  initSettings();
  renderEntryTable();
  renderNisaTable();
  renderFundTable();
  updatePriceInfo();

  // ----- ライト/ダークモード切替 -----
  const themeBtn = document.getElementById("themeToggle");
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    themeBtn.textContent = "ダークモードに切替";
  }
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    themeBtn.textContent = isLight ? "ダークモードに切替" : "ライトモードに切替";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  });

  // 株価を自動取得（バックグラウンド）
  if (stocks.length > 0) updateStockPrices();

  // ----- 自動アップデート -----
  const APP_VERSION = "2.8";
  async function checkForUpdates() {
    try {
      const resp = await fetch("version.json?t=" + Date.now());
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.version && data.version !== APP_VERSION) {
        location.reload();
      }
    } catch (e) { /* 無視 */ }
  }
  // 5分ごとに更新チェック
  setInterval(checkForUpdates, 5 * 60 * 1000);
})();
