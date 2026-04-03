"""マネーフォワードクラウド会計 API クライアント"""

import requests

from moneyforward.auth import MFAuth

BASE_URL = "https://accounting.moneyforward.com/api/v3"


class MFClient:
    """マネーフォワードクラウド会計 API クライアント"""

    def __init__(self, auth: MFAuth | None = None):
        self.auth = auth or MFAuth()
        self.office_id = None

    def _get(self, path, params=None):
        """GET リクエストを送信する"""
        url = f"{BASE_URL}{path}"
        response = requests.get(
            url, headers=self.auth.get_headers(), params=params, timeout=30
        )
        if response.status_code == 401:
            self.auth.refresh_access_token()
            response = requests.get(
                url, headers=self.auth.get_headers(), params=params, timeout=30
            )
        response.raise_for_status()
        return response.json()

    def _post(self, path, json_data=None):
        """POST リクエストを送信する"""
        url = f"{BASE_URL}{path}"
        response = requests.post(
            url, headers=self.auth.get_headers(), json=json_data, timeout=30
        )
        if response.status_code == 401:
            self.auth.refresh_access_token()
            response = requests.post(
                url, headers=self.auth.get_headers(), json=json_data, timeout=30
            )
        response.raise_for_status()
        return response.json()

    # ========== 事業所 (Office) ==========

    def get_offices(self):
        """事業所一覧を取得する"""
        return self._get("/offices")

    def set_office(self, office_id):
        """操作対象の事業所を設定する"""
        self.office_id = office_id

    def _office_params(self, params=None):
        """事業所IDをパラメータに追加する"""
        if not self.office_id:
            raise ValueError("事業所が設定されていません。set_office() で設定してください。")
        p = {"office_id": self.office_id}
        if params:
            p.update(params)
        return p

    # ========== 勘定科目 (Account Items) ==========

    def get_account_items(self, page=1, per_page=100):
        """勘定科目一覧を取得する"""
        params = self._office_params({"page": page, "per_page": per_page})
        return self._get("/account_items", params=params)

    # ========== 仕訳 (Journal Entries) ==========

    def get_journals(self, page=1, per_page=100):
        """仕訳一覧を取得する"""
        params = self._office_params({"page": page, "per_page": per_page})
        return self._get("/journals", params=params)

    def create_journal(self, journal_data):
        """仕訳を作成する

        Args:
            journal_data: 仕訳データ（dict）
                例: {
                    "office_id": "xxx",
                    "journal": {
                        "recognized_at": "2024-01-15",
                        "entries": [
                            {"entry_side": "debit", "account_item_id": "...", "amount": 10000},
                            {"entry_side": "credit", "account_item_id": "...", "amount": 10000}
                        ]
                    }
                }
        """
        if "office_id" not in journal_data:
            journal_data["office_id"] = self.office_id
        return self._post("/journals", json_data=journal_data)

    # ========== 取引先 (Partners) ==========

    def get_partners(self, page=1, per_page=100):
        """取引先一覧を取得する"""
        params = self._office_params({"page": page, "per_page": per_page})
        return self._get("/partners", params=params)

    def create_partner(self, name, code=None):
        """取引先を作成する"""
        data = {
            "office_id": self.office_id,
            "partner": {"name": name},
        }
        if code:
            data["partner"]["code"] = code
        return self._post("/partners", json_data=data)

    # ========== 部門 (Departments) ==========

    def get_departments(self, page=1, per_page=100):
        """部門一覧を取得する"""
        params = self._office_params({"page": page, "per_page": per_page})
        return self._get("/departments", params=params)

    # ========== 税区分 (Tax Codes) ==========

    def get_taxes(self):
        """税区分一覧を取得する"""
        params = self._office_params()
        return self._get("/taxes", params=params)

    # ========== 口座 (Walletables) ==========

    def get_walletables(self):
        """口座一覧を取得する"""
        params = self._office_params()
        return self._get("/walletables", params=params)

    # ========== 品目 (Items) ==========

    def get_items(self, page=1, per_page=100):
        """品目一覧を取得する"""
        params = self._office_params({"page": page, "per_page": per_page})
        return self._get("/items", params=params)
