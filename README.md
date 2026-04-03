# マネーフォワードクラウド会計 連携アプリ

マネーフォワードクラウド会計の API と連携して、会計データの取得・操作を行う Python アプリケーションです。

## 機能

- OAuth2 認証（ブラウザベース）
- 事業所一覧の取得
- 勘定科目一覧の取得
- 仕訳一覧の取得・作成
- 取引先一覧の取得・作成
- 部門・税区分・口座・品目の取得

## セットアップ

### 1. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して、マネーフォワードクラウドの開発者ポータルで取得した `CLIENT_ID` と `CLIENT_SECRET` を設定してください。

```
MF_CLIENT_ID=your_client_id
MF_CLIENT_SECRET=your_client_secret
MF_REDIRECT_URI=http://localhost:5000/callback
```

### 3. OAuth2 認証

```bash
python app.py auth
```

ブラウザで `http://localhost:5000` を開き、マネーフォワードクラウドにログインして認証してください。認証が完了すると、アクセストークンが `.env` ファイルに自動保存されます。

## 使い方

```bash
# 事業所一覧を取得
python app.py offices

# 勘定科目一覧を取得
python app.py accounts <office_id>

# 仕訳一覧を取得
python app.py journals <office_id>

# 取引先一覧を取得
python app.py partners <office_id>

# 部門一覧を取得
python app.py departments <office_id>

# 税区分一覧を取得
python app.py taxes <office_id>

# 口座一覧を取得
python app.py walletables <office_id>

# 品目一覧を取得
python app.py items <office_id>
```

## Python ライブラリとして使用

```python
from moneyforward import MFAuth, MFClient

auth = MFAuth()
client = MFClient(auth)

# 事業所一覧を取得
offices = client.get_offices()

# 事業所を設定
client.set_office("your_office_id")

# 仕訳一覧を取得
journals = client.get_journals()

# 取引先を作成
client.create_partner("株式会社サンプル", code="P001")
```

## プロジェクト構成

```
my-first-app/
├── app.py                  # メインアプリケーション（CLI + OAuth2サーバー）
├── moneyforward/
│   ├── __init__.py
│   ├── auth.py             # OAuth2 認証モジュール
│   └── client.py           # API クライアント
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## API リファレンス

このアプリは [マネーフォワードクラウド会計 API v3](https://accounting.moneyforward.com/api/v3) を使用しています。
