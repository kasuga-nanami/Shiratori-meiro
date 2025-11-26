const socket = io();

let roomCode = "";
let myName = "";
let gameState = null;

const setup = document.getElementById("setup");
const game = document.getElementById("game");

document.getElementById("joinBtn").onclick = () => {
    myName = document.getElementById("nameInput").value;
    roomCode = document.getElementById("roomInput").value;
    const size = Number(document.getElementById("sizeSelect").value);

    if (!myName || !roomCode) return;

    socket.emit("joinRoom", { roomCode, name: myName, size });
    setup.classList.add("hidden");
    game.classList.remove("hidden");
};

// 初期状態取得
socket.on("init", (gs) => {
    gameState = gs;
    drawGrid();
    updateTurn();
});

// 更新
socket.on("updateGame", (gs) => {
    gameState = gs;
    drawGrid();
    updateTurn();
});

// プレイヤー順番表示
function updateTurn() {
    document.getElementById("turnInfo").textContent =
        `現在のプレイヤー：${gameState.currentPlayer + 1}番目`;
}

// グリッド描画
function drawGrid() {
    const gridDiv = document.getElementById("grid");
    gridDiv.innerHTML = "";
    gridDiv.style.gridTemplateColumns = `repeat(${gameState.size}, 30px)`;

    for (let y = 0; y < gameState.size; y++) {
        for (let x = 0; x < gameState.size; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            if (x === 0 && y === 0) cell.classList.add("start");
            if (x === gameState.size - 1 && y === gameState.size - 1) cell.classList.add("goal");

            const ch = gameState.grid[y][x];
            if (ch && ch !== "S" && ch !== "G") cell.classList.add("path");

            cell.textContent = ch;
            gridDiv.appendChild(cell);
        }
    }
}

// エラーメッセージ
socket.on("errorMsg", (msg) => {
    document.getElementById("msg").textContent = msg;
});

// クリア表示
socket.on("gameClear", ({ word }) => {
    alert(`🎉 クリア！\n最後の単語：${word}`);
});

// 単語送信
document.getElementById("sendWord").onclick = () => {
    const word = document.getElementById("wordInput").value.trim();
    if (!word) return;

    socket.emit("placeWord", { roomCode, word });
    document.getElementById("wordInput").value = "";
};
