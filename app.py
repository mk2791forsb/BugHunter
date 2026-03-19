import os
import sqlite3
import json
import re
import logging
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# --- 設定・初期化 ---
load_dotenv()
app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_FILE = 'database.db'

# お客様ご指定の最新モデル構成
PRIMARY_MODEL = 'gemini-2.5-flash'
SECONDARY_MODEL = 'gemini-2.0-flash'

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("GEMINI_API_KEY が設定されていません。")
else:
    genai.configure(api_key=api_key)

# --- データベース操作 ---

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS user_stats (
                username TEXT PRIMARY KEY,
                played_count INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                consecutive_correct INTEGER DEFAULT 0
            )
        ''')
        conn.commit()

def update_user_performance(username, is_correct):
    with get_db_connection() as conn:
        user = conn.execute('SELECT * FROM user_stats WHERE username = ?', (username,)).fetchone()
        
        if user is None:
            level = 1
            consecutive = 1 if is_correct else 0
            conn.execute(
                'INSERT INTO user_stats (username, played_count, correct_count, level, consecutive_correct) VALUES (?, ?, ?, ?, ?)',
                (username, 1, 1 if is_correct else 0, level, consecutive)
            )
        else:
            played = user['played_count'] + 1
            correct = user['correct_count'] + (1 if is_correct else 0)
            level = user['level']
            consecutive = user['consecutive_correct']

            if is_correct:
                consecutive += 1
                if consecutive >= 3:
                    level = min(10, level + 1)
                    consecutive = 0
            else:
                consecutive = 0
                level = max(1, level - 1)

            conn.execute(
                'UPDATE user_stats SET played_count = ?, correct_count = ?, level = ?, consecutive_correct = ? WHERE username = ?',
                (played, correct, level, consecutive, username)
            )
        conn.commit()

init_db()

# --- AI生成ロジック ---

def generate_content_with_fallback(prompt, is_json=False, is_dummy=False):
    if is_dummy:
        return _get_dummy_response(is_json)
    
    models_to_try = [PRIMARY_MODEL, SECONDARY_MODEL]
    
    last_error = None
    for model_name in models_to_try:
        try:
            logger.info(f"Attempting API call with: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            logger.error(f"Model {model_name} failed: {e}")
            if hasattr(e, 'code') and getattr(e, 'code') == 429:
                last_error = Exception("【システム警告】高負荷が検出されました。データリンクの再構築に時間がかかっています。約1〜2分後、再度アクセスを試みてください。(Error: APIリクエスト制限)")
                break # 429の場合はモデルを変えても同じキーなら制限にかかるためループを抜ける
            elif '429' in str(e):
                last_error = Exception("【システム警告】高負荷が検出されました。データリンクの再構築に時間がかかっています。約1〜2分後、再度アクセスを試みてください。(Error: APIリクエスト制限)")
                break
            last_error = e
            continue
            
    logger.critical("All configured AI models failed to respond.")
    raise last_error

def _get_dummy_response(is_json):
    if is_json:
        return json.dumps({"is_correct": True, "message": "【テスト用】ダミーモードでの判定です。正常に動作しています。"})
    return "```python\n# Test Code\nprint('Hello, Alfred')\n```"

# --- ルーティング ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_stats/<username>')
def get_stats(username):
    with get_db_connection() as conn:
        user = conn.execute('SELECT * FROM user_stats WHERE username = ?', (username,)).fetchone()

    if not user:
        return jsonify({"played_count": 0, "correct_count": 0, "accuracy": 0, "level": 1})
    
    p, c = user['played_count'], user['correct_count']
    return jsonify({
        "played_count": p, 
        "correct_count": c, 
        "accuracy": round((c / p * 100)) if p > 0 else 0,
        "level": user['level']
    })

@app.route('/generate_problem', methods=['POST'])
def generate_problem():
    try:
        data = request.json or {}
        username = data.get('username')
        
        level = 1
        if username:
            with get_db_connection() as conn:
                user = conn.execute('SELECT level FROM user_stats WHERE username = ?', (username,)).fetchone()
                if user: level = user['level']

        prompt = f"""
        Pythonのバグ修正クイズを作成してください。難易度LV{level}/10。
        LV1: 非常に単純、LV10: 極めて難解な論理エラー。
        出力はコードのみ、Markdown形式（```python ... ```）で。
        """
        text = generate_content_with_fallback(prompt, is_dummy=data.get('is_dummy', False))
        match = re.search(r'```python\s*([\s\S]*?)\s*```', text)
        return jsonify({"problem_code": match.group(1).strip() if match else text.strip()})
    except Exception as e:
        logger.error(f"Error in generate_problem: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/check_solution', methods=['POST'])
def check_solution():
    data = request.json
    username = data.get('username', 'Guest')
    try:
        prompt = f"""
        採点してください。JSON形式 {{ 'is_correct': bool, 'message': '解説' }} で出力。
        問題: {data.get('problem_code')}
        ユーザーの回答: {data.get('user_code')}
        """
        text = generate_content_with_fallback(prompt, is_json=True, is_dummy=data.get('is_dummy', False))
        
        match = re.search(r'\{[\s\S]*\}', text)
        res = json.loads(match.group(0)) if match else {"is_correct": False, "message": "AIの応答を解析できませんでした。"}
        
        update_user_performance(username, res.get("is_correct", False))
        return jsonify(res)
    except Exception as e:
        logger.error(f"Error in check_solution: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)