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

  // ----- 認証 -----
  const AUTH_KEY = 'portfolio_auth_hash';
  const AUTH_CONFIGURED_KEY = 'portfolio_auth_configured';
  const AUTH_SESSION_KEY = 'portfolio_authenticated';

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_portfolio_salt_v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function showLoginOverlay() {
    document.getElementById('loginOverlay').classList.remove('hidden');
  }

  function hideLoginOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('logoutBtn').style.display = '';
  }

  function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('setupForm').classList.add('hidden');
    setTimeout(() => document.getElementById('loginPassword').focus(), 50);
  }

  function showSetupForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('setupForm').classList.remove('hidden');
  }

  async function checkAuth() {
    const configured = localStorage.getItem(AUTH_CONFIGURED_KEY);
    const storedHash = localStorage.getItem(AUTH_KEY);

    if (!configured) {
      // First visit: show setup form
      showSetupForm();
      showLoginOverlay();
      return;
    }

    if (!storedHash) {
      // User chose no password: go straight to app
      hideLoginOverlay();
      return;
    }

    if (sessionStorage.getItem(AUTH_SESSION_KEY) === '1') {
      // Already authenticated this session
      hideLoginOverlay();
      return;
    }

    // Password is set and not yet authenticated
    showLoginForm();
    showLoginOverlay();
  }

  // Login button
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!password) {
      errorEl.textContent = 'パスワードを入力してください。';
      errorEl.classList.remove('hidden');
      return;
    }

    const hash = await hashPassword(password);
    const storedHash = localStorage.getItem(AUTH_KEY);

    if (hash === storedHash) {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
      errorEl.classList.add('hidden');
      document.getElementById('loginPassword').value = '';
      hideLoginOverlay();
    } else {
      errorEl.textContent = 'パスワードが違います。';
      errorEl.classList.remove('hidden');
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginPassword').focus();
    }
  });

  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });

  // Setup button
  document.getElementById('setupBtn').addEventListener('click', async () => {
    const password = document.getElementById('setupPassword').value;
    const confirm = document.getElementById('setupPasswordConfirm').value;
    const errorEl = document.getElementById('setupError');

    if (!password) {
      errorEl.textContent = 'パスワードを入力してください。';
      errorEl.classList.remove('hidden');
      return;
    }
    if (password.length < 4) {
      errorEl.textContent = 'パスワードは4文字以上で入力してください。';
      errorEl.classList.remove('hidden');
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'パスワードが一致しません。';
      errorEl.classList.remove('hidden');
      return;
    }

    const hash = await hashPassword(password);
    localStorage.setItem(AUTH_KEY, hash);
    localStorage.setItem(AUTH_CONFIGURED_KEY, 'true');
    sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    errorEl.classList.add('hidden');
    document.getElementById('setupPassword').value = '';
    document.getElementById('setupPasswordConfirm').value = '';
    hideLoginOverlay();
  });

  // Skip setup (no password)
  document.getElementById('skipSetupBtn').addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.setItem(AUTH_CONFIGURED_KEY, 'true');
    document.getElementById('setupPassword').value = '';
    document.getElementById('setupPasswordConfirm').value = '';
    document.getElementById('setupError').classList.add('hidden');
    hideLoginOverlay();
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('logoutBtn').style.display = 'none';
    showLoginForm();
    showLoginOverlay();
  });

  // Change password (in settings)
  document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const currentPw = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    const confirmPw = document.getElementById('newPasswordConfirm').value;
    const msgEl = document.getElementById('passwordChangeMsg');

    const storedHash = localStorage.getItem(AUTH_KEY);

    // Verify current password if one is set
    if (storedHash) {
      const currentHash = await hashPassword(currentPw);
      if (currentHash !== storedHash) {
        msgEl.textContent = '現在のパスワードが違います。';
        msgEl.style.color = 'var(--negative)';
        msgEl.classList.remove('hidden');
        return;
      }
    }

    // Remove password
    if (!newPw) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.setItem(AUTH_CONFIGURED_KEY, 'true');
      document.getElementById('logoutBtn').style.display = 'none';
      document.getElementById('currentPassword').value = '';
      msgEl.textContent = 'パスワードを削除しました。';
      msgEl.style.color = 'var(--positive)';
      msgEl.classList.remove('hidden');
      return;
    }

    if (newPw.length < 4) {
      msgEl.textContent = '新しいパスワードは4文字以上で入力してください。';
      msgEl.style.color = 'var(--negative)';
      msgEl.classList.remove('hidden');
      return;
    }

    if (newPw !== confirmPw) {
      msgEl.textContent = 'パスワードが一致しません。';
      msgEl.style.color = 'var(--negative)';
      msgEl.classList.remove('hidden');
      return;
    }

    const newHash = await hashPassword(newPw);
    localStorage.setItem(AUTH_KEY, newHash);
    localStorage.setItem(AUTH_CONFIGURED_KEY, 'true');
    sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newPasswordConfirm').value = '';
    msgEl.textContent = 'パスワードを変更しました。';
    msgEl.style.color = 'var(--positive)';
    msgEl.classList.remove('hidden');
    document.getElementById('logoutBtn').style.display = '';
  });

  // ----- 初期化 -----
  initSettings();
  renderEntryTable();
  renderNisaTable();
  checkAuth();
})();
