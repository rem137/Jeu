const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 40;
let lastTime = 0;
const towers = [];
const enemies = [];
const projectiles = [];

const statsDiv = document.getElementById('stats');
const infoDiv = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const startScreen = document.getElementById('startScreen');
const startGameBtn = document.getElementById('startGameBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalStats = document.getElementById('finalStats');
const restartBtn = document.getElementById('restartBtn');

let gold = 100;
let lives = 10;
let wave = 0;
let kills = 0;
let waveInProgress = false;
let paused = true;
let mouseX;
let mouseY;
let hoverTower = null;
let selectedTower = 'H';

function updateStats() {
    statsDiv.textContent = `Gold: ${gold} | Lives: ${lives} | Wave: ${wave} | Kills: ${kills}`;
}
updateStats();

function updateInfo() {
    if (hoverTower) {
        const cost = TOWER_TYPES[hoverTower.type].cost * hoverTower.level;
        const refund = Math.floor(cost * 0.5);
        infoDiv.textContent = `Upgrade: ${cost} | Sell: ${refund}`;
    } else {
        const cfg = TOWER_TYPES[selectedTower];
        infoDiv.textContent = `Place ${selectedTower} (${cfg.cost})`;
    }
}
updateInfo();

const path = [
    { x: 0, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 100 },
    { x: 600, y: 100 },
    { x: 600, y: 500 },
    { x: 800, y: 500 }
];

function spawnEnemy(level) {
    let type = 'normal';
    if (level > 5 && Math.random() < 0.3) {
        type = 'tank';
    } else if (level > 2 && Math.random() < 0.4) {
        type = 'fast';
    }
    enemies.push(new Enemy(path, level, type));
}

function gameOver() {
    paused = true;
    finalStats.textContent = `Wave: ${wave} | Kills: ${kills}`;
    gameOverScreen.classList.remove('hidden');
}

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
}

function handlePointerDown(e) {
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    const tower = towers.find(t => Math.abs(t.x - x) < gridSize / 2 && Math.abs(t.y - y) < gridSize / 2);
    if (tower) {
        if (e.shiftKey) {
            const refund = Math.floor(TOWER_TYPES[tower.type].cost * tower.level * 0.5);
            gold += refund;
            towers.splice(towers.indexOf(tower), 1);
            updateStats();
            hoverTower = null;
            updateInfo();
        } else {
            tower.upgrade();
            hoverTower = tower;
            updateInfo();
        }
    } else {
        const cfg = TOWER_TYPES[selectedTower];
        if (gold >= cfg.cost) {
            towers.push(new Tower(x, y, selectedTower));
            gold -= cfg.cost;
            updateStats();
            hoverTower = towers[towers.length - 1];
        }
        updateInfo();
    }
}

function handlePointerMove(e) {
    const { x, y } = getCanvasPos(e);
    mouseX = x;
    mouseY = y;
    hoverTower = towers.find(t => Math.abs(t.x - mouseX) < gridSize / 2 && Math.abs(t.y - mouseY) < gridSize / 2) || null;
    updateInfo();
}

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);

document.querySelectorAll('#controls button[data-tower]').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedTower = btn.dataset.tower;
        document.querySelectorAll('#controls button[data-tower]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateInfo();
    });
});

pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) requestAnimationFrame(update);
});

startGameBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    paused = false;
    lastTime = performance.now();
    requestAnimationFrame(update);
    startWave();
});

restartBtn.addEventListener('click', () => {
    location.reload();
});

function startWave() {
    if (waveInProgress) return;
    waveInProgress = true;
    wave++;
    updateStats();
    let spawned = 0;
    const toSpawn = 10 + wave * 2;
    const interval = setInterval(() => {
        spawnEnemy(wave);
        spawned++;
        if (spawned >= toSpawn) {
            clearInterval(interval);
            waveInProgress = false;
        }
    }, 1000);
}

startBtn.addEventListener('click', startWave);

function update(time) {
    if (paused) return;
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (const p of path.slice(1)) {
        ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    if (hoverTower) {
        ctx.beginPath();
        ctx.arc(hoverTower.x, hoverTower.y, hoverTower.range, 0, Math.PI * 2);
        ctx.stroke();
    } else if (mouseX !== undefined && mouseY !== undefined) {
        const r = TOWER_TYPES[selectedTower].range;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const progress = (Date.now() - p.start) / p.duration;
        if (progress >= 1) {
            projectiles.splice(i, 1);
            continue;
        }
        const x = p.x1 + (p.x2 - p.x1) * progress;
        const y = p.y1 + (p.y2 - p.y1) * progress;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    towers.forEach(t => t.update(delta));
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(delta);
        if (e.health <= 0) {
            enemies.splice(i, 1);
            kills++;
            gold += 5;
            updateStats();
        } else if (e.pos >= e.path.length - 1) {
            enemies.splice(i, 1);
            lives--;
            updateStats();
            if (lives <= 0) {
                gameOver();
                return;
            }
        }
    }

    requestAnimationFrame(update);
}
