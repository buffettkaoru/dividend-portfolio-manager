# 投資ニューススライド自動生成システム - セットアップ手順

## 1. 環境構築

```bash
# リポジトリのディレクトリに移動
cd /path/to/my-first-app

# 依存パッケージのインストール
pip install -r requirements.txt

# .env ファイルを作成し、Gemini API キーを設定
cp .env.example .env
# .env を編集して GEMINI_API_KEY を設定
```

### Gemini API キーの取得方法
1. [Google AI Studio](https://aistudio.google.com/apikey) にアクセス
2. 「APIキーを作成」をクリック
3. 取得したキーを `.env` の `GEMINI_API_KEY` に設定

## 2. 手動実行（テスト）

```bash
python generate_slides.py
```

`output/` フォルダに以下が生成されます：
- `investment_news_YYYYMMDD.pptx` - PowerPoint スライド
- `script_YYYYMMDD.txt` - 読み上げ用カンペ

## 3. 毎朝8時の自動実行設定（macOS launchd）

### 設定手順

```bash
# 1. plist ファイルの WorkingDirectory を実際のパスに書き換え
#    com.buffettkaoru.investment-news.plist の中の
#    /Users/YOUR_USERNAME/my-first-app を実際のパスに変更

# 2. plist を LaunchAgents にコピー
cp com.buffettkaoru.investment-news.plist ~/Library/LaunchAgents/

# 3. ジョブを登録
launchctl load ~/Library/LaunchAgents/com.buffettkaoru.investment-news.plist
```

### 確認・管理コマンド

```bash
# ジョブが登録されているか確認
launchctl list | grep investment-news

# 手動で即時実行（テスト用）
launchctl start com.buffettkaoru.investment-news

# ジョブを停止・削除
launchctl unload ~/Library/LaunchAgents/com.buffettkaoru.investment-news.plist

# ログの確認
cat /tmp/investment-news-stdout.log
cat /tmp/investment-news-stderr.log
```

### 注意事項
- macOS がスリープ中の場合、起動後に実行されます
- Python の仮想環境を使っている場合は、plist の ProgramArguments を venv 内の python パスに変更してください
  - 例: `/Users/YOUR_USERNAME/my-first-app/.venv/bin/python3`
