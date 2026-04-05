"""
投資ニューススライド自動生成システム
バフェットかおるチャンネル用 - Gemini API + python-pptx

毎朝8時に実行し、その日のバズりそうな投資・経済ニュースを
PowerPointスライドと読み上げ用カンペとして自動生成する。
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

load_dotenv()

# ── 設定 ──────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

TODAY = datetime.now().strftime("%Y年%m月%d日")
TODAY_FILE = datetime.now().strftime("%Y%m%d")


# ── 1. Gemini API でニュース取得 ──────────────────────
def fetch_news_topics() -> list[dict]:
    """Gemini APIを使って、本日の注目投資ニュース3トピックを取得する。"""
    if not GEMINI_API_KEY:
        print("エラー: GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。")
        sys.exit(1)
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""あなたは投資・経済ニュースの専門アナリストです。
今日は{TODAY}です。

以下の条件で、今日バズりそうな投資・経済ニュースを**3つ**選んでください。

【選定基準】
- 米国市場（NYSE/NASDAQ）と日本市場（東証）の両方からバランスよく選ぶ
- 個人投資家の関心が高いトピック（株価の大きな動き、決算、政策変更、為替など）
- YouTubeの投資系チャンネルで視聴回数が伸びそうなテーマ

【各トピックに含める情報】
1. title: トピックのタイトル（YouTube動画のスライドに使える簡潔なもの、20文字以内）
2. market: "米国市場" または "日本市場"
3. summary: 概要（何が起きたのか、背景を含めて3〜4文で説明）
4. impact: 投資家への影響（個人投資家が知るべきポイントを2〜3文で説明）
5. action_plan: 今日のアクションプラン（具体的に何をすべきか、2〜3文で説明）

【出力形式】
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。
```json
[
  {{
    "title": "...",
    "market": "...",
    "summary": "...",
    "impact": "...",
    "action_plan": "..."
  }},
  ...
]
```
"""

    response = client.models.generate_content(
        model="gemini-2.0-flash-001",
        contents=prompt,
    )

    text = response.text.strip()
    # コードブロックが含まれる場合は除去
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    topics = json.loads(text)
    if not isinstance(topics, list) or len(topics) == 0:
        raise ValueError("Gemini APIから有効なトピックリストを取得できませんでした。")
    return topics


# ── 2. スライド作成 ────────────────────────────────────

# カラーパレット
COLOR_BG_DARK = RGBColor(0x1A, 0x1A, 0x2E)
COLOR_ACCENT = RGBColor(0x00, 0xD4, 0xAA)
COLOR_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
COLOR_LIGHT_GRAY = RGBColor(0xCC, 0xCC, 0xCC)
COLOR_MARKET_US = RGBColor(0x44, 0x88, 0xFF)
COLOR_MARKET_JP = RGBColor(0xFF, 0x44, 0x44)

SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)


def set_slide_bg(slide, color: RGBColor):
    """スライド背景色を設定する。"""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_textbox(slide, left, top, width, height, text, font_size=18,
                color=COLOR_WHITE, bold=False, alignment=PP_ALIGN.LEFT,
                font_name="Meiryo"):
    """テキストボックスを追加するヘルパー。"""
    txbox = slide.shapes.add_textbox(left, top, width, height)
    tf = txbox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txbox


def add_shape_rect(slide, left, top, width, height, fill_color: RGBColor):
    """色付き矩形を追加する。"""
    from pptx.enum.shapes import MSO_SHAPE
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape


