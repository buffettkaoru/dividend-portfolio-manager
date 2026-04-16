// ===== 業種マスタデータ =====
const INDUSTRIES = [
  "水産・農林業",
  "建設業",
  "不動産業",
  "非鉄金属",
  "鉱業",
  "サービス業",
  "機械",
  "金属製品",
  "情報・通信業",
  "食料品",
  "医薬品",
  "陸運業",
  "その他金融業",
  "小売業",
  "卸売業",
  "化学",
  "繊維製品",
  "電気機器",
  "ガラス・土石製品",
  "証券、商品先物取引業",
  "輸送用機器",
  "石油・石炭製品",
  "パルプ・紙",
  "精密機器",
  "ゴム製品",
  "鉄鋼",
  "銀行業",
  "保険業",
  "その他製品",
  "倉庫・運輸関連業",
  "海運業",
  "空運業",
  "電気・ガス業",
  "ETF・他",
  "米国ETF",
  "米国個別株"
];

// デフォルトの業種別 景気感応度
const DEFAULT_INDUSTRY_TYPES = {
  "水産・農林業": "ディフェンシブ",
  "建設業": "景気敏感",
  "不動産業": "景気敏感",
  "非鉄金属": "景気敏感",
  "鉱業": "景気敏感",
  "サービス業": "ディフェンシブ",
  "機械": "景気敏感",
  "金属製品": "ディフェンシブ",
  "情報・通信業": "ディフェンシブ",
  "食料品": "ディフェンシブ",
  "医薬品": "ディフェンシブ",
  "陸運業": "ディフェンシブ",
  "その他金融業": "景気敏感",
  "小売業": "景気敏感",
  "卸売業": "景気敏感",
  "化学": "景気敏感",
  "繊維製品": "景気敏感",
  "電気機器": "ディフェンシブ",
  "ガラス・土石製品": "景気敏感",
  "証券、商品先物取引業": "景気敏感",
  "輸送用機器": "ディフェンシブ",
  "石油・石炭製品": "景気敏感",
  "パルプ・紙": "景気敏感",
  "精密機器": "景気敏感",
  "ゴム製品": "景気敏感",
  "鉄鋼": "景気敏感",
  "銀行業": "景気敏感",
  "保険業": "景気敏感",
  "その他製品": "ディフェンシブ",
  "倉庫・運輸関連業": "ディフェンシブ",
  "海運業": "景気敏感",
  "空運業": "景気敏感",
  "電気・ガス業": "景気敏感",
  "ETF・他": "ディフェンシブ",
  "米国ETF": "ディフェンシブ",
  "米国個別株": "景気敏感"
};

// チャートカラーパレット
const CHART_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
  "#5b9bd5", "#ed7d31", "#a5a5a5", "#ffc000", "#4472c4",
  "#70ad47", "#264478", "#9b59b6", "#1abc9c", "#e67e22",
  "#2ecc71", "#3498db", "#e74c3c", "#f1c40f", "#9b59b6",
  "#1abc9c", "#d35400", "#c0392b", "#2980b9", "#27ae60",
  "#8e44ad", "#f39c12", "#16a085", "#d35400", "#c0392b",
  "#7f8c8d"
];

// ===== ToDoリスト デフォルトカテゴリ =====
const TODO_CATEGORIES = [
  { id: "life", name: "生活・住まい", icon: "🏠", color: "#5b9bd5" },
  { id: "movies", name: "観たい映画", icon: "🎬", color: "#e8c96a" },
  { id: "accounting", name: "会計・経理", icon: "💰", color: "#4caf50" },
  { id: "business", name: "事業・組織づくり", icon: "🏢", color: "#ed7d31" },
  { id: "learning", name: "学習・スキル", icon: "📚", color: "#9b59b6" },
  { id: "mindset", name: "マインドセット", icon: "💡", color: "#1abc9c" },
  { id: "beauty", name: "美容・健康", icon: "✨", color: "#ff9da7" }
];

