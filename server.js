const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

let rooms = {}; // { roomCode: { players, gameState } }

// ランダム文字（ひらがな）
const hira = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";

function randomHira() {
    return hira[Math.floor(Math.random() * hira.length)];
}

// 新しいゲーム状態
function createGameState(size) {
    const grid = Array(size).fill().map(() => Array(size).fill(""));

    grid[0][0] = "S";               // スタート
    grid[size - 1][size - 1] = "G"; // ゴール

    return {
        size,
        grid,
        currentPlayer: 0,
        lastWord: "",
        lastChar: "",
        direction: "h", // h=横, v=縦
        x: 0,            // 現在位置
        y: 0,
        finished: false
    };
}

// 接続処理
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ルーム参加
    socket.on("joinRoom", ({ roomCode, name, size }) => {
        socket.join(roomCode);

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: [],
                gameState: createGameState(size)
            };
        }

        rooms[roomCode].players.push({ id: socket.id, name });

        io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
        socket.emit("init", rooms[roomCode].gameState);
    });

    // 単語配置
    socket.on("placeWord", ({ roomCode, word }) => {
        const room = rooms[roomCode];
        const gs = room.gameState;

        // 頭文字チェック（前の単語の最後の文字と一致）
        if (gs.lastChar && gs.lastChar !== word[0]) {
            socket.emit("errorMsg", "前の単語の最後の文字で始めてください！");
            return;
        }

        // マスに置く
        let { x, y } = gs;

        for (let i = 0; i < word.length; i++) {
            const ch = word[i];

            // 移動
            if (i !== 0) {
                if (gs.direction === "h") x++;
                else y++;
            }

            // 範囲外チェック
            if (x < 0 || y < 0 || x >= gs.size || y >= gs.size) {
                socket.emit("errorMsg", "マスの外に出ました！");
                return;
            }

            // ゴールに到達 → ちょうど最後の文字ならクリア
            if (x === gs.size - 1 && y === gs.size - 1) {
                if (i === word.length - 1) {
                    gs.finished = true;
                    io.to(roomCode).emit("gameClear", {
                        word,
                        by: socket.id
                    });
                    return;
                } else {
                    socket.emit("errorMsg", "ゴールを通り過ぎました！");
                    return;
                }
            }

            // 文字配置
            gs.grid[y][x] = ch;
        }

        // 更新
        gs.x = x;
        gs.y = y;
        gs.lastWord = word;
        gs.lastChar = word[word.length - 1];
        gs.direction = gs.direction === "h" ? "v" : "h";

        // 次のプレイヤー
        const playerCount = room.players.length;
        gs.currentPlayer = (gs.currentPlayer + 1) % playerCount;

        io.to(roomCode).emit("updateGame", gs);
    });
});

http.listen(3000, () => {
    console.log("Server running: http://localhost:3000");
});
