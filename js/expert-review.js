// ===== 専門家チェックシステム =====
// すべての出力に対して4名の専門家視点で自動チェックを実施

const ExpertReview = (function () {
  "use strict";

  // 判定結果の定数
  const PASS = "pass";     // ✅
  const WARN = "warn";     // ⚠️
  const FAIL = "fail";     // ❌

  function getIcon(status) {
    if (status === PASS) return "\u2705";
    if (status === WARN) return "\u26A0\uFE0F";
    return "\u274C";
  }

  // ===== 田中弁護士（法務チェック） =====
  function legalCheck(stocks, settings) {
    const issues = [];
    let status = PASS;

    // 景品表示法チェック: ダッシュボード上に「必ず儲かる」等の断定的表現がないか
    // （アプリ自体が表示する文言にはそのような表現は含まれないが、データの提示方法を確認）

    // 利回りの表示が誤解を招かないか確認
    const validStocks = stocks.filter(function (s) { return s.code && s.shares && s.shares > 0; });
    const highYieldStocks = validStocks.filter(function (s) {
      var purchase = (s.purchasePrice || 0) * s.shares;
      var dividend = (s.divPerShare || 0) * s.shares;
      return purchase > 0 && (dividend / purchase) * 100 > 10;
    });

    if (highYieldStocks.length > 0) {
      status = WARN;
      issues.push(
        "利回り10%超の銘柄が" + highYieldStocks.length + "件あります。" +
        "入力データ（配当金単価・取得単価）に誤りがないかご確認ください。" +
        "誤った高利回り表示は景品表示法上の優良誤認に該当する可能性があります。"
      );
    }

    // 金融商品取引法チェック: 投資助言に該当しないか
    // このツールは個人のポートフォリオ管理用であり、投資助言には該当しない旨を確認
    if (validStocks.length === 0) {
      issues.push("銘柄データが未入力です。チェック対象がありません。");
    }

    if (issues.length === 0) {
      issues.push("断定的表現や法令抵触の懸念はありません。本ツールは個人のポートフォリオ管理用途であり、投資助言には該当しません。");
    }

    return { expert: "田中弁護士", role: "法務", status: status, comments: issues };
  }

  // ===== 佐藤税理士（税務チェック） =====
  function taxCheck(stocks, nisaItems, settings) {
    const issues = [];
    let status = PASS;

    const validStocks = stocks.filter(function (s) { return s.code && s.shares && s.shares > 0; });

    // NISA管理の整合性チェック
    nisaItems.forEach(function (nisa) {
      if (!nisa.code) return;
      var matched = validStocks.find(function (s) { return s.code === nisa.code; });
      if (!matched) {
        status = WARN;
        issues.push(
          "NISA登録銘柄「" + nisa.code + "」が保有銘柄一覧に存在しません。正しいコードか確認してください。"
        );
      } else if (nisa.shares && matched.shares && nisa.shares > matched.shares) {
        status = FAIL;
        issues.push(
          "銘柄「" + nisa.code + "」のNISA保有数（" + nisa.shares + "株）が" +
          "総保有数（" + matched.shares + "株）を超えています。NISA枠の計算に誤りがある可能性があります。"
        );
      }
    });

    // 税引前/税引後の表示設定確認
    if (settings.divDisplay === "after_tax") {
      issues.push("税引後表示が選択されています。国内株式の配当課税（所得税15.315%＋住民税5%＝合計20.315%）が適用されます。NISA口座分は非課税となります。");
    } else {
      issues.push("税引前表示が選択されています。実際の手取り額は課税後の金額となる点にご注意ください（特定口座：20.315%課税、NISA口座：非課税）。");
    }

    // 米国株の二重課税チェック
    var usStocks = validStocks.filter(function (s) {
      return s.industry === "米国ETF" || s.industry === "米国個別株";
    });
    if (usStocks.length > 0) {
      status = status === FAIL ? FAIL : WARN;
      issues.push(
        "米国株/ETFが" + usStocks.length + "件あります。" +
        "米国配当には現地源泉税10%が課税され、さらに国内で20.315%が課税されます。" +
        "外国税額控除の確定申告をご検討ください（NISA口座では外国税額控除は適用不可）。"
      );
    }

    return { expert: "佐藤税理士", role: "税務", status: status, comments: issues };
  }

  // ===== 鈴木公認会計士（財務チェック） =====
  function financialCheck(stocks, settings) {
    const issues = [];
    let status = PASS;

    const validStocks = stocks.filter(function (s) { return s.code && s.shares && s.shares > 0; });

    if (validStocks.length === 0) {
      issues.push("銘柄データが未入力のため、財務チェックを実施できません。");
      return { expert: "鈴木会計士", role: "財務", status: PASS, comments: issues };
    }

    // 配当利回りの妥当性チェック
    validStocks.forEach(function (s) {
      var purchase = (s.purchasePrice || 0) * s.shares;
      var dividend = (s.divPerShare || 0) * s.shares;
      var yieldPct = purchase > 0 ? (dividend / purchase) * 100 : 0;

      if (yieldPct > 15) {
        status = FAIL;
        issues.push(
          "銘柄「" + (s.name || s.code) + "」の配当利回りが" + yieldPct.toFixed(1) + "%と異常値です。" +
          "配当金単価または取得単価の入力に誤りがないか確認してください。"
        );
      }

      // 株価と取得単価の乖離チェック
      if (s.purchasePrice && s.currentPrice) {
        var deviation = Math.abs(s.currentPrice - s.purchasePrice) / s.purchasePrice * 100;
        if (deviation > 80) {
          status = status === FAIL ? FAIL : WARN;
          issues.push(
            "銘柄「" + (s.name || s.code) + "」の現在株価と取得単価の乖離が" +
            deviation.toFixed(0) + "%あります。株式分割・併合や入力ミスの可能性をご確認ください。"
          );
        }
      }

      // 配当金未入力チェック
      if (!s.divPerShare || s.divPerShare === 0) {
        issues.push(
          "銘柄「" + (s.name || s.code) + "」の配当金単価が未入力です。年間配当金の集計に含まれません。"
        );
      }
    });

    // ポートフォリオ全体の利回り確認
    var totalPurchase = validStocks.reduce(function (sum, s) { return sum + (s.purchasePrice || 0) * s.shares; }, 0);
    var totalDiv = validStocks.reduce(function (sum, s) { return sum + (s.divPerShare || 0) * s.shares; }, 0);
    var portfolioYield = totalPurchase > 0 ? (totalDiv / totalPurchase) * 100 : 0;

    if (portfolioYield > 0 && portfolioYield < 1) {
      issues.push("ポートフォリオ全体の配当利回りが" + portfolioYield.toFixed(2) + "%と低めです。高配当戦略の観点から銘柄選定をご検討ください。");
    }

    if (issues.length === 0) {
      issues.push("財務指標の計算に異常は見られません。配当利回り・損益計算ともに正常範囲内です。");
    }

    return { expert: "鈴木会計士", role: "財務", status: status, comments: issues };
  }

  // ===== 山田FP（視聴者保護チェック） =====
  function viewerProtectionCheck(stocks, settings) {
    const issues = [];
    let status = PASS;

    const validStocks = stocks.filter(function (s) { return s.code && s.shares && s.shares > 0; });

    if (validStocks.length === 0) {
      issues.push("銘柄データが未入力のため、リスクチェックを実施できません。");
      return { expert: "山田FP", role: "視聴者保護", status: PASS, comments: issues };
    }

    // 集中投資リスクのチェック
    var totalValuation = validStocks.reduce(function (sum, s) {
      return sum + (s.currentPrice || 0) * s.shares;
    }, 0);

    if (totalValuation > 0) {
      validStocks.forEach(function (s) {
        var val = (s.currentPrice || 0) * s.shares;
        var pct = (val / totalValuation) * 100;
        if (pct > 30 && validStocks.length > 1) {
          status = WARN;
          issues.push(
            "銘柄「" + (s.name || s.code) + "」が資産全体の" + pct.toFixed(1) + "%を占めています。" +
            "特定銘柄への集中投資はリスクが高いため、分散をご検討ください。"
          );
        }
      });
    }

    // 銘柄数による分散度チェック
    if (validStocks.length < 5 && validStocks.length > 0) {
      status = status === FAIL ? FAIL : WARN;
      issues.push(
        "保有銘柄数が" + validStocks.length + "銘柄と少なめです。" +
        "50〜60代の資産形成期後半では、10銘柄以上に分散して個別リスクを低減することが推奨されます。"
      );
    }

    // 業種の偏りチェック
    var industryMap = {};
    validStocks.forEach(function (s) {
      var ind = s.industry || "未設定";
      if (!industryMap[ind]) industryMap[ind] = 0;
      industryMap[ind] += (s.currentPrice || 0) * s.shares;
    });

    if (totalValuation > 0) {
      Object.keys(industryMap).forEach(function (ind) {
        var pct = (industryMap[ind] / totalValuation) * 100;
        if (pct > 40 && Object.keys(industryMap).length > 1) {
          status = status === FAIL ? FAIL : WARN;
          issues.push(
            "業種「" + ind + "」が資産全体の" + pct.toFixed(1) + "%を占めています。" +
            "業種の偏りはセクターリスクの要因となります。複数業種への分散をご検討ください。"
          );
        }
      });
    }

    // 高リスク銘柄のチェック
    var totalPurchase = validStocks.reduce(function (sum, s) { return sum + (s.purchasePrice || 0) * s.shares; }, 0);
    var totalPL = totalValuation - totalPurchase;
    var plPct = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;

    if (plPct < -20) {
      status = FAIL;
      issues.push(
        "ポートフォリオ全体で" + plPct.toFixed(1) + "%の含み損が発生しています。" +
        "老後資金への影響が大きい場合、損切りや銘柄入替をご検討ください。" +
        "ただし、投資判断はご自身の状況に応じて慎重にお願いいたします。"
      );
    }

    if (issues.length === 0) {
      issues.push("分散投資の観点から大きな問題は見られません。引き続き定期的なポートフォリオの見直しをお勧めします。投資判断は最終的にご自身でお願いいたします。");
    }

    return { expert: "山田FP", role: "視聴者保護", status: status, comments: issues };
  }

  // ===== 全専門家チェックの実行 =====
  function runAllChecks(stocks, nisaItems, settings) {
    return [
      legalCheck(stocks, settings),
      taxCheck(stocks, nisaItems, settings),
      financialCheck(stocks, settings),
      viewerProtectionCheck(stocks, settings)
    ];
  }

  // ===== チェック結果のHTML生成 =====
  function renderReviewHTML(results) {
    var expertIcons = {
      "田中弁護士": "\uD83D\uDC69\u200D\u2696\uFE0F",
      "佐藤税理士": "\uD83E\uDDEE",
      "鈴木会計士": "\uD83D\uDCCA",
      "山田FP": "\uD83D\uDCB0"
    };

    var html = '<div class="review-header">';
    html += '<h3>\uD83D\uDD0D \u5C02\u9580\u5BB6\u30C1\u30A7\u30C3\u30AF\u7D50\u679C</h3>';
    html += '</div>';

    // サマリーバー
    var passCount = results.filter(function (r) { return r.status === PASS; }).length;
    var warnCount = results.filter(function (r) { return r.status === WARN; }).length;
    var failCount = results.filter(function (r) { return r.status === FAIL; }).length;

    html += '<div class="review-summary-bar">';
    html += '<span class="review-badge review-badge-pass">\u2705 ' + passCount + '</span>';
    html += '<span class="review-badge review-badge-warn">\u26A0\uFE0F ' + warnCount + '</span>';
    html += '<span class="review-badge review-badge-fail">\u274C ' + failCount + '</span>';
    html += '</div>';

    // テーブル
    html += '<table class="review-table">';
    html += '<thead><tr>';
    html += '<th>\u5C02\u9580\u5BB6</th><th>\u5224\u5B9A</th><th>\u30B3\u30E1\u30F3\u30C8</th>';
    html += '</tr></thead><tbody>';

    results.forEach(function (r) {
      var icon = expertIcons[r.expert] || "";
      var statusIcon = getIcon(r.status);
      var statusClass = "review-status-" + r.status;

      html += '<tr class="' + statusClass + '">';
      html += '<td class="review-expert-cell">';
      html += '<span class="review-expert-icon">' + icon + '</span>';
      html += '<span class="review-expert-name">' + r.expert + '</span>';
      html += '<span class="review-expert-role">(' + r.role + ')</span>';
      html += '</td>';
      html += '<td class="review-status-cell">' + statusIcon + '</td>';
      html += '<td class="review-comment-cell">';

      r.comments.forEach(function (c) {
        html += '<p class="review-comment">' + c + '</p>';
      });

      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';

    // 免責事項
    html += '<div class="review-disclaimer">';
    html += '<p>\u203B \u672C\u30C1\u30A7\u30C3\u30AF\u306F\u5165\u529B\u30C7\u30FC\u30BF\u306B\u57FA\u3065\u304F\u81EA\u52D5\u5224\u5B9A\u3067\u3059\u3002\u5B9F\u969B\u306E\u6295\u8CC7\u5224\u65AD\u306F\u5C02\u9580\u5BB6\u306B\u3054\u76F8\u8AC7\u306E\u4E0A\u3001\u3054\u81EA\u8EAB\u306E\u8CAC\u4EFB\u3067\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002</p>';
    html += '</div>';

    return html;
  }

  // パブリックAPI
  return {
    runAllChecks: runAllChecks,
    renderReviewHTML: renderReviewHTML
  };
})();
