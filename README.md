BugHunter - AI-Powered Debugging Simulation Terminal

1. プロジェクト概要

『BugHunter』は、LLM（Gemini API）を活用して動的に生成されるPythonのバグ修正クイズに挑戦する、エンジニア向けのデバッグ・トレーニング・プラットフォームです。
コードの「意図」を読み解き、論理的な解決策を導き出すプロセスを体感・定量化することを目指しています。

2. 開発背景と目的

私は現在、プログラミングという新たな領域でスキルを積み上げるプロセスを心から楽しんでいます。日々変化する技術スタックを習得し、それを実用的なコードに落とし込むことは、私にとって最大の関心事です。

本プロジェクトは、その学習過程で直面した「デバッグの重要性」をテーマにしています。前職での制作・マネジメント経験から得た「課題解決の効率化」という視点を、最新のAI技術と掛け合わせることで、技術習得をより加速させる仕組みとして構築しました。

3. 技術スタック

Frontend: HTML5, CSS3 (Custom CRT Effect), JavaScript (ES6+)

Backend: Python 3.x, Flask

AI/LLM: Google Gemini API (2.5-flash / 2.0-flash Fallback)

Database: SQLite3 (進捗管理用)

Environment: WSL2 (Ubuntu), Docker (予定)

4. 主な機能

動的プロンプト生成: ユーザーのレベルに応じたバグを含むコードをAIがリアルタイムに生成。

自動採点・多角的な解説: 回答コードをAIが解析。正誤判定に加え、技術的な背景を含めたフィードバックを提供。

統計管理機能: プレイデータ（正解率・レベル推移）を永続化し、学習成果を可視化。

5. セキュリティと環境設定

本プロジェクトでは、機密情報保持のため環境変数（.envファイル）を使用しています。

別のユーザーが利用する場合

Google AI Studioにて自身の Gemini API Key を取得してください。

プロジェクトのルートディレクトリに .env ファイルを作成してください。

ファイル内に GEMINI_API_KEY=あなたのキー と記述してください。

.gitignore に .env が含まれていることを確認し、秘密情報を公開しないよう配慮しています。

6. 使用方法（Setup）

# リポジトリのクローン
git clone [https://github.com/your-username/bughunter.git](https://github.com/your-username/bughunter.git)

# 依存パッケージのインストール
pip install -r requirements.txt

# .env ファイルの作成
echo "GEMINI_API_KEY=your_actual_key_here" > .env

# アプリケーションの起動
python app.py


7. 開発者より

私の強みは、新しい技術を学ぶことに対する純粋な好奇心です。前職での経験は、その好奇心を「ビジネスの現場で通用する効率的な解決策」へと繋げるための土台となっています。変化を楽しみ、常に最新の最適解を追求し続けるエンジニアでありたいと考えています。