def create_title_slide(prs: Presentation):
    """タイトルスライドを作成する。"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
    set_slide_bg(slide, COLOR_BG_DARK)

    # アクセントライン上部
    add_shape_rect(slide, Inches(0), Inches(0), SLIDE_WIDTH, Inches(0.08), COLOR_ACCENT)

    # チャンネル名
    add_textbox(slide, Inches(1), Inches(1.5), Inches(11), Inches(1),
                "バフェットかおるの投資ニュース",
                font_size=44, color=COLOR_ACCENT, bold=True,
                alignment=PP_ALIGN.CENTER)

    # 日付
    add_textbox(slide, Inches(1), Inches(3.0), Inches(11), Inches(0.8),
                f"{TODAY} 朝の市場チェック",
                font_size=28, color=COLOR_WHITE, bold=False,
                alignment=PP_ALIGN.CENTER)

    # サブタイトル
    add_textbox(slide, Inches(1), Inches(4.2), Inches(11), Inches(0.8),
                "今日バズる投資ニュース TOP 3",
                font_size=24, color=COLOR_LIGHT_GRAY,
                alignment=PP_ALIGN.CENTER)

    # アクセントライン下部
    add_shape_rect(slide, Inches(0), Inches(7.42), SLIDE_WIDTH, Inches(0.08), COLOR_ACCENT)


def create_topic_slide(prs: Presentation, topic: dict, index: int):
    """各トピックのスライドを作成する。"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, COLOR_BG_DARK)

    market_color = COLOR_MARKET_US if "米国" in topic["market"] else COLOR_MARKET_JP

    # ── ヘッダー部分 ──
    # トピック番号バッジ
    add_shape_rect(slide, Inches(0.5), Inches(0.4), Inches(0.9), Inches(0.7), COLOR_ACCENT)
    add_textbox(slide, Inches(0.5), Inches(0.42), Inches(0.9), Inches(0.7),
                f"#{index}", font_size=32, color=COLOR_BG_DARK, bold=True,
                alignment=PP_ALIGN.CENTER)

    # マーケットバッジ
    add_shape_rect(slide, Inches(1.6), Inches(0.4), Inches(2.0), Inches(0.7), market_color)
    add_textbox(slide, Inches(1.6), Inches(0.42), Inches(2.0), Inches(0.7),
                topic["market"], font_size=20, color=COLOR_WHITE, bold=True,
                alignment=PP_ALIGN.CENTER)

    # タイトル
    add_textbox(slide, Inches(4.0), Inches(0.35), Inches(8.5), Inches(0.8),
                topic["title"], font_size=32, color=COLOR_WHITE, bold=True)

    # 区切り線
    add_shape_rect(slide, Inches(0.5), Inches(1.3), Inches(12.3), Inches(0.03), COLOR_ACCENT)

    # ── 3カラムレイアウト ──
    sections = [
        ("概要", topic["summary"], Inches(0.5)),
        ("投資家への影響", topic["impact"], Inches(4.7)),
        ("今日のアクションプラン", topic["action_plan"], Inches(8.9)),
    ]

    for label, content, left in sections:
        # セクションラベル
        add_shape_rect(slide, left, Inches(1.7), Inches(3.8), Inches(0.55), COLOR_ACCENT)
        add_textbox(slide, left, Inches(1.72), Inches(3.8), Inches(0.55),
                    f"  {label}", font_size=18, color=COLOR_BG_DARK, bold=True)

        # セクション内容
        add_textbox(slide, left, Inches(2.5), Inches(3.8), Inches(4.5),
                    content, font_size=16, color=COLOR_LIGHT_GRAY)

    # フッターライン
    add_shape_rect(slide, Inches(0), Inches(7.42), SLIDE_WIDTH, Inches(0.08), COLOR_ACCENT)


