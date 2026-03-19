import google.generativeai as genai
import os
from dotenv import load_dotenv

# .envから鍵を取り出す
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("エラー: APIキーが見つかりません。.envを確認してください。")
else:
    genai.configure(api_key=api_key)
    print(f"キーを確認しました: {api_key[:5]}...")

    print("\n---------- 利用可能なモデル一覧 ----------")
    try:
        # 生成（generateContent）に対応しているモデルだけを表示
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"一覧取得エラー: {e}")
    print("------------------------------------------")