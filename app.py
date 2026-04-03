"""マネーフォワードクラウド会計 連携アプリケーション

OAuth2 認証用の Web サーバーと、会計データ操作用の CLI を提供します。
"""

import json
import sys

from flask import Flask, redirect, request

from moneyforward.auth import MFAuth
from moneyforward.client import MFClient

app = Flask(__name__)
auth = MFAuth()


# ========== OAuth2 認証用エンドポイント ==========


@app.route("/")
def index():
    """認証開始ページ"""
    authorize_url = auth.get_authorize_url()
    return f"""
    <html>
    <head><title>マネーフォワードクラウド連携</title></head>
    <body>
        <h1>マネーフォワードクラウド会計 連携</h1>
        <p><a href="{authorize_url}">マネーフォワードクラウドにログインして認証する</a></p>
    </body>
    </html>
    """


@app.route("/callback")
def callback():
    """OAuth2 コールバック"""
    code = request.args.get("code")
    if not code:
        return "認証コードが取得できませんでした。", 400

    try:
        auth.fetch_token(code)
        return """
        <html>
        <head><title>認証完了</title></head>
        <body>
            <h1>認証が完了しました！</h1>
            <p>アクセストークンが .env ファイルに保存されました。</p>
            <p>このウィンドウを閉じて、CLI からデータにアクセスできます。</p>
        </body>
        </html>
        """
    except Exception as e:
        return f"認証エラー: {e}", 500


# ========== CLI コマンド ==========


def print_json(data):
    """JSON データを整形して表示する"""
    print(json.dumps(data, indent=2, ensure_ascii=False))


def cli_main():
    """CLI メイン処理"""
    if len(sys.argv) < 2:
        print_usage()
        return

    command = sys.argv[1]

    if command == "auth":
        print("OAuth2 認証サーバーを起動します...")
        print("ブラウザで http://localhost:5000 を開いてください。")
        app.run(host="localhost", port=5000, debug=False)
        return

    client = MFClient(auth)

    if command == "offices":
        data = client.get_offices()
        print_json(data)

    elif command == "accounts":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_account_items()
        print_json(data)

    elif command == "journals":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_journals()
        print_json(data)

    elif command == "partners":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_partners()
        print_json(data)

    elif command == "departments":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_departments()
        print_json(data)

    elif command == "taxes":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_taxes()
        print_json(data)

    elif command == "walletables":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_walletables()
        print_json(data)

    elif command == "items":
        office_id = _require_office_id()
        client.set_office(office_id)
        data = client.get_items()
        print_json(data)

    else:
        print(f"不明なコマンド: {command}")
        print_usage()


def _require_office_id():
    """事業所IDを取得する（引数またはプロンプト）"""
    if len(sys.argv) >= 3:
        return sys.argv[2]
    print("エラー: 事業所IDを指定してください。")
    print("使い方: python app.py <command> <office_id>")
    print("事業所ID一覧は 'python app.py offices' で確認できます。")
    sys.exit(1)


def print_usage():
    """使い方を表示する"""
    print(
        """
マネーフォワードクラウド会計 連携ツール

使い方:
  python app.py auth                     OAuth2 認証を開始
  python app.py offices                  事業所一覧を取得
  python app.py accounts <office_id>     勘定科目一覧を取得
  python app.py journals <office_id>     仕訳一覧を取得
  python app.py partners <office_id>     取引先一覧を取得
  python app.py departments <office_id>  部門一覧を取得
  python app.py taxes <office_id>        税区分一覧を取得
  python app.py walletables <office_id>  口座一覧を取得
  python app.py items <office_id>        品目一覧を取得

初回セットアップ:
  1. .env.example を .env にコピーして、CLIENT_ID と CLIENT_SECRET を設定
  2. python app.py auth で認証サーバーを起動
  3. ブラウザで http://localhost:5000 を開いて認証
  4. 認証後、各コマンドでデータを取得可能
"""
    )


if __name__ == "__main__":
    cli_main()