// ===== ToDoリスト 初期データ =====
const DEFAULT_TODOS = [
  // 生活・住まい
  { id: "d1", title: "車検はガソリンスタンドがベター、ベストはユーザー車検", completed: false, priority: "medium", dueDate: null, memo: "", category: "life", createdAt: 1 },
  { id: "d2", title: "外壁リフォームは「暮らしのマーケット」がお勧め", completed: false, priority: "low", dueDate: null, memo: "", category: "life", createdAt: 2 },
  { id: "d3", title: "保険は県民共済 2型がお勧め", completed: false, priority: "low", dueDate: null, memo: "", category: "life", createdAt: 3 },
  // 観たい映画
  { id: "d4", title: "マミー", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 4 },
  { id: "d5", title: "グリーンブック", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 5 },
  { id: "d6", title: "ビューティーインサイト", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 6 },
  { id: "d7", title: "ざライダー", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 7 },
  { id: "d8", title: "マグノリアの花たち", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 8 },
  { id: "d9", title: "ワンダー", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 9 },
  { id: "d10", title: "ライフ・イットセルフ", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 10 },
  { id: "d11", title: "ブレイブハート", completed: false, priority: "none", dueDate: null, memo: "", category: "movies", createdAt: 11 },
  // 会計・経理
  { id: "d12", title: "事業主借 → プライベートの収益", completed: false, priority: "medium", dueDate: null, memo: "事業用口座にプライベートのお金が入った場合", category: "accounting", createdAt: 12 },
  { id: "d13", title: "事業主貸 → プライベートの支払い", completed: false, priority: "medium", dueDate: null, memo: "事業用口座からプライベートの支出をした場合", category: "accounting", createdAt: 13 },
  // 事業・組織づくり
  { id: "d14", title: "プロダクトマネージャーを立てる", completed: false, priority: "high", dueDate: null, memo: "Claudeだけと会話し、その人に任せる。作業を進めてもらい、定期的にチェックしてもらう。責任者の集まりを決める。", category: "business", createdAt: 14 },
  { id: "d15", title: "組織のツリー構造をつくる", completed: false, priority: "high", dueDate: null, memo: "役割と責任者を決める：ファンドマネージャー、ウェブデザイン、エンジニア、プログラマー、ライター。適切に指示を与えて伝える。毎回伝えるので指示分のプロンプトを作る。責任者の下にA, B, Cみたいなチームを与える。", category: "business", createdAt: 15 },
  // 学習・スキル
  { id: "d16", title: "プログラミング学習はプロゲートで月1000円でOK", completed: false, priority: "low", dueDate: null, memo: "", category: "learning", createdAt: 16 },
  // マインドセット
  { id: "d17", title: "子供に遺す金融教育を考える", completed: false, priority: "medium", dueDate: null, memo: "人にどう思われるかじゃなく自分がどう生きたいか", category: "mindset", createdAt: 17 },
  { id: "d18", title: "自分の人生の責任は自分にしかとれない", completed: false, priority: "none", dueDate: null, memo: "ドリームキラーには自分の人生の責任をとってもらえない", category: "mindset", createdAt: 18 },
  // 美容・健康
  { id: "d19", title: "スキンケア：レチノール、ハイドロキノン、漂白を調べる", completed: false, priority: "low", dueDate: null, memo: "", category: "beauty", createdAt: 19 }
];

const TODO_PRIORITY = {
  high: { label: "高", color: "#e53935" },
  medium: { label: "中", color: "#e8c96a" },
  low: { label: "低", color: "#5b9bd5" },
  none: { label: "なし", color: "#b0b8c8" }
};

// ===== ローカルストレージキー =====
const STORAGE_KEYS = {
  settings: "portfolio_settings",
  stocks: "portfolio_stocks",
  industryTypes: "portfolio_industry_types",
  stockTypes: "portfolio_stock_types",
  nisa: "portfolio_nisa",
  todos: "portfolio_todos",
  todoCategories: "portfolio_todo_categories"
};
