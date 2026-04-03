"""マネーフォワードクラウド OAuth2 認証モジュール"""

import os
import urllib.parse

import requests
from dotenv import load_dotenv, set_key

load_dotenv()

AUTHORIZE_URL = "https://accounting.moneyforward.com/oauth/authorize"
TOKEN_URL = "https://accounting.moneyforward.com/oauth/token"


class MFAuth:
    """マネーフォワードクラウドの OAuth2 認証を管理するクラス"""

    def __init__(self):
        self.client_id = os.getenv("MF_CLIENT_ID")
        self.client_secret = os.getenv("MF_CLIENT_SECRET")
        self.redirect_uri = os.getenv("MF_REDIRECT_URI", "http://localhost:5000/callback")
        self.access_token = os.getenv("MF_ACCESS_TOKEN")
        self.refresh_token = os.getenv("MF_REFRESH_TOKEN")

    def get_authorize_url(self):
        """OAuth2 認可URLを生成する"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "office",
        }
        return f"{AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"

    def fetch_token(self, authorization_code):
        """認可コードからアクセストークンを取得する"""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": authorization_code,
            "redirect_uri": self.redirect_uri,
        }
        response = requests.post(TOKEN_URL, data=data, timeout=30)
        response.raise_for_status()
        token_data = response.json()

        self.access_token = token_data["access_token"]
        self.refresh_token = token_data.get("refresh_token")
        self._save_tokens()
        return token_data

    def refresh_access_token(self):
        """リフレッシュトークンでアクセストークンを更新する"""
        if not self.refresh_token:
            raise ValueError("リフレッシュトークンがありません。再認証してください。")

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
        }
        response = requests.post(TOKEN_URL, data=data, timeout=30)
        response.raise_for_status()
        token_data = response.json()

        self.access_token = token_data["access_token"]
        if "refresh_token" in token_data:
            self.refresh_token = token_data["refresh_token"]
        self._save_tokens()
        return token_data

    def _save_tokens(self):
        """トークンを .env ファイルに保存する"""
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        if os.path.exists(env_path):
            if self.access_token:
                set_key(env_path, "MF_ACCESS_TOKEN", self.access_token)
            if self.refresh_token:
                set_key(env_path, "MF_REFRESH_TOKEN", self.refresh_token)

    def get_headers(self):
        """API リクエスト用のヘッダーを返す"""
        if not self.access_token:
            raise ValueError("アクセストークンがありません。先に認証してください。")
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
