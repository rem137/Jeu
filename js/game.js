const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 40;
let lastTime = 0;
const towers = [];
const enemies = [];
const projectiles = [];

const statsDiv = document.getElementById('stats');
const panelTitle = document.getElementById('panelTitle');
const panelDetails = document.getElementById('panelDetails');
const upgradeBtn = document.getElementById('upgradeBtn');
const sellBtn = document.getElementById('sellBtn');
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
let activeTower = null;
let selectedTower = 'H';
let draggingType = null;
let dragIcon = null;

function updateStats() {
    statsDiv.textContent = `Gold: ${gold} | Lives: ${lives} | Wave: ${wave} | Kills: ${kills}`;
}
updateStats();

function updatePanel() {
    if (activeTower) {
        const cost = TOWER_TYPES[activeTower.type].cost * activeTower.level;
        const refund = Math.floor(cost * 0.5);
        panelTitle.textContent = `${activeTower.type} Tower Lv${activeTower.level}`;
        panelDetails.textContent = `Dmg: ${activeTower.damage} | Range: ${activeTower.range}`;
        upgradeBtn.textContent = `Upgrade (${cost})`;
        sellBtn.textContent = `Sell (${refund})`;
        upgradeBtn.classList.remove('hidden');
        sellBtn.classList.remove('hidden');
    } else {
        const type = draggingType || selectedTower;
        const cfg = TOWER_TYPES[type];
        panelTitle.textContent = `${type} Tower`;
        panelDetails.textContent = `Cost: ${cfg.cost} | Dmg: ${cfg.damage} | Range: ${cfg.range}`;
        upgradeBtn.classList.add('hidden');
        sellBtn.classList.add('hidden');
    }
}
updatePanel();

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

function startDrag(type, e) {
    draggingType = type;
    selectedTower = type;
    activeTower = null;
    updatePanel();
    dragIcon = document.createElement('div');
    dragIcon.className = 'drag-icon';
    dragIcon.textContent = type;
    dragIcon.style.background = TOWER_TYPES[type].color;
    document.body.appendChild(dragIcon);
    moveDragIcon(e);
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
}

function moveDragIcon(e) {
    dragIcon.style.left = e.pageX - 20 + 'px';
    dragIcon.style.top = e.pageY - 20 + 'px';
}

function handleDragMove(e) {
    moveDragIcon(e);
    const rect = canvas.getBoundingClientRect();
    if (e.pageX >= rect.left && e.pageX <= rect.right && e.pageY >= rect.top && e.pageY <= rect.bottom) {
        const { x, y } = getCanvasPos(e);
        mouseX = x;
        mouseY = y;
    } else {
        mouseX = undefined;
        mouseY = undefined;
    }
    hoverTower = null;
    updatePanel();
}

function handleDragEnd(e) {
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);
    dragIcon.remove();
    const rect = canvas.getBoundingClientRect();
    if (e.pageX >= rect.left && e.pageX <= rect.right && e.pageY >= rect.top && e.pageY <= rect.bottom) {
        const { x, y } = getCanvasPos(e);
        const cfg = TOWER_TYPES[draggingType];
        if (gold >= cfg.cost) {
            towers.push(new Tower(x, y, draggingType));
            gold -= cfg.cost;
            updateStats();
        }
    }
    draggingType = null;
    dragIcon = null;
    mouseX = undefined;
    mouseY = undefined;
    updatePanel();
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
            activeTower = null;
            updatePanel();
        } else {
            activeTower = tower;
            hoverTower = tower;
            updatePanel();
        }
    } else {
        activeTower = null;
        hoverTower = null;
        updatePanel();
    }
}

function handlePointerMove(e) {
    const { x, y } = getCanvasPos(e);
    mouseX = x;
    mouseY = y;
    if (!draggingType) {
        hoverTower = towers.find(t => Math.abs(t.x - mouseX) < gridSize / 2 && Math.abs(t.y - mouseY) < gridSize / 2) || null;
    }
    updatePanel();
}

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);

document.querySelectorAll('#controls button[data-tower]').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        startDrag(btn.dataset.tower, e);
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

upgradeBtn.addEventListener('click', () => {
    if (activeTower) {
        activeTower.upgrade();
        updatePanel();
    }
});

sellBtn.addEventListener('click', () => {
    if (activeTower) {
        const refund = Math.floor(TOWER_TYPES[activeTower.type].cost * activeTower.level * 0.5);
        gold += refund;
        towers.splice(towers.indexOf(activeTower), 1);
        activeTower = null;
        hoverTower = null;
        updateStats();
        updatePanel();
    }
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
        const r = TOWER_TYPES[draggingType || selectedTower].range;
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
