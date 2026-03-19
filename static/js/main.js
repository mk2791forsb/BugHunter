/* -----------------------------------------------
   1. Matrix Rain Logic (Depth & Blur Effect) 
   ----------------------------------------------- */
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
let drops = [];

function initMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const fontSize = 16;
    const columns = Math.ceil(canvas.width / fontSize);
    
    // drops[i] represents the current y-coordinate of the leading character in column i
    drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
}

window.addEventListener('resize', initMatrix);

function drawMatrix() {
    // 塗りつぶしの色を黒にし、アルファ値で残像をコントロール
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // 鮮やかな緑
    const fontSize = 16;
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        
        // 文字を一文字ずつ重なるように描画
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // 画面下端を超えたら、ある確率でストリームをリセット
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // 50%ずつ重なるように、Y方向の増加量を調整 (1.0 = フォントサイズ分、0.5 = 50%重なる)
        drops[i] += 0.5;
    }
}

// requestAnimationFrameのループの代わりに、より制御しやすいsetInterval(またはsetTimeoutベース)で更新
let lastTime = 0;
const fps = 30;
const interval = 1000 / fps;

function renderMatrix(time) {
    requestAnimationFrame(renderMatrix);
    const deltaTime = time - lastTime;
    
    if (deltaTime > interval) {
        drawMatrix();
        lastTime = time - (deltaTime % interval);
    }
}

requestAnimationFrame(renderMatrix);

/* -----------------------------------------------
   2. Loading Animation Logic
   ----------------------------------------------- */
let isLoading = false;

function setLoading(loading) {
    isLoading = loading;
    const mainTitle = document.getElementById('main-title');
    const loadingTitle = document.getElementById('loading-title');

    if (loading) {
        if (mainTitle) mainTitle.style.display = 'none';
        if (loadingTitle) loadingTitle.style.display = 'block';
    } else {
        if (mainTitle) mainTitle.style.display = 'block';
        if (loadingTitle) loadingTitle.style.display = 'none';
    }
}

/* -----------------------------------------------
   3. Game Logic (Integration & Database)
   ----------------------------------------------- */
let currentProblemCode = "";
let hunterName = localStorage.getItem("hunterName");
let isDummyMode = localStorage.getItem("isDummyMode") === "true";

function updateModeButton() {
    const btn = document.getElementById('mode-toggle-btn');
    if (btn) {
        if (isDummyMode) {
            btn.innerText = "SYSTEM: DUMMY (OFFLINE)";
            btn.style.color = "#ffaa00";
            btn.style.borderColor = "#ffaa00";
        } else {
            btn.innerText = "SYSTEM: ONLINE";
            btn.style.color = "#339900";
            btn.style.borderColor = "#339900";
        }
    }
}

document.getElementById('mode-toggle-btn')?.addEventListener('click', () => {
    isDummyMode = !isDummyMode;
    localStorage.setItem("isDummyMode", isDummyMode);
    location.reload();
});

function resetSystem() {
    localStorage.removeItem("hunterName");
    location.reload();
}

window.onload = function () {
    initMatrix();
    drawMatrix();
    updateModeButton();

    if (!hunterName) {
        const inputField = document.getElementById('hunter-name-input');
        if (inputField) {
            inputField.focus();
            inputField.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') startSystem();
            });
        }
        document.getElementById('logout-btn').style.display = 'none';
    } else {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'block';

        fetchStats().then(() => {
            loadProblem();
        });
    }
};

function startSystem() {
    const inputName = document.getElementById('hunter-name-input').value.trim();
    hunterName = inputName || "Guest";
    localStorage.setItem("hunterName", hunterName);

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'block';

    fetchStats().then(() => {
        loadProblem();
    });
}

async function fetchStats() {
    try {
        const nameEl = document.getElementById('display-name');
        if (nameEl) nameEl.innerText = hunterName;

        const response = await fetch(`/get_stats/${hunterName}`);
        const stats = await response.json();

        const playedEl = document.getElementById('display-played');
        const correctEl = document.getElementById('display-correct');
        const accuracyEl = document.getElementById('display-accuracy');
        const levelEl = document.getElementById('display-level');

        if (playedEl) playedEl.innerText = stats.played_count;
        if (correctEl) correctEl.innerText = stats.correct_count;
        if (accuracyEl) accuracyEl.innerText = stats.accuracy;
        if (levelEl) {
            levelEl.innerText = stats.level || 1;
            if (stats.level >= 8) levelEl.style.color = "#ff3333";
            else if (stats.level >= 4) levelEl.style.color = "#ffaa00";
            else levelEl.style.color = "#ffffff";
        }
    } catch (e) {
        console.error("Stats Fetch Error", e);
    }
}

async function loadProblem() {
    setLoading(true);
    const editor = document.getElementById('code-editor');
    const resultArea = document.getElementById('result-area');
    const btnExecute = document.getElementById('btn-execute');

    editor.value = "";
    resultArea.style.display = 'none';
    resultArea.innerHTML = '';

    // ★ 次の問題をロードした際は必ずEXECUTEボタンを復活させる
    if (btnExecute) btnExecute.style.visibility = 'visible';

    try {
        const response = await fetch('/generate_problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_dummy: isDummyMode, username: hunterName })
        });
        const data = await response.json();

        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            currentProblemCode = data.problem_code;
            editor.value = currentProblemCode;
        }
    } catch (e) {
        console.error(e);
        alert('Connection Error');
    } finally {
        setLoading(false);
    }
}

async function checkSolution() {
    const editor = document.getElementById('code-editor');
    const resultArea = document.getElementById('result-area');
    const btnExecute = document.getElementById('btn-execute');
    const userCode = editor.value;

    if (!userCode.trim()) return;

    setLoading(true);
    resultArea.style.display = 'block';
    resultArea.innerHTML = 'Analyzing...';

    try {
        const response = await fetch('/check_solution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                problem_code: currentProblemCode,
                user_code: userCode,
                username: hunterName,
                is_dummy: isDummyMode
            })
        });

        const data = await response.json();

        if (data.error) {
            resultArea.innerHTML = 'Error: ' + data.error;
        } else {
            const isCorrect = data.is_correct;
            resultArea.innerHTML = `<strong>${isCorrect ? 'SYSTEM: ACCESS GRANTED' : 'SYSTEM: ACCESS DENIED'}</strong><br><br>${data.message}`;

            // ★ 正解だった場合はEXECUTEボタンを隠し、再実行を封じる
            if (isCorrect && btnExecute) {
                btnExecute.style.visibility = 'hidden';
            }

            fetchStats();
        }
    } catch (e) {
        resultArea.innerHTML = 'Connection Error';
    } finally {
        setLoading(false);
    }
}