def create_ending_slide(prs: Presentation):
    """エンディングスライドを作成する。"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, COLOR_BG_DARK)

    add_shape_rect(slide, Inches(0), Inches(0), SLIDE_WIDTH, Inches(0.08), COLOR_ACCENT)

    add_textbox(slide, Inches(1), Inches(2.0), Inches(11), Inches(1),
                "チャンネル登録・高評価お願いします！",
                font_size=36, color=COLOR_ACCENT, bold=True,
                alignment=PP_ALIGN.CENTER)

    add_textbox(slide, Inches(1), Inches(3.5), Inches(11), Inches(1),
                "コメント欄であなたの投資戦略を教えてください",
                font_size=24, color=COLOR_WHITE,
                alignment=PP_ALIGN.CENTER)

    add_textbox(slide, Inches(1), Inches(5.0), Inches(11), Inches(0.6),
                "※投資は自己責任でお願いします。本動画は情報提供を目的としており、特定の銘柄の売買を推奨するものではありません。",
                font_size=14, color=COLOR_LIGHT_GRAY,
                alignment=PP_ALIGN.CENTER)

    add_shape_rect(slide, Inches(0), Inches(7.42), SLIDE_WIDTH, Inches(0.08), COLOR_ACCENT)


def generate_slides(topics: list[dict]) -> Path:
    """全スライドを生成し、.pptxファイルとして保存する。"""
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT

    create_title_slide(prs)
    for i, topic in enumerate(topics, 1):
        create_topic_slide(prs, topic, i)
    create_ending_slide(prs)

    output_path = OUTPUT_DIR / f"investment_news_{TODAY_FILE}.pptx"
    prs.save(str(output_path))
    return output_path


# ── 3. 読み上げ用カンペ生成 ─────────────────────────────

def generate_script(topics: list[dict]) -> Path:
    """読み上げ用カンペをテキストファイルとして生成する。"""
    lines = []
    lines.append("=" * 60)
    lines.append(f"  バフェットかおるの投資ニュース - {TODAY}")
    lines.append(f"  読み上げ用カンペ（台本）")
    lines.append("=" * 60)
    lines.append("")

    # オープニング
    lines.append("【オープニング】")
    lines.append("")
    lines.append("はい、皆さんおはようございます！バフェットかおるです。")
    lines.append(f"今日は{TODAY}、朝の投資ニュースチェックをやっていきましょう。")
    lines.append("今日も注目のニュースを3つピックアップしました。")
    lines.append("それでは早速いきましょう！")
    lines.append("")
    lines.append("-" * 60)

    for i, topic in enumerate(topics, 1):
        lines.append("")
        lines.append(f"【トピック{i}】{topic['title']}（{topic['market']}）")
        lines.append("")
        lines.append(f"  ▼ 概要")
        lines.append(f"  {topic['summary']}")
        lines.append("")
        lines.append(f"  ▼ 投資家への影響")
        lines.append(f"  {topic['impact']}")
        lines.append("")
        lines.append(f"  ▼ 今日のアクションプラン")
        lines.append(f"  {topic['action_plan']}")
        lines.append("")

        if i < len(topics):
            lines.append("  → 「続いてはこちらのニュースです。」")
        lines.append("-" * 60)

    # エンディング
    lines.append("")
    lines.append("【エンディング】")
    lines.append("")
    lines.append("はい、以上が今日の注目ニュース3選でした。")
    lines.append("皆さんはどのニュースが一番気になりましたか？")
    lines.append("コメント欄であなたの投資戦略を教えてください。")
    lines.append("")
    lines.append("それでは、チャンネル登録と高評価、よろしくお願いします。")
    lines.append("バフェットかおるでした。また明日！")
    lines.append("")
    lines.append("※投資は自己責任でお願いします。")
    lines.append("  本動画は情報提供を目的としており、特定の銘柄の売買を推奨するものではありません。")
    lines.append("")
    lines.append("=" * 60)

    output_path = OUTPUT_DIR / f"script_{TODAY_FILE}.txt"
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path


# ── メイン処理 ─────────────────────────────────────────

def main():
    print(f"[{datetime.now():%H:%M:%S}] 投資ニューススライド生成を開始します...")

    print(f"[{datetime.now():%H:%M:%S}] Gemini APIからニュースを取得中...")
    topics = fetch_news_topics()
    print(f"[{datetime.now():%H:%M:%S}] {len(topics)}件のトピックを取得しました。")

    for i, t in enumerate(topics, 1):
        print(f"  #{i} [{t['market']}] {t['title']}")

    print(f"[{datetime.now():%H:%M:%S}] スライドを生成中...")
    pptx_path = generate_slides(topics)
    print(f"[{datetime.now():%H:%M:%S}] スライド保存: {pptx_path}")

    print(f"[{datetime.now():%H:%M:%S}] 読み上げカンペを生成中...")
    script_path = generate_script(topics)
    print(f"[{datetime.now():%H:%M:%S}] カンペ保存: {script_path}")

    print(f"[{datetime.now():%H:%M:%S}] 完了！")


if __name__ == "__main__":
    main